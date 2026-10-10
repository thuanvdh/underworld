/** Colors from the UNDERWORLD Art Style Tile. ~80% of every screen stays dark; neon only on what you tap or want. */
export const C = {
  abyss: "#0e0e14",
  slate: "#1c1c26",
  rivet: "#3a3a4a",
  bone: "#e8e6e3",
  teal: "#4fe3e0",
  heal: "#5cff8f",
  danger: "#ff3b4e",
  gold: "#ffc93c",
  outline: "#0b0b10",
} as const;

export const RARITY_COLOR = {
  common: "#9a9aa8",
  uncommon: "#78d94a",
  rare: "#3fa0ff",
  epic: "#b46cff",
  legendary: "#ff7a1a",
} as const;

/** Five-step ramps per chapter, dark → light. Chapter 1 comes straight from the style tile. */
export interface ChapterRamps {
  wall: string[];
  growth: string[];
  floor: string[];
  metal: string[];
  light: string[];
  /** Hazard / accent liquid (sludge, ember, spores...). */
  hazard: string[];
}

export const CHAPTER_RAMPS: Record<string, ChapterRamps> = {
  sewers: {
    wall: ["#141a13", "#1b2419", "#263222", "#344330", "#4e5a38"],
    growth: ["#18240f", "#223416", "#2f4a1c", "#486626", "#5e8432"],
    floor: ["#161108", "#221a11", "#322619", "#4a3824", "#6b5233"],
    metal: ["#1d150f", "#2c2117", "#42311f", "#5c4528", "#866836"],
    light: ["#3a2c14", "#7a6230", "#c9a548", "#f0d27a", "#fff3c4"],
    hazard: ["#1f3a0e", "#3d7a14", "#6cc31f", "#a6f03a", "#d9ff8a"],
  },
  iron_graveyard: {
    wall: ["#121317", "#1a1c22", "#252832", "#343846", "#4a5062"],
    growth: ["#16181d", "#22252c", "#2f333d", "#454a57", "#5f6573"],
    floor: ["#100f12", "#19181c", "#242229", "#353240", "#4b4757"],
    metal: ["#1a1410", "#2a2019", "#3d2e22", "#57412f", "#7a5a40"],
    light: ["#16243a", "#23406a", "#3f6fa8", "#7fb0e0", "#cfe6ff"],
    hazard: ["#1d2a3a", "#2f4f73", "#4f86c2", "#8cc0f0", "#d5ecff"],
  },
  ghost_market: {
    wall: ["#15101a", "#1e1726", "#2a2035", "#3b2d4a", "#544168"],
    growth: ["#1a1020", "#2a1a33", "#3d2549", "#5a3669", "#7c4c8f"],
    floor: ["#120e14", "#1c161f", "#28202c", "#3a2f40", "#524357"],
    metal: ["#1c1410", "#2c1f17", "#432f21", "#5f4430", "#866143"],
    light: ["#3a1430", "#7a2a5a", "#c94a8a", "#f08ac0", "#ffd4ec"],
    hazard: ["#2a1438", "#4f2a6b", "#8a4fc2", "#c08cf0", "#ecd5ff"],
  },
  foundry: {
    wall: ["#171010", "#221615", "#31201d", "#462d28", "#634038"],
    growth: ["#1d1210", "#2c1a16", "#41251e", "#5c342a", "#7f483a"],
    floor: ["#130d0a", "#1d1410", "#2b1e17", "#3f2c21", "#5a3f2f"],
    metal: ["#15151a", "#222229", "#33333d", "#4a4a57", "#6a6a7a"],
    light: ["#3a1608", "#8a3010", "#e0561c", "#ff9a3c", "#ffd98a"],
    hazard: ["#3a0e08", "#8a200c", "#e04a12", "#ff8a2a", "#ffd06a"],
  },
  fungal_depths: {
    wall: ["#0f1416", "#151d20", "#1e2a2e", "#2a3b40", "#3c5359"],
    growth: ["#0e1a16", "#152820", "#1e3a2d", "#2b5440", "#3d7558"],
    floor: ["#0f1110", "#171a18", "#212622", "#2f3630", "#424c44"],
    metal: ["#1a1712", "#28231b", "#3a3227", "#524636", "#71614a"],
    light: ["#0e2a2a", "#145454", "#21a3a0", "#5fe0d8", "#c4fff8"],
    hazard: ["#1a2a0a", "#3a5a12", "#7ab01f", "#b8e04a", "#e8ffa0"],
  },
  abyss_throne: {
    wall: ["#0f0c14", "#16111e", "#20182b", "#2d223d", "#3f3056"],
    growth: ["#140c18", "#1f1226", "#2d1a37", "#41254f", "#5a336d"],
    floor: ["#0d0b10", "#141118", "#1d1922", "#2a2431", "#3b3344"],
    metal: ["#18140c", "#262012", "#3a301a", "#574624", "#806633"],
    light: ["#2a0a1a", "#5a1030", "#a01a4a", "#e0406a", "#ffa0b8"],
    hazard: ["#1a0a2a", "#3a124f", "#6c1fa0", "#a64fe0", "#dca0ff"],
  },
};
