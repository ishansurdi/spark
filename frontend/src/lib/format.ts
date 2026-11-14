import type { Pillar, Range } from "./types";

export const PILLARS: Pillar[] = ["prevention", "detection", "suppression"];

/** Pillar tags: outlined labels (text stays ink, the left rule carries the identity). */
export const PILLAR_STYLE: Record<Pillar, string> = {
  prevention: "border-l-[3px] border-[#eb6834] bg-paper-2 text-ink",
  detection: "border-l-[3px] border-[#2a78d6] bg-paper-2 text-ink",
  suppression: "border-l-[3px] border-[#1baf7a] bg-paper-2 text-ink",
};

export function formatRange(range: Range, unit = "", digits = 1): string {
  if (!range) return "—";
  const [low, high] = range.map((v) => Number(v.toFixed(digits)));
  return low === high ? `${low}${unit}` : `${low}–${high}${unit}`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function topPillar(pillars: Record<Pillar, number>): Pillar {
  return PILLARS.reduce((best, p) => (pillars[p] > pillars[best] ? p : best), PILLARS[0]);
}

/** Stable, distinguishable color per investigation for charts. */
const PALETTE = [
  "#f97316", "#38bdf8", "#a3e635", "#f472b6", "#facc15", "#34d399", "#c084fc", "#fb7185",
  "#22d3ee", "#fbbf24", "#4ade80", "#e879f9", "#60a5fa", "#f87171", "#2dd4bf", "#a78bfa",
  "#fdba74", "#93c5fd", "#bef264", "#f9a8d4", "#fde047", "#6ee7b7", "#d8b4fe", "#fca5a5",
];

export function colorFor(id: string, ids: string[]): string {
  const index = ids.indexOf(id);
  return PALETTE[(index >= 0 ? index : 0) % PALETTE.length];
}

export const PSI_PER_ATM = 14.6959;

/** Remove inline citation tags such as "[PSI-69, PSI-69 p.3]" for compact card text. */
export function stripCitations(text: string): string {
  return text.replace(/\s*\[PSI-[^\]]*\]/g, "").trim();
}
