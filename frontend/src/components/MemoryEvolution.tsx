import { LearnResult } from "../api";
import { useEffect, useState } from "react";

export function MemoryEvolution({ learn }: { learn: LearnResult }) {
  const [count, setCount] = useState(learn.evolution.before);
  useEffect(() => {
    const target = learn.evolution.after;
    const start = learn.evolution.before;
    const steps = Math.max(1, target - start);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(start + i);
      if (i >= steps) clearInterval(timer);
    }, 180);
    return () => clearInterval(timer);
  }, [learn]);

  return (
    <section className="border border-teal-500/30 rounded-xl p-6 bg-gradient-to-b from-teal-500/10 to-transparent">
      <div className="text-[11px] tracking-widest text-teal-400">✓ INCIDENT RESOLVED</div>
      <div className="mt-2 text-xl">🧠 NEW MEMORY CREATED</div>
      <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
        <div className="border border-slate-800 rounded-md p-4">
          <div className="text-slate-500 text-xs">BEFORE</div>
          <div className="text-3xl font-mono mt-2">{learn.evolution.before}</div>
          <div className="text-xs text-slate-500">historical memories</div>
        </div>
        <div className="border border-slate-800 rounded-md p-4">
          <div className="text-slate-500 text-xs">LEARNING</div>
          <div className="mt-2 space-y-1 text-slate-300">
            <div>Root cause identified</div>
            <div>Resolution captured</div>
            <div>Outcome captured</div>
          </div>
        </div>
        <div className="border border-teal-500/40 rounded-md p-4">
          <div className="text-slate-500 text-xs">AFTER</div>
          <div className="text-3xl font-mono mt-2 text-teal-300">{count}</div>
          <div className="text-xs text-slate-500">+1 new learned pattern</div>
        </div>
      </div>
      <div className="mt-6 font-mono text-sm text-slate-300 space-y-1">
        <div>Pattern: {learn.pattern}</div>
        <div>Root Cause: {learn.actual_root_cause}</div>
        <div>Successful Fix: {learn.successful_fix}</div>
      </div>
      <div className="mt-6 text-center text-slate-400">
        <div>{learn.evolution.service}</div>
        <div className="text-teal-500">+</div>
        <div>Deployment</div>
        <div className="text-teal-500">+</div>
        <div>{learn.evolution.error}</div>
        <div className="text-teal-500">↓</div>
        <div className="text-white">{learn.evolution.root_cause}</div>
      </div>
      <p className="mt-4 text-sm text-slate-500">This experience is now available to future incident investigations.</p>
      {learn.memory_provider === "local-demo" && (
        <p className="mt-2 text-xs text-amber-400">Stored in local development memory — not Hindsight.</p>
      )}
    </section>
  );
}
