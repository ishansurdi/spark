import type { Environment } from "../lib/types";

function gravityLabel(g: number) {
  return g === 0 ? "Microgravity" : `${g} g`;
}

export function EnvironmentPicker({ environments, value, onChange, compact = false }: {
  environments: Environment[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 lg:grid-cols-6" role="radiogroup" aria-label="Crew environment">
      {environments.map((env) => {
        const active = env.id === value;
        return (
          <button
            key={env.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(env.id)}
            className={`group relative text-left transition ${compact ? "p-3" : "p-4"} ${active ? "bg-ink text-white" : "bg-paper text-ink hover:bg-paper-2"}`}
          >
            <span className={`absolute inset-x-0 top-0 h-[3px] ${active ? "bg-accent" : "bg-transparent group-hover:bg-ink/20"}`} />
            <div className={`font-mono text-[0.65rem] uppercase tracking-[0.14em] ${active ? "text-white/60" : "text-ink-3"}`}>{gravityLabel(env.gravity_g)}</div>
            <div className="mt-1 text-sm font-bold leading-tight">{env.name}</div>
            {!compact && (
              <div className={`mt-2 font-mono text-xs tabular-nums ${active ? "text-white/75" : "text-ink-2"}`}>
                {env.o2_pct[0]}–{env.o2_pct[1]}% O₂<br />{env.pressure_psi[0]}–{env.pressure_psi[1]} psi
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
