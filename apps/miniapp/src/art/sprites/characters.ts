import type { ClassId } from "@underworld/shared";
import { C } from "../palette.ts";
import { outlined, recolor, type Sprite } from "../pixel.ts";

const SKIN = { s: "#9a6440", S: "#c08458", d: "#6b4128" };
const OUT = C.outline;

// ───────────────────────── heroes (16×22, facing right) ─────────────────────────

const butcher: Sprite = outlined(
  {
    rows: [
      "....qqrrrRR.....",
      "...qrrrrrrRR....",
      "..qqrrrrrrrRR...",
      ".q.dssssssSS....",
      "q..dsssskSSS....",
      "...dssssssSs....",
      "...dbsssssSb....",
      "...bbbbsssbb....",
      "....bbbbbbb.....",
      "..qqrrrrrrrRR...",
      ".qqrrlllllLrRRgG",
      ".qsrrlllllLrRsgG",
      ".dsqrlllllLrRshG",
      ".ds.qlllllLm.sn.",
      "..d.mlllllLm..n.",
      "....mlllllmm....",
      "....pppPPPpp....",
      "....ppp..Ppp....",
      "....ppp..Ppp....",
      "....ppp..Ppp....",
      "...oooo..oooo...",
      "...oooo..oooo...",
    ],
    palette: {
      ...SKIN,
      r: "#c43a2f",
      R: "#e8573f",
      q: "#7d2219",
      k: C.abyss,
      b: "#2a1b12",
      l: "#6e4a2a",
      L: "#946437",
      m: "#48301b",
      p: "#2e2e3c",
      P: "#44445a",
      o: "#3a271a",
      g: "#9a9aa8",
      G: "#d8d8e2",
      h: "#5c5c6c",
      n: "#6b4a2b",
    },
  },
  OUT,
);

const gunslinger: Sprite = outlined(
  {
    rows: [
      "................",
      ".....hhhhH......",
      ".....hhhhhH.....",
      "..hhhhhhhhhhH...",
      "....dssssSS.....",
      "....dsssskS.....",
      "....dssssSS.....",
      ".....ffffff.....",
      "....ffffffff....",
      "...cccccccCC....",
      "..ccccccccCCC...",
      "..scccccccCCs...",
      "..sccccccccCsgGG",
      "...cccccccCC.g..",
      "...cccccccCC....",
      "...ccc.pp.CC....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "....ppp..ppp....",
      "...oooo..oooo...",
      "...oooo..oooo...",
    ],
    palette: {
      ...SKIN,
      k: C.abyss,
      h: "#5a3d24",
      H: "#7a5634",
      f: "#b8862b",
      c: "#2f3a52",
      C: "#44547a",
      p: "#2a2a36",
      o: "#3a271a",
      g: "#9a9aa8",
      G: "#d8d8e2",
    },
  },
  OUT,
);

const hexer: Sprite = outlined(
  {
    rows: [
      "......vvvV......",
      ".....vvvvvV.....",
      "....vvvvvvVV....",
      "....vvxxxxVV....",
      "...vvxxexexVV...",
      "...vvxxxxxxVV...",
      "...vvvxxxxVVV...",
      "..vvvvvvvvvVVV..",
      "..vvvvvyyyvVVV..",
      ".svvvvvvvvvVVs..",
      ".svvvvvvvvvVVsa.",
      "..vvvvvvvvvVVazZ",
      "..vvvvvvvvvVVzZz",
      "..vvvvvvvvvVV.z.",
      "..vvvvvvvvvVV...",
      ".vvvvvvvvvvvVV..",
      ".vvvvvvvvvvvVV..",
      ".vvvvvvvvvvvVV..",
      "vvvvvvvvvvvvvVV.",
      "vvvvvvvvvvvvvVV.",
      ".oooo....oooo...",
      "................",
    ],
    palette: {
      ...SKIN,
      v: "#3d2456",
      V: "#5a3680",
      x: "#120c18",
      e: "#5cff8f",
      y: "#c9a548",
      a: "#a8c8d8",
      z: "#6cc31f",
      Z: "#a6f03a",
      o: "#2a1d14",
    },
  },
  OUT,
);

export const HEROES: Record<ClassId, Sprite> = { butcher, gunslinger, hexer };

// ───────────────────────── monster bases ─────────────────────────

const beast: Sprite = {
  rows: [
    "................",
    "..........dd....",
    ".....dddddfFd...",
    "...ddffffffFFfe.",
    "..dfffffffFFFFfp",
    ".dffffffffFFFFw.",
    "pdffffffffffFf..",
    "p.dffff.ddff....",
    "p..dpp...dpp....",
    ".p..............",
  ],
  palette: { f: "#6b6070", F: "#8a8094", d: "#45404d", p: "#d68a8a", e: C.danger, w: C.bone },
};

const bug: Sprite = {
  rows: [
    "............d..d",
    ".............dd.",
    "....dSSSSSSsdd..",
    "..dSSSsSSSSsssed",
    ".dSSSSsSSSSsssdd",
    ".dsssssssssssdd.",
    "..dddddddddddd..",
    ".l..l...l..l....",
    "l..l...l..l.....",
  ],
  palette: { S: "#8a5a32", s: "#5a3a22", d: "#2e1c10", l: "#2e1c10", e: C.danger },
};

const shambler: Sprite = {
  rows: [
    "....zzzZ......",
    "...zzzzZZ.....",
    "...zzezzZ.....",
    "...zzzzZZ.....",
    "....dzzZ......",
    "..rrrrrrRR....",
    "..rrrrrrRRzzz.",
    "..rrrrrrRR..zz",
    "..rrrrrrRR....",
    "..rrr.rrRR....",
    "..r.r.rr.R....",
    "...dd..dd.....",
    "...dd..dd.....",
    "...dd..dd.....",
    "..ddd..ddd....",
  ],
  palette: { z: "#6f8a5a", Z: "#8fa874", d: "#4a5e3c", r: "#5a4a3a", R: "#74624c", e: "#f0d27a" },
};

const brute: Sprite = {
  rows: [
    "......dssssS........",
    ".....dssssssS.......",
    ".....dsessesS.......",
    ".....dsssssSS.......",
    "......dwswsS........",
    "...ddsssssssSSS.....",
    "..dssssssssssSSS....",
    ".dsssssssssssSSSs...",
    ".ds.sssssssssSS.sc..",
    ".ds.sssssssssSS.sCc.",
    "..d.lllllllllll.Ccg.",
    "....lllllllllll.Ccc.",
    "....lllll.lllll.Cgc.",
    ".....ddd...ddd..Ccc.",
    ".....ddd...ddd...cc.",
    "....dddd...dddd.....",
    "....dddd...dddd.....",
  ],
  palette: { s: "#6a7a4a", S: "#88986a", d: "#4a5636", e: "#f0d27a", w: C.bone, l: "#5a3d24", c: "#6b4a2b", C: "#8e6638", g: "#9a9aa8" },
};

const ghost: Sprite = {
  rows: [
    "...gggGG....",
    "..gggggGG...",
    ".gggegegGG..",
    ".gggggggGGG.",
    "gggggggggGGG",
    "ggggggggggGG",
    "gggggggggGGG",
    "dgggggggggGd",
    "dggggggggggd",
    ".dggdggdggd.",
    "..d..d..d...",
  ],
  palette: { g: "#9fc0e0", G: "#d0e6ff", d: "#5a7aa0", e: C.abyss },
};

const golem: Sprite = {
  rows: [
    "...dssssS...",
    "...dseseS...",
    "...dssssS...",
    ".ddssssssSS.",
    "dsssseesssSS",
    "dssssesssSSS",
    "ds.ssssss.SS",
    "ds.ssssss.SS",
    "...sss.sss..",
    "..ssss.ssss.",
  ],
  palette: { s: "#6a6a7a", S: "#8a8a9a", d: "#44444f", e: "#ff8a2a" },
};

const shroom: Sprite = {
  rows: [
    "....cccCC.....",
    "..cccwccCCC...",
    ".ccwccccwCCCC.",
    "cccccccccCCCCC",
    "cwcccccwccCwCC",
    ".ddddddddddd..",
    "....sssSS.....",
    "...sksskSS....",
    "...ssssSSS....",
    "..sssssSSSs...",
    "...sss.SSS....",
    "..sss...SSS...",
  ],
  palette: { c: "#8a2f4a", C: "#b84a6a", w: C.bone, d: "#5a2034", s: "#d8c8a8", S: "#b8a888", k: C.abyss },
};

const bird: Sprite = {
  rows: [
    "........bb..",
    ".......bbeby",
    "...bbbbbBb..",
    "bbbbbbbBBb..",
    ".bbbbbBBBb..",
    "...bbbbbb...",
    "....y..y....",
  ],
  palette: { b: "#2a2a33", B: "#44444f", y: "#c9a548", e: C.danger },
};

const spore: Sprite = {
  rows: [".zzZ..", "zzzzZ.", "zzwzzZ", "zzzzzZ", ".zzzZ."],
  palette: { z: "#6cc31f", Z: "#a6f03a", w: "#e8ffb0" },
};

const ratPup: Sprite = {
  rows: ["......dd..", "..ddffFfe.", ".dffffFFfp", "pdfffffff.", "p.dp..dp.."],
  palette: beast.palette,
};

const ratKing: Sprite = {
  rows: [
    "..........y.y.y.",
    "..........yyyyy.",
    ...beast.rows.slice(1),
  ],
  palette: { ...beast.palette, f: "#5c4a3a", F: "#7a6450", d: "#3a2e24", y: C.gold },
};

// ───────────────────────── enemy table ─────────────────────────

/** Sprite + scale for each enemy key. Variants are palette swaps of a few hand-drawn bases. */
const ENEMIES: Record<string, Sprite> = {
  mutant_rat: beast,
  iron_roach: bug,
  drifter: shambler,
  sewer_brute: brute,
  sewers_boss: recolor(brute, { s: "#4a5a3a", S: "#66784e", d: "#323c26", l: "#3a2a1a" }),
  fat_rat_king: ratKing,
  rat_pup: ratPup,

  bone_machine: recolor(shambler, { z: "#d8d0c0", Z: "#f0ead8", d: "#8a8274", r: "#5c5c6c", R: "#7a7a8a", e: "#7fb0e0" }),
  miner_ghost: ghost,
  rust_crow: bird,
  grave_knight: recolor(brute, { s: "#5c6070", S: "#7a8090", d: "#3a3e4a", l: "#2a2e3a", e: "#7fb0e0" }),
  iron_graveyard_boss: recolor(brute, { s: "#50586a", S: "#6c7488", d: "#343a48", e: "#7fb0e0" }),
  gravedigger: recolor(brute, { s: "#7a7a86", S: "#9898a4", d: "#4a4a56", l: "#2a2420", e: "#cfe6ff", c: "#5c5c6c", C: "#8a8a9a" }),

  shadow_merchant: recolor(shambler, { z: "#8a6a9a", Z: "#a888b8", d: "#4a3858", r: "#2a1a33", R: "#3d2549", e: "#f08ac0" }),
  guard_hound: recolor(beast, { f: "#5a3d2a", F: "#7a5638", d: "#3a271a" }),
  pickpocket: recolor(shambler, { z: "#c08458", Z: "#d8a070", d: "#6b4128", r: "#2a2a36", R: "#3e3e50", e: C.abyss }),
  enforcer: recolor(brute, { s: "#7a5a8a", S: "#9878a8", d: "#4a3858", l: "#1a1420" }),
  ghost_market_boss: recolor(brute, { s: "#6a4a7a", S: "#886898", d: "#40304c" }),
  debt_collector: recolor(brute, { s: "#c08458", S: "#d8a070", d: "#6b4128", l: "#2a1a33", e: C.abyss, c: "#c9a548", C: "#f0d27a" }),

  burning_stoker: recolor(shambler, { z: "#a0583a", Z: "#c87850", d: "#6a3420", r: "#2a2a30", R: "#3a3a44", e: "#ff8a2a" }),
  clockwork_spider: recolor(bug, { S: "#9a9aa8", s: "#5c5c6c", d: "#2e2e38", l: "#2e2e38", e: "#ff8a2a" }),
  small_golem: golem,
  forge_overseer: recolor(brute, { s: "#7a7a8a", S: "#9a9aaa", d: "#4a4a56", l: "#3a2a1a", e: "#ff8a2a" }),
  foundry_boss: recolor(golem, { s: "#5a4a40", S: "#7a6656", d: "#3a2e28" }),
  furnace_golem: recolor(golem, { s: "#4a3a34", S: "#6a564c", d: "#2a201c", e: "#ffd06a" }),

  mushroom_man: shroom,
  spore_fly: recolor(bug, { S: "#6cc31f", s: "#3d7a14", d: "#1f3a0e", l: "#1f3a0e" }),
  strangle_root: recolor(shambler, { z: "#486626", Z: "#5e8432", d: "#2f4a1c", r: "#3a2a1a", R: "#4a3824" }),
  fungal_brute: recolor(brute, { s: "#3d7558", S: "#5a9470", d: "#2b5440", l: "#3a2a1a" }),
  fungal_depths_boss: recolor(shroom, { c: "#3d7a14", C: "#6cc31f", d: "#1f3a0e" }),
  spore_mother: recolor(shroom, { c: "#6c1fa0", C: "#a64fe0", d: "#3a124f" }),
  spore,

  hollow_knight: recolor(shambler, { z: "#3a3a4a", Z: "#5a5a6c", d: "#24242e", r: "#2d223d", R: "#3f3056", e: "#e0406a" }),
  shadow_priest: recolor(shambler, { z: "#2d223d", Z: "#41254f", d: "#1a1224", r: "#16111e", R: "#2d223d", e: "#dca0ff" }),
  abyss_hound: recolor(beast, { f: "#2d223d", F: "#41254f", d: "#16111e", e: "#e0406a" }),
  throne_guard: recolor(brute, { s: "#4a4058", S: "#665a78", d: "#2d2638", l: "#806633", e: "#e0406a" }),
  abyss_throne_boss: recolor(brute, { s: "#3a3048", S: "#544668", d: "#241e30", e: "#e0406a" }),
  the_warden: recolor(brute, { s: "#2a2436", S: "#40364f", d: "#16111e", l: "#806633", e: "#ff3b4e", c: "#574624", C: "#806633" }),
};

const outlinedCache = new Map<string, Sprite>();

export function enemySprite(key: string): Sprite {
  let s = outlinedCache.get(key);
  if (!s) {
    s = outlined(ENEMIES[key] ?? shambler, OUT);
    outlinedCache.set(key, s);
  }
  return s;
}

/** Bosses are drawn bigger. */
export function enemyScale(kind: string): number {
  return kind === "chapterBoss" ? 3 : kind === "boss" ? 2 : 1;
}

/** Exposed for the sprite sanity test. */
export const ALL_CHARACTER_SPRITES: Sprite[] = [butcher, gunslinger, hexer, ...Object.values(ENEMIES)];
