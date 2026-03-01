"""Jobs router: SSE streaming, results, and video serving."""

import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from backend.config import JOBS_DIR, UPLOADS_DIR

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/jobs/{job_id}/stream")
async def stream_progress(job_id: str):
    """Server-Sent Events endpoint for real-time pipeline progress.

    Streams events as the pipeline processes the video.
    Falls back to polling job results if pipeline is already done.
    """
    from backend.routers.upload import active_pipelines

    async def event_generator():
        orchestrator = active_pipelines.get(job_id)

        if orchestrator:
            last_real_event = {"step": "upload", "progress": 0, "message": "Initializing pipeline..."}
            while True:
                try:
                    event = await asyncio.wait_for(orchestrator.events.get(), timeout=30)
                    last_real_event = event
                    yield f"data: {json.dumps(event)}\n\n"
                    if event.get("step") in ("complete", "error"):
                        break
                except asyncio.TimeoutError:
                    heartbeat = {**last_real_event, "heartbeat": True}
                    yield f"data: {json.dumps(heartbeat)}\n\n"
        else:
            # Pipeline might be done already — check for results
            results_path = JOBS_DIR / job_id / "results.json"
            if results_path.exists():
                yield f"data: {json.dumps({'step': 'complete', 'progress': 100, 'message': 'Analysis complete'})}\n\n"
            else:
                yield f"data: {json.dumps({'step': 'error', 'progress': 0, 'message': 'Job not found'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/jobs/{job_id}/results")
async def get_results(job_id: str):
    """Return complete analysis results for a job."""
    results_path = JOBS_DIR / job_id / "results.json"

    try:
        with open(results_path) as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(404, f"Results not found for job {job_id}")


@router.get("/api/jobs/{job_id}/video")
async def serve_video(job_id: str):
    """Serve the uploaded video file with Range support for seeking."""
    # Find the video file
    video_files = list(UPLOADS_DIR.glob(f"{job_id}_*"))

    if not video_files:
        raise HTTPException(404, f"Video not found for job {job_id}")

    video_path = video_files[0]

    # Determine content type
    suffix = video_path.suffix.lower()
    content_types = {".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime"}
    content_type = content_types.get(suffix, "video/mp4")

    return FileResponse(
        video_path,
        media_type=content_type,
        filename=video_path.name,
    )
