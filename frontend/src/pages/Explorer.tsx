import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Loading, PageHeader, PillarBadges, Pill, Toggle } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { PILLARS, formatRange, stripCitations } from "../lib/format";
import type { InvestigationSummary, Pillar } from "../lib/types";

export function Explorer() {
  const invs = useApi(api.investigations, []);
  const [pillar, setPillar] = useState<"all" | Pillar>("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => (invs.data ?? []).filter((inv) =>
    (pillar === "all" || inv.pillars[pillar] >= 0.5)
    && (kind === "all" || inv.kind === kind)
    && `${inv.short} ${inv.title} ${inv.group} ${inv.fuels.join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  ), [invs.data, pillar, kind, query]);

  if (invs.error) return <ErrorBox message={invs.error} />;
  if (!invs.data) return <Loading />;
  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <div>
      <PageHeader title="Investigations" subtitle={`${invs.data.length} NASA PSI combustion investigations: flight experiments on the ISS and Cygnus, plus ground studies that model their data.`} />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Toggle options={[{ id: "all", label: "All pillars" }, ...PILLARS.map((p) => ({ id: p, label: p[0].toUpperCase() + p.slice(1) }))]} value={pillar} onChange={(v) => setPillar(v as typeof pillar)} />
        <Toggle options={[{ id: "all", label: "All" }, { id: "flight", label: "Flight" }, { id: "ground", label: "Ground" }]} value={kind} onChange={setKind} />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fuel, material, name…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none lg:w-72"
        />
      </div>
      {groups.map((group) => (
        <section key={group} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">{group}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.filter((i) => i.group === group).map((inv) => <InvestigationCard key={inv.id} inv={inv} />)}
          </div>
        </section>
      ))}
      {!filtered.length && <p className="text-sm text-slate-400">No investigations match these filters.</p>}
    </div>
  );
}

function InvestigationCard({ inv }: { inv: InvestigationSummary }) {
  const s = inv.stats;
  return (
    <Link to={`/investigations/${inv.id}`} className="group">
      <Card className="h-full transition group-hover:border-orange-400/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-lg font-semibold text-white">{inv.short}</div>
            <div className="text-xs text-slate-500">{inv.id} · {inv.title}</div>
          </div>
          {inv.kind === "ground" && <Pill className="bg-white/5 text-slate-300 ring-white/10">ground</Pill>}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-300">{inv.summary ? stripCitations(inv.summary) : inv.relevance}</p>
        <div className="mt-3"><PillarBadges pillars={inv.pillars} /></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
          <span><b className="text-slate-200">{s.n_tests || "—"}</b> tests</span>
          <span>O₂ {formatRange(s.o2_pct, "%", 0)}</span>
          <span>{formatRange(s.pressure_psi, " psi", 1)}</span>
        </div>
      </Card>
    </Link>
  );
}
