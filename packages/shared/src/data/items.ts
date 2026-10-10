import type { LegendaryEffect, Rarity, Slot, StatKey, SubstatKey } from "../types.ts";

// Detailed design §10.2 — main stat at +0 for a Common item: base + perIlvl × ilvl.
// perIlvl is ×100 to keep fractional growth (boots SPD +0.15/ilvl) in integers.
export interface MainStatFormula {
  key: StatKey;
  base: number;
  perIlvlX100: number;
}

export const MAIN_STATS: Readonly<Record<Exclude<Slot, "amulet">, MainStatFormula[]>> = {
  weapon: [{ key: "atk", base: 10, perIlvlX100: 400 }],
  helmet: [{ key: "hp", base: 50, perIlvlX100: 2000 }],
  armor: [
    { key: "hp", base: 80, perIlvlX100: 3000 },
    { key: "def", base: 5, perIlvlX100: 150 },
  ],
  gloves: [{ key: "atk", base: 5, perIlvlX100: 200 }],
  boots: [
    { key: "def", base: 3, perIlvlX100: 100 },
    { key: "spd", base: 2, perIlvlX100: 15 },
  ],
};

/** Amulet rolls one of these as its main stat (values in bp). */
export const AMULET_MAIN_STATS: readonly MainStatFormula[] = [
  { key: "critBp", base: 300, perIlvlX100: 800 },
  { key: "critDmgBp", base: 1000, perIlvlX100: 3000 },
  { key: "lifestealBp", base: 200, perIlvlX100: 600 },
];

export const RARITY_MULT_BP: Readonly<Record<Rarity, number>> = {
  common: 10000,
  uncommon: 12000,
  rare: 14500,
  epic: 17500,
  legendary: 21000,
};

export const SUBSTAT_COUNT: Readonly<Record<Rarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

/**
 * Detailed design §10.3 — roll range at ilvl 60.
 * Flat stats scale by ilvl/60; percentage stats by (0.5 + 0.5 × ilvl/60).
 */
export const SUBSTATS: Readonly<Record<SubstatKey, { min: number; max: number; flat: boolean }>> = {
  atkPct: { min: 300, max: 800, flat: false },
  hpPct: { min: 300, max: 800, flat: false },
  defPct: { min: 300, max: 800, flat: false },
  atkFlat: { min: 15, max: 40, flat: true },
  hpFlat: { min: 150, max: 400, flat: true },
  spd: { min: 2, max: 6, flat: true },
  critBp: { min: 200, max: 500, flat: false },
  critDmgBp: { min: 400, max: 1000, flat: false },
  lifestealBp: { min: 100, max: 300, flat: false },
  dmgReduceBp: { min: 100, max: 300, flat: false },
};

export const LEGENDARY_EFFECTS: Readonly<Record<Slot, LegendaryEffect>> = {
  weapon: "bloodthirst",
  helmet: "iron_will",
  armor: "thorns",
  gloves: "quick_grip",
  boots: "shadowstep",
  amulet: "abyss_heart",
};

/** Characters can wear items up to their level + 5. */
export const ILVL_OVER_LEVEL = 5;
