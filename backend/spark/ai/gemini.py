"""Gemini client with model fallback: tries each configured model until one answers."""
from __future__ import annotations

import json
import logging

import httpx

from spark.config import get_settings

log = logging.getLogger(__name__)
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
RETRYABLE = {408, 429, 500, 502, 503, 504}


class AIUnavailable(RuntimeError):
    """Raised when no model could answer (no key, quota exhausted, or outage)."""


def is_configured() -> bool:
    return bool(get_settings().gemini_api)


def generate(prompt: str, system: str | None = None, as_json: bool = False, temperature: float = 0.3) -> tuple[str, str]:
    """Return (text, model_used). Falls through the model list on overload/timeouts."""
    settings = get_settings()
    if not settings.gemini_api:
        raise AIUnavailable("GEMINI_API is not set")
    body = _request_body(prompt, system, as_json, temperature)
    errors = []
    with httpx.Client(timeout=settings.gemini_timeout_s) as client:
        for model in settings.gemini_models:
            try:
                response = client.post(ENDPOINT.format(model=model), json=body,
                                       headers={"x-goog-api-key": settings.gemini_api})
            except httpx.TimeoutException:
                errors.append(f"{model}: timeout")
                continue
            if response.status_code == 200:
                text = _extract_text(response.json())
                if text:
                    return text, model
                errors.append(f"{model}: empty response")
            elif response.status_code in RETRYABLE or response.status_code == 404:
                errors.append(f"{model}: HTTP {response.status_code}")
            else:
                raise AIUnavailable(f"{model}: HTTP {response.status_code} {response.text[:200]}")
    log.warning("All Gemini models failed: %s", errors)
    raise AIUnavailable("; ".join(errors))


def generate_json(prompt: str, system: str | None = None) -> tuple[dict, str]:
    text, model = generate(prompt, system, as_json=True)
    return json.loads(_strip_fences(text)), model


def _request_body(prompt: str, system: str | None, as_json: bool, temperature: float) -> dict:
    body: dict = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if as_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    return body


def _extract_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    return "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return text
