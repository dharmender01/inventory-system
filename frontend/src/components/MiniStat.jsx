import { useCountUp } from "../hooks/useCountUp";
import { cn } from "../lib/cn";

const TILES = {
  indigo: "from-indigo-500 to-violet-500",
  emerald: "from-emerald-500 to-teal-500",
  sky: "from-sky-500 to-cyan-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
};

export default function MiniStat({ label, value, icon: Icon, tone = "indigo", count = true }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  const display = count && typeof value === "number" ? animated : value;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm",
          TILES[tone] || TILES.indigo,
        )}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="font-mono text-lg font-semibold text-ink tnum">{display}</p>
      </div>
    </div>
  );
}
