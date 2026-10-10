/**
 * Tiny pixel-art engine. A sprite is a grid of characters; each character maps to a color in its palette and
 * "." is transparent. Sprites are rasterized once into small canvases and scaled with nearest-neighbour
 * filtering, so they stay crisp at any size and cost almost nothing to draw.
 */
export type Palette = Record<string, string>;

export interface Sprite {
  rows: readonly string[];
  palette: Palette;
}

export function width(s: Sprite): number {
  return Math.max(...s.rows.map((r) => r.length));
}

export function height(s: Sprite): number {
  return s.rows.length;
}

/** Same sprite, different colors (monster variants, recolored items). */
export function recolor(s: Sprite, overrides: Palette): Sprite {
  return { rows: s.rows, palette: { ...s.palette, ...overrides } };
}

/** Add a 1-px outline around every opaque pixel. Keeps hand-drawn grids small. */
export function outlined(s: Sprite, color: string, char = "@"): Sprite {
  const w = width(s) + 2;
  const h = height(s) + 2;
  const solid = (x: number, y: number) => {
    const ch = s.rows[y - 1]?.[x - 1];
    return ch !== undefined && ch !== "." && ch !== " ";
  };
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) row += s.rows[y - 1]![x - 1];
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) row += char;
      else row += ".";
    }
    rows.push(row);
  }
  return { rows, palette: { ...s.palette, [char]: color } };
}

const cache = new WeakMap<Sprite, HTMLCanvasElement>();

/** 1:1 raster of the sprite (one canvas pixel per sprite pixel). */
export function raster(s: Sprite): HTMLCanvasElement {
  const hit = cache.get(s);
  if (hit) return hit;
  const w = width(s);
  const h = height(s);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === "." || ch === " ") continue;
      const color = s.palette[ch];
      if (!color) continue;
      const [r, g, b, a] = hexToRgba(color);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  });
  ctx.putImageData(img, 0, 0);
  cache.set(s, canvas);
  return canvas;
}

const urlCache = new WeakMap<Sprite, string>();

/** Data URL for CSS / <img> use. */
export function spriteUrl(s: Sprite): string {
  let url = urlCache.get(s);
  if (!url) {
    url = raster(s).toDataURL();
    urlCache.set(s, url);
  }
  return url;
}

/** Draw a sprite onto a canvas whose smoothing is off. `flip` mirrors it horizontally. */
export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, scale: number, flip = false): void {
  const src = raster(s);
  const w = src.width * scale;
  const h = src.height * scale;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x + w), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(src, Math.round(x), Math.round(y), w, h);
  }
}

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}
