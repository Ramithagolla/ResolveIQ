import { useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Layers,
  FileText,
  Search,
} from "lucide-react";
import { api, EvaluationSummary, HeldOutEvalItem, Incident } from "../api";

export default function Evaluation() {
  const [evalData, setEvalData] = useState<EvaluationSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [evidenceModalItem, setEvidenceModalItem] = useState<HeldOutEvalItem | null>(null);

  useEffect(() => {
    Promise.all([api.getEvaluation(), api.incidents()])
      .then(([ev, incs]) => {
        setEvalData(ev);
        setIncidents(incs);
        if (incs.length > 0) {
          setSelectedIncidentId(incs[0].public_id);
          setActiveIncident(incs[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleAnalyzeSingle(id: string) {
    setAnalyzing(true);
    try {
      const res = await api.analyze(id);
      setActiveIncident(res.incident);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <div className="flex items-center gap-2">
          <Brain className="animate-spin text-teal-400" size={20} />
          <span>Running Held-Out Memory Impact Evaluation…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Experimental Evaluation Framework</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-1 tracking-tight">EXPERIMENTAL MEMORY EVALUATION</h1>
        <p className="text-sm text-slate-300 mt-1 font-medium italic">
          "Does organizational memory actually improve incident resolution?"
        </p>
        <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
          <span className="font-semibold text-amber-300">Experimental Evaluation:</span>{" "}
          This evaluation measures whether relevant historical incident memories are surfaced for a predefined
          set of incident patterns. Results are application-level evaluation only and are not a benchmark of
          Hindsight retrieval quality. Accuracy numbers reflect matches on this local demo dataset.
        </div>
      </div>

      {/* KPI Cards */}
      {evalData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-ink-900 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 font-medium">Held-Out Test Set</div>
            <div className="text-2xl font-bold text-white">{evalData.held_out_count} Incidents</div>
            <div className="text-[11px] text-slate-500">Unseen by Hindsight</div>
          </div>

          <div className="p-4 rounded-xl bg-ink-900 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 font-medium">Without Memory</div>
            <div className="text-2xl font-bold text-slate-300">
              {evalData.without_memory_correct_count} / {evalData.held_out_count}
              <span className="text-xs font-normal text-slate-500 ml-1.5">
                ({evalData.accuracy_without_memory_percent}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">Current incident context only</div>
          </div>

          <div className="p-4 rounded-xl bg-ink-900 border border-teal-500/40 bg-teal-500/5 space-y-1">
            <div className="text-xs text-teal-400 font-medium">With Hindsight Memory</div>
            <div className="text-2xl font-bold text-teal-300">
              {evalData.with_memory_correct_count} / {evalData.held_out_count}
              <span className="text-xs font-normal text-teal-400/80 ml-1.5">
                ({evalData.accuracy_with_memory_percent}%)
              </span>
            </div>
            <div className="text-[11px] text-teal-400/70">Recall assisted</div>
          </div>

          <div className="p-4 rounded-xl bg-ink-900 border border-emerald-500/40 bg-emerald-500/5 space-y-1">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp size={14} />
              <span>Net Improvement</span>
            </div>
            <div className="text-2xl font-bold text-emerald-300">
              +{evalData.improvement_count} Incidents
            </div>
            <div className="text-[11px] text-emerald-400/70">Ground truth matches</div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      {evalData && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
          <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">Evaluation Methodology & Wording</div>
            <p className="text-slate-400 leading-relaxed font-mono">
              On our {evalData.held_out_count}-incident held-out evaluation set, the memory-assisted configuration identified the documented root cause in {evalData.with_memory_correct_count} cases, compared with {evalData.without_memory_correct_count} without historical memory.
            </p>
            <p className="text-slate-500 text-[11px] italic mt-1">{evalData.disclaimer}</p>
          </div>
        </div>
      )}

      {/* Held-Out Evaluation Table */}
      {evalData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-teal-400" />
              <span>Held-Out Evaluation Results Table</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Deterministic Root Cause Suggestion Accuracy
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-ink-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-950 text-slate-400 font-mono border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Incident / Source</th>
                  <th className="px-4 py-3">Ground Truth Root Cause</th>
                  <th className="px-4 py-3">Without Memory</th>
                  <th className="px-4 py-3">With Hindsight Memory</th>
                  <th className="px-4 py-3 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {evalData.items.map((item) => (
                  <tr key={item.incident_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono">
                      <div className="font-bold text-white">{item.incident_id}</div>
                      <div className="text-[11px] text-teal-400/90">{item.organization}</div>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 mt-0.5"
                        >
                          <span>Source Postmortem</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-medium text-slate-200">{item.ground_truth_root_cause}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.title}</div>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        {item.without_memory_correct ? (
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-rose-400 shrink-0" />
                        )}
                        <span className={item.without_memory_correct ? "text-emerald-300" : "text-slate-400"}>
                          {item.without_memory_prediction}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        {item.with_memory_correct ? (
                          <CheckCircle2 size={14} className="text-teal-400 shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-rose-400 shrink-0" />
                        )}
                        <span className={item.with_memory_correct ? "text-teal-300 font-medium" : "text-slate-400"}>
                          {item.with_memory_prediction}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setEvidenceModalItem(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-medium transition-colors"
                      >
                        [VIEW EVIDENCE]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix */}
      <div className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-teal-400 uppercase">Side-by-Side Mode Comparison</div>
            <h2 className="text-xl font-bold text-white mt-0.5">WITHOUT MEMORY vs WITH MEMORY</h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedIncidentId}
              onChange={(e) => {
                setSelectedIncidentId(e.target.value);
                const found = incidents.find((i) => i.public_id === e.target.value);
                if (found) setActiveIncident(found);
              }}
              className="bg-ink-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 font-mono"
            >
              {incidents.map((inc) => (
                <option key={inc.public_id} value={inc.public_id}>
                  {inc.public_id} — {inc.service} ({inc.organization || "Real Data"})
                </option>
              ))}
            </select>

            <button
              onClick={() => handleAnalyzeSingle(selectedIncidentId)}
              disabled={analyzing}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <Brain size={14} />
              {analyzing ? "Analyzing…" : "Run Dual Analysis"}
            </button>
          </div>
        </div>

        {activeIncident && activeIncident.analysis && (
          <div className="space-y-6">
            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MODE A — WITHOUT MEMORY */}
              <div className="p-5 rounded-xl bg-ink-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="font-bold text-slate-300 text-sm">WITHOUT MEMORY</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    Current Incident Only
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Likely Root Cause</div>
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 leading-relaxed font-mono">
                      {activeIncident.analysis.mode_without_memory?.likely_root_cause ||
                        activeIncident.analysis.likely_root_cause}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Recommended Fix</div>
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 leading-relaxed">
                      {activeIncident.analysis.mode_without_memory?.recommended_resolution ||
                        activeIncident.analysis.recommended_resolution}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Evidence Base</div>
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">
                      Current incident symptoms & logs only (0 historical memories used)
                    </div>
                  </div>
                </div>
              </div>

              {/* MODE B — WITH HINDSIGHT MEMORY */}
              <div className="p-5 rounded-xl bg-ink-900 border border-teal-500/40 bg-teal-500/5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-teal-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-teal-400" />
                    <span className="font-bold text-teal-300 text-sm">WITH HINDSIGHT MEMORY</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                    Recalled Historical Experiences
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Likely Root Cause</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-white border border-teal-500/30 leading-relaxed font-mono">
                      {activeIncident.analysis.mode_with_memory?.likely_root_cause ||
                        activeIncident.analysis.likely_root_cause}
                    </div>
                  </div>

                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Recommended Fix</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-teal-200 border border-teal-500/30 leading-relaxed">
                      {activeIncident.analysis.mode_with_memory?.recommended_resolution ||
                        activeIncident.analysis.recommended_resolution}
                    </div>
                  </div>

                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Historical Evidence</div>
                    <div className="space-y-2">
                      {activeIncident.analysis.recalled_memories.map((mem) => (
                        <div
                          key={mem.incident_id || Math.random()}
                          className="p-3 rounded-lg bg-ink-950 border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-teal-300">{mem.incident_id}</span>
                            <span className="text-[10px] font-mono text-slate-400">{mem.relevance_label}</span>
                          </div>
                          {mem.organization && (
                            <div className="text-[11px] text-slate-400">Source: {mem.organization} Postmortem</div>
                          )}
                          <div className="text-slate-300">{mem.root_cause}</div>
                          {mem.source_url && (
                            <a
                              href={mem.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-teal-400 hover:underline pt-0.5"
                            >
                              <span>Inspect Source</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WHAT MEMORY CONTRIBUTED */}
            <div className="p-5 rounded-xl bg-ink-900 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-400" />
                <span>WHAT MEMORY CONTRIBUTED</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {(
                  activeIncident.analysis.what_memory_contributed || [
                    "Historical incident evidence",
                    "Previous root-cause pattern",
                    "Previous successful resolution",
                    "Organizational context",
                  ]
                ).map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-ink-950 border border-slate-800 flex items-center gap-2 text-slate-300">
                    <span className="text-teal-400 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evidence Inspection Modal */}
      {evidenceModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-teal-400 uppercase">Evidence Traceability</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {evidenceModalItem.incident_id} — {evidenceModalItem.organization}
                </h3>
              </div>
              <button
                onClick={() => setEvidenceModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-ink-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold">Documented Ground Truth Root Cause</div>
                <div className="text-slate-200 font-mono">{evidenceModalItem.ground_truth_root_cause}</div>
              </div>

              <div>
                <div className="text-slate-400 font-semibold mb-2">
                  Recalled Memories Influencing Recommendation ({evidenceModalItem.recalled_memories.length})
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {evidenceModalItem.recalled_memories.map((mem) => (
                    <div
                      key={mem.incident_id || Math.random()}
                      className="p-3.5 rounded-lg bg-ink-950 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-teal-300">{mem.incident_id}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {mem.relevance_label || "Retrieved by Hindsight"}
                        </span>
                      </div>

                      {mem.organization && (
                        <div className="text-[11px] text-slate-400">Source: {mem.organization} Postmortem</div>
                      )}

                      <div className="text-slate-300 leading-relaxed font-mono text-[11px]">
                        <span className="text-teal-400 font-semibold">Root Cause:</span> {mem.root_cause}
                      </div>

                      {mem.resolution && (
                        <div className="text-slate-300 leading-relaxed text-[11px]">
                          <span className="text-emerald-400 font-semibold">Resolution:</span> {mem.resolution}
                        </div>
                      )}

                      {mem.source_url && (
                        <a
                          href={mem.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:underline pt-1"
                        >
                          <span>Click to inspect original postmortem source</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setEvidenceModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
