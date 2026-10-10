import { CHAPTER_RAMPS, type ChapterRamps } from "./palette.ts";

/**
 * Procedural pixel backdrops, one look per chapter, built from the chapter's 5-step ramps.
 * The static part is painted once into a low-res canvas; `animate()` adds the moving bits
 * (sludge, drips, flicker, sparks) every frame at almost no cost.
 */
export interface Backdrop {
  canvas: HTMLCanvasElement;
  floorY: number;
  ramps: ChapterRamps;
  chapter: string;
  /** Feature anchor (pipe mouth, furnace, rift...) for animated effects. */
  feature: { x: number; y: number; r: number };
  lamp: { x: number; y: number };
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, Backdrop>();

export function backdrop(chapter: string, w: number, h: number): Backdrop {
  const key = `${chapter}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const ramps = CHAPTER_RAMPS[chapter] ?? CHAPTER_RAMPS.sewers!;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const r = rng(chapter.length * 7919 + w * 31 + h);
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, rw: number, rh: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));
  };

  const floorY = Math.round(h * 0.78);

  // Wall: running-bond bricks with per-brick tone and a lit top edge.
  rect(0, 0, w, floorY, ramps.wall[0]!);
  const bh = 5;
  const bw = 10;
  for (let row = 0; row * bh < floorY; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < w + bw; x += bw) {
      const tone = ramps.wall[1 + Math.floor(r() * 3)]!;
      const bx = x + offset;
      const by = row * bh;
      rect(bx + 1, by + 1, bw - 1, bh - 1, tone);
      if (r() < 0.55) rect(bx + 1, by + 1, bw - 2, 1, ramps.wall[Math.min(4, 2 + Math.floor(r() * 3))]!);
      if (r() < 0.15) px(bx + 2 + Math.floor(r() * (bw - 4)), by + 2 + Math.floor(r() * 2), ramps.wall[0]!);
    }
  }
  // Darken the wall toward the floor and the edges (vignette in 3 steps).
  ctx.globalAlpha = 0.35;
  rect(0, floorY - 10, w, 10, ramps.wall[0]!);
  rect(0, 0, 6, floorY, ramps.wall[0]!);
  rect(w - 6, 0, 6, floorY, ramps.wall[0]!);
  ctx.globalAlpha = 1;

  // Growth: hanging strands from the ceiling and patches along the wall.
  for (let x = 0; x < w; x += 1 + Math.floor(r() * 3)) {
    const len = Math.floor(r() * r() * 14);
    for (let y = 0; y < len; y++) px(x, y, ramps.growth[Math.max(1, 4 - Math.floor((y / Math.max(1, len)) * 3))]!);
  }
  for (let i = 0; i < w / 6; i++) {
    const cx = Math.floor(r() * w);
    const cy = Math.floor(r() * floorY);
    const size = 1 + Math.floor(r() * 3);
    for (let dx = -size; dx <= size; dx++)
      for (let dy = -1; dy <= 1; dy++) if (r() < 0.7) px(cx + dx, cy + dy, ramps.growth[1 + Math.floor(r() * 3)]!);
  }

  // Floor: muddy bands, pebbles and a lit lip where it meets the wall.
  for (let y = floorY; y < h; y++) {
    const band = Math.min(4, Math.floor(((y - floorY) / (h - floorY)) * 3) + 1);
    rect(0, y, w, 1, ramps.floor[4 - band]!);
  }
  rect(0, floorY, w, 1, ramps.floor[4]!);
  for (let i = 0; i < w * 0.8; i++) px(Math.floor(r() * w), floorY + 2 + Math.floor(r() * (h - floorY - 2)), ramps.floor[Math.floor(r() * 5)]!);

  // Chapter feature.
  const feature = { x: Math.round(w * 0.64), y: Math.round(floorY * 0.48), r: Math.round(Math.min(w, floorY) * 0.26) };
  const ring = (cx: number, cy: number, rad: number, thick: number, colors: string[]) => {
    for (let y = -rad - thick; y <= rad + thick; y++)
      for (let x = -rad - thick; x <= rad + thick; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= rad + thick && d > rad) {
          const lit = x + y < 0 ? 1 : 0;
          px(cx + x, cy + y, colors[Math.min(colors.length - 1, 2 + lit + (d > rad + thick - 1 ? -1 : 0))]!);
        } else if (d <= rad) {
          const depth = d / rad;
          px(cx + x, cy + y, depth > 0.8 ? ramps.wall[1]! : "#07070a");
        }
      }
  };

  switch (chapter) {
    case "iron_graveyard": {
      // Stone arch with a cold glow, tombstones on the floor.
      ring(feature.x, feature.y + 4, feature.r, 3, ramps.growth);
      rect(feature.x - feature.r, feature.y + 4, feature.r * 2 + 1, floorY - feature.y - 4, "#07070a");
      for (let i = 0; i < 4; i++) {
        const tx = Math.round(w * (0.1 + i * 0.24));
        rect(tx, floorY - 7, 6, 8, ramps.growth[3]!);
        rect(tx + 1, floorY - 8, 4, 1, ramps.growth[3]!);
        rect(tx + 2, floorY - 5, 2, 1, ramps.growth[1]!);
      }
      break;
    }
    case "ghost_market": {
      // Striped awning and a dark stall opening.
      const ax = Math.round(w * 0.42);
      for (let x = 0; x < Math.round(w * 0.5); x++) rect(ax + x, feature.y - 10, 1, 6, Math.floor(x / 4) % 2 ? ramps.light[2]! : ramps.growth[3]!);
      rect(ax + 2, feature.y - 4, Math.round(w * 0.5) - 4, floorY - feature.y + 4, "#09070c");
      break;
    }
    case "foundry": {
      // Furnace mouth.
      rect(feature.x - feature.r, feature.y - feature.r * 0.6, feature.r * 2, feature.r * 1.6, ramps.metal[2]!);
      rect(feature.x - feature.r + 3, feature.y - feature.r * 0.6 + 3, feature.r * 2 - 6, feature.r * 1.6 - 6, ramps.light[1]!);
      rect(feature.x - feature.r + 5, feature.y - feature.r * 0.6 + 6, feature.r * 2 - 10, feature.r * 1.6 - 10, ramps.light[2]!);
      break;
    }
    case "fungal_depths": {
      // Giant mushrooms.
      for (const [mx, size] of [
        [w * 0.18, 9],
        [w * 0.72, 13],
        [w * 0.9, 7],
      ] as const) {
        const x0 = Math.round(mx);
        rect(x0 - 1, floorY - size * 1.6, 3, size * 1.6, ramps.floor[4]!);
        for (let dy = 0; dy < size / 1.6; dy++) rect(x0 - size + dy, floorY - size * 1.6 - size / 1.6 + dy, (size - dy) * 2, 1, ramps.hazard[1 + (dy % 2)]!);
      }
      break;
    }
    case "abyss_throne": {
      // Pillars and a red rift.
      for (const x of [w * 0.12, w * 0.88]) {
        rect(x - 4, 0, 8, floorY, ramps.wall[3]!);
        rect(x - 4, 0, 2, floorY, ramps.wall[4]!);
      }
      rect(feature.x - 2, feature.y - feature.r, 4, feature.r * 2, ramps.light[2]!);
      rect(feature.x - 1, feature.y - feature.r - 4, 2, feature.r * 2 + 8, ramps.light[3]!);
      break;
    }
    default: {
      // The Sewers: big rusted pipe with a dark mouth (sludge is animated).
      ring(feature.x, feature.y, feature.r, 4, ramps.metal);
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        px(Math.round(feature.x + Math.cos(ang) * (feature.r + 2)), Math.round(feature.y + Math.sin(ang) * (feature.r + 2)), ramps.metal[4]!);
      }
      // Sludge pool on the floor.
      for (let x = -feature.r; x <= feature.r; x++) rect(feature.x + x, floorY, 1, 2 + Math.round((1 - Math.abs(x) / feature.r) * 3), ramps.hazard[1 + (Math.abs(x) % 2)]!);
    }
  }

  // Oil lamp on the left wall.
  const lamp = { x: Math.round(w * 0.1), y: Math.round(floorY * 0.38) };
  for (let rad = 14; rad > 0; rad -= 4) {
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = ramps.light[3]!;
    ctx.beginPath();
    ctx.arc(lamp.x + 1, lamp.y + 3, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  rect(lamp.x, lamp.y - 4, 1, 3, ramps.metal[3]!);
  rect(lamp.x - 1, lamp.y - 1, 4, 1, ramps.metal[2]!);
  rect(lamp.x - 1, lamp.y, 4, 5, ramps.light[1]!);
  rect(lamp.x, lamp.y + 1, 2, 3, ramps.light[3]!);
  rect(lamp.x - 1, lamp.y + 5, 4, 1, ramps.metal[2]!);

  const result = { canvas, floorY, ramps, chapter, feature, lamp };
  cache.set(key, result);
  return result;
}

/** Moving details on top of the static backdrop. `t` is milliseconds. */
export function animate(ctx: CanvasRenderingContext2D, b: Backdrop, t: number): void {
  const { ramps, feature, floorY, lamp } = b;
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  const step = Math.floor(t / 120);

  // Lamp flicker.
  if (step % 7 !== 0) px(lamp.x + (step % 2), lamp.y + 1, ramps.light[4]!);

  if (b.chapter === "sewers") {
    // Sludge pouring from the pipe mouth to the floor, scrolling down.
    const top = feature.y + Math.round(feature.r * 0.6);
    for (let y = top; y < floorY; y++) {
      for (let dx = -3; dx <= 3; dx++) {
        const v = (y - step * 2 + dx * 3) & 7;
        const c = v < 2 ? ramps.hazard[3]! : v < 5 ? ramps.hazard[2]! : ramps.hazard[1]!;
        if (Math.abs(dx) === 3 && v > 3) continue;
        px(feature.x + dx, y, c);
      }
    }
    // Drips along the wall.
    for (let i = 0; i < 4; i++) {
      const x = Math.round((i * 37 + 11) % (b.canvas.width - 4)) + 2;
      const y = (step * 2 + i * 23) % floorY;
      px(x, y, ramps.hazard[3]!);
    }
  } else if (b.chapter === "foundry") {
    for (let i = 0; i < 6; i++) px(feature.x - feature.r + 6 + ((i * 7 + step) % (feature.r * 2 - 12)), feature.y - ((step * 3 + i * 9) % feature.r), ramps.light[3 + (i % 2)]!);
  } else {
    // Floating motes (spores, embers, wisps) in the chapter's hazard color.
    for (let i = 0; i < 8; i++) {
      const x = (i * 29 + step) % b.canvas.width;
      const y = floorY - ((step * 2 + i * 17) % floorY);
      px(x, y, ramps.hazard[2 + (i % 3)]!);
    }
  }
}
