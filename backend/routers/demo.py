"""Demo router: serves pre-computed analysis results."""

import json
import logging

from fastapi import APIRouter, HTTPException

from backend.config import DEMOS_DIR

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_DEMOS = {"meeting", "interview", "podcast"}


@router.get("/api/demo/{name}")
async def get_demo(name: str):
    """Load and return a pre-computed demo result.

    Available demos: meeting, interview, podcast.
    """
    if name not in VALID_DEMOS:
        raise HTTPException(404, f"Demo '{name}' not found. Available: {', '.join(VALID_DEMOS)}")

    demo_path = DEMOS_DIR / f"{name}.json"

    try:
        with open(demo_path) as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(404, f"Demo data not found for '{name}'")
