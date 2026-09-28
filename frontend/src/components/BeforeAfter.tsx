import { Analysis } from "../api";

export function BeforeAfter({ analysis }: { analysis: Analysis }) {
  return (
    <section className="grid md:grid-cols-2 gap-4">
      <div className="border border-slate-800 rounded-lg p-4 bg-ink-900">
        <div className="text-[11px] tracking-widest text-slate-500">BEFORE HINDSIGHT</div>
        <p className="mt-3 text-slate-300 text-sm leading-relaxed">“{analysis.without_memory_summary}”</p>
      </div>
      <div className="border border-teal-500/30 rounded-lg p-4 bg-teal-500/5">
        <div className="text-[11px] tracking-widest text-teal-400">AFTER HINDSIGHT</div>
        <p className="mt-3 text-slate-100 text-sm leading-relaxed">“{analysis.with_memory_summary}”</p>
      </div>
    </section>
  );
}
