/**
 * Chart color roles (reference data-viz palette, validated with validate_palette.js):
 *  - SERIES: categorical slots in fixed order. Slots 1-6 pass adjacent-pair checks (stacked bars);
 *    scatter plots use at most the first 3 slots (they pass all-pairs checks).
 *  - SEQUENTIAL: one blue hue, light -> dark, for counts (heatmap).
 *  Slots 3-5 are below 3:1 contrast on the light surface, so charts using them ship
 *  legends, hover labels and a table view.
 */
export const SURFACE = "#fcfcfb";
export const INK = { primary: "#0b0b0b", secondary: "#52514e", muted: "#8a8984", grid: "#ebeae6", axis: "#c9c8c3" };

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const OTHER = "#c9c8c3"; // de-emphasised marks ("all other investigations")

export const SEQUENTIAL: [number, string][] = [
  [0, "#f4f8fd"], [0.15, "#cde2fb"], [0.3, "#9ec5f4"], [0.45, "#6da7ec"],
  [0.6, "#3987e5"], [0.75, "#256abf"], [0.9, "#184f95"], [1, "#0d366b"],
];

/** Fuel phase = the 3-slot scatter palette (validated all-pairs). */
export const PHASE_COLOR: Record<string, string> = { liquid: SERIES[0], solid: SERIES[1], gas: SERIES[2], aerosol: OTHER };
export const PHASE_LABEL: Record<string, string> = { solid: "Solid materials", liquid: "Liquid fuels", gas: "Gaseous fuels", aerosol: "Aerosol" };
