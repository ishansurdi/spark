import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import type { Data, Layout } from "plotly.js";

const Plot = createPlotlyComponent(Plotly);

const BASE_LAYOUT: Partial<Layout> = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(255,255,255,0.02)",
  font: { color: "#cbd5e1", family: "Inter, system-ui, sans-serif", size: 12 },
  margin: { l: 60, r: 20, t: 20, b: 55 },
  legend: { orientation: "h", y: -0.22, font: { size: 11 } },
  hoverlabel: { bgcolor: "#0f172a", bordercolor: "#f97316" },
};

const AXIS = { gridcolor: "rgba(255,255,255,0.07)", zerolinecolor: "rgba(255,255,255,0.1)" };

/** Plotly chart with SPARK's dark styling; pass only what differs per chart. */
export function Chart({ data, layout, height = 480 }: { data: Data[]; layout: Partial<Layout>; height?: number }) {
  return (
    <Plot
      data={data}
      layout={{
        ...BASE_LAYOUT,
        ...layout,
        height,
        xaxis: { ...AXIS, ...layout.xaxis },
        yaxis: { ...AXIS, ...layout.yaxis },
      }}
      config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
      useResizeHandler
      style={{ width: "100%" }}
    />
  );
}
