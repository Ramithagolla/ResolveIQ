import { Activity, Brain, ExternalLink, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Analysis, RecalledMemory } from "../api";

interface Props {
  bullets: string[];
  memories: RecalledMemory[];
  analysis?: Analysis | null;
}

export function WhyRecommendation({ bullets, memories, analysis }: Props) {
  const navigate = useNavigate();
  const currentEvidence = analysis?.current_evidence ?? [];
  const historicalEvidence = analysis?.historical_evidence ?? [];
  const withMemorySummary = analysis?.with_memory_summary ?? "";
  const withoutMemorySummary = analysis?.without_memory_summary ?? "";
  const hasMemory = memories.length > 0;

  return (
    <section className="border border-slate-800 rounded-xl p-6 bg-ink-900 shadow-md space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <HelpCircle size={15} className="text-slate-400" />
        <span className="text-[11px] tracking-widest text-slate-300 font-semibold uppercase">
          Why This Recommendation?
        </span>
      </div>

      {/* Current vs Historical two-panel */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current Evidence */}
        <div className="border border-slate-800 rounded-lg p-4 bg-ink-950 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-amber-400">
            <Activity size={13} />
            <span>CURRENT INCIDENT EVIDENCE</span>
          </div>
          {currentEvidence.length > 0 ? (
            <ul className="space-y-1.5">
              {currentEvidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No current evidence listed.</p>
          )}
          {withoutMemorySummary && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-2 mt-2 leading-relaxed italic">
              {withoutMemorySummary}
            </p>
          )}
        </div>

        {/* Historical Evidence */}
        <div
          className={`border rounded-lg p-4 bg-ink-950 space-y-3 ${
            hasMemory ? "border-teal-500/30" : "border-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-teal-400">
            <Brain size={13} />
            <span>HISTORICAL HINDSIGHT EVIDENCE</span>
          </div>
          {historicalEvidence.length > 0 ? (
            <ul className="space-y-1.5">
              {historicalEvidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="text-teal-400 font-bold mt-0.5">•</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No historical evidence retrieved. Recommendation based on current signals only.
            </p>
          )}
          {hasMemory && withMemorySummary && (
            <p className="text-xs text-teal-300/70 border-t border-teal-500/20 pt-2 mt-2 leading-relaxed italic">
              {withMemorySummary}
            </p>
          )}
        </div>
      </div>

      {/* Reasoning bullets */}
      {bullets.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">Reasoning</div>
          <ul className="space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-teal-400 mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Historical memories linked */}
      {memories.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase">
            Recalled Organizational Memories
          </div>
          <div className="space-y-2">
            {memories.map((m, idx) => (
              <div
                key={m.incident_id || idx}
                className="border border-slate-800 hover:border-slate-700 rounded-lg p-3 bg-ink-950 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="font-mono text-sm text-teal-300 font-semibold">
                      {m.incident_id || "Unlinked memory"}
                    </div>
                    {m.root_cause && (
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Root cause:</span> {m.root_cause}
                      </div>
                    )}
                    {m.resolution && (
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Resolution:</span> {m.resolution}
                      </div>
                    )}
                    {m.outcome && (
                      <div className="text-xs text-slate-500">{m.outcome}</div>
                    )}
                  </div>
                  {m.incident_id && (
                    <button
                      onClick={() => navigate(`/memory/${m.incident_id}`)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-400 transition-colors shrink-0"
                    >
                      <ExternalLink size={11} />
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-slate-600 border-t border-slate-800 pt-3 leading-relaxed">
        Historical facts originate exclusively from recalled Hindsight memories. The reasoning layer does not
        invent incident IDs or past resolutions.
      </p>
    </section>
  );
}
