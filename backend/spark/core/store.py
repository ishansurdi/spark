"""Read-only access to the processed dataset (loaded once per process)."""
from __future__ import annotations

import json
from functools import lru_cache

from spark.config import PROCESSED
from spark.models import Environment


def _load(name: str):
    return json.loads((PROCESSED / f"{name}.json").read_text(encoding="utf-8"))


@lru_cache
def investigations() -> list[dict]:
    return _load("investigations")


@lru_cache
def investigations_by_id() -> dict[str, dict]:
    return {inv["id"]: inv for inv in investigations()}


@lru_cache
def tests() -> list[dict]:
    return _load("tests")


@lru_cache
def tests_by_investigation() -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for test in tests():
        grouped.setdefault(test["investigation"], []).append(test)
    return grouped


@lru_cache
def environments() -> dict[str, Environment]:
    return {env["id"]: Environment(**env) for env in _load("environments")}


def get_investigation(acc: str) -> dict | None:
    return investigations_by_id().get(acc.upper())


def get_environment(env_id: str) -> Environment | None:
    return environments().get(env_id)
