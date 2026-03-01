"""Deduplicate frames using perceptual hashing with sliding window."""

import logging
from collections import deque

import imagehash
from PIL import Image

from backend.config import PHASH_THRESHOLD, DEDUP_WINDOW_SIZE, MAX_TOTAL_FRAMES
from backend.models import FrameInfo

logger = logging.getLogger(__name__)


def dedup_frames(frames: list[FrameInfo], threshold: int = PHASH_THRESHOLD) -> list[FrameInfo]:
    """Remove near-duplicate frames using perceptual hash comparison.

    Compares each frame's phash against the last N unique frames (sliding
    window). A frame is kept only if it differs from ALL recent hashes.
    After dedup, applies a hard cap via uniform subsampling to keep
    temporal distribution even.

    Args:
        frames: Ordered list of extracted frames.
        threshold: Minimum hamming distance to consider frames unique.

    Returns:
        Filtered list of unique frames, capped at MAX_TOTAL_FRAMES.
    """
    if not frames:
        return []

    unique: list[FrameInfo] = []
    recent_hashes: deque = deque(maxlen=DEDUP_WINDOW_SIZE)

    for frame in frames:
        try:
            with Image.open(frame.path) as img:
                h = imagehash.phash(img)
        except Exception as e:
            logger.warning("Failed to hash frame %s: %s", frame.path, e)
            continue

        # Keep frame only if it differs from ALL recent unique hashes
        is_duplicate = any((h - prev) <= threshold for prev in recent_hashes)

        if not is_duplicate:
            unique.append(frame)
            recent_hashes.append(h)

    logger.info("Frame dedup: %d -> %d unique (%.0f%% reduction)",
                len(frames), len(unique),
                (1 - len(unique) / max(len(frames), 1)) * 100)

    # Hard cap: uniform subsampling to preserve temporal distribution
    if len(unique) > MAX_TOTAL_FRAMES:
        step = len(unique) / MAX_TOTAL_FRAMES
        subsampled = [unique[int(i * step)] for i in range(MAX_TOTAL_FRAMES)]
        logger.info("Hard cap applied: %d -> %d frames (uniform subsample)",
                    len(unique), len(subsampled))
        return subsampled

    return unique
