import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, InvestigationLink, Loading, PageHeader, PillarBadges, Pill, ScoreBar, Stat } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { PILLARS, formatRange, stripCitations } from "../lib/format";
import type { Investigation } from "../lib/types";

const SOURCE_LABEL: Record<string, string> = {
  guide: "Researcher's Guide to ISS Combustion Science", grc: "NASA Glenn fact sheet", acme: "NASA ACME overview",
  psi: "PSI investigation record", challenge: "Space Apps challenge statement",
};

export function InvestigationDetail() {
  const { id = "" } = useParams();
  const inv = useApi(() => api.investigation(id), [id]);
  if (inv.error) return <ErrorBox message={inv.error} />;
  if (!inv.data) return <Loading />;
  const d = inv.data;

  return (
    <div>
      <Link to="/investigations" className="text-sm text-slate-400 hover:text-white">← All investigations</Link>
      <PageHeader title={`${d.short}: ${d.psi.title}`} subtitle={`${d.id} · ${d.group} · ${d.psi.platform ?? "ground study"} · ${d.psi.start ?? ""} – ${d.psi.end ?? ""}`}>
        <div className="flex flex-wrap gap-2">
          <a href={d.psi.url} target="_blank" rel="noreferrer" className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-400">Open in NASA PSI ↗</a>
          {d.psi.doi && <a href={`https://doi.org/${d.psi.doi}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">DOI {d.psi.doi}</a>}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 font-display text-lg font-semibold text-white">Why it matters for fire safety</h2>
            <p className="text-sm text-slate-300">{d.relevance}</p>
            {d.ai_summary && <AISummaryBlock inv={d} />}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Key findings</h2>
            <ul className="space-y-3">
              {d.key_findings.map((f) => (
                <li key={f.text} className="border-l-2 border-orange-500/60 pl-3 text-sm text-slate-200">
                  {f.text}
                  <div className="mt-0.5 text-xs text-slate-500">{SOURCE_LABEL[f.source] ?? f.source}{f.page ? `, p. ${f.page}` : ""}</div>
                </li>
              ))}
            </ul>
          </Card>
          <VariablesCard inv={d} />
          <TextCard title="Objectives (from PSI)" text={d.psi.objective} />
          <TextCard title="Approach (from PSI)" text={d.psi.approach} />
          {d.psi.publications.length > 0 && <Publications inv={d} />}
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3">
            <PillarBadges pillars={d.pillars} min={0.3} />
            {PILLARS.map((p) => <div key={p}><div className="text-xs capitalize text-slate-500">{p}</div><ScoreBar value={d.pillars[p]} /></div>)}
            <Stat label="Hardware" value={d.psi.hardware || "—"} />
            <Stat label="Samples / fuel" value={d.sample} />
            <Stat label="Fuels" value={d.fuels.join(", ")} />
            <Stat label="Measurements" value={d.measurements.join(" · ")} />
            <Stat label="On Earth" value={d.earth_applications} />
            {d.psi.related.length > 0 && <Stat label="Related" value={<span className="flex gap-2">{d.psi.related.map((r) => <InvestigationLink key={r} id={r} />)}</span>} />}
          </Card>
          <Link to={`/compare?ids=${d.id}`} className="block text-sm text-orange-300 hover:text-orange-200">Compare with another investigation →</Link>
        </aside>
      </div>
    </div>
  );
}

function AISummaryBlock({ inv }: { inv: Investigation }) {
  const s = inv.ai_summary!;
  return (
    <div className="mt-4 rounded-xl bg-orange-500/5 p-4 ring-1 ring-orange-500/20">
      <div className="mb-2 flex items-center gap-2 text-xs text-orange-300"><Pill className="bg-orange-500/15 text-orange-200 ring-orange-500/30">AI summary</Pill>{s.model}</div>
      <p className="text-sm text-slate-200">{stripCitations(s.plain_summary)}</p>
      <p className="mt-2 text-sm text-slate-300"><b className="text-white">Takeaway:</b> {stripCitations(s.fire_safety_takeaway)}</p>
      <p className="mt-2 text-sm text-slate-300"><b className="text-white">For modelers:</b> {stripCitations(s.modeling_use)}</p>
    </div>
  );
}

function VariablesCard({ inv }: { inv: Investigation }) {
  const s = inv.stats;
  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold text-white">Test conditions</h2>
      {s.n_tests === 0 ? <p className="text-sm text-slate-400">No experimental table in PSI (ground/modeling study).</p> : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Tests" value={`${s.n_tests} (${s.n_measured} measured)`} />
            <Stat label="Oxygen" value={formatRange(s.o2_pct, " %")} />
            <Stat label="Pressure" value={formatRange(s.pressure_psi, " psi")} />
            <Stat label="Air flow" value={formatRange(s.flow_cm_s, " cm/s", 0)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Stat label="Varied between tests" value={s.varied.join(", ") || "—"} />
            <Stat label="Held the same" value={s.fixed.join(", ") || "—"} />
          </div>
          {Object.keys(s.outcomes).length > 0 && <Stat label="Outcomes" value={Object.entries(s.outcomes).map(([k, v]) => `${k}: ${v}`).join(" · ")} />}
          <p className="mt-3 text-xs text-slate-500">Basis: {Object.entries(s.condition_basis).map(([k, v]) => `${v} ${k}`).join(", ")}. "Nominal" means ISS cabin air (21 % O₂, 1 atm) where the table did not record the atmosphere.</p>
        </>
      )}
    </Card>
  );
}

function TextCard({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return <Card><h2 className="mb-2 font-display text-lg font-semibold text-white">{title}</h2><p className="whitespace-pre-line text-sm text-slate-300">{text}</p></Card>;
}

function Publications({ inv }: { inv: Investigation }) {
  return (
    <Card>
      <h2 className="mb-3 font-display text-lg font-semibold text-white">Publications ({inv.psi.publications.length})</h2>
      <ul className="space-y-2 text-sm">
        {inv.psi.publications.slice(0, 12).map((p) => (
          <li key={p.title} className="text-slate-300">
            {p.doi ? <a className="text-orange-300 hover:underline" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
            <div className="text-xs text-slate-500">{p.authors}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
