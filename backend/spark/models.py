"""Shared data models for the normalized dataset and the API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

FuelPhase = Literal["solid", "liquid", "gas", "aerosol"]
Basis = Literal["measured", "nominal", "test matrix", "daily summary"]
Pillar = Literal["prevention", "detection", "suppression"]


class TestRecord(BaseModel):
    """One experimental test run (or one planned/summary condition point), normalized across tables."""

    investigation: str
    test_id: str | None = None
    date: str | None = None
    fuel: str | None = None
    fuel_phase: FuelPhase
    configuration: str | None = None
    o2_pct: float | None = Field(None, description="Oxygen, % by volume")
    o2_basis: Literal["ambient", "oxidizer stream"] = "ambient"
    pressure_atm: float | None = None
    flow_cm_s: float | None = None
    condition_basis: Basis = "measured"
    inerts: dict[str, float] = Field(default_factory=dict, description="Diluent/suppressant mole fractions")
    outcome: str | None = None
    metrics: dict[str, float] = Field(default_factory=dict)
    notes: str | None = None


class Environment(BaseModel):
    """A crewed habitat whose fire-safety needs we rank investigations against."""

    id: str
    name: str
    description: str
    gravity_g: float
    o2_pct: tuple[float, float]
    pressure_psi: tuple[float, float]
    ventilation_cm_s: tuple[float, float]
    pillar_needs: dict[Pillar, float]
    considerations: list[str]
    sources: list[str]
