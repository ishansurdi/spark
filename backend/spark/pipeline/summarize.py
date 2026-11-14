"""Pre-generate AI summaries for every investigation so the site works without live AI.

Usage (from backend/):  python -m spark.pipeline.summarize [--force]
Writes data/processed/ai_summaries.json
"""
from __future__ import annotations

import argparse
import time

from spark.ai import gemini, service
from spark.config import PROCESSED
from spark.core import store
from spark.pipeline.fetch import write_json

PAUSE_S = 4  # stay inside free-tier rate limits


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="regenerate existing summaries")
    force = parser.parse_args().force
    summaries = service.stored_summaries()
    for inv in store.investigations():
        acc = inv["id"]
        if acc in summaries and not force:
            continue
        try:
            summaries[acc] = service.summarize(acc)
            print(f"ok   {acc} ({summaries[acc]['model']})")
            write_json(PROCESSED / "ai_summaries.json", summaries)
        except (gemini.AIUnavailable, ValueError, KeyError) as exc:
            print(f"FAIL {acc}: {exc}")
        time.sleep(PAUSE_S)


if __name__ == "__main__":
    main()
