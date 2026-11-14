"""Dependency-free BM25 keyword search over investigation summaries and report passages."""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache

from spark.config import PROCESSED
from spark.core import store

TOKEN = re.compile(r"[a-z0-9][a-z0-9\-\.]*[a-z0-9]|[a-z0-9]")
STOPWORDS = set("""a an and are as at be by for from has have in into is it its of on or that the this to was were
with what which how why when does do can will would should than then there their our we you i""".split())
SYNONYMS = {  # expand everyday words to the vocabulary used in the reports
    "fire": ["flame", "combustion", "burning"], "extinguish": ["suppression", "extinction", "suppressant"],
    "smoke": ["aerosol", "particulate", "soot"], "detector": ["detection", "detectors"],
    "plastic": ["pmma", "polymer"], "fabric": ["sibal", "nomex", "textile", "cotton"],
    "oxygen": ["o2"], "moon": ["lunar"], "rover": ["vehicle", "cabin"], "wire": ["wiring", "insulation", "cable"],
}
K1, B = 1.5, 0.75


@dataclass
class Document:
    investigation: str
    source: str
    page: int | None
    text: str


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if t not in STOPWORDS]


def expand(tokens: list[str]) -> list[str]:
    return tokens + [s for t in tokens for s in SYNONYMS.get(t, [])]


def investigation_documents() -> list[Document]:
    docs = []
    for inv in store.investigations():
        psi = inv["psi"]
        findings = " ".join(f["text"] for f in inv["key_findings"])
        text = " ".join(filter(None, [
            inv["short"], psi["title"], inv["relevance"], findings, " ".join(inv["fuels"]), inv["sample"],
            psi["objective"], psi["hypothesis"], psi["impacts"],
        ]))
        docs.append(Document(inv["id"], f"{inv['short']} summary", None, text))
    return docs


def passage_documents() -> list[Document]:
    path = PROCESSED / "passages.json"
    if not path.exists():
        return []
    return [Document(p["investigation"], p["source"], p["page"], p["text"])
            for p in json.loads(path.read_text(encoding="utf-8"))]


class Index:
    def __init__(self, docs: list[Document]):
        self.docs = docs
        self.tokens = [Counter(tokenize(d.text)) for d in docs]
        self.lengths = [sum(t.values()) for t in self.tokens]
        self.avg_length = sum(self.lengths) / max(len(docs), 1)
        df = Counter(term for t in self.tokens for term in t)
        n = len(docs)
        self.idf = {term: math.log(1 + (n - f + 0.5) / (f + 0.5)) for term, f in df.items()}

    def score(self, i: int, query: list[str]) -> float:
        tf, length = self.tokens[i], self.lengths[i]
        total = 0.0
        for term in query:
            f = tf.get(term)
            if f:
                total += self.idf[term] * f * (K1 + 1) / (f + K1 * (1 - B + B * length / self.avg_length))
        return total

    def search(self, query: str, k: int = 8, investigations: set[str] | None = None) -> list[tuple[Document, float]]:
        terms = expand(tokenize(query))
        scored = [
            (doc, self.score(i, terms)) for i, doc in enumerate(self.docs)
            if investigations is None or doc.investigation in investigations
        ]
        return [hit for hit in sorted(scored, key=lambda h: h[1], reverse=True)[:k] if hit[1] > 0]


@lru_cache
def index() -> Index:
    return Index(investigation_documents() + passage_documents())


def index_size() -> int:
    """Number of report passages available to search (excludes investigation summaries)."""
    return sum(1 for doc in index().docs if doc.page is not None)
