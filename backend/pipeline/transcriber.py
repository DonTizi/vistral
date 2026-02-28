"""Transcribe audio using Voxtral API with speaker diarization."""

import logging
from pathlib import Path

import httpx

from backend.config import MISTRAL_API_KEY, MISTRAL_BASE_URL, MODEL_ASR
from backend.models import TranscriptSegment

logger = logging.getLogger(__name__)

TRANSCRIPTION_URL = f"{MISTRAL_BASE_URL}/audio/transcriptions"


async def transcribe(audio_path: Path) -> list[TranscriptSegment]:
    """Send audio to Voxtral for transcription with speaker diarization.

    Args:
        audio_path: Path to WAV file.

    Returns:
        List of transcript segments with speaker, text, and timestamps.
    """
    logger.info("Transcribing %s with %s", audio_path.name, MODEL_ASR)

    async with httpx.AsyncClient(timeout=300) as client:
        with open(audio_path, "rb") as f:
            resp = await client.post(
                TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {MISTRAL_API_KEY}"},
                files={"file": (audio_path.name, f, "audio/wav")},
                data={
                    "model": MODEL_ASR,
                    "response_format": "verbose_json",
                    "timestamp_granularities": '["segment","word"]',
                },
            )

    if resp.status_code != 200:
        raise RuntimeError(f"Voxtral transcription failed ({resp.status_code}): {resp.text[:500]}")

    data = resp.json()
    segments: list[TranscriptSegment] = []

    # Voxtral returns segments with speaker labels when diarization is available
    raw_segments = data.get("segments", [])

    if not raw_segments:
        # Fallback: treat entire text as single segment
        text = data.get("text", "")
        if text:
            segments.append(TranscriptSegment(
                speaker="Speaker A",
                text=text.strip(),
                start=0.0,
                end=data.get("duration", 0.0),
            ))
        return segments

    for seg in raw_segments:
        speaker = seg.get("speaker") or "Speaker A"

        segments.append(TranscriptSegment(
            speaker=speaker,
            text=seg.get("text", "").strip(),
            start=seg.get("start", 0.0),
            end=seg.get("end", 0.0),
        ))

    # Merge consecutive segments from same speaker if they're close together
    merged = _merge_consecutive(segments)
    logger.info("Transcription complete: %d segments", len(merged))
    return merged


def _merge_consecutive(segments: list[TranscriptSegment], gap_threshold: float = 1.0) -> list[TranscriptSegment]:
    """Merge consecutive segments from the same speaker if gap is small."""
    if not segments:
        return []

    merged = [segments[0]]
    for seg in segments[1:]:
        prev = merged[-1]
        if seg.speaker == prev.speaker and (seg.start - prev.end) < gap_threshold:
            merged[-1] = TranscriptSegment(
                speaker=prev.speaker,
                text=f"{prev.text} {seg.text}",
                start=prev.start,
                end=seg.end,
            )
        else:
            merged.append(seg)

    return merged
