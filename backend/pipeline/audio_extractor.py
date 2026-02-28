"""Extract audio from video using FFmpeg. Single responsibility: video -> WAV."""

import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


async def extract_audio(video_path: Path, output_dir: Path) -> Path:
    """Extract 16kHz mono WAV from video file.

    Args:
        video_path: Path to input video.
        output_dir: Directory to write the WAV file.

    Returns:
        Path to the extracted WAV file.
    """
    output_path = output_dir / "audio.wav"

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vn",                    # no video
        "-acodec", "pcm_s16le",   # 16-bit PCM
        "-ar", "16000",           # 16kHz sample rate
        "-ac", "1",               # mono
        "-y",                     # overwrite
        str(output_path),
    ]

    logger.info("Extracting audio: %s -> %s", video_path.name, output_path.name)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {stderr.decode()[-500:]}")

    logger.info("Audio extracted: %s (%.1f MB)", output_path.name, output_path.stat().st_size / 1e6)
    return output_path
