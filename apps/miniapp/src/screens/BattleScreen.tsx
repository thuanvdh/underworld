import { useEffect, useRef, useState } from "react";
import { BOONS, MAX_FLOOR, type BoonId } from "@underworld/shared";
import { Battle, type BattleResult, type SkillQuality } from "@underworld/combat";
import { api, type RewardSummary } from "../api.ts";
import { BattleRenderer } from "../battle/renderer.ts";
import { LootRow } from "../components/RewardSheet.tsx";
import { BOON_TEXT, RAGE_SKILL_TEXT, itemName, t } from "../i18n.ts";
import { Coach } from "../tutorial.tsx";
import { ICONS, RAGE_SKILL_ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";
import { ILVL_OVER_LEVEL, RAGE_SKILL_LEVELS, UNLOCK_LEVEL, buildHero, chapterOf, power, type Item } from "@underworld/shared";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

const TICK_MS = 50;
/** Ring tick at which a press lands dead-centre (engine: Perfect = phase 20–22). */
const PERFECT_PHASE = 21;

const MECHANIC_TEXT: Record<string, string> = {
  summon_rats: "The Rat King calls his brood!",
  shield_broken: "Shield shattered!",
  charge_start: "The Golem is charging — hit it with your skill!",
  charge_interrupted: "Charge interrupted!",
  slam: "SLAM!",
  spore_explode: "Spore burst!",
  summon_knights: "Hollow Knights rise!",
  enrage: "The Warden is enraged!",
};

function readSetting(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: setting just won't persist */
  }
}

export function BattleScreen({ floor, onExit }: { floor: number; onExit: (nextFloor?: number) => void }) {
  const { player, setPlayer, run } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  usePixelCanvas(stageRef, canvasRef, { targetPixelWidth: 210, fillHeight: true });
  const battleRef = useRef<Battle | null>(null);
  const battleIdRef = useRef("");
  /** Rage skill tapped since the last tick, if any. */
  const pressRef = useRef<number | null>(null);
  // Tutorial (GDD §14.2): the very first fight teaches the skill button; the floor 3 boss teaches Perfect.
  const firstFight = useRef(floor === 1 && player.highestFloor === 0).current;
  const shieldLesson = useRef(floor === 3 && player.highestFloor < 3).current;
  const coachRef = useRef<"idle" | "show" | "done">(firstFight ? "idle" : "done");
  const [coaching, setCoaching] = useState(false);
  const [equipOffer, setEquipOffer] = useState<{ item: Item; gain: number; done: boolean } | null>(null);
  // Auto and ×2 are earned: below their unlock level the saved preference is ignored.
  const autoUnlocked = player.level >= UNLOCK_LEVEL.autoBattle;
  const speedUnlocked = player.level >= UNLOCK_LEVEL.speedX2;
  const autoRef = useRef(autoUnlocked && readSetting("uw-auto", "0") === "1");
  const speedRef = useRef(speedUnlocked ? Number(readSetting("uw-speed", "1")) : 1);
  const [auto, setAuto] = useState(autoRef.current);
  const [speed, setSpeed] = useState(speedRef.current);
  const [offer, setOffer] = useState<BoonId[] | null>(null);
  const [quality, setQuality] = useState<{ q: SkillQuality; at: number } | null>(null);
  const [outcome, setOutcome] = useState<{ result: BattleResult; rewards: RewardSummary } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    let last = performance.now();
    let acc = 0;
    let renderer: BattleRenderer | null = null;
    let endedAt = 0;
    let lessonUntil = 0;
    let shieldTaught = false;
    if (firstFight) autoRef.current = false;

    const finish = async (battle: Battle) => {
      setFinishing(true);
      const res = await run(() => api.finishDungeon(battleIdRef.current, battle.result!.inputs));
      if (cancelled) return;
      setFinishing(false);
      if (!res) {
        onExit();
        return;
      }
      setPlayer(res.player);
      setOutcome({ result: res.result, rewards: res.rewards });
      // Offer to equip the best new drop for the class being played.
      const gear = await run(api.items);
      if (gear && !cancelled) {
        let best: { item: Item; gain: number } | null = null;
        for (const it of res.rewards.items) {
          if (it.classId !== res.player.classId || it.ilvl > res.player.level + ILVL_OVER_LEVEL) continue;
          const gain = power(buildHero(res.player.classId, res.player.level, { ...gear.equipped, [it.slot]: it }).stats) - res.player.power;
          if (gain > 0 && (!best || gain > best.gain)) best = { item: it, gain };
        }
        if (best) setEquipOffer({ ...best, done: false });
      }
      haptic(res.result.victory ? "success" : "error");
    };

    const frame = (now: number) => {
      const battle = battleRef.current;
      if (!battle || !renderer || cancelled) return;
      // Hit-stop freezes sim time, slow-mo stretches the finishing blow; the renderer decides.
      const lesson = coachRef.current === "show" ? 0.12 : now < lessonUntil ? 0.3 : 1;
      acc += Math.min(250, now - last) * speedRef.current * renderer.timeScale(now) * lesson;
      last = now;

      while (acc >= TICK_MS && battle.phase === "fighting") {
        acc -= TICK_MS;
        const skill = battle.skillState();
        if (coachRef.current === "idle" && skill.ready) {
          coachRef.current = "show";
          setCoaching(true);
        }
        const press = pressRef.current ?? (autoRef.current && skill.ready ? battle.autoSkillPick() : false);
        if (press !== false && coachRef.current === "show") {
          coachRef.current = "done";
          setCoaching(false);
        }
        pressRef.current = null;
        const before = battle.events.length;
        battle.step(press);
        for (const e of battle.events.slice(before)) {
          renderer.handle(e, now);
          if (shieldLesson && !shieldTaught && e.kind === "shield") {
            shieldTaught = true;
            lessonUntil = now + 2200;
            renderer.showBanner("SHIELD! Land a PERFECT skill to shatter it", now);
          }
          if (e.kind === "skill" && e.src === renderer.heroUid) {
            if (e.index > 0) renderer.showBanner(RAGE_SKILL_TEXT[player.classId][e.index]!.name.toUpperCase(), now);
            if (e.quality !== "normal") {
              setQuality({ q: e.quality, at: now });
              haptic("heavy");
            }
          } else if (e.kind === "damage" && e.crit && e.dst !== renderer.heroUid) {
            haptic("light");
          } else if (e.kind === "mechanic") {
            const text = MECHANIC_TEXT[e.what] ?? (e.what.startsWith("steal_") ? "The Debt Collector stole a boon!" : "");
            if (text) renderer.showBanner(text, now);
          }
        }
        battle.events.length = 0;
      }

      if (battle.phase === "boonChoice") {
        acc = 0; // time doesn't pass while the player is choosing
        if (autoRef.current) battle.chooseBoon(battle.autoBoonPick());
        else setOffer((o) => o ?? [...battle.boonOffer]);
      }

      renderer.draw(battle.snapshot, battle.tick, now);
      setFrame((n) => (n + 1) % 1_000_000);

      if (battle.ended) {
        // Let the finishing blow, dissolve and coin shower play out before the result card.
        if (!endedAt) endedAt = now;
        if (now - endedAt > 1100) {
          finish(battle);
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    (async () => {
      const res = await run(() => api.startDungeon(floor));
      if (cancelled) return;
      if (!res || !canvasRef.current) {
        onExit();
        return;
      }
      setPlayer(res.player);
      battleIdRef.current = res.battleId;
      battleRef.current = new Battle(res.setup, { recordEvents: true });
      renderer = new BattleRenderer(canvasRef.current, chapterOf(floor).key, res.setup.hero.classId, res.player.look);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // The battle runs once per mounted floor; callbacks are stable enough for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  const battle = battleRef.current;
  const skill = battle?.skillState() ?? { ready: false, ringPhase: 0, energy: 0 };
  const pick = (i: number) => {
    battleRef.current?.chooseBoon(i);
    setOffer(null);
  };
  const toggleAuto = () => {
    if (!autoUnlocked) return;
    autoRef.current = !autoRef.current;
    setAuto(autoRef.current);
    writeSetting("uw-auto", autoRef.current ? "1" : "0");
  };
  const toggleSpeed = () => {
    if (!speedUnlocked) return;
    speedRef.current = speedRef.current === 1 ? 2 : 1;
    setSpeed(speedRef.current);
    writeSetting("uw-speed", String(speedRef.current));
  };

  // Ring shrinks onto the button edge exactly at the Perfect tick, then loops.
  const ringSize = 64 + Math.max(-6, ((PERFECT_PHASE - skill.ringPhase) / PERFECT_PHASE) * 22);
  const showQuality = quality && performance.now() - quality.at < 700;
  const won = outcome?.result.victory;
  const nextFloor = won && floor < MAX_FLOOR ? floor + 1 : undefined;

  const rageCount = battle?.rageSkillCount ?? 1;

  return (
    <div className="battle">
      <div className="battle-hud">
        <span className="label">Floor {floor}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="btn small" onClick={toggleSpeed} disabled={!speedUnlocked} title={speedUnlocked ? undefined : `Unlocks at Lv ${UNLOCK_LEVEL.speedX2}`}>
            {!speedUnlocked && <SpriteImg sprite={ICONS.lock} scale={1} />}×{speedUnlocked ? speed : 2}
            {!speedUnlocked && <small className="muted"> Lv{UNLOCK_LEVEL.speedX2}</small>}
          </button>
          {!firstFight && (
            <button
              className={`btn small ${auto ? "on-auto" : ""}`}
              style={auto ? { borderColor: "var(--teal)", color: "var(--teal)" } : undefined}
              onClick={toggleAuto}
              disabled={!autoUnlocked}
              title={autoUnlocked ? undefined : `Unlocks at Lv ${UNLOCK_LEVEL.autoBattle}`}
            >
              {!autoUnlocked && <SpriteImg sprite={ICONS.lock} scale={1} />}
              {t("battle.auto")}
              {!autoUnlocked && <small className="muted"> Lv{UNLOCK_LEVEL.autoBattle}</small>}
            </button>
          )}
        </span>
      </div>

      <div className="battle-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="px" />
      </div>

      <div className="battle-controls">
        <div className="boon-strip">
          {battle?.heroBoons.map((b) => (
            <span key={b} className="boon-chip" title={BOON_TEXT[b].name}>
              {BOON_TEXT[b].icon}
            </span>
          ))}
        </div>
        <div className="rage">
          <div className={`rage-bar ${skill.ready ? "full" : ""}`}>
            <div className="fill" style={{ width: `${skill.energy}%` }} />
            <span>{skill.ready ? (rageCount > 1 ? "RAGE FULL · PICK A SKILL" : "RAGE FULL") : `RAGE ${skill.energy}%`}</span>
          </div>
          <div className="rage-skills">
            {RAGE_SKILL_TEXT[player.classId].map((info, i) => {
              const locked = i >= rageCount;
              const ready = skill.ready && !locked;
              return (
                <div key={info.name} className="skill-wrap">
                  {ready && (!auto || firstFight) && <div className="ring" style={{ width: ringSize, height: ringSize }} />}
                  <button
                    className={`skill-btn ${ready ? "ready" : ""} ${locked ? "locked" : ""}`}
                    disabled={locked}
                    title={locked ? `Unlocks at Lv ${RAGE_SKILL_LEVELS[i]}` : info.desc}
                    onPointerDown={() => {
                      if (ready) pressRef.current = i;
                    }}
                  >
                    {!locked && <div className="fill" style={{ height: `${skill.energy}%` }} />}
                    <SpriteImg sprite={locked ? ICONS.lock : RAGE_SKILL_ICONS[player.classId][i]!} scale={locked ? 2 : 3} />
                  </button>
                  <span className="label small skill-name">{locked ? `Lv ${RAGE_SKILL_LEVELS[i]}` : info.name}</span>
                </div>
              );
            })}
          </div>
          {showQuality && (
            <div className="quality" style={{ color: quality!.q === "perfect" ? "var(--teal)" : "var(--heal)" }}>
              {t(quality!.q === "perfect" ? "quality.perfect" : "quality.good")}
            </div>
          )}
        </div>
      </div>

      {coaching && <Coach target=".skill-btn" text="Your skill is ready! Tap when the ring touches the button edge for a PERFECT hit." />}

            {offer && (
        <div className="backdrop modal-center">
          <div className="panel sheet">
            <div className="label" style={{ textAlign: "center" }}>
              {t("battle.pickBoon")}
            </div>
            <div className="boons">
              {offer.map((b, i) => (
                <button key={b} className={`boon ${BOONS[b]}`} onClick={() => pick(i)}>
                  <span className="icon">{BOON_TEXT[b].icon}</span>
                  <b>{BOON_TEXT[b].name}</b>
                  <span className="muted">{BOON_TEXT[b].desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {finishing && !outcome && (
        <div className="backdrop modal-center">
          <div className="panel sheet label" style={{ textAlign: "center" }}>
            {t("battle.verifying")}
          </div>
        </div>
      )}

      {outcome && (
        <div className="backdrop modal-center">
          <div className="panel sheet">
            <div className="title" style={{ color: won ? "var(--gold)" : "var(--danger)" }}>
              {t(won ? "battle.victory" : "battle.defeat")}
            </div>
            {won && (
              <div className="stars-row">
                {[0, 1, 2].map((i) => (
                  <SpriteImg key={i} sprite={i < outcome.result.stars ? ICONS.star : ICONS.starEmpty} scale={4} />
                ))}
              </div>
            )}
            {!won && (
              <div className="muted" style={{ textAlign: "center" }}>
                {t("battle.consolation")}
              </div>
            )}
            <LootRow rewards={outcome.rewards} />
            {equipOffer && (
              <button
                className={`btn ${equipOffer.done ? "" : "primary"}`}
                disabled={equipOffer.done}
                onClick={async () => {
                  const p = await run(() => api.equip(equipOffer.item.id));
                  if (!p) return;
                  haptic("success");
                  setPlayer(p);
                  setEquipOffer({ ...equipOffer, done: true });
                }}
              >
                {equipOffer.done ? `Equipped ${itemName(equipOffer.item)} ✓` : `EQUIP ${itemName(equipOffer.item).toUpperCase()} · +${equipOffer.gain} POWER`}
              </button>
            )}
            <div className="row">
              <button className="btn wide" onClick={() => onExit()}>
                {t("battle.home")}
              </button>
              <button className={`btn wide ${equipOffer && !equipOffer.done ? "" : "primary"}`} onClick={() => onExit(nextFloor ?? floor)}>
                {nextFloor ? t("battle.next") : t("battle.retry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
