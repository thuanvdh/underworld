import { useEffect, useRef, useState } from "react";
import { BOONS, MAX_FLOOR, type BoonId } from "@underworld/shared";
import { Battle, type BattleResult, type SkillQuality } from "@underworld/combat";
import { api, type RewardSummary } from "../api.ts";
import { BattleRenderer } from "../battle/renderer.ts";
import { LootRow } from "../components/RewardSheet.tsx";
import { BOON_TEXT, SKILL_NAMES, t } from "../i18n.ts";
import { ICONS, itemSprite } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";
import { chapterOf } from "@underworld/shared";
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
  usePixelCanvas(stageRef, canvasRef, { targetPixelWidth: 110, fillHeight: true });
  const battleRef = useRef<Battle | null>(null);
  const battleIdRef = useRef("");
  const pressRef = useRef(false);
  const autoRef = useRef(readSetting("uw-auto", "0") === "1");
  const speedRef = useRef(Number(readSetting("uw-speed", "1")));
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
      haptic(res.result.victory ? "success" : "error");
    };

    const frame = (now: number) => {
      const battle = battleRef.current;
      if (!battle || !renderer || cancelled) return;
      acc += Math.min(250, now - last) * speedRef.current;
      last = now;

      while (acc >= TICK_MS && battle.phase === "fighting") {
        acc -= TICK_MS;
        const skill = battle.skillState();
        const press = pressRef.current || (autoRef.current && skill.ready);
        pressRef.current = false;
        const before = battle.events.length;
        battle.step(press);
        for (const e of battle.events.slice(before)) {
          if (e.kind === "damage") renderer.damage(e.dst, e.amount, e.crit, e.skill, now);
          else if (e.kind === "death") renderer.death(e.uid, now);
          else if (e.kind === "heal") renderer.heal(e.dst, e.amount, now);
          else if (e.kind === "attack") renderer.attack(e.src, now);
          else if (e.kind === "dodge") renderer.text(e.dst, "MISS", "#9a98b0", now);
          else if (e.kind === "skill") {
            renderer.skill(e.src, now);
            if (e.src === renderer.heroUid && e.quality !== "normal") {
              setQuality({ q: e.quality, at: now });
              haptic("heavy");
            }
          } else if (e.kind === "mechanic") {
            const text = MECHANIC_TEXT[e.what] ?? (e.what.startsWith("steal_") ? "The Debt Collector stole a boon!" : "");
            if (text) renderer.showBanner(text, now);
          } else if (e.kind === "wave") renderer.showBanner(t("battle.wave", { wave: e.index + 1 }), now);
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
        finish(battle);
        return;
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
      renderer = new BattleRenderer(canvasRef.current, chapterOf(floor).key, res.setup.hero.classId);
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
    autoRef.current = !autoRef.current;
    setAuto(autoRef.current);
    writeSetting("uw-auto", autoRef.current ? "1" : "0");
  };
  const toggleSpeed = () => {
    speedRef.current = speedRef.current === 1 ? 2 : 1;
    setSpeed(speedRef.current);
    writeSetting("uw-speed", String(speedRef.current));
  };

  // Ring shrinks onto the button edge exactly at the Perfect tick, then loops.
  const ringSize = 86 + Math.max(-8, ((PERFECT_PHASE - skill.ringPhase) / PERFECT_PHASE) * 50);
  const showQuality = quality && performance.now() - quality.at < 700;
  const won = outcome?.result.victory;
  const nextFloor = won && floor < MAX_FLOOR ? floor + 1 : undefined;

  const skillIcon = player.classId === "butcher" ? itemSprite("weapon") : player.classId === "gunslinger" ? ICONS.gun : ICONS.potion;

  return (
    <div className="battle">
      <div className="battle-hud">
        <span className="label">Floor {floor}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="btn small" onClick={toggleSpeed}>
            ×{speed}
          </button>
          <button className={`btn small ${auto ? "on-auto" : ""}`} style={auto ? { borderColor: "var(--teal)", color: "var(--teal)" } : undefined} onClick={toggleAuto}>
            {t("battle.auto")}
          </button>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="skill-wrap">
            {skill.ready && !auto && <div className="ring" style={{ width: ringSize, height: ringSize }} />}
            {showQuality && (
              <div className="quality" style={{ color: quality!.q === "perfect" ? "var(--teal)" : "var(--heal)" }}>
                {t(quality!.q === "perfect" ? "quality.perfect" : "quality.good")}
              </div>
            )}
            <button
              className={`skill-btn ${skill.ready ? "ready" : ""}`}
              onPointerDown={() => {
                if (skill.ready) pressRef.current = true;
              }}
            >
              <div className="fill" style={{ height: `${skill.energy}%` }} />
              <SpriteImg sprite={skillIcon} scale={3} />
            </button>
          </div>
          <span className="label small">{SKILL_NAMES[player.classId]}</span>
        </div>
        <div />
      </div>

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
            <div className="row">
              <button className="btn wide" onClick={() => onExit()}>
                {t("battle.home")}
              </button>
              <button className="btn primary wide" onClick={() => onExit(nextFloor ?? floor)}>
                {nextFloor ? t("battle.next") : t("battle.retry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
