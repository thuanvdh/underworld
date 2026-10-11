import type { Reward } from "@underworld/shared";
import { ICONS, itemSprite } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { short } from "../i18n.ts";

/** Compact one-line view of a reward definition (quests, calendar). */
export function RewardChips({ reward, big }: { reward: Reward; big?: boolean }) {
  const s = big ? 2 : 1;
  return (
    <span className="reward-chips">
      {reward.gems ? (
        <span>
          <SpriteImg sprite={ICONS.gem} scale={s} />
          {short(reward.gems)}
        </span>
      ) : null}
      {reward.gold ? (
        <span>
          <SpriteImg sprite={ICONS.coin} scale={s} />
          {short(reward.gold)}
        </span>
      ) : null}
      {reward.stones ? <span>{reward.stones} stones</span> : null}
      {reward.crystals ? <span>{reward.crystals} crystals</span> : null}
      {reward.energy ? (
        <span>
          <SpriteImg sprite={ICONS.bolt} scale={s} />
          {reward.energy}
        </span>
      ) : null}
      {reward.chestPulls ? (
        <span>
          <SpriteImg sprite={ICONS.chest} scale={s} />×{reward.chestPulls}
        </span>
      ) : null}
      {reward.item ? (
        <span className={`r-${reward.item.rarity}`}>
          <SpriteImg sprite={itemSprite(reward.item.slot ?? "armor", reward.item.rarity === "legendary", undefined, reward.item.rarity)} scale={s} />
          {reward.item.rarity === "legendary" ? "Legendary" : "Epic"}
        </span>
      ) : null}
    </span>
  );
}

/** "3h 12m" countdown text. */
export function countdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${String(m).padStart(2, "0")}m`;
}
