import { Brain, Cpu, Database, CheckCircle2, Play, Search, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";

export function HindsightStatusCard({
  health,
  memoryCount,
}: {
  health: { memory_provider: string; memory_available: boolean; memory_error?: string | null } | null;
  memoryCount: number;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launchDemo() {
    setBusy(true);
    setError(null);
    try {
      const demo = await api.launchDemo();
      navigate(`/incidents/${demo.new_incident.public_id}?demo=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo launch failed");
    } finally {
      setBusy(false);
    }
  }

  const isHindsightCloud = health?.memory_provider === "hindsight";
  const isLocal = health?.memory_provider === "local-demo";

  return (
    <section className="border border-slate-800 rounded-xl p-6 bg-gradient-to-br from-ink-900 via-ink-900 to-teal-950/30 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <Brain size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Hindsight Incident Memory Engine</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Bank: resolveiq-incidents
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized organizational memory system isolate in <code className="text-teal-300">hindsight_service.py</code>
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-ink-950/70 p-3 rounded-lg border border-slate-800">
            <span className="text-teal-400 font-semibold">Engine Mission:</span> Retain structured incident history
            (symptoms, root causes, successful resolutions, logs) to eliminate duplicate resolution time on recurring failures.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Database size={14} className="text-teal-400" />
              <span>Memories Retained: <strong className="text-white">{memoryCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu size={14} className="text-sky-400" />
              <span>Recall Budget: <strong className="text-white">High (4096 tokens)</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-56 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase text-slate-400">Memory Provider Status</div>
            <div className="flex items-center gap-2">
              {health?.memory_available ? (
                <CheckCircle2 size={16} className="text-teal-400" />
              ) : (
                <AlertCircle size={16} className="text-amber-400" />
              )}
              <span className="text-sm font-semibold text-white">
                {isHindsightCloud ? "Hindsight Cloud Engine" : isLocal ? "Local Development Store" : "Unavailable"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isHindsightCloud
                ? "Connected to Hindsight SDK endpoint with active memory recall."
                : isLocal
                ? "Running local dev fallback index (MEMORY_PROVIDER=local)."
                : health?.memory_error || "Memory service unreachable."}
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={launchDemo}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-medium rounded-lg py-2 text-xs transition-colors disabled:opacity-50 shadow-md"
            >
              <Play size={14} fill="currentColor" />
              {busy ? "Launching Scenario…" : "Launch Interactive Demo Mode"}
            </button>

            <Link
              to="/memory"
              className="w-full flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 bg-ink-950 text-slate-300 rounded-lg py-2 text-xs transition-colors"
            >
              <Search size={14} />
              Explore Memory Catalog
            </Link>
          </div>
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>
      </div>
    </section>
  );
}
