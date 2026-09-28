import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function MemoryExplorer() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof api.memories>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      api.memories(q || undefined).then(setData).catch((e) => setError(e.message));
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  if (error) return <p className="text-rose-400">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Organizational Memory</h1>
        <p className="text-slate-400 text-sm mt-1">{data.note}</p>
      </div>
      <input
        placeholder="Search memories…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full bg-ink-900 border border-slate-800 rounded-md px-3 py-2 text-sm"
      />
      <div className="flex gap-6 text-sm text-slate-400">
        <span>{data.count} Memories</span>
        <span>{data.patterns} Patterns</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {data.items.map((m) => (
          <button
            key={m.incident_id}
            onClick={() => navigate(`/memory/${m.incident_id}`)}
            className="text-left border border-slate-800 rounded-lg p-4 bg-ink-900 hover:border-teal-500/30"
          >
            <div className="font-mono">{m.incident_id}</div>
            <div className="text-sm text-slate-400 mt-1">{m.service}</div>
            <div className="text-sm mt-3">
              <span className="text-slate-500">Root Cause:</span> {m.root_cause}
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Resolution:</span> {m.resolution}
            </div>
            <div className="text-sm text-teal-400 mt-2">{m.outcome}</div>
            <div className="text-xs text-slate-500 mt-3">View memory</div>
          </button>
        ))}
      </div>
    </div>
  );
}
