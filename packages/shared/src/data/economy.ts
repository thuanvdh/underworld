import type { Rarity } from "../types.ts";

// Detailed design §11.1 — cost at ilvl 30; multiplied by (0.5 + ilvl/60).
export interface EnhanceStep {
  gold: number;
  stones: number;
  /** Base success chance in bp. */
  chanceBp: number;
  /** Luck gained on failure, in percent of the meter. */
  luckOnFail: number;
}

export const ENHANCE_STEPS: readonly EnhanceStep[] = [
  { gold: 200, stones: 1, chanceBp: 10000, luckOnFail: 0 }, // → +1
  { gold: 400, stones: 1, chanceBp: 10000, luckOnFail: 0 },
  { gold: 700, stones: 2, chanceBp: 10000, luckOnFail: 0 },
  { gold: 1100, stones: 2, chanceBp: 10000, luckOnFail: 0 },
  { gold: 1600, stones: 3, chanceBp: 10000, luckOnFail: 0 }, // → +5
  { gold: 2200, stones: 4, chanceBp: 10000, luckOnFail: 0 },
  { gold: 3000, stones: 5, chanceBp: 10000, luckOnFail: 0 },
  { gold: 4000, stones: 6, chanceBp: 10000, luckOnFail: 0 },
  { gold: 5200, stones: 8, chanceBp: 10000, luckOnFail: 0 },
  { gold: 7000, stones: 10, chanceBp: 7000, luckOnFail: 10 }, // → +10
  { gold: 9000, stones: 12, chanceBp: 6000, luckOnFail: 10 },
  { gold: 12000, stones: 15, chanceBp: 5000, luckOnFail: 10 },
  { gold: 16000, stones: 18, chanceBp: 4000, luckOnFail: 8 },
  { gold: 21000, stones: 22, chanceBp: 3000, luckOnFail: 8 },
  { gold: 28000, stones: 26, chanceBp: 2500, luckOnFail: 8 }, // → +15
];

export const MAX_ENHANCE = ENHANCE_STEPS.length;
/** Each enhancement level adds 6% of the +0 main stat. */
export const ENHANCE_BP_PER_LEVEL = 600;
/** Share of enhancement kept when swapping to a new item in the same slot. */
export const ENHANCE_TRANSFER_BP = 8000;

// Detailed design §11.2
export const SALVAGE: Readonly<Record<Rarity, { dust: number; crystals: number; cores: number }>> = {
  common: { dust: 1, crystals: 0, cores: 0 },
  uncommon: { dust: 3, crystals: 0, cores: 0 },
  rare: { dust: 8, crystals: 1, cores: 0 },
  epic: { dust: 20, crystals: 5, cores: 0 },
  legendary: { dust: 50, crystals: 15, cores: 1 },
};
export const DUST_PER_STONE = 10;
export const SALVAGE_STONE_REFUND_BP = 5000;

// Detailed design §12.2 — rarity weights in basis points.
export const DROP_RARITY = {
  normal: { common: 6000, uncommon: 2800, rare: 1000, epic: 180, legendary: 20 },
  boss: { common: 3000, uncommon: 4000, rare: 2200, epic: 700, legendary: 100 },
  chapterBoss: { common: 0, uncommon: 0, rare: 7000, epic: 2600, legendary: 400 },
  afk: { common: 5500, uncommon: 3000, rare: 1200, epic: 270, legendary: 30 },
  chest: { common: 0, uncommon: 0, rare: 7850, epic: 2000, legendary: 150 },
} as const satisfies Record<string, Record<Rarity, number>>;

/** Guaranteed first-clear drops that carry the tutorial (GDD §14.2): a Rare on floor 1, an Epic weapon from the floor 3 boss. */
export const TUTORIAL_DROPS: Readonly<Record<number, { slot: "armor" | "weapon"; rarity: "rare" | "epic" }>> = {
  1: { slot: "armor", rarity: "rare" },
  3: { slot: "weapon", rarity: "epic" },
};

export const CHAPTER_BOSS_PITY = 40;

/** Share of drops that belong to the class you're playing; the rest split between the other classes. */
export const DROP_OWN_CLASS_BP = 6000;
export const CHEST_PITY = 60;

// Detailed design §12.1 — per-encounter rewards before floor scaling.
export const ENCOUNTER_REWARDS = {
  normal: { gold: 50, exp: 80, stoneChanceBp: 1500, stones: [1, 1], itemChanceBp: 1500 },
  elite: { gold: 75, exp: 120, stoneChanceBp: 3000, stones: [1, 2], itemChanceBp: 2500 },
  boss: { gold: 150, exp: 240, stoneChanceBp: 10000, stones: [2, 4], itemChanceBp: 10000 },
  chapterBoss: { gold: 300, exp: 480, stoneChanceBp: 10000, stones: [6, 10], itemChanceBp: 10000 },
} as const;
export const FIRST_CLEAR_MULT = 3;
export const FIRST_CLEAR_CHAPTER_GEMS = 20;
export const BLUEPRINT_CHANCE_BP = 1500;

// Detailed design §13
export const ENERGY = {
  max: 100,
  overflowMax: 300,
  regenSeconds: 240,
  perRun: 10,
  refundOnLossBp: 8000,
  newbieFreeFloors: 15,
  newbieFreeHours: 48,
} as const;

export const AFK = {
  maxHours: 12,
  monthlyPassMaxHours: 16,
  monthlyPassBonusBp: 3000,
  vaultBp: [4000, 4500, 5000, 5500, 6000],
  vaultUpgradeGold: [20000, 60000, 150000, 400000],
} as const;

/** AFK income per hour at the highest cleared floor (detailed design §13.1). */
export function afkPerHour(floor: number): { gold: number; exp: number; stones: number; dust: number } {
  const f = Math.max(1, floor);
  return {
    gold: Math.floor(250 * Math.pow(1.05, f - 1)),
    exp: Math.floor(250 * Math.pow(1.045, f - 1)),
    stones: 0.5 + 0.05 * f,
    dust: 2 + 0.1 * f,
  };
}

// Detailed design §18.1
// Sum of the three activity chests in data/meta.ts.
export const DAILY_QUEST_REWARDS = { gold: 10000, gems: 60, energy: 40, stones: 10 } as const;

// Detailed design §14.2 — gold sink: buy Enhancement Stones at the Forge, price rising within the day.
export const FORGE_STONES = {
  basePrice: 2000,
  batch: 20,
  /** Price rises 10% after every batch bought today. */
  stepBp: 1000,
  dailyCap: 100,
} as const;

/** Gold price of the next stone given how many were bought today; null once the daily cap is reached. */
export function forgeStonePrice(boughtToday: number): number | null {
  if (boughtToday >= FORGE_STONES.dailyCap) return null;
  const steps = Math.floor(boughtToday / FORGE_STONES.batch);
  return Math.floor(FORGE_STONES.basePrice * Math.pow(1 + FORGE_STONES.stepBp / 10000, steps));
}

/** Total gold for buying `count` stones after `boughtToday`; null if it would pass the daily cap. */
export function forgeStonesCost(boughtToday: number, count: number): number | null {
  let total = 0;
  for (let i = 0; i < count; i++) {
    const price = forgeStonePrice(boughtToday + i);
    if (price === null) return null;
    total += price;
  }
  return total;
}
