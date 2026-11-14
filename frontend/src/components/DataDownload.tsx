import { useState } from "react";

/** Column meanings for the normalized test export (shared by every investigation). */
const DICTIONARY: [string, string][] = [
  ["investigation", "PSI accession, e.g. PSI-69 (cite the investigation by its DOI)"],
  ["test_id / date", "Test identifier and date as recorded in the PSI table"],
  ["fuel, fuel_phase", "Fuel or material, and solid / liquid / gas"],
  ["configuration", "Sample geometry or flame type (droplet, flat sample, inverse flame…)"],
  ["o2_pct", "Oxygen, % by volume"],
  ["o2_basis", "ambient = room atmosphere; oxidizer stream = O₂ issuing from the burner (inverse flames)"],
  ["pressure_atm", "Pressure in atmospheres (× 14.696 for psi)"],
  ["flow_cm_s", "Forced air flow speed in cm/s (blank = quiescent or not recorded)"],
  ["condition_basis", "measured, nominal (ISS cabin air assumed), test matrix or daily summary"],
  ["outcome", "Recorded end state, e.g. Extinction, Self-extinguished, No ignition"],
  ["inert_*", "Diluent / suppressant mole fractions (N2, CO2, He)"],
  ["metric_*", "Measured results: burn time, extinction diameter, burning rate, flame temperature…"],
];

function DownloadButton({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <a href={href} download
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${primary ? "bg-ink text-white hover:bg-accent" : "border border-ink text-ink hover:bg-paper-2"}`}>
      <span aria-hidden>↓</span>{label}
    </a>
  );
}

/** Download links plus a collapsible data dictionary, for researchers building predictive models. */
export function DataDownload({ csv, json, rows, title = "Download the data" }: { csv: string; json?: string; rows: number; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-line bg-paper p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-ink-3">For predictive modeling</div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-ink-2">{rows.toLocaleString()} normalized test rows · units harmonized · CC0 NASA PSI data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadButton href={csv} label="CSV" primary />
          {json && <DownloadButton href={json} label="JSON" />}
        </div>
      </div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-4 font-mono text-xs uppercase tracking-wider text-ink-2 hover:text-ink">
        {open ? "Hide" : "Show"} data dictionary
      </button>
      {open && (
        <dl className="mt-3 grid gap-x-8 gap-y-2 border-t border-line pt-3 text-sm md:grid-cols-2">
          {DICTIONARY.map(([col, meaning]) => (
            <div key={col}>
              <dt className="font-mono text-xs text-ink">{col}</dt>
              <dd className="text-ink-2">{meaning}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
