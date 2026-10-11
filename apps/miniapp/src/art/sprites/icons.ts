import type { ClassId, Rarity, Slot } from "@underworld/shared";
import { weaponSprite } from "../hero.ts";
import { C } from "../palette.ts";
import { outlined, recolor, type Sprite } from "../pixel.ts";

const OUT = C.outline;
const METAL = { g: "#9a9aa8", G: "#d8d8e2", h: "#5c5c6c" };
const LEATHER = { l: "#6e4a2a", L: "#946437", m: "#48301b" };
const GOLD = { y: "#c9a548", Y: "#f0d27a" };

// ───────────────────────── item icons (16×16) ─────────────────────────

const weapon: Sprite = {
  rows: [
    "............hGG.",
    "...........hGGh.",
    "..........hGGh..",
    ".........hGGh...",
    "........hGGh....",
    ".......hGGh.....",
    "......hGGh......",
    "..y..hGGh.......",
    "...yhGGh........",
    "....yyh.........",
    "...nNyy.........",
    "..nNn..y........",
    ".nNn............",
    "yNn.............",
    "yy..............",
  ],
  palette: { ...METAL, ...GOLD, n: "#6b4a2b", N: "#8e6638" },
};

const helmet: Sprite = {
  rows: [
    "................",
    "................",
    ".....dmmmmd.....",
    "....dmmLLmMd....",
    "...dmmlLLlMMd...",
    "..dmmmmllmmMMd..",
    "..dmmmmmmmmMMd..",
    ".dmmmmmmmmmmMMd.",
    ".dMMMMMMMMMMMMd.",
    "dbbbbbbbbbbbbbbd",
    "dddddddddddddddd",
    "..d..........d..",
  ],
  palette: { m: "#5c5c4a", M: "#7a7a5e", d: "#3a3a2e", l: "#f0d27a", L: "#fff3c4", b: "#3a4a6a" },
};

const armor: Sprite = {
  rows: [
    "................",
    "...mm......mm...",
    "..mLLm....mLLm..",
    ".mLLLLmmmmLLLLm.",
    ".mLllllllllllLm.",
    ".mLlglllllgllLm.",
    ".mmlllllllllllm.",
    "..mlllllllllLm..",
    "..mllglllglllm..",
    "..mlllllllllLm..",
    "..mlllllllllLm..",
    "..mmmmmmmmmmmm..",
  ],
  palette: { ...LEATHER, ...METAL },
};

const gloves: Sprite = {
  rows: [
    "................",
    "................",
    ".....mmmmmm.....",
    "....mLlLlLlm....",
    "....mLlLlLlm....",
    "...mmllllllm....",
    "..mLmllllllm....",
    "..mLLllllllm....",
    "...mllllllLm....",
    "....mllllLm.....",
    "....cccccCc.....",
    "....cccccCc.....",
    "....mmmmmmm.....",
  ],
  palette: { ...LEATHER, c: "#9a9aa8", C: "#d8d8e2" },
};

const boots: Sprite = {
  rows: [
    "................",
    "......mmmmm.....",
    "......mLllm.....",
    "......mLylm.....",
    "......mLllm.....",
    "......mLylm.....",
    "......mLllm.....",
    "......mLllmm....",
    "......mLlllmm...",
    ".....mmLllllmm..",
    "....mLLlllllllm.",
    "....mLllllllllm.",
    "....ssssssssssss",
  ],
  palette: { ...LEATHER, ...GOLD, s: "#2e2018" },
};

const amulet: Sprite = {
  rows: [
    "..c..........c..",
    "...c........c...",
    "....c......c....",
    ".....c....c.....",
    "......c..c......",
    ".......ff.......",
    "......fFFf......",
    ".....fFgGFf.....",
    "....fFggGGFf....",
    "...fFgggGGgFf...",
    "....fdggggdf....",
    ".....fddddf.....",
    "......fddf......",
    ".......ff.......",
  ],
  palette: { c: "#9a9aa8", f: "#c9a548", F: "#f0d27a", g: "#2fae5a", G: "#6cf09a", d: "#146a32" },
};

const staff: Sprite = {
  rows: [
    "...........zZ...",
    "..........zZZz..",
    "..........zZzz..",
    "...........zz...",
    "..........n.....",
    ".........nN.....",
    "........nN......",
    ".......nN.......",
    "......nN........",
    ".....nN.........",
    "....nN..........",
    "...nN...........",
    "..nN............",
    ".nN.............",
    "n...............",
  ],
  palette: { z: "#6cc31f", Z: "#d9ff8a", n: "#5a3d24", N: "#8e6638" },
};

const revolver: Sprite = {
  rows: [
    "................",
    "................",
    "................",
    "..hhhhhhhhhhhhG.",
    ".hgggggggggggGG.",
    ".hggggggggggggg.",
    "..hhhgggnnn.....",
    "....hgnnNNn.....",
    "....nnNNnn......",
    "...nNNNn........",
    "..nNNnn.........",
    "..nnn...........",
  ],
  palette: { ...METAL, n: "#5a3d24", N: "#8e6638" },
};

const ITEM_BASE: Record<Slot, Sprite> = { weapon, helmet, armor, gloves, boots, amulet };
/** Weapons look different per class; armor pieces are shared shapes. */
const WEAPON_BASE: Record<ClassId, Sprite> = { butcher: weapon, gunslinger: revolver, hexer: staff };
const ITEMS: Record<Slot, Sprite> = Object.fromEntries(
  Object.entries(ITEM_BASE).map(([slot, s]) => [slot, outlined(s, OUT)]),
) as Record<Slot, Sprite>;

/** Legendary items get gilded metal so they read as special even inside the frame. */
const LEGENDARY_ITEMS: Record<Slot, Sprite> = Object.fromEntries(
  Object.entries(ITEM_BASE).map(([slot, s]) => [
    slot,
    outlined(recolor(s, { g: "#ffc93c", G: "#fff3c4", h: "#b8860b", m: "#7a3a10", M: "#c9a548", c: "#ffc93c" }), OUT),
  ]),
) as Record<Slot, Sprite>;

const WEAPONS = Object.fromEntries(Object.entries(WEAPON_BASE).map(([c, s]) => [c, outlined(s, OUT)])) as Record<ClassId, Sprite>;
const LEGENDARY_WEAPONS = Object.fromEntries(
  Object.entries(WEAPON_BASE).map(([c, s]) => [c, outlined(recolor(s, { g: "#ffc93c", G: "#fff3c4", h: "#b8860b", z: "#ffc93c", Z: "#fff3c4" }), OUT)]),
) as Record<ClassId, Sprite>;

export function itemSprite(slot: Slot, legendary = false, classId?: ClassId, rarity?: Rarity): Sprite {
  // Class weapons are the same models the hero holds, one per rarity.
  if (slot === "weapon" && classId) return rarity ? weaponSprite(classId, rarity) : legendary ? LEGENDARY_WEAPONS[classId] : WEAPONS[classId];
  return legendary ? LEGENDARY_ITEMS[slot] : ITEMS[slot];
}

export const CLASS_COLOR: Record<ClassId, string> = { butcher: "#e8573f", gunslinger: "#ffc93c", hexer: "#6cc31f" };

// ───────────────────────── UI icons ─────────────────────────

export const ICONS = {
  bolt: {
    rows: ["....bbb.", "...bbb..", "..bbb...", ".bbbbbb.", "....bbb.", "...bbb..", "..bb....", ".b......"],
    palette: { b: C.bone },
  },
  coin: outlined(
    {
      rows: ["..yyyyyy..", ".yYYYYYYy.", "yYYddddYYy", "yYdYYYYYYy", "yYdYYYYYYy", "yYdYYYYYYy", "yYYddddYYy", ".yYYYYYYy.", "..yyyyyy.."],
      palette: { y: "#b8860b", Y: C.gold, d: "#b8860b" },
    },
    OUT,
  ),
  gem: outlined(
    {
      rows: ["..wwwwww..", ".wWWwWWWw.", "wWWwwwWWWw", ".wWWwWWWw.", "..wWwWWw..", "...wWWw...", "....ww...."],
      palette: { w: "#9fb8d8", W: "#e8f2ff" },
    },
    OUT,
  ),
  sword: outlined(
    {
      rows: ["........GG", ".......GgG", "......GgG.", ".....GgG..", "..y.GgG...", "...yGG....", "...yy.....", "..n..y....", ".n........", "y........."],
      palette: { G: "#d8d8e2", g: "#9a9aa8", y: C.gold, n: "#8e6638" },
    },
    OUT,
  ),
  descend: {
    rows: ["k........k", "kk......kk", ".kk....kk.", "..kkkkkk..", "...kkkk...", "k........k", "kk......kk", ".kk....kk.", "..kkkkkk..", "...kkkk..."],
    palette: { k: C.abyss },
  },
  stairs: {
    rows: ["aaaa........", "aaaa........", "aaaaaaaa....", "aaaaaaaa....", "aaaaaaaaaaaa", "aaaaaaaaaaaa"],
    palette: { a: C.bone },
  },
  bag: {
    rows: ["...aaaa...", "..a....a..", ".aaaaaaaa.", "aaaaaaaaaa", "aaa....aaa", "aaaaaaaaaa", "aaaaaaaaaa", ".aaaaaaaa."],
    palette: { a: C.bone },
  },
  hammer: {
    rows: ["..aaaaaa..", ".aaaaaaaa.", ".aaaaaaaa.", "..aaaaaa..", "....bb....", "....bb....", "....bb....", "....bb...."],
    palette: { a: C.bone, b: "#8e6638" },
  },
  lock: {
    rows: ["..aaaa..", ".a....a.", ".a....a.", "aaaaaaaa", "aaa..aaa", "aaa..aaa", "aaaaaaaa"],
    palette: { a: "#6a6a7a" },
  },
  star: {
    rows: ["....y....", "....y....", "...yyy...", "yyyyYyyyy", ".yyYYYyy.", "..yyyyy..", ".yy...yy.", "yy.....yy"],
    palette: { y: C.gold, Y: "#fff3c4" },
  },
  starEmpty: {
    rows: ["....y....", "....y....", "...y.y...", "yyyy.yyyy", ".y.....y.", "..y...y..", ".yy...yy.", "yy.....yy"],
    palette: { y: "#3a3a4a" },
  },
  crown: {
    rows: ["y....y....y", "yy..yyy..yy", "yyyyyYyyyyy", "yoyyyoyyyoy", "yyyyyyyyyyy"],
    palette: { y: C.gold, Y: "#fff3c4", o: "#ff7a1a" },
  },
  gun: outlined(
    {
      rows: [".....hhhhhhhhG", "....hgggggggGG", "....hgggggggg.", "...hhgnn......", "..nnnn........", ".nNnn.........", "nNn...........", "nn............"],
      palette: { ...METAL, n: "#6b4a2b", N: "#8e6638" },
    },
    OUT,
  ),
  potion: outlined(
    {
      rows: ["...cccc...", "....aa....", "....aa....", "...aaaa...", "..azzZZa..", ".azzzzZZa.", ".azzzwzZa.", ".azzzzzZa.", ".azzzzzZa.", "..azzzZa..", "...aaaa..."],
      palette: { c: "#8e6638", a: "#a8c8d8", z: "#6cc31f", Z: "#a6f03a", w: "#e8ffb0" },
    },
    OUT,
  ),
  chest: outlined(
    {
      rows: [
        "...dddddddddddddd...",
        "..dWWWWWWWWWWWWWWd..",
        ".dWwwwwwwgwwwwwwwWd.",
        ".dWwwwwwwgwwwwwwwWd.",
        "dggggggggyyggggggggd",
        "dWwwwwwwyYYywwwwwwWd",
        "dWwwwwwwyYYywwwwwwWd",
        "dWwwwwwwwyywwwwwwwWd",
        "dWwwwwwwwgwwwwwwwwWd",
        "dggggggggggggggggggd",
        "dWwwwwwwwgwwwwwwwwWd",
        "dddddddddddddddddddd",
      ],
      palette: { d: "#3a2616", W: "#8e6638", w: "#6b4a2b", g: "#9a9aa8", y: "#b8860b", Y: C.gold },
    },
    OUT,
  ),
} satisfies Record<string, Sprite>;

/** Nav icons (14×12), drawn in one color and recolored for the active tab. */
const NAV_BASE = {
  abyss: [
    ".....aaaa.....",
    ".....aaaa.....",
    ".....aaaa.....",
    "..aaaaaaaaaa..",
    "...aaaaaaaa...",
    "....aaaaaa....",
    ".....aaaa.....",
    "......aa......",
    "a............a",
    "a............a",
    "aaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaa",
  ],
  hero: [
    ".....aaaa.....",
    "....aaaaaa....",
    "....aaaaaa....",
    "....aaaaaa....",
    ".....aaaa.....",
    "..............",
    "..aaaaaaaaaa..",
    ".aaaaaaaaaaaa.",
    ".aaaaaaaaaaaa.",
    ".aaaaaaaaaaaa.",
    "aaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaa",
  ],
  pvp: [
    "aa..........aa",
    "aaa........aaa",
    ".aaa......aaa.",
    "..aaa....aaa..",
    "...aaa..aaa...",
    "....aaaaaa....",
    ".....aaaa.....",
    "....aaaaaa....",
    "...aaa..aaa...",
    ".aaaa....aaaa.",
    "aaa........aaa",
    "aa..........aa",
  ],
  guild: [
    "aaaaaaaaaaaaaa",
    "aa....aa....aa",
    "aa....aa....aa",
    "aaaaaaaaaaaaaa",
    "aa....aa....aa",
    "aa....aa....aa",
    ".aa...aa...aa.",
    ".aa...aa...aa.",
    "..aa..aa..aa..",
    "...aa.aa.aa...",
    "....aaaaaa....",
    "......aa......",
  ],
  shop: [
    "....aaaaaa....",
    "...aa....aa...",
    "...a......a...",
    ".aaaaaaaaaaaa.",
    "aaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaa",
    "aaaa......aaaa",
    "aaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaa",
    ".aaaaaaaaaaaa.",
    "..............",
  ],
} as const;

export type NavIcon = keyof typeof NAV_BASE;
const navSet = (color: string) =>
  Object.fromEntries(Object.entries(NAV_BASE).map(([k, rows]): [string, Sprite] => [k, { rows, palette: { a: color } }])) as Record<NavIcon, Sprite>;
const NAV_IDLE = navSet("#6a6a7a");
const NAV_ACTIVE = navSet(C.teal);

export function navSprite(icon: NavIcon, active: boolean): Sprite {
  return active ? NAV_ACTIVE[icon] : NAV_IDLE[icon];
}

export const ALL_ICON_SPRITES: Sprite[] = [...Object.values(ITEM_BASE), staff, revolver, ...Object.values(ICONS), ...Object.values(NAV_IDLE)];

/** Pointing hand for tutorial coach marks (points up; flip with CSS to point down). */
export const FINGER: Sprite = outlined(
  {
    rows: [
      "..ww......",
      "..wW......",
      "..wW......",
      "..wWwwww..",
      "wwwWwWwWw.",
      "wWwWWWWWWw",
      "wWWWWWWWWw",
      ".wWWWWWWw.",
      "..wWWWWw..",
      "...cccc...",
      "...cccc...",
    ],
    palette: { w: "#f0d0b0", W: "#ffe8d0", c: "#4fe3e0" },
  },
  OUT,
);
