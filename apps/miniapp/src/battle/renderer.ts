import type { ClassId } from "@underworld/shared";
import type { UnitView } from "@underworld/combat";
import { C } from "../art/palette.ts";
import { drawSprite, height, recolor, width, type Sprite } from "../art/pixel.ts";
import { animate, backdrop, type Backdrop } from "../art/scene.ts";
import { HEROES, enemyScale, enemySprite } from "../art/sprites/characters.ts";

interface Float {
  uid: number;
  text: string;
  color: string;
  big: boolean;
  born: number;
}

interface Fx {
  kind: "whirl" | "shot" | "rain" | "slam";
  src: number;
  born: number;
}

const FLOAT_MS = 800;
const LUNGE_MS = 160;
const FLASH_MS = 110;
const DEATH_MS = 380;
const FX_MS = 420;
const FONT = '"Pixelify Sans", monospace';

const whiteCache = new WeakMap<Sprite, Sprite>();
function white(s: Sprite): Sprite {
  let w = whiteCache.get(s);
  if (!w) {
    w = recolor(s, Object.fromEntries(Object.keys(s.palette).map((k) => [k, "#ffffff"])));
    whiteCache.set(s, w);
  }
  return w;
}

/**
 * Draws a battle into a low-res pixel canvas (the canvas is CSS-scaled by an integer factor).
 * It only reads unit views and events from the deterministic engine; nothing here affects the outcome.
 */
export class BattleRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private bg: Backdrop | null = null;
  private floats: Float[] = [];
  private fx: Fx[] = [];
  private readonly lunges = new Map<number, number>();
  private readonly flashes = new Map<number, number>();
  private readonly deaths = new Map<number, number>();
  private banner: { text: string; born: number } | null = null;
  private positions = new Map<number, { x: number; y: number; w: number; h: number }>();
  heroUid = 1;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly chapter: string,
    private readonly heroClass: ClassId,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  damage(uid: number, amount: number, crit: boolean, skill: boolean, now: number): void {
    const toHero = uid === this.heroUid;
    this.floats.push({
      uid,
      text: crit ? `${short(amount)}!` : short(amount),
      color: toHero ? C.danger : crit ? C.gold : skill ? C.teal : C.bone,
      big: crit || skill,
      born: now,
    });
    this.flashes.set(uid, now);
  }

  heal(uid: number, amount: number, now: number): void {
    this.floats.push({ uid, text: `+${short(amount)}`, color: C.heal, big: false, born: now });
  }

  text(uid: number, text: string, color: string, now: number): void {
    this.floats.push({ uid, text, color, big: false, born: now });
  }

  attack(uid: number, now: number): void {
    this.lunges.set(uid, now);
  }

  death(uid: number, now: number): void {
    this.deaths.set(uid, now);
  }

  skill(src: number, now: number): void {
    const kind = src === this.heroUid ? (this.heroClass === "butcher" ? "whirl" : this.heroClass === "gunslinger" ? "shot" : "rain") : "slam";
    this.fx.push({ kind, src, born: now });
  }

  showBanner(text: string, now: number): void {
    this.banner = { text, born: now };
  }

  draw(units: readonly UnitView[], tick: number, now: number): void {
    const { ctx } = this;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (!this.bg || this.bg.canvas.width !== w || this.bg.canvas.height !== h) this.bg = backdrop(this.chapter, w, h);
    const bg = this.bg;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg.canvas, 0, 0);
    animate(ctx, bg, now);

    this.layout(units, w, bg.floorY);
    // Painter's order: back lane first.
    const order = [...units].sort((a, b) => (this.positions.get(a.uid)?.y ?? 0) - (this.positions.get(b.uid)?.y ?? 0));
    for (const u of order) this.drawUnit(u, tick, now);
    this.drawFx(units, now);
    this.drawFloats(now);
    this.drawBanner(w, now);
  }

  private spriteOf(u: UnitView): { sprite: Sprite; scale: number } {
    if (u.side === 0) return { sprite: HEROES[this.heroClass], scale: 1 };
    if (u.kind === "hero") return { sprite: HEROES[u.key as ClassId] ?? HEROES.butcher, scale: 1 };
    return { sprite: enemySprite(u.key), scale: enemyScale(u.kind) };
  }

  private layout(units: readonly UnitView[], w: number, floorY: number): void {
    const lanes = [floorY + 4, floorY + 13, floorY + 22];
    this.positions = new Map();
    const place = (u: UnitView, cx: number, feet: number) => {
      const { sprite, scale } = this.spriteOf(u);
      const sw = width(sprite) * scale;
      const sh = height(sprite) * scale;
      this.positions.set(u.uid, { x: Math.round(cx - sw / 2), y: Math.round(feet - sh), w: sw, h: sh });
    };
    for (const u of units.filter((x) => x.side === 0)) {
      this.heroUid = u.uid;
      place(u, w * 0.2, lanes[1]!);
    }
    const enemies = units.filter((x) => x.side === 1);
    const big = enemies.filter((u) => u.kind === "boss" || u.kind === "chapterBoss" || u.kind === "hero");
    const small = enemies.filter((u) => !big.includes(u));
    big.forEach((u, i) => place(u, w * (0.72 + i * 0.06), lanes[1]! + 2));
    // Staggered formation: every enemy gets its own column and lane so HP bars never overlap.
    const slots = big.length
      ? [[0.5, 2], [0.92, 0], [0.52, 0], [0.9, 2], [0.6, 1], [0.95, 1]]
      : [[0.56, 1], [0.72, 0], [0.88, 2], [0.66, 2], [0.82, 1], [0.95, 0]];
    small.forEach((u, i) => {
      const [x, lane] = slots[i % slots.length]!;
      place(u, w * x!, lanes[lane!]!);
    });
  }

  private drawUnit(u: UnitView, tick: number, now: number): void {
    const pos = this.positions.get(u.uid);
    if (!pos) return;
    const died = this.deaths.get(u.uid);
    if (!u.alive && (died === undefined || now - died > DEATH_MS)) return;
    const { ctx } = this;
    const { sprite, scale } = this.spriteOf(u);

    let dx = 0;
    const lunge = this.lunges.get(u.uid);
    if (lunge !== undefined && now - lunge < LUNGE_MS) dx = Math.round(Math.sin(((now - lunge) / LUNGE_MS) * Math.PI) * 4) * (u.side === 0 ? 1 : -1);
    const bob = u.alive ? Math.floor((now / 400 + u.uid) % 2) : 0;
    const x = pos.x + dx;
    const y = pos.y + bob;

    // Shadow.
    ctx.fillStyle = "#00000070";
    ctx.fillRect(pos.x + 2, pos.y + pos.h, pos.w - 4, 2);

    const flash = this.flashes.get(u.uid);
    const flashing = flash !== undefined && now - flash < FLASH_MS;
    if (!u.alive) {
      if (Math.floor(now / 60) % 2) return; // death flicker
    }
    // Enemies face left, the hero faces right.
    drawSprite(ctx, flashing ? white(sprite) : sprite, x, y, scale, u.side === 1);

    if (!u.alive) return;
    // HP bar (shield on top), 1-px rim.
    const bw = Math.max(12, Math.min(pos.w, 30));
    const bx = Math.round(pos.x + pos.w / 2 - bw / 2);
    const by = pos.y - 5;
    ctx.fillStyle = C.outline;
    ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
    ctx.fillStyle = "#2c2c3a";
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = u.side === 0 ? C.heal : C.danger;
    ctx.fillRect(bx, by, Math.max(1, Math.round((bw * u.hp) / u.maxHp)), 2);
    if (u.shield > 0) {
      ctx.fillStyle = "#8fd6ff";
      ctx.fillRect(bx, by - 2, Math.min(bw, Math.max(1, Math.round((bw * u.shield) / u.maxHp))), 1);
    }
    // Status pips.
    let sx = bx;
    if (u.poison.length > 0) {
      ctx.fillStyle = "#6cc31f";
      for (let i = 0; i < Math.min(5, u.poison.length); i++) ctx.fillRect(sx + i * 2, by - 4, 1, 1);
      sx += 11;
    }
    if (u.stunUntil >= tick) {
      ctx.fillStyle = C.gold;
      const p = Math.floor(now / 100) % 4;
      ctx.fillRect(pos.x + pos.w / 2 - 3 + p * 2, pos.y - 8, 1, 1);
    }
    if (u.slowUntil >= tick) {
      ctx.fillStyle = "#8fd6ff";
      ctx.fillRect(sx, by - 4, 3, 1);
    }
  }

  private drawFx(units: readonly UnitView[], now: number): void {
    const { ctx } = this;
    this.fx = this.fx.filter((f) => now - f.born < FX_MS);
    for (const f of this.fx) {
      const src = this.positions.get(f.src);
      if (!src) continue;
      const p = (now - f.born) / FX_MS;
      const cx = src.x + src.w / 2;
      const cy = src.y + src.h / 2;
      if (f.kind === "whirl") {
        // Teal arc sweeping around the butcher.
        const r = 8 + p * 14;
        for (let a = 0; a < 18; a++) {
          const ang = p * Math.PI * 4 + (a / 18) * Math.PI * 1.4;
          ctx.fillStyle = a > 12 ? C.bone : C.teal;
          ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.6), 1, 1);
        }
      } else if (f.kind === "shot") {
        // Tracer to the toughest enemy.
        const target = units.filter((u) => u.side === 1 && u.alive).sort((a, b) => b.hp - a.hp)[0];
        const tp = target && this.positions.get(target.uid);
        if (tp && p < 0.5) {
          const tx = tp.x + tp.w / 2;
          const ty = tp.y + tp.h / 2;
          const steps = Math.ceil(Math.abs(tx - cx));
          for (let i = 0; i < steps; i += 2) {
            ctx.fillStyle = i % 4 ? C.gold : "#fff3c4";
            ctx.fillRect(Math.round(cx + ((tx - cx) * i) / steps), Math.round(cy - 2 + ((ty - cy) * i) / steps), 2, 1);
          }
        }
      } else if (f.kind === "rain") {
        // Poison rain over every enemy.
        for (const u of units) {
          if (u.side !== 1 || !u.alive) continue;
          const tp = this.positions.get(u.uid);
          if (!tp) continue;
          for (let i = 0; i < 6; i++) {
            const dropY = tp.y - 10 + ((p * 30 + i * 7) % (tp.h + 10));
            ctx.fillStyle = i % 2 ? "#6cc31f" : "#a6f03a";
            ctx.fillRect(tp.x + ((i * 5) % Math.max(4, tp.w)), Math.round(dropY), 1, 2);
          }
        }
      } else {
        ctx.fillStyle = C.danger;
        const r = 4 + p * 10;
        ctx.globalAlpha = 1 - p;
        ctx.fillRect(Math.round(cx - r), Math.round(src.y + src.h), Math.round(r * 2), 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawFloats(now: number): void {
    const { ctx } = this;
    this.floats = this.floats.filter((f) => now - f.born < FLOAT_MS);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const f of this.floats) {
      const pos = this.positions.get(f.uid);
      if (!pos) continue;
      const age = (now - f.born) / FLOAT_MS;
      const x = Math.round(pos.x + pos.w / 2);
      const y = Math.round(pos.y - 7 - age * 12);
      ctx.font = `${f.big ? 10 : 8}px ${FONT}`;
      ctx.fillStyle = C.outline;
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillStyle = f.color;
      if (age < 0.85 || Math.floor(now / 50) % 2) ctx.fillText(f.text, x, y);
    }
  }

  private drawBanner(w: number, now: number): void {
    if (!this.banner || now - this.banner.born > 1500) return;
    const { ctx } = this;
    ctx.fillStyle = "#000000b0";
    ctx.fillRect(0, 6, w, 12);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 6, w, 1);
    ctx.fillRect(0, 17, w, 1);
    ctx.font = `8px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = C.bone;
    ctx.fillText(this.banner.text, Math.round(w / 2), 15);
  }
}

function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}
