export type BoonRarity = "common" | "rare" | "epic";

export type BoonId =
  | "sharpened"
  | "tough_skin"
  | "vigor"
  | "swift"
  | "greed"
  | "blood_frenzy"
  | "quick_hands"
  | "leech"
  | "killer_eye"
  | "treasure_hunter"
  | "echo"
  | "undying"
  | "wrath"
  | "fortune";

// Detailed design §9
export const BOONS: Readonly<Record<BoonId, BoonRarity>> = {
  sharpened: "common",
  tough_skin: "common",
  vigor: "common",
  swift: "common",
  greed: "common",
  blood_frenzy: "rare",
  quick_hands: "rare",
  leech: "rare",
  killer_eye: "rare",
  treasure_hunter: "rare",
  echo: "epic",
  undying: "epic",
  wrath: "epic",
  fortune: "epic",
};

export const BOON_RARITY_WEIGHTS: Readonly<Record<BoonRarity, number>> = { common: 60, rare: 30, epic: 10 };

export const BOON_OFFER_SIZE = 3;
