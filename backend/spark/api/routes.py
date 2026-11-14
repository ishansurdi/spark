"""HTTP routes. Each handler is a thin wrapper over spark.core / spark.ai functions."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from spark.ai import gemini, service
from spark.core import ranking, store

router = APIRouter(prefix="/api")

# Fields sent to the browser for charts (keeps the payload small).
CHART_FIELDS = ("investigation", "fuel", "fuel_phase", "configuration", "o2_pct", "o2_basis",
                "pressure_atm", "flow_cm_s", "condition_basis", "outcome")
LIST_FIELDS = ("id", "short", "group", "kind", "pillars", "relevance", "material_realism", "scale", "fuels")


def require_investigation(acc: str) -> dict:
    inv = store.get_investigation(acc)
    if inv is None:
        raise HTTPException(404, f"Unknown investigation {acc}")
    return inv


@router.get("/health")
def health() -> dict:
    return {"ok": True, "ai_configured": gemini.is_configured(), "investigations": len(store.investigations())}


@router.get("/environments")
def environments() -> list[dict]:
    return [env.model_dump() for env in store.environments().values()]


@router.get("/investigations")
def investigations() -> list[dict]:
    summaries = service.stored_summaries()
    return [
        {**{k: inv[k] for k in LIST_FIELDS}, "title": inv["psi"]["title"], "stats": inv["stats"],
         "summary": summaries.get(inv["id"], {}).get("plain_summary")}
        for inv in store.investigations()
    ]


@router.get("/investigations/{acc}")
def investigation(acc: str) -> dict:
    inv = require_investigation(acc)
    return {**inv, "ai_summary": service.stored_summaries().get(inv["id"])}


@router.get("/investigations/{acc}/tests")
def investigation_tests(acc: str) -> list[dict]:
    require_investigation(acc)
    return store.tests_by_investigation().get(acc.upper(), [])


@router.get("/tests")
def tests() -> list[dict]:
    return [{k: t[k] for k in CHART_FIELDS if k in t} for t in store.tests()]


@router.get("/rank/{env_id}")
def rank(
    env_id: str,
    atmosphere: float = Query(ranking.DEFAULT_WEIGHTS["atmosphere"], ge=0, le=1),
    pillars: float = Query(ranking.DEFAULT_WEIGHTS["pillars"], ge=0, le=1),
    realism: float = Query(ranking.DEFAULT_WEIGHTS["realism"], ge=0, le=1),
    scale: float = Query(ranking.DEFAULT_WEIGHTS["scale"], ge=0, le=1),
    airflow: float = Query(ranking.DEFAULT_WEIGHTS["airflow"], ge=0, le=1),
    data: float = Query(ranking.DEFAULT_WEIGHTS["data"], ge=0, le=1),
    include_ground: bool = True,
) -> dict:
    weights = dict(atmosphere=atmosphere, pillars=pillars, realism=realism, scale=scale, airflow=airflow, data=data)
    try:
        results = ranking.rank(env_id, weights, include_ground)
    except KeyError:
        raise HTTPException(404, f"Unknown environment {env_id}")
    return {"environment": env_id, "weights": weights, "labels": ranking.FACTOR_LABELS, "results": results}


@router.get("/insights")
def insights() -> dict:
    return store.insights()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=600)
    environment: str | None = None


class CompareRequest(BaseModel):
    ids: list[str] = Field(min_length=2, max_length=4)


@router.post("/ask")
def ask(body: AskRequest) -> dict:
    return service.ask(body.question.strip(), body.environment)


@router.post("/compare")
def compare(body: CompareRequest) -> dict:
    items = [require_investigation(acc) for acc in body.ids]
    return {"investigations": items, **service.compare([inv["id"] for inv in items])}
