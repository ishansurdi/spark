"""Normalizers that turn each PSI experimental table into common TestRecord rows.

Every table has its own column names and units, so each investigation gets one small
function registered with @table(...). Shared parsing lives in spark.pipeline.parse.
ISS glovebox/rack tests without a recorded atmosphere use the nominal cabin air
(21 % O2, 1 atm) and are flagged condition_basis="nominal".
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import product
from typing import Callable, Iterable, Iterator

import pandas as pd

from spark.config import RAW_PSI
from spark.models import TestRecord
from spark.pipeline.parse import (
    ATM_PER_BAR, ATM_PER_MMHG, clean_text, first_number, fraction_to_pct, length_mm, non_negative, numbers, percent, positive, read_table,
)

NOMINAL_AIR = {"o2_pct": 21.0, "pressure_atm": 1.0, "condition_basis": "nominal"}
Normalizer = Callable[[pd.DataFrame], Iterable[TestRecord]]


@dataclass(frozen=True)
class TableSpec:
    accession: str
    file_glob: str
    normalize: Normalizer


REGISTRY: list[TableSpec] = []


def table(accession: str, file_glob: str):
    """Register a normalizer for the PSI table file(s) matching file_glob."""
    def wrap(fn: Normalizer) -> Normalizer:
        REGISTRY.append(TableSpec(accession, file_glob, fn))
        return fn
    return wrap


def rows(frame: pd.DataFrame) -> Iterator[dict]:
    return (row.to_dict() for _, row in frame.iterrows())


def metrics(**values) -> dict[str, float]:
    return {k: v for k, v in values.items() if v is not None}


def mean_or_none(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 3) if values else None


# ---------------------------------------------------------------- droplets (MDCA)

@table("PSI-69", "PSI-69_*FLEX.csv")
def flex(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-69", test_id=clean_text(r["FLEX Identifier"]), date=clean_text(r["Test Date"]),
            fuel=clean_text(r["Fuel"]), fuel_phase="liquid", configuration="single droplet",
            o2_pct=fraction_to_pct(first_number(r["O initial ambient composition; mole fraction"])),
            pressure_atm=_mmhg(r["Ambient pressure; mmHg"]),
            inerts=metrics(
                N2=first_number(r["N initial ambient composition; mole fraction"]),
                CO2=first_number(r["CO initial ambient composition; mole fraction"]),
                He=first_number(r["He initial ambient composition; mole fraction"]),
            ),
            outcome=clean_text(r["Test end"]),
            metrics=metrics(
                droplet_initial_diameter_mm=first_number(r["Droplet initial diameter; mm"]),
                extinction_diameter_mm=first_number(r["Visible flame extinction diameter; mm"]),
                burning_rate_mm2_s=first_number(r["Burning rate; mm"]),
                burn_time_s=first_number(r["Burn time; s"]),
            ),
        )


def _mmhg(value) -> float | None:
    mmhg = positive(first_number(value))
    return round(mmhg * ATM_PER_MMHG, 4) if mmhg else None


@table("PSI-68", "PSI-68_*Flex2.csv")
def flex2(frame):
    """FLEX-2 publishes its test matrix (lists of O2 and pressure), expanded here into condition points."""
    for r in rows(frame):
        for o2, p in product(numbers(r["Oxygen Mole Fraction"]), numbers(r["Ambient Pressure (atm)"])):
            yield TestRecord(
                investigation="PSI-68", fuel=clean_text(r["Sample (Fuel Type)"]), fuel_phase="liquid",
                configuration="droplet (test matrix)", o2_pct=fraction_to_pct(o2), pressure_atm=p,
                condition_basis="test matrix",
                notes=f"Diluent {clean_text(r['Ambient Gas Mixture'])}; flow {clean_text(r['Flow Velocity (cm/s)'])} cm/s; "
                      f"droplets {clean_text(r['Initial Droplet Diameter (mm)'])} mm",
            )


@table("PSI-39", "PSI-39_*CFI.csv")
def cfi(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-39", test_id=clean_text(r["Flex Number"]), date=clean_text(r["Test Date"]),
            fuel=clean_text(r["Fuel"]), fuel_phase="liquid",
            configuration="fiber-supported droplet" if str(r["Fiber"]).lower().startswith("y") else "free droplet",
            o2_pct=fraction_to_pct(first_number(r["Oxygen"])), pressure_atm=first_number(r["Pressure"]),
            inerts=metrics(N2=first_number(r["Nitrogen"]), He=first_number(r["Helium"])),
        )


# ---------------------------------------------------------------- gaseous flames (ACME, CIR)

@table("PSI-159", "PSI-159_*Normal_Flames.csv")
def cfi_g_normal(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-159", test_id=clean_text(r["Test"]), fuel=clean_text(r["Fuel"]), fuel_phase="gas",
            configuration="normal spherical flame", o2_pct=fraction_to_pct(first_number(r["XO2 before test"])),
            pressure_atm=_bar(r["approx p (bar)"]), outcome=_cfi_g_outcome(r, "Self-ext or flow term"),
            metrics=metrics(
                fuel_fraction=first_number(r["Xf"]), adiabatic_flame_temp_K=first_number(r["Tad (K)"]),
                burn_time_s=first_number(r["burn time (sec)"]), stoichiometric_mixture_fraction=first_number(r["Zst"]),
            ),
            notes=clean_text(" ".join(filter(None, [clean_text(r.get("Cool flame?")), clean_text(r.get("Comments"))]))),
        )


@table("PSI-159", "PSI-159_*Inverse_Flames.csv")
def cfi_g_inverse(frame):
    """Inverse flames: oxygen issues from the burner (up to 85 % O2) into a fuel/N2 chamber."""
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-159", test_id=clean_text(r["Test"]), fuel=clean_text(r["Fuel"]), fuel_phase="gas",
            configuration="inverse spherical flame", o2_pct=fraction_to_pct(first_number(r["XO2"])),
            o2_basis="oxidizer stream", pressure_atm=_bar(r["approx p (bar)"]),
            outcome=_cfi_g_outcome(r, "Self -ext or flow term"),
            metrics=metrics(
                ambient_fuel_fraction=first_number(r["Xf before test"]), adiabatic_flame_temp_K=first_number(r["Tad (K)"]),
                burn_time_s=first_number(r["burn time (sec)"]), stoichiometric_mixture_fraction=first_number(r["Zst"]),
            ),
            notes=clean_text(r.get("Comments")),
        )


def _bar(value) -> float | None:
    bar = positive(first_number(value))
    return round(bar * ATM_PER_BAR, 4) if bar else None


def _cfi_g_outcome(r: dict, end_column: str) -> str:
    if str(r.get("Hot ignition", "")).strip().lower().startswith("n"):
        return "No ignition"
    return {"SE": "Self-extinguished", "FT": "Flow terminated"}.get(clean_text(r.get(end_column)) or "", "Ignited")


@table("PSI-10", "PSI-10_*Normal_Flame.csv")
def flame_design_normal(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-10", test_id=clean_text(r["Test"]), fuel=clean_text(r["Fuel"]), fuel_phase="gas",
            configuration="normal spherical flame", o2_pct=fraction_to_pct(first_number(r["XO2 (init)"])),
            pressure_atm=first_number(r["pmean (atm)"]),
            metrics=metrics(
                fuel_fraction=first_number(r["Xfuel"]), adiabatic_flame_temp_K=first_number(r["Tad (K)"]),
                stoichiometric_mixture_fraction=first_number(r["mean Zst"]),
            ),
            notes="Flow ramped during test" if "RAMP" in str(r["Xfuel"]).upper() else None,
        )


@table("PSI-10", "PSI-10_*Inverse_Flame.csv")
def flame_design_inverse(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-10", test_id=clean_text(r["Test"]), fuel="C2H4", fuel_phase="gas",
            configuration="inverse spherical flame", o2_pct=fraction_to_pct(first_number(r["XO2"])),
            o2_basis="oxidizer stream", pressure_atm=first_number(r["pmean (atm)"]),
            metrics=metrics(
                ambient_fuel_fraction=first_number(r["XC2H4 initial"]), adiabatic_flame_temp_K=first_number(r["Tad (K)"]),
                stoichiometric_mixture_fraction=first_number(r["mean Zst"]),
            ),
        )


@table("PSI-20", "PSI-20_*BRE.csv")
def bre(frame):
    """Burning Rate Emulator: one row per test day listing the O2 levels of the flames that ignited."""
    for r in rows(frame):
        date = "-".join(filter(None, (clean_text(r[c]) for c in ("Year", "Month", "Date"))))
        for o2 in map(percent, numbers(r["Oxygen Conc (percent)"])):
            yield TestRecord(
                investigation="PSI-20", date=date, fuel=clean_text(r["Fuel Bottle"]), fuel_phase="gas",
                configuration=f"porous burner {clean_text(r['Burner Size (mm)'])} mm (emulates solid/liquid fuel)",
                o2_pct=o2, condition_basis="daily summary",
                metrics=metrics(flames_ignited_that_day=first_number(r["Flames Ignited"])),
                notes="Chamber pressure varied but not listed in the summary table",
            )


@table("PSI-21", "PSI-21_*CLD_Flame.csv")
def cld_flame(frame):
    for r in _with_value(frame, "Test Day"):
        yield TestRecord(
            investigation="PSI-21", date=clean_text(r["Test Day"]), fuel=clean_text(r["Fuel Bottle"]), fuel_phase="gas",
            configuration=f"coflow flame ({clean_text(r['Test Type'])})", **_nominal_summary(),
            metrics=metrics(flames_ignited_that_day=first_number(r["Flames ignited"])),
            notes=f"Fuel concentration {clean_text(r['Fuel conc. Range'])}",
        )


@table("PSI-22", "PSI-22_*E-FIELD_Flames.csv")
def e_field(frame):
    for r in _with_value(frame, "Test Day"):
        yield TestRecord(
            investigation="PSI-22", date=clean_text(r["Test Day"]), fuel=clean_text(r["Fuel Bottle"]), fuel_phase="gas",
            configuration=f"electric-field flame, {clean_text(r['Mesh Polarity'])} mesh", **_nominal_summary(),
            metrics=metrics(flames_ignited_that_day=first_number(r["Flames Ignited"])),
            notes=f"{clean_text(r['Test Type'])}; fuel {clean_text(r['Fuel Conc'])}",
        )


@table("PSI-23", "PSI-23_*s-Flame.csv")
def s_flame(frame):
    for r in _with_value(frame, "Test Day*"):
        yield TestRecord(
            investigation="PSI-23", date=clean_text(r["Test Day*"]), fuel=clean_text(r["Fuel Bottle"]), fuel_phase="gas",
            configuration="spherical diffusion flame", o2_pct=first_number(r["Atmosphere*"]) or 21.0,
            pressure_atm=1.0, condition_basis="daily summary",
            metrics=metrics(flames_ignited_that_day=first_number(r["Flames Ignited*"])),
            notes=clean_text(r["Test Type"]),
        )


def _with_value(frame: pd.DataFrame, column: str) -> Iterator[dict]:
    return (r for r in rows(frame) if clean_text(r.get(column)) and first_number(r[column]))


def _nominal_summary() -> dict:
    return {**NOMINAL_AIR, "condition_basis": "daily summary"}


# ---------------------------------------------------------------- jet flames in the MSG flow duct

@table("PSI-107", "PSI-107_*Spice.csv")
def spice(frame):
    for r in rows(frame.drop_duplicates()):
        yield TestRecord(
            investigation="PSI-107", date=f"GMT day {clean_text(r['GMT date'])}", fuel=clean_text(r["Fuel"]),
            fuel_phase="gas", configuration=f"coflow jet flame, {first_number(r['Nozzle (mm)'])} mm nozzle",
            **NOMINAL_AIR, flow_cm_s=non_negative(first_number(r["Air Rate (cm/s)"])),
            metrics=metrics(fuel_rate_mg_s=first_number(r["Fuel Rate (mg/s)"]), nozzle_mm=first_number(r["Nozzle (mm)"])),
        )


@table("PSI-106", "PSI-106_*Slice.csv")
def slice_(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-106", date=clean_text(str(r["Test Date"]).split(" ")[0]), fuel=clean_text(r["Fuel Type"]),
            fuel_phase="gas", configuration="lifted coflow jet flame", **{**NOMINAL_AIR, "condition_basis": "daily summary"},
        )


# ---------------------------------------------------------------- solid materials

@table("PSI-25", "PSI-25_*BASS-II.csv")
def bass_ii(frame):
    for r in rows(frame):
        initial_o2 = first_number(r["Calibrated initial O2 % by vol"])
        yield TestRecord(
            investigation="PSI-25", test_id=clean_text(r["Test #"]), date=clean_text(r["Date"]),
            fuel=clean_text(r["Fuel Sample Material"]), fuel_phase="solid", configuration="flat, rod or sphere sample in flow duct",
            o2_pct=initial_o2, pressure_atm=1.0, flow_cm_s=non_negative(first_number(r["Air display"])),
            metrics=metrics(
                final_o2_pct=first_number(r["Calibrated final O2 % by vol"]),
                initial_co2_pct=first_number(r["Initial CO2 % by vol"]), final_co2_pct=first_number(r["Final CO2 % by vol"]),
                final_co_ppm=first_number(r["Final CO (ppm)"]),
            ),
            notes=_flow_sequence_note(r["Air display"]),
        )


def _flow_sequence_note(value) -> str | None:
    """BASS-II logs the duct flow as a sequence when it was stepped during a test."""
    text = clean_text(value)
    return f"Air flow stepped during test: {text}" if text and len(numbers(text)) > 1 else None


@table("PSI-26", "PSI-26_*BASS.csv")
def bass(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-26", test_id=clean_text(r["As Run Test #"]), date=clean_text(r["Date"]),
            fuel=clean_text(r["Fuel Sample Material"]), fuel_phase="solid", configuration="sample in flow duct",
            **NOMINAL_AIR, notes="Air flow 5-50 cm/s set per test; N2 suppressant applied until extinction",
        )


@table("PSI-98", "PSI-98_*SAFFIRE-1.csv")
def saffire_1(frame):
    yield from _saffire(frame, "PSI-98", "Percent O2", "Sample Thickness (cm)")


@table("PSI-99", "PSI-99_*SAFFIRE-2.csv")
def saffire_2(frame):
    yield from _saffire(frame, "PSI-99", "Percent O2 (Note 1)", "Samle Thickness")


@table("PSI-100", "PSI-100_*SAFFIRE-3.csv")
def saffire_3(frame):
    yield from _saffire(frame, "PSI-100", None, "Sample Thickness")


def _saffire(frame, acc: str, o2_column: str | None, thickness_column: str):
    """Large-scale burns in a departed Cygnus cargo vehicle (cabin air unless the table states O2)."""
    for r in rows(frame):
        flow = first_number(r.get("Air Flow (cm/s)", r.get("Air Flow")))
        if flow is None:
            continue  # flow-visualization rows, not burns
        o2 = mean_or_none(numbers(r[o2_column])) if o2_column else None
        yield TestRecord(
            investigation=acc, test_id=clean_text(r.get("Sample Number")), fuel=clean_text(r["Material"]), fuel_phase="solid",
            configuration=f"large sample, {clean_text(r.get('Flow Direction', r.get('Direction')))} flow",
            o2_pct=o2 or 21.0, pressure_atm=1.0, flow_cm_s=flow,
            condition_basis="measured" if o2 else "nominal",
            metrics=metrics(
                thickness_mm=length_mm(r[thickness_column], default_unit="cm"),
                burn_time_s=first_number(r.get("Burn Time (s)")),
                ignition_power_W=first_number(r.get("Ignition Power (W)")),
            ),
            notes=_saffire_note(r),
        )


def _saffire_note(r: dict) -> str | None:
    parts = [f"{k}: {clean_text(v)}" for k, v in r.items() if k.startswith(("?-g", "1-g")) and clean_text(v)]
    return "; ".join(parts) or None


# ---------------------------------------------------------------- smoke (detection)

@table("PSI-102", "PSI-102_*SAME.csv")
def same(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-102", test_id=clean_text(r["Sample #"]), fuel=clean_text(r["Sample Material"]),
            fuel_phase="solid", configuration="heated sample (pyrolysis smoke)", **NOMINAL_AIR,
            flow_cm_s=first_number(r["Air Flow (cm/s)"]),
            metrics=metrics(
                weight_loss_rate_mg_min=first_number(r["Weight loss rate (mg/min)"]),
                aging_duration_min=first_number(r["Aging Duration (minutes)"]),
            ),
        )


@table("PSI-101", "PSI-101_*SAME-R.csv")
def same_r(frame):
    for r in rows(frame):
        yield TestRecord(
            investigation="PSI-101", test_id=clean_text(r["SAME Test #"]), date=clean_text(r["Date"]),
            fuel=clean_text(r["Sample Type"]), fuel_phase="solid", configuration="heated sample (pyrolysis smoke)",
            **NOMINAL_AIR, flow_cm_s=first_number(r["Inlet velocity (cm/s)"]),
            metrics=metrics(
                heater_resistance_ratio=first_number(r["Rt/R0"]), duration_s=first_number(r["Duration (sec)"]),
                net_aging_time_s=first_number(r["Net aging time (sec)"]),
            ),
            notes=clean_text(r["Description"]),
        )


def normalize_all() -> list[TestRecord]:
    """Run every registered normalizer over its downloaded table(s)."""
    records: list[TestRecord] = []
    for spec in REGISTRY:
        paths = sorted(RAW_PSI.glob(spec.file_glob))
        if not paths:
            raise FileNotFoundError(f"No table for {spec.accession}: {spec.file_glob}")
        for path in paths:
            records.extend(spec.normalize(read_table(path)))
    return records
