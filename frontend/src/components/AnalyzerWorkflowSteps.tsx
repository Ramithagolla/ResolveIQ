import { Brain, Search, Lightbulb, CheckSquare, Save, Sparkles } from "lucide-react";

export function AnalyzerWorkflowSteps({
  currentStep,
}: {
  currentStep: "recall" | "evidence" | "why" | "resolution" | "retain" | "memory";
}) {
  const steps = [
    { key: "recall", label: "1. Hindsight Recall", icon: Brain },
    { key: "evidence", label: "2. Historical Evidence", icon: Search },
    { key: "why", label: "3. Why Recommendation", icon: Lightbulb },
    { key: "resolution", label: "4. Apply Resolution", icon: CheckSquare },
    { key: "retain", label: "5. Hindsight Retain", icon: Save },
    { key: "memory", label: "6. New Memory Created", icon: Sparkles },
  ] as const;

  const stepOrder = ["recall", "evidence", "why", "resolution", "retain", "memory"];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="border border-slate-800 rounded-xl p-3.5 bg-ink-900 shadow-md">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 px-1">
        <span className="text-teal-400 font-semibold uppercase tracking-wider">ResolveIQ Memory Workflow</span>
        <span>Step {currentIdx + 1} of 6</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                isCurrent
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-200 font-semibold ring-1 ring-teal-500/30"
                  : isDone
                  ? "bg-ink-950 border-slate-800 text-slate-300"
                  : "bg-ink-950/40 border-slate-800/60 text-slate-500"
              }`}
            >
              <Icon size={14} className={isCurrent ? "text-teal-400" : isDone ? "text-emerald-400" : "text-slate-500"} />
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
