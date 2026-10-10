import { useEffect, useState, type RefObject } from "react";

/**
 * Size a low-res canvas so it fills its container at an integer zoom: every art pixel becomes an
 * exact `scale × scale` block, which keeps pixel art crisp on any phone width.
 */
export function usePixelCanvas(
  container: RefObject<HTMLElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
  opts: { targetPixelWidth: number; aspect?: number; fillHeight?: boolean },
): { w: number; h: number; scale: number } {
  const [size, setSize] = useState({ w: opts.targetPixelWidth, h: Math.round(opts.targetPixelWidth * (opts.aspect ?? 0.75)), scale: 3 });

  useEffect(() => {
    const el = container.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const apply = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const scale = Math.max(2, Math.round(cw / opts.targetPixelWidth));
      const w = Math.ceil(cw / scale);
      const h = opts.fillHeight ? Math.ceil(ch / scale) : Math.round(w * (opts.aspect ?? 0.75));
      cv.width = w;
      cv.height = h;
      cv.style.width = `${w * scale}px`;
      cv.style.height = `${h * scale}px`;
      setSize((s) => (s.w === w && s.h === h && s.scale === scale ? s : { w, h, scale }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, canvas, opts.targetPixelWidth, opts.aspect, opts.fillHeight]);

  return size;
}
