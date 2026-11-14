"""High-level AI features: grounded Q&A, comparisons and summaries.

Every feature retrieves evidence first (spark.core.search) and degrades gracefully:
if Gemini is unavailable the caller still gets the retrieved evidence.
"""
from __future__ import annotations

import json

from spark.ai import gemini, prompts
from spark.config import PROCESSED
from spark.core import ranking, search, store

EVIDENCE_CHARS = 900


def citation(doc: search.Document) -> str:
    return f"[{doc.investigation} p.{doc.page}]" if doc.page else f"[{doc.investigation}]"


def evidence_block(hits: list[tuple[search.Document, float]]) -> str:
    return "\n\n".join(f"{citation(doc)} ({doc.source}) {doc.text[:EVIDENCE_CHARS]}" for doc, _ in hits)


def citations(hits: list[tuple[search.Document, float]]) -> list[dict]:
    seen, out = set(), []
    for doc, score in hits:
        key = (doc.investigation, doc.source, doc.page)
        if key not in seen:
            seen.add(key)
            inv = store.get_investigation(doc.investigation) or {}
            out.append({"investigation": doc.investigation, "short": inv.get("short"), "source": doc.source,
                        "page": doc.page, "excerpt": doc.text[:280], "score": round(score, 2)})
    return out


def environment_context(env_id: str | None) -> tuple[str, set[str] | None]:
    """Prompt text for the chosen environment plus the IDs of its top-ranked investigations."""
    env = store.get_environment(env_id) if env_id else None
    if env is None:
        return "", None
    top = ranking.rank(env_id)[:6]
    text = prompts.ENVIRONMENT.format(
        name=env.name, description=env.description, gravity_g=env.gravity_g,
        o2_low=env.o2_pct[0], o2_high=env.o2_pct[1], p_low=env.pressure_psi[0], p_high=env.pressure_psi[1],
        top=", ".join(f"{r['short']} ({r['id']})" for r in top),
    )
    return text, {r["id"] for r in top}


def retrieve(question: str, focus: set[str] | None, k: int = 10) -> list[tuple[search.Document, float]]:
    """Blend general hits with hits from the environment's top investigations."""
    index = search.index()
    hits = index.search(question, k=k)
    if focus:
        hits += index.search(question, k=k // 2, investigations=focus)
    unique = {}
    for doc, score in hits:
        unique.setdefault((doc.investigation, doc.source, doc.page, doc.text[:40]), (doc, score))
    return sorted(unique.values(), key=lambda h: h[1], reverse=True)[:k]


def ask(question: str, env_id: str | None = None) -> dict:
    env_text, focus = environment_context(env_id)
    hits = retrieve(question, focus)
    result = {"question": question, "environment": env_id, "citations": citations(hits)}
    if not hits:
        return {**result, "answer": "No PSI evidence matched this question. Try naming a material, fuel, or fire-safety topic.",
                "model": None, "ai": False}
    prompt = prompts.ASK.format(question=question, environment=env_text, evidence=evidence_block(hits))
    try:
        answer, model = gemini.generate(prompt, system=prompts.SYSTEM)
        return {**result, "answer": answer, "model": model, "ai": True}
    except gemini.AIUnavailable:
        return {**result, "answer": "The AI service is busy, so here is the most relevant PSI evidence it would have used:",
                "model": None, "ai": False}


def compare_evidence(ids: list[str]) -> str:
    blocks = []
    for acc in ids:
        inv = store.get_investigation(acc)
        if inv:
            s = inv["stats"]
            findings = " ".join(f["text"] for f in inv["key_findings"])
            blocks.append(
                f"[{acc}] {inv['short']} - {inv['psi']['title']}. Group: {inv['group']}. Hardware: {inv['psi']['hardware']}. "
                f"Fuels: {', '.join(inv['fuels'])}. Sample: {inv['sample']}. Tests: {s['n_tests']}, O2 {s['o2_pct']} %, "
                f"pressure {s['pressure_atm']} atm, flow {s['flow_cm_s']} cm/s. Varied: {', '.join(s['varied'])}. "
                f"Measurements: {', '.join(inv['measurements'])}. Findings: {findings}"
            )
    return "\n\n".join(blocks)


def compare(ids: list[str]) -> dict:
    try:
        text, model = gemini.generate(prompts.COMPARE.format(evidence=compare_evidence(ids)), system=prompts.SYSTEM)
        return {"narrative": text, "model": model, "ai": True}
    except gemini.AIUnavailable:
        return {"narrative": None, "model": None, "ai": False}


def summarize(acc: str) -> dict:
    hits = search.index().search(store.get_investigation(acc)["psi"]["title"], k=4, investigations={acc})
    evidence = compare_evidence([acc]) + "\n\n" + evidence_block(hits)
    data, model = gemini.generate_json(prompts.SUMMARY.format(evidence=evidence), system=prompts.SYSTEM)
    return {**data, "model": model}


def stored_summaries() -> dict:
    path = PROCESSED / "ai_summaries.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
