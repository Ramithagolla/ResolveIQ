export function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "SEV-1"
      ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
      : severity === "SEV-2"
        ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
        : "text-slate-300 border-slate-600 bg-slate-500/10";
  return <span className={`px-2 py-0.5 text-[11px] border rounded ${color}`}>{severity}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === "resolved" ? "text-teal-300" : status === "investigating" ? "text-sky-300" : "text-slate-300";
  return <span className={`uppercase tracking-wide text-[11px] ${color}`}>{status}</span>;
}
