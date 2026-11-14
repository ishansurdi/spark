import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Minimal renderer for AI answers: paragraphs, "-"/"*" bullets, **bold**, and citation
 * tags like [PSI-25], [PSI-25 p.12] or [PSI-25, PSI-69] turned into linked chips.
 */
const INLINE = /(\*\*[^*]+\*\*|\[PSI-\d+[^\]]*\])/g;
const CITE = /PSI-\d+(?: p\.\d+)?/g;

function CitationChip({ tag }: { tag: string }) {
  const id = tag.split(" ")[0];
  return (
    <Link to={`/investigations/${id}`} className="mx-0.5 inline-block bg-ink px-1.5 py-px align-[0.1em] font-mono text-[0.68rem] text-white no-underline hover:bg-accent">
      {tag}
    </Link>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("[PSI-")) return <Fragment key={i}>{(part.match(CITE) ?? []).map((tag, j) => <CitationChip key={j} tag={tag} />)}</Fragment>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="space-y-2.5">
          {bullets.map((b, i) => <li key={i} className="border-l-2 border-ink pl-4">{inline(b)}</li>)}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line) continue;
    if (/^data gap:/i.test(line)) {
      blocks.push(<p key={blocks.length} className="border-l-4 border-accent bg-accent/5 p-3 text-ink">{inline(line)}</p>);
    } else {
      blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className="space-y-4 text-base leading-relaxed text-ink-2">{blocks}</div>;
}
