import { useNavigate } from "react-router-dom";
import { RecalledMemory } from "../api";

export function WhyRecommendation({
  bullets,
  memories,
}: {
  bullets: string[];
  memories: RecalledMemory[];
}) {
  const navigate = useNavigate();
  return (
    <section className="border border-slate-800 rounded-lg p-5 bg-ink-900">
      <div className="text-[11px] tracking-widest text-slate-400">WHY THIS RECOMMENDATION?</div>
      <ul className="mt-3 space-y-1 text-sm text-slate-200">
        {bullets.map((b) => (
          <li key={b}>✓ {b}</li>
        ))}
      </ul>
      <div className="mt-5 text-[11px] tracking-widest text-slate-500">Historical evidence</div>
      <div className="mt-2 space-y-3">
        {memories.map((m) => (
          <button
            key={m.incident_id || m.text}
            onClick={() => m.incident_id && navigate(`/incidents/${m.incident_id}`)}
            className="block w-full text-left text-sm border border-slate-800 rounded-md p-3 hover:border-slate-600"
          >
            <div className="font-mono text-teal-300">{m.incident_id}</div>
            <div className="text-slate-400">Root cause: {m.root_cause}</div>
            <div className="text-slate-400">Resolution: {m.resolution}</div>
            <div className="text-slate-500">Outcome: {m.outcome}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
