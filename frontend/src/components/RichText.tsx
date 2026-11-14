import { Fragment, type ReactNode } from "react";
import { InvestigationLink } from "./ui";

/**
 * Minimal renderer for AI answers: paragraphs, "-"/"*" bullets, **bold**,
 * and citation tags like [PSI-25] or [PSI-25 p.12] turned into links.
 */
const INLINE = /(\*\*[^*]+\*\*|\[PSI-\d+(?: p\.\d+)?\])/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
    const cite = part.match(/^\[(PSI-\d+)( p\.\d+)?\]$/);
    if (cite) {
      return (
        <sup key={i} className="mx-0.5 rounded bg-orange-500/15 px-1 text-[0.7rem]">
          <InvestigationLink id={cite[1]} label={`${cite[1]}${cite[2] ?? ""}`} />
        </sup>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={blocks.length} className="ml-5 list-disc space-y-1.5">
          {bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}
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
    if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
  }
  flush();
  return <div className="space-y-3 text-sm leading-relaxed text-slate-300">{blocks}</div>;
}
