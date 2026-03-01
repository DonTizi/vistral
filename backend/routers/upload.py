"""Upload router: accepts video files / YouTube URLs and triggers the processing pipeline."""

import asyncio
import re
import shutil
import subprocess
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from backend.config import UPLOADS_DIR, MAX_UPLOAD_SIZE_MB, ALLOWED_VIDEO_TYPES
from backend.pipeline.orchestrator import PipelineOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory registry of active pipelines (job_id -> orchestrator)
active_pipelines: dict[str, PipelineOrchestrator] = {}

YOUTUBE_RE = re.compile(
    r"^https?://(www\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)"
)

# Cache yt-dlp path at module load to avoid scanning $PATH per request
_YT_DLP_PATH = shutil.which("yt-dlp")


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

    return _start_pipeline(job_id, upload_path)


class UploadUrlRequest(BaseModel):
    url: str


@router.post("/api/upload-url")
async def upload_from_url(body: UploadUrlRequest):
    """Download a YouTube video and start processing.

    Only YouTube URLs are accepted (hackathon scope).
    """
    url = body.url.strip()
    if not YOUTUBE_RE.match(url):
        raise HTTPException(
            400,
            "Only YouTube URLs are supported for now — this project was built for a hackathon!",
        )

    if not _YT_DLP_PATH:
        raise HTTPException(500, "yt-dlp is not installed on the server.")

    job_id = str(uuid.uuid4())[:8]
    output_path = UPLOADS_DIR / f"{job_id}_yt.mp4"

    # Download in a thread so we don't block the event loop
    try:
        await asyncio.to_thread(
            _download_youtube, url, str(output_path)
        )
    except RuntimeError as e:
        raise HTTPException(400, str(e))

    file_size = output_path.stat().st_size
    if file_size > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        output_path.unlink(missing_ok=True)
        raise HTTPException(413, f"Downloaded video is too large. Maximum: {MAX_UPLOAD_SIZE_MB}MB.")

    logger.info("YouTube video downloaded: %s (%s, %.1f MB)", url, job_id, file_size / 1e6)

    return _start_pipeline(job_id, output_path)


def _start_pipeline(job_id: str, video_path: Path) -> dict:
    """Create orchestrator, register it, kick off background task, and return job info."""
    orchestrator = PipelineOrchestrator(job_id, video_path)
    active_pipelines[job_id] = orchestrator
    asyncio.create_task(_run_pipeline(job_id, orchestrator))
    return {"job_id": job_id, "stream_url": f"/api/jobs/{job_id}/stream"}


def _download_youtube(url: str, output_path: str) -> None:
    """Download best ≤720p via yt-dlp. Runs in a thread."""
    result = subprocess.run(
        [
            "yt-dlp",
            "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
            "--merge-output-format", "mp4",
            "--no-playlist",
            "-o", output_path,
            url,
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip().split("\n")[-1] if result.stderr else "Unknown error"
        raise RuntimeError(f"Failed to download video: {stderr}")


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
