"""Vercel serverless entry point: exposes the FastAPI app from backend/spark."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from spark.api.main import app  # noqa: E402,F401
