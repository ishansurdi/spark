import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PILLARS, PILLAR_STYLE, percent } from "../lib/format";
import type { Pillar } from "../lib/types";

/* ------------------------------------------------------------------ typography */

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`font-mono text-xs font-medium uppercase tracking-[0.18em] ${dark ? "text-accent" : "text-accent-dark"}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, intro, dark = false, children }: {
  eyebrow?: string; title: string; intro?: ReactNode; dark?: boolean; children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
        <h2 className={`mt-2 text-3xl font-bold tracking-tight md:text-4xl ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
        {intro && <p className={`mt-3 text-base leading-relaxed ${dark ? "text-white/70" : "text-ink-2"}`}>{intro}</p>}
      </div>
      {children}
    </div>
  );
}

/** Black page banner used at the top of inner pages. */
export function PageBanner({ eyebrow, title, intro, image, children }: {
  eyebrow: string; title: string; intro?: ReactNode; image?: string; children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-night text-white">
      {image && <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-full object-cover object-right opacity-70 md:w-2/3" />}
      <div className="hero-shade absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
        <Eyebrow dark>{eyebrow}</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/75">{intro}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 ${className}`}>{children}</div>;
}

export function Section({ children, tone = "paper", className = "" }: { children: ReactNode; tone?: "paper" | "gray" | "night"; className?: string }) {
  const bg = { paper: "bg-paper", gray: "bg-paper-2", night: "bg-night text-white" }[tone];
  return <section className={`${bg} py-14 md:py-20 ${className}`}><Container>{children}</Container></section>;
}

/* ------------------------------------------------------------------ surfaces */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-paper p-6 ${className}`}>{children}</div>;
}

export function Panel({ title, eyebrow, children, actions, className = "" }: {
  title?: string; eyebrow?: string; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={`border border-line bg-paper ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            {eyebrow && <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink-3">{eyebrow}</div>}
            {title && <h3 className="text-lg font-semibold text-ink">{title}</h3>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ small parts */

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider ${className}`}>{children}</span>;
}

export function PillarBadges({ pillars, min = 0.5 }: { pillars: Record<Pillar, number>; min?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PILLARS.filter((p) => pillars[p] >= min).map((p) => <Pill key={p} className={PILLAR_STYLE[p]}>{p}</Pill>)}
    </div>
  );
}

export function ScoreBar({ value, label, tone = "ink" }: { value: number; label?: string; tone?: "ink" | "accent" }) {
  return (
    <div className="flex items-center gap-2" title={label ? `${label}: ${percent(value)}` : percent(value)}>
      <div className="h-1.5 flex-1 bg-line">
        <div className={`h-full ${tone === "accent" ? "bg-accent" : "bg-ink"}`} style={{ width: percent(value) }} />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-ink-2">{percent(value)}</span>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div className="mt-1 text-sm leading-snug text-ink">{value}</div>
    </div>
  );
}

/** Large headline number (stat tile). */
export function HeroNumber({ value, label, note, alert = false, dark = false }: {
  value: ReactNode; label: string; note?: string; alert?: boolean; dark?: boolean;
}) {
  return (
    <div className={`border-t-2 pt-4 ${alert ? "border-accent" : dark ? "border-white/30" : "border-ink"}`}>
      <div className={`text-4xl font-bold tracking-tight tabular-nums md:text-5xl ${alert ? "text-accent" : dark ? "text-white" : "text-ink"}`}>{value}</div>
      <div className={`mt-1 text-sm font-medium ${dark ? "text-white/85" : "text-ink"}`}>{label}</div>
      {note && <div className={`mt-0.5 text-xs ${dark ? "text-white/55" : "text-ink-3"}`}>{note}</div>}
    </div>
  );
}

export function Loading({ label = "Loading NASA data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 font-mono text-xs uppercase tracking-widest text-ink-3">
      <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="border-l-4 border-accent bg-accent/5 p-4 text-sm text-ink">Could not load data: {message}</div>;
}

export function InvestigationLink({ id, label, className = "" }: { id: string; label?: string | null; className?: string }) {
  return (
    <Link to={`/investigations/${id}`} className={`font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-dark ${className}`}>
      {label ?? id}
    </Link>
  );
}

export function Toggle({ options, value, onChange, dark = false }: {
  options: { id: string; label: string }[]; value: string; onChange: (id: string) => void; dark?: boolean;
}) {
  return (
    <div className={`inline-flex flex-wrap border ${dark ? "border-white/25" : "border-ink"}`} role="group">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
              active ? (dark ? "bg-white text-ink" : "bg-ink text-white") : dark ? "text-white/80 hover:bg-white/10" : "text-ink hover:bg-paper-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ButtonLink({ to, href, children, variant = "primary" }: {
  to?: string; href?: string; children: ReactNode; variant?: "primary" | "light" | "outline";
}) {
  const style = {
    primary: "bg-accent text-white hover:bg-accent-dark",
    light: "bg-white text-ink hover:bg-white/85",
    outline: "border border-current hover:bg-white/10",
  }[variant];
  const cls = `inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition ${style}`;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>;
  return <Link to={to ?? "/"} className={cls}>{children}</Link>;
}
