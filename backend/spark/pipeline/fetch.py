"""Download PSI combustion metadata, experimental tables and selected documents.

Usage (from backend/):
    python -m spark.pipeline.fetch metadata   # records, file index, experimental tables
    python -m spark.pipeline.fetch docs       # reports, science documents, small analyzed data
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from spark.config import DOCS, RAW_PSI
from spark.psi import client

# Categories worth keeping locally, with a per-file size cap in bytes.
# Raw Data (~13 TB of images/video/logs), calibration and engineering files are skipped.
DOC_CATEGORIES = {"Reports": 200e6, "Science Documents": 200e6, "Analyzed Data": 20e6}
HEAVY_KEYS = ("added", "modified", "removed")


def safe_name(name: str) -> str:
    return name.replace(" ", "_").replace("/", "_")


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")


def fetch_metadata() -> None:
    accs = client.combustion_accessions()
    print(f"{len(accs)} combustion investigations")
    write_json(RAW_PSI.parent / "psi_all_investigations.json", client.search_investigations())
    index = {}
    for acc in accs:
        record = client.get_investigation(acc)
        write_json(RAW_PSI / f"{acc}.json", {k: v for k, v in record.items() if k not in HEAVY_KEYS})
        files = client.list_files(acc, record.get("version"))
        index[acc] = {"title": record.get("title"), "version": record.get("version"), "files": files}
        for table in record.get("experimentalTable") or []:
            content = client.download(acc, table["file_name"], table.get("version"))
            (RAW_PSI / safe_name(table["file_name"])).write_bytes(content)
        print(f"{acc}: {len(files)} files, {len(record.get('experimentalTable') or [])} tables")
    write_json(RAW_PSI / "files_index.json", index)


def fetch_docs() -> None:
    index = json.loads((RAW_PSI / "files_index.json").read_text(encoding="utf-8"))
    wanted = [
        (acc, f) for acc, entry in index.items() for f in entry["files"]
        if f["category"] in DOC_CATEGORIES and f["size"] <= DOC_CATEGORIES[f["category"]] and not f["restricted"]
    ]
    print(f"{len(wanted)} documents, {sum(f['size'] for _, f in wanted) / 1e6:.0f} MB")
    for acc, f in wanted:
        dest = DOCS / acc / f["category"] / f["name"]
        if dest.exists() and dest.stat().st_size == f["size"]:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            dest.write_bytes(client.download(acc, f["name"], f.get("version")))
            print(f"ok   {acc} {f['name']}")
        except Exception as exc:  # keep going; failures are listed for a re-run
            print(f"FAIL {acc} {f['name']}: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("what", choices=["metadata", "docs"])
    {"metadata": fetch_metadata, "docs": fetch_docs}[parser.parse_args().what]()


if __name__ == "__main__":
    main()
