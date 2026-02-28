"""Analyze video frames using Pixtral Large for OCR and scene understanding."""

import base64
import io
import json
import logging
from pathlib import Path

import httpx
from PIL import Image

from backend.config import (
    MISTRAL_API_KEY, MISTRAL_BASE_URL, MODEL_VISION,
    MAX_FRAMES_PER_BATCH, FRAME_MAX_WIDTH,
)
from backend.models import FrameInfo, VisionEvent
from backend.prompts.vision_analysis import VISION_PROMPT

logger = logging.getLogger(__name__)

CHAT_URL = f"{MISTRAL_BASE_URL}/chat/completions"


def _resize_and_encode(frame_path: str) -> str:
    """Resize frame to max width and encode as base64 JPEG."""
    img = Image.open(frame_path)
    if img.width > FRAME_MAX_WIDTH:
        ratio = FRAME_MAX_WIDTH / img.width
        img = img.resize((FRAME_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


async def analyze_frames(frames: list[FrameInfo]) -> list[VisionEvent]:
    """Analyze frames in batches using Pixtral Large.

    Sends batches of up to 15 frames as base64 images. Requests JSON output
    with OCR text, scene description, and slide titles.

    Args:
        frames: List of unique frames to analyze.

    Returns:
        List of VisionEvent per frame with extracted visual information.
    """
    if not frames:
        return []

    all_events: list[VisionEvent] = []

    # Process in batches
    for batch_start in range(0, len(frames), MAX_FRAMES_PER_BATCH):
        batch = frames[batch_start:batch_start + MAX_FRAMES_PER_BATCH]
        logger.info("Analyzing frame batch %d-%d of %d",
                     batch_start, batch_start + len(batch), len(frames))

        events = await _analyze_batch(batch)
        all_events.extend(events)

    logger.info("Vision analysis complete: %d events from %d frames",
                len(all_events), len(frames))
    return all_events


async def _analyze_batch(frames: list[FrameInfo]) -> list[VisionEvent]:
    """Send a single batch of frames to Pixtral."""
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
        return []

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

    if resp.status_code != 200:
        logger.error("Pixtral API error (%d): %s", resp.status_code, resp.text[:500])
        return []

    try:
        content = resp.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
    except (KeyError, json.JSONDecodeError) as e:
        logger.error("Failed to parse Pixtral response: %s", e)
        return []

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

    return events
