import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PILLARS, PILLAR_STYLE, percent } from "../lib/format";
import type { Pillar } from "../lib/types";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function PillarBadges({ pillars, min = 0.5 }: { pillars: Record<Pillar, number>; min?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PILLARS.filter((p) => pillars[p] >= min).map((p) => (
        <Pill key={p} className={PILLAR_STYLE[p]}>{p}</Pill>
      ))}
    </div>
  );
}

export function ScoreBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2" title={label ? `${label}: ${percent(value)}` : percent(value)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: percent(value) }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-400">{percent(value)}</span>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-200">{value}</div>
    </div>
  );
}

export function Loading({ label = "Loading NASA data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">Could not load data: {message}</div>;
}

export function InvestigationLink({ id, label }: { id: string; label?: string | null }) {
  return (
    <Link to={`/investigations/${id}`} className="font-medium text-orange-300 hover:text-orange-200 hover:underline">
      {label ?? id}
    </Link>
  );
}

export function Toggle({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${value === o.id ? "bg-orange-500 text-white shadow" : "text-slate-300 hover:bg-white/10"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
