import { cn } from "../lib/cn";

const TONES = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-600/15",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-700 ring-rose-600/20",
  brand: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
