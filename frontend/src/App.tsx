import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Ask } from "./pages/Ask";
import { Compare } from "./pages/Compare";
import { Conditions } from "./pages/Conditions";
import { Explorer } from "./pages/Explorer";
import { Insights } from "./pages/Insights";
import { InvestigationDetail } from "./pages/InvestigationDetail";
import { Mission } from "./pages/Mission";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Mission />} />
          <Route path="conditions" element={<Conditions />} />
          <Route path="investigations" element={<Explorer />} />
          <Route path="investigations/:id" element={<InvestigationDetail />} />
          <Route path="compare" element={<Compare />} />
          <Route path="ask" element={<Ask />} />
          <Route path="insights" element={<Insights />} />
          <Route path="*" element={<Mission />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
