import { useMemo, useState } from "react";
import type { Data, Layout } from "plotly.js";
import { Chart, Legend } from "../components/Chart";
import { ErrorBox, HeroNumber, Loading, PageBanner, Panel, Section, SectionHeading, Toggle } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { DataDownload } from "../components/DataDownload";
import { api, downloads } from "../lib/api";
import { INK, OTHER, PHASE_COLOR, PHASE_LABEL, SEQUENTIAL, SERIES } from "../lib/chartTheme";
import { PSI_PER_ATM } from "../lib/format";
import type { Environment, InvestigationSummary, TestPoint } from "../lib/types";

const PSI_TICKS = [4, 5, 7, 10, 14.7, 20, 30, 50, 75];
// Draw order: solids last so the few cabin-material tests stay visible on top.
const PHASES = ["liquid", "gas", "solid"] as const;
const NEAR_O2_PCT = 3;
const NEAR_PRESSURE = 0.15;
const ZONE = "#0b0b0b";

export function Conditions() {
  const tests = useApi(api.tests, []);
  const envs = useApi(api.environments, []);
  const invs = useApi(api.investigations, []);
  const flex = useApi(() => api.investigationTests("PSI-69"), []);
  const [highlight, setHighlight] = useState("all");
  const [basis, setBasis] = useState("all");

  if (tests.error || envs.error || invs.error) return <Section><ErrorBox message={(tests.error || envs.error || invs.error)!} /></Section>;
  if (!tests.data || !envs.data || !invs.data) return <Section><Loading /></Section>;

  const known = tests.data.filter((t) => t.o2_pct != null && t.pressure_atm != null && (basis === "all" || t.o2_basis === "ambient"));
  const withData = invs.data.filter((i) => i.stats.n_tests > 0);

  return (
    <>
      <PageBanner
        eyebrow="Test conditions"
        title="Where has fire been tested in space?"
        intro="Every PSI experiment run with a recorded atmosphere, mapped against the atmospheres planned for crew habitats. Empty habitat zones are the research gaps."
        image="/img/flame-design-space.jpg"
      />

      <Section>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <HeroNumber value={known.length.toLocaleString()} label="Tests with known O₂ and pressure" note="microgravity, ISS and Cygnus" />
          <HeroNumber value="85 %" label="Highest oxygen tested" note="CFI-G inverse flames (burner stream)" />
          <HeroNumber value="40 %" label="Highest room-air oxygen" note="gas flames: CFI-G, Flame Design, BRE" />
          <HeroNumber alert value="0" label="Solid materials burned above 23 % O₂" note="max 22.2 % (BASS-II); Moon base needs 30–34 %" />
        </div>
      </Section>

      <Section tone="gray">
        <SectionHeading eyebrow="Atmosphere map" title="Oxygen and pressure of every test"
          intro="Each dot is one test. Dashed boxes are design atmospheres for crew habitats. Hover a dot for the investigation, fuel and outcome.">
          <Toggle options={[{ id: "all", label: "All tests" }, { id: "ambient", label: "Room air only" }]} value={basis} onChange={setBasis} />
        </SectionHeading>
        <Panel
          eyebrow="O₂ vs pressure"
          title="Test atmospheres vs habitat design ranges"
          actions={
            <label className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-3">Highlight</span>
              <select value={highlight} onChange={(e) => setHighlight(e.target.value)} className="border border-ink bg-paper px-2 py-1.5 text-sm">
                <option value="all">Color by fuel type</option>
                {withData.map((i) => <option key={i.id} value={i.id}>{i.short} ({i.id})</option>)}
              </select>
            </label>
          }
        >
          <Legend items={highlight === "all"
            ? [...PHASES.map((p) => ({ label: PHASE_LABEL[p], color: PHASE_COLOR[p] })), { label: "Habitat design range", color: ZONE, shape: "dash" as const }]
            : [{ label: withData.find((i) => i.id === highlight)?.short ?? highlight, color: SERIES[0] }, { label: "Other tests", color: OTHER }, { label: "Habitat design range", color: ZONE, shape: "dash" as const }]} />
          <Chart data={atmosphereTraces(known, invs.data, highlight)} layout={atmosphereLayout(envs.data)} height={600} />
          <p className="mt-2 text-xs text-ink-3">
            Diamonds: inverse flames, where the O₂ value is the burner's oxidizer stream rather than the room air. Hollow markers: nominal or summary
            conditions. Pressure axis is logarithmic.
          </p>
        </Panel>
      </Section>

      <Section>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel eyebrow="Density" title="How many tests sit at each condition">
            <Chart data={[heatmapTrace(known)]} layout={heatmapLayout()} height={460} />
            <p className="mt-2 text-xs text-ink-3">Darker cells hold more tests. Almost all data cluster at ISS air (21 % O₂, 14.7 psi).</p>
          </Panel>
          <CoverageTable tests={tests.data} envs={envs.data} />
        </div>
      </Section>

      <Section tone="gray">
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel eyebrow="Ventilation" title="Oxygen vs. air flow">
            <Legend items={[{ label: PHASE_LABEL.solid, color: PHASE_COLOR.solid }, { label: PHASE_LABEL.gas, color: PHASE_COLOR.gas }, { label: "Cabin ventilation range", color: "#d9e8fa", shape: "bar" }]} />
            <Chart data={flowTraces(tests.data, invs.data)} layout={flowLayout()} height={440} />
            <p className="mt-2 text-xs text-ink-3">Solid-material flammability peaks near spacecraft ventilation speeds (~10 cm/s), per the Researcher's Guide, p. 31.</p>
          </Panel>
          <Panel eyebrow="Suppression · FLEX (PSI-69)" title="Where droplet flames went out">
            {flex.data ? <SuppressionMap tests={flex.data} /> : <Loading />}
          </Panel>
        </div>
      </Section>

      <Section>
        <DataDownload title="Download every test as one table" rows={tests.data.length} csv={downloads.allTestsCsv} />
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------- helpers */

function psi(t: TestPoint) {
  return (t.pressure_atm ?? 1) * PSI_PER_ATM;
}

function hoverText(t: TestPoint, names: Map<string, string>) {
  return [
    `<b>${names.get(t.investigation) ?? t.investigation}</b> · ${t.investigation}`,
    [t.fuel, t.configuration].filter(Boolean).join(" · "),
    `${t.o2_pct?.toFixed(1)} % O₂ (${t.o2_basis}) · ${psi(t).toFixed(1)} psi`,
    t.outcome ? `Outcome: ${t.outcome}` : "",
    t.condition_basis !== "measured" ? `<i>${t.condition_basis} conditions</i>` : "",
  ].filter(Boolean).join("<br>");
}

function symbols(group: TestPoint[]) {
  return group.map((t) => (t.o2_basis === "oxidizer stream" ? "diamond" : t.condition_basis === "measured" ? "circle" : "circle-open"));
}

/* ---------------------------------------------------------------- atmosphere map */

function scatter(group: TestPoint[], names: Map<string, string>, name: string, color: string, size = 8): Data {
  return {
    type: "scattergl", mode: "markers", name, x: group.map(psi), y: group.map((t) => t.o2_pct!),
    text: group.map((t) => hoverText(t, names)), hovertemplate: "%{text}<extra></extra>",
    marker: { size, color, opacity: 0.8, symbol: symbols(group), line: { color: "#ffffff", width: 1 } },
  };
}

function atmosphereTraces(points: TestPoint[], invs: InvestigationSummary[], highlight: string): Data[] {
  const names = new Map(invs.map((i) => [i.id, i.short]));
  if (highlight !== "all") {
    const others = points.filter((t) => t.investigation !== highlight);
    const focus = points.filter((t) => t.investigation === highlight);
    return [scatter(others, names, "Other tests", OTHER, 7), scatter(focus, names, names.get(highlight) ?? highlight, SERIES[0], 11)];
  }
  return PHASES.map((phase) => scatter(points.filter((t) => t.fuel_phase === phase), names, PHASE_LABEL[phase], PHASE_COLOR[phase]));
}

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
    showlegend: false,
    margin: { l: 64, r: 24, t: 16, b: 56 },
    xaxis: { title: { text: "Pressure (psi, log scale)" }, type: "log", range: [Math.log10(3.5), Math.log10(80)], tickvals: PSI_TICKS, ticktext: PSI_TICKS.map(String) },
    yaxis: { title: { text: "Oxygen (% by volume)" }, range: [0, 102], dtick: 10 },
    shapes: boxes.map(({ env }) => ({
      type: "rect", xref: "x", yref: "y", layer: "above",
      x0: env.pressure_psi[0], x1: env.pressure_psi[1], y0: env.o2_pct[0], y1: env.o2_pct[1],
      fillcolor: "rgba(11,11,11,0.04)", line: { color: ZONE, width: 1.5, dash: "dash" },
    })),
    annotations: [...boxes].sort((a, b) => a.env.o2_pct[1] - b.env.o2_pct[1]).map(({ env, names }, i) => {
      const nearTop = env.o2_pct[1] > 90;
      return {
        x: Math.log10(nearTop ? env.pressure_psi[1] : env.pressure_psi[0]), y: env.o2_pct[nearTop ? 0 : 1],
        xref: "x", yref: "y", text: names.join(" · "), showarrow: true, arrowcolor: INK.secondary, arrowwidth: 1,
        ax: nearTop ? 50 : -90 + i * 8, ay: nearTop ? 20 : -40 - i * 28, xanchor: nearTop ? "left" : "right",
        font: { size: 11, color: INK.primary, family: "Inter" }, bgcolor: "rgba(255,255,255,0.92)", borderpad: 3,
      };
    }),
  };
}

/* ---------------------------------------------------------------- density heatmap */

const O2_BINS = Array.from({ length: 18 }, (_, i) => i * 5 + 10);   // 10..95 %
const P_EDGES = [3.5, 5, 7, 9, 11, 13, 16, 22, 30, 45, 80];         // psi

function heatmapTrace(points: TestPoint[]): Data {
  const counts = O2_BINS.map(() => P_EDGES.slice(1).map(() => 0));
  for (const t of points) {
    const row = Math.min(O2_BINS.length - 1, Math.max(0, Math.floor((t.o2_pct! - 10) / 5)));
    const col = P_EDGES.findIndex((edge, i) => i < P_EDGES.length - 1 && psi(t) >= edge && psi(t) < P_EDGES[i + 1]);
    if (col >= 0) counts[row][col] += 1;
  }
  const xLabels = P_EDGES.slice(1).map((e, i) => `${P_EDGES[i]}–${e}`);
  return {
    type: "heatmap", x: xLabels, y: O2_BINS.map((o) => `${o}–${o + 5}`),
    z: counts.map((row) => row.map((c) => (c === 0 ? null : Math.log10(c + 1)))),
    text: counts.map((row) => row.map((c) => (c ? String(c) : ""))) as unknown as string[],
    texttemplate: "%{text}", textfont: { family: "DM Mono", size: 10 },
    colorscale: SEQUENTIAL, showscale: false, xgap: 2, ygap: 2,
    hovertemplate: "%{y} % O₂ · %{x} psi<br><b>%{text} tests</b><extra></extra>",
  } as Data;
}

function heatmapLayout(): Partial<Layout> {
  return {
    margin: { l: 72, r: 16, t: 10, b: 72 },
    xaxis: { title: { text: "Pressure band (psi)" }, showgrid: false, tickangle: -35 },
    yaxis: { title: { text: "Oxygen band (%)" }, showgrid: false },
  };
}

/* ---------------------------------------------------------------- airflow */

function flowTraces(tests: TestPoint[], invs: InvestigationSummary[]): Data[] {
  const names = new Map(invs.map((i) => [i.id, i.short]));
  const withFlow = tests.filter((t) => t.flow_cm_s != null && t.o2_pct != null);
  return (["solid", "gas"] as const).map((phase) => {
    const group = withFlow.filter((t) => t.fuel_phase === phase);
    return {
      type: "scattergl", mode: "markers", name: PHASE_LABEL[phase], x: group.map((t) => t.flow_cm_s!), y: group.map((t) => t.o2_pct!),
      text: group.map((t) => hoverText(t, names)), hovertemplate: "%{text}<br>%{x} cm/s<extra></extra>",
      marker: { size: 8, color: PHASE_COLOR[phase], opacity: 0.8, line: { color: "#ffffff", width: 1 } },
    };
  });
}

function flowLayout(): Partial<Layout> {
  return {
    showlegend: false,
    xaxis: { title: { text: "Air flow (cm/s)" }, range: [0, 90] },
    yaxis: { title: { text: "Oxygen (%)" }, range: [10, 25] },
    shapes: [{ type: "rect", xref: "x", yref: "paper", x0: 5, x1: 20, y0: 0, y1: 1, fillcolor: "#d9e8fa", opacity: 0.6, line: { width: 0 }, layer: "below" }],
    annotations: [{ x: 12.5, y: 1, xref: "x", yref: "paper", yanchor: "bottom", text: "Cabin ventilation", showarrow: false, font: { size: 11, color: INK.secondary } }],
  };
}

/* ---------------------------------------------------------------- FLEX suppression map */

const OUTCOMES = ["Extinction", "Disruption", "Completion"] as const;
const OUTCOME_LABEL: Record<string, string> = { Extinction: "Flame went out", Disruption: "Droplet disrupted", Completion: "Burned to completion" };

function SuppressionMap({ tests }: { tests: Record<string, unknown>[] }) {
  const rows = tests as unknown as (TestPoint & { inerts?: Record<string, number>; metrics?: Record<string, number> })[];
  const [agent, setAgent] = useState<"CO2" | "He">("CO2");
  const traces: Data[] = OUTCOMES.map((outcome, i) => {
    const group = rows.filter((t) => t.outcome === outcome && t.o2_pct != null);
    return {
      type: "scatter", mode: "markers", name: OUTCOME_LABEL[outcome],
      x: group.map((t) => (t.inerts?.[agent] ?? 0) * 100), y: group.map((t) => t.o2_pct!),
      customdata: group.map((t) => [t.fuel ?? "", (t.pressure_atm ?? 0).toFixed(2), String(t.metrics?.burn_time_s ?? "—")]),
      hovertemplate: `<b>${OUTCOME_LABEL[outcome]}</b><br>%{customdata[0]} · %{customdata[1]} atm<br>${agent}: %{x:.0f} % · O₂ %{y:.0f} %<br>burn time %{customdata[2]} s<extra></extra>`,
      marker: { size: 9, color: SERIES[i], opacity: 0.85, line: { color: "#ffffff", width: 1 } },
    };
  });
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Legend items={OUTCOMES.map((o, i) => ({ label: OUTCOME_LABEL[o], color: SERIES[i] }))} />
        <Toggle options={[{ id: "CO2", label: "CO₂" }, { id: "He", label: "Helium" }]} value={agent} onChange={(v) => setAgent(v as "CO2" | "He")} />
      </div>
      <Chart data={traces} height={400} layout={{
        showlegend: false,
        xaxis: { title: { text: `${agent === "CO2" ? "CO₂" : "Helium"} added to the chamber (% by volume)` }, rangemode: "tozero" },
        yaxis: { title: { text: "Oxygen (%)" } },
      }} />
      <p className="mt-2 text-xs text-ink-3">274 heptane and methanol droplet tests; many share identical conditions, so points overlap. Hover for fuel, pressure and burn time.</p>
    </>
  );
}

/* ---------------------------------------------------------------- coverage table */

function inBox(t: TestPoint, env: Environment, o2Margin = 0, pressureMargin = 0) {
  if (t.o2_pct == null || t.pressure_atm == null) return false;
  const p = psi(t);
  return t.o2_pct >= env.o2_pct[0] - o2Margin && t.o2_pct <= env.o2_pct[1] + o2Margin
    && p >= env.pressure_psi[0] * (1 - pressureMargin) && p <= env.pressure_psi[1] * (1 + pressureMargin);
}

function CoverageTable({ tests, envs }: { tests: TestPoint[]; envs: Environment[] }) {
  const rows = useMemo(() => envs.map((env) => {
    const near = tests.filter((t) => inBox(t, env, NEAR_O2_PCT, NEAR_PRESSURE));
    return { env, inside: tests.filter((t) => inBox(t, env)).length, near: near.length, solids: near.filter((t) => t.fuel_phase === "solid").length };
  }), [tests, envs]);
  const cell = (n: number) => `py-3 text-right font-mono tabular-nums ${n === 0 ? "font-semibold text-accent-dark" : "text-ink"}`;
  return (
    <Panel eyebrow="Coverage" title="Data available for each habitat">
      <table className="w-full text-sm">
        <thead className="border-b-2 border-ink text-left font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">
          <tr><th className="pb-2">Habitat</th><th className="pb-2 text-right">Inside range</th><th className="pb-2 text-right">Near range</th><th className="pb-2 text-right">Solids near</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ env, inside, near, solids }) => (
            <tr key={env.id}>
              <td className="py-3 font-semibold text-ink">{env.name}</td>
              <td className={cell(inside)}>{inside}</td>
              <td className={cell(near)}>{near}</td>
              <td className={cell(solids)}>{solids}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        "Near" = within ±{NEAR_O2_PCT} O₂ points and ±{NEAR_PRESSURE * 100} % pressure. Red = no PSI data. The closest tests to Moon and Mars habitats are FLEX
        droplets at 34 % O₂ and ~10.4 psi; no solid cabin material has been burned there. All data are microgravity.
      </p>
    </Panel>
  );
}
