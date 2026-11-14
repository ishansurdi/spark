import type { Data, Layout } from "plotly.js";
import { Chart, Legend } from "../components/Chart";
import { ErrorBox, InvestigationLink, Loading, PageBanner, Panel, Section, SectionHeading } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { INK, SERIES } from "../lib/chartTheme";
import type { Insights as InsightsData, InvestigationSummary } from "../lib/types";

function ResearchLinks({ ids, dark = false }: { ids?: string[]; dark?: boolean }) {
  if (!ids?.length) return null;
  return (
    <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs ${dark ? "text-white/60" : "text-ink-3"}`}>
      RESEARCH: {ids.map((id) => <InvestigationLink key={id} id={id} className={dark ? "!text-white" : ""} />)}
    </div>
  );
}

function SourceLink({ source, dark = false }: { source: string; dark?: boolean }) {
  const cls = `mt-2 inline-block font-mono text-[0.68rem] uppercase tracking-wider ${dark ? "text-white/50 hover:text-white" : "text-ink-3 hover:text-ink"}`;
  return source.startsWith("http")
    ? <a href={source} target="_blank" rel="noreferrer" className={cls}>Source ↗</a>
    : <span className={cls}>Source: {source}</span>;
}

export function Insights() {
  const data = useApi(api.insights, []);
  const invs = useApi(api.investigations, []);
  if (data.error) return <Section><ErrorBox message={data.error} /></Section>;
  if (!data.data) return <Section><Loading /></Section>;
  const { incidents, myths, spinoffs, gaps, equipment } = data.data;

  return (
    <>
      <PageBanner eyebrow="Insights" title="What fire in space has taught us"
        intro="Real incidents, the assumptions microgravity research overturned, where the data runs out for the Moon and Mars, and how the work pays off on Earth."
        image="/img/acme-hardware.jpg" />

      <Section>
        <SectionHeading eyebrow="Timeline" title="From accidents to experiments"
          intro="Crewed spacecraft fires drove NASA's fire-safety research. Bars show when each PSI flight investigation ran; dashed lines mark incidents." />
        {invs.data && <Panel eyebrow="1967 – today" title="Incidents and PSI flight investigations"><Timeline incidents={incidents} invs={invs.data} /></Panel>}
      </Section>

      <section className="bg-night py-14 text-white md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeading dark eyebrow="Lessons from real incidents" title="Every rule has a story" />
          <div className="grid gap-px bg-night-line md:grid-cols-2">
            {incidents.map((inc) => (
              <article key={inc.id} className="bg-night p-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-2xl font-bold">{inc.name}</h3>
                  <span className="font-mono text-sm text-accent">{inc.date ?? "Recent"}</span>
                </div>
                <div className="mt-1 font-mono text-xs uppercase tracking-wider text-white/50">{inc.setting}</div>
                <p className="mt-4 leading-relaxed text-white/80">{inc.what_happened}</p>
                <p className="mt-3 text-sm text-white/60"><span className="font-semibold text-white">Cause:</span> {inc.cause}</p>
                <p className="mt-5 border-l-2 border-accent pl-4 text-white">{inc.connection}</p>
                <ResearchLinks ids={inc.research} dark />
                <SourceLink source={inc.source} dark />
              </article>
            ))}
          </div>
        </div>
      </section>

      <Section tone="gray">
        <SectionHeading eyebrow="Myths overturned" title="What microgravity research proved wrong" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myths.map((m, i) => (
            <article key={m.myth} className="flex flex-col border-t-4 border-ink bg-paper p-6">
              <span className="font-mono text-xs text-ink-3">MYTH {String(i + 1).padStart(2, "0")}</span>
              <p className="mt-2 text-ink-3 line-through decoration-accent decoration-2">{m.myth}</p>
              <p className="mt-3 flex-1 text-lg font-semibold leading-snug text-ink">{m.reality}</p>
              <ResearchLinks ids={m.research} />
              <SourceLink source={m.source} />
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Next-generation equipment" title="What the research means for fire-safety hardware"
          intro="Each row links PSI evidence to a design implication for detectors, suppression, extinguishers, materials, controls and models. Implications are SPARK's interpretation; follow the research links to the source data." />
        <div className="divide-y divide-line border-y-2 border-ink">
          {equipment.map((e, i) => (
            <article key={e.equipment} className="grid gap-4 py-6 md:grid-cols-[2.5rem_1.1fr_1.6fr_1.6fr]">
              <span className="font-mono text-lg text-accent-dark">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-bold leading-snug">{e.equipment}</h3>
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">What the data shows</div>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{e.evidence}</p>
                <ResearchLinks ids={e.research} />
              </div>
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink-3">Design implication</div>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink">{e.implication}</p>
                <SourceLink source={e.source} />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="gray">
        <SectionHeading eyebrow="Data gaps" title="What we still don't know for the Moon and Mars"
          intro="PSI holds microgravity data only. These gaps are where upcoming experiments such as FM2 and LUCI, and future teams, should focus." />
        <div className="grid gap-6 md:grid-cols-2">
          {gaps.map((g) => (
            <article key={g.title} className="border-l-4 border-accent bg-accent/[0.04] p-6">
              <h3 className="text-lg font-bold">{g.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{g.detail}</p>
              <ResearchLinks ids={g.research} />
            </article>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Back on Earth" title="Space fire research in everyday safety" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {spinoffs.map((s) => (
            <article key={s.name} className="border border-line bg-paper p-6">
              <div className="font-mono text-sm text-accent-dark">{s.year ?? "Today"}</div>
              <h3 className="mt-1 text-lg font-bold">{s.name}</h3>
              <p className="mt-2 text-ink-2">{s.detail}</p>
              <ResearchLinks ids={s.research} />
              <SourceLink source={s.source} />
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------- timeline chart */

function year(date?: string | null): number | null {
  const match = date?.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

function Timeline({ incidents, invs }: { incidents: InsightsData["incidents"]; invs: InvestigationSummary[] }) {
  const flights = invs
    .filter((i) => i.kind === "flight" && year(i.start))
    .map((i) => ({ ...i, y0: year(i.start)!, y1: Math.max(year(i.end) ?? year(i.start)!, year(i.start)! + 0.6) }))
    .sort((a, b) => b.y0 - a.y0);
  const events = incidents.filter((inc) => year(inc.date));

  const bars: Data = {
    type: "bar", orientation: "h", y: flights.map((i) => i.short), base: flights.map((i) => i.y0), x: flights.map((i) => i.y1 - i.y0),
    marker: { color: SERIES[0], line: { color: "#fff", width: 2 } },
    customdata: flights.map((i) => [i.id, i.y0, Math.round(i.y1)]),
    hovertemplate: "<b>%{y}</b> (%{customdata[0]})<br>%{customdata[1]} – %{customdata[2]}<extra></extra>",
  };
  const layout: Partial<Layout> = {
    showlegend: false, bargap: 0.35, margin: { l: 110, r: 24, t: 30, b: 48 },
    xaxis: { title: { text: "Year" }, range: [1964, 2026], dtick: 5 },
    yaxis: { showline: false, tickfont: { family: "Inter", size: 11, color: INK.primary } },
    shapes: events.map((e) => ({ type: "line", xref: "x", yref: "paper", x0: year(e.date)!, x1: year(e.date)!, y0: 0, y1: 1, line: { color: INK.primary, width: 1.5, dash: "dash" } })),
    annotations: events.map((e, i) => ({
      x: year(e.date)!, y: 1, xref: "x", yref: "paper", yanchor: "bottom", yshift: (i % 2) * 14, text: `<b>${e.name}</b>`,
      showarrow: false, font: { size: 11, color: INK.primary }, bgcolor: "rgba(255,255,255,0.9)",
    })),
  };
  return (
    <>
      <Legend items={[{ label: "PSI flight investigation (active years)", color: SERIES[0], shape: "bar" }, { label: "Crewed spacecraft fire incident", color: INK.primary, shape: "dash" }]} />
      <Chart data={[bars]} layout={layout} height={Math.max(420, flights.length * 24 + 100)} />
      <p className="mt-2 text-xs text-ink-3">Years from PSI investigation records. Saffire and BASS flew after decades of ground and drop-tower research prompted by these incidents.</p>
    </>
  );
}
