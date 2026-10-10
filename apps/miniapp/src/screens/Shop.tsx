import { useCallback, useEffect, useState } from "react";
import { api, type RewardSummary, type ShopState } from "../api.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { RewardSheet } from "../components/RewardSheet.tsx";
import { short } from "../i18n.ts";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

/** Gem shop: Abyss Chest, energy, instant AFK and daily deals. Stars top-ups come later. */
export function Shop() {
  const { player, setPlayer, run } = useGame();
  const [shop, setShop] = useState<ShopState | null>(null);
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const [opening, setOpening] = useState(false);

  const reload = useCallback(async () => {
    const s = await run(api.shop);
    if (s) setShop(s);
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);

  const buy = async (fn: () => ReturnType<typeof api.buyEnergy>, chest = false) => {
    if (chest) setOpening(true);
    const r = await run(fn);
    if (chest) window.setTimeout(() => setOpening(false), 450);
    if (!r) return;
    haptic(chest ? "heavy" : "success");
    setPlayer(r.player);
    window.setTimeout(() => setReward(r.rewards), chest ? 450 : 0);
    reload();
  };

  if (!shop) return <div className="locked-screen">…</div>;
  const pityLeft = shop.chest.pityAt - shop.chest.pity;

  return (
    <div className="screen">
      <div className="panel row">
        <span className="label">Gem shop</span>
        <span className="chip">
          <SpriteImg sprite={ICONS.gem} scale={1} />
          {player.gems.toLocaleString("en-US")}
        </span>
      </div>

      <div className="panel chest-card">
        <div className="label" style={{ textAlign: "center" }}>
          Abyss Chest
        </div>
        <div className={`chest-art ${opening ? "opening" : ""}`}>
          <SpriteImg sprite={ICONS.chest} scale={5} />
        </div>
        <div className="muted" style={{ textAlign: "center", fontSize: 13 }}>
          Gear for your current hunter, item level = your best floor. Rare 78.5% · Epic 20% · Legendary 1.5%.
        </div>
        <div className="row" style={{ fontSize: 12 }}>
          <span className="muted pixel">Legendary guaranteed in</span>
          <span className="pixel r-legendary">{pityLeft}</span>
        </div>
        <div className="vault-bar" style={{ marginTop: 0 }}>
          <div style={{ width: `${(shop.chest.pity / shop.chest.pityAt) * 100}%`, background: "repeating-linear-gradient(90deg, #ff7a1a 0 6px, #ffc93c 6px 8px)" }} />
        </div>
        <div className="row">
          {shop.chest.freeLeft > 0 ? (
            <button className="btn wide" onClick={() => buy(() => api.openChest(1, true), true)}>
              Free ×1
              <i className="red-dot" />
            </button>
          ) : (
            <button className="btn wide" disabled={player.gems < shop.chest.single} onClick={() => buy(() => api.openChest(1), true)}>
              ×1 · <SpriteImg sprite={ICONS.gem} scale={1} /> {shop.chest.single}
            </button>
          )}
          <button className="btn primary wide" disabled={player.gems < shop.chest.ten} onClick={() => buy(() => api.openChest(10), true)}>
            ×10 · <SpriteImg sprite={ICONS.gem} scale={1} /> {short(shop.chest.ten)}
          </button>
        </div>
        <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>
          ×10 always contains at least one Epic.
        </div>
      </div>

      <div className="panel shop-row">
        <SpriteImg sprite={ICONS.bolt} scale={3} />
        <div className="grow">
          <div className="pixel">+{shop.energy.amount} Energy</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {shop.energy.left} left today
          </div>
        </div>
        <button className="btn small" disabled={shop.energy.nextPrice === null || player.gems < (shop.energy.nextPrice ?? 0)} onClick={() => buy(api.buyEnergy)}>
          {shop.energy.nextPrice === null ? (
            "Sold out"
          ) : (
            <>
              <SpriteImg sprite={ICONS.gem} scale={1} /> {shop.energy.nextPrice}
            </>
          )}
        </button>
      </div>

      <div className="panel shop-row">
        <SpriteImg sprite={ICONS.chest} scale={2} />
        <div className="grow">
          <div className="pixel">Instant AFK · {shop.afk.hours}h</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {shop.afk.unlocked ? `+${short(shop.afk.gold)} gold · +${short(shop.afk.exp)} EXP · ${shop.afk.left} left today` : "Unlocks with the AFK Vault (Lv 7)"}
          </div>
        </div>
        <button
          className="btn small"
          disabled={!shop.afk.unlocked || shop.afk.nextPrice === null || player.gems < (shop.afk.nextPrice ?? 0)}
          onClick={() => buy(api.instantAfk)}
        >
          {shop.afk.nextPrice === null ? (
            "Sold out"
          ) : shop.afk.nextPrice === 0 ? (
            <>
              Free
              {shop.afk.unlocked && <i className="red-dot" />}
            </>
          ) : (
            <>
              <SpriteImg sprite={ICONS.gem} scale={1} /> {shop.afk.nextPrice}
            </>
          )}
        </button>
      </div>

      <div className="label small">Daily deals</div>
      {shop.deals.map((d) => (
        <div key={d.id} className="panel shop-row">
          <SpriteImg sprite={d.id === "stones" ? ICONS.hammer : ICONS.gem} scale={2} />
          <div className="grow">
            <div className="pixel">{d.title}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {d.left} left today
            </div>
          </div>
          <button className="btn small" disabled={d.left === 0 || player.gems < d.price} onClick={() => buy(() => api.buyDeal(d.id))}>
            {d.left === 0 ? (
              "Sold out"
            ) : (
              <>
                <SpriteImg sprite={ICONS.gem} scale={1} /> {d.price}
              </>
            )}
          </button>
        </div>
      ))}

      <div className="panel muted" style={{ textAlign: "center", fontSize: 13 }}>
        Gem packs with Telegram Stars are coming soon. For now, earn gems from daily quests, weekly quests and the login calendar.
      </div>

      {reward && <RewardSheet rewards={reward} onClose={() => setReward(null)} />}
    </div>
  );
}
