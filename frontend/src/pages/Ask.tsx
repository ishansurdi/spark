import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { EnvironmentPicker } from "../components/EnvironmentPicker";
import { RichText } from "../components/RichText";
import { Card, ErrorBox, InvestigationLink, Loading, PageHeader, Pill } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import type { AskResponse } from "../lib/types";

const EXAMPLES = [
  "A cable insulation fire starts in a lunar rover at 34% oxygen. What does NASA's data say?",
  "Will a CO2 extinguisher work as well in space as on Earth?",
  "Why might an ISS smoke detector miss an early fire?",
  "Which materials burn faster in microgravity than on Earth?",
  "Does turning off the ventilation put out a fire in microgravity?",
];

export function Ask() {
  const [params] = useSearchParams();
  const [envId, setEnvId] = useState(params.get("env") ?? "");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AskResponse[]>([]);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const envs = useApi(api.environments, []);

  const submit = (text: string) => {
    if (text.trim().length < 3 || state.loading) return;
    setState({ loading: true, error: null });
    api.ask(text.trim(), envId || undefined)
      .then((answer) => { setHistory((h) => [answer, ...h]); setQuestion(""); setState({ loading: false, error: null }); })
      .catch((e: Error) => setState({ loading: false, error: e.message }));
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(question); };

  return (
    <div>
      <PageHeader title="Ask SPARK" subtitle="Ask a fire-safety question in plain language. SPARK searches the PSI investigations and their final reports, then answers with citations you can check." />
      <Card className="mb-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Optional: focus on a habitat</div>
        {envs.data && <EnvironmentPicker environments={envs.data} value={envId} onChange={(id) => setEnvId(id === envId ? "" : id)} />}
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600}
            placeholder="e.g. How much CO₂ does it take to put out a fuel fire in microgravity?"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none" />
          <button disabled={state.loading} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-40">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => submit(ex)} className="rounded-full bg-white/5 px-3 py-1 text-left text-xs text-slate-300 hover:bg-white/10">{ex}</button>
          ))}
        </div>
      </Card>
      {state.loading && <Loading label="Searching PSI reports and drafting an answer…" />}
      {state.error && <ErrorBox message={state.error} />}
      <div className="space-y-6">{history.map((h, i) => <Answer key={history.length - i} answer={h} />)}</div>
    </div>
  );
}

function Answer({ answer }: { answer: AskResponse }) {
  return (
    <Card>
      <div className="mb-3 text-sm font-semibold text-white">{answer.question}</div>
      <RichText text={answer.answer} />
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        {answer.ai ? <Pill className="bg-orange-500/15 text-orange-200 ring-orange-500/30">AI · {answer.model}</Pill> : <Pill className="bg-white/5 text-slate-300 ring-white/10">Evidence only</Pill>}
        Answers are generated from the evidence below; verify before use.
      </div>
      <details className="mt-4" open={!answer.ai}>
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-white">Evidence used ({answer.citations.length})</summary>
        <ul className="mt-3 space-y-3">
          {answer.citations.map((c, i) => (
            <li key={i} className="text-sm">
              <InvestigationLink id={c.investigation} label={`${c.short ?? c.investigation} (${c.investigation})`} />
              <span className="text-xs text-slate-500"> · {c.source}{c.page ? `, p. ${c.page}` : ""}</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.excerpt}…</p>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
