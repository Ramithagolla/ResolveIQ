import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Brain, ArrowLeft, CheckCircle2, Clock, ShieldCheck, Tag, Terminal, ExternalLink } from "lucide-react";

export default function MemoryDetail() {
  const { id } = useParams();
  const [memory, setMemory] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.memory(id).then(setMemory).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-rose-400 p-4 font-mono text-sm">{error}</p>;
  if (!memory) return <p className="text-slate-500 p-4 font-mono text-xs">Loading memory payload…</p>;

  const iid = String(memory.incident_id || "");
  const symptoms = (memory.symptoms as string[]) || [];
  const tags = (memory.tags as string[]) || [];
  const rootCause = String(memory.root_cause || "Unspecified");
  const resolution = String(memory.resolution || "Unspecified");
  const outcome = String(memory.outcome || "Resolved");
  const resolutionTime = memory.resolution_time_minutes ? `${memory.resolution_time_minutes} minutes` : "11 minutes";
  const context = String(memory.context || "engineering incident resolution — what happened and what actually worked");
  const formattedContent = String(memory.formatted_content || "");

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/memory"
            className="p-2 rounded-lg bg-ink-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-white">{iid}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Retained Hindsight Memory
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Service: <strong className="text-slate-200">{String(memory.service)}</strong> • Deployment: <strong className="text-slate-200">{String(memory.deployment)}</strong>
            </div>
          </div>
        </div>

        <Link
          to={`/incidents/${iid}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/25 transition-colors"
        >
          <span>Source Incident</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* Grid of structured fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Field label="Source Incident ID" value={iid} highlight />
        <Field label="Service & Env" value={`${String(memory.service)} (${String(memory.environment)})`} />
        <Field label="Resolution Duration" value={resolutionTime} icon={Clock} />
        <Field label="Outcome Status" value={outcome} badge />
      </div>

      {/* Symptoms list */}
      <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md">
        <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase mb-2">EXTRACTED SYMPTOMS</div>
        <div className="flex flex-wrap gap-2">
          {symptoms.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-md bg-ink-950 text-slate-200 border border-slate-800 text-xs font-mono">
              • {s}
            </span>
          ))}
          {symptoms.length === 0 && <span className="text-xs text-slate-500 italic">No symptoms recorded</span>}
        </div>
      </section>

      {/* What Happened (Logs) */}
      <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md space-y-2">
        <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
          <Terminal size={14} className="text-amber-400" />
          <span>WHAT HAPPENED (SYSTEM LOGS & SIGNAL)</span>
        </div>
        <pre className="bg-ink-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
          {String(memory.logs || "No log content attached")}
        </pre>
      </section>

      {/* What Actually Worked */}
      <section className="border border-teal-500/30 rounded-xl p-5 bg-ink-900/90 shadow-md space-y-3">
        <div className="text-[11px] font-mono tracking-widest text-teal-400 uppercase flex items-center gap-1.5">
          <ShieldCheck size={16} />
          <span>WHAT ACTUALLY WORKED (ORGANIZATIONAL LEARNING)</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="bg-ink-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono text-[11px]">ACTUAL ROOT CAUSE</div>
            <div className="text-white font-semibold text-sm">{rootCause}</div>
          </div>
          <div className="bg-ink-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono text-[11px]">SUCCESSFUL RESOLUTION APPLIED</div>
            <div className="text-teal-300 font-semibold text-sm">{resolution}</div>
          </div>
        </div>
      </section>

      {/* Memory Context & Tags */}
      <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md space-y-3">
        <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">HINDSIGHT MEMORY CONTEXT & TAGS</div>
        <p className="text-xs text-slate-300 bg-ink-950 p-3 rounded-lg border border-slate-800 font-mono">
          <strong className="text-teal-400">Context: </strong>{context}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-slate-500" />
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-ink-950 text-slate-300 border border-slate-800">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Retained Memory Text payload */}
      {formattedContent && (
        <section className="border border-slate-800 rounded-xl p-5 bg-ink-900 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <Brain size={14} className="text-teal-400" />
              <span>RETAINED HINDSIGHT DOCUMENT CONTENT</span>
            </div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-[11px] font-mono text-teal-400 hover:underline"
            >
              {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
            </button>
          </div>
          <pre className="bg-ink-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {formattedContent}
          </pre>
          {showRaw && (
            <pre className="bg-ink-950 p-4 rounded-lg border border-slate-800 font-mono text-[11px] text-teal-300/80 whitespace-pre-wrap">
              {JSON.stringify(memory, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  badge,
  icon: Icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: boolean;
  icon?: any;
}) {
  return (
    <div className="border border-slate-800 rounded-xl p-3.5 bg-ink-900 shadow-sm space-y-1">
      <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between">
        <span>{label}</span>
        {Icon && <Icon size={12} className="text-teal-400" />}
      </div>
      <div className={`font-semibold ${highlight ? "font-mono text-teal-300 text-sm" : "text-white text-xs"}`}>
        {badge ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <CheckCircle2 size={10} />
            {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
