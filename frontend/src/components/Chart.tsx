import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import type { Data, Layout } from "plotly.js";
import { INK, SURFACE } from "../lib/chartTheme";

const Plot = createPlotlyComponent(Plotly);

const BASE_LAYOUT: Partial<Layout> = {
  paper_bgcolor: SURFACE,
  plot_bgcolor: SURFACE,
  font: { color: INK.secondary, family: "Inter, system-ui, sans-serif", size: 12 },
  margin: { l: 64, r: 24, t: 16, b: 56 },
  legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom", font: { size: 12, color: INK.primary }, bgcolor: "rgba(0,0,0,0)" },
  hoverlabel: { bgcolor: "#ffffff", bordercolor: INK.axis, font: { color: INK.primary, family: "Inter, sans-serif", size: 12 }, align: "left" },
  hovermode: "closest",
};

const AXIS = {
  gridcolor: INK.grid, zerolinecolor: INK.axis, linecolor: INK.axis, showline: true,
  tickfont: { family: "DM Mono, monospace", size: 11, color: INK.secondary },
  title: { font: { size: 12, color: INK.secondary } },
};

/** Plotly chart with SPARK's light editorial styling; pass only what differs per chart. */
export function Chart({ data, layout, height = 480 }: { data: Data[]; layout: Partial<Layout>; height?: number }) {
  return (
    <Plot
      data={data}
      layout={{
        ...BASE_LAYOUT,
        ...layout,
        height,
        xaxis: { ...AXIS, ...layout.xaxis, title: { ...AXIS.title, ...(layout.xaxis?.title as object) } },
        yaxis: { ...AXIS, ...layout.yaxis, title: { ...AXIS.title, ...(layout.yaxis?.title as object) } },
      }}
      config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"], toImageButtonOptions: { format: "png", scale: 2 } }}
      useResizeHandler
      style={{ width: "100%" }}
    />
  );
}

/** Color key with text in ink (never the series color) beside a swatch. */
export function Legend({ items }: { items: { label: string; color: string; shape?: "dot" | "bar" | "dash" }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {item.shape === "dash"
            ? <span className="inline-block h-3 w-5 border-2 border-dashed" style={{ borderColor: item.color }} />
            : <span className={item.shape === "bar" ? "inline-block h-3 w-3" : "inline-block h-2.5 w-2.5 rounded-full"} style={{ background: item.color }} />}
          {item.label}
        </span>
      ))}
    </div>
  );
}
