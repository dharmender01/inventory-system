import { useCountUp } from "../hooks/useCountUp";
import { cn } from "../lib/cn";

const TONES = {
  indigo: { tile: "from-indigo-500 to-violet-500", soft: "from-white to-indigo-50", ring: "ring-indigo-100", glow: "hover:shadow-glow-indigo" },
  emerald: { tile: "from-emerald-500 to-teal-500", soft: "from-white to-emerald-50", ring: "ring-emerald-100", glow: "hover:shadow-glow-emerald" },
  sky: { tile: "from-sky-500 to-cyan-500", soft: "from-white to-sky-50", ring: "ring-sky-100", glow: "hover:shadow-glow-sky" },
  amber: { tile: "from-amber-500 to-orange-500", soft: "from-white to-amber-50", ring: "ring-amber-100", glow: "hover:shadow-glow-amber" },
};

export default function StatCard({ label, value, icon: Icon, tone = "indigo" }) {
  const count = useCountUp(value);
  const t = TONES[tone] || TONES.indigo;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br p-5 shadow-card ring-1 ring-inset",
        "transition-all duration-200 hover:-translate-y-1",
        t.soft,
        t.ring,
        t.glow,
      )}
    >
      {Icon && (
        <Icon
          className="pointer-events-none absolute -bottom-4 -right-3 text-slate-900/[0.04]"
          size={96}
          aria-hidden="true"
        />
      )}
      <div className="relative flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-200 group-hover:scale-110",
            t.tile,
          )}
        >
          {Icon && <Icon size={22} aria-hidden="true" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted">{label}</p>
          <p className="font-mono text-3xl font-semibold text-ink tnum">{count}</p>
        </div>
      </div>
    </div>
  );
}
