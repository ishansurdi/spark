import type {
  AskResponse, CompareResponse, Environment, Insights, Investigation, InvestigationSummary,
  RankResponse, TestPoint, Weights,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status}: ${detail.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  environments: () => request<Environment[]>("/environments"),
  investigations: () => request<InvestigationSummary[]>("/investigations"),
  investigation: (id: string) => request<Investigation>(`/investigations/${id}`),
  tests: () => request<TestPoint[]>("/tests"),
  insights: () => request<Insights>("/insights"),
  rank: (env: string, weights: Weights) =>
    request<RankResponse>(`/rank/${env}?${new URLSearchParams(Object.entries(weights).map(([k, v]) => [k, String(v)]))}`),
  ask: (question: string, environment?: string) => post<AskResponse>("/ask", { question, environment }),
  compare: (ids: string[]) => post<CompareResponse>("/compare", { ids }),
};
