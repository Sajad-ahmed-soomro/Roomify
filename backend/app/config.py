from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    # Shared secret the Next.js server sends in X-Internal-Key. The backend is
    # not meant to be reachable from browsers directly.
    internal_api_key: str

    # SQLite locally; on Render set the Neon URL (postgresql://…), see app/db.py.
    database_url: str = f"sqlite+aiosqlite:///{BACKEND_DIR / 'data' / 'roomify.db'}"

    # --- LLM (plans the design from the photo; see app/services/designer.py) ---
    llm_provider: Literal["gemini", "anthropic"] = "gemini"
    gemini_api_key: str | None = None  # free key: https://aistudio.google.com/apikey
    gemini_model: str = "gemini-flash-latest"
    gemini_fallback_model: str = "gemini-flash-lite-latest"  # used when the main model is busy
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: Literal["low", "medium", "high", "xhigh", "max"] = "low"

    # --- Image generation ---
    # "sd":     Stable Diffusion in this process (local development, or the worker).
    # "remote": call the render worker (worker.py on your laptop, exposed via ngrok).
    # "demo":   instant colour-graded preview, no model needed.
    image_engine: Literal["sd", "remote", "demo"] = "sd"
    render_url: str | None = None  # e.g. https://your-name.ngrok-free.app
    render_key: str | None = None  # shared secret with the worker
    # When the worker is unreachable, return a demo preview instead of an error.
    render_fallback_demo: bool = True

    sd_model_id: str = "stable-diffusion-v1-5/stable-diffusion-v1-5"
    sd_device: Literal["auto", "mps", "cuda", "cpu"] = "auto"
    sd_steps: int = 30
    sd_max_side: int = 768

    # --- Image storage (see app/services/images.py) ---
    image_storage: Literal["db", "s3"] = "db"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # https://storage.googleapis.com for GCS
    s3_region: str = "auto"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    # --- Limits ---
    max_upload_bytes: int = 10 * 1024 * 1024
    # Designs each account may create (0 = unlimited). Deleting doesn't refund.
    max_designs_per_user: int = 2
    # Comma-separated emails with no limit (e.g. your own).
    unlimited_emails: str = ""

    def is_unlimited(self, email: str) -> bool:
        allowed = {e.strip().lower() for e in self.unlimited_emails.split(",") if e.strip()}
        return self.max_designs_per_user == 0 or email.lower() in allowed


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
