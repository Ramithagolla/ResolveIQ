import { Activity, Brain, Search, Lightbulb, CheckSquare, Save, Sparkles } from "lucide-react";

export function AnalyzerWorkflowSteps({
  currentStep,
  memoryCreated,
}: {
  currentStep: "signals" | "recall" | "evidence" | "why" | "resolution" | "retain" | "memory";
  memoryCreated?: boolean;
}) {
  const steps = [
    { key: "signals", label: "01 Current Signals", icon: Activity },
    { key: "recall", label: "02 Hindsight Recall", icon: Brain },
    { key: "evidence", label: "03 Historical Evidence", icon: Search },
    { key: "why", label: "04 Recommendation", icon: Lightbulb },
    { key: "resolution", label: "05 Apply Resolution", icon: CheckSquare },
    { key: "retain", label: "06 Hindsight Retain", icon: Save },
  ] as const;

  const stepOrder = ["signals", "recall", "evidence", "why", "resolution", "retain", "memory"];
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="border border-slate-800 rounded-xl p-3.5 bg-ink-900 shadow-md space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
        <span className="text-teal-400 font-semibold uppercase tracking-wider">ResolveIQ Memory Workflow</span>
        {currentStep === "retain" || currentStep === "memory" || memoryCreated ? (
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles size={12} />
            NEW ORGANIZATIONAL MEMORY CREATED ✓
          </span>
        ) : (
          <span>Step {Math.min(currentIdx + 1, 6)} of 6</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isDone = idx < currentIdx || (s.key === "retain" && (currentStep === "memory" || memoryCreated));
          const isCurrent = (idx === currentIdx && s.key !== "retain") || (s.key === "retain" && (currentStep === "retain" || currentStep === "memory" || memoryCreated));

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
