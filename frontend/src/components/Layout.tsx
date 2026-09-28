import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Brain, LayoutDashboard, Search, GitBranch, Activity, Play, CheckCircle2, ShieldAlert, BarChart3, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/analyze", label: "Incident Analyzer", icon: Activity },
  { to: "/evaluation", label: "Memory Evaluation", icon: BarChart3 },
  { to: "/sources", label: "Public Sources", icon: Database },
  { to: "/memory", label: "Memory Explorer", icon: Brain },
  { to: "/patterns", label: "Patterns", icon: GitBranch },
];

export default function Layout() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<{ memory_provider: string; memory_available: boolean } | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ memory_provider: "unreachable", memory_available: false }));
  }, []);

  async function launchDemo() {
    setDemoBusy(true);
    setError(null);
    try {
      const demo = await api.launchDemo();
      navigate(`/incidents/${demo.new_incident.public_id}?demo=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo failed");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-ink-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800/80 bg-ink-900 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <Brain size={18} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest text-teal-400">RESOLVEIQ</div>
              <div className="text-[11px] text-slate-400">Hindsight Incident Memory</div>
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-ink-800"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3 bg-ink-950/60">
          <button
            onClick={launchDemo}
            disabled={demoBusy}
            className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-semibold rounded-lg py-2.5 text-xs transition-colors disabled:opacity-50 shadow-md"
          >
            <Play size={14} fill="currentColor" />
            {demoBusy ? "Launching Scenario…" : "Launch Demo Mode"}
          </button>
          {error && <p className="text-[11px] text-rose-400">{error}</p>}

          <div className="p-2.5 rounded-lg bg-ink-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
              <span>Memory Engine</span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              {health?.memory_available ? (
                <CheckCircle2 size={12} className="text-teal-400" />
              ) : (
                <ShieldAlert size={12} className="text-amber-400" />
              )}
              <span>{health?.memory_provider || "checking..."}</span>
            </div>
            {health?.memory_provider === "local-demo" && (
              <p className="text-[10px] text-amber-400/90 leading-tight pt-0.5">
                Development store mode.
              </p>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-800/80 bg-ink-900/60 flex items-center justify-between px-8 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Search size={14} className="text-teal-400" />
            <span>Organizational Incident Memory System</span>
          </div>
          <div className="font-mono text-xs text-slate-500">Bank: resolveiq-incidents</div>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
