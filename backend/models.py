"""Shared data models for the pipeline. Single source of truth for all types."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


# --- Knowledge Graph ---

class NodeType(str, Enum):
    SPEAKER = "speaker"
    TOPIC = "topic"
    KPI = "kpi"
    SLIDE = "slide"
    DECISION = "decision"
    CLAIM = "claim"


class RelationType(str, Enum):
    MENTIONED = "mentioned"
    SAID_BY = "said_by"
    SHOWN_DURING = "shown_during"
    CONTRADICTS = "contradicts"
    DECIDED = "decided"
    COMMITTED_TO = "committed_to"
    RELATED_TO = "related_to"


@dataclass
class Evidence:
    source_type: str  # "audio" | "visual" | "merged"
    quote: str | None = None
    description: str | None = None
    frame_path: str | None = None


@dataclass
class GraphNode:
    id: str
    type: str
    label: str
    first_seen: float
    last_seen: float
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str
    timestamp: float
    confidence: float
    evidence: Evidence = field(default_factory=lambda: Evidence(source_type="audio"))


@dataclass
class TimelineSnapshot:
    timestamp: float
    active_nodes: list[str] = field(default_factory=list)
    active_edges: list[str] = field(default_factory=list)
    current_topic: str | None = None
    current_speaker: str | None = None


@dataclass
class KnowledgeGraph:
    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)
    timeline: list[TimelineSnapshot] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


# --- Transcript ---

@dataclass
class TranscriptSegment:
    speaker: str
    text: str
    start: float
    end: float


# --- Vision ---

@dataclass
class FrameInfo:
    index: int
    timestamp: float
    path: str


@dataclass
class VisionEvent:
    frame_index: int
    timestamp: float
    frame_path: str
    ocr_text: list[str] = field(default_factory=list)
    scene_description: str = ""
    slide_title: str | None = None
    objects: list[str] = field(default_factory=list)


# --- Pipeline entities (from Pass A) ---

@dataclass
class ExtractedEntities:
    speakers: list[dict[str, Any]] = field(default_factory=list)
    topics: list[dict[str, Any]] = field(default_factory=list)
    claims: list[dict[str, Any]] = field(default_factory=list)
    kpis: list[dict[str, Any]] = field(default_factory=list)
    decisions_raw: list[dict[str, Any]] = field(default_factory=list)
    action_items_raw: list[dict[str, Any]] = field(default_factory=list)


# --- Insights (from Pass B) ---

@dataclass
class EvidenceChain:
    timestamp: float
    source: str  # "audio" | "visual"
    quote: str | None = None
    description: str | None = None


# --- Job ---

class JobStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
