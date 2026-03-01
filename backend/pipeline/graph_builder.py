"""Build a Temporal Knowledge Graph from transcript, vision events, and extracted entities.

This is the core differentiator of VISTRAL. Merges all multimodal signals into a
structured graph with nodes (entities) and edges (temporal relations), then serializes
it for efficient LLM reasoning.
"""

import logging
import re

from backend.config import TIMELINE_SNAPSHOT_INTERVAL
from backend.models import (
    GraphNode, GraphEdge, Evidence, TimelineSnapshot, KnowledgeGraph,
    TranscriptSegment, VisionEvent, ExtractedEntities, NodeType, RelationType,
)

logger = logging.getLogger(__name__)


def build_graph(
    transcript: list[TranscriptSegment],
    vision_events: list[VisionEvent],
    entities: ExtractedEntities,
    duration: float,
) -> KnowledgeGraph:
    """Construct the Temporal Knowledge Graph from all pipeline outputs.

    Creates nodes for speakers, topics, KPIs, slides, decisions, and claims.
    Creates edges for temporal and semantic relationships between them.
    Generates timeline snapshots and serialization metadata.
    """
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    node_index: dict[str, GraphNode] = {}

    # --- Speaker nodes ---
    for sp in entities.speakers:
        first_seen, last_seen = _speaker_time_range(transcript, sp["id"], sp.get("name"))
        node = GraphNode(
            id=sp["id"],
            type=NodeType.SPEAKER,
            label=sp["id"],
            first_seen=first_seen,
            last_seen=last_seen,
            attributes={
                "role": sp.get("role", "unknown"),
                "key_contributions": sp.get("key_contributions", []),
            },
        )
        nodes.append(node)
        node_index[node.id] = node

    # --- Topic nodes ---
    for tp in entities.topics:
        node = GraphNode(
            id=tp["id"],
            type=NodeType.TOPIC,
            label=tp["name"],
            first_seen=tp.get("start_time", 0),
            last_seen=tp.get("end_time", duration),
            attributes={
                "key_points": tp.get("key_points", []),
                "speakers_involved": tp.get("speakers_involved", []),
            },
        )
        nodes.append(node)
        node_index[node.id] = node

        # Edges: topic <-> speakers involved
        for sid in tp.get("speakers_involved", []):
            if sid in node_index:
                edges.append(GraphEdge(
                    source=sid, target=node.id,
                    relation=RelationType.MENTIONED,
                    timestamp=tp.get("start_time", 0),
                    confidence=0.85,
                    evidence=Evidence(source_type="audio"),
                ))

    # --- Claim nodes + said_by edges ---
    for cl in entities.claims:
        node = GraphNode(
            id=cl["id"],
            type=NodeType.CLAIM,
            label=cl.get("content", "")[:80],
            first_seen=cl.get("timestamp", 0),
            last_seen=cl.get("timestamp", 0),
            attributes={"content": cl.get("content", ""), "type": cl.get("type", "factual")},
        )
        nodes.append(node)
        node_index[node.id] = node

        # Edge: claim said_by speaker
        speaker_id = cl.get("speaker_id")
        if speaker_id and speaker_id in node_index:
            edges.append(GraphEdge(
                source=node.id, target=speaker_id,
                relation=RelationType.SAID_BY,
                timestamp=cl.get("timestamp", 0),
                confidence=0.9,
                evidence=Evidence(source_type="audio", quote=cl.get("content")),
            ))

    # --- KPI nodes ---
    for kp in entities.kpis:
        node = GraphNode(
            id=kp["id"],
            type=NodeType.KPI,
            label=f"{kp['name']}: {kp.get('value', 'N/A')}",
            first_seen=kp.get("timestamp", 0),
            last_seen=kp.get("timestamp", 0),
            attributes={
                "name": kp["name"],
                "value": kp.get("value", ""),
                "context": kp.get("context", ""),
            },
        )
        nodes.append(node)
        node_index[node.id] = node

        # Edge: mentioned by speaker
        mentioned_by = kp.get("mentioned_by")
        if mentioned_by and mentioned_by in node_index:
            edges.append(GraphEdge(
                source=mentioned_by, target=node.id,
                relation=RelationType.MENTIONED,
                timestamp=kp.get("timestamp", 0),
                confidence=0.9,
                evidence=Evidence(source_type="audio", quote=f"{kp['name']}: {kp.get('value', '')}"),
            ))

    # --- Slide nodes from vision events ---
    for i, ve in enumerate(vision_events):
        if ve.slide_title or ve.ocr_text:
            slide_id = f"slide_{i}"
            label = ve.slide_title or (ve.ocr_text[0][:50] if ve.ocr_text else f"Visual @{ve.timestamp:.0f}s")
            node = GraphNode(
                id=slide_id,
                type=NodeType.SLIDE,
                label=label,
                first_seen=ve.timestamp,
                last_seen=ve.timestamp,
                attributes={
                    "ocr_text": ve.ocr_text,
                    "scene_description": ve.scene_description,
                    "frame_path": ve.frame_path,
                },
            )
            nodes.append(node)
            node_index[slide_id] = node

            # Edge: slide shown_during closest topic
            closest_topic = _find_closest_topic(entities.topics, ve.timestamp)
            if closest_topic and closest_topic["id"] in node_index:
                edges.append(GraphEdge(
                    source=closest_topic["id"], target=slide_id,
                    relation=RelationType.SHOWN_DURING,
                    timestamp=ve.timestamp,
                    confidence=0.85,
                    evidence=Evidence(
                        source_type="visual",
                        description=ve.scene_description,
                        frame_path=ve.frame_path,
                    ),
                ))

    # --- Cross-reference: detect contradictions between audio claims and visual OCR ---
    _detect_contradictions(nodes, edges, node_index, entities, vision_events)

    # --- Decision nodes from raw decisions ---
    for i, dec_raw in enumerate(entities.decisions_raw):
        dec_id = f"decision_{i}"
        node = GraphNode(
            id=dec_id,
            type=NodeType.DECISION,
            label=dec_raw.get("description", "")[:80],
            first_seen=dec_raw.get("timestamp", 0),
            last_seen=dec_raw.get("timestamp", 0),
            attributes={"context": dec_raw.get("context", "")},
        )
        nodes.append(node)
        node_index[dec_id] = node

        made_by = dec_raw.get("made_by")
        if made_by and made_by in node_index:
            edges.append(GraphEdge(
                source=made_by, target=dec_id,
                relation=RelationType.DECIDED,
                timestamp=dec_raw.get("timestamp", 0),
                confidence=0.85,
                evidence=Evidence(source_type="audio"),
            ))

    # --- Timeline snapshots ---
    timeline = _build_timeline(nodes, edges, duration)

    # --- Metadata ---
    type_counts: dict[str, int] = {}
    for n in nodes:
        type_counts[n.type] = type_counts.get(n.type, 0) + 1

    graph = KnowledgeGraph(
        nodes=nodes,
        edges=edges,
        timeline=timeline,
        metadata={
            "duration_seconds": duration,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": type_counts,
        },
    )

    logger.info("Knowledge graph built: %d nodes, %d edges, %d timeline snapshots",
                len(nodes), len(edges), len(timeline))
    return graph


def serialize_graph(graph: KnowledgeGraph) -> str:
    """Serialize graph to compact text format for Pass B input.

    Produces ~3.5k tokens for a 10-minute video, vs ~40k for raw transcript.
    """
    lines = ["KNOWLEDGE GRAPH:", ""]

    # Nodes grouped by type
    lines.append("NODES:")
    for ntype in [NodeType.SPEAKER, NodeType.TOPIC, NodeType.KPI, NodeType.SLIDE, NodeType.DECISION, NodeType.CLAIM]:
        typed_nodes = [n for n in graph.nodes if n.type == ntype]
        if typed_nodes:
            lines.append(f"  [{ntype.upper()}S]")
            for n in typed_nodes:
                attrs = ""
                if n.type == NodeType.SPEAKER:
                    role = n.attributes.get("role", "")
                    attrs = f" ({role})" if role and role != "unknown" else ""
                elif n.type == NodeType.KPI:
                    attrs = f" = {n.attributes.get('value', '')}"
                lines.append(f"    [{n.id}] {n.label}{attrs} [{n.first_seen:.0f}s-{n.last_seen:.0f}s]")

    lines.append("")
    lines.append("EDGES:")
    for e in graph.edges:
        quote_part = f' "{e.evidence.quote[:60]}..."' if e.evidence.quote and len(e.evidence.quote) > 60 else (f' "{e.evidence.quote}"' if e.evidence.quote else "")
        desc_part = f" ({e.evidence.description[:40]})" if e.evidence.description else ""
        lines.append(
            f"  {e.source} --{e.relation}--> {e.target} @{e.timestamp:.0f}s "
            f"[{e.evidence.source_type}, conf:{e.confidence:.2f}]{quote_part}{desc_part}"
        )

    lines.append("")
    lines.append(f"METADATA: duration={graph.metadata['duration_seconds']:.0f}s, "
                 f"nodes={graph.metadata['total_nodes']}, edges={graph.metadata['total_edges']}")

    return "\n".join(lines)


# --- Internal helpers ---

def _speaker_time_range(transcript: list[TranscriptSegment], speaker_id: str, name: str | None) -> tuple[float, float]:
    """Find first and last timestamps where a speaker appears."""
    target = name or speaker_id
    first, last = 0.0, 0.0
    for seg in transcript:
        if seg.speaker == target or seg.speaker == speaker_id:
            if first == 0.0:
                first = seg.start
            last = seg.end
    return first, last


def _find_closest_topic(topics: list[dict], timestamp: float) -> dict | None:
    """Find the topic whose time range contains or is closest to a timestamp."""
    for t in topics:
        if t.get("start_time", 0) <= timestamp <= t.get("end_time", float("inf")):
            return t
    # Fallback: closest by start_time
    if topics:
        return min(topics, key=lambda t: abs(t.get("start_time", 0) - timestamp))
    return None


def _detect_contradictions(
    nodes: list[GraphNode],
    edges: list[GraphEdge],
    node_index: dict[str, GraphNode],
    entities: ExtractedEntities,
    vision_events: list[VisionEvent],
) -> None:
    """Detect potential contradictions between audio claims and visual OCR.

    Compares numeric values mentioned in claims with numbers found in slide OCR
    that appear within a close time window.
    """
    for claim in entities.claims:
        claim_text = claim.get("content", "").lower()
        claim_ts = claim.get("timestamp", 0)
        claim_id = claim.get("id")

        # Extract numbers from claim
        claim_numbers = re.findall(r"(\d+(?:\.\d+)?)\s*%?", claim_text)
        if not claim_numbers:
            continue

        # Check vision events near this timestamp
        for i, ve in enumerate(vision_events):
            if abs(ve.timestamp - claim_ts) > 60:  # within 60s window
                continue

            ocr_combined = " ".join(ve.ocr_text).lower()
            ocr_numbers = re.findall(r"(\d+(?:\.\d+)?)\s*%?", ocr_combined)

            # Look for conflicting numbers in similar context
            for cn_val in claim_numbers:
                for on_val in ocr_numbers:
                    if cn_val != on_val and _same_context(claim_text, ocr_combined, cn_val, on_val):
                        slide_id = f"slide_{i}"
                        if claim_id in node_index and slide_id in node_index:
                            edges.append(GraphEdge(
                                source=claim_id,
                                target=slide_id,
                                relation=RelationType.CONTRADICTS,
                                timestamp=claim_ts,
                                confidence=0.8,
                                evidence=Evidence(
                                    source_type="merged",
                                    quote=f"Audio: {claim.get('content', '')}",
                                    description=f"Visual: {' '.join(ve.ocr_text[:3])}",
                                ),
                            ))
                            return  # one contradiction per claim is enough


def _same_context(text_a: str, text_b: str, num_a: str, num_b: str) -> bool:
    """Rough heuristic: check if two texts discuss similar topics with different numbers."""
    # Simple keyword overlap check
    keywords = {"revenue", "growth", "cost", "budget", "margin", "profit", "sales",
                "rate", "percent", "increase", "decrease", "headcount", "target"}
    words_a = set(text_a.split())
    words_b = set(text_b.split())
    overlap = words_a & words_b & keywords
    return len(overlap) >= 1


def _build_timeline(
    nodes: list[GraphNode],
    edges: list[GraphEdge],
    duration: float,
) -> list[TimelineSnapshot]:
    """Generate periodic timeline snapshots for UI visualization."""
    snapshots = []
    interval = TIMELINE_SNAPSHOT_INTERVAL

    for ts in range(0, int(duration) + 1, interval):
        active_nodes = []
        current_topic = None
        current_speaker = None

        for n in nodes:
            if n.first_seen <= ts <= n.last_seen:
                active_nodes.append(n.id)
                if n.type == NodeType.TOPIC:
                    current_topic = n.label
                elif n.type == NodeType.SPEAKER:
                    current_speaker = n.label

        active_edges = [
            f"{e.source}->{e.target}"
            for e in edges
            if e.timestamp <= ts
        ]

        snapshots.append(TimelineSnapshot(
            timestamp=float(ts),
            active_nodes=active_nodes,
            active_edges=active_edges,
            current_topic=current_topic,
            current_speaker=current_speaker,
        ))

    return snapshots
