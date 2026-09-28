import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, ArrowUpRight, CheckCircle2, Tag } from "lucide-react";
import { api } from "../api";

export function RecentMemoryActivity() {
  const [memories, setMemories] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .memories()
      .then((res) => {
        setMemories(res.items.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-xs text-slate-500 p-4">Loading recent memory activity…</p>;

  return (
    <section className="border border-slate-800 rounded-xl bg-ink-900 overflow-hidden shadow-md">
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-teal-400" />
          <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Recent Retained Memories</h3>
        </div>
        <Link to="/memory" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
          View all catalog <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="divide-y divide-slate-800/80">
        {memories.map((m) => {
          const iid = String(m.incident_id || "");
          const service = String(m.service || "");
          const rootCause = String(m.root_cause || "");
          const resolution = String(m.resolution || "");
          const outcome = String(m.outcome || "Resolved");
          const tags = (m.tags as string[]) || [];

          return (
            <div key={iid} className="p-4 hover:bg-ink-800/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-300">{iid}</span>
                    <span className="text-xs text-slate-400 font-medium">• {service}</span>
                  </div>
                  <div className="text-xs text-slate-200 font-medium">{rootCause}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">Fix: {resolution}</div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    <CheckCircle2 size={10} />
                    {outcome}
                  </span>
                  <Link
                    to={`/memory/${iid}`}
                    className="text-[11px] text-slate-400 hover:text-white underline underline-offset-2"
                  >
                    View memory
                  </Link>
                </div>
              </div>

              {tags.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <Tag size={10} className="text-slate-500" />
                  {tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-950 text-slate-400 border border-slate-800">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {memories.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">No retained memories found in catalog.</div>
        )}
      </div>
    </section>
  );
}
