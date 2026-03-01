"""Analyze video frames using Pixtral Large for OCR and scene understanding."""

import asyncio
import base64
import io
import json
import logging

import httpx
from PIL import Image

from backend.config import (
    MISTRAL_API_KEY, MISTRAL_BASE_URL, MODEL_VISION,
    MAX_FRAMES_PER_BATCH, FRAME_MAX_WIDTH,
    VISION_CONCURRENCY, VISION_MAX_RETRIES, VISION_RETRY_BASE_DELAY,
)
from backend.models import FrameInfo, VisionEvent
from backend.prompts.vision_analysis import VISION_PROMPT

logger = logging.getLogger(__name__)

CHAT_URL = f"{MISTRAL_BASE_URL}/chat/completions"

# Status codes that are safe to retry
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _resize_and_encode(frame_path: str) -> str:
    """Resize frame to max width and encode as base64 JPEG."""
    with Image.open(frame_path) as img:
        if img.width > FRAME_MAX_WIDTH:
            ratio = FRAME_MAX_WIDTH / img.width
            img = img.resize((FRAME_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


async def analyze_frames(frames: list[FrameInfo]) -> list[VisionEvent]:
    """Analyze frames in concurrent batches using Pixtral Large.

    Builds all batches upfront, then launches them in parallel limited by
    a semaphore (VISION_CONCURRENCY). Each batch includes retry logic with
    exponential backoff for transient errors (429/5xx).

    Args:
        frames: List of unique frames to analyze.

    Returns:
        List of VisionEvent per frame with extracted visual information,
        in chronological order.
    """
    if not frames:
        return []

    # Build all batches upfront
    batches: list[tuple[int, list[FrameInfo]]] = []
    for batch_start in range(0, len(frames), MAX_FRAMES_PER_BATCH):
        batch = frames[batch_start:batch_start + MAX_FRAMES_PER_BATCH]
        batches.append((batch_start, batch))

    total_batches = len(batches)
    logger.info("Vision analysis: %d frames in %d batches (concurrency=%d)",
                len(frames), total_batches, VISION_CONCURRENCY)

    semaphore = asyncio.Semaphore(VISION_CONCURRENCY)

    async def _process_batch(batch_idx: int, batch_start: int, batch: list[FrameInfo]) -> list[VisionEvent]:
        async with semaphore:
            logger.info("Batch %d/%d starting (%d frames, offset %d)",
                        batch_idx + 1, total_batches, len(batch), batch_start)
            events = await _analyze_batch_with_retry(batch)
            logger.info("Batch %d/%d complete: %d events",
                        batch_idx + 1, total_batches, len(events))
            return events

    # Launch all batches concurrently (semaphore limits parallelism)
    tasks = [
        _process_batch(i, batch_start, batch)
        for i, (batch_start, batch) in enumerate(batches)
    ]
    batch_results = await asyncio.gather(*tasks)

    # Flatten and sort by timestamp to preserve chronological order
    all_events: list[VisionEvent] = []
    for events in batch_results:
        all_events.extend(events)
    all_events.sort(key=lambda e: e.timestamp)

    logger.info("Vision analysis complete: %d events from %d frames",
                len(all_events), len(frames))
    return all_events


async def _analyze_batch_with_retry(frames: list[FrameInfo]) -> list[VisionEvent]:
    """Retry wrapper around _analyze_batch with exponential backoff."""
    for attempt in range(VISION_MAX_RETRIES + 1):
        events, retryable = await _analyze_batch(frames)
        if events is not None:
            return events
        if not retryable or attempt == VISION_MAX_RETRIES:
            logger.error("Batch failed after %d attempts, skipping %d frames",
                         attempt + 1, len(frames))
            return []
        delay = VISION_RETRY_BASE_DELAY * (2 ** attempt)
        logger.warning("Retryable error, attempt %d/%d — waiting %.1fs",
                       attempt + 1, VISION_MAX_RETRIES, delay)
        await asyncio.sleep(delay)
    return []


async def _analyze_batch(frames: list[FrameInfo]) -> tuple[list[VisionEvent] | None, bool]:
    """Send a single batch of frames to Pixtral.

    Returns:
        (events, retryable) — events is None on failure, retryable indicates
        whether the caller should retry.
    """
    # Build image content blocks
    image_contents = []
    frame_descriptions = []

    for i, frame in enumerate(frames):
        try:
            b64 = _resize_and_encode(frame.path)
        except Exception as e:
            logger.warning("Failed to encode frame %s: %s", frame.path, e)
            continue

        image_contents.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
        })
        frame_descriptions.append(f"Frame {i + 1} (timestamp: {frame.timestamp:.1f}s)")

    if not image_contents:
        return [], False

    prompt_text = VISION_PROMPT.format(
        frame_list="\n".join(frame_descriptions),
        num_frames=len(frames),
    )

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt_text},
                *image_contents,
            ],
        }
    ]

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                CHAT_URL,
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL_VISION,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "max_tokens": 4096,
                    "temperature": 0.1,
                },
            )
    except httpx.TimeoutException:
        logger.warning("Pixtral request timed out")
        return None, True
    except httpx.HTTPError as e:
        logger.warning("Pixtral HTTP error: %s", e)
        return None, True

    if resp.status_code != 200:
        retryable = resp.status_code in _RETRYABLE_STATUS_CODES
        logger.error("Pixtral API error (%d): %s", resp.status_code, resp.text[:500])
        return None, retryable

    try:
        content = resp.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (KeyError, json.JSONDecodeError) as e:
        logger.error("Failed to parse Pixtral response: %s", e)
        return None, False

    # Map results to VisionEvents
    events = []
    frame_results = result.get("frames", [])

    for i, frame in enumerate(frames):
        if i < len(frame_results):
            fr = frame_results[i]
            events.append(VisionEvent(
                frame_index=frame.index,
                timestamp=frame.timestamp,
                frame_path=frame.path,
                ocr_text=fr.get("ocr_text", []),
                scene_description=fr.get("scene_description", ""),
                slide_title=fr.get("slide_title"),
                objects=fr.get("objects", []),
            ))
        else:
            events.append(VisionEvent(
                frame_index=frame.index,
                timestamp=frame.timestamp,
                frame_path=frame.path,
            ))

    return events, False
