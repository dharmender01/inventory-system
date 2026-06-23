import { cn } from "../lib/cn";

const GRADS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
  "from-cyan-500 to-blue-500",
];

function pick(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default function Avatar({ name = "", square = false, className = "" }) {
  return (
    <div
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br text-xs font-semibold text-white shadow-sm",
        square ? "rounded-lg" : "rounded-full",
        pick(name),
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
