"""Thin client for the public NASA PSI repository API (the same calls the PSI website makes)."""
from __future__ import annotations

import json
from typing import Any, Iterator

import httpx

from spark.config import PSI_API, USER_AGENT

_client = httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=300, follow_redirects=True)


def _get_json(path: str, **params) -> Any:
    response = _client.get(f"{PSI_API}{path}", params=params)
    response.raise_for_status()
    return response.json()


def search_investigations(term: str = "", size: int = 500) -> list[dict]:
    """All PSI investigation search records (flat metadata)."""
    data = _get_json("/repo/search", term=term, source="psi", type="investigation", size=size)
    return [hit["_source"] for hit in data["hits"]["hits"]]


def combustion_accessions() -> list[str]:
    """Accession IDs (e.g. 'PSI-25') of every investigation in the Combustion Science research area."""
    records = search_investigations()
    accs = [r["Accession"] for r in records if "Combustion" in json.dumps(r.get("Research Area", ""))]
    return sorted(accs, key=accession_number)


def accession_number(acc: str) -> int:
    return int(acc.split("-")[1])


def get_investigation(acc: str) -> dict:
    """Full investigation record: objectives, approach, DOI, publications, experimental tables..."""
    return _get_json(f"/repo/investigations/{acc}")


def list_files(acc: str, version: int) -> list[dict]:
    """Every file of the current investigation version, flattened from PSI's folder tree."""
    body = {"folder": f"psi-data/{acc}/", "fileType": "study", "studyId": acc, "version": version}
    response = _client.post(f"{PSI_API}/files/v2", json=body)
    response.raise_for_status()
    return list(_flatten(response.json().get("files") or []))


def _flatten(nodes: list[dict], category: str | None = None) -> Iterator[dict]:
    for node in nodes:
        if node.get("files"):
            yield from _flatten(node["files"], node.get("sortingCategory") or node.get("displayName") or category)
        elif not node.get("directory"):
            yield {
                "name": node["key"].rsplit("/", 1)[-1],
                "key": node["key"],
                "size": node.get("bytes_size") or 0,
                "category": node.get("sortingCategory") or category,
                "version": node.get("version"),
                "restricted": bool(node.get("restricted") or node.get("restrictedAccess")),
            }


def download(acc: str, file_name: str, version: int | None = 1) -> bytes:
    """Download one file via PSI's signed S3 URL."""
    signed = _client.get(
        f"{PSI_API}/studies/{acc}/download",
        params={"file": file_name, "version": version or 1, "redirect": "false"},
    )
    signed.raise_for_status()
    url = signed.text.strip().strip('"')
    response = _client.get(url)
    response.raise_for_status()
    return response.content
