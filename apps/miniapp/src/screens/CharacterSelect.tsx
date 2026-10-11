import { useEffect, useRef, useState } from "react";
import { CLASSES, type ClassId, type Look } from "@underworld/shared";
import { heroArt } from "../art/hero.ts";
import { api } from "../api.ts";
import { backdrop } from "../art/scene.ts";
import { drawSprite, height, raster, width } from "../art/pixel.ts";
import { HEROES } from "../art/sprites/characters.ts";
import { ICONS, itemSprite } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

const ORDER: ClassId[] = ["butcher", "gunslinger", "hexer"];

interface ClassInfo {
  name: string;
  role: string;
  difficulty: 1 | 2 | 3;
  aura: string;
  pitch: string;
  skill: { name: string; text: string };
  passives: { lv: number; name: string; text: string }[];
}

// English is the source language (GDD §17); numbers match packages/shared/data/classes.ts.
const INFO: Record<ClassId, ClassInfo> = {
  butcher: {
    name: "Butcher",
    role: "Tank · Melee",
    difficulty: 1,
    aura: "#ff7a5a",
    pitch: "Cleaves every enemy around him and heals off the damage. Hard to kill — the safest first hunter.",
    skill: { name: "Whirlwind", text: "3 spinning slashes on ALL enemies. Heals 25% of the damage dealt." },
    passives: [
      { lv: 10, name: "Thick Hide", text: "−10% damage taken" },
      { lv: 25, name: "Bloodrage", text: "+25% ATK below 50% HP" },
      { lv: 40, name: "Retaliate", text: "Reflect 15% of melee damage" },
    ],
  },
  gunslinger: {
    name: "Gunslinger",
    role: "Burst · Ranged",
    difficulty: 2,
    aura: "#ffc93c",
    pitch: "Fragile but deadly. Crits often and deletes the toughest target with a single shot.",
    skill: { name: "Deadeye", text: "One guaranteed critical shot (420% ATK) at the enemy with the most HP." },
    passives: [
      { lv: 10, name: "Hawk Eye", text: "+10% crit chance" },
      { lv: 25, name: "Piercing Rounds", text: "Ignore 20% of enemy DEF" },
      { lv: 40, name: "Double Tap", text: "20% chance to shoot twice" },
    ],
  },
  hexer: {
    name: "Hexer",
    role: "Control · Poison",
    difficulty: 3,
    aura: "#6cc31f",
    pitch: "Poisons whole waves, slows them down and later stuns. Rewards good skill timing.",
    skill: { name: "Plague Rain", text: "Hits ALL enemies, poisons them for 5s and slows them." },
    passives: [
      { lv: 10, name: "Curse", text: "Poisoned enemies deal −10% damage" },
      { lv: 25, name: "Contagion", text: "Poison spreads when a victim dies" },
      { lv: 40, name: "Soul Shock", text: "Plague Rain also stuns" },
    ],
  },
};

const STAT_KEYS = ["hp", "atk", "def", "spd"] as const;
const STAT_MAX = Object.fromEntries(STAT_KEYS.map((k) => [k, Math.max(...ORDER.map((c) => CLASSES[c].base[k]))])) as Record<(typeof STAT_KEYS)[number], number>;

function skillIcon(c: ClassId) {
  return itemSprite("weapon", false, c);
}

/**
 * Character select. `first`: shown to new players before anything else; confirming starts the game.
 * `change`: opened from the Hero tab; free during the first 72 hours.
 */
export function CharacterSelect({ mode, onDone, onCancel }: { mode: "first" | "change"; onDone: () => void; onCancel?: () => void }) {
  const { player, setPlayer, run } = useGame();
  const [picked, setPicked] = useState<ClassId>(player.classId);
  const [busy, setBusy] = useState(false);
  const info = INFO[picked];
  const base = CLASSES[picked].base;
  const same = mode === "change" && picked === player.classId;

  const confirm = async () => {
    setBusy(true);
    const p = await run(() => api.chooseClass(picked));
    setBusy(false);
    if (!p) return;
    haptic("success");
    setPlayer(p);
    onDone();
  };

  return (
    <div className="select">
      <div className="select-head">
        {mode === "first" ? <div className="logo">UNDERWORLD</div> : <span className="label">Switch hunter</span>}
        <div className="label small">{mode === "first" ? "Choose your hunter" : "Level and gear are shared · switch any time"}</div>
      </div>

      <Stage classId={picked} look={picked === player.classId ? player.look : {}} />

      <div className="select-body">
        <div className="row">
          <div>
            <div className="class-name">{info.name}</div>
            <div className="muted pixel" style={{ fontSize: 13 }}>{info.role}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label small">Difficulty</div>
            <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginTop: 3 }}>
              {[1, 2, 3].map((i) => (
                <SpriteImg key={i} sprite={i <= info.difficulty ? ICONS.star : ICONS.starEmpty} scale={2} />
              ))}
            </div>
          </div>
        </div>

        <p className="pitch">{info.pitch}</p>

        <div className="stat-bars">
          {STAT_KEYS.map((k) => (
            <div key={k} className="stat-bar">
              <span className="pixel">{k.toUpperCase()}</span>
              <div>
                <i style={{ width: `${Math.max(18, (base[k] / STAT_MAX[k]) * 100)}%` }} />
              </div>
              <b className="pixel">{base[k]}</b>
            </div>
          ))}
          <div className="stat-bar">
            <span className="pixel">CRIT</span>
            <div>
              <i style={{ width: `${Math.max(18, (base.critBp / 1500) * 100)}%`, background: "var(--gold)" }} />
            </div>
            <b className="pixel">{base.critBp / 100}%</b>
          </div>
        </div>

        <div className="skill-card">
          <div className="frame f-rare md">
            <SpriteImg sprite={skillIcon(picked)} scale={3} />
          </div>
          <div>
            <div className="pixel" style={{ color: "var(--teal)", fontSize: 16 }}>{info.skill.name}</div>
            <div style={{ fontSize: 13 }}>{info.skill.text}</div>
          </div>
        </div>

        <div className="passives">
          {info.passives.map((p) => (
            <div key={p.lv}>
              <span className="pixel lv">Lv {p.lv}</span>
              <b className="pixel">{p.name}</b>
              <span className="muted">{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="select-foot">
        <div className="class-tabs">
          {ORDER.map((c) => (
            <button
              key={c}
              className={c === picked ? "on" : ""}
              onClick={() => {
                if (c === picked) return;
                haptic("light");
                setPicked(c);
              }}
            >
              <SpriteImg sprite={HEROES[c]} scale={2} />
              <span className="pixel">{INFO[c].name}</span>
              {mode === "change" && player.bags[c] > 0 && <span className="count">{player.bags[c]}</span>}
              {mode === "change" && c === player.classId && <small className="muted">current</small>}
            </button>
          ))}
        </div>
        <div className="row">
          {mode === "change" && (
            <button className="btn" onClick={onCancel}>
              Back
            </button>
          )}
          <button className="btn primary big" style={{ flex: 1 }} disabled={busy || same} onClick={confirm}>
            {mode === "first" ? "START HUNTING" : same ? "CURRENT CLASS" : `SWITCH TO ${info.name.toUpperCase()}`}
          </button>
        </div>
        {mode === "first" && <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>You can switch hunters any time — tap your portrait.</div>}
      </div>
    </div>
  );
}

/** Big animated hero on the Sewers backdrop, with a class-colored aura and a flash when switching. */
function Stage({ classId, look }: { classId: ClassId; look: Look }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h } = usePixelCanvas(boxRef, canvasRef, { targetPixelWidth: 110, aspect: 0.72 });
  const classRef = useRef(classId);
  const lookRef = useRef(look);
  lookRef.current = look;
  const swapAt = useRef(0);
  useEffect(() => {
    if (classRef.current !== classId) swapAt.current = performance.now();
    classRef.current = classId;
  }, [classId]);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const bg = backdrop("sewers", w, h);
    const motes = Array.from({ length: 18 }, () => ({ x: Math.random() * w, y: Math.random() * h, v: 3 + Math.random() * 6 }));
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000;
      last = now;
      const cls = classRef.current;
      const sprite = heroArt(cls, lookRef.current).sprite;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bg.canvas, 0, 0);
      ctx.fillStyle = "rgba(8,8,14,0.55)";
      ctx.fillRect(0, 0, w, h);

      // Aura.
      const cx = w / 2;
      const feet = bg.floorY + 6;
      const g = ctx.createRadialGradient(cx, feet - 20, 2, cx, feet - 20, 46);
      g.addColorStop(0, hexA(INFO[cls].aura, 0.45 + Math.sin(now / 400) * 0.08));
      g.addColorStop(1, hexA(INFO[cls].aura, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Floor spotlight + shadow.
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.ellipse(cx, feet, 26, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.ellipse(cx, feet, 13, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Motes drifting up in the aura color.
      ctx.fillStyle = INFO[cls].aura;
      for (const m of motes) {
        m.y -= m.v * dt;
        if (m.y < 0) {
          m.y = h;
          m.x = Math.random() * w;
        }
        if (Math.abs(m.x - cx) < 40) ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
      }

      // Hero, scaled up, breathing; pops in on switch.
      // Largest integer zoom that keeps the whole hero inside the stage.
      const scale = Math.max(1, Math.floor((feet - 6) / height(sprite)));
      const since = now - swapAt.current;
      const pop = since < 220 ? 1 - since / 220 : 0;
      const bob = Math.floor(now / 450) % 2;
      const sw = width(sprite) * scale;
      const sh = height(sprite) * scale;
      const sx = Math.round(cx - sw / 2);
      const sy = Math.round(feet - sh + bob - pop * 6);
      drawSprite(ctx, sprite, sx, sy, scale);
      if (pop > 0) {
        ctx.globalAlpha = pop;
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(raster(sprite), sx, sy, sw, sh);
        ctx.drawImage(raster(sprite), sx, sy, sw, sh);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.strokeStyle = INFO[cls].aura;
        ctx.globalAlpha = pop;
        ctx.beginPath();
        ctx.ellipse(cx, feet, 30 * (1 - pop) + 8, 6 * (1 - pop) + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [w, h]);

  return (
    <div ref={boxRef} className="select-stage">
      <canvas ref={canvasRef} className="px" />
    </div>
  );
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
