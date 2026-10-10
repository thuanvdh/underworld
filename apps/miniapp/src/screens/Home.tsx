import { useEffect, useMemo, useState } from "react";
import { ILVL_OVER_LEVEL, MAX_FLOOR, SLOTS, UNLOCK_LEVEL, buildHero, chapterOf, enhanceCost, isChapterBossFloor, power, type Equipment, type Item } from "@underworld/shared";
import { api, type RewardSummary } from "../api.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { RewardSheet } from "../components/RewardSheet.tsx";
import { SceneView } from "../components/SceneView.tsx";
import { SLOT_NAMES, short, t } from "../i18n.ts";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

export const CHAPTER_NAMES: Record<string, string> = {
  sewers: "The Sewers",
  iron_graveyard: "Iron Graveyard",
  ghost_market: "Ghost Market",
  foundry: "The Foundry",
  fungal_depths: "Fungal Depths",
  abyss_throne: "Abyss Throne",
};

type Goal = { text: string; up?: string; action: "hero" | "fight" };

export function Home({ onFight, onOpenHero }: { onFight: (floor: number) => void; onOpenHero: () => void }) {
  const { player, setPlayer, run } = useGame();
  const [reward, setReward] = useState<RewardSummary | null>(null);
  const [floorsOpen, setFloorsOpen] = useState(false);
  const [gear, setGear] = useState<{ equipped: Equipment; bag: Item[] } | null>(null);
  const next = Math.min(MAX_FLOOR, player.highestFloor + 1);
  const allCleared = player.highestFloor >= MAX_FLOOR;
  const chapter = chapterOf(next);
  const free = next <= 15 && player.serverTime < player.newbieFreeUntil;

  useEffect(() => {
    run(api.items).then((g) => g && setGear(g));
  }, [player.level, player.highestFloor, player.gold, run]);

  const goal = useMemo((): Goal => nextGoal(player, gear, next), [player, gear, next]);

  const claim = async () => {
    if (!player.afk.unlocked || player.afk.gold === 0) return;
    const r = await run(api.claimAfk);
    if (!r) return;
    haptic("success");
    setPlayer(r.player);
    setReward(r.rewards);
  };

  const afkFull = player.afk.hours >= player.afk.maxHours - 0.01;
  const hours = Math.floor(player.afk.hours);
  const minutes = Math.floor((player.afk.hours - hours) * 60);

  return (
    <div className="screen">
      {free && (
        <div className="panel banner">
          <SpriteImg sprite={ICONS.coin} scale={1} />
          <b>Newbie Rush</b>
          <span className="muted">· floors 1–15 cost no energy · ends in {formatLeft(player.newbieFreeUntil - player.serverTime)}</span>
        </div>
      )}

      <div className="scene">
        <SceneView chapter={chapter.key} classId={player.classId} chestReady={player.afk.unlocked && player.afk.gold > 0} onChest={claim} />
        <div className="tag">
          CH.{chapter.number} · {CHAPTER_NAMES[chapter.key]}
        </div>
      </div>

      <div className="panel gold-rim">
        <div className="row">
          <span className="label">AFK Vault</span>
          {player.afk.unlocked && player.highestFloor > 0 ? (
            <span className="pixel" style={{ color: afkFull ? "var(--gold)" : "var(--muted)", fontSize: 13 }}>
              {afkFull ? "FULL · " : ""}
              {hours}h {String(minutes).padStart(2, "0")}m
            </span>
          ) : null}
          <button className="btn small" onClick={claim} disabled={!player.afk.unlocked || player.afk.gold === 0}>
            {t("afk.claim")}
            {afkFull && <i className="red-dot" />}
          </button>
        </div>
        {!player.afk.unlocked ? (
          <div className="muted" style={{ marginTop: 6 }}>{t("afk.locked", { level: UNLOCK_LEVEL.afk })}</div>
        ) : (
          <>
            <div className="vault-bar">
              <div style={{ width: `${(player.afk.hours / player.afk.maxHours) * 100}%` }} />
            </div>
            {player.afk.gold > 0 && (
              <div className="muted pixel" style={{ fontSize: 12, marginTop: 6 }}>
                +{short(player.afk.gold)} gold · +{short(player.afk.exp)} exp · +{player.afk.stones} stones · {player.afk.items} drops
              </div>
            )}
          </>
        )}
      </div>

      <button className="panel next-goal" onClick={() => (goal.action === "hero" ? onOpenHero() : onFight(next))}>
        <span className="muted">Next:</span>
        <b className="grow" style={{ flex: 1 }}>
          {goal.text} {goal.up && <span className="up">{goal.up} ▲</span>}
        </b>
        <span className="muted pixel">›</span>
      </button>

      <button className="btn primary big" disabled={allCleared} onClick={() => onFight(next)}>
        <SpriteImg sprite={ICONS.descend} scale={2} />
        {allCleared ? t("home.cleared") : `DESCEND — Floor ${next}`}
      </button>
      {free && !allCleared && <div className="muted pixel" style={{ textAlign: "center", fontSize: 12, marginTop: -4 }}>{t("home.free")}</div>}

      <div className="quick">
        <button className="btn" onClick={() => setFloorsOpen(true)}>
          <SpriteImg sprite={ICONS.stairs} scale={2} /> Floors
        </button>
        <button className="btn" onClick={onOpenHero}>
          <SpriteImg sprite={ICONS.bag} scale={2} /> Bag
          {gear && gear.bag.length > 0 && <i className="red-dot" />}
        </button>
        <button className="btn" onClick={onOpenHero}>
          <SpriteImg sprite={ICONS.hammer} scale={2} /> Forge
        </button>
      </div>

      {floorsOpen && <FloorSheet onClose={() => setFloorsOpen(false)} onFight={onFight} onReward={setReward} />}
      {reward && <RewardSheet rewards={reward} onClose={() => setReward(null)} />}
    </div>
  );
}

function nextGoal(player: ReturnType<typeof useGame>["player"], gear: { equipped: Equipment; bag: Item[] } | null, next: number): Goal {
  if (gear) {
    const equipped = SLOTS.map((s) => gear.equipped[s]).filter((it): it is Item => !!it);
    const upgradable = equipped
      .filter((it) => {
        const c = enhanceCost(it);
        return c && c.gold <= player.gold && c.stones <= player.stones;
      })
      .sort((a, b) => a.enhance - b.enhance)[0];
    if (upgradable) return { text: `Upgrade ${SLOT_NAMES[upgradable.slot]} to`, up: `+${upgradable.enhance + 1}`, action: "hero" };

    const better = gear.bag.find((it) => {
      if (it.ilvl > player.level + ILVL_OVER_LEVEL) return false;
      const swapped = { ...gear.equipped, [it.slot]: it };
      return power(buildHero(player.classId, player.level, swapped).stats) > player.power;
    });
    if (better) return { text: `Equip a better ${SLOT_NAMES[better.slot]}`, action: "hero" };
  }
  if (next > player.highestFloor) return { text: `Clear Floor ${next}${isChapterBossFloor(next) ? " — chapter boss" : ""}`, action: "fight" };
  return { text: "Push the Endless Depths", action: "fight" };
}

function formatLeft(ms: number): string {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function FloorSheet({ onClose, onFight, onReward }: { onClose: () => void; onFight: (f: number) => void; onReward: (r: RewardSummary) => void }) {
  const { player, setPlayer, run } = useGame();
  const [stars, setStars] = useState<Record<string, number>>({});
  const next = Math.min(MAX_FLOOR, player.highestFloor + 1);
  const [view, setView] = useState(Math.ceil(next / 10));

  useEffect(() => {
    run(api.dungeon).then((d) => d && setStars(d.stars));
  }, [run, player.highestFloor]);

  const sweep = async (floor: number) => {
    const r = await run(() => api.sweep(floor, 1));
    if (!r) return;
    setPlayer(r.player);
    onReward(r.rewards);
  };

  const floors = Array.from({ length: 10 }, (_, i) => (view - 1) * 10 + i + 1);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="panel sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <button className="btn small" disabled={view <= 1} onClick={() => setView(view - 1)}>
            ◀
          </button>
          <span className="label">
            CH.{view} · {CHAPTER_NAMES[chapterOf(view * 10).key]}
          </span>
          <button className="btn small" disabled={view >= Math.ceil(next / 10)} onClick={() => setView(view + 1)}>
            ▶
          </button>
        </div>
        <div className="floor-grid">
          {floors.map((f) => {
            const s = stars[f] ?? 0;
            const locked = f > next;
            return (
              <button
                key={f}
                className={[isChapterBossFloor(f) ? "boss" : "", f === next ? "current" : ""].join(" ")}
                disabled={locked}
                onClick={() => {
                  if (s === 3) sweep(f);
                  else {
                    onClose();
                    onFight(f);
                  }
                }}
              >
                {locked ? <SpriteImg sprite={ICONS.lock} scale={2} /> : f}
                <div className="stars">
                  {!locked && [0, 1, 2].map((i) => <SpriteImg key={i} sprite={i < s ? ICONS.star : ICONS.starEmpty} scale={1} />)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          3 stars → tap to sweep instantly (−10 energy). Bordered floors are chapter bosses.
        </div>
      </div>
    </div>
  );
}
