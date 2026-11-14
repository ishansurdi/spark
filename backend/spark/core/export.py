"""Flat CSV export of normalized test records for modelers."""
from __future__ import annotations

import csv
import io

# Fixed leading columns; nested inerts/metrics are flattened after them.
BASE_COLUMNS = [
    "investigation", "test_id", "date", "fuel", "fuel_phase", "configuration",
    "o2_pct", "o2_basis", "pressure_atm", "flow_cm_s", "condition_basis", "outcome", "notes",
]
NESTED = ("inerts", "metrics")


def flatten(test: dict) -> dict:
    row = {k: test.get(k) for k in BASE_COLUMNS}
    for group in NESTED:
        for key, value in (test.get(group) or {}).items():
            row[f"{group[:-1] if group == 'inerts' else 'metric'}_{key}"] = value
    return row


def columns(rows: list[dict]) -> list[str]:
    extra = sorted({k for row in rows for k in row} - set(BASE_COLUMNS))
    return BASE_COLUMNS + extra


def to_csv(tests: list[dict]) -> str:
    rows = [flatten(t) for t in tests]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns(rows), extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()
