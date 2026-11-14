import type { Environment } from "../lib/types";

export function EnvironmentPicker({ environments, value, onChange }: {
  environments: Environment[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {environments.map((env) => {
        const active = env.id === value;
        return (
          <button
            key={env.id}
            onClick={() => onChange(env.id)}
            className={`rounded-xl border p-3 text-left transition ${
              active ? "border-orange-400 bg-orange-500/10 shadow-[0_0_24px_-8px_rgba(249,115,22,0.7)]" : "border-white/10 bg-white/[0.02] hover:border-white/30"
            }`}
          >
            <div className="text-sm font-semibold text-white">{env.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              {env.o2_pct[0]}–{env.o2_pct[1]}% O₂ · {env.pressure_psi[0]}–{env.pressure_psi[1]} psi
            </div>
            <div className="text-xs text-slate-500">{env.gravity_g === 0 ? "microgravity" : `${env.gravity_g} g`}</div>
          </button>
        );
      })}
    </div>
  );
}
