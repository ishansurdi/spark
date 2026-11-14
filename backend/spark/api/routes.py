"""HTTP routes. Each handler is a thin wrapper over spark.core / spark.ai functions."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from spark.ai import gemini, service
from spark.core import export, ranking, search, store

router = APIRouter(prefix="/api")

# Fields sent to the browser for charts (keeps the payload small).
CHART_FIELDS = ("investigation", "fuel", "fuel_phase", "configuration", "o2_pct", "o2_basis",
                "pressure_atm", "flow_cm_s", "condition_basis", "outcome")
LIST_FIELDS = ("id", "short", "group", "kind", "hardware_family", "pillars", "relevance", "material_realism", "scale", "fuels")


def require_investigation(acc: str) -> dict:
    inv = store.get_investigation(acc)
    if inv is None:
        raise HTTPException(404, f"Unknown investigation {acc}")
    return inv


@router.get("/health")
def health() -> dict:
    return {"ok": True, "ai_configured": gemini.is_configured(), "investigations": len(store.investigations())}


@router.get("/overview")
def overview() -> dict:
    """Headline numbers for the home page, computed from the dataset."""
    lunar = store.get_environment("lunar_base")
    tests = store.tests()
    inside_lunar = sum(1 for t in tests if lunar and ranking.closeness_box(t, lunar))
    return {
        "investigations": len(store.investigations()),
        "flight_investigations": sum(1 for i in store.investigations() if i["kind"] == "flight"),
        "tests": len(tests),
        "report_passages": search.index_size(),
        "tests_inside_lunar_atmosphere": inside_lunar,
        "max_o2_pct": max(t["o2_pct"] for t in tests if t.get("o2_pct") is not None),
    }


@router.get("/environments")
def environments() -> list[dict]:
    return [env.model_dump() for env in store.environments().values()]


@router.get("/investigations")
def investigations() -> list[dict]:
    summaries = service.stored_summaries()
    return [
        {**{k: inv[k] for k in LIST_FIELDS}, "title": inv["psi"]["title"], "stats": inv["stats"],
         "start": inv["psi"]["start"], "end": inv["psi"]["end"],
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


def csv_download(content: str, filename: str) -> Response:
    return Response(content, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/export/tests.csv")
def export_all_tests() -> Response:
    """Every normalized test (all investigations) as one CSV."""
    return csv_download(export.to_csv(store.tests()), "spark-psi-combustion-tests.csv")


@router.get("/export/{acc}.csv")
def export_investigation_tests(acc: str) -> Response:
    inv = require_investigation(acc)
    tests = store.tests_by_investigation().get(inv["id"], [])
    if not tests:
        raise HTTPException(404, f"{inv['id']} has no experimental table in PSI")
    return csv_download(export.to_csv(tests), f"spark-{inv['id']}-{inv['short'].replace(' ', '_')}-tests.csv")


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
