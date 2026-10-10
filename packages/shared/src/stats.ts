import { CLASSES, PASSIVE_LEVELS } from "./data/classes.ts";
import { enhancedMain } from "./items.ts";
import { SLOTS, emptyStats, type ClassId, type Equipment, type LegendaryEffect, type SetCode, type Stats } from "./types.ts";

export interface HeroBuild {
  classId: ClassId;
  level: number;
  stats: Stats;
  /** Set pieces worn, e.g. { gravedigger: 4 }. */
  sets: Partial<Record<SetCode, number>>;
  legendaryEffects: LegendaryEffect[];
}

/** Stat bonuses (in bp) that come from set pieces; the dynamic set effects live in combat. */
const SET_STAT_BONUS: { set: SetCode; pieces: number; key: "atkPct" | "hpPct" | "defPct" | "critBp" | "critDmgBp"; bp: number }[] = [
  { set: "drifter", pieces: 2, key: "atkPct", bp: 800 },
  { set: "gravedigger", pieces: 2, key: "hpPct", bp: 1000 },
  { set: "smuggler", pieces: 4, key: "critBp", bp: 1200 },
  { set: "forgeborn", pieces: 2, key: "defPct", bp: 1200 },
  { set: "sporeborne", pieces: 2, key: "hpPct", bp: 800 },
  { set: "underlord", pieces: 2, key: "atkPct", bp: 1000 },
  { set: "underlord", pieces: 4, key: "critDmgBp", bp: 2000 },
];

/** Final combat stats for a hero: class base + level growth + gear + passives + set bonuses. */
export function buildHero(classId: ClassId, level: number, equipment: Equipment): HeroBuild {
  const def = CLASSES[classId];
  const lv = level - 1;
  const flat: Stats = {
    ...emptyStats(),
    hp: def.base.hp + Math.floor((def.growthX10.hp * lv) / 10),
    atk: def.base.atk + Math.floor((def.growthX10.atk * lv) / 10),
    def: def.base.def + Math.floor((def.growthX10.def * lv) / 10),
    spd: def.base.spd,
    critBp: def.base.critBp,
    critDmgBp: def.base.critDmgBp,
  };
  const pct = { atkPct: 0, hpPct: 0, defPct: 0 };
  const sets: Partial<Record<SetCode, number>> = {};
  const legendaryEffects: LegendaryEffect[] = [];

  for (const slot of SLOTS) {
    const item = equipment[slot];
    if (!item) continue;
    for (const m of enhancedMain(item)) flat[m.key] += m.value;
    for (const s of item.substats) {
      switch (s.key) {
        case "atkPct":
        case "hpPct":
        case "defPct":
          pct[s.key] += s.value;
          break;
        case "atkFlat":
          flat.atk += s.value;
          break;
        case "hpFlat":
          flat.hp += s.value;
          break;
        default:
          flat[s.key] += s.value;
      }
    }
    if (item.setCode) sets[item.setCode] = (sets[item.setCode] ?? 0) + 1;
    if (item.legendaryEffect) legendaryEffects.push(item.legendaryEffect);
  }

  for (const bonus of SET_STAT_BONUS) {
    if ((sets[bonus.set] ?? 0) < bonus.pieces) continue;
    if (bonus.key === "critBp" || bonus.key === "critDmgBp") flat[bonus.key] += bonus.bp;
    else pct[bonus.key] += bonus.bp;
  }
  if (legendaryEffects.includes("iron_will")) pct.hpPct += 1000;

  // Passives that are plain stat changes (detailed design §5).
  if (classId === "butcher" && level >= PASSIVE_LEVELS.first) flat.dmgReduceBp += 1000;
  if (classId === "gunslinger" && level >= PASSIVE_LEVELS.first) flat.critBp += 1000;
  if (classId === "gunslinger" && level >= PASSIVE_LEVELS.second) flat.penBp += 2000;

  const stats: Stats = {
    ...flat,
    hp: Math.floor((flat.hp * (10000 + pct.hpPct)) / 10000),
    atk: Math.floor((flat.atk * (10000 + pct.atkPct)) / 10000),
    def: Math.floor((flat.def * (10000 + pct.defPct)) / 10000),
  };
  return { classId, level, stats, sets, legendaryEffects };
}

/** Displayed Power (detailed design §4.5). */
export function power(stats: Stats): number {
  const p =
    stats.hp * 0.1 +
    stats.atk +
    stats.def * 0.8 +
    Math.max(0, stats.spd - 100) * 5 +
    (stats.critBp / 100) * stats.atk * 0.005 +
    ((stats.critDmgBp - 15000) / 100) * stats.atk * 0.002 +
    (stats.lifestealBp / 100) * stats.hp * 0.002;
  return Math.floor(p);
}
