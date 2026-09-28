import { Brain, AlertTriangle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RecalledMemory } from "../api";

interface Props {
  memories: RecalledMemory[];
  available: boolean;
  provider?: string;
  error?: string | null;
}

export function HindsightRecall({ memories, available, provider, error }: Props) {
  const navigate = useNavigate();
  const isLocal = provider === "local-demo";

  if (!available) {
    return (
      <section className="border border-amber-500/30 rounded-xl p-5 bg-amber-500/5">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-amber-400 mb-3">
          <AlertTriangle size={14} />
          <span>HINDSIGHT RECALL</span>
        </div>
        <p className="text-amber-200 font-semibold">Hindsight Memory Service Unavailable</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Historical organizational memory cannot currently be recalled. The incident can still be analyzed
          using current evidence only.
        </p>
        {error && (
          <details className="mt-3">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
              Technical details
            </summary>
            <p className="text-xs text-slate-500 mt-1 font-mono">{error}</p>
          </details>
        )}
      </section>
    );
  }

  return (
    <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-teal-400">
          <Brain size={14} />
          <span>HINDSIGHT RECALL</span>
        </div>
        <div className="flex items-center gap-2">
          {isLocal && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              LOCAL STORE
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono">
            {memories.length === 0
              ? "No memories found"
              : `${memories.length} relevant ${memories.length === 1 ? "memory" : "memories"} found`}
          </span>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="text-sm text-slate-500 italic py-4 text-center border border-slate-800 rounded-lg bg-ink-950">
          No relevant historical memory found for this incident pattern.
          {isLocal && (
            <p className="text-xs text-amber-400/70 mt-1 not-italic">
              Local store requires prior incidents to have been resolved and retained.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {memories.slice(0, 5).map((m, idx) => (
            <div
              key={`${m.incident_id}-${idx}`}
              className="border border-slate-800 hover:border-teal-500/40 rounded-lg p-4 transition-colors bg-ink-950 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-teal-300">
                      {m.incident_id || "unlinked memory"}
                    </span>
                    {m.incident_id && m.incident_id !== "INC-1042" && !m.source_url && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        RECENTLY LEARNED MEMORY ✓
                      </span>
                    )}
                    {m.service && (
                      <span className="text-[11px] font-mono text-slate-500">· {m.service}</span>
                    )}
                  </div>
                  {m.root_cause && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-snug">{m.root_cause}</p>
                  )}
                  {m.resolution && (
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      <span className="text-teal-500">Resolution:</span> {m.resolution}
                    </p>
                  )}
                  {m.outcome && (
                    <p className="text-xs text-slate-500 mt-0.5">{m.outcome}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-mono text-teal-300 font-semibold">
                    {isLocal ? `${m.relevance}% match` : (m.relevance_label || "Retrieved by Hindsight")}
                  </span>
                  {m.incident_id && (
                    <button
                      onClick={() => navigate(`/memory/${m.incident_id}`)}
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-teal-400 transition-colors"
                    >
                      <ExternalLink size={11} />
                      View Memory
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
