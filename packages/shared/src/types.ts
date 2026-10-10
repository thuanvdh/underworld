/**
 * Units used everywhere in game logic:
 * - Flat stats (hp, atk, def, spd) are integers.
 * - Percentages are basis points: 10000 bp = 100%.
 * Combat only does integer math on these, so client and server agree exactly.
 */

export type ClassId = "butcher" | "gunslinger" | "hexer";

export type Slot = "weapon" | "helmet" | "armor" | "gloves" | "boots" | "amulet";
export const SLOTS: readonly Slot[] = ["weapon", "helmet", "armor", "gloves", "boots", "amulet"];

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export type SetCode = "drifter" | "gravedigger" | "smuggler" | "forgeborn" | "sporeborne" | "underlord";

export type LegendaryEffect =
  | "bloodthirst" // weapon
  | "iron_will" // helmet
  | "thorns" // armor
  | "quick_grip" // gloves
  | "shadowstep" // boots
  | "abyss_heart"; // amulet

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critBp: number;
  critDmgBp: number;
  lifestealBp: number;
  /** Ignore this share of the target's DEF. */
  penBp: number;
  /** Reduce damage taken by this share. */
  dmgReduceBp: number;
}

export type StatKey = keyof Stats;

export type SubstatKey =
  | "atkPct"
  | "hpPct"
  | "defPct"
  | "atkFlat"
  | "hpFlat"
  | "spd"
  | "critBp"
  | "critDmgBp"
  | "lifestealBp"
  | "dmgReduceBp";

export interface Substat {
  key: SubstatKey;
  value: number;
}

export interface MainStat {
  key: StatKey;
  value: number;
}

export interface Item {
  id: string;
  slot: Slot;
  rarity: Rarity;
  ilvl: number;
  setCode: SetCode | null;
  /** Main stats at +0. Enhancement is applied on top when building stats. */
  main: MainStat[];
  substats: Substat[];
  legendaryEffect: LegendaryEffect | null;
  enhance: number;
  /** Luck meter for enhancement, 0–100. */
  luck: number;
}

export type Equipment = Partial<Record<Slot, Item>>;

export function emptyStats(): Stats {
  return { hp: 0, atk: 0, def: 0, spd: 0, critBp: 0, critDmgBp: 0, lifestealBp: 0, penBp: 0, dmgReduceBp: 0 };
}
