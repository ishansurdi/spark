import { Link, useParams } from "react-router-dom";
import type { Data } from "plotly.js";
import { Chart, Legend } from "../components/Chart";
import {
  ButtonLink, Container, ErrorBox, Eyebrow, InvestigationLink, Loading, Panel, PillarBadges, Pill, ScoreBar, Section, Stat,
} from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { SERIES } from "../lib/chartTheme";
import { PILLARS, PSI_PER_ATM, formatRange, stripCitations } from "../lib/format";
import { imageFor } from "../lib/images";
import type { Investigation, TestPoint } from "../lib/types";

const SOURCE_LABEL: Record<string, string> = {
  guide: "Researcher's Guide to ISS Combustion Science", grc: "NASA Glenn fact sheet", acme: "NASA ACME overview",
  psi: "PSI investigation record", challenge: "Space Apps challenge statement",
};

export function InvestigationDetail() {
  const { id = "" } = useParams();
  const inv = useApi(() => api.investigation(id), [id]);
  const tests = useApi(() => api.investigationTests(id), [id]);
  if (inv.error) return <Section><ErrorBox message={inv.error} /></Section>;
  if (!inv.data) return <Section><Loading /></Section>;
  const d = inv.data;
  const image = imageFor(d.id);

  return (
    <>
      <section className="relative overflow-hidden bg-night text-white">
        {image && <img src={image.src} alt={image.caption} className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-75 md:w-2/3" />}
        <div className="hero-shade absolute inset-0" />
        <Container className="relative py-14 md:py-20">
          <Link to="/investigations" className="font-mono text-xs uppercase tracking-[0.16em] text-white/60 hover:text-white">← All investigations</Link>
          <div className="mt-6"><Eyebrow dark>{d.id} · {d.group}</Eyebrow></div>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">{d.short}</h1>
          <p className="mt-2 max-w-3xl text-xl text-white/80">{d.psi.title}</p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">{d.relevance}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={d.psi.url}>Open data in NASA PSI ↗</ButtonLink>
            {d.psi.doi && <ButtonLink href={`https://doi.org/${d.psi.doi}`} variant="light">DOI {d.psi.doi}</ButtonLink>}
            <ButtonLink to={`/compare?ids=${d.id}`} variant="outline">Compare</ButtonLink>
          </div>
          {image && <p className="mt-6 text-xs text-white/45">Image: {image.caption} · NASA PSI (public domain)</p>}
        </Container>
      </section>

      <div className="border-b border-line bg-paper-2">
        <Container className="grid grid-cols-2 gap-6 py-6 md:grid-cols-5">
          <Stat label="Platform" value={d.psi.platform || "Ground study"} />
          <Stat label="Hardware" value={d.psi.hardware || "—"} />
          <Stat label="Period" value={`${d.psi.start ?? "?"} – ${d.psi.end ?? "?"}`} />
          <Stat label="Tests in PSI" value={d.stats.n_tests || "—"} />
          <Stat label="License" value={d.psi.license || "—"} />
        </Container>
      </div>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-10">
            {d.ai_summary && <AISummaryBlock inv={d} />}
            <div>
              <Eyebrow>Key findings</Eyebrow>
              <ol className="mt-4 space-y-5">
                {d.key_findings.map((f, i) => (
                  <li key={f.text} className="grid grid-cols-[2.5rem_1fr] gap-2">
                    <span className="font-mono text-lg text-accent-dark">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-lg leading-snug text-ink">{f.text}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-3">{SOURCE_LABEL[f.source] ?? f.source}{f.page ? ` · p. ${f.page}` : ""}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {d.stats.n_tests > 0 && tests.data && <TestCharts inv={d} tests={tests.data as unknown as TestPoint[]} />}
            <ConditionsPanel inv={d} />
            <TextBlock title="Objectives" text={d.psi.objective} />
            <TextBlock title="Approach" text={d.psi.approach} />
            {d.psi.publications.length > 0 && <Publications inv={d} />}
          </div>
          <aside className="space-y-6">
            <Panel eyebrow="Fire-safety focus" title="Pillars">
              <div className="space-y-3">
                {PILLARS.map((p) => <div key={p}><div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">{p}</div><ScoreBar value={d.pillars[p]} /></div>)}
              </div>
              <div className="mt-4"><PillarBadges pillars={d.pillars} min={0.3} /></div>
            </Panel>
            <Panel eyebrow="Experiment" title="At a glance">
              <div className="space-y-4">
                <Stat label="Samples / fuel" value={d.sample} />
                <Stat label="Fuels" value={d.fuels.join(", ")} />
                <Stat label="Measurements" value={d.measurements.join(" · ")} />
                <Stat label="Benefit on Earth" value={d.earth_applications} />
                {d.psi.related.length > 0 && <Stat label="Related" value={<span className="flex gap-3">{d.psi.related.map((r) => <InvestigationLink key={r} id={r} />)}</span>} />}
              </div>
            </Panel>
          </aside>
        </div>
      </Section>
    </>
  );
}

function AISummaryBlock({ inv }: { inv: Investigation }) {
  const s = inv.ai_summary!;
  return (
    <div className="border-l-4 border-ink bg-paper-2 p-6">
      <div className="flex items-center gap-3"><Pill className="bg-ink text-white">AI summary</Pill><span className="font-mono text-xs text-ink-3">{s.model} · from PSI evidence</span></div>
      <p className="mt-4 text-lg leading-relaxed text-ink">{stripCitations(s.plain_summary)}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Stat label="Fire-safety takeaway" value={stripCitations(s.fire_safety_takeaway)} />
        <Stat label="For predictive modeling" value={stripCitations(s.modeling_use)} />
      </div>
    </div>
  );
}

/** Charts drawn from this investigation's own test runs. */
function TestCharts({ inv, tests }: { inv: Investigation; tests: TestPoint[] }) {
  const located = tests.filter((t) => t.o2_pct != null && t.pressure_atm != null);
  const outcomes = Object.entries(inv.stats.outcomes).sort((a, b) => b[1] - a[1]);
  const byOutcome = outcomes.length > 0 && outcomes.length <= 3;
  const fuels = countBy(tests, (t) => t.fuel ?? "unknown").slice(0, 8).reverse();
  const groups = byOutcome ? outcomes.map(([o]) => o) : ["Tests"];

  const scatter: Data[] = groups.map((g, i) => {
    const group = located.filter((t) => !byOutcome || t.outcome === g);
    return {
      type: "scatter", mode: "markers", name: g,
      x: group.map((t) => t.pressure_atm! * PSI_PER_ATM), y: group.map((t) => t.o2_pct!),
      text: group.map((t) => [t.fuel, t.configuration, t.outcome].filter(Boolean).join(" · ")),
      hovertemplate: "%{text}<br>%{y:.1f} % O₂ · %{x:.1f} psi<extra></extra>",
      marker: { size: 9, color: SERIES[i], opacity: 0.8, line: { color: "#fff", width: 1 } },
    };
  });

  return (
    <div>
      <Eyebrow>From the experimental table</Eyebrow>
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <Panel eyebrow={`${located.length} tests`} title="Test atmospheres">
          {byOutcome && <Legend items={groups.map((g, i) => ({ label: g, color: SERIES[i] }))} />}
          <Chart data={scatter} height={340} layout={{ showlegend: false, xaxis: { title: { text: "Pressure (psi)" } }, yaxis: { title: { text: "Oxygen (%)" } } }} />
        </Panel>
        <Panel eyebrow="Fuel / material" title="Tests per fuel">
          <Chart height={340} data={[{
            type: "bar", orientation: "h", y: fuels.map(([f]) => truncate(f)), x: fuels.map(([, n]) => n),
            text: fuels.map(([, n]) => String(n)), textposition: "outside", cliponaxis: false,
            marker: { color: SERIES[0] }, hovertemplate: "%{y}: %{x} tests<extra></extra>",
          }]} layout={{ showlegend: false, margin: { l: 170, r: 40, t: 10, b: 40 }, bargap: 0.35,
            xaxis: { title: { text: "Tests" }, rangemode: "tozero" }, yaxis: { showline: false, tickfont: { family: "Inter", size: 11, color: "#0b0b0b" } } }} />
        </Panel>
      </div>
    </div>
  );
}

function ConditionsPanel({ inv }: { inv: Investigation }) {
  const s = inv.stats;
  return (
    <Panel eyebrow="How tests differed" title="Variables and constants">
      {s.n_tests === 0 ? <p className="text-ink-2">No experimental table in PSI: this is a ground or modeling study that reuses flight data.</p> : (
        <>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <Stat label="Oxygen" value={formatRange(s.o2_pct, " %")} />
            <Stat label="Pressure" value={formatRange(s.pressure_psi, " psi")} />
            <Stat label="Air flow" value={formatRange(s.flow_cm_s, " cm/s", 0)} />
            <Stat label="Measured runs" value={`${s.n_measured} of ${s.n_tests}`} />
          </div>
          <div className="mt-6 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
            <Stat label="Varied between tests" value={s.varied.join(", ") || "—"} />
            <Stat label="Held constant" value={s.fixed.join(", ") || "—"} />
          </div>
          <p className="mt-5 text-xs text-ink-3">Basis: {Object.entries(s.condition_basis).map(([k, v]) => `${v} ${k}`).join(", ")}. "Nominal" = ISS cabin air (21 % O₂, 1 atm) where the table did not record the atmosphere.</p>
        </>
      )}
    </Panel>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <Eyebrow>{title} · from PSI</Eyebrow>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}

function Publications({ inv }: { inv: Investigation }) {
  return (
    <div>
      <Eyebrow>Publications ({inv.psi.publications.length})</Eyebrow>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {inv.psi.publications.slice(0, 12).map((p) => (
          <li key={p.title} className="py-3">
            {p.doi ? <a className="font-semibold text-ink hover:text-accent-dark" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title} ↗</a> : <span className="font-semibold">{p.title}</span>}
            <div className="mt-0.5 text-sm text-ink-3">{p.authors}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function countBy<T>(items: T[], key: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function truncate(text: string, max = 26) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
