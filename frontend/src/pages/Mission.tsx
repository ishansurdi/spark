import { useState } from "react";
import { Link } from "react-router-dom";
import { EnvironmentPicker } from "../components/EnvironmentPicker";
import { Card, ErrorBox, InvestigationLink, Loading, PageHeader, ScoreBar } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { useDebounced } from "../hooks/useDebounced";
import { api } from "../lib/api";
import type { Environment, FactorKey, RankResult, Weights } from "../lib/types";

const DEFAULT_WEIGHTS: Weights = { atmosphere: 0.3, pillars: 0.25, realism: 0.15, scale: 0.1, airflow: 0.1, data: 0.1 };
const FACTOR_HELP: Record<FactorKey, string> = {
  atmosphere: "How close the tested O₂ and pressure come to this habitat",
  pillars: "Overlap with the habitat's prevention / detection / suppression needs",
  realism: "Real cabin materials score higher than idealized gas flames",
  scale: "Large fires (Saffire) score higher than small samples",
  airflow: "Share of tests at cabin ventilation speeds",
  data: "Amount of test data published in PSI",
};

export function Mission() {
  const [envId, setEnvId] = useState("lunar_base");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const debouncedWeights = useDebounced(weights);
  const envs = useApi(api.environments, []);
  const ranking = useApi(() => api.rank(envId, debouncedWeights), [envId, debouncedWeights]);
  const env = envs.data?.find((e) => e.id === envId);

  return (
    <div>
      <PageHeader
        title="Which fire research matters for your mission?"
        subtitle="Pick a crewed environment. SPARK ranks 24 NASA PSI combustion investigations by how directly they inform its fire safety, using a transparent score you can re-weight."
      />
      {envs.error && <ErrorBox message={envs.error} />}
      {envs.data && <EnvironmentPicker environments={envs.data} value={envId} onChange={setEnvId} />}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          {env && <EnvironmentCard env={env} />}
          <WeightPanel weights={weights} onChange={setWeights} />
        </aside>
        <section>
          {ranking.loading && !ranking.data && <Loading label="Ranking investigations…" />}
          {ranking.error && <ErrorBox message={ranking.error} />}
          {ranking.data && <RankList results={ranking.data.results} labels={ranking.data.labels} envName={env?.name ?? ""} />}
        </section>
      </div>
    </div>
  );
}

function EnvironmentCard({ env }: { env: Environment }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-white">{env.name}</h2>
      <p className="mt-1 text-sm text-slate-400">{env.description}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {env.considerations.map((c) => <li key={c} className="border-l-2 border-orange-500/60 pl-3">{c}</li>)}
      </ul>
      <Link to={`/ask?env=${env.id}`} className="mt-4 inline-block text-sm font-medium text-orange-300 hover:text-orange-200">
        Ask SPARK about this habitat →
      </Link>
    </Card>
  );
}

function WeightPanel({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Ranking weights</h3>
        <button className="text-xs text-slate-400 hover:text-white" onClick={() => onChange(DEFAULT_WEIGHTS)}>Reset</button>
      </div>
      <div className="mt-3 space-y-3">
        {(Object.keys(DEFAULT_WEIGHTS) as FactorKey[]).map((key) => (
          <label key={key} className="block" title={FACTOR_HELP[key]}>
            <div className="flex justify-between text-xs text-slate-300">
              <span className="capitalize">{key}</span>
              <span className="tabular-nums text-slate-500">{weights[key].toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={weights[key]}
              onChange={(e) => onChange({ ...weights, [key]: Number(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="text-[0.7rem] leading-tight text-slate-500">{FACTOR_HELP[key]}</div>
          </label>
        ))}
      </div>
    </Card>
  );
}

function RankList({ results, labels, envName }: { results: RankResult[]; labels: Record<FactorKey, string>; envName: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="space-y-2">
      {results.map((r, i) => (
        <li key={r.id}>
          <Card className="!p-4">
            <div className="flex items-start gap-4">
              <div className="w-7 pt-0.5 text-right font-display text-lg text-slate-500">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <InvestigationLink id={r.id} label={r.short} />
                  <span className="text-xs text-slate-500">{r.id} · {r.group}{r.kind === "ground" ? " · ground study" : ""}</span>
                </div>
                <div className="mt-1 text-sm text-slate-300">{r.reasons.join(" · ")}</div>
                {open === r.id && (
                  <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {(Object.keys(labels) as FactorKey[]).map((k) => (
                      <div key={k}>
                        <div className="text-xs text-slate-500">{labels[k]}</div>
                        <ScoreBar value={r.factors[k]} label={labels[k]} />
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 sm:col-span-2">
                      {r.tests_near_environment} of its tests fall within reach of {envName} oxygen and pressure.
                    </p>
                  </div>
                )}
              </div>
              <div className="w-32 shrink-0">
                <ScoreBar value={r.score} label="Relevance" />
                <button className="mt-1 text-xs text-slate-500 hover:text-slate-300" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  {open === r.id ? "Hide breakdown" : "Why this score?"}
                </button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
