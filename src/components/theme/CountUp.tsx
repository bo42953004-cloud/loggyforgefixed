"use client";

import { useEffect, useState } from "react";

/** Eased count-up from 0 to `target`. Pass `format` for money, suffixes, etc. */
export default function CountUp({
  target,
  duration = 1400,
  format,
}: {
  target: number;
  duration?: number;
  format?: (value: number) => string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -8 * t) / 255;
      setValue(t >= 1 ? target : target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{format ? format(value) : Math.round(value).toLocaleString()}</>;
}
