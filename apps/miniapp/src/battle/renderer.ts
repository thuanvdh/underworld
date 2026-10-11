import type { ClassId, Look } from "@underworld/shared";
import { heroArt, tierColor, type HeroArt } from "../art/hero.ts";
import type { BattleEvent, UnitView } from "@underworld/combat";
import { C } from "../art/palette.ts";
import { height, raster, recolor, spritePixels, width, type Sprite } from "../art/pixel.ts";
import { animate, backdrop, type Backdrop } from "../art/scene.ts";
import { HEROES, enemySprite } from "../art/sprites/characters.ts";
import { ParticleSystem, easeOut } from "../fx/particles.ts";

/** Canvas pixels per art pixel: art stays chunky, effects get twice the resolution. */
export const ART = 2;
const FONT = '"Pixelify Sans", monospace';

const BOSS_NAMES: Record<string, string> = {
  fat_rat_king: "FAT RAT KING",
  gravedigger: "THE GRAVEDIGGER",
  debt_collector: "THE DEBT COLLECTOR",
  furnace_golem: "FURNACE GOLEM",
  spore_mother: "THE SPORE MOTHER",
  the_warden: "THE WARDEN",
};

interface Anim {
  lungeAt: number;
  hurtAt: number;
  knock: number;
  spawnAt: number;
  diedAt: number;
  trail: { x: number; y: number; at: number }[];
  lastBubble: number;
  enraged: boolean;
  chargeAt: number;
}

interface Float {
  uid: number;
  text: string;
  color: string;
  size: number;
  born: number;
  crit: boolean;
  dx: number;
}

interface Pos {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  sprite: Sprite;
}

const tintCache = new Map<string, WeakMap<Sprite, Sprite>>();
function tinted(s: Sprite, color: string): Sprite {
  let byColor = tintCache.get(color);
  if (!byColor) tintCache.set(color, (byColor = new WeakMap()));
  let t = byColor.get(s);
  if (!t) {
    t = recolor(s, Object.fromEntries(Object.keys(s.palette).map((k) => [k, color])));
    byColor.set(s, t);
  }
  return t;
}

const pixelCache = new WeakMap<Sprite, ReturnType<typeof spritePixels>>();
function pixelsOf(s: Sprite) {
  let p = pixelCache.get(s);
  if (!p) pixelCache.set(s, (p = spritePixels(s)));
  return p;
}

/** Most common non-outline color of a sprite — used for splats. */
const goreCache = new WeakMap<Sprite, string>();
function goreColor(s: Sprite): string {
  let c = goreCache.get(s);
  if (!c) {
    const counts = new Map<string, number>();
    for (const p of pixelsOf(s)) if (p.color !== "rgb(11,11,16)") counts.set(p.color, (counts.get(p.color) ?? 0) + 1);
    c = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#7a2a3a";
    goreCache.set(s, c);
  }
  return c;
}

/**
 * Battle renderer with game feel: particles, screen shake, hit-stop, slow-mo, squash & stretch, lighting.
 * It only reads unit views and events from the deterministic engine; nothing here changes the outcome.
 */
export class BattleRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly low = document.createElement("canvas");
  private bg: Backdrop | null = null;
  private readonly fx = new ParticleSystem();
  private readonly anims = new Map<number, Anim>();
  private floats: Float[] = [];
  private positions = new Map<number, Pos>();
  private units: readonly UnitView[] = [];
  private readonly chapter: string;
  private readonly heroClass: ClassId;
  private readonly heroLook: HeroArt;
  private lastNow = 0;
  private shakeAmp = 0;
  private shakeUntil = 0;
  private hitStopUntil = 0;
  private slowUntil = 0;
  private flash: { color: string; until: number; alpha: number; start: number } | null = null;
  private zoomUntil = 0;
  private banner: { text: string; born: number; big: boolean } | null = null;
  private introUntil = 0;
  private introStart = 0;
  private introduced = new Set<number>();
  private skillGlow: { color: string; until: number; uid: number } | null = null;
  private lastAmbient = 0;
  private ended: { victory: boolean; at: number } | null = null;
  private vignette: HTMLCanvasElement | null = null;
  private fog: HTMLCanvasElement | null = null;
  heroUid = 1;

  constructor(canvas: HTMLCanvasElement, chapter: string, heroClass: ClassId, look: Look = {}) {
    this.ctx = canvas.getContext("2d")!;
    this.chapter = chapter;
    this.heroClass = heroClass;
    this.heroLook = heroArt(heroClass, look);
  }

  /** 0 during hit-stop, slowed during the finishing blow, else 1. The game loop scales sim time by this. */
  timeScale(now: number): number {
    if (now < this.hitStopUntil) return 0;
    if (now < this.slowUntil) return 0.3;
    if (now < this.introUntil) return 0.15;
    return 1;
  }

  showBanner(text: string, now: number, big = false): void {
    this.banner = { text, born: now, big };
  }

  /** Feed every engine event here. */
  handle(e: BattleEvent, now: number): void {
    switch (e.kind) {
      case "attack":
        this.anim(e.src).lungeAt = now;
        break;
      case "damage": {
        const dst = this.positions.get(e.dst);
        const src = this.positions.get(e.src);
        const a = this.anim(e.dst);
        a.hurtAt = now;
        a.knock = src && dst ? Math.sign(dst.x - src.x) || 1 : e.dst === this.heroUid ? -1 : 1;
        const toHero = e.dst === this.heroUid;
        this.addFloat(e.dst, e.crit ? `${short(e.amount)}!` : short(e.amount), toHero ? C.danger : e.crit ? C.gold : e.skill ? C.teal : C.bone, e.crit || e.skill, e.crit, now);
        if (dst) {
          const cx = dst.x + dst.w / 2;
          const cy = dst.y + dst.h * 0.45;
          this.fx.hitSparks(cx, cy, a.knock, e.crit);
          const tier = this.heroLook.weaponTier;
          if (e.src === this.heroUid && (tier === "rare" || tier === "epic" || tier === "legendary")) {
            const color = tierColor(tier);
            for (let i = 0; i < (tier === "legendary" ? 10 : tier === "epic" ? 7 : 4); i++) {
              const ang = (Math.random() - 0.5) * 2 + (a.knock > 0 ? 0 : Math.PI);
              this.fx.spawn({ x: cx, y: cy, vx: Math.cos(ang) * (90 + Math.random() * 90), vy: Math.sin(ang) * 90 - 20, g: 200, drag: 2, max: 0.35, size: 2, colors: ["#ffffff", color], streak: true, additive: true });
            }
            if (tier === "legendary") this.fx.ring({ x: cx, y: cy, r0: 2, r1: 18, color: "#ffc93c", width: 2, squash: 0.9, max: 0.22 });
          }
          if (!toHero && (e.crit || e.skill)) this.fx.splat(cx, cy, goreColor(dst.sprite), this.floorY() + 18, a.knock);
        }
        if (toHero) {
          this.shake(e.amount > 0 ? 3 : 1, 140, now);
          this.flashScreen("#ff3b4e", 90, 0.18, now);
        } else if (e.crit) {
          this.shake(4, 160, now);
          this.hitStop(55, now);
        } else if (e.skill) {
          this.shake(2, 100, now);
        }
        break;
      }
      case "heal": {
        const p = this.positions.get(e.dst);
        if (p && e.amount > 0) this.fx.healMotes(p.x + p.w / 2, p.y + p.h * 0.6);
        if (e.amount >= 20) this.addFloat(e.dst, `+${short(e.amount)}`, C.heal, false, false, now);
        break;
      }
      case "dodge": {
        this.addFloat(e.dst, "MISS", "#9a98b0", false, false, now);
        this.anim(e.dst).lungeAt = now;
        break;
      }
      case "skill":
        this.skillFx(e.src, e.quality, now);
        break;
      case "death": {
        const p = this.positions.get(e.uid);
        this.anim(e.uid).diedAt = now;
        if (p) {
          this.fx.dissolve(pixelsOf(p.sprite), p.x, p.y, p.scale, this.floorY() + 18);
          if (e.uid !== this.heroUid) this.fx.coins(p.x + p.w / 2, p.y + p.h / 2, p.y + p.h, p.scale > ART ? 14 : 4);
          this.fx.dust(p.x + p.w / 2, p.y + p.h, 8);
        }
        this.shake(e.uid === this.heroUid ? 6 : 2, 180, now);
        break;
      }
      case "spawn":
        this.anim(e.uid).spawnAt = now;
        break;
      case "shield": {
        const p = this.positions.get(e.uid);
        if (p) this.fx.ring({ x: p.x + p.w / 2, y: p.y + p.h / 2, r0: 4, r1: p.w * 0.8, color: "#8fd6ff", width: 2, squash: 1, max: 0.4 });
        break;
      }
      case "mechanic":
        this.mechanicFx(e.uid, e.what, now);
        break;
      case "wave":
        if (e.index > 0) this.showBanner(`WAVE ${e.index + 1}`, now);
        break;
      case "end":
        this.ended = { victory: e.victory, at: now };
        this.slowUntil = now + 700;
        if (e.victory) {
          this.flashScreen("#fff3c4", 260, 0.35, now);
          this.zoomUntil = now + 500;
          const hero = this.positions.get(this.heroUid);
          if (hero) for (let i = 0; i < 3; i++) this.fx.coins(hero.x + hero.w / 2, hero.y - 10, this.floorY() + 20, 8);
        } else {
          this.flashScreen("#ff3b4e", 500, 0.4, now);
          this.shake(7, 400, now);
        }
        break;
      default:
        break;
    }
  }

  draw(units: readonly UnitView[], tick: number, now: number): void {
    const { ctx } = this;
    const dt = Math.min(0.05, (now - (this.lastNow || now)) / 1000) * (now < this.hitStopUntil ? 0.05 : now < this.slowUntil ? 0.4 : 1);
    this.lastNow = now;
    this.units = units;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Low-res backdrop + its animation, scaled up.
    const lw = Math.ceil(W / ART);
    const lh = Math.ceil(H / ART);
    if (!this.bg || this.bg.canvas.width !== lw || this.bg.canvas.height !== lh) {
      this.bg = backdrop(this.chapter, lw, lh);
      this.low.width = lw;
      this.low.height = lh;
      this.vignette = null;
      this.fog = null;
    }
    const lctx = this.low.getContext("2d")!;
    lctx.drawImage(this.bg.canvas, 0, 0);
    animate(lctx, this.bg, now);

    this.layout(units, W);
    this.detectBossIntro(units, now);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Camera: shake + zoom punch.
    const shake = now < this.shakeUntil ? this.shakeAmp * ((this.shakeUntil - now) / 200) : 0;
    const zoom = now < this.zoomUntil ? 1 + 0.035 * Math.sin(((this.zoomUntil - now) / 500) * Math.PI) : 1;
    ctx.translate(W / 2 + (Math.random() - 0.5) * shake * 2, H / 2 + (Math.random() - 0.5) * shake * 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);

    ctx.drawImage(this.low, 0, 0, lw * ART, lh * ART);
    this.drawFog(W, H, now);
    this.drawTelegraphs(units, now);

    const order = [...units].sort((a, b) => (this.positions.get(a.uid)?.y ?? 0) + (this.positions.get(a.uid)?.h ?? 0) - ((this.positions.get(b.uid)?.y ?? 0) + (this.positions.get(b.uid)?.h ?? 0)));
    for (const u of order) this.drawUnit(u, tick, now);

    // Continuous effects.
    for (const u of units) {
      const p = this.positions.get(u.uid);
      const a = this.anims.get(u.uid);
      if (!p || !a || !u.alive) continue;
      if (u.poison.length > 0 && now - a.lastBubble > 160) {
        a.lastBubble = now;
        this.fx.poisonBubble(p.x + Math.random() * p.w, p.y + p.h * (0.3 + Math.random() * 0.5));
      }
      if (a.enraged && Math.random() < 0.5) {
        this.fx.spawn({ x: p.x + Math.random() * p.w, y: p.y + p.h, vy: -40 - Math.random() * 40, max: 0.5, size: 2, colors: ["#ffd06a", "#ff7a1a", "#ff3b4e", "#5a1010"], additive: true });
      }
    }
    if (now - this.lastAmbient > 220) {
      this.lastAmbient = now;
      this.fx.ambient(W, this.floorY(), this.bg.ramps.hazard[3]!);
    }

    this.weaponFx(now);
    this.fx.update(dt);
    this.fx.draw(ctx);
    this.drawLights(W, H, now);
    this.drawUnitBars(units, tick, now);
    this.drawFloats(now);
    ctx.restore();

    this.drawOverlays(W, H, now);
  }

  // ───────────────────────── internals ─────────────────────────

  private anim(uid: number): Anim {
    let a = this.anims.get(uid);
    if (!a) {
      a = { lungeAt: -1e9, hurtAt: -1e9, knock: 0, spawnAt: -1e9, diedAt: -1e9, trail: [], lastBubble: 0, enraged: false, chargeAt: -1e9 };
      this.anims.set(uid, a);
    }
    return a;
  }

  private floorY(): number {
    return (this.bg?.floorY ?? 80) * ART;
  }

  private shake(amp: number, ms: number, now: number): void {
    this.shakeAmp = Math.max(now < this.shakeUntil ? this.shakeAmp : 0, amp);
    this.shakeUntil = Math.max(this.shakeUntil, now + ms);
  }

  private hitStop(ms: number, now: number): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, now + ms);
  }

  private flashScreen(color: string, ms: number, alpha: number, now: number): void {
    this.flash = { color, until: now + ms, alpha, start: now };
  }

  private addFloat(uid: number, text: string, color: string, big: boolean, crit: boolean, now: number): void {
    const stacked = this.floats.filter((f) => f.uid === uid && now - f.born < 250).length;
    this.floats.push({ uid, text, color, size: big ? 22 : 15, born: now - stacked * 40, crit, dx: (stacked % 2 ? 1 : -1) * stacked * 6 });
  }

  private spriteOf(u: UnitView): { sprite: Sprite; scale: number } {
    if (u.side === 0) return { sprite: this.heroLook.sprite, scale: ART };
    if (u.kind === "hero") return { sprite: HEROES[u.key as ClassId] ?? HEROES.butcher, scale: ART };
    // Bosses: 2× / 1.5× the art size (integer canvas scales keep pixels square).
    return { sprite: enemySprite(u.key), scale: u.kind === "chapterBoss" ? 4 : u.kind === "boss" ? 3 : ART };
  }

  private layout(units: readonly UnitView[], W: number): void {
    const floor = this.floorY();
    const lanes = [floor + 4 * ART, floor + 13 * ART, floor + 22 * ART];
    this.positions = new Map();
    const place = (u: UnitView, cx: number, feet: number) => {
      const { sprite, scale } = this.spriteOf(u);
      const w = width(sprite) * scale;
      const h = height(sprite) * scale;
      const x = Math.max(2, Math.min(W - w - 2, Math.round(cx - w / 2)));
      this.positions.set(u.uid, { x, y: Math.round(feet - h), w, h, scale, sprite });
    };
    for (const u of units.filter((x) => x.side === 0)) {
      this.heroUid = u.uid;
      place(u, W * 0.2, lanes[1]!);
    }
    const enemies = units.filter((x) => x.side === 1);
    const big = enemies.filter((u) => u.kind === "boss" || u.kind === "chapterBoss" || u.kind === "hero");
    const small = enemies.filter((u) => !big.includes(u));
    big.forEach((u, i) => place(u, W * (0.78 + i * 0.06), lanes[1]! + 2 * ART));
    // With a boss on the field, minions line up in front of it.
    const slots = big.length
      ? [[0.48, 2], [0.56, 0], [0.42, 1], [0.6, 2], [0.38, 0], [0.64, 1]]
      : [[0.56, 1], [0.72, 0], [0.88, 2], [0.66, 2], [0.82, 1], [0.95, 0]];
    small.forEach((u, i) => {
      const [x, lane] = slots[i % slots.length]!;
      place(u, W * x!, lanes[lane!]!);
    });
  }

  private detectBossIntro(units: readonly UnitView[], now: number): void {
    for (const u of units) {
      if (u.side !== 1 || !u.alive || this.introduced.has(u.uid)) continue;
      if (u.kind !== "chapterBoss" && u.kind !== "boss") continue;
      this.introduced.add(u.uid);
      if (u.kind === "chapterBoss") {
        this.introStart = now;
        this.introUntil = now + 1300;
        this.showBanner(BOSS_NAMES[u.key] ?? "BOSS", now, true);
        this.shake(5, 300, now + 350);
      }
    }
  }

  private drawUnit(u: UnitView, tick: number, now: number): void {
    const p = this.positions.get(u.uid);
    if (!p) return;
    const a = this.anim(u.uid);
    if (!u.alive && now - a.diedAt > 60) return; // dissolve particles take over
    const { ctx } = this;
    const flip = u.side === 1;
    const facing = u.side === 0 ? 1 : -1;

    // Offsets: lunge, knockback, spawn slide-in, boss drop.
    let dx = 0;
    let dy = 0;
    let sx = 1;
    let sy = 1;
    const lt = (now - a.lungeAt) / 170;
    if (lt >= 0 && lt < 1) {
      const k = Math.sin(lt * Math.PI);
      dx += facing * k * 6 * ART;
      sx *= 1 + 0.12 * k;
      sy *= 1 - 0.08 * k;
      if (lt < 0.6) a.trail.push({ x: p.x + dx, y: p.y, at: now });
    }
    const ht = (now - a.hurtAt) / 160;
    if (ht >= 0 && ht < 1) {
      const k = 1 - ht;
      dx += a.knock * k * 3 * ART;
      sx *= 1 + 0.1 * k;
      sy *= 1 - 0.1 * k;
    }
    const st = (now - a.spawnAt) / 320;
    if (st >= 0 && st < 1 && u.side === 1) {
      if (u.kind === "chapterBoss") dy -= (1 - easeOut(st)) * 120;
      else dx += (1 - easeOut(st)) * 50;
      if (st > 0.85 && u.kind === "chapterBoss") this.fx.dust(p.x + p.w / 2, p.y + p.h, 16);
    }
    // Idle breathing.
    const breath = Math.sin(now / 380 + u.uid) * 0.025;
    sy *= 1 + breath;
    sx *= 1 - breath * 0.5;

    // Shadow.
    ctx.fillStyle = "#00000080";
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2 + dx * 0.3, p.y + p.h + 1, (p.w / 2) * 0.8, 3 * ART * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (u.side === 0 && this.heroLook.aura) this.drawAura(p, now);

    // Afterimages from the lunge.
    a.trail = a.trail.filter((t) => now - t.at < 140);
    for (const t of a.trail) {
      ctx.globalAlpha = 0.25 * (1 - (now - t.at) / 140);
      const trailColor = u.side === 0 ? (this.heroLook.weaponTier === "none" || this.heroLook.weaponTier === "common" ? C.teal : tierColor(this.heroLook.weaponTier)) : "#b46cff";
      this.blit(tinted(p.sprite, trailColor), t.x, p.y + dy, p.w, p.h, flip, 1, 1);
    }
    ctx.globalAlpha = 1;

    const hurtFlash = now - a.hurtAt < 60;
    const hurtTint = now - a.hurtAt < 180;
    this.blit(hurtFlash ? tinted(p.sprite, "#ffffff") : p.sprite, p.x + dx, p.y + dy, p.w, p.h, flip, sx, sy);
    if (!hurtFlash && hurtTint) {
      ctx.globalAlpha = 0.45 * (1 - (now - a.hurtAt) / 180);
      this.blit(tinted(p.sprite, "#ff3b4e"), p.x + dx, p.y + dy, p.w, p.h, flip, sx, sy);
      ctx.globalAlpha = 1;
    }
    if (u.stunUntil >= tick) {
      for (let i = 0; i < 3; i++) {
        const ang = now / 150 + (i * Math.PI * 2) / 3;
        ctx.fillStyle = i % 2 ? C.gold : "#fff3c4";
        ctx.fillRect(Math.round(p.x + p.w / 2 + Math.cos(ang) * 8), Math.round(p.y - 4 + Math.sin(ang) * 3), 2, 2);
      }
    }
    if (u.shield > 0) {
      // Shimmering bubble.
      ctx.globalAlpha = 0.35 + Math.sin(now / 90) * 0.1;
      ctx.strokeStyle = "#8fd6ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.62, p.h * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#8fd6ff";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Gear aura at the hero's feet: a pulsing ring and rising motes in the gear's rarity color. */
  private drawAura(p: Pos, now: number): void {
    const { ctx } = this;
    const color = this.heroLook.aura === "legendary" ? "#ffc93c" : "#b46cff";
    const pulse = 0.5 + Math.sin(now / 260) * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 * pulse + 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h + 1, p.w * 0.55, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.35) {
      this.fx.spawn({ x: p.x + p.w * (0.15 + Math.random() * 0.7), y: p.y + p.h, vy: -30 - Math.random() * 30, max: 0.8, size: 1 + (Math.random() < 0.3 ? 1 : 0), colors: [this.heroLook.aura === "legendary" ? "#fff3c4" : "#ecd8ff", color, "#3a2a50"], additive: true });
    }
  }

  /** Weapon light and particles that grow with its rarity. */
  private weaponFx(now: number): void {
    const tier = this.heroLook.weaponTier;
    if (tier === "none" || tier === "common") return;
    const p = this.positions.get(this.heroUid);
    const hero = this.units.find((u) => u.uid === this.heroUid);
    if (!p || !hero?.alive) return;
    const box = this.heroLook.weapon;
    const cx = p.x + (box.x + box.w / 2) * p.scale;
    const cy = p.y + (box.y + box.h / 2) * p.scale;
    const color = tierColor(tier);
    const { ctx } = this;
    const strength = tier === "legendary" ? 0.45 : tier === "epic" ? 0.32 : tier === "rare" ? 0.22 : 0.12;
    const flicker = tier === "legendary" ? 0.85 + Math.sin(now / 50) * 0.1 + Math.sin(now / 17) * 0.05 : 0.85 + Math.sin(now / 300) * 0.15;
    const r = (tier === "legendary" ? 30 : tier === "epic" ? 24 : 18) * (0.9 + 0.1 * flicker);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexA(color, strength * flicker));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    const bx = p.x + box.x * p.scale;
    const by = p.y + box.y * p.scale;
    const bw = box.w * p.scale;
    const bh = box.h * p.scale;
    if (tier === "epic" && Math.random() < 0.45) {
      // Twinkling sparks around the weapon.
      this.fx.spawn({ x: bx + Math.random() * bw, y: by + Math.random() * bh, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, max: 0.45, size: 1, colors: ["#ffffff", "#ecd8ff", color], additive: true });
    }
    if (tier === "legendary") {
      // Embers licking up the blade plus gold glints.
      for (let i = 0; i < 2; i++) {
        this.fx.spawn({ x: bx + Math.random() * bw, y: by + Math.random() * bh * 0.7, vx: (Math.random() - 0.5) * 12, vy: -40 - Math.random() * 40, max: 0.5 + Math.random() * 0.3, size: 1 + (i === 0 ? 1 : 0), colors: ["#fff3c4", "#ffc93c", "#ff7a1a", "#8a2a00"], additive: true });
      }
      if (Math.random() < 0.2) this.fx.spawn({ x: bx + Math.random() * bw, y: by + Math.random() * bh, max: 0.25, size: 2, colors: ["#ffffff", "#fff3c4"], additive: true });
    }
  }

  /** Draw a sprite anchored at its feet, with squash/stretch. */
  private blit(s: Sprite, x: number, y: number, w: number, h: number, flip: boolean, sx: number, sy: number): void {
    const { ctx } = this;
    const src = raster(s);
    const dw = Math.round(w * sx);
    const dh = Math.round(h * sy);
    const fx = Math.round(x + w / 2);
    const fy = Math.round(y + h);
    ctx.save();
    ctx.translate(fx, fy);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(src, -Math.round(dw / 2), -dh, dw, dh);
    ctx.restore();
  }

  private drawUnitBars(units: readonly UnitView[], tick: number, now: number): void {
    const { ctx } = this;
    void tick;
    for (const u of units) {
      const p = this.positions.get(u.uid);
      if (!p || !u.alive) continue;
      if (now < this.introUntil && u.kind === "chapterBoss") continue;
      if (u.kind === "minion" && u.hp >= u.maxHp) continue; // keep swarms readable
      const bw = Math.max(26, Math.min(p.w, 64));
      const bx = Math.round(p.x + p.w / 2 - bw / 2);
      const by = p.y - 9;
      ctx.fillStyle = C.outline;
      ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
      ctx.fillStyle = "#2c2c3a";
      ctx.fillRect(bx, by, bw, 4);
      const pct = u.hp / u.maxHp;
      ctx.fillStyle = u.side === 0 ? (pct < 0.3 ? C.danger : C.heal) : C.danger;
      ctx.fillRect(bx, by, Math.max(1, Math.round(bw * pct)), 4);
      ctx.fillStyle = "#ffffff40";
      ctx.fillRect(bx, by, Math.max(1, Math.round(bw * pct)), 1);
      if (u.shield > 0) {
        ctx.fillStyle = "#8fd6ff";
        ctx.fillRect(bx, by - 3, Math.min(bw, Math.max(1, Math.round((bw * u.shield) / u.maxHp))), 2);
      }
    }
  }

  private skillFx(src: number, quality: string, now: number): void {
    const p = this.positions.get(src);
    if (!p) return;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const isHero = src === this.heroUid;
    const cls = isHero ? this.heroClass : "enemy";
    if (quality === "perfect") {
      this.zoomUntil = now + 300;
      this.flashScreen(C.teal, 120, 0.25, now);
      this.fx.ring({ x: cx, y: cy, r0: 6, r1: 70, color: C.teal, width: 3, squash: 0.7, max: 0.45 });
    }
    this.hitStop(quality === "perfect" ? 90 : 50, now);
    if (cls === "butcher") {
      this.skillGlow = { color: C.teal, until: now + 450, uid: src };
      this.shake(4, 220, now);
      this.fx.ring({ x: cx, y: p.y + p.h, r0: 6, r1: 90, color: C.teal, width: 3, squash: 0.3, max: 0.4 });
      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2;
        this.fx.spawn({ x: cx + Math.cos(ang) * 10, y: cy + Math.sin(ang) * 6, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 70, drag: 3, max: 0.35, size: 2, colors: ["#ffffff", C.teal, "#1f9e9c"], streak: true, additive: true });
      }
    } else if (cls === "gunslinger") {
      this.skillGlow = { color: "#fff3c4", until: now + 200, uid: src };
      this.shake(6, 240, now);
      const target = this.units.filter((u) => u.side === 1 && u.alive).sort((a, b) => b.hp - a.hp)[0];
      const tp = target && this.positions.get(target.uid);
      const mx = p.x + p.w + 2;
      const my = p.y + p.h * 0.55;
      for (let i = 0; i < 18; i++) {
        const ang = (Math.random() - 0.5) * 1.2;
        this.fx.spawn({ x: mx, y: my, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 120, drag: 6, max: 0.18, size: 2, colors: ["#ffffff", "#fff3c4", C.gold], additive: true });
      }
      if (tp) {
        const tx = tp.x + tp.w / 2;
        const ty = tp.y + tp.h / 2;
        const n = Math.ceil(Math.hypot(tx - mx, ty - my) / 3);
        for (let i = 0; i < n; i++) {
          const t = i / n;
          this.fx.spawn({ x: mx + (tx - mx) * t, y: my + (ty - my) * t, max: 0.18 + t * 0.1, size: 3, colors: ["#ffffff", "#fff3c4", C.gold], additive: true });
        }
        this.fx.ring({ x: tx, y: ty, r0: 4, r1: 40, color: C.gold, width: 3, squash: 1, max: 0.3 });
        this.fx.ring({ x: tx, y: ty, r0: 2, r1: 24, color: "#ffffff", width: 2, squash: 1, max: 0.2 });
        this.fx.hitSparks(tx, ty, 1, true);
      }
    } else if (cls === "hexer") {
      this.skillGlow = { color: "#6cc31f", until: now + 600, uid: src };
      this.shake(3, 200, now);
      for (const u of this.units) {
        if (u.side !== 1 || !u.alive) continue;
        const tp = this.positions.get(u.uid);
        if (!tp) continue;
        // Toxic cloud above, rain below, splash on the ground.
        for (let i = 0; i < 10; i++) this.fx.spawn({ x: tp.x + Math.random() * tp.w, y: tp.y - 14 + Math.random() * 6, vx: (Math.random() - 0.5) * 10, max: 0.8, size: 4, colors: ["#3d7a14", "#2f4a1c", "#1f3a0e"] });
        for (let i = 0; i < 14; i++) this.fx.spawn({ x: tp.x + Math.random() * tp.w, y: tp.y - 10, vy: 160 + Math.random() * 60, max: 0.4, size: 1, colors: ["#a6f03a", "#6cc31f"], streak: true, floor: tp.y + tp.h, additive: true });
        this.fx.ring({ x: tp.x + tp.w / 2, y: tp.y + tp.h, r0: 2, r1: tp.w * 0.7, color: "#a6f03a", width: 2, squash: 0.3, max: 0.5 });
      }
    } else {
      // Enemy hero (PvP) or boss: red burst.
      this.fx.ring({ x: cx, y: cy, r0: 4, r1: 50, color: C.danger, width: 3, squash: 0.6, max: 0.4 });
      this.shake(3, 180, now);
    }
  }

  private mechanicFx(uid: number, what: string, now: number): void {
    const p = this.positions.get(uid);
    const cx = p ? p.x + p.w / 2 : 0;
    const cy = p ? p.y + p.h / 2 : 0;
    switch (what) {
      case "shield_broken":
        if (p) {
          for (let i = 0; i < 30; i++) {
            const ang = Math.random() * Math.PI * 2;
            this.fx.spawn({ x: cx + Math.cos(ang) * p.w * 0.5, y: cy + Math.sin(ang) * p.h * 0.5, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140 - 40, g: 300, max: 0.6, size: 2, colors: ["#ffffff", "#cfe6ff", "#8fd6ff"], streak: true });
          }
        }
        this.shake(5, 200, now);
        this.hitStop(80, now);
        this.flashScreen("#8fd6ff", 120, 0.25, now);
        break;
      case "charge_start":
        this.anim(uid).chargeAt = now;
        break;
      case "charge_interrupted":
        this.anim(uid).chargeAt = -1e9;
        if (p) this.fx.ring({ x: cx, y: cy, r0: 4, r1: 50, color: C.teal, width: 3, squash: 1, max: 0.35 });
        this.hitStop(70, now);
        break;
      case "slam":
        this.anim(uid).chargeAt = -1e9;
        if (p) {
          this.fx.dust(cx, p.y + p.h, 30, "#8a6a4a");
          this.fx.ring({ x: cx, y: p.y + p.h, r0: 8, r1: 140, color: C.danger, width: 4, squash: 0.25, max: 0.45 });
        }
        this.shake(9, 380, now);
        this.flashScreen("#ff3b4e", 140, 0.25, now);
        break;
      case "spore_explode":
        if (p) {
          this.fx.ring({ x: cx, y: cy, r0: 2, r1: 30, color: "#a6f03a", width: 3, squash: 1, max: 0.3 });
          for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            this.fx.spawn({ x: cx, y: cy, vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90, drag: 2, max: 0.5, size: 2, colors: ["#e8ffb0", "#a6f03a", "#3d7a14"], additive: true });
          }
        }
        this.shake(3, 150, now);
        break;
      case "summon_rats":
      case "summon_knights":
        if (p) this.fx.smoke(cx + 30, p.y + p.h - 6);
        this.shake(2, 150, now);
        break;
      case "enrage":
        this.anim(uid).enraged = true;
        this.shake(6, 500, now);
        this.flashScreen("#ff3b4e", 200, 0.3, now);
        break;
      default:
        if (what.startsWith("steal_") && p) {
          this.fx.ring({ x: cx, y: cy, r0: 30, r1: 2, color: "#f08ac0", width: 2, squash: 1, max: 0.4 });
        }
    }
  }

  private drawTelegraphs(units: readonly UnitView[], now: number): void {
    const { ctx } = this;
    for (const u of units) {
      const a = this.anims.get(u.uid);
      const p = this.positions.get(u.uid);
      if (!a || !p || !u.alive) continue;
      const t = (now - a.chargeAt) / 3000;
      if (t < 0 || t > 1.2) continue;
      // Growing red danger zone on the floor while the golem charges.
      const r = 20 + Math.min(1, t) * 120;
      ctx.globalAlpha = 0.18 + 0.15 * Math.abs(Math.sin(now / 90));
      ctx.fillStyle = C.danger;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h, r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawFog(W: number, H: number, now: number): void {
    const { ctx } = this;
    if (!this.fog) {
      const f = document.createElement("canvas");
      f.width = 256;
      f.height = 64;
      const fc = f.getContext("2d")!;
      for (let i = 0; i < 40; i++) {
        const g = fc.createRadialGradient(Math.random() * 256, 32 + (Math.random() - 0.5) * 30, 0, Math.random() * 256, 32, 20 + Math.random() * 30);
        g.addColorStop(0, "rgba(200,220,210,0.18)");
        g.addColorStop(1, "rgba(200,220,210,0)");
        fc.fillStyle = g;
        fc.fillRect(0, 0, 256, 64);
      }
      this.fog = f;
    }
    const floor = this.floorY();
    ctx.globalAlpha = 0.5;
    for (const [speed, y, scale] of [
      [8, floor - 30, 2],
      [-14, floor + 6, 2.6],
    ] as const) {
      const fw = 256 * scale;
      const off = ((now / 1000) * speed) % fw;
      for (let x = off - fw; x < W + fw; x += fw) ctx.drawImage(this.fog, x, y, fw, 64 * scale * 0.6);
    }
    ctx.globalAlpha = 1;
    void H;
  }

  private drawLights(W: number, H: number, now: number): void {
    const { ctx } = this;
    const bg = this.bg!;
    ctx.globalCompositeOperation = "lighter";
    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, a));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const flicker = 0.85 + Math.sin(now / 70) * 0.05 + Math.sin(now / 23) * 0.04;
    glow(bg.lamp.x * ART + 2, bg.lamp.y * ART + 6, 70, bg.ramps.light[3]!, 0.22 * flicker);
    if (bg.chapter === "sewers") glow(bg.feature.x * ART, bg.floorY * ART, 60, bg.ramps.hazard[3]!, 0.16);
    if (bg.chapter === "foundry") glow(bg.feature.x * ART, bg.feature.y * ART, 90, bg.ramps.light[3]!, 0.28 * flicker);
    if (bg.chapter === "abyss_throne") glow(bg.feature.x * ART, bg.feature.y * ART, 80, bg.ramps.light[3]!, 0.25 * flicker);
    if (this.skillGlow && now < this.skillGlow.until) {
      const p = this.positions.get(this.skillGlow.uid);
      if (p) glow(p.x + p.w / 2, p.y + p.h / 2, 90, this.skillGlow.color, 0.35 * ((this.skillGlow.until - now) / 450));
    }
    ctx.globalCompositeOperation = "source-over";
    void W;
    void H;
  }

  private drawFloats(now: number): void {
    const { ctx } = this;
    this.floats = this.floats.filter((f) => now - f.born < 850);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (const f of this.floats) {
      const p = this.positions.get(f.uid);
      if (!p) continue;
      const age = Math.max(0, now - f.born) / 850;
      const pop = age < 0.12 ? 1.7 - (age / 0.12) * 0.7 : 1;
      const size = Math.round(f.size * pop);
      const wobble = f.crit ? Math.sin(now / 40) * 2 : 0;
      const x = Math.round(p.x + p.w / 2 + f.dx + wobble);
      const y = Math.round(p.y - 14 - easeOut(Math.min(1, age * 1.4)) * 26);
      ctx.font = `${size}px ${FONT}`;
      ctx.globalAlpha = age > 0.75 ? (1 - age) * 4 : 1;
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.outline;
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
      ctx.globalAlpha = 1;
    }
  }

  private drawOverlays(W: number, H: number, now: number): void {
    const { ctx } = this;
    // Vignette.
    if (!this.vignette) {
      const v = document.createElement("canvas");
      v.width = W;
      v.height = H;
      const vc = v.getContext("2d")!;
      const g = vc.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      vc.fillStyle = g;
      vc.fillRect(0, 0, W, H);
      this.vignette = v;
    }
    ctx.drawImage(this.vignette, 0, 0);

    // Low-HP danger pulse.
    const hero = this.units.find((u) => u.uid === this.heroUid);
    if (hero && hero.alive && hero.hp / hero.maxHp < 0.3) {
      const a = 0.18 + Math.sin(now / 160) * 0.1;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, "rgba(255,59,78,0)");
      g.addColorStop(1, `rgba(255,59,78,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Boss intro letterbox.
    if (now < this.introUntil) {
      const t = (now - this.introStart) / (this.introUntil - this.introStart);
      const bar = Math.round(H * 0.12 * (t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1));
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
    }

    // Screen flash.
    if (this.flash && now < this.flash.until) {
      const f = this.flash;
      ctx.globalAlpha = f.alpha * (1 - (now - f.start) / (f.until - f.start));
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Banner.
    if (this.banner) {
      const age = now - this.banner.born;
      const dur = this.banner.big ? 1300 : 1100;
      if (age < dur) {
        const t = age / dur;
        const slide = t < 0.15 ? (1 - t / 0.15) * W : t > 0.85 ? -((t - 0.85) / 0.15) * W : 0;
        const big = this.banner.big;
        const bh = big ? 46 : 28;
        const by = big ? H * 0.3 : 18;
        ctx.fillStyle = "#000000c8";
        ctx.fillRect(0, by, W, bh);
        ctx.fillStyle = big ? C.danger : C.gold;
        ctx.fillRect(0, by, W, 2);
        ctx.fillRect(0, by + bh - 2, W, 2);
        ctx.font = `${big ? 26 : 16}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = C.outline;
        ctx.strokeText(this.banner.text, W / 2 + slide, by + bh / 2 + (big ? 9 : 6));
        ctx.fillStyle = big ? "#ffd0d4" : C.bone;
        ctx.fillText(this.banner.text, W / 2 + slide, by + bh / 2 + (big ? 9 : 6));
      }
    }
  }
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}
