export type Pillar = "prevention" | "detection" | "suppression";
export type Range = [number, number] | null;

export interface Environment {
  id: string;
  name: string;
  description: string;
  gravity_g: number;
  o2_pct: [number, number];
  pressure_psi: [number, number];
  ventilation_cm_s: [number, number];
  pillar_needs: Record<Pillar, number>;
  considerations: string[];
  sources: string[];
}

export interface Stats {
  n_tests: number;
  n_measured: number;
  condition_basis: Record<string, number>;
  o2_pct: Range;
  pressure_atm: Range;
  pressure_psi: Range;
  flow_cm_s: Range;
  fuels: string[];
  outcomes: Record<string, number>;
  varied: string[];
  fixed: string[];
}

export interface Finding {
  text: string;
  source: string;
  page?: number;
}

export interface InvestigationSummary {
  id: string;
  short: string;
  title: string;
  group: string;
  kind: "flight" | "ground";
  pillars: Record<Pillar, number>;
  relevance: string;
  material_realism: number;
  scale: number;
  fuels: string[];
  stats: Stats;
  summary?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface Publication {
  title: string;
  authors: string;
  doi: string;
}

export interface AISummary {
  plain_summary: string;
  fire_safety_takeaway: string;
  modeling_use: string;
  model: string;
}

export interface Investigation extends Omit<InvestigationSummary, "title" | "summary"> {
  sample: string;
  measurements: string[];
  key_findings: Finding[];
  earth_applications: string;
  psi: {
    title: string;
    acronym: string;
    doi: string;
    url: string;
    project_type: string;
    platform: string;
    hardware: string;
    sub_area: string;
    start: string;
    end: string;
    objective: string | null;
    approach: string | null;
    hypothesis: string | null;
    impacts: string | null;
    related: string[];
    publications: Publication[];
    license: string;
  };
  ai_summary?: AISummary | null;
}

export interface TestPoint {
  investigation: string;
  fuel?: string;
  fuel_phase: "solid" | "liquid" | "gas" | "aerosol";
  configuration?: string;
  o2_pct?: number;
  o2_basis: "ambient" | "oxidizer stream";
  pressure_atm?: number;
  flow_cm_s?: number;
  condition_basis: string;
  outcome?: string;
}

export type FactorKey = "atmosphere" | "pillars" | "realism" | "scale" | "airflow" | "data";
export type Weights = Record<FactorKey, number>;

export interface RankResult {
  id: string;
  short: string;
  group: string;
  kind: string;
  score: number;
  factors: Record<FactorKey, number>;
  tests_near_environment: number;
  reasons: string[];
}

export interface RankResponse {
  environment: string;
  weights: Weights;
  labels: Record<FactorKey, string>;
  results: RankResult[];
}

export interface Citation {
  investigation: string;
  short: string | null;
  source: string;
  page: number | null;
  excerpt: string;
}

export interface AskResponse {
  question: string;
  environment: string | null;
  answer: string;
  model: string | null;
  ai: boolean;
  citations: Citation[];
}

export interface CompareResponse {
  investigations: Investigation[];
  narrative: string | null;
  model: string | null;
  ai: boolean;
}

export interface Insights {
  incidents: {
    id: string; name: string; date: string | null; setting: string; what_happened: string;
    cause: string; lessons: string[]; research: string[]; connection: string; source: string;
  }[];
  myths: { myth: string; reality: string; source: string; research: string[] }[];
  spinoffs: { name: string; year: number | null; detail: string; source: string; research?: string[] }[];
  gaps: { title: string; detail: string; research: string[] }[];
}
