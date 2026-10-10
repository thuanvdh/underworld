/**
 * Quests, login calendar and the gem shop (detailed design §18, §20, GDD §14.3).
 * Gems come mostly from these loops; the shop is where they go.
 */

/** Counters the server bumps as players act. */
export type CounterKey = "login" | "runs" | "stars3" | "newFloors" | "enhance" | "afk" | "salvage" | "chest";

export interface QuestDef {
  id: string;
  counter: CounterKey;
  target: number;
  title: string;
  /** Hidden until the player reaches this level (the feature it needs isn't open yet). */
  minLevel?: number;
}

export interface Reward {
  gold?: number;
  gems?: number;
  stones?: number;
  crystals?: number;
  energy?: number;
  /** Abyss Chest pulls opened on claim. */
  chestPulls?: number;
  /** A guaranteed item for the class being played. */
  item?: { rarity: "epic" | "legendary"; slot?: "weapon" };
}

export const DAILY_QUEST_POINTS = 20;

export const DAILY_QUESTS: readonly QuestDef[] = [
  { id: "login", counter: "login", target: 1, title: "Log in" },
  { id: "runs", counter: "runs", target: 3, title: "Finish 3 dungeon runs" },
  { id: "stars3", counter: "stars3", target: 1, title: "Clear a floor with 3 stars" },
  { id: "enhance", counter: "enhance", target: 1, title: "Enhance an item", minLevel: 3 },
  { id: "afk", counter: "afk", target: 2, title: "Claim the AFK Vault twice", minLevel: 7 },
  { id: "salvage", counter: "salvage", target: 3, title: "Salvage 3 items" },
  { id: "chest", counter: "chest", target: 1, title: "Open an Abyss Chest", minLevel: 10 },
];

/** Activity milestones; any 5 daily quests reach 100. */
export const ACTIVITY_CHESTS: readonly { at: number; reward: Reward }[] = [
  { at: 40, reward: { gold: 5000, energy: 20 } },
  { at: 80, reward: { gems: 25, stones: 5 } },
  { at: 100, reward: { gems: 35, gold: 5000, energy: 20, stones: 5 } },
];

export interface WeeklyDef {
  id: string;
  /** "activity" counts daily quest points earned this week. */
  counter: CounterKey | "activity";
  target: number;
  title: string;
  reward: Reward;
}

export const WEEKLY_QUESTS: readonly WeeklyDef[] = [
  { id: "activity", counter: "activity", target: 500, title: "Earn 500 activity points", reward: { gems: 60 } },
  { id: "runs", counter: "runs", target: 20, title: "Finish 20 dungeon runs", reward: { stones: 30 } },
  { id: "floors", counter: "newFloors", target: 3, title: "Clear 3 new floors", reward: { gold: 20000 } },
  { id: "enhance", counter: "enhance", target: 10, title: "Enhance 10 times", reward: { gems: 40 } },
];

/** One claim per calendar day; day 7 is the Legendary weapon (GDD §14.3). */
export const LOGIN_CALENDAR: readonly Reward[] = [
  { gems: 500 },
  { stones: 20 },
  { chestPulls: 10 },
  { gold: 30000 },
  { gems: 1000 },
  { item: { rarity: "epic" } },
  { item: { rarity: "legendary", slot: "weapon" } },
];

// ───────────────────────── gem shop ─────────────────────────

export const SHOP = {
  chest: { single: 160, ten: 1500, freePerDay: 1, pity: 60 },
  energy: { amount: 60, prices: [50, 80, 120] },
  /** Instant AFK: 2 hours of vault income; the first one each day is free. */
  afk: { hours: 2, prices: [0, 50, 80, 120, 160] },
  deals: {
    stones: { amount: 30, price: 120, perDay: 3, title: "30 Enhancement Stones" },
    crystals: { amount: 10, price: 150, perDay: 2, title: "10 Crystals" },
  },
} as const;

export type DealId = keyof typeof SHOP.deals;
