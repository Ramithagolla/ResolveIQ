import { GitBranch, Wrench, ShieldAlert } from "lucide-react";

export function LearnedPatternCards({ patterns }: { patterns: Array<{ name: string; count: number; source?: string }> }) {
  const max = Math.max(1, ...patterns.map((p) => p.count));

  const detailsMap: Record<string, { service: string; fix: string }> = {
    Database: {
      service: "Payment API",
      fix: "Increase connection pool size and fix connection wait leaks",
    },
    Deployment: {
      service: "Payment API / Auth",
      fix: "Canary rollback &Expand/Contract schema migrations",
    },
    Authentication: {
      service: "Auth Service",
      fix: "Align token TTL, sync rotated secrets & flush cache",
    },
    "Retry configuration": {
      service: "Notification Service",
      fix: "Exponential backoff with jitter and capped retries",
    },
    Notification: {
      service: "Notification Service",
      fix: "Circuit breakers & failover to secondary provider",
    },
    "Search index": {
      service: "Search Service",
      fix: "Reindex mapping conflict & rebalance consumer shards",
    },
  };

  return (
    <section className="border border-slate-800 rounded-xl bg-ink-900 p-5 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-teal-400" />
          <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Top Learned Organizational Patterns</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500">Live Memory Catalog</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {patterns.slice(0, 6).map((p) => {
          const detail = detailsMap[p.name] || {
            service: "Infrastructure",
            fix: "Standard incident remediation procedure",
          };
          const pct = Math.round((p.count / max) * 100);

          return (
            <div
              key={p.name}
              className="border border-slate-800 rounded-lg p-3.5 bg-ink-950/80 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white">{p.name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <ShieldAlert size={12} className="text-amber-400" />
                      <span>{detail.service}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20 shrink-0">
                    Seen {p.count}x
                  </span>
                </div>

                <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-slate-300">
                  <Wrench size={12} className="text-teal-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{detail.fix}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>Frequency Weight</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
