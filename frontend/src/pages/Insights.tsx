import { Card, ErrorBox, InvestigationLink, Loading, PageHeader } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

function ResearchLinks({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      Related research: {ids.map((id) => <InvestigationLink key={id} id={id} />)}
    </div>
  );
}

function SourceLink({ source }: { source: string }) {
  return source.startsWith("http")
    ? <a href={source} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-orange-300">Source ↗</a>
    : <span className="text-xs text-slate-500">Source: {source}</span>;
}

export function Insights() {
  const data = useApi(api.insights, []);
  if (data.error) return <ErrorBox message={data.error} />;
  if (!data.data) return <Loading />;
  const { incidents, myths, spinoffs, gaps } = data.data;

  return (
    <div className="space-y-12">
      <PageHeader title="Insights" subtitle="What real spacecraft fires taught us, which assumptions microgravity research overturned, where the data runs out, and how the work helps on Earth." />

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-white">Lessons from real incidents</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-white">{inc.name}</h3>
                <span className="text-xs text-slate-500">{inc.date ?? "recent"}</span>
              </div>
              <div className="text-xs text-slate-500">{inc.setting}</div>
              <p className="mt-2 text-sm text-slate-300">{inc.what_happened}</p>
              <p className="mt-2 text-sm text-slate-400"><b className="text-slate-200">Cause:</b> {inc.cause}</p>
              <p className="mt-2 rounded-lg bg-orange-500/5 p-3 text-sm text-orange-100 ring-1 ring-orange-500/20">{inc.connection}</p>
              <ResearchLinks ids={inc.research} />
              <div className="mt-2"><SourceLink source={inc.source} /></div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-white">Myths microgravity research overturned</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {myths.map((m) => (
            <Card key={m.myth}>
              <p className="text-sm text-slate-500 line-through decoration-red-400/70">{m.myth}</p>
              <p className="mt-2 text-sm text-slate-200">{m.reality}</p>
              <ResearchLinks ids={m.research} />
              <div className="mt-2"><SourceLink source={m.source} /></div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-white">Data gaps for the Moon and Mars</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {gaps.map((g) => (
            <Card key={g.title} className="border-red-400/20">
              <h3 className="font-semibold text-red-200">{g.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{g.detail}</p>
              <ResearchLinks ids={g.research} />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-white">Back on Earth</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {spinoffs.map((s) => (
            <Card key={s.name}>
              <div className="flex items-baseline justify-between"><h3 className="font-semibold text-white">{s.name}</h3><span className="text-xs text-slate-500">{s.year ?? ""}</span></div>
              <p className="mt-1 text-sm text-slate-300">{s.detail}</p>
              <ResearchLinks ids={s.research} />
              <div className="mt-2"><SourceLink source={s.source} /></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
