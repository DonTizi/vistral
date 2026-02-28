"""Deduplicate frames using perceptual hashing."""

import logging

import imagehash
from PIL import Image

from backend.config import PHASH_THRESHOLD
from backend.models import FrameInfo

logger = logging.getLogger(__name__)


def dedup_frames(frames: list[FrameInfo], threshold: int = PHASH_THRESHOLD) -> list[FrameInfo]:
    """Remove near-duplicate frames using perceptual hash comparison.

    Compares each frame's phash to the previous unique frame. If the hamming
    distance is below the threshold, the frame is considered a duplicate.

    Args:
        frames: Ordered list of extracted frames.
        threshold: Minimum hamming distance to consider frames unique.

    Returns:
        Filtered list of unique frames.
    """
    if not frames:
        return []

    unique: list[FrameInfo] = []
    prev_hash = None

    for frame in frames:
        try:
            img = Image.open(frame.path)
            h = imagehash.phash(img)
        except Exception as e:
            logger.warning("Failed to hash frame %s: %s", frame.path, e)
            continue

        if prev_hash is None or (h - prev_hash) > threshold:
            unique.append(frame)
            prev_hash = h

    logger.info("Frame dedup: %d -> %d unique (%.0f%% reduction)",
                len(frames), len(unique),
                (1 - len(unique) / max(len(frames), 1)) * 100)
    return unique
