import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Incident } from "../api";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { MemoryLoop } from "../components/MemoryLoop";
import { HindsightStatusCard } from "../components/HindsightStatusCard";
import { RecentMemoryActivity } from "../components/RecentMemoryActivity";
import { LearnedPatternCards } from "../components/LearnedPatternCards";
import { Activity, CheckCircle, Brain, GitBranch, Clock } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.stats>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.health>> | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patterns, setPatterns] = useState<Array<{ name: string; count: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.stats(), api.health(), api.incidents(), api.patterns()])
      .then(([s, h, i, p]) => {
        setStats(s);
        setHealth(h);
        setIncidents(i);
        setPatterns(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-400 p-4">Backend unavailable: {error}</p>;
  if (!stats) return <p className="text-slate-500 p-4">Loading ResolveIQ dashboard…</p>;

  const cards = [
    { label: "Active Incidents", value: String(stats.active_incidents).padStart(2, "0"), icon: Activity, color: "text-amber-400" },
    { label: "Resolved Incidents", value: String(stats.resolved_incidents), icon: CheckCircle, color: "text-emerald-400" },
    { label: "Organizational Memories", value: String(stats.organizational_memories), icon: Brain, color: "text-teal-400" },
    { label: "Recurring Patterns", value: String(stats.recurring_patterns), icon: GitBranch, color: "text-sky-400" },
    { label: "Avg Resolution Time", value: stats.average_resolution_time ? `${stats.average_resolution_time}m` : "—", icon: Clock, color: "text-indigo-400" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">ResolveIQ Dashboard</h1>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
            Hindsight Memory Active
          </span>
        </div>
        <p className="text-slate-400 text-xs mt-1.5">{stats.note}</p>
      </div>

      {/* Prominent Hindsight Memory Engine Status Card */}
      <HindsightStatusCard health={health} memoryCount={stats.organizational_memories} />

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="border border-slate-800 rounded-xl p-4 bg-ink-900 shadow-md">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono text-slate-400 tracking-wide uppercase">{c.label}</span>
                <Icon size={16} className={c.color} />
              </div>
              <div className="text-3xl font-mono font-bold mt-2 text-white">{c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Interactive Hindsight Memory Loop Visualizer */}
      <MemoryLoop />

      {/* Learned Patterns & Recent Memory Activity Stream */}
      <div className="grid lg:grid-cols-2 gap-6">
        <LearnedPatternCards patterns={patterns} />
        <RecentMemoryActivity />
      </div>

      {/* Recent Incidents Table */}
      <section className="border border-slate-800 rounded-xl bg-ink-900 shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Recent Incidents Log</h3>
          </div>
          <Link to="/analyze" className="text-xs text-teal-400 hover:underline">
            + Ingest New Incident
          </Link>
        </div>
        <div className="divide-y divide-slate-800/80">
          {incidents.slice(0, 8).map((i) => (
            <Link
              key={i.public_id}
              to={`/incidents/${i.public_id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-ink-800/60 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{i.public_id}</span>
                  <span className="text-xs text-slate-400">{i.service}</span>
                  <span className="text-[11px] font-mono text-slate-500">• {i.deployment}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{i.error}</div>
              </div>
              <div className="flex items-center gap-3">
                <SeverityBadge severity={i.severity} />
                <StatusBadge status={i.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
