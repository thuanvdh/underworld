import type { BoonId, ClassId, Item, Rarity, SetCode, Slot, StatKey, SubstatKey } from "@underworld/shared";

/**
 * English is the source language (GDD §17.1). Other languages are added as extra dictionaries with the
 * same keys; `t()` falls back to English for anything missing.
 */
const en = {
  "nav.abyss": "Abyss",
  "nav.hero": "Hero",
  "nav.pvp": "PvP",
  "nav.guild": "Guild",
  "nav.shop": "Shop",
  "locked.level": "Unlocks at Lv {level}",
  "locked.soon": "Coming soon",
  "home.descend": "Descend — Floor {floor}",
  "home.cleared": "All floors cleared",
  "home.free": "Free run",
  "home.floors": "Floors",
  "home.sweep": "Sweep ×{times}",
  "home.goal": "Next goal",
  "afk.title": "Stash",
  "afk.claim": "Claim",
  "afk.locked": "Your hunter farms while you're away. Unlocks at Lv {level}.",
  "afk.empty": "Clear Floor 1 to start farming.",
  "battle.wave": "Wave {wave}/4",
  "battle.auto": "Auto",
  "battle.pickBoon": "Choose a boon",
  "battle.victory": "VICTORY",
  "battle.defeat": "DEFEAT",
  "battle.next": "Next floor",
  "battle.retry": "Try again",
  "battle.home": "Back",
  "battle.verifying": "Verifying…",
  "battle.levelUp": "Level up! Lv {level}",
  "battle.consolation": "You still keep part of the gold and EXP.",
  "quality.perfect": "PERFECT",
  "quality.good": "GOOD",
  "hero.stats": "Stats",
  "hero.bag": "Bag ({count})",
  "hero.empty": "No items yet. Descend into the Abyss!",
  "hero.salvageJunk": "Salvage Common & Uncommon",
  "hero.class": "Class",
  "hero.classFree": "Free change until {time}",
  "forge.title": "Forge",
  "forge.buy": "Buy 10 stones · {price}",
  "forge.cap": "Daily limit reached",
  "forge.convert": "Convert dust → stones",
  "item.equip": "Equip",
  "item.equipped": "Equipped",
  "item.enhance": "Enhance +{next}",
  "item.chance": "Chance {chance}%",
  "item.luck": "Luck {luck}%",
  "item.salvage": "Salvage",
  "item.tooHigh": "Requires Lv {level}",
  "item.max": "Max level",
  "item.success": "Success!",
  "item.fail": "Failed — luck increased",
  "error.not_enough_energy": "Not enough energy",
  "error.not_enough_gold": "Not enough gold",
  "error.not_enough_stones": "Not enough stones",
  "error.floor_locked": "Clear the previous floor first",
  "error.item_too_high": "Item level too high",
  "error.forge_cap": "Daily forge limit reached",
  "error.network": "Connection problem, try again",
  "error.not_enough_gems": "Not enough gems",
  "error.limit_reached": "Daily limit reached",
  "error.already_claimed": "Already claimed",
  "error.not_ready": "Not ready yet",
  "error.locked_feature": "Not unlocked yet",
  "error.wrong_class": "Switch to that hunter to equip it",
  "error.generic": "Something went wrong",
} as const;

type Key = keyof typeof en;
const dictionaries: Record<string, Partial<Record<Key, string>>> = { en };
let lang = "en";

export function setLanguage(code: string): void {
  lang = dictionaries[code] ? code : "en";
}

export function t(key: Key, params: Record<string, string | number> = {}): string {
  const template = dictionaries[lang]?.[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export function errorText(code: string): string {
  const key = `error.${code}` as Key;
  return key in en ? t(key) : t("error.generic");
}

// ───────────────────────── game names ─────────────────────────

export const CLASS_NAMES: Record<ClassId, string> = { butcher: "Butcher", gunslinger: "Gunslinger", hexer: "Hexer" };
export const CLASS_ICONS: Record<ClassId, string> = { butcher: "🪓", gunslinger: "🔫", hexer: "🧪" };
export const SKILL_NAMES: Record<ClassId, string> = { butcher: "Whirlwind", gunslinger: "Deadeye", hexer: "Plague Rain" };

export const SLOT_NAMES: Record<Slot, string> = { weapon: "Weapon", helmet: "Helmet", armor: "Armor", gloves: "Gloves", boots: "Boots", amulet: "Amulet" };
export const SLOT_ICONS: Record<Slot, string> = { weapon: "🗡️", helmet: "🪖", armor: "🥋", gloves: "🧤", boots: "👢", amulet: "📿" };
export const RARITY_NAMES: Record<Rarity, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };
export const SET_NAMES: Record<SetCode, string> = {
  drifter: "Drifter",
  gravedigger: "Gravedigger",
  smuggler: "Smuggler",
  forgeborn: "Forgeborn",
  sporeborne: "Sporeborne",
  underlord: "Underlord",
};

export const BOON_TEXT: Record<BoonId, { name: string; desc: string; icon: string }> = {
  sharpened: { name: "Sharpened", desc: "+12% ATK", icon: "🗡️" },
  tough_skin: { name: "Tough Skin", desc: "+12% DEF", icon: "🛡️" },
  vigor: { name: "Vigor", desc: "+15% max HP, heal 15%", icon: "❤️" },
  swift: { name: "Swift", desc: "+10 SPD", icon: "💨" },
  greed: { name: "Greed", desc: "+50% gold, −10% DEF", icon: "🪙" },
  blood_frenzy: { name: "Blood Frenzy", desc: "+30% ATK below 50% HP", icon: "🩸" },
  quick_hands: { name: "Quick Hands", desc: "+25% skill energy", icon: "⚡" },
  leech: { name: "Leech", desc: "+8% lifesteal", icon: "🦇" },
  killer_eye: { name: "Killer Eye", desc: "+10% crit", icon: "🎯" },
  treasure_hunter: { name: "Treasure Hunter", desc: "+1 drop on the last wave", icon: "💰" },
  echo: { name: "Echo", desc: "Skill repeats at 50%", icon: "🔁" },
  undying: { name: "Undying", desc: "Survive one lethal hit", icon: "💀" },
  wrath: { name: "Wrath", desc: "+5% ATK per kill (max 10)", icon: "🔥" },
  fortune: { name: "Fortune", desc: "20% chance to upgrade drop rarity", icon: "🍀" },
};

const STAT_NAMES: Record<StatKey | SubstatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
  critBp: "Crit",
  critDmgBp: "Crit DMG",
  lifestealBp: "Lifesteal",
  penBp: "Armor Pen",
  dmgReduceBp: "DMG Reduction",
  atkPct: "ATK",
  hpPct: "HP",
  defPct: "DEF",
  atkFlat: "ATK",
  hpFlat: "HP",
};

const PERCENT_KEYS = new Set<string>(["critBp", "critDmgBp", "lifestealBp", "penBp", "dmgReduceBp", "atkPct", "hpPct", "defPct"]);

export function statLine(key: StatKey | SubstatKey, value: number): [string, string] {
  const shown = PERCENT_KEYS.has(key) ? `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}%` : value.toLocaleString("en-US");
  return [STAT_NAMES[key], `+${shown}`];
}

const WEAPON_NAMES: Record<ClassId, string> = { butcher: "Cleaver", gunslinger: "Revolver", hexer: "Staff" };

export function itemName(item: Item): string {
  const base = item.slot === "weapon" && item.classId ? WEAPON_NAMES[item.classId] : SLOT_NAMES[item.slot];
  return item.setCode ? `${SET_NAMES[item.setCode]} ${base}` : `${RARITY_NAMES[item.rarity]} ${base}`;
}

/** Compact numbers: 1.2K, 3.4M. */
export function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-US");
}

const ENEMY_ICONS: Record<string, string> = {
  mutant_rat: "🐀",
  iron_roach: "🪳",
  drifter: "🧟",
  sewer_brute: "👹",
  fat_rat_king: "🐀",
  rat_pup: "🐁",
  bone_machine: "🦴",
  miner_ghost: "👻",
  rust_crow: "🐦‍⬛",
  grave_knight: "⚔️",
  gravedigger: "⚰️",
  shadow_merchant: "🕴️",
  guard_hound: "🐕",
  pickpocket: "🥷",
  enforcer: "🦍",
  debt_collector: "💼",
  burning_stoker: "🔥",
  clockwork_spider: "🕷️",
  small_golem: "🪨",
  forge_overseer: "🤖",
  furnace_golem: "🗿",
  mushroom_man: "🍄",
  spore_fly: "🪰",
  strangle_root: "🌿",
  fungal_brute: "🧌",
  spore_mother: "🍄",
  spore: "🟢",
  hollow_knight: "🛡️",
  shadow_priest: "🧙",
  abyss_hound: "🐺",
  throne_guard: "💂",
  the_warden: "👁️",
};

export function unitIcon(key: string, kind: string): string {
  if (kind === "hero") return CLASS_ICONS[key as ClassId] ?? "🧍";
  return ENEMY_ICONS[key] ?? (kind === "boss" ? "💀" : kind === "elite" ? "👹" : "👾");
}
