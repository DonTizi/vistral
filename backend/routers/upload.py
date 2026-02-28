"""Upload router: accepts video files and triggers the processing pipeline."""

import asyncio
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from backend.config import UPLOADS_DIR, MAX_UPLOAD_SIZE_MB, ALLOWED_VIDEO_TYPES
from backend.pipeline.orchestrator import PipelineOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory registry of active pipelines (job_id -> orchestrator)
active_pipelines: dict[str, PipelineOrchestrator] = {}


@router.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file and start processing.

    Returns job_id and stream_url for SSE progress tracking.
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(400, f"Unsupported file type: {content_type}. Use MP4, WebM, or MOV.")

    # Generate job ID
    job_id = str(uuid.uuid4())[:8]

    # Save uploaded file (streamed to disk in chunks)
    upload_path = UPLOADS_DIR / f"{job_id}_{file.filename}"
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_bytes = 0

    with open(upload_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                f.close()
                upload_path.unlink(missing_ok=True)
                raise HTTPException(413, f"File too large. Maximum size: {MAX_UPLOAD_SIZE_MB}MB")
            f.write(chunk)

    logger.info("Video uploaded: %s (%s, %.1f MB)", file.filename, job_id, total_bytes / 1e6)

    # Create orchestrator and start pipeline in background
    orchestrator = PipelineOrchestrator(job_id, upload_path)
    active_pipelines[job_id] = orchestrator
    asyncio.create_task(_run_pipeline(job_id, orchestrator))

    return {
        "job_id": job_id,
        "stream_url": f"/api/jobs/{job_id}/stream",
    }


async def _run_pipeline(job_id: str, orchestrator: PipelineOrchestrator):
    """Run pipeline in background. Cleanup on completion."""
    try:
        await orchestrator.run()
    except Exception as e:
        logger.error("Pipeline failed for %s: %s", job_id, e)
    finally:
        # Keep orchestrator around briefly for late SSE subscribers
        await asyncio.sleep(30)
        active_pipelines.pop(job_id, None)
