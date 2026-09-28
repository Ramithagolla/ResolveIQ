import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Analysis, Incident } from "../api";
import { BeforeAfter } from "../components/BeforeAfter";
import { HindsightRecall } from "../components/HindsightRecall";
import { WhyRecommendation } from "../components/WhyRecommendation";
import { AnalyzerWorkflowSteps } from "../components/AnalyzerWorkflowSteps";
import { Activity, Brain, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

const defaults = {
  service: "Payment API",
  severity: "SEV-1",
  environment: "Production",
  deployment: "payment-v2.4.2",
  error: "Connection timeout",
  logs: "Payment requests timing out.\nDatabase connections unavailable.\nHigh number of waiting requests.",
};

export default function Analyzer() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const emptyLogs = useMemo(() => !form.logs.trim(), [form.logs]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createIncident(form);
      const result = await api.analyze(created.public_id);
      setIncident(result.incident);
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Incident Analyzer</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Ingest current error logs, trigger Hindsight memory recall, and generate evidence-backed recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Step workflow indicator */}
      <AnalyzerWorkflowSteps currentStep={analysis ? "why" : "recall"} />

      <form onSubmit={onSubmit} className="border border-slate-800 rounded-xl p-6 bg-ink-900 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Ingest Incident Details
          </span>
          <span className="text-[11px] font-mono text-teal-400">Step 1: Current Signals</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {(["service", "severity", "environment", "deployment", "error"] as const).map((key) => (
            <label key={key} className="text-xs font-mono text-slate-400 uppercase tracking-wide">
              {key}
              {key === "severity" ? (
                <select
                  className="mt-1 w-full bg-ink-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-sans focus:border-teal-500 outline-none"
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                >
                  {["SEV-1", "SEV-2", "SEV-3", "SEV-4"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="mt-1 w-full bg-ink-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-sans focus:border-teal-500 outline-none"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                />
              )}
            </label>
          ))}

          <label className="text-xs font-mono text-slate-400 uppercase tracking-wide md:col-span-2">
            System Error Logs
            <textarea
              className="mt-1 w-full bg-ink-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono min-h-28 focus:border-teal-500 outline-none"
              value={form.logs}
              onChange={(e) => setForm({ ...form, logs: e.target.value })}
            />
            {emptyLogs && (
              <span className="text-amber-400 text-xs normal-case mt-1 block">
                Logs are empty — analysis will rely on service and error signature only.
              </span>
            )}
          </label>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            disabled={busy}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-md"
          >
            <Brain size={16} />
            {busy ? "Querying Hindsight Memory…" : "Analyze Incident & Recall Memory"}
          </button>
          <span className="text-xs text-slate-500 hidden sm:inline font-mono">
            Hindsight bank: resolveiq-incidents
          </span>
        </div>
      </form>

      {error && <p className="text-rose-400 text-sm bg-rose-950/40 p-3 rounded-lg border border-rose-800">{error}</p>}

      {analysis && incident && (
        <div className="space-y-6">
          {/* Step Sequence visualization */}
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 text-xs text-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-400" />
              <span>
                Incident <strong>{incident.public_id}</strong> analyzed. Hindsight returned{" "}
                <strong>{analysis.memory_count} memories</strong>.
              </span>
            </div>
            <button
              onClick={() => navigate(`/incidents/${incident.public_id}`)}
              className="px-3 py-1.5 rounded-lg bg-teal-500 text-ink-950 font-semibold hover:bg-teal-400 transition-colors"
            >
              Proceed to Resolution & Retain →
            </button>
          </div>

          {/* Root cause analysis overview */}
          <section className="border border-slate-800 rounded-xl p-6 bg-ink-900 shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-teal-400 mb-4 border-b border-slate-800 pb-2">
              <span>INCIDENT ANALYSIS · {incident.public_id}</span>
              <span className="px-2 py-0.5 rounded bg-ink-950 text-slate-300 border border-slate-800">
                Mode: {analysis.analyzer_mode}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase font-mono">Likely Root Cause</div>
                <div className="text-lg font-bold text-white leading-snug">{analysis.likely_root_cause}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase font-mono">Confidence Level</div>
                <div className="text-lg font-bold text-teal-300">{analysis.confidence}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase font-mono">Recommended Investigation</div>
                <p className="text-slate-200 bg-ink-950 p-3 rounded-lg border border-slate-800">
                  {analysis.recommended_investigation}
                </p>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase font-mono">Recommended Resolution</div>
                <p className="text-slate-200 bg-ink-950 p-3 rounded-lg border border-slate-800">
                  {analysis.recommended_resolution}
                </p>
              </div>
            </div>
          </section>

          {/* Before vs After Hindsight comparison */}
          <BeforeAfter analysis={analysis} />

          {/* Hindsight Recall Block */}
          <HindsightRecall
            memories={analysis.recalled_memories}
            available={analysis.memory_available}
            error={analysis.memory_error}
          />

          {/* Evidence Comparison Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md">
              <div className="text-[11px] font-mono tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Activity size={14} className="text-amber-400" />
                <span>CURRENT EVIDENCE</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-200">
                {analysis.current_evidence.map((e) => (
                  <li key={e} className="flex items-start gap-2 bg-ink-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md">
              <div className="text-[11px] font-mono tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Brain size={14} className="text-teal-400" />
                <span>HISTORICAL EVIDENCE</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-200">
                {analysis.historical_evidence.length === 0 && (
                  <li className="text-slate-500 italic p-3 bg-ink-950 rounded-lg border border-slate-800">
                    No historical memories found for this error signature.
                  </li>
                )}
                {analysis.historical_evidence.map((e) => (
                  <li key={e} className="flex items-start gap-2 bg-ink-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Why This Recommendation */}
          <WhyRecommendation bullets={analysis.why_this_recommendation} memories={analysis.recalled_memories} />

          {/* Navigate to detail for Resolution & Retain */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigate(`/incidents/${incident.public_id}`)}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg"
            >
              <CheckCircle2 size={16} />
              Open Incident Detail & Confirm Resolution →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
