import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Loading, PageBanner, PillarBadges, Pill, Section, Toggle } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { PILLARS, formatRange, stripCitations } from "../lib/format";
import { imageFor } from "../lib/images";
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

  const groups = [...new Set(filtered.map((i) => i.group))];
  return (
    <>
      <PageBanner eyebrow="Investigations" title="Two decades of fire experiments in orbit"
        intro="Flight experiments on the ISS and Cygnus cargo vehicles, plus ground studies that model their data. Filter by fire-safety pillar, platform or material."
        image="/img/efield-blue.jpg" />
      <div className="sticky top-[73px] z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
          <Toggle options={[{ id: "all", label: "All pillars" }, ...PILLARS.map((p) => ({ id: p, label: p }))]} value={pillar} onChange={(v) => setPillar(v as typeof pillar)} />
          <Toggle options={[{ id: "all", label: "All" }, { id: "flight", label: "Flight" }, { id: "ground", label: "Ground" }]} value={kind} onChange={setKind} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search fuel, material or name"
            aria-label="Search investigations"
            className="w-full border border-ink bg-paper px-3 py-2 text-sm placeholder:text-ink-3 focus:outline-2 focus:outline-accent lg:ml-auto lg:w-80" />
        </div>
      </div>
      <Section>
        {invs.error && <ErrorBox message={invs.error} />}
        {!invs.data && <Loading />}
        {groups.map((group) => (
          <div key={group} className="mb-14">
            <div className="mb-5 flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h2 className="text-xl font-bold">{group}</h2>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-3">{filtered.filter((i) => i.group === group).length} investigations</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.filter((i) => i.group === group).map((inv) => <InvestigationCard key={inv.id} inv={inv} />)}
            </div>
          </div>
        ))}
        {invs.data && !filtered.length && <p className="text-ink-2">No investigations match these filters.</p>}
      </Section>
    </>
  );
}

function InvestigationCard({ inv }: { inv: InvestigationSummary }) {
  const s = inv.stats;
  const image = imageFor(inv.id);
  return (
    <Link to={`/investigations/${inv.id}`} className="group flex flex-col border border-line bg-paper transition hover:border-ink hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
      <div className="relative aspect-[16/7] overflow-hidden bg-night">
        {image
          ? <img src={image.src} alt={image.caption} loading="lazy" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-end p-4 font-mono text-xs uppercase tracking-[0.16em] text-white/50">{inv.group}</div>}
        <div className="absolute left-0 top-0 bg-ink px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-white">{inv.id}</div>
        {inv.kind === "ground" && <Pill className="absolute right-2 top-2 bg-white text-ink">ground study</Pill>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold group-hover:text-accent-dark">{inv.short}</h3>
        <div className="text-sm text-ink-3">{inv.title}</div>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-2">{inv.summary ? stripCitations(inv.summary) : inv.relevance}</p>
        <div className="mt-4"><PillarBadges pillars={inv.pillars} /></div>
        <dl className="mt-4 grid grid-cols-3 border-t border-line pt-3 font-mono text-xs">
          <div><dt className="text-ink-3">TESTS</dt><dd className="mt-0.5 text-ink">{s.n_tests || "—"}</dd></div>
          <div><dt className="text-ink-3">O₂</dt><dd className="mt-0.5 text-ink">{formatRange(s.o2_pct, "%", 0)}</dd></div>
          <div><dt className="text-ink-3">PRESSURE</dt><dd className="mt-0.5 text-ink">{formatRange(s.pressure_psi, " psi", 1)}</dd></div>
        </dl>
      </div>
    </Link>
  );
}
