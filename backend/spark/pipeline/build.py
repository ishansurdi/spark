"""Build the processed dataset the API and frontend read.

Usage (from backend/):  python -m spark.pipeline.build
Writes data/processed/{tests,investigations,environments}.json
"""
from __future__ import annotations

import json
from collections import Counter

from spark.config import CURATED, PROCESSED, PSI_PAGE, RAW_PSI
from spark.models import TestRecord
from spark.pipeline.fetch import write_json
from spark.pipeline.parse import clean_text, to_psi
from spark.pipeline.tables import normalize_all

# Which test attributes count as an experimental "variable" when comparing tests.
VARIABLES = {
    "fuel": "Fuel / material",
    "configuration": "Configuration",
    "o2_pct": "Oxygen (%)",
    "pressure_atm": "Pressure (atm)",
    "flow_cm_s": "Air flow (cm/s)",
    "inerts": "Diluent / suppressant mix",
}


def load_curated(name: str, key: str) -> list[dict]:
    return json.loads((CURATED / f"{name}.json").read_text(encoding="utf-8"))[key]


def load_psi_record(acc: str) -> dict:
    return json.loads((RAW_PSI / f"{acc}.json").read_text(encoding="utf-8"))


def value_range(values: list[float]) -> list[float] | None:
    return [round(min(values), 3), round(max(values), 3)] if values else None


def test_statistics(tests: list[TestRecord]) -> dict:
    """Ranges, counts and which variables changed between tests of one investigation."""
    measured = [t for t in tests if t.condition_basis == "measured"]
    stats = {
        "n_tests": len(tests),
        "n_measured": len(measured),
        "condition_basis": dict(Counter(t.condition_basis for t in tests)),
        "o2_pct": value_range([t.o2_pct for t in tests if t.o2_pct is not None]),
        "pressure_atm": value_range([t.pressure_atm for t in tests if t.pressure_atm]),
        "flow_cm_s": value_range([t.flow_cm_s for t in tests if t.flow_cm_s is not None]),
        "fuels": [f for f, _ in Counter(t.fuel for t in tests if t.fuel).most_common(12)],
        "outcomes": dict(Counter(t.outcome for t in tests if t.outcome)),
    }
    stats["pressure_psi"] = [to_psi(p) for p in stats["pressure_atm"]] if stats["pressure_atm"] else None
    stats["varied"], stats["fixed"] = split_variables(tests)
    return stats


def split_variables(tests: list[TestRecord]) -> tuple[list[str], list[str]]:
    varied, fixed = [], []
    for field, label in VARIABLES.items():
        values = {json.dumps(getattr(t, field), sort_keys=True) for t in tests if getattr(t, field) not in (None, {})}
        if len(values) > 1:
            varied.append(label)
        elif len(values) == 1:
            fixed.append(label)
    return varied, fixed


def psi_summary(record: dict) -> dict:
    """The PSI metadata fields shown in SPARK."""
    return {
        "title": record.get("title"),
        "acronym": record.get("investigationAcronym"),
        "doi": record.get("doi"),
        "url": PSI_PAGE.format(acc=record["accession"]),
        "project_type": record.get("projectType"),
        "platform": record.get("flightProgram"),
        "hardware": record.get("experimentHardware"),
        "sub_area": record.get("subResearchArea"),
        "start": record.get("investigationStartDate"),
        "end": record.get("investigationEndDate"),
        "objective": clean_text(record.get("objective")),
        "approach": clean_text(record.get("approach")),
        "hypothesis": clean_text(record.get("hypothesis")),
        "impacts": clean_text(record.get("researchImpacts")),
        "related": [r.strip() for r in (record.get("related_glds") or "").replace(",", " ").split() if r.startswith("PSI")],
        "publications": [
            {"title": p.get("title"), "authors": p.get("authorList"), "doi": p.get("doi")}
            for p in record.get("publications") or []
        ],
        "license": record.get("licenseName"),
    }


def build() -> None:
    tests = normalize_all()
    by_investigation: dict[str, list[TestRecord]] = {}
    for test in tests:
        by_investigation.setdefault(test.investigation, []).append(test)

    investigations = []
    for curated in load_curated("investigations", "investigations"):
        acc = curated["id"]
        psi = psi_summary(load_psi_record(acc))
        if curated.get("hardware_override") and not psi["hardware"]:
            psi["hardware"] = curated["hardware_override"]
        investigations.append({
            **{k: v for k, v in curated.items() if k != "hardware_override"},
            "psi": psi,
            "stats": test_statistics(by_investigation.get(acc, [])),
        })

    PROCESSED.mkdir(parents=True, exist_ok=True)
    write_json(PROCESSED / "tests.json", [t.model_dump(exclude_none=True, exclude_defaults=False) for t in tests])
    write_json(PROCESSED / "investigations.json", investigations)
    write_json(PROCESSED / "environments.json", load_curated("environments", "environments"))
    insights = json.loads((CURATED / "insights.json").read_text(encoding="utf-8"))
    write_json(PROCESSED / "insights.json", {k: v for k, v in insights.items() if not k.startswith("_")})
    print(f"{len(tests)} tests, {len(investigations)} investigations -> {PROCESSED}")


if __name__ == "__main__":
    build()
