import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Analyzer from "./pages/Analyzer";
import Dashboard from "./pages/Dashboard";
import IncidentDetail from "./pages/IncidentDetail";
import MemoryDetail from "./pages/MemoryDetail";
import MemoryExplorer from "./pages/MemoryExplorer";
import Patterns from "./pages/Patterns";
import Evaluation from "./pages/Evaluation";
import Sources from "./pages/Sources";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analyze" element={<Analyzer />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/memory" element={<MemoryExplorer />} />
        <Route path="/memory/:id" element={<MemoryDetail />} />
        <Route path="/patterns" element={<Patterns />} />
      </Route>
    </Routes>
  );
}
