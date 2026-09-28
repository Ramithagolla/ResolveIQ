import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck, Database, Building2, Tag, BookOpen } from "lucide-react";
import { api, PublicSourcesOut } from "../api";

export default function Sources() {
  const [data, setData] = useState<PublicSourcesOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>("All");

  useEffect(() => {
    api
      .getSources()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <div className="flex items-center gap-2">
          <Database className="animate-spin text-teal-400" size={20} />
          <span>Loading public incident postmortem dataset…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
        Failed to load dataset: {error || "No data available"}
      </div>
    );
  }

  const orgs = ["All", ...Array.from(new Set(data.incidents.map((i) => i.organization)))];
  const filtered =
    selectedOrg === "All" ? data.incidents : data.incidents.filter((i) => i.organization === selectedOrg);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 uppercase tracking-wider">
          <ShieldCheck size={14} />
          <span>Incident Knowledge Sources</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">INCIDENT KNOWLEDGE SOURCES</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Structured incident data used to seed organizational memory. Includes curated demo incidents and,
          where available, attributed public engineering postmortems.
        </p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-ink-900 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{data.total_incidents}</div>
            <div className="text-xs text-slate-400">Seeded Incidents</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-ink-900 border border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{orgs.length - 1}</div>
            <div className="text-xs text-slate-400">Organizations</div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck size={18} className="text-teal-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Data Provenance Guarantee:</span> {data.disclaimer}
        </div>
      </div>

      {/* Org Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {orgs.map((org) => (
          <button
            key={org}
            onClick={() => setSelectedOrg(org)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedOrg === org
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {org}
          </button>
        ))}
      </div>

      {/* Incidents Grid */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.incident_id}
            className="p-5 rounded-xl bg-ink-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {item.incident_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {item.organization}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{item.date}</span>
                </div>
                <h3 className="text-base font-semibold text-white mt-1.5">{item.title}</h3>
                <div className="text-xs text-slate-400 mt-0.5">Service: <span className="text-slate-200">{item.service}</span></div>
              </div>

              {item.source_url ? (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium transition-colors shrink-0"
                >
                  <span>Source: {item.organization} Postmortem</span>
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-500 border border-slate-700/50 text-xs shrink-0">
                  Curated demo incident
                </span>
              )}
            </div>

            {/* Impact & Symptoms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-ink-950 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-medium">Impact</div>
                <p className="text-slate-300 leading-relaxed">{item.impact}</p>
              </div>

              <div className="p-3 rounded-lg bg-ink-950 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-medium flex items-center gap-1">
                  <Tag size={12} />
                  <span>Symptoms</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Root Cause & Resolution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                <div className="text-amber-400 font-semibold">Documented Root Cause</div>
                <p className="text-slate-300 leading-relaxed">{item.root_cause}</p>
              </div>

              <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 space-y-1">
                <div className="text-teal-400 font-semibold">Documented Resolution</div>
                <p className="text-slate-300 leading-relaxed">{item.resolution}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
