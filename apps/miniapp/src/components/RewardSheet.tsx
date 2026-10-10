import { useEffect, useMemo } from "react";
import type { Item } from "@underworld/shared";
import type { RewardSummary } from "../api.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { useCountUp } from "../hooks/useCountUp.ts";
import { short, t } from "../i18n.ts";
import { haptic } from "../telegram.ts";
import { ItemIcon } from "./ItemIcon.tsx";

const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;
const SPARK_COLORS = { epic: ["#d9b0ff", "#b46cff", "#ffffff"], legendary: ["#fff3c4", "#ffc93c", "#ff7a1a"] } as const;
const STEP_MS = 220;

export function hasLegendary(r: RewardSummary): boolean {
  return r.items.some((i) => i.rarity === "legendary");
}

/** Rewards with a staggered loot reveal: each drop pops in with a beam whose height grows with rarity. */
export function LootRow({ rewards }: { rewards: RewardSummary }) {
  const gold = useCountUp(rewards.gold, 700);
  const exp = useCountUp(rewards.exp, 700);
  // Best drops last, so the reveal builds up.
  const items = useMemo(() => [...rewards.items].sort((a, b) => RANK[a.rarity] - RANK[b.rarity]), [rewards.items]);
  const legendaryAt = items.findIndex((i) => i.rarity === "legendary");

  useEffect(() => {
    const timers = items.map((it, i) =>
      window.setTimeout(() => {
        if (it.rarity === "legendary") haptic("success");
        else if (RANK[it.rarity] >= 2) haptic("heavy");
        else haptic("light");
      }, 200 + i * STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [items]);

  return (
    <>
      <div className="reward-line">
        {rewards.gold > 0 && (
          <span>
            <SpriteImg sprite={ICONS.coin} scale={1} /> +{short(gold)}
          </span>
        )}
        {rewards.exp > 0 && <span style={{ color: "var(--heal)" }}>+{short(exp)} EXP</span>}
        {rewards.stones > 0 && <span className="muted">+{rewards.stones} stones</span>}
        {rewards.dust > 0 && <span className="muted">+{rewards.dust} dust</span>}
        {rewards.gems > 0 && (
          <span>
            <SpriteImg sprite={ICONS.gem} scale={1} /> +{rewards.gems}
          </span>
        )}
      </div>
      {items.length > 0 && (
        <div className="loot" style={{ paddingTop: items.some((i) => RANK[i.rarity] >= 3) ? 30 : 4 }}>
          {items.map((it, i) => (
            <Drop key={it.id} item={it} delay={200 + i * STEP_MS} size={items.length > 4 ? "sm" : "md"} />
          ))}
        </div>
      )}
      {legendaryAt >= 0 && <div className="legend-flash" style={{ animationDelay: `${200 + legendaryAt * STEP_MS}ms` }} />}
      {rewards.levelTo > rewards.levelFrom && (
        <div className="levelup">
          <b>{t("battle.levelUp", { level: rewards.levelTo }).split("!")[0]}!</b>
          <span>Lv {rewards.levelTo}</span>
        </div>
      )}
    </>
  );
}

function Drop({ item, delay, size }: { item: Item; delay: number; size: "sm" | "md" }) {
  const sparks = useMemo(() => {
    const colors = item.rarity === "legendary" ? SPARK_COLORS.legendary : item.rarity === "epic" ? SPARK_COLORS.epic : null;
    if (!colors) return [];
    return Array.from({ length: item.rarity === "legendary" ? 14 : 8 }, (_, i) => {
      const ang = (i / (item.rarity === "legendary" ? 14 : 8)) * Math.PI * 2;
      const r = 36 + Math.random() * 22;
      return { x: Math.cos(ang) * r, y: Math.sin(ang) * r - 10, d: (Math.random() * 0.9).toFixed(2), c: colors[i % colors.length]! };
    });
  }, [item.rarity]);
  return (
    <div className={`drop ${item.rarity}`} style={{ animationDelay: `${delay}ms` }}>
      {item.rarity !== "common" && <div className="beam" style={{ animationDelay: `${delay}ms` }} />}
      <ItemIcon item={item} size={size} />
      {sparks.map((s, i) => (
        <i key={i} className="spark" style={{ ["--x" as string]: `${s.x}px`, ["--y" as string]: `${s.y}px`, ["--d" as string]: `${s.d}s`, ["--c" as string]: s.c }} />
      ))}
    </div>
  );
}

export function RewardSheet({ rewards, onClose }: { rewards: RewardSummary; onClose: () => void }) {
  return (
    <div className="backdrop modal-center" onClick={onClose}>
      <div className={`panel sheet ${hasLegendary(rewards) ? "shake" : ""}`} style={{ animationDelay: "0.4s" }} onClick={(e) => e.stopPropagation()}>
        <LootRow rewards={rewards} />
        <button className="btn primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
