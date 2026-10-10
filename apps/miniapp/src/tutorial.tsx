import { useEffect, useState } from "react";
import { UNLOCK_LEVEL } from "@underworld/shared";
import { FINGER, ICONS, itemSprite, navSprite } from "./art/sprites/icons.ts";
import type { Sprite } from "./art/pixel.ts";
import { SpriteImg } from "./art/Sprite.tsx";

/**
 * Pointing hand + speech bubble anchored to an on-screen element (found by CSS selector).
 * Purely visual: it never blocks taps, so the player presses the real button underneath.
 */
export function Coach({ target, text, place = "above" }: { target: string; text: string; place?: "above" | "below" }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    let raf = 0;
    const track = () => {
      const el = document.querySelector(target);
      setRect((prev) => {
        const next = el?.getBoundingClientRect() ?? null;
        if (!next || !prev) return next;
        return Math.abs(next.x - prev.x) + Math.abs(next.y - prev.y) + Math.abs(next.width - prev.width) > 0.5 ? next : prev;
      });
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!rect) return null;

  const cx = rect.left + rect.width / 2;
  const fingerTop = place === "above" ? rect.top - 52 : rect.bottom + 6;
  const bubbleTop = place === "above" ? rect.top - 104 : rect.bottom + 62;
  return (
    <div className="coach" aria-live="polite">
      <div className="coach-ring" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div className="coach-finger" style={{ left: cx - 14, top: fingerTop, transform: place === "above" ? "scaleY(-1)" : undefined }}>
        <SpriteImg sprite={FINGER} scale={3} />
      </div>
      <div className="coach-bubble panel" style={{ top: bubbleTop, left: Math.max(12, Math.min(window.innerWidth - 252, cx - 120)) }}>
        {text}
      </div>
    </div>
  );
}

export interface Unlock {
  level: number;
  id: "enhance" | "boons" | "afk" | "auto" | "speed";
  title: string;
  npc: string;
  line: string;
  text: string;
  icon: Sprite;
  /** Tab to open on "Show me", if any. */
  go?: "hero" | "abyss";
}

/** Features that open up with level (GDD §6.2), each introduced by an NPC. Only shipped features are listed. */
export const UNLOCKS: Unlock[] = [
  {
    level: UNLOCK_LEVEL.enhance,
    id: "enhance",
    title: "Forge unlocked",
    npc: "OLD RUSTY",
    line: "Bring me your gear, kid. A few stones and some gold, and that junk becomes a weapon.",
    text: "Enhance items up to +15. +1 to +9 always succeed; failures later fill your Luck meter.",
    icon: ICONS.hammer,
    go: "hero",
  },
  {
    level: UNLOCK_LEVEL.autoBattle,
    id: "auto",
    title: "Auto battle unlocked",
    npc: "THREE-SCARS",
    line: "You've proven you can swing. Let your instincts fight for you when you're busy.",
    text: "Tap Auto in battle: skills fire as soon as they're ready (no Perfect bonus) and boons are picked for you.",
    icon: ICONS.sword,
  },
  {
    level: UNLOCK_LEVEL.boons,
    id: "boons",
    title: "Boons unlocked",
    npc: "KAT",
    line: "Down there the Abyss whispers gifts. Pick one after every wave — they last the whole run.",
    text: "Choose 1 of 3 boons after each wave. Rarer boons are stronger.",
    icon: itemSprite("amulet"),
  },
  {
    level: UNLOCK_LEVEL.afk,
    id: "afk",
    title: "AFK Vault unlocked",
    npc: "KAT",
    line: "Your hunter keeps digging while you sleep. Come back and empty the vault.",
    text: "Gold, EXP, stones and gear pile up for 12 hours. Tap the chest or Claim to collect.",
    icon: ICONS.chest,
    go: "abyss",
  },
  {
    level: UNLOCK_LEVEL.speedX2,
    id: "speed",
    title: "Battle speed ×2",
    npc: "THREE-SCARS",
    line: "No time to waste down there. Twice the pace, same blood.",
    text: "Tap ×1 in battle to switch to ×2 speed. Results are exactly the same — only faster.",
    icon: ICONS.bolt,
  },
];

/** Feature-unlock card: NPC line, what it does, and a shortcut to it. */
export function UnlockModal({ unlock, onClose, onGo }: { unlock: Unlock; onClose: () => void; onGo: () => void }) {
  return (
    <div className="backdrop modal-center">
      <div className="panel sheet unlock-card">
        <div className="label small" style={{ textAlign: "center", color: "var(--heal)" }}>
          New feature · Lv {unlock.level}
        </div>
        <div className="unlock-icon">
          <SpriteImg sprite={unlock.icon} scale={4} />
        </div>
        <div className="title" style={{ fontSize: 24 }}>
          {unlock.title}
        </div>
        <div className="npc-line">
          <b className="pixel">{unlock.npc}</b>
          <span>“{unlock.line}”</span>
        </div>
        <div className="muted" style={{ textAlign: "center", fontSize: 13 }}>
          {unlock.text}
        </div>
        <div className="row">
          <button className="btn wide" onClick={onClose}>
            Later
          </button>
          {unlock.go && (
            <button className="btn primary wide" onClick={onGo}>
              Show me
            </button>
          )}
          {!unlock.go && (
            <button className="btn primary wide" onClick={onClose}>
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { navSprite };
