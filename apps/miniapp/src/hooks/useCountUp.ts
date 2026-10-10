import { useEffect, useRef, useState } from "react";

/** Animate a number toward `target` (ease-out). First render starts from 0 so rewards "count in". */
export function useCountUp(target: number, ms = 600, fromZero = true): number {
  const [value, setValue] = useState(fromZero ? 0 : target);
  const fromRef = useRef(fromZero ? 0 : target);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    fromRef.current = valueRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}
