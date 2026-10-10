/**
 * Pooled pixel particles for battle juice. Coordinates are canvas pixels (the battle canvas runs at 2× the
 * art resolution, so a 1-px particle is half an art pixel — finer than the sprites, like modern pixel games).
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Gravity in px/s². */
  g: number;
  /** Velocity damping per second (0 = none). */
  drag: number;
  life: number;
  max: number;
  size: number;
  /** Colors over lifetime, first → last. */
  colors: readonly string[];
  /** Draw as a short streak along velocity. */
  streak: boolean;
  additive: boolean;
  /** Ground y; particles bounce/stop there. */
  floor: number;
}

export interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  life: number;
  max: number;
  color: string;
  width: number;
  squash: number;
}

const MAX = 900;

export class ParticleSystem {
  readonly particles: Particle[] = [];
  readonly rings: Ring[] = [];

  spawn(p: Partial<Particle> & { x: number; y: number }): void {
    if (this.particles.length >= MAX) this.particles.shift();
    this.particles.push({
      vx: 0,
      vy: 0,
      g: 0,
      drag: 0,
      life: 0,
      max: 0.6,
      size: 1,
      colors: ["#ffffff"],
      streak: false,
      additive: false,
      floor: Infinity,
      ...p,
    });
  }

  ring(r: Partial<Ring> & { x: number; y: number }): void {
    this.rings.push({ r0: 2, r1: 30, life: 0, max: 0.35, color: "#ffffff", width: 2, squash: 0.45, ...r });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.g * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) if (this.particles[i]!.life >= this.particles[i]!.max) this.particles.splice(i, 1);
    for (const r of this.rings) r.life += dt;
    for (let i = this.rings.length - 1; i >= 0; i--) if (this.rings[i]!.life >= this.rings[i]!.max) this.rings.splice(i, 1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rings) {
      const t = r.life / r.max;
      const rad = r.r0 + (r.r1 - r.r0) * easeOut(t);
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, r.width * (1 - t * 0.6));
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * r.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const additive of [false, true]) {
      if (additive) ctx.globalCompositeOperation = "lighter";
      for (const p of this.particles) {
        if (p.additive !== additive) continue;
        const t = p.life / p.max;
        ctx.fillStyle = p.colors[Math.min(p.colors.length - 1, Math.floor(t * p.colors.length))]!;
        if (t > 0.75) ctx.globalAlpha = (1 - t) * 4;
        const s = Math.max(1, Math.round(p.size * (1 - t * 0.5)));
        if (p.streak) {
          const len = Math.min(6, Math.hypot(p.vx, p.vy) * 0.02);
          const ang = Math.atan2(p.vy, p.vx);
          for (let i = 0; i < len; i++) ctx.fillRect(Math.round(p.x - Math.cos(ang) * i), Math.round(p.y - Math.sin(ang) * i), s, s);
        } else {
          ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // ───────────────────────── emitters ─────────────────────────

  /** Small white-gold sparks on a normal hit. */
  hitSparks(x: number, y: number, dir: number, crit = false): void {
    const n = crit ? 22 : 9;
    for (let i = 0; i < n; i++) {
      const a = (Math.random() - 0.5) * (crit ? Math.PI * 2 : 1.6) + (dir > 0 ? 0 : Math.PI);
      const sp = (crit ? 120 : 70) + Math.random() * (crit ? 140 : 70);
      this.spawn({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        g: 220,
        drag: 2,
        max: 0.25 + Math.random() * 0.25,
        size: crit && i % 3 === 0 ? 2 : 1,
        colors: crit ? ["#ffffff", "#fff3c4", "#ffc93c", "#ff7a1a"] : ["#ffffff", "#e8e6e3", "#9a9aa8"],
        streak: true,
        additive: true,
      });
    }
    if (crit) this.ring({ x, y, r0: 2, r1: 22, color: "#ffc93c", width: 2, squash: 0.8, max: 0.25 });
  }

  /** Goo/blood splat in the creature's color that lands on the floor. */
  splat(x: number, y: number, color: string, floor: number, dir: number): void {
    for (let i = 0; i < 8; i++) {
      this.spawn({
        x,
        y,
        vx: dir * (30 + Math.random() * 90),
        vy: -40 - Math.random() * 80,
        g: 420,
        max: 0.6 + Math.random() * 0.5,
        size: 1 + (i % 2),
        colors: [color],
        floor,
      });
    }
  }

  /** Sprite pixels fly apart and fade — the death dissolve. */
  dissolve(pixels: readonly { x: number; y: number; color: string }[], ox: number, oy: number, scale: number, floor: number): void {
    for (let i = 0; i < pixels.length; i += 2) {
      const px = pixels[i]!;
      this.spawn({
        x: ox + px.x * scale,
        y: oy + px.y * scale,
        vx: (Math.random() - 0.3) * 70,
        vy: -30 - Math.random() * 90,
        g: Math.random() < 0.5 ? 260 : -40,
        drag: 1,
        max: 0.5 + Math.random() * 0.7,
        size: scale,
        colors: [px.color, px.color, "#4a4058"],
        floor,
      });
    }
    // Soul wisps rising.
    for (let i = 0; i < 6; i++) {
      this.spawn({
        x: ox + Math.random() * 20,
        y: oy + Math.random() * 20,
        vx: (Math.random() - 0.5) * 12,
        vy: -40 - Math.random() * 30,
        max: 0.9,
        size: 2,
        colors: ["#d0e6ff", "#7fb0e0", "#3a3a4a"],
        additive: true,
      });
    }
  }

  /** Coins burst out and bounce (used on kills and loot). */
  coins(x: number, y: number, floor: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      this.spawn({
        x,
        y,
        vx: (Math.random() - 0.5) * 120,
        vy: -90 - Math.random() * 70,
        g: 380,
        max: 0.9 + Math.random() * 0.4,
        size: 2,
        colors: ["#fff3c4", "#ffc93c", "#b8860b"],
        floor,
      });
    }
  }

  /** Rising green pluses for heals. */
  healMotes(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.spawn({
        x: x + (Math.random() - 0.5) * 18,
        y: y + Math.random() * 10,
        vy: -30 - Math.random() * 25,
        max: 0.7,
        size: 2,
        colors: ["#d4ffe2", "#5cff8f", "#2f8a4f"],
        additive: true,
      });
    }
  }

  /** Bubbles rising from a poisoned unit. */
  poisonBubble(x: number, y: number): void {
    this.spawn({ x, y, vx: (Math.random() - 0.5) * 6, vy: -18 - Math.random() * 12, max: 0.8, size: 1 + (Math.random() < 0.3 ? 1 : 0), colors: ["#a6f03a", "#6cc31f", "#3d7a14"] });
  }

  /** Dust puff at the feet (landings, slams, spawns). */
  dust(x: number, y: number, n = 10, color = "#6b5233"): void {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      this.spawn({ x, y, vx: Math.cos(a) * (20 + Math.random() * 50), vy: Math.sin(a) * 18, drag: 3, max: 0.5 + Math.random() * 0.3, size: 2, colors: [color, "#4a3824", "#221a11"] });
    }
  }

  /** Smoke puff for summons. */
  smoke(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      this.spawn({ x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 25, drag: 2, max: 0.7, size: 3, colors: ["#8a8094", "#5a5468", "#2a2633"] });
    }
  }

  /** Ambient floating motes in the backdrop. */
  ambient(w: number, h: number, color: string): void {
    this.spawn({ x: Math.random() * w, y: h * (0.2 + Math.random() * 0.6), vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 5, max: 3 + Math.random() * 2, size: 1, colors: [color], additive: true });
  }
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
