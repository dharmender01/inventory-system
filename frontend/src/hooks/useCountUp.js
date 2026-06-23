import { useEffect, useRef, useState } from "react";

export function useCountUp(target, duration = 700) {
  const end = Number(target) || 0;
  const [value, setValue] = useState(end);
  const fromRef = useRef(end);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || fromRef.current === end) {
      setValue(end);
      fromRef.current = end;
      return undefined;
    }

    const start = fromRef.current;
    let raf;
    let t0;
    const step = (t) => {
      if (t0 == null) t0 = t;
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = end;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return value;
}
