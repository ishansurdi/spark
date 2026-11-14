"""Small, reusable helpers for turning messy spreadsheet cells into clean numbers."""
from __future__ import annotations

import io
import math
import re
from pathlib import Path

import pandas as pd

ATM_PER_BAR = 1 / 1.01325
ATM_PER_MMHG = 1 / 760
PSI_PER_ATM = 14.6959

# Digits glued to letters are chemistry (O2, CH4, C2H4), not values.
_NUMBER = re.compile(r"(?<![A-Za-z\d.])[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?(?![A-Za-z]*\d)")


def read_table(path: Path) -> pd.DataFrame:
    """Read a PSI CSV as strings with tidy column names and no blank rows."""
    text = path.read_bytes().decode("utf-8-sig", errors="replace")
    frame = pd.read_csv(io.StringIO(text), dtype=str).dropna(how="all")
    frame.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in frame.columns]
    return frame.apply(lambda col: col.str.strip() if col.dtype == object else col)


def numbers(value) -> list[float]:
    """All numbers found in a cell, e.g. '21; 26.5; 40' -> [21, 26.5, 40]."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return []
    return [float(n) for n in _NUMBER.findall(str(value).replace(",", ""))]


def first_number(value) -> float | None:
    found = numbers(value)
    return found[0] if found else None


def fraction_to_pct(value: float | None) -> float | None:
    """Mole fraction (0.21) -> percent (21). Leaves values that already look like percents alone."""
    if value is None:
        return None
    return round(value * 100, 3) if value <= 1 else round(value, 3)


def positive(value: float | None) -> float | None:
    return value if value is not None and value > 0 else None


def non_negative(value: float | None) -> float | None:
    return value if value is not None and value >= 0 else None


def percent(value: float) -> float:
    """Undo spreadsheet percent formatting slips such as '3400%' meaning 34 %."""
    return value / 100 if value > 100 else value


def clean_text(value) -> str | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def length_mm(value, default_unit: str = "mm") -> float | None:
    """'0.27 mm' -> 0.27, '.33 cm' -> 3.3; bare numbers use default_unit."""
    number = first_number(value)
    if number is None:
        return None
    text = str(value).lower()
    unit = "mm" if "mm" in text else "cm" if "cm" in text else default_unit
    return round(number * (10 if unit == "cm" else 1), 3)


def to_psi(pressure_atm: float | None) -> float | None:
    return round(pressure_atm * PSI_PER_ATM, 2) if pressure_atm else None
