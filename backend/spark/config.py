"""Central configuration: filesystem paths and environment settings."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW_PSI = DATA / "raw" / "psi"
DOCS = RAW_PSI / "docs"
CURATED = DATA / "curated"
PROCESSED = DATA / "processed"

PSI_API = "https://psi.nasa.gov/geode-py/ws"
PSI_PAGE = "https://psi.nasa.gov/physci/repo/data/investigations/{acc}"
USER_AGENT = "spark-fire-safety-dashboard"


class Settings(BaseSettings):
    """Runtime settings read from environment variables or the project .env file."""

    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    gemini_api: str = ""
    gemini_models: list[str] = ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]
    gemini_timeout_s: float = 25.0  # per model; a slow model falls through to the next one
    cors_origins: list[str] = ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
