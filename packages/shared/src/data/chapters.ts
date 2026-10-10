import type { SetCode } from "../types.ts";

export type BossMechanic =
  | "rat_king" // summons rats at 75/50/25% HP
  | "bone_shield" // shield 30% max HP every 15s; a Perfect skill breaks it
  | "debt_collector" // steals a boon every 20s, returned on death
  | "furnace_golem" // 3s charge into a 300% ATK slam; a skill during the charge interrupts it
  | "spore_mother" // 2% max HP/s aura, spawns exploding spores
  | "warden"; // adds at 66%, enrage at 33%

export interface ChapterDef {
  number: number;
  key: string;
  monsters: [string, string, string];
  elite: string;
  boss: string;
  mechanic: BossMechanic;
  setCode: SetCode;
}

// Detailed design §8
export const CHAPTERS: readonly ChapterDef[] = [
  { number: 1, key: "sewers", monsters: ["mutant_rat", "iron_roach", "drifter"], elite: "sewer_brute", boss: "fat_rat_king", mechanic: "rat_king", setCode: "drifter" },
  { number: 2, key: "iron_graveyard", monsters: ["bone_machine", "miner_ghost", "rust_crow"], elite: "grave_knight", boss: "gravedigger", mechanic: "bone_shield", setCode: "gravedigger" },
  { number: 3, key: "ghost_market", monsters: ["shadow_merchant", "guard_hound", "pickpocket"], elite: "enforcer", boss: "debt_collector", mechanic: "debt_collector", setCode: "smuggler" },
  { number: 4, key: "foundry", monsters: ["burning_stoker", "clockwork_spider", "small_golem"], elite: "forge_overseer", boss: "furnace_golem", mechanic: "furnace_golem", setCode: "forgeborn" },
  { number: 5, key: "fungal_depths", monsters: ["mushroom_man", "spore_fly", "strangle_root"], elite: "fungal_brute", boss: "spore_mother", mechanic: "spore_mother", setCode: "sporeborne" },
  { number: 6, key: "abyss_throne", monsters: ["hollow_knight", "shadow_priest", "abyss_hound"], elite: "throne_guard", boss: "the_warden", mechanic: "warden", setCode: "underlord" },
];

export const FLOORS_PER_CHAPTER = 10;
export const MAX_FLOOR = CHAPTERS.length * FLOORS_PER_CHAPTER;

/** Floor 3 boss teaches the shield mechanic in the tutorial (GDD §14.2). */
export const TUTORIAL_SHIELD_FLOOR = 3;

export function chapterOf(floor: number): ChapterDef {
  const index = Math.min(CHAPTERS.length, Math.ceil(floor / FLOORS_PER_CHAPTER)) - 1;
  const chapter = CHAPTERS[Math.max(0, index)];
  if (!chapter) throw new Error(`no chapter for floor ${floor}`);
  return chapter;
}

export function isChapterBossFloor(floor: number): boolean {
  return floor % FLOORS_PER_CHAPTER === 0;
}

export type EnemyKind = "normal" | "elite" | "boss" | "chapterBoss" | "minion";

// Detailed design §7.1 — stats at floor 1, before the floor multiplier.
export const ENEMY_BASE: Readonly<Record<EnemyKind, { hp: number; atk: number; def: number; spd: number }>> = {
  normal: { hp: 120, atk: 10, def: 5, spd: 90 },
  elite: { hp: 300, atk: 17, def: 10, spd: 95 },
  boss: { hp: 900, atk: 24, def: 15, spd: 95 },
  chapterBoss: { hp: 1400, atk: 26, def: 20, spd: 100 },
  minion: { hp: 60, atk: 6, def: 3, spd: 100 },
};

/** Enemy growth per floor up to floor 60, then per Endless floor. */
export const FLOOR_GROWTH = 1.09;
export const ENDLESS_GROWTH = 1.06;

/** Floor multiplier FLOOR_GROWTH^(f−1); past floor 60 (Endless) it grows by ENDLESS_GROWTH per floor. */
export function floorMultiplier(floor: number): number {
  if (floor <= MAX_FLOOR) return Math.pow(FLOOR_GROWTH, floor - 1);
  return Math.pow(FLOOR_GROWTH, MAX_FLOOR - 1) * Math.pow(ENDLESS_GROWTH, floor - MAX_FLOOR);
}

// Detailed design §7.2
export const RECOMMENDED_POWER: readonly [number, number][] = [
  [100, 400],
  [400, 1000],
  [1000, 2000],
  [2000, 3300],
  [3300, 5000],
  [5000, 7500],
];
