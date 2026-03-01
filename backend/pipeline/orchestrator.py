"""Pipeline orchestrator: coordinates all stages with parallelism and SSE progress events.

Orchestration pattern:
  1. Audio + Frame extraction (parallel)
  2. Voxtral ASR + Frame dedup (parallel)
  3. Pass A entities + Pixtral vision (parallel)
  4. Knowledge Graph construction
  5. Pass B insight reasoning
"""

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Any

from backend.config import JOBS_DIR
from backend.models import JobStatus, KnowledgeGraph
from backend.pipeline.audio_extractor import extract_audio
from backend.pipeline.frame_extractor import extract_frames
from backend.pipeline.frame_dedup import dedup_frames
from backend.pipeline.transcriber import transcribe
from backend.pipeline.vision_analyzer import analyze_frames
from backend.pipeline.graph_builder import build_graph, serialize_graph
from backend.pipeline.reasoner import extract_entities, extract_insights

logger = logging.getLogger(__name__)

# Descriptive messages cycled during each step's ticker
_TICKER_MESSAGES: dict[str, list[str]] = {
    "audio": [
        "Extracting audio track from video container",
        "Extracting visual frames with scene detection",
        "Converting audio to optimal format for ASR",
        "Filtering keyframes at scene boundaries",
        "Preparing media for parallel processing",
    ],
    "frames": [
        "Computing perceptual hashes for frame dedup",
        "Comparing frame similarity with hamming distance",
        "Filtering near-duplicate frames",
        "Selecting visually distinct keyframes",
    ],
    "transcription": [
        "Voxtral is transcribing speech to text",
        "Identifying speakers with diarization",
        "Aligning word-level timestamps",
        "Segmenting transcript by speaker turns",
        "Detecting language and dialect patterns",
        "Merging consecutive speaker segments",
    ],
    "vision": [
        "Pixtral is analyzing frame content",
        "Running OCR on detected text regions",
        "Classifying slide layouts and diagrams",
        "Extracting visual entities from frames",
        "Detecting charts, tables, and figures",
    ],
    "analysis": [
        "Extracting named entities from transcript",
        "Identifying topics and themes",
        "Cross-referencing visual and audio entities",
        "Building entity co-occurrence matrix",
    ],
    "graph": [
        "Creating temporal knowledge graph nodes",
        "Linking entities with relationship edges",
        "Computing edge confidence scores",
        "Detecting contradictions between sources",
        "Building timeline snapshots",
        "Validating graph connectivity",
    ],
    "insights": [
        "Reasoning over knowledge graph structure",
        "Extracting action items with evidence chains",
        "Identifying key decisions and commitments",
        "Summarizing topic arcs and transitions",
        "Scoring insight confidence levels",
        "Generating executive summary",
    ],
}


class PipelineOrchestrator:
    """Runs the full processing pipeline for a video, emitting progress events."""

    def __init__(self, job_id: str, video_path: Path):
        self.job_id = job_id
        self.video_path = video_path
        self.job_dir = JOBS_DIR / job_id
        self.job_dir.mkdir(parents=True, exist_ok=True)
        self._events: asyncio.Queue[dict] = asyncio.Queue()
        self._status = JobStatus.PROCESSING

    @property
    def events(self) -> asyncio.Queue[dict]:
        return self._events

    @asynccontextmanager
    async def _progress_ticker(self, step: str, start_pct: float, end_pct: float):
        """Emit interpolated progress events during long operations.

        Uses asymptotic easing — increments shrink as progress approaches the
        target so it never overshoots. Cycles through descriptive messages.
        """
        messages = _TICKER_MESSAGES.get(step, [f"Processing {step}..."])
        current_pct = start_pct
        msg_index = 0
        interval = 3.0  # seconds between ticks

        async def _tick():
            nonlocal current_pct, msg_index
            while True:
                await asyncio.sleep(interval)
                # Asymptotic easing: close 30% of remaining gap each tick
                remaining = end_pct - current_pct
                increment = max(remaining * 0.3, 0.5)
                current_pct = min(current_pct + increment, end_pct - 1)
                msg = messages[min(msg_index, len(messages) - 1)]
                msg_index += 1
                await self._emit(step, round(current_pct, 1), msg, ticker=True)

        task = asyncio.create_task(_tick())
        try:
            yield
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def run(self) -> dict[str, Any]:
        """Execute the full pipeline. Returns complete results dict."""
        start = time.time()

        try:
            await self._emit("upload", 5, "Video received, starting pipeline")

            # --- Step 1: Audio + Frame extraction (parallel) ---
            await self._emit("audio", 10, "Extracting audio and frames")
            async with self._progress_ticker("audio", 10, 20):
                audio_task = extract_audio(self.video_path, self.job_dir)
                frames_task = extract_frames(self.video_path, self.job_dir)
                audio_path, raw_frames = await asyncio.gather(audio_task, frames_task)
            await self._emit("audio", 20, f"Audio extracted, {len(raw_frames)} frames found")

            # --- Step 2: Voxtral ASR + Frame dedup (parallel) ---
            await self._emit("transcription", 25, "Transcribing audio with Voxtral")
            async with self._progress_ticker("transcription", 25, 44):
                transcript_task = transcribe(audio_path)
                async with self._progress_ticker("frames", 25, 30):
                    unique_frames = await asyncio.to_thread(dedup_frames, raw_frames)
                await self._emit("frames", 30, f"{len(unique_frames)} unique frames after dedup")
                transcript = await transcript_task
            await self._emit("transcription", 45, f"Transcription complete: {len(transcript)} segments")

            # Get video duration from transcript or estimate
            duration = transcript[-1].end if transcript else 0

            # --- Step 3: Pass A entities + Pixtral vision (parallel) ---
            await self._emit("analysis", 50, "Extracting entities and analyzing frames")
            async with self._progress_ticker("vision", 50, 64):
                entities_task = extract_entities(transcript)
                vision_task = analyze_frames(unique_frames)
                entities, vision_events = await asyncio.gather(entities_task, vision_task)
            await self._emit("vision", 65, f"Vision: {len(vision_events)} events. Entities extracted.")

            # --- Step 4: Knowledge Graph construction ---
            await self._emit("graph", 70, "Building Temporal Knowledge Graph")
            async with self._progress_ticker("graph", 70, 79):
                graph = build_graph(transcript, vision_events, entities, duration)
                serialized = serialize_graph(graph)
            await self._emit("graph", 80, f"Graph built: {graph.metadata['total_nodes']} nodes, {graph.metadata['total_edges']} edges")

            # --- Step 5: Pass B insight reasoning ---
            await self._emit("insights", 85, "Extracting insights from knowledge graph")
            async with self._progress_ticker("insights", 85, 94):
                insights = await extract_insights(serialized)
            await self._emit("insights", 95, "Insights extracted with evidence chains")

            # --- Save results ---
            results = self._build_results(transcript, graph, insights, vision_events, duration, start)
            self._save_results(results)

            self._status = JobStatus.COMPLETED
            await self._emit("complete", 100, "Analysis complete")

            return results

        except Exception as e:
            logger.exception("Pipeline failed for job %s", self.job_id)
            self._status = JobStatus.ERROR
            await self._emit("error", 0, f"Pipeline error: {str(e)[:200]}")
            raise

    def _build_results(self, transcript, graph, insights, vision_events, duration, start) -> dict:
        """Assemble the final results dict."""
        return {
            "job_id": self.job_id,
            "status": "completed",
            "video_url": f"/api/jobs/{self.job_id}/video",
            "transcript": [asdict(s) for s in transcript],
            "graph": _graph_to_dict(graph),
            "insights": insights,
            "vision_events": [asdict(v) for v in vision_events],
            "processing_time": round(time.time() - start, 1),
        }

    def _save_results(self, results: dict) -> None:
        """Persist results as JSON."""
        output_path = self.job_dir / "results.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        logger.info("Results saved to %s", output_path)

    async def _emit(self, step: str, progress: float, message: str, data: Any = None, ticker: bool = False) -> None:
        """Emit a pipeline progress event to the SSE queue."""
        event = {
            "step": step,
            "progress": progress,
            "message": message,
        }
        if data:
            event["data"] = data
        if ticker:
            event["ticker"] = True
        await self._events.put(event)
        logger.info("[%s] %s: %s (%.0f%%)", self.job_id, step, message, progress)


def _graph_to_dict(graph: KnowledgeGraph) -> dict:
    """Convert KnowledgeGraph dataclass tree to a plain dict."""
    return {
        "nodes": [asdict(n) for n in graph.nodes],
        "edges": [asdict(e) for e in graph.edges],
        "timeline": [asdict(s) for s in graph.timeline],
        "metadata": graph.metadata,
    }
