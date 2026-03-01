"""Settings router: API key management and data operations."""

import json
import logging
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import backend.config as config

logger = logging.getLogger(__name__)
router = APIRouter()

ENV_PATH = config.BASE_DIR.parent / ".env"


def _read_env() -> dict[str, str]:
    """Read .env file into a dict."""
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip("\"'")
    return env


def _write_env(env: dict[str, str]) -> None:
    """Write dict back to .env file."""
    lines = [f'{k}={v}' for k, v in env.items()]
    ENV_PATH.write_text("\n".join(lines) + "\n")


def _mask_key(key: str) -> str:
    """Mask API key for display, showing first 4 and last 4 chars."""
    if len(key) <= 12:
        return "*" * len(key) if key else ""
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


class ApiKeyUpdate(BaseModel):
    api_key: str


@router.get("/api/settings")
async def get_settings():
    """Return current settings (API key masked)."""
    key = config.MISTRAL_API_KEY
    return {
        "mistral_api_key": _mask_key(key),
        "has_api_key": bool(key),
        "data_dir": str(config.DATA_DIR),
        "jobs_count": sum(1 for p in config.JOBS_DIR.iterdir() if p.is_dir()) if config.JOBS_DIR.exists() else 0,
        "uploads_count": sum(1 for p in config.UPLOADS_DIR.iterdir() if p.is_file()) if config.UPLOADS_DIR.exists() else 0,
    }


@router.put("/api/settings/api-key")
async def update_api_key(body: ApiKeyUpdate):
    """Update the Mistral API key in .env and runtime config."""
    key = body.api_key.strip()
    if not key:
        raise HTTPException(400, "API key cannot be empty")

    # Update runtime config
    config.MISTRAL_API_KEY = key
    os.environ["MISTRAL_API_KEY"] = key

    # Persist to .env
    env = _read_env()
    env["MISTRAL_API_KEY"] = key
    _write_env(env)

    logger.info("Mistral API key updated")
    return {"status": "ok", "mistral_api_key": _mask_key(key)}


@router.delete("/api/data")
async def purge_data():
    """Delete all job results and uploaded files."""
    jobs_deleted = 0
    uploads_deleted = 0

    # Clear jobs
    if config.JOBS_DIR.exists():
        for item in list(config.JOBS_DIR.iterdir()):
            if item.is_dir():
                shutil.rmtree(item)
                jobs_deleted += 1

    # Clear uploads
    if config.UPLOADS_DIR.exists():
        for item in list(config.UPLOADS_DIR.iterdir()):
            if item.is_file():
                item.unlink()
                uploads_deleted += 1

    logger.info(f"Purged {jobs_deleted} jobs and {uploads_deleted} uploads")
    return {
        "status": "ok",
        "jobs_deleted": jobs_deleted,
        "uploads_deleted": uploads_deleted,
    }
