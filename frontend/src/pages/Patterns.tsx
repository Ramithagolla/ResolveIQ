import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch, ExternalLink, Activity, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { api } from "../api";

type PatternDetail = {
  name: string;
  count: number;
  source: string;
  symptoms: string[];
  causes: string[];
  resolutions: string[];
};

const PATTERN_DETAILS: Record<string, { symptoms: string[]; causes: string[]; resolutions: string[] }> = {
  Database: {
    symptoms: ["connection timeout", "pool exhaustion", "query latency", "connections unavailable"],
    causes: ["connection pool limits", "blocking schema locks", "un-indexed full table scans"],
    resolutions: ["increase connection pool max", "add missing composite index", "terminate blocking DDL lock"],
  },
  Deployment: {
    symptoms: ["502 bad gateway", "100% cpu utilization", "config mismatch", "canary error budget burned"],
    causes: ["un-backtracked regex CPU backtracking", "staging JWKS URL mismatch", "untested VCL rule update"],
    resolutions: ["rollback deployment", "correct environment configuration", "apply kill-switch and revert rule"],
  },
  Authentication: {
    symptoms: ["token expiration", "401 unauthorized", "secret rotation crash", "IAM permission denied"],
    causes: ["short token TTL after config change", "corrupted IAM policy cache", "missing rotated secret in runtime"],
    resolutions: ["flush auth cache & restore TTL", "purge IAM policy cache", "sync secrets & restart auth pods"],
  },
  "Retry configuration": {
    symptoms: ["retry storm", "provider 429 rate limit", "downstream timeout", "consumer lag"],
    causes: ["un-jacketed client retries", "missing exponential backoff with jitter", "unbounded retry budget"],
    resolutions: ["add exponential backoff & jitter", "cap retry attempts at 3", "enable circuit breaker"],
  },
  "Search index": {
    symptoms: ["indexing failure", "stale index", "mapper parsing exception", "search lag"],
    causes: ["mapping conflict after schema update", "indexer partition imbalance", "shard lag"],
    resolutions: ["reindex with updated mapping", "rebalance consumers & rebuild shards", "dual-write sku keyword"],
  },
  Notification: {
    symptoms: ["queue backlog", "SQS depth saturation", "consumer starvation", "provider timeout"],
    causes: ["Redis maxmemory key eviction", "unbounded cache key expiration", "consumer worker deadlock"],
    resolutions: ["apply volatile-lru eviction policy", "separate cache Redis from queue Redis", "scale consumer fleet"],
  },
};

export default function Patterns() {
  const [rows, setRows] = useState<Array<{ name: string; count: number; source: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  useEffect(() => {
    api
      .patterns()
      .then((data) => {
        setRows(data);
        if (data.length > 0) setSelectedPattern(data[0].name);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-400 p-4">{error}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));

  const activeDetails = selectedPattern ? PATTERN_DETAILS[selectedPattern] : null;
  const activeRow = rows.find((r) => r.name === selectedPattern);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400 uppercase tracking-wider">
          <GitBranch size={14} />
          <span>Failure Archaeology</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">RECURRING PATTERNS</h1>
        <p className="text-sm text-slate-400 mt-1">
          Recurring incident patterns aggregated from the memory catalog. Click any pattern to inspect root causes, symptoms, and resolutions.
        </p>
      </div>

      {/* Pattern Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((r) => {
          const isSelected = selectedPattern === r.name;
          return (
            <div
              key={r.name}
              onClick={() => setSelectedPattern(r.name)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-ink-900 border-teal-500/50 shadow-lg ring-1 ring-teal-500/30"
                  : "bg-ink-900/60 border-slate-800 hover:border-slate-700 hover:bg-ink-900"
              }`}
            >
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span className={isSelected ? "text-teal-300 font-bold" : "text-white"}>{r.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {r.count} {r.count === 1 ? "incident" : "incidents"}
                </span>
              </div>

              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isSelected ? "bg-teal-400" : "bg-slate-600"
                  }`}
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pattern Details Card */}
      {selectedPattern && activeRow && (
        <div className="p-6 rounded-xl bg-ink-900 border border-teal-500/30 space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-teal-400 uppercase">Pattern Archetype</span>
              <h2 className="text-xl font-bold text-white mt-0.5">{selectedPattern} Failure Pattern</h2>
              <div className="text-xs text-slate-400 mt-1">
                Calculated from <strong className="text-slate-200">{activeRow.count}</strong> stored postmortem memories
              </div>
            </div>

            <Link
              to={`/memory?q=${encodeURIComponent(selectedPattern)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-ink-950 font-bold text-xs transition-colors shadow-md"
            >
              <span>[ VIEW RELATED MEMORIES ]</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {activeDetails && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Common Symptoms */}
              <div className="p-4 rounded-xl bg-ink-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-amber-400" />
                  <span>Common Symptoms</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 pt-1">
                  {activeDetails.symptoms.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Causes */}
              <div className="p-4 rounded-xl bg-ink-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={13} className="text-rose-400" />
                  <span>Common Root Causes</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 pt-1">
                  {activeDetails.causes.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-400">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Successful Resolutions */}
              <div className="p-4 rounded-xl bg-ink-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-teal-400" />
                  <span>Proven Resolutions</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 pt-1">
                  {activeDetails.resolutions.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-teal-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
