import { useState } from "react";
import { Brain, CheckCircle2, Circle, Zap, RefreshCw, Database, ShieldCheck } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "New Incident",
    desc: "Service error, severity, and logs are ingested.",
    icon: Zap,
  },
  {
    num: "02",
    title: "Incident Analysis",
    desc: "Symptoms and deployment context extracted.",
    icon: RefreshCw,
  },
  {
    num: "03",
    title: "Hindsight Recall",
    desc: "Queries organizational memory bank for similar past failures.",
    icon: Brain,
  },
  {
    num: "04",
    title: "Evidence Reasoning",
    desc: "Combines current logs with recalled historical evidence.",
    icon: Database,
  },
  {
    num: "05",
    title: "Recommended Fix",
    desc: "Surfaces proven root causes and verified resolutions.",
    icon: ShieldCheck,
  },
  {
    num: "06",
    title: "Hindsight Retain",
    desc: "Captures actual fix & outcome into memory for future incidents.",
    icon: CheckCircle2,
  },
];

export function MemoryLoop({
  currentStepIndex,
  onSelectStep,
}: {
  currentStepIndex?: number;
  onSelectStep?: (idx: number) => void;
}) {
  // If currentStepIndex is undefined, allow interactive toggle or default to -1 (before execution)
  const [internalStep, setInternalStep] = useState<number>(-1);
  const activeIdx = currentStepIndex !== undefined ? currentStepIndex : internalStep;

  const isAllComplete = activeIdx >= 6;
  const isBeforeExecution = activeIdx < 0;

  return (
    <section className="border border-slate-800 rounded-xl p-6 bg-ink-900/90 shadow-xl relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Brain size={18} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-white">The ResolveIQ Stateful Memory Loop</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Every resolved incident becomes organizational memory, so the next incident is resolved faster.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {isAllComplete ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Memory Loop Completed (All 6 Steps ✓)
            </span>
          ) : isBeforeExecution ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-800 border border-slate-700 text-slate-400">
              <Circle size={12} className="text-slate-500" />
              Idle State (Pending Execution ○)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              Step {Math.min(activeIdx + 1, 6)} of 6 Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {steps.map((step, idx) => {
          const isDone = isAllComplete || (activeIdx >= 0 && idx < activeIdx);
          const isCurrent = !isAllComplete && activeIdx === idx;
          const isPending = !isAllComplete && (isBeforeExecution || idx > activeIdx);

          return (
            <div
              key={step.num}
              onClick={() => {
                if (currentStepIndex === undefined) {
                  setInternalStep(idx);
                }
                if (onSelectStep) onSelectStep(idx);
              }}
              className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-200 flex flex-col justify-between ${
                isCurrent
                  ? "border-teal-500/60 bg-teal-500/10 text-white shadow-lg ring-1 ring-teal-500/40 scale-[1.02]"
                  : isDone
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100 hover:border-emerald-500/50"
                  : "border-slate-800/80 bg-ink-950/60 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                  <span>{step.num}</span>
                  {isDone ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px]">✓</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="flex items-center gap-1 text-teal-300 font-bold">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    </span>
                  ) : (
                    <Circle size={12} className="text-slate-600" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold tracking-wider ${isDone ? "text-emerald-200" : isCurrent ? "text-white font-bold" : "text-slate-300"}`}>
                    {isDone ? "✓ " : isPending ? "○ " : ""}{step.title}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="text-teal-400 font-semibold">Stateful Execution Flow:</span>
          <span>Pending ○ → Active ▶ → Completed ✓</span>
        </span>
        {currentStepIndex === undefined && (
          <span className="hidden md:inline text-slate-400">Click steps to test state highlights</span>
        )}
      </div>
    </section>
  );
}
