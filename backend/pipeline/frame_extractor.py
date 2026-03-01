"""Adaptive frame extraction from video using FFmpeg scene detection."""

import asyncio
import json
import logging
import re
from pathlib import Path

from backend.config import SCENE_DETECT_THRESHOLD, MIN_FRAME_INTERVAL
from backend.models import FrameInfo

logger = logging.getLogger(__name__)


async def _get_video_duration(video_path: Path) -> float | None:
    """Get video duration in seconds using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        str(video_path),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        info = json.loads(stdout.decode())
        return float(info["format"]["duration"])
    except Exception as e:
        logger.warning("Could not get video duration via ffprobe: %s", e)
        return None


def _compute_frame_interval(duration_seconds: float | None) -> int:
    """Compute adaptive frame interval based on video duration.

    Returns:
        Interval in seconds: 30s for <15min, 60s for 15-30min, 90s for >30min.
    """
    if duration_seconds is None:
        return MIN_FRAME_INTERVAL

    duration_minutes = duration_seconds / 60.0

    if duration_minutes > 30:
        interval = 90
    elif duration_minutes > 15:
        interval = 60
    else:
        interval = MIN_FRAME_INTERVAL

    logger.info("Video duration: %.1f min -> frame interval: %ds",
                duration_minutes, interval)
    return interval


async def extract_frames(video_path: Path, output_dir: Path) -> list[FrameInfo]:
    """Extract frames using scene detection + minimum interval fallback.

    Uses FFmpeg's scene detection filter combined with a dynamic minimum
    interval (adapted to video length) to produce a balanced set of
    representative frames.

    Args:
        video_path: Path to input video.
        output_dir: Directory to write frame JPGs.

    Returns:
        List of FrameInfo with index, timestamp, and path.
    """
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(exist_ok=True)

    # Get duration and compute adaptive interval
    duration = await _get_video_duration(video_path)
    interval = _compute_frame_interval(duration)

    # Scene detection + interval fallback filter
    vf = (
        f"select='gt(scene\\,{SCENE_DETECT_THRESHOLD})"
        f"+isnan(prev_selected_t)"
        f"+gte(t-prev_selected_t\\,{interval})',"
        f"showinfo"
    )

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", vf,
        "-vsync", "vfr",
        "-q:v", "2",
        "-y",
        str(frames_dir / "frame_%04d.jpg"),
    ]

    logger.info("Extracting frames with scene detection (threshold=%.1f, interval=%ds)",
                SCENE_DETECT_THRESHOLD, interval)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    stderr_text = stderr.decode()

    # Parse timestamps from showinfo output
    # Format: [Parsed_showinfo...] n:   0 pts:  12345 pts_time:1.234
    timestamps = []
    for match in re.finditer(r"pts_time:\s*([\d.]+)", stderr_text):
        timestamps.append(float(match.group(1)))

    # Collect frame files
    frame_files = sorted(frames_dir.glob("frame_*.jpg"))
    frames = []

    for i, fpath in enumerate(frame_files):
        ts = timestamps[i] if i < len(timestamps) else i * interval
        frames.append(FrameInfo(index=i, timestamp=ts, path=str(fpath)))

    # Fallback: if no frames extracted, take first frame
    if not frames:
        logger.warning("No frames extracted via scene detection, extracting first frame")
        cmd_fallback = [
            "ffmpeg", "-i", str(video_path),
            "-vframes", "1", "-q:v", "2", "-y",
            str(frames_dir / "frame_0001.jpg"),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd_fallback, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        fallback_path = frames_dir / "frame_0001.jpg"
        if fallback_path.exists():
            frames.append(FrameInfo(index=0, timestamp=0.0, path=str(fallback_path)))

    logger.info("Extracted %d frames", len(frames))
    return frames
