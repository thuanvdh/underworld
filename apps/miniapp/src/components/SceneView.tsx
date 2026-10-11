import { useEffect, useRef } from "react";
import type { ClassId, Look } from "@underworld/shared";
import { heroArt, tierColor } from "../art/hero.ts";
import { animate, backdrop } from "../art/scene.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { drawSprite, height, width } from "../art/pixel.ts";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";

/**
 * Home scene: the chapter backdrop with the hero idling and the AFK chest. The chest sparkles when there's
 * loot waiting; tapping it claims.
 */
export function SceneView({ chapter, classId, look, chestReady, onChest }: { chapter: string; classId: ClassId; look: Look; chestReady: boolean; onChest?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h, scale } = usePixelCanvas(boxRef, canvasRef, { targetPixelWidth: 120, aspect: 0.62 });
  const stateRef = useRef({ chestReady, classId, look });
  stateRef.current = { chestReady, classId, look };
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

      const art = heroArt(stateRef.current.classId, stateRef.current.look);
      const hero = art.sprite;
      const bob = Math.floor(t / 500) % 2;
      const hx = Math.round(w * 0.22);
      const hy = bg.floorY - height(hero) + 2 + bob;
      ctx.fillStyle = "#00000066";
      ctx.fillRect(hx + 2, bg.floorY + 1, width(hero) - 4, 2);
      if (art.aura) {
        ctx.fillStyle = art.aura === "legendary" ? "#ffc93c" : "#b46cff";
        ctx.globalAlpha = 0.35 + Math.sin(t / 260) * 0.15;
        ctx.fillRect(hx, bg.floorY + 1, width(hero), 1);
        ctx.globalAlpha = 1;
        const life = (t / 70) % 14;
        ctx.fillRect(hx + 2 + ((Math.floor(t / 300) * 5) % (width(hero) - 4)), bg.floorY - life, 1, 1);
      }
      drawSprite(ctx, hero, hx, hy, 1);
      if (art.weaponTier !== "none" && art.weaponTier !== "common") {
        // Weapon glint: a bright pixel travelling over the blade/orb, colored by rarity.
        const box = art.weapon;
        const k = Math.floor(t / 90) % (box.w + box.h);
        ctx.fillStyle = tierColor(art.weaponTier);
        ctx.globalAlpha = 0.9;
        ctx.fillRect(hx + box.x + Math.min(k, box.w - 1), hy + box.y + Math.max(0, k - box.w), 1, 1);
        ctx.globalAlpha = 1;
        if (art.weaponTier === "legendary" && Math.floor(t / 120) % 2) {
          ctx.fillStyle = "#ffd06a";
          ctx.fillRect(hx + box.x + (Math.floor(t / 60) % box.w), hy + box.y - 1 - (Math.floor(t / 80) % 4), 1, 1);
        }
      }

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
