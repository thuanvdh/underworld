import type { ClassId, Look, Rarity } from "@underworld/shared";
import { C, RARITY_COLOR } from "./palette.ts";
import { outlined, type Palette, type Sprite } from "./pixel.ts";

/**
 * Paper-doll heroes. Each class has an unarmed base grid where every body part uses its own letters:
 *   a A z  head gear (bandana / hat / hood)     t T u  torso (shirt / coat / robe)
 *   l L m  class accent (apron / scarf / sash)    w W    hands (skin, or gloves)
 *   p P    legs                                    o O    boots
 *   s S d  skin    b beard    k/e eyes    x hood shadow
 * Equipped slots recolor their part with the item's rarity material, and the class weapon is drawn in
 * the right hand, tinted by its rarity. Results are cached per class + look.
 */

type Tier = Rarity | "none";

interface Part {
  base: [string, string, string]; // dark, mid, light
}

const MATERIAL: Record<Rarity, [string, string, string]> = {
  common: ["#4a3c30", "#6b5a48", "#8a7660"], // worn leather
  uncommon: ["#344a26", "#4f6b3a", "#6f8f50"], // green-trimmed leather
  rare: ["#3a4a60", "#5a6e8a", "#8aa4c8"], // blued steel
  epic: ["#2a1450", "#5a2f8a", "#c08cf0"], // enchanted violet
  legendary: ["#4a1a10", "#a8401a", "#ffc93c"], // ember red, gold trim
};

const METAL: Record<Tier, { h: string; g: string; G: string; j: string; J: string }> = {
  none: { h: "#4a4a56", g: "#8a8a96", G: "#c8c8d2", j: "#6a6a7a", J: "#a0a0b0" },
  common: { h: "#4a4a56", g: "#8a8a96", G: "#c8c8d2", j: "#8a8a96", J: "#c8c8d2" },
  uncommon: { h: "#3a4a36", g: "#8fa88a", G: "#d0ecc8", j: "#4fbf3a", J: "#a6f07a" },
  rare: { h: "#2a3a60", g: "#7a9ac8", G: "#d0e4ff", j: "#3fa0ff", J: "#a8d8ff" },
  epic: { h: "#3a1a60", g: "#a07ad0", G: "#ecd8ff", j: "#b46cff", J: "#e8c8ff" },
  legendary: { h: "#8a4a10", g: "#ffc93c", G: "#fff3c4", j: "#ff7a1a", J: "#ffd06a" },
};

interface ClassArt {
  rows: string[];
  /** Right hand pixel (base grid coords) where the weapon grip goes. */
  hand: [number, number];
  /** Unequipped colors for each part. */
  head: Part;
  torso: Part;
  accent: Part;
  boots: [string, string];
  legs: [string, string];
  extra: Palette;
  weapon: { rows: string[]; grip: [number, number] };
}

const SKIN = { s: "#9a6440", S: "#c08458", d: "#6b4128" };

const ART: Record<ClassId, ClassArt> = {
  butcher: {
    rows: [
      "....zzaaaAA.....",
      "...zaaaaaaAA....",
      "..zzaaaaaaaAA...",
      ".z.dssssssSS....",
      "z..dsssskSSS....",
      "...dssssssSs....",
      "...dbsssssSb....",
      "...bbbbsssbb....",
      "....bbbbbbb.....",
      "..uutttttttTT...",
      ".uuttlllllLtTT..",
      ".uwttlllllLtTw..",
      ".dwutlllllLtTw..",
      ".dw.ulllllLm.w..",
      "..d.mlllllLm....",
      "....mlllllmm....",
      "....pppPPPpp....",
      "....ppp..Ppp....",
      "....ppp..Ppp....",
      "....ppp..Ppp....",
      "...oooo..oooo...",
      "...oOoo..oOoo...",
    ],
    hand: [13, 12],
    head: { base: ["#7d2219", "#c43a2f", "#e8573f"] },
    torso: { base: ["#7d2219", "#c43a2f", "#e8573f"] },
    accent: { base: ["#48301b", "#6e4a2a", "#946437"] },
    boots: ["#3a271a", "#5a3d24"],
    legs: ["#2e2e3c", "#44445a"],
    extra: { b: "#2a1b12", k: C.abyss },
    // Cleaver held upright, blade above the fist.
    weapon: {
      rows: ["hhhhh.", "Gggggh", "Gggggh", "Gggggh", "GGGGGh", "..nN..", "..nN..", "..nN.."],
      grip: [2, 6],
    },
  },
  gunslinger: {
    rows: [
      "................",
      ".....aaaaA......",
      ".....aaaaaA.....",
      "..aaaaaaaaaaA...",
      "....dssssSS.....",
      "....dsssskS.....",
      "....dssssSS.....",
      ".....llllll.....",
      "....llllllll....",
      "...tttttttTT....",
      "..ttttttttTTT...",
      "..wtttttttTTw...",
      "..wttttttttTw...",
      "...tttttttTT....",
      "...tttttttTT....",
      "...ttt.pp.TT....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "...oooo..oooo...",
      "...oOoo..oOoo...",
    ],
    hand: [12, 12],
    head: { base: ["#3a2614", "#5a3d24", "#7a5634"] },
    torso: { base: ["#232c40", "#2f3a52", "#44547a"] },
    accent: { base: ["#7a5a1a", "#b8862b", "#d8a848"] },
    boots: ["#3a271a", "#5a3d24"],
    legs: ["#2a2a36", "#3a3a48"],
    extra: { k: C.abyss },
    // Revolver pointing forward.
    weapon: { rows: ["hhhhhhhG", "hggggggG", "nnh.....", "nN......", "nn......"], grip: [0, 2] },
  },
  hexer: {
    rows: [
      "......aaaA......",
      ".....aaaaaA.....",
      "....aaaaaaAA....",
      "....aaxxxxAA....",
      "...aaxxexexAA...",
      "...aaxxxxxxAA...",
      "...aaaxxxxAAA...",
      "..tttttttttTTT..",
      "..tttttllltTTT..",
      ".wtttttttttTTw..",
      ".wtttttttttTTw..",
      "..tttttttttTT...",
      "..tttttttttTT...",
      "..tttttttttTT...",
      "..tttttttttTT...",
      ".tttttttttttTT..",
      ".tttttttttttTT..",
      ".tttttttttttTT..",
      "tttttttttttttTT.",
      "tttttttttttttTT.",
      ".oooo....oooo...",
      "................",
    ],
    hand: [13, 10],
    head: { base: ["#2a1840", "#3d2456", "#5a3680"] },
    torso: { base: ["#2a1840", "#3d2456", "#5a3680"] },
    accent: { base: ["#8a6a2a", "#c9a548", "#f0d27a"] },
    boots: ["#2a1d14", "#3a2a1d"],
    legs: ["#2a2a36", "#3a3a48"],
    extra: { x: "#120c18", e: "#5cff8f" },
    // Staff with an orb on top.
    weapon: {
      rows: [".j.", "jJj", "jjj", ".j.", ".n.", ".N.", ".n.", ".N.", ".n.", ".N.", ".n.", ".N.", ".n.", ".N.", ".n."],
      grip: [1, 8],
    },
  },
};

export interface HeroArt {
  sprite: Sprite;
  /** Weapon bounding box inside the sprite (pixels), for glows and particles. */
  weapon: { x: number; y: number; w: number; h: number };
  weaponTier: Tier;
  /** Overall glow: "legendary"/"epic" when 3+ worn items are that rarity or better. */
  aura: "legendary" | "epic" | null;
}

const cache = new Map<string, HeroArt>();

export function heroArt(classId: ClassId, look: Look = {}): HeroArt {
  const key = `${classId}|${["weapon", "helmet", "armor", "gloves", "boots", "amulet"].map((s) => look[s as keyof Look] ?? "-").join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const art = ART[classId];
  const tier = (r: Rarity | undefined): Tier => r ?? "none";
  const mat = (r: Rarity | undefined, fallback: [string, string, string]) => (r ? MATERIAL[r] : fallback);

  const head = mat(look.helmet, art.head.base);
  const torso = mat(look.armor, art.torso.base);
  // Accent keeps the class identity, but turns gold on legendary armor.
  const accent = look.armor === "legendary" ? MATERIAL.legendary : art.accent.base;
  const gloves = look.gloves ? MATERIAL[look.gloves] : null;
  const boots = look.boots ? [MATERIAL[look.boots][0], MATERIAL[look.boots][2]] : art.boots;
  const metal = METAL[tier(look.weapon)];

  const palette: Palette = {
    ...SKIN,
    ...art.extra,
    z: head[0],
    a: head[1],
    A: head[2],
    u: torso[0],
    t: torso[1],
    T: torso[2],
    m: accent[0],
    l: accent[1],
    L: accent[2],
    w: gloves ? gloves[1] : SKIN.s,
    W: gloves ? gloves[2] : SKIN.S,
    p: art.legs[0],
    P: art.legs[1],
    o: boots[0]!,
    O: boots[1]!,
    // Weapon layer uses its own letters so it never collides with body colors.
    g: metal.g,
    G: metal.G,
    h: metal.h,
    j: metal.j,
    J: metal.J,
    n: "#5a3d24",
    N: "#8e6638",
  };

  // Compose: place the weapon so its grip lands on the hand, growing the canvas if it sticks out.
  const wpn = art.weapon;
  const ox = art.hand[0] - wpn.grip[0];
  const oy = art.hand[1] - wpn.grip[1];
  const minX = Math.min(0, ox);
  const minY = Math.min(0, oy);
  const maxX = Math.max(art.rows[0]!.length, ox + wpn.rows[0]!.length);
  const maxY = Math.max(art.rows.length, oy + wpn.rows.length);
  const grid: string[][] = Array.from({ length: maxY - minY }, () => Array.from({ length: maxX - minX }, () => "."));
  art.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && (grid[y - minY]![x - minX] = ch)));
  wpn.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && (grid[y + oy - minY]![x + ox - minX] = ch)));

  const sprite = outlined({ rows: grid.map((r) => r.join("")), palette }, C.outline);
  const worn = Object.values(look);
  const count = (r: Rarity) => worn.filter((x) => x === r || (r === "epic" && x === "legendary")).length;
  const result: HeroArt = {
    sprite,
    // +1 for the outline border.
    weapon: { x: ox - minX + 1, y: oy - minY + 1, w: wpn.rows[0]!.length, h: wpn.rows.length },
    weaponTier: tier(look.weapon),
    aura: count("legendary") >= 3 ? "legendary" : count("epic") >= 3 ? "epic" : null,
  };
  cache.set(key, result);
  return result;
}

/** Color for a weapon tier's glow, afterimages and sparks. */
export function tierColor(tier: Tier): string {
  return tier === "none" || tier === "common" ? "#c8c8d2" : RARITY_COLOR[tier];
}

/** Base grids for the sprite sanity test. */
export const HERO_GRIDS = Object.values(ART).flatMap((a) => [a.rows, a.weapon.rows]);
