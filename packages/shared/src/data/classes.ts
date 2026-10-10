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

export const PASSIVE_LEVELS = { first: 10, second: 25, third: 40 } as const;

export const MAX_LEVEL = 60;
