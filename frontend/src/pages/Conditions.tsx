import { useMemo, useState } from "react";
import type { Data, Layout } from "plotly.js";
import { Chart } from "../components/Chart";
import { Card, ErrorBox, Loading, PageHeader, Toggle } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { PSI_PER_ATM, colorFor } from "../lib/format";
import type { Environment, InvestigationSummary, TestPoint } from "../lib/types";

type ColorBy = "investigation" | "fuel_phase";
const PHASE_COLORS: Record<string, string> = { solid: "#f97316", liquid: "#38bdf8", gas: "#a3e635", aerosol: "#e879f9" };

export function Conditions() {
  const tests = useApi(api.tests, []);
  const envs = useApi(api.environments, []);
  const invs = useApi(api.investigations, []);
  const [colorBy, setColorBy] = useState<ColorBy>("fuel_phase");
  const [showStream, setShowStream] = useState(true);

  if (tests.error || envs.error || invs.error) return <ErrorBox message={(tests.error || envs.error || invs.error)!} />;
  if (!tests.data || !envs.data || !invs.data) return <Loading />;

  const points = tests.data.filter((t) => showStream || t.o2_basis === "ambient");
  return (
    <div>
      <PageHeader
        title="Where has fire been tested?"
        subtitle="Every PSI test with a known oxygen level, plotted against pressure. Shaded boxes are the atmospheres of planned crew habitats; empty boxes are research gaps."
      >
        <div className="flex flex-wrap gap-2">
          <Toggle options={[{ id: "fuel_phase", label: "Color by fuel type" }, { id: "investigation", label: "By investigation" }]} value={colorBy} onChange={(v) => setColorBy(v as ColorBy)} />
        </div>
      </PageHeader>

      <Card>
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={showStream} onChange={(e) => setShowStream(e.target.checked)} className="accent-orange-500" />
          Include inverse flames, where O₂ is the burner stream (up to 85 %) rather than the room air
        </label>
        <Chart data={atmosphereTraces(points, invs.data, colorBy)} layout={atmosphereLayout(envs.data)} height={560} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="mb-1 font-display text-lg font-semibold text-white">Oxygen vs. airflow</h2>
          <p className="mb-2 text-sm text-slate-400">
            Solid-material flammability is worst near spacecraft ventilation speeds (~10 cm/s). Shaded band: typical cabin ventilation.
          </p>
          <Chart data={flowTraces(tests.data, invs.data)} layout={flowLayout()} height={420} />
        </Card>
        <CoverageTable tests={tests.data} envs={envs.data} />
      </div>
    </div>
  );
}

function psi(t: TestPoint) {
  return (t.pressure_atm ?? 1) * PSI_PER_ATM;
}

function hoverText(t: TestPoint, names: Map<string, string>) {
  return [
    `<b>${names.get(t.investigation) ?? t.investigation}</b> (${t.investigation})`,
    t.fuel, t.configuration, `${t.o2_pct?.toFixed(1)} % O₂ (${t.o2_basis}) · ${psi(t).toFixed(1)} psi`,
    t.outcome, t.condition_basis !== "measured" ? `<i>${t.condition_basis} conditions</i>` : "",
  ].filter(Boolean).join("<br>");
}

function atmosphereTraces(points: TestPoint[], invs: InvestigationSummary[], colorBy: ColorBy): Data[] {
  const names = new Map(invs.map((i) => [i.id, i.short]));
  const ids = invs.map((i) => i.id);
  const withO2 = points.filter((t) => t.o2_pct != null && t.pressure_atm != null);
  const groups = groupBy(withO2, (t) => (colorBy === "investigation" ? t.investigation : t.fuel_phase));
  return [...groups.entries()].map(([key, group]) => ({
    type: "scattergl",
    mode: "markers",
    name: colorBy === "investigation" ? `${names.get(key) ?? key}` : `${key} fuel`,
    x: group.map(psi),
    y: group.map((t) => t.o2_pct!),
    text: group.map((t) => hoverText(t, names)),
    hovertemplate: "%{text}<extra></extra>",
    marker: {
      size: 7, opacity: 0.75,
      color: colorBy === "investigation" ? colorFor(key, ids) : PHASE_COLORS[key],
      symbol: group.map((t) => (t.o2_basis === "oxidizer stream" ? "diamond" : t.condition_basis === "measured" ? "circle" : "circle-open")),
    },
  }));
}

const PSI_TICKS = [4, 5, 7, 10, 14.7, 20, 30, 50, 75];

/** Habitats sharing the same atmosphere box (e.g. Moon base and rover) get one combined label. */
function habitatBoxes(envs: Environment[]) {
  const boxes = new Map<string, { env: Environment; names: string[] }>();
  for (const env of envs) {
    const key = [...env.o2_pct, ...env.pressure_psi].join();
    const box = boxes.get(key);
    if (box) box.names.push(env.name);
    else boxes.set(key, { env, names: [env.name] });
  }
  return [...boxes.values()];
}

function atmosphereLayout(envs: Environment[]): Partial<Layout> {
  const boxes = habitatBoxes(envs);
  return {
    xaxis: {
      title: { text: "Pressure (psi, log scale)" }, type: "log", range: [Math.log10(3.5), Math.log10(80)],
      tickvals: PSI_TICKS, ticktext: PSI_TICKS.map(String),
    },
    yaxis: { title: { text: "Oxygen (% by volume)" }, range: [0, 102] },
    shapes: boxes.map(({ env }) => ({
      type: "rect", xref: "x", yref: "y", layer: "below",
      x0: env.pressure_psi[0], x1: env.pressure_psi[1], y0: env.o2_pct[0], y1: env.o2_pct[1],
      fillcolor: "rgba(249,115,22,0.18)", line: { color: "rgba(249,115,22,0.9)", width: 1.5 },
    })),
    // Labels fan out to the empty upper-left of the chart so overlapping boxes stay readable.
    annotations: [...boxes].sort((a, b) => a.env.o2_pct[1] - b.env.o2_pct[1]).map(({ env, names }, i) => {
      const nearTop = env.o2_pct[1] > 90; // the pure-O2 suit box sits at the top-left edge
      return {
        x: Math.log10(nearTop ? env.pressure_psi[1] : env.pressure_psi[0]), y: env.o2_pct[nearTop ? 0 : 1],
        xref: "x", yref: "y", text: names.join(" · "), showarrow: true, arrowcolor: "rgba(253,186,116,0.7)",
        ax: nearTop ? 50 : -90 + i * 8, ay: nearTop ? 20 : -40 - i * 28, xanchor: nearTop ? "left" : "right",
        font: { size: 11, color: "#fdba74" }, bgcolor: "rgba(7,11,22,0.85)",
      };
    }),
  };
}

function flowTraces(tests: TestPoint[], invs: InvestigationSummary[]): Data[] {
  const names = new Map(invs.map((i) => [i.id, i.short]));
  const ids = invs.map((i) => i.id);
  const withFlow = tests.filter((t) => t.flow_cm_s != null && t.o2_pct != null);
  return [...groupBy(withFlow, (t) => t.investigation).entries()].map(([id, group]) => ({
    type: "scattergl", mode: "markers", name: names.get(id) ?? id,
    x: group.map((t) => t.flow_cm_s!), y: group.map((t) => t.o2_pct!),
    text: group.map((t) => hoverText(t, names)), hovertemplate: "%{text}<br>%{x} cm/s<extra></extra>",
    marker: { size: 7, opacity: 0.75, color: colorFor(id, ids) },
  }));
}

function flowLayout(): Partial<Layout> {
  return {
    xaxis: { title: { text: "Air flow (cm/s)" }, range: [0, 90] },
    yaxis: { title: { text: "Oxygen (%)" }, range: [10, 25] },
    shapes: [{ type: "rect", xref: "x", yref: "paper", x0: 5, x1: 20, y0: 0, y1: 1, fillcolor: "rgba(56,189,248,0.1)", line: { width: 0 }, layer: "below" }],
  };
}

const NEAR_O2_PCT = 3;      // "near" = within 3 O2 percentage points…
const NEAR_PRESSURE = 0.15; // …and 15 % of the pressure range

function inBox(t: TestPoint, env: Environment, o2Margin = 0, pressureMargin = 0) {
  if (t.o2_pct == null || t.pressure_atm == null) return false;
  const p = psi(t);
  return t.o2_pct >= env.o2_pct[0] - o2Margin && t.o2_pct <= env.o2_pct[1] + o2Margin
    && p >= env.pressure_psi[0] * (1 - pressureMargin) && p <= env.pressure_psi[1] * (1 + pressureMargin);
}

function CoverageTable({ tests, envs }: { tests: TestPoint[]; envs: Environment[] }) {
  const rows = useMemo(() => envs.map((env) => {
    const near = tests.filter((t) => inBox(t, env, NEAR_O2_PCT, NEAR_PRESSURE));
    return {
      env, inside: tests.filter((t) => inBox(t, env)).length, near: near.length,
      solids: near.filter((t) => t.fuel_phase === "solid").length,
    };
  }), [tests, envs]);
  const cell = (n: number) => `py-2 text-right tabular-nums ${n === 0 ? "text-red-300" : "text-slate-200"}`;
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-white">Coverage by habitat</h2>
      <p className="mb-3 text-sm text-slate-400">
        Tests inside each habitat's oxygen and pressure range, and near it (±{NEAR_O2_PCT} O₂ points, ±{NEAR_PRESSURE * 100}% pressure).
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
          <tr><th className="pb-2">Habitat</th><th className="pb-2 text-right">Inside</th><th className="pb-2 text-right">Near</th><th className="pb-2 text-right">Solids near</th></tr>
        </thead>
        <tbody>
          {rows.map(({ env, inside, near, solids }) => (
            <tr key={env.id} className="border-t border-white/5">
              <td className="py-2 text-slate-200">{env.name}</td>
              <td className={cell(inside)}>{inside}</td>
              <td className={cell(near)}>{near}</td>
              <td className={cell(solids)}>{solids}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Red = no PSI data. The closest tests to Moon and Mars habitats are FLEX droplets at 34 % O₂ and ~10.4 psi; no solid cabin material
        has been burned there. All data are microgravity; no partial-gravity data exist yet.
      </p>
    </Card>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}
