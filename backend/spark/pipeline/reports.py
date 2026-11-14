"""Extract searchable text passages from downloaded PSI reports.

Usage (from backend/):  python -m spark.pipeline.reports
Writes data/processed/passages.json: [{investigation, source, page, text}]
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

from pypdf import PdfReader

from spark.config import DOCS, PROCESSED
from spark.pipeline.fetch import write_json

logging.getLogger("pypdf").setLevel(logging.ERROR)

CATEGORIES = ("Reports", "Science Documents")
SKIP_NAME = re.compile(r"(nomenclature|operations manual|software|interface|taskbook|pubslist|fact sheet|info sheet)", re.I)
MAX_PAGES = 80          # long dissertations: the first chapters carry the findings
PASSAGE_CHARS = 1200
MIN_CHARS = 200


def report_files() -> list[tuple[str, Path]]:
    files = []
    for path in sorted(DOCS.glob("PSI-*/*/*.pdf")):
        acc, category = path.parts[-3], path.parts[-2]
        if category in CATEGORIES and not SKIP_NAME.search(path.name):
            files.append((acc, path))
    return files


def page_texts(path: Path) -> list[str]:
    try:
        reader = PdfReader(str(path))
        return [(page.extract_text() or "") for page in reader.pages[:MAX_PAGES]]
    except Exception as exc:  # broken or scanned PDFs are skipped, not fatal
        print(f"skip {path.name}: {exc}")
        return []


def tidy(text: str) -> str:
    text = re.sub(r"-\n(?=[a-z])", "", text)      # re-join hyphenated words
    return re.sub(r"\s+", " ", text).strip()


def split_passages(text: str) -> list[str]:
    """Split a page into ~PASSAGE_CHARS chunks on sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    passages, current = [], ""
    for sentence in sentences:
        if len(current) + len(sentence) > PASSAGE_CHARS and current:
            passages.append(current.strip())
            current = ""
        current += sentence + " "
    if current.strip():
        passages.append(current.strip())
    return [p for p in passages if len(p) >= MIN_CHARS]


def source_title(path: Path, acc: str) -> str:
    name = path.stem.removeprefix(f"{acc}_")
    return re.sub(r"[_]+", " ", name).strip()


def build_passages() -> list[dict]:
    passages = []
    for acc, path in report_files():
        title = source_title(path, acc)
        for page_number, raw in enumerate(page_texts(path), start=1):
            for text in split_passages(tidy(raw)):
                passages.append({"investigation": acc, "source": title, "page": page_number, "text": text})
        print(f"{acc}: {title}")
    return passages


def main() -> None:
    passages = build_passages()
    write_json(PROCESSED / "passages.json", passages)
    print(f"{len(passages)} passages")


if __name__ == "__main__":
    main()
