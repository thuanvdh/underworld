import { MAX_LEVEL } from "./classes.ts";

/** EXP needed to go from `level` to `level + 1`: 100 × L^1.9, rounded to tens. */
export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round((100 * Math.pow(level, 1.9)) / 10) * 10;
}

/** Apply gained EXP; returns the new level and leftover EXP. */
export function addExp(level: number, exp: number, gained: number): { level: number; exp: number } {
  let l = level;
  let e = exp + gained;
  while (l < MAX_LEVEL && e >= expToNext(l)) {
    e -= expToNext(l);
    l += 1;
  }
  if (l >= MAX_LEVEL) e = 0;
  return { level: l, exp: e };
}

// Detailed design §6.2
export const UNLOCK_LEVEL = {
  enhance: 3,
  autoBattle: 5,
  chooseClass: 5,
  boons: 6,
  afk: 7,
  arena: 8,
  dailyQuests: 10,
  shop: 10,
  guild: 12,
  raid: 15,
  craft: 15,
  chest: 10,
  speedX2: 10,
  reforge: 20,
  battlePass: 20,
  bounty: 25,
} as const;
