"""Transparent relevance ranking of investigations for a crewed environment.

score = sum(weight_i * factor_i) / sum(weights), every factor in [0, 1]:
  atmosphere  how close the tested O2 % and pressure come to the environment's design range
  pillars     overlap between the investigation's fire-safety focus and the environment's needs
  realism     how representative the fuel is of real cabin materials (curated)
  scale       sample/fire size relative to a real cabin fire (curated)
  airflow     share of tests run at the environment's ventilation speeds
  data        how much test data PSI publishes for it (log scale)
"""
from __future__ import annotations

import math

from spark.core import store
from spark.models import Environment
from spark.pipeline.parse import PSI_PER_ATM

DEFAULT_WEIGHTS = {"atmosphere": 0.30, "pillars": 0.25, "realism": 0.15, "scale": 0.10, "airflow": 0.10, "data": 0.10}
FACTOR_LABELS = {
    "atmosphere": "Atmosphere match", "pillars": "Fire-safety focus", "realism": "Material realism",
    "scale": "Fire scale", "airflow": "Airflow match", "data": "Data available",
}
O2_SCALE_PCT = 8.0                 # 8 O2 percentage points outside the range count as one unit of distance
PRESSURE_SCALE = math.log(1.6)     # a factor of 1.6 in pressure counts as one unit of distance
QUIESCENT_AIRFLOW_SCORE = 0.3      # still-air tests still inform "ventilation off" scenarios
BASIS_WEIGHT = {"measured": 1.0, "nominal": 0.9, "daily summary": 0.8, "test matrix": 0.7}


def outside(value: float, low: float, high: float) -> float:
    """Distance from value to the closed interval [low, high] (0 inside)."""
    return max(0.0, low - value, value - high)


def closeness(test: dict, env: Environment) -> float | None:
    """1 when a test sits inside the environment's O2/pressure box, decaying with distance."""
    o2 = test.get("o2_pct")
    if o2 is None:
        return None
    d_o2 = outside(o2, *env.o2_pct) / O2_SCALE_PCT
    pressure = test.get("pressure_atm")
    if pressure:
        psi = pressure * PSI_PER_ATM
        low, high = env.pressure_psi
        d_p = max(0.0, math.log(low / psi), math.log(psi / high)) / PRESSURE_SCALE
    else:
        d_p = 0.5  # pressure unknown: partial penalty
    weight = BASIS_WEIGHT.get(test.get("condition_basis"), 1.0) * (0.75 if test.get("o2_basis") == "oxidizer stream" else 1.0)
    return weight * math.exp(-(d_o2 ** 2 + d_p ** 2))


def atmosphere_factor(tests: list[dict], env: Environment) -> tuple[float, int]:
    scores = [c for c in (closeness(t, env) for t in tests) if c is not None]
    if not scores:
        return 0.0, 0
    near = sum(1 for c in scores if c >= 0.5)
    return 0.6 * max(scores) + 0.4 * (near / len(scores)), near


def airflow_factor(tests: list[dict], env: Environment) -> float:
    flows = [t["flow_cm_s"] for t in tests if t.get("flow_cm_s") is not None]
    if not flows:
        return QUIESCENT_AIRFLOW_SCORE
    low, high = env.ventilation_cm_s
    return sum(1 for f in flows if low <= f <= high) / len(flows)


def pillar_factor(inv: dict, env: Environment) -> float:
    needs = env.pillar_needs
    return sum(needs[p] * inv["pillars"].get(p, 0) for p in needs) / sum(needs.values())


def data_factor(inv: dict) -> float:
    n = inv["stats"]["n_tests"]
    return min(1.0, math.log10(n + 1) / math.log10(500)) if n else (0.15 if inv["kind"] == "ground" else 0.0)


def factors(inv: dict, env: Environment) -> tuple[dict[str, float], int]:
    tests = store.tests_by_investigation().get(inv["id"], [])
    atmosphere, near = atmosphere_factor(tests, env)
    return {
        "atmosphere": atmosphere,
        "pillars": pillar_factor(inv, env),
        "realism": inv["material_realism"],
        "scale": inv["scale"],
        "airflow": airflow_factor(tests, env),
        "data": data_factor(inv),
    }, near


def reasons(inv: dict, factor_values: dict[str, float], near: int, env: Environment) -> list[str]:
    """Plain-language explanation built from the strongest factors."""
    out = []
    if near:
        out.append(f"{near} tests within reach of {env.name} oxygen and pressure levels")
    top_pillar = max(inv["pillars"], key=inv["pillars"].get)
    if factor_values["pillars"] >= 0.5:
        out.append(f"Strong {top_pillar} focus, which {env.name} needs")
    if inv["material_realism"] >= 0.9:
        out.append("Uses real spacecraft materials")
    if inv["scale"] >= 0.8:
        out.append("Large, realistic fire size")
    if factor_values["airflow"] >= 0.5:
        out.append("Tested at cabin ventilation speeds")
    return out or [inv["relevance"]]


def rank(env_id: str, weights: dict[str, float] | None = None, include_ground: bool = True) -> list[dict]:
    env = store.get_environment(env_id)
    if env is None:
        raise KeyError(env_id)
    weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    total_weight = sum(weights.values()) or 1.0
    results = []
    for inv in store.investigations():
        if inv["kind"] == "ground" and not include_ground:
            continue
        values, near = factors(inv, env)
        score = sum(weights[k] * values[k] for k in DEFAULT_WEIGHTS) / total_weight
        results.append({
            "id": inv["id"], "short": inv["short"], "group": inv["group"], "kind": inv["kind"],
            "score": round(score, 4),
            "factors": {k: round(v, 3) for k, v in values.items()},
            "tests_near_environment": near,
            "reasons": reasons(inv, values, near, env),
        })
    return sorted(results, key=lambda r: r["score"], reverse=True)
