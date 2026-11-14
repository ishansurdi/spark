import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { EnvironmentPicker } from "../components/EnvironmentPicker";
import { RichText } from "../components/RichText";
import { Container, ErrorBox, Eyebrow, InvestigationLink, Loading, Pill, Section } from "../components/ui";
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
    setQuestion(text);
    setState({ loading: true, error: null });
    api.ask(text.trim(), envId || undefined)
      .then((answer) => { setHistory((h) => [answer, ...h]); setQuestion(""); setState({ loading: false, error: null }); })
      .catch((e: Error) => setState({ loading: false, error: e.message }));
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(question); };

  return (
    <>
      <section className="bg-night text-white">
        <Container className="py-14 md:py-20">
          <Eyebrow dark>Ask SPARK · AI research assistant</Eyebrow>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">Ask a fire-safety question. Get an answer you can check.</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            SPARK searches 24 PSI investigations and 4,000+ passages from their final reports, then answers with citations to the exact source.
          </p>
          <form onSubmit={onSubmit} className="mt-8 flex max-w-4xl flex-col gap-0 sm:flex-row">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600} aria-label="Your question"
              placeholder="e.g. How much CO₂ does it take to put out a fuel fire in microgravity?"
              className="flex-1 border-2 border-white bg-white px-5 py-4 text-base text-ink placeholder:text-ink-3 focus:outline-none" />
            <button disabled={state.loading} className="bg-accent px-8 py-4 text-base font-semibold text-white hover:bg-accent-dark disabled:opacity-50">
              {state.loading ? "Searching…" : "Ask"}
            </button>
          </form>
          <div className="mt-5 flex max-w-5xl flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => submit(ex)} className="border border-white/25 px-3 py-1.5 text-left text-sm text-white/80 hover:border-white hover:text-white">{ex}</button>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-xs text-white/50">
            Scope: fires in crewed habitats (cabin materials, smoke, suppression). Rocket engine and propellant fires are outside the PSI
            data, so SPARK does not answer them. PSI holds microgravity data only; Moon and Mars answers are bounded by microgravity and
            1-g results.
          </p>
        </Container>
      </section>

      <div className="border-b border-line bg-paper-2">
        <Container className="py-6">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-3">Optional: focus answers on a habitat {envId && <button className="ml-2 text-accent-dark underline" onClick={() => setEnvId("")}>clear</button>}</div>
          {envs.data && <EnvironmentPicker compact environments={envs.data} value={envId} onChange={(id) => setEnvId(id === envId ? "" : id)} />}
        </Container>
      </div>

      <Section>
        {state.loading && <Loading label="Searching PSI reports and drafting a cited answer…" />}
        {state.error && <ErrorBox message={state.error} />}
        {!history.length && !state.loading && (
          <p className="max-w-2xl text-ink-3">Answers appear here with the evidence they used. Every claim links back to its PSI investigation.</p>
        )}
        <div className="space-y-12">{history.map((h, i) => <Answer key={history.length - i} answer={h} />)}</div>
      </Section>
    </>
  );
}

function Answer({ answer }: { answer: AskResponse }) {
  return (
    <article className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <Eyebrow>Question</Eyebrow>
        <h2 className="mt-2 text-2xl font-bold leading-snug">{answer.question}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {answer.ai ? <Pill className="bg-ink text-white">AI · {answer.model}</Pill> : <Pill className="bg-paper-2 text-ink">Evidence only</Pill>}
          {answer.environment && <Pill className="bg-paper-2 text-ink">Habitat: {answer.environment.replace("_", " ")}</Pill>}
        </div>
        <div className="mt-6"><RichText text={answer.answer} /></div>
        <p className="mt-6 text-xs text-ink-3">Generated from the evidence shown. AI can make mistakes; verify critical decisions against the cited sources.</p>
      </div>
      <aside>
        <div className="border-b-2 border-ink pb-2 font-mono text-xs uppercase tracking-[0.16em] text-ink">Evidence used ({answer.citations.length})</div>
        <ol className="divide-y divide-line">
          {answer.citations.map((c, i) => (
            <li key={i} className="py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <InvestigationLink id={c.investigation} label={c.short ?? c.investigation} />
                <span className="font-mono text-[0.68rem] text-ink-3">{c.investigation}{c.page ? ` · p.${c.page}` : ""}</span>
              </div>
              <div className="mt-0.5 text-xs font-medium text-ink-2">{c.source}</div>
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-3">{c.excerpt}…</p>
            </li>
          ))}
        </ol>
      </aside>
    </article>
  );
}
