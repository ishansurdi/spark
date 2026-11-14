import { useState } from "react";
import type { Data } from "plotly.js";
import { Chart, Legend } from "../components/Chart";
import { EnvironmentPicker } from "../components/EnvironmentPicker";
import {
  ButtonLink, Container, ErrorBox, Eyebrow, HeroNumber, InvestigationLink, Loading, Panel, ScoreBar, Section, SectionHeading,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { useDebounced } from "../hooks/useDebounced";
import { api } from "../lib/api";
import { SERIES, SURFACE } from "../lib/chartTheme";
import type { Environment, FactorKey, RankResult, Weights } from "../lib/types";

const FACTORS: FactorKey[] = ["atmosphere", "pillars", "realism", "scale", "airflow", "data"];
const DEFAULT_WEIGHTS: Weights = { atmosphere: 0.3, pillars: 0.25, realism: 0.15, scale: 0.1, airflow: 0.1, data: 0.1 };
const FACTOR_HELP: Record<FactorKey, string> = {
  atmosphere: "How close tested O₂ and pressure come to this habitat",
  pillars: "Overlap with the habitat's prevention / detection / suppression needs",
  realism: "Real cabin materials outrank idealized gas flames",
  scale: "Large fires (Saffire) outrank small samples",
  airflow: "Share of tests run at cabin ventilation speeds",
  data: "Amount of test data published in PSI",
};
const FACTOR_COLOR = Object.fromEntries(FACTORS.map((f, i) => [f, SERIES[i]])) as Record<FactorKey, string>;
const TOP_N = 12;

export function Mission() {
  const [envId, setEnvId] = useState("lunar_base");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const debouncedWeights = useDebounced(weights);
  const overview = useApi(api.overview, []);
  const envs = useApi(api.environments, []);
  const ranking = useApi(() => api.rank(envId, debouncedWeights), [envId, debouncedWeights]);
  const env = envs.data?.find((e) => e.id === envId);

  return (
    <>
      <Hero overview={overview.data} />

      <Section>
        <SectionHeading
          eyebrow="Step 1 · Choose a mission"
          title="Where will your crew live and work?"
          intro="Each habitat has its own atmosphere, gravity and fire-safety priorities. Oxygen-enriched, low-pressure cabins planned for the Moon make materials far more flammable than on the ISS."
        />
        {envs.error && <ErrorBox message={envs.error} />}
        {envs.data && <EnvironmentPicker environments={envs.data} value={envId} onChange={setEnvId} />}
        {env && <EnvironmentBrief env={env} />}
      </Section>

      <Section tone="gray">
        <SectionHeading
          eyebrow="Step 2 · Ranked evidence"
          title={env ? `Investigations that matter most for a ${env.name.toLowerCase()}` : "Ranked investigations"}
          intro="Every score is a transparent weighted sum of six factors computed from PSI data and a curated catalog. Move the sliders to apply your own priorities."
        />
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <WeightPanel weights={weights} onChange={setWeights} />
          <div className="min-w-0 space-y-6">
            {ranking.error && <ErrorBox message={ranking.error} />}
            {!ranking.data && ranking.loading && <Loading label="Ranking investigations…" />}
            {ranking.data && (
              <>
                <ContributionChart results={ranking.data.results} weights={ranking.data.weights} labels={ranking.data.labels} />
                <RankTable results={ranking.data.results} labels={ranking.data.labels} envName={env?.name ?? ""} />
              </>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

function Hero({ overview }: { overview: Awaited<ReturnType<typeof api.overview>> | null }) {
  return (
    <section className="relative overflow-hidden bg-night text-white">
      <img src="/img/bass2-flame.jpg" alt="A flame spreading over an acrylic sample aboard the ISS during the BASS-II experiment" className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="hero-shade absolute inset-0" />
      <Container className="relative py-20 md:py-28">
        <Eyebrow dark>Microgravity combustion · Crew fire safety</Eyebrow>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Fire behaves differently in space. Know which research protects your crew.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
          SPARK turns two decades of NASA microgravity fire experiments into ranked, cited evidence for the habitats humans
          are about to build on the Moon and Mars.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/conditions">Explore the test data</ButtonLink>
          <ButtonLink to="/ask" variant="light">Ask SPARK a question</ButtonLink>
        </div>
        <div className="mt-14 grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
          <HeroNumber dark value={overview?.investigations ?? "—"} label="Investigations" note={overview ? `${overview.flight_investigations} flown in space` : undefined} />
          <HeroNumber dark value={overview?.tests.toLocaleString() ?? "—"} label="Tests analyzed" note="ISS and Cygnus experiment runs" />
          <HeroNumber dark value={overview?.report_passages.toLocaleString() ?? "—"} label="Report passages" note="searchable by the AI assistant" />
          <HeroNumber dark alert value={overview?.tests_inside_lunar_atmosphere ?? "—"} label="Tests at Moon-base air" note="30–34 % O₂, 8.2–10.2 psi" />
        </div>
        <p className="mt-6 text-xs text-white/45">Image: BASS-II flame over acrylic aboard the ISS · NASA PSI (public domain)</p>
      </Container>
    </section>
  );
}

function EnvironmentBrief({ env }: { env: Environment }) {
  return (
    <div className="mt-8 grid gap-8 border-t border-line pt-8 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h3 className="text-2xl font-bold">{env.name}</h3>
        <p className="mt-2 text-ink-2">{env.description}</p>
        <dl className="mt-5 grid grid-cols-3 gap-4 font-mono text-xs">
          <div><dt className="uppercase tracking-wider text-ink-3">Oxygen</dt><dd className="mt-1 text-base text-ink">{env.o2_pct[0]}–{env.o2_pct[1]}%</dd></div>
          <div><dt className="uppercase tracking-wider text-ink-3">Pressure</dt><dd className="mt-1 text-base text-ink">{env.pressure_psi[0]}–{env.pressure_psi[1]} psi</dd></div>
          <div><dt className="uppercase tracking-wider text-ink-3">Gravity</dt><dd className="mt-1 text-base text-ink">{env.gravity_g === 0 ? "≈0 g" : `${env.gravity_g} g`}</dd></div>
        </dl>
        <div className="mt-5"><ButtonLink to={`/ask?env=${env.id}`}>Ask SPARK about this habitat →</ButtonLink></div>
      </div>
      <ul className="space-y-4">
        {env.considerations.map((c, i) => (
          <li key={c} className="flex gap-4">
            <span className="font-mono text-sm text-accent-dark">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-ink">{c}</span>
          </li>
        ))}
        <li className="pt-2 text-xs text-ink-3">Sources: {env.sources.join(" · ")}</li>
      </ul>
    </div>
  );
}

function WeightPanel({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  return (
    <Panel eyebrow="Scoring model" title="Factor weights" actions={<button className="font-mono text-xs uppercase tracking-wider text-ink-2 hover:text-ink" onClick={() => onChange(DEFAULT_WEIGHTS)}>Reset</button>} className="h-fit lg:sticky lg:top-24">
      <div className="space-y-5">
        {FACTORS.map((key) => (
          <label key={key} className="block">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2 capitalize"><span className="h-2.5 w-2.5" style={{ background: FACTOR_COLOR[key] }} />{key}</span>
              <span className="font-mono text-xs tabular-nums text-ink-2">{weights[key].toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={weights[key]} aria-label={`${key} weight`}
              onChange={(e) => onChange({ ...weights, [key]: Number(e.target.value) })} className="mt-1 w-full accent-[#0b0b0b]" />
            <div className="text-xs leading-snug text-ink-3">{FACTOR_HELP[key]}</div>
          </label>
        ))}
      </div>
    </Panel>
  );
}

/** Stacked horizontal bars: how much each factor contributes to each investigation's score. */
function ContributionChart({ results, weights, labels }: { results: RankResult[]; weights: Weights; labels: Record<FactorKey, string> }) {
  const top = results.slice(0, TOP_N).reverse();
  const total = FACTORS.reduce((sum, f) => sum + weights[f], 0) || 1;
  const names = top.map((r) => `${r.short}  `);
  const traces: Data[] = FACTORS.map((f) => ({
    type: "bar", orientation: "h", name: labels[f], y: names,
    x: top.map((r) => (weights[f] * r.factors[f]) / total * 100),
    marker: { color: FACTOR_COLOR[f], line: { color: SURFACE, width: 2 } },
    customdata: top.map((r) => [r.id, Math.round(r.factors[f] * 100), Math.round(r.score * 100)]),
    hovertemplate: `<b>%{y}</b> (%{customdata[0]})<br>${labels[f]}: %{customdata[1]}% × weight ${weights[f].toFixed(2)}<br>adds <b>%{x:.1f}</b> of %{customdata[2]} points<extra></extra>`,
  }));
  return (
    <Panel eyebrow={`Top ${TOP_N}`} title="What drives each relevance score">
      <Legend items={FACTORS.map((f) => ({ label: labels[f], color: FACTOR_COLOR[f], shape: "bar" }))} />
      <Chart data={traces} height={Math.max(360, top.length * 34 + 70)}
        layout={{ barmode: "stack", bargap: 0.28, showlegend: false, margin: { l: 120, r: 24, t: 10, b: 48 },
          xaxis: { title: { text: "Relevance score (0–100)" }, range: [0, 100], dtick: 20 }, yaxis: { showline: false, tickfont: { family: "Inter", size: 12, color: "#0b0b0b" } } }} />
    </Panel>
  );
}

function RankTable({ results, labels, envName }: { results: RankResult[]; labels: Record<FactorKey, string>; envName: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Panel eyebrow={`All ${results.length}`} title="Ranked list with reasons">
      <ol className="-my-2 divide-y divide-line">
        {results.map((r, i) => (
          <li key={r.id} className="grid grid-cols-[2.5rem_1fr_9rem] items-start gap-4 py-4">
            <span className="font-mono text-xl tabular-nums text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <InvestigationLink id={r.id} label={r.short} />
                <span className="font-mono text-xs uppercase tracking-wider text-ink-3">{r.id} · {r.group}{r.kind === "ground" ? " · ground" : ""}</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-sm text-ink-2">
                {r.reasons.map((reason) => (
                  <li key={reason} className={reason.startsWith("Caution") ? "font-medium text-accent-dark" : ""}>{reason}</li>
                ))}
              </ul>
              {open === r.id && (
                <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {FACTORS.map((k) => (
                    <div key={k}>
                      <div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">{labels[k]}</div>
                      <ScoreBar value={r.factors[k]} />
                    </div>
                  ))}
                  <p className="text-xs text-ink-3 sm:col-span-2">{r.tests_near_environment} tests fall within reach of {envName} oxygen and pressure.</p>
                </div>
              )}
            </div>
            <div>
              <ScoreBar value={r.score} tone="accent" label="Relevance" />
              <button className="mt-1 font-mono text-[0.68rem] uppercase tracking-wider text-ink-3 hover:text-ink" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                {open === r.id ? "Hide factors" : "Show factors"}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
