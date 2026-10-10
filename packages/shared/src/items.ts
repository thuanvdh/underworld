import { DROP_OWN_CLASS_BP, ENHANCE_BP_PER_LEVEL, ENHANCE_STEPS, MAX_ENHANCE, SALVAGE, SALVAGE_STONE_REFUND_BP } from "./data/economy.ts";
import {
  AMULET_MAIN_STATS,
  LEGENDARY_EFFECTS,
  MAIN_STATS,
  RARITY_MULT_BP,
  SUBSTAT_COUNT,
  SUBSTATS,
  type MainStatFormula,
} from "./data/items.ts";
import type { Rng } from "./rng.ts";
import { CLASS_IDS, SLOTS, type ClassId, type Item, type MainStat, type Rarity, type SetCode, type Slot, type StatKey, type SubstatKey } from "./types.ts";

export interface ItemSpec {
  /** Owner class; random if omitted. */
  classId?: ClassId;
  rarity: Rarity;
  ilvl: number;
  slot?: Slot;
  setCode?: SetCode | null;
}

/** A substat never duplicates the item's main stat. */
const MAIN_TO_SUBSTAT: Partial<Record<StatKey, SubstatKey>> = {
  atk: "atkFlat",
  hp: "hpFlat",
  spd: "spd",
  critBp: "critBp",
  critDmgBp: "critDmgBp",
  lifestealBp: "lifestealBp",
};

export function generateItem(rng: Rng, spec: ItemSpec): Item {
  const slot = spec.slot ?? rng.pick(SLOTS);
  const ilvl = Math.max(1, spec.ilvl);
  const formulas: readonly MainStatFormula[] = slot === "amulet" ? [rng.pick(AMULET_MAIN_STATS)] : MAIN_STATS[slot];
  const main: MainStat[] = formulas.map((f) => ({
    key: f.key,
    value: Math.floor(((f.base * 100 + f.perIlvlX100 * ilvl) * RARITY_MULT_BP[spec.rarity]) / 1_000_000),
  }));

  const excluded = new Set(main.map((m) => MAIN_TO_SUBSTAT[m.key]).filter((k) => k !== undefined));
  const pool = (Object.keys(SUBSTATS) as SubstatKey[]).filter((k) => !excluded.has(k));
  const substats = [];
  for (let i = 0; i < SUBSTAT_COUNT[spec.rarity] && pool.length > 0; i++) {
    const key = pool.splice(rng.int(pool.length), 1)[0] as SubstatKey;
    substats.push({ key, value: rollSubstat(rng, key, ilvl) });
  }

  return {
    id: itemId(rng),
    classId: spec.classId ?? rng.pick(CLASS_IDS),
    slot,
    rarity: spec.rarity,
    ilvl,
    setCode: spec.setCode ?? null,
    main,
    substats,
    legendaryEffect: spec.rarity === "legendary" ? LEGENDARY_EFFECTS[slot] : null,
    enhance: 0,
    luck: 0,
  };
}

/** Which class a drop belongs to: usually the one you're playing, sometimes another. */
export function dropClass(rng: Rng, playing: ClassId): ClassId {
  if (rng.chance(DROP_OWN_CLASS_BP)) return playing;
  const others = CLASS_IDS.filter((c) => c !== playing);
  return rng.pick(others);
}

function rollSubstat(rng: Rng, key: SubstatKey, ilvl: number): number {
  const def = SUBSTATS[key];
  const raw = rng.range(def.min, def.max);
  const scaleBp = def.flat ? Math.floor((10000 * ilvl) / 60) : 5000 + Math.floor((5000 * ilvl) / 60);
  return Math.max(1, Math.floor((raw * scaleBp) / 10000));
}

function itemId(rng: Rng): string {
  return rng.nextU32().toString(16).padStart(8, "0") + rng.nextU32().toString(16).padStart(8, "0");
}

/** Main stats including enhancement (+6% of the +0 value per level). */
export function enhancedMain(item: Item): MainStat[] {
  const bonusBp = 10000 + item.enhance * ENHANCE_BP_PER_LEVEL;
  return item.main.map((m) => ({ key: m.key, value: Math.floor((m.value * bonusBp) / 10000) }));
}

/**
 * Table cost × (ilvl/30)^1.5 for gold (floor 0.15) and × max(1, ilvl/20) for stones,
 * so enhancing stays a long-term sink as items get better.
 */
export function enhanceCost(item: Item): { gold: number; stones: number } | null {
  const step = ENHANCE_STEPS[item.enhance];
  if (!step) return null;
  const goldFactor = Math.max(0.15, Math.pow(item.ilvl / 30, 1.5));
  const stoneFactor = Math.max(1, item.ilvl / 20);
  return { gold: Math.floor(step.gold * goldFactor), stones: Math.ceil(step.stones * stoneFactor) };
}

/** Success chance in bp: base + luck/2. A full luck meter guarantees success. */
export function enhanceChanceBp(item: Item): number {
  const step = ENHANCE_STEPS[item.enhance];
  if (!step) return 0;
  if (item.luck >= 100) return 10000;
  return Math.min(10000, step.chanceBp + item.luck * 50);
}

/** Roll one enhancement attempt. Mutates the item. The caller pays the cost first. */
export function rollEnhance(rng: Rng, item: Item): boolean {
  const step = ENHANCE_STEPS[item.enhance];
  if (!step || item.enhance >= MAX_ENHANCE) return false;
  if (rng.chance(enhanceChanceBp(item))) {
    item.enhance += 1;
    item.luck = 0;
    return true;
  }
  item.luck = Math.min(100, item.luck + step.luckOnFail);
  return false;
}

export function salvageYield(item: Item): { dust: number; crystals: number; cores: number; stones: number } {
  let spentStones = 0;
  for (let i = 0; i < item.enhance; i++) spentStones += ENHANCE_STEPS[i]?.stones ?? 0;
  return { ...SALVAGE[item.rarity], stones: Math.floor((spentStones * SALVAGE_STONE_REFUND_BP) / 10000) };
}
