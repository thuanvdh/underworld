import { useEffect, useRef } from "react";
import type { ClassId } from "@underworld/shared";
import { animate, backdrop } from "../art/scene.ts";
import { HEROES } from "../art/sprites/characters.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { drawSprite, height, width } from "../art/pixel.ts";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";

/**
 * Home scene: the chapter backdrop with the hero idling and the AFK chest. The chest sparkles when there's
 * loot waiting; tapping it claims.
 */
export function SceneView({ chapter, classId, chestReady, onChest }: { chapter: string; classId: ClassId; chestReady: boolean; onChest?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h, scale } = usePixelCanvas(boxRef, canvasRef, { targetPixelWidth: 120, aspect: 0.62 });
  const stateRef = useRef({ chestReady, classId });
  stateRef.current = { chestReady, classId };
  const chestBox = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const bg = backdrop(chapter, w, h);
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 100) return; // ~10 fps is plenty for idle pixel art
      last = t;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg.canvas, 0, 0);
      animate(ctx, bg, t);

      const hero = HEROES[stateRef.current.classId];
      const bob = Math.floor(t / 500) % 2;
      const hx = Math.round(w * 0.22);
      const hy = bg.floorY - height(hero) + 2 + bob;
      ctx.fillStyle = "#00000066";
      ctx.fillRect(hx + 2, bg.floorY + 1, width(hero) - 4, 2);
      drawSprite(ctx, hero, hx, hy, 1);

      const chest = ICONS.chest;
      const cx = Math.round(w * 0.74);
      // The chest hops when loot is waiting.
      const hop = stateRef.current.chestReady && Math.floor(t / 180) % 6 === 0 ? 1 : 0;
      const cy = bg.floorY - height(chest) + 2 - hop;
      chestBox.current = { x: cx, y: cy, w: width(chest), h: height(chest) };
      drawSprite(ctx, chest, cx, cy, 1);
      if (stateRef.current.chestReady) {
        // Rising sparkles above the chest.
        for (let i = 0; i < 7; i++) {
          const life = (t / 60 + i * 13) % 24;
          const sx = cx + 3 + ((i * 5 + Math.floor(t / 300)) % (width(chest) - 6));
          const sy = cy - life;
          ctx.fillStyle = life < 8 ? "#fff3c4" : life < 16 ? "#ffc93c" : "#b8860b";
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [chapter, w, h]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onChest) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const b = chestBox.current;
    if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 8 && y <= b.y + b.h + 4) onChest();
  };

  return (
    <div ref={boxRef} style={{ width: "100%" }}>
      <canvas ref={canvasRef} className="px" onClick={onClick} />
    </div>
  );
}
