import { useNavigate } from "react-router-dom";
import { RecalledMemory } from "../api";

export function HindsightRecall({ memories, available, error }: { memories: RecalledMemory[]; available: boolean; error?: string | null }) {
  const navigate = useNavigate();
  if (!available) {
    return (
      <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
        <div className="text-[11px] tracking-widest text-amber-400">HINDSIGHT RECALL</div>
        <p className="mt-2 text-amber-200">Memory service unavailable</p>
        {error && <p className="text-xs text-slate-400 mt-1">{error}</p>}
      </div>
    );
  }
  return (
    <div className="border border-slate-800 rounded-lg p-4 bg-ink-900">
      <div className="text-[11px] tracking-widest text-teal-400">🧠 HINDSIGHT RECALL</div>
      <p className="mt-2 text-slate-300">{memories.length} relevant memories found</p>
      <div className="mt-4 space-y-2">
        {memories.slice(0, 5).map((m) => (
          <button
            key={`${m.incident_id}-${m.relevance}`}
            onClick={() => m.incident_id && navigate(`/memory/${m.incident_id}`)}
            className="w-full text-left border border-slate-800 hover:border-teal-500/40 rounded-md px-3 py-2 flex items-center justify-between"
          >
            <div>
              <div className="font-mono text-sm">{m.incident_id || "unlinked fact"}</div>
              <div className="text-xs text-slate-400">{m.service || m.root_cause || m.text.slice(0, 80)}</div>
            </div>
            <div className="font-mono text-teal-300 text-sm">{m.relevance}% relevance</div>
          </button>
        ))}
        {memories.length === 0 && <p className="text-sm text-slate-500">No historical memories found</p>}
      </div>
    </div>
  );
}
