import { cn } from "../lib/cn";
import Spinner from "./Spinner";

const SIZES = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  icon: "p-2",
};

const VARIANTS = {
  primary: "bg-brand-gradient text-white shadow-glow-indigo hover:brightness-110",
  accent: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow-emerald hover:brightness-110",
  secondary: "bg-white text-ink border border-border hover:bg-slate-50 hover:border-slate-300 shadow-sm",
  danger: "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm hover:brightness-110",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer",
        "transition-all duration-150 active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
