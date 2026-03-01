import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
JOBS_DIR = DATA_DIR / "jobs"
UPLOADS_DIR = DATA_DIR / "uploads"
DEMOS_DIR = BASE_DIR.parent / "precompute" / "demos"

# Ensure directories exist
JOBS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DEMOS_DIR.mkdir(parents=True, exist_ok=True)

# Mistral API
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_BASE_URL = "https://api.mistral.ai/v1"

# Models
MODEL_ASR = "voxtral-mini-latest"
MODEL_VISION = "pixtral-12b-2409"
MODEL_REASONING = "mistral-small-latest"
MODEL_REASONING_FALLBACK = "mistral-large-latest"

# Pipeline
MAX_FRAMES_PER_BATCH = 8            # Pixtral API hard limit is 8 images
MAX_TOTAL_FRAMES = 150             # hard cap before vision analysis
DEDUP_WINDOW_SIZE = 5              # compare against N last unique hashes
VISION_CONCURRENCY = 4             # concurrent Pixtral batches
VISION_MAX_RETRIES = 3             # retries on 429/5xx
VISION_RETRY_BASE_DELAY = 2.0     # exponential backoff base (2s, 4s, 8s)
FRAME_MAX_WIDTH = 1024
PHASH_THRESHOLD = 8
SCENE_DETECT_THRESHOLD = 0.3
MIN_FRAME_INTERVAL = 30  # seconds
TIMELINE_SNAPSHOT_INTERVAL = 60  # seconds

# Upload limits
MAX_UPLOAD_SIZE_MB = 500
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
