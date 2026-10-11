import type { ClassId } from "../types.ts";

export interface ClassDef {
  id: ClassId;
  base: { hp: number; atk: number; def: number; spd: number; critBp: number; critDmgBp: number };
  /** Per-level growth, ×10 so that 2.5 DEF/level stays an integer. */
  growthX10: { hp: number; atk: number; def: number };
}

// Detailed design §5.4
export const CLASSES: Readonly<Record<ClassId, ClassDef>> = {
  butcher: {
    id: "butcher",
    base: { hp: 500, atk: 50, def: 20, spd: 100, critBp: 500, critDmgBp: 15000 },
    growthX10: { hp: 600, atk: 60, def: 25 },
  },
  gunslinger: {
    id: "gunslinger",
    base: { hp: 460, atk: 60, def: 18, spd: 110, critBp: 1500, critDmgBp: 15000 },
    growthX10: { hp: 500, atk: 75, def: 20 },
  },
  hexer: {
    id: "hexer",
    base: { hp: 480, atk: 55, def: 20, spd: 105, critBp: 500, critDmgBp: 15000 },
    growthX10: { hp: 550, atk: 70, def: 22 },
  },
};

/** Active skill tier by character level (levels 1 / 20 / 40 / 60). */
export function skillTier(level: number): 0 | 1 | 2 | 3 {
  if (level >= 60) return 3;
  if (level >= 40) return 2;
  if (level >= 20) return 1;
  return 0;
}

// Detailed design §5.1–5.3. Values per tier.
export const SKILLS = {
  butcher: { hitMultBp: [12000, 13000, 14000, 15000], hits: 3, healShareBp: [2500, 3000, 3000, 3000] },
  gunslinger: { multBp: [42000, 46000, 50000, 55000] },
  hexer: { multBp: 8000, poisonPerSecBp: [2500, 3000, 3500, 4000], poisonTicks: 100, slowTicks: 60 },
} as const;

/**
 * Rage skills: when the rage bar fills, the player picks one of the class's skills. Index 0 is the signature skill
 * (SKILLS above); the others unlock with level. Values per skill tier, like SKILLS.
 */
export const RAGE_SKILL_LEVELS = [1, 4, 8] as const;

export const RAGE_SKILLS = {
  butcher: {
    /** Meat Hook: one heavy hit on the front enemy and a stun. */
    hook: { multBp: [30000, 33000, 36000, 40000], stunTicks: 40 },
    /** Butcher's Feast: heal and a shield, both a share of max HP. */
    feast: { healBp: [2000, 2200, 2400, 2600], shieldBp: 2500 },
  },
  gunslinger: {
    /** Fan the Hammer: six shots at random enemies. */
    fan: { shots: 6, multBp: [9000, 10000, 11000, 12000] },
    /** Smoke Bomb: hits everyone, slows them, and a small shield. */
    smoke: { multBp: [12000, 13000, 14000, 15000], slowTicks: 60, shieldBp: 2000 },
  },
  hexer: {
    /** Soul Drain: a heavy hit on the weakest enemy, healing half of it. */
    drain: { multBp: [26000, 29000, 32000, 36000], healShareBp: 5000 },
    /** Hex Ward: a big shield and a short stun on every enemy. */
    ward: { shieldBp: [3000, 3300, 3600, 4000], stunTicks: 30 },
  },
} as const;

/** How many rage skills a hero of this level can pick from. */
export function rageSkillCount(level: number): number {
  return RAGE_SKILL_LEVELS.filter((l) => level >= l).length;
}

export const PASSIVE_LEVELS = { first: 10, second: 25, third: 40 } as const;

export const MAX_LEVEL = 60;
