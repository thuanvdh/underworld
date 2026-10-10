import type { RewardSummary } from "../api.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { short, t } from "../i18n.ts";
import { ItemIcon } from "./ItemIcon.tsx";

export function LootRow({ rewards }: { rewards: RewardSummary }) {
  return (
    <>
      <div className="reward-line">
        {rewards.gold > 0 && (
          <span>
            <SpriteImg sprite={ICONS.coin} scale={1} /> +{short(rewards.gold)}
          </span>
        )}
        {rewards.exp > 0 && <span style={{ color: "var(--heal)" }}>+{short(rewards.exp)} EXP</span>}
        {rewards.stones > 0 && <span className="muted">+{rewards.stones} stones</span>}
        {rewards.dust > 0 && <span className="muted">+{rewards.dust} dust</span>}
        {rewards.gems > 0 && (
          <span>
            <SpriteImg sprite={ICONS.gem} scale={1} /> +{rewards.gems}
          </span>
        )}
      </div>
      {rewards.items.length > 0 && (
        <div className="loot">
          {rewards.items.map((it) => (
            <ItemIcon key={it.id} item={it} size="md" />
          ))}
        </div>
      )}
      {rewards.levelTo > rewards.levelFrom && (
        <div className="pixel" style={{ textAlign: "center", color: "var(--heal)", fontSize: 18 }}>
          {t("battle.levelUp", { level: rewards.levelTo })}
        </div>
      )}
    </>
  );
}

export function RewardSheet({ rewards, onClose }: { rewards: RewardSummary; onClose: () => void }) {
  return (
    <div className="backdrop modal-center" onClick={onClose}>
      <div className="panel sheet" onClick={(e) => e.stopPropagation()}>
        <LootRow rewards={rewards} />
        <button className="btn primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
