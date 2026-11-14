import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Data } from "plotly.js";
import { Chart } from "../components/Chart";
import { RichText } from "../components/RichText";
import { ErrorBox, InvestigationLink, Loading, PageBanner, Panel, PillarBadges, Pill, Section } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { INK, SERIES } from "../lib/chartTheme";
import { formatRange } from "../lib/format";
import type { CompareResponse, Investigation, Range } from "../lib/types";

const MAX = 4;
const ROWS: { label: string; value: (i: Investigation) => string }[] = [
  { label: "Group", value: (i) => i.group },
  { label: "Hardware", value: (i) => i.psi.hardware || "—" },
  { label: "Fuels / materials", value: (i) => i.fuels.join(", ") },
  { label: "Samples", value: (i) => i.sample },
  { label: "Tests", value: (i) => String(i.stats.n_tests || "—") },
  { label: "Oxygen", value: (i) => formatRange(i.stats.o2_pct, " %") },
  { label: "Pressure", value: (i) => formatRange(i.stats.pressure_psi, " psi") },
  { label: "Air flow", value: (i) => formatRange(i.stats.flow_cm_s, " cm/s", 0) },
  { label: "Varied", value: (i) => i.stats.varied.join(", ") || "—" },
  { label: "Held constant", value: (i) => i.stats.fixed.join(", ") || "—" },
  { label: "Measurements", value: (i) => i.measurements.join(", ") },
];

export function Compare() {
  const [params, setParams] = useSearchParams();
  const selected = (params.get("ids") ?? "PSI-26,PSI-25").split(",").filter(Boolean);
  const invs = useApi(api.investigations, []);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id].slice(-MAX);
    setParams({ ids: next.join(",") });
    setResult(null);
  };
  const run = () => {
    setState({ loading: true, error: null });
    api.compare(selected).then(setResult).then(() => setState({ loading: false, error: null }))
      .catch((e: Error) => setState({ loading: false, error: e.message }));
  };

  return (
    <>
      <PageBanner eyebrow="Compare" title="Line investigations up side by side"
        intro="Pick two to four investigations. SPARK aligns their fuels, conditions and measurements, then explains what they share and how they differ."
        image="/img/flame-design-stages.jpg" />
      <Section>
        {invs.error && <ErrorBox message={invs.error} />}
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-ink-3">Selected {selected.length} of {MAX} max</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {invs.data?.map((inv) => {
            const on = selected.includes(inv.id);
            return (
              <button key={inv.id} onClick={() => toggle(inv.id)} aria-pressed={on}
                className={`border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink hover:border-ink"}`}>
                {inv.short}
              </button>
            );
          })}
        </div>
        <button disabled={selected.length < 2 || state.loading} onClick={run}
          className="mt-6 bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-40">
          Compare {selected.length} investigations →
        </button>
        {state.loading && <Loading label="Aligning data and asking SPARK…" />}
        {state.error && <div className="mt-6"><ErrorBox message={state.error} /></div>}
      </Section>
      {result && <CompareResult result={result} />}
    </>
  );
}

function CompareResult({ result }: { result: CompareResponse }) {
  const items = result.investigations;
  return (
    <Section tone="gray">
      <div className="space-y-6">
        <Panel eyebrow={result.ai ? `AI analysis · ${result.model}` : "Analysis"} title="SPARK's reading">
          {result.narrative ? <RichText text={result.narrative} /> : <p className="text-ink-2">The AI service is busy; the charts and table below are computed directly from PSI data.</p>}
          {result.ai && <p className="mt-4 text-xs text-ink-3">Generated from PSI records. Verify against the cited investigations.</p>}
        </Panel>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel eyebrow="Envelope" title="Oxygen range tested">
            <Chart data={rangeTraces(items, (i) => i.stats.o2_pct)} height={80 + items.length * 52} layout={rangeLayout("Oxygen (%)")} />
          </Panel>
          <Panel eyebrow="Envelope" title="Pressure range tested">
            <Chart data={rangeTraces(items, (i) => i.stats.pressure_psi)} height={80 + items.length * 52} layout={rangeLayout("Pressure (psi)")} />
          </Panel>
        </div>
        <Panel eyebrow="Side by side" title="Attributes">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="w-40" />
                  {items.map((i) => (
                    <th key={i.id} className="pb-3 pr-4 text-left align-top">
                      <InvestigationLink id={i.id} label={i.short} />
                      <div className="mt-2 font-normal"><PillarBadges pillars={i.pillars} /></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ROWS.map((row) => (
                  <tr key={row.label} className="align-top">
                    <td className="py-3 pr-3 font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">{row.label}</td>
                    {items.map((i) => <td key={i.id} className="py-3 pr-4 text-ink">{row.value(i)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2"><Pill className="bg-paper-2 text-ink">Data: NASA PSI</Pill></div>
        </Panel>
      </div>
    </Section>
  );
}

/** Dumbbell chart: a line from min to max with end markers, one row per investigation. */
function rangeTraces(items: Investigation[], range: (i: Investigation) => Range): Data[] {
  const rows = items.filter((i) => range(i));
  return [
    ...rows.map((i) => ({
      type: "scatter" as const, mode: "lines" as const, x: range(i)!, y: [i.short, i.short], showlegend: false,
      line: { color: INK.axis, width: 6 }, hoverinfo: "skip" as const,
    })),
    {
      type: "scatter", mode: "markers", showlegend: false,
      x: rows.flatMap((i) => range(i)!), y: rows.flatMap((i) => [i.short, i.short]),
      marker: { size: 12, color: SERIES[0], line: { color: "#fff", width: 2 } },
      hovertemplate: "%{y}: %{x:.1f}<extra></extra>",
    },
  ];
}

function rangeLayout(title: string) {
  return { showlegend: false, margin: { l: 110, r: 24, t: 10, b: 48 }, xaxis: { title: { text: title } }, yaxis: { showline: false, tickfont: { family: "Inter", size: 12, color: "#0b0b0b" } } };
}
