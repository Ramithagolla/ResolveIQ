import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Analysis, Incident, LearnResult, api, MemoryVersion } from "../api";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { HindsightRecall } from "../components/HindsightRecall";
import { WhyRecommendation } from "../components/WhyRecommendation";
import { AnalyzerWorkflowSteps } from "../components/AnalyzerWorkflowSteps";
import { MemoryLoop } from "../components/MemoryLoop";
import { Brain, CheckCircle2, Play, Sparkles, ShieldCheck, Clock, ExternalLink, XCircle, RefreshCw, AlertTriangle, Layers } from "lucide-react";

export default function IncidentDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [learn, setLearn] = useState<LearnResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionData, setCorrectionData] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"side_by_side" | "single">("side_by_side");

  const [form, setForm] = useState({
    root_cause: "",
    actual_resolution: "",
    resolution_notes: "",
    resolution_status: "Resolved",
  });

  const [correctionForm, setCorrectionForm] = useState({
    actual_root_cause: "Deployment configuration mismatch",
    actual_resolution: "Roll back deployment to previous release",
    engineer_note: "The DB pool was healthy. The deployment changed configuration X.",
  });

  async function load() {
    if (!id) return;
    try {
      const data = await api.incident(id);
      setIncident(data);
      if (data.analysis) {
        const ana = data.analysis as Analysis;
        setAnalysis(ana);
        setForm((prev) => ({
          ...prev,
          root_cause: prev.root_cause || ana.likely_root_cause || "",
          actual_resolution: prev.actual_resolution || ana.recommended_resolution || "",
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function runAnalyze() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.analyze(id);
      setIncident(result.incident);
      setAnalysis(result.analysis);
      setForm((prev) => ({
        ...prev,
        root_cause: prev.root_cause || result.analysis.likely_root_cause || "",
        actual_resolution: prev.actual_resolution || result.analysis.recommended_resolution || "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitCorrection(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.correctIncident(id, correctionForm);
      setIncident(res.incident);
      setCorrectionData(res.correction);
      setShowCorrectionForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correction failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.resolve(id, { ...form, recommendation_helped: true });
      setIncident(result.incident);
      setLearn(result.learn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  async function followUp() {
    const next = await api.followUp();
    navigate(`/incidents/${next.public_id}?demo=1`);
  }

  if (error && !incident) return <p className="text-rose-400 p-4">{error}</p>;
  if (!incident) return <p className="text-slate-500 p-4">Loading incident detail…</p>;

  const currentStep = learn || correctionData
    ? "memory"
    : incident.status === "resolved"
    ? "retain"
    : analysis
    ? "resolution"
    : "recall";

  const loopStepIndex = learn || correctionData || incident.status === "resolved"
    ? 6
    : analysis
    ? 3
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Demo guidance banner */}
      {params.get("demo") === "1" && (
        <div className="border border-teal-500/40 bg-gradient-to-r from-teal-950/40 via-ink-900 to-teal-950/40 rounded-xl p-4.5 text-sm text-teal-100 flex items-start gap-3 shadow-lg">
          <Sparkles size={20} className="text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">Interactive Hackathon Demo Sequence</div>
            <p className="text-xs text-teal-200/90 leading-relaxed">
              Step 1: Review incident details. Step 2 & 3: Run analysis with and without Hindsight memory.
              Step 4: Visually compare side-by-side. Step 5 & 6: Trigger Wrong Recall correction to prove real memory update!
            </p>
          </div>
        </div>
      )}

      {/* Header card with Source Attribution */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-white">{incident.public_id}</h1>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />

            {/* Source Attribution Badge (Requirement 1) */}
            {incident.source_url ? (
              <a
                href={incident.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium transition-colors"
              >
                <span>Source: {incident.organization || "Public"} Postmortem</span>
                <ExternalLink size={12} />
              </a>
            ) : incident.organization ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                Source: {incident.organization}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Service: <strong className="text-slate-200">{incident.service}</strong></span>
            <span>Env: <strong className="text-slate-200">{incident.environment}</strong></span>
            <span>Deploy: <strong className="text-slate-200">{incident.deployment}</strong></span>
            {incident.date && <span>Date: <strong className="text-slate-200">{incident.date}</strong></span>}
          </div>
        </div>

        {incident.status !== "resolved" && (
          <button
            onClick={runAnalyze}
            disabled={busy}
            className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors disabled:opacity-50 shadow-md"
          >
            <Brain size={16} />
            {busy ? "Analyzing & Recalling…" : "Analyze Incident & Recall Memory"}
          </button>
        )}
      </div>

      {error && <p className="text-rose-400 text-xs bg-rose-950/40 p-3 rounded-lg border border-rose-800">{error}</p>}

      {/* Stateful Memory Loop Visualizer */}
      <MemoryLoop currentStepIndex={loopStepIndex} />

      {/* Workflow Step Indicator */}
      <AnalyzerWorkflowSteps currentStep={currentStep} />

      {/* Incident details & timeline grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
              {incident.title || "Incident Signal Details"}
            </div>
            {incident.impact && (
              <span className="text-[11px] font-mono text-amber-400">Impact: {incident.impact}</span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-mono">Symptoms: </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {incident.symptoms.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-mono block mb-1">Logs & Context:</span>
              <pre className="bg-ink-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {incident.logs || "No log payload provided."}
              </pre>
            </div>
          </div>
        </section>

        <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md">
          <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-teal-400" />
            <span>INCIDENT TIMELINE</span>
          </div>
          <ol className="space-y-2 text-xs">
            {incident.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`} className="flex items-start gap-3 bg-ink-950 p-2 rounded-lg border border-slate-800/80">
                <span className="font-mono text-teal-400 shrink-0">{t.at}</span>
                <span className="text-slate-300">{t.label}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Side-by-Side Comparison & Analysis Output (Requirement 2 & 3) */}
      {analysis && (
        <div className="space-y-6">
          {/* View Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-teal-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">ANALYSIS & MEMORY IMPACT</h2>
            </div>

            <div className="flex items-center gap-1 bg-ink-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode("side_by_side")}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  viewMode === "side_by_side"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Side-by-Side Mode
              </button>
              <button
                onClick={() => setViewMode("single")}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  viewMode === "single"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Single View
              </button>
            </div>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          {viewMode === "side_by_side" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MODE A — WITHOUT MEMORY */}
              <div className="p-5 rounded-xl bg-ink-900 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="font-bold text-slate-200 text-sm">WITHOUT MEMORY</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    Current Incident Only
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Likely Root Cause</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-slate-200 border border-slate-800 font-mono leading-relaxed">
                      {analysis.mode_without_memory?.likely_root_cause || analysis.likely_root_cause}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Recommended Fix</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-slate-300 border border-slate-800 leading-relaxed">
                      {analysis.mode_without_memory?.recommended_resolution || analysis.recommended_resolution}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold mb-1">Evidence Base</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-slate-400 border border-slate-800">
                      Current incident symptoms & logs only (0 historical memories used)
                    </div>
                  </div>
                </div>
              </div>

              {/* MODE B — WITH HINDSIGHT MEMORY */}
              <div className="p-5 rounded-xl bg-ink-900 border border-teal-500/40 bg-teal-500/5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-teal-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-teal-400" />
                    <span className="font-bold text-teal-300 text-sm">WITH HINDSIGHT MEMORY</span>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                    Recalled Experiences
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Likely Root Cause</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-white border border-teal-500/30 font-mono leading-relaxed">
                      {analysis.mode_with_memory?.likely_root_cause || analysis.likely_root_cause}
                    </div>
                  </div>

                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Recommended Fix</div>
                    <div className="p-3 rounded-lg bg-ink-950 text-teal-200 border border-teal-500/30 leading-relaxed">
                      {analysis.mode_with_memory?.recommended_resolution || analysis.recommended_resolution}
                    </div>
                  </div>

                  <div>
                    <div className="text-teal-400 font-semibold mb-1">Historical Evidence ({analysis.recalled_memories.length})</div>
                    <div className="space-y-2">
                      {analysis.recalled_memories.map((mem) => (
                        <div key={mem.incident_id || Math.random()} className="p-2.5 rounded-lg bg-ink-950 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-teal-300">{mem.incident_id}</span>
                            <span className="text-[10px] font-mono text-slate-400">{mem.relevance_label}</span>
                          </div>
                          {mem.organization && (
                            <div className="text-[10px] text-slate-400">Source: {mem.organization} Postmortem</div>
                          )}
                          <div className="text-slate-300">{mem.root_cause}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WHAT MEMORY CONTRIBUTED */}
          <div className="p-5 rounded-xl bg-ink-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-400" />
              <span>WHAT MEMORY CONTRIBUTED</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {(
                analysis.what_memory_contributed || [
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

          <HindsightRecall
            memories={analysis.recalled_memories}
            available={analysis.memory_available}
            error={analysis.memory_error}
          />

          <WhyRecommendation bullets={analysis.why_this_recommendation} memories={analysis.recalled_memories} />
        </div>
      )}

      {/* Engineer Feedback & Human Correction Workflow (Requirement 5 & 6) */}
      {analysis && incident.status !== "resolved" && !correctionData && (
        <div className="border border-slate-800 rounded-xl p-6 bg-ink-900 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">ENGINEER FEEDBACK</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Step 5: Wrong Recall & Human Correction</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-ink-950 border border-slate-800 space-y-1">
              <div className="text-slate-400 font-semibold">AI Predicted Root Cause</div>
              <div className="text-white font-mono">{analysis.likely_root_cause}</div>
            </div>

            {!showCorrectionForm ? (
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <div className="text-slate-300 font-medium">Was this root cause correct?</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setForm((prev) => ({ ...prev, root_cause: analysis.likely_root_cause }));
                    }}
                    className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg font-bold text-xs transition-colors"
                  >
                    [ YES ]
                  </button>
                  <button
                    onClick={() => setShowCorrectionForm(true)}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-xs transition-colors"
                  >
                    [ NO — CORRECT IT ]
                  </button>
                </div>
              </div>
            ) : (
              /* Correction Form */
              <form onSubmit={onSubmitCorrection} className="p-4 rounded-xl bg-ink-950 border border-rose-500/30 space-y-4 pt-4">
                <div className="text-rose-300 font-bold text-xs uppercase tracking-wider">
                  CORRECT ROOT CAUSE & RESOLUTION
                </div>

                <div className="space-y-3 font-mono">
                  <label className="block text-slate-400 text-xs">
                    ACTUAL ROOT CAUSE
                    <input
                      className="mt-1 w-full bg-ink-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-sans focus:border-rose-500 outline-none"
                      value={correctionForm.actual_root_cause}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, actual_root_cause: e.target.value })}
                      required
                    />
                  </label>

                  <label className="block text-slate-400 text-xs">
                    ACTUAL RESOLUTION
                    <input
                      className="mt-1 w-full bg-ink-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-sans focus:border-rose-500 outline-none"
                      value={correctionForm.actual_resolution}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, actual_resolution: e.target.value })}
                      required
                    />
                  </label>

                  <label className="block text-slate-400 text-xs">
                    ENGINEER NOTE
                    <textarea
                      className="mt-1 w-full bg-ink-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-sans focus:border-rose-500 outline-none min-h-16"
                      value={correctionForm.engineer_note}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, engineer_note: e.target.value })}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionForm(false)}
                    className="px-3 py-2 text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busy}
                    className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
                  >
                    {busy ? "Updating Memory…" : "[ SUBMIT CORRECTION ]"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* State Transition Confirmation Box after Correction (Requirement 5 & 6) */}
      {correctionData && (
        <div className="border border-emerald-500/40 bg-emerald-500/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 size={18} />
            <span>MEMORY CORRECTION CONFIRMED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-ink-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Previous Belief</span>
              <span className="text-rose-300 font-semibold">{String(correctionData.previous_belief)}</span>
            </div>

            <div className="p-3 rounded-lg bg-ink-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Engineer Correction</span>
              <span className="text-emerald-300 font-semibold">{String(correctionData.engineer_correction)}</span>
            </div>

            <div className="p-3 rounded-lg bg-ink-950 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">New Resolution</span>
              <span className="text-teal-300 font-semibold">{String(correctionData.new_resolution)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 flex items-center gap-2 pt-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Updating organizational memory… ✓ Correction retained in Hindsight memory bank</span>
          </div>

          {/* Test Future Incident Button */}
          <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-300">
              Step 7: Run a second similar incident to prove the corrected experience is recalled.
            </span>
            <button
              onClick={followUp}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-extrabold px-5 py-2.5 rounded-lg text-xs transition-colors shadow-lg"
            >
              <Play size={14} fill="currentColor" />
              [ TEST FUTURE SIMILAR INCIDENT ]
            </button>
          </div>
        </div>
      )}

      {/* Memory Version History (Requirement 7) */}
      {incident.correction_history && incident.correction_history.length > 0 && (
        <div className="border border-slate-800 rounded-xl p-6 bg-ink-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw size={16} className="text-teal-400" />
              <span>MEMORY VERSION & CORRECTION HISTORY</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Defensible State History ({incident.correction_history.length} Versions)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {incident.correction_history.map((ver: MemoryVersion, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  ver.version === 1
                    ? "bg-slate-950 border-slate-800"
                    : "bg-ink-950 border-teal-500/40 bg-teal-500/5"
                } space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-400">Version {ver.version}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      ver.status.includes("Corrected")
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {ver.status}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-mono">Hypothesis / Root Cause: </span>
                  <span className="text-white font-medium">{ver.hypothesis_or_root_cause}</span>
                </div>

                {ver.resolution && (
                  <div>
                    <span className="text-slate-400 font-mono">Resolution: </span>
                    <span className="text-teal-200">{ver.resolution}</span>
                  </div>
                )}

                {ver.corrected_by && (
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    Recorded by: {ver.corrected_by} • {ver.created_at}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Resolution workflow form if not resolved */}
      {incident.status !== "resolved" && !correctionData && (
        <form onSubmit={onResolve} className="border border-teal-500/30 rounded-xl p-6 bg-ink-900 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-teal-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">RESOLVE INCIDENT & RETAIN MEMORY</h3>
            </div>
            <span className="text-[11px] font-mono text-teal-400">Confirm Fix → Retain in Hindsight</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
            <label className="block text-slate-400 uppercase">
              Root Cause
              <input
                className="mt-1 w-full bg-ink-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-sans focus:border-teal-500 outline-none"
                placeholder="e.g. Database connection pool exhaustion"
                value={form.root_cause}
                onChange={(e) => setForm({ ...form, root_cause: e.target.value })}
                required
              />
            </label>

            <label className="block text-slate-400 uppercase">
              Actual Resolution Applied
              <input
                className="mt-1 w-full bg-ink-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-sans focus:border-teal-500 outline-none"
                placeholder="e.g. Increase connection pool from 50 to 100"
                value={form.actual_resolution}
                onChange={(e) => setForm({ ...form, actual_resolution: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              disabled={busy}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-lg"
            >
              <ShieldCheck size={16} />
              {busy ? "Retaining Memory in Hindsight…" : "CONFIRM RESOLUTION & RETAIN MEMORY"}
            </button>
          </div>
        </form>
      )}

      {incident.memory_retained && (
        <div className="pt-2">
          <Link to={`/memory/${incident.public_id}`} className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-mono">
            View Retained Memory Payload in Catalog →
          </Link>
        </div>
      )}
    </div>
  );
}
