import { randomInt } from "node:crypto";
import {
  ACTIVITY_CHESTS,
  DAILY_QUESTS,
  DAILY_QUEST_POINTS,
  DROP_RARITY,
  ENERGY,
  LOGIN_CALENDAR,
  Rng,
  SHOP,
  UNLOCK_LEVEL,
  WEEKLY_QUESTS,
  afkPerHour,
  dropClass,
  generateItem,
  type DealId,
  type Item,
  type Rarity,
  type Reward,
} from "@underworld/shared";
import { GameError } from "./errors.ts";
import { adjust, savePlayer, type Player } from "./player.ts";
import { GameService, dayKey, weekKey, type PlayerView, type RewardSummary } from "./service.ts";

const DAY_MS = 86_400_000;
const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export interface ClaimResponse {
  rewards: RewardSummary;
  player: PlayerView;
}

/**
 * Gem loops on top of the core game: daily/weekly quests, the 7-day login calendar and the gem shop.
 * Every claim and purchase is one transaction with ledger entries, like the rest of the service.
 */
export class MetaService extends GameService {
  // ───────────────────────── quests ─────────────────────────

  async quests(playerId: number) {
    const p = await this.loadForMeta(playerId, UNLOCK_LEVEL.dailyQuests);
    const now = this.now();
    const day = `d:${dayKey(now)}`;
    const week = `w:${weekKey(now)}`;
    const daily = [];
    for (const q of DAILY_QUESTS) {
      const progress = Math.min(q.target, await this.counter(p.id, day, q.counter));
      const locked = (q.minLevel ?? 0) > p.level;
      daily.push({ id: q.id, title: q.title, progress, target: q.target, points: DAILY_QUEST_POINTS, done: !locked && progress >= q.target, locked, minLevel: q.minLevel ?? 0 });
    }
    const activity = await this.activity(p, day);
    const chests = [];
    for (const c of ACTIVITY_CHESTS) {
      const claimed = (await this.counter(p.id, day, `claim:chest:${c.at}`)) > 0;
      chests.push({ at: c.at, reward: c.reward, claimed, ready: !claimed && activity >= c.at });
    }
    const weekly = [];
    for (const q of WEEKLY_QUESTS) {
      const progress = Math.min(q.target, await this.counter(p.id, week, q.counter));
      const claimed = (await this.counter(p.id, week, `claim:weekly:${q.id}`)) > 0;
      weekly.push({ id: q.id, title: q.title, progress, target: q.target, reward: q.reward, claimed, ready: !claimed && progress >= q.target });
    }
    const calendar = await this.calendarState(p);
    return {
      daily,
      activity,
      chests,
      weekly,
      calendar,
      dailyResetIn: DAY_MS - (now % DAY_MS),
      weeklyResetIn: weeklyResetIn(now),
      claimable: chests.some((c) => c.ready) || weekly.some((q) => q.ready) || calendar.canClaim,
    };
  }

  claimActivityChest(playerId: number, at: number): Promise<ClaimResponse> {
    const chest = ACTIVITY_CHESTS.find((c) => c.at === at);
    if (!chest) throw new GameError("bad_request", "unknown chest");
    return this.claim(playerId, UNLOCK_LEVEL.dailyQuests, async (p, day) => {
      if ((await this.counter(p.id, day, `claim:chest:${at}`)) > 0) throw new GameError("already_claimed");
      if ((await this.activity(p, day)) < at) throw new GameError("not_ready");
      await this.setCounter(p.id, day, `claim:chest:${at}`, 1);
      return chest.reward;
    });
  }

  claimWeekly(playerId: number, id: string): Promise<ClaimResponse> {
    const quest = WEEKLY_QUESTS.find((q) => q.id === id);
    if (!quest) throw new GameError("bad_request", "unknown quest");
    return this.claim(playerId, UNLOCK_LEVEL.dailyQuests, async (p) => {
      const week = `w:${weekKey(this.now())}`;
      if ((await this.counter(p.id, week, `claim:weekly:${id}`)) > 0) throw new GameError("already_claimed");
      if ((await this.counter(p.id, week, quest.counter)) < quest.target) throw new GameError("not_ready");
      await this.setCounter(p.id, week, `claim:weekly:${id}`, 1);
      return quest.reward;
    });
  }

  // ───────────────────────── login calendar ─────────────────────────

  claimCalendar(playerId: number): Promise<ClaimResponse> {
    return this.claim(playerId, UNLOCK_LEVEL.dailyQuests, async (p) => {
      const state = await this.calendarState(p);
      if (!state.canClaim) throw new GameError(state.claimed >= LOGIN_CALENDAR.length ? "already_claimed" : "not_ready");
      await this.setCounter(p.id, "life", "cal:days", state.claimed + 1);
      await this.setCounter(p.id, "life", "cal:last", Math.floor(this.now() / DAY_MS));
      return LOGIN_CALENDAR[state.claimed]!;
    });
  }

  private async calendarState(p: Player) {
    const claimed = await this.counter(p.id, "life", "cal:days");
    const lastDay = await this.counter(p.id, "life", "cal:last");
    const today = Math.floor(this.now() / DAY_MS);
    return { claimed, canClaim: claimed < LOGIN_CALENDAR.length && (claimed === 0 || lastDay < today), rewards: LOGIN_CALENDAR };
  }

  // ───────────────────────── shop ─────────────────────────

  async shop(playerId: number) {
    const p = await this.loadForMeta(playerId, UNLOCK_LEVEL.shop);
    const day = `d:${dayKey(this.now())}`;
    const energyBought = await this.counter(p.id, day, "buy:energy");
    const afkBought = await this.counter(p.id, day, "buy:afk");
    const freeChest = await this.counter(p.id, day, "free:chest");
    const chestPity = await this.pity(p.id, "chest");
    const dealBought: Record<string, number> = {};
    for (const id of Object.keys(SHOP.deals)) dealBought[id] = await this.counter(p.id, day, `buy:deal:${id}`);
    const rate = afkPerHour(Math.max(1, p.highestFloor));
    return {
      chest: {
        single: SHOP.chest.single,
        ten: SHOP.chest.ten,
        freeLeft: Math.max(0, SHOP.chest.freePerDay - freeChest),
        pity: chestPity,
        pityAt: SHOP.chest.pity,
      },
      energy: { amount: SHOP.energy.amount, nextPrice: SHOP.energy.prices[energyBought] ?? null, left: SHOP.energy.prices.length - energyBought },
      afk: {
        hours: SHOP.afk.hours,
        nextPrice: SHOP.afk.prices[afkBought] ?? null,
        left: SHOP.afk.prices.length - afkBought,
        gold: Math.floor(rate.gold * SHOP.afk.hours),
        exp: Math.floor(rate.exp * SHOP.afk.hours),
        unlocked: p.level >= UNLOCK_LEVEL.afk && p.highestFloor > 0,
      },
      deals: (Object.keys(SHOP.deals) as DealId[]).map((id) => {
        const d = SHOP.deals[id];
        return { id, title: d.title, price: d.price, left: Math.max(0, d.perDay - (dealBought[id] ?? 0)) };
      }),
    };
  }

  openChest(playerId: number, count: number, free: boolean): Promise<ClaimResponse> {
    if (count !== 1 && count !== 10) throw new GameError("bad_request", "count must be 1 or 10");
    if (free && count !== 1) throw new GameError("bad_request", "the free pull is a single");
    return this.claim(playerId, UNLOCK_LEVEL.chest, async (p, day, now) => {
      if (free) {
        if ((await this.counter(p.id, day, "free:chest")) >= SHOP.chest.freePerDay) throw new GameError("already_claimed");
        await this.addCounter(p.id, day, "free:chest", 1);
      } else {
        const price = count === 10 ? SHOP.chest.ten : SHOP.chest.single;
        if (p.gems < price) throw new GameError("not_enough_gems");
        await adjust(this.db, p, "gems", -price, "shop_chest", `x${count}`, now);
      }
      return { chestPulls: count };
    });
  }

  buyEnergy(playerId: number): Promise<ClaimResponse> {
    return this.claim(playerId, UNLOCK_LEVEL.shop, async (p, day, now) => {
      const price = SHOP.energy.prices[await this.counter(p.id, day, "buy:energy")];
      if (price === undefined) throw new GameError("limit_reached");
      if (p.gems < price) throw new GameError("not_enough_gems");
      await adjust(this.db, p, "gems", -price, "shop_energy", null, now);
      await this.addCounter(p.id, day, "buy:energy", 1);
      return { energy: SHOP.energy.amount };
    });
  }

  /** Instant AFK: two hours of vault income right now (doesn't touch the vault timer). */
  instantAfk(playerId: number): Promise<ClaimResponse> {
    return this.claim(playerId, UNLOCK_LEVEL.shop, async (p, day, now, summary) => {
      if (p.level < UNLOCK_LEVEL.afk || p.highestFloor === 0) throw new GameError("locked_feature");
      const price = SHOP.afk.prices[await this.counter(p.id, day, "buy:afk")];
      if (price === undefined) throw new GameError("limit_reached");
      if (p.gems < price) throw new GameError("not_enough_gems");
      if (price > 0) await adjust(this.db, p, "gems", -price, "shop_afk", null, now);
      await this.addCounter(p.id, day, "buy:afk", 1);
      const rate = afkPerHour(p.highestFloor);
      const rng = new Rng(randomInt(0, 2 ** 32));
      const items = Array.from({ length: SHOP.afk.hours }, () =>
        generateItem(rng, { rarity: rng.weighted(DROP_RARITY.afk), ilvl: p.highestFloor, classId: dropClass(rng, p.classId) }),
      );
      await this.giveItems(p, items, summary, now);
      await adjust(this.db, p, "dust", Math.floor(rate.dust * SHOP.afk.hours), "shop_afk", null, now);
      return { gold: Math.floor(rate.gold * SHOP.afk.hours), stones: Math.floor(rate.stones * SHOP.afk.hours), exp: Math.floor(rate.exp * SHOP.afk.hours) } as Reward & { exp: number };
    });
  }

  buyDeal(playerId: number, id: string): Promise<ClaimResponse> {
    const deal = SHOP.deals[id as DealId];
    if (!deal) throw new GameError("bad_request", "unknown deal");
    return this.claim(playerId, UNLOCK_LEVEL.shop, async (p, day, now) => {
      if ((await this.counter(p.id, day, `buy:deal:${id}`)) >= deal.perDay) throw new GameError("limit_reached");
      if (p.gems < deal.price) throw new GameError("not_enough_gems");
      await adjust(this.db, p, "gems", -deal.price, `shop_${id}`, null, now);
      await this.addCounter(p.id, day, `buy:deal:${id}`, 1);
      return id === "stones" ? { stones: deal.amount } : { crystals: deal.amount };
    });
  }

  // ───────────────────────── internals ─────────────────────────

  private async loadForMeta(playerId: number, minLevel: number, lock = false): Promise<Player> {
    const p = await this.load(playerId, lock);
    if (p.level < minLevel) throw new GameError("locked_feature");
    return p;
  }

  private async activity(p: Player, day: string): Promise<number> {
    let sum = 0;
    for (const q of DAILY_QUESTS) if ((q.minLevel ?? 0) <= p.level && (await this.counter(p.id, day, q.counter)) >= q.target) sum += DAILY_QUEST_POINTS;
    return sum;
  }

  /** Shared claim flow: check level, run the rule, pay the reward, save, return the summary. */
  private claim(
    playerId: number,
    minLevel: number,
    rule: (p: Player, day: string, now: number, summary: RewardSummary) => Promise<Reward & { exp?: number }>,
  ): Promise<ClaimResponse> {
    return this.db.tx(async () => {
      const now = this.now();
      const p = await this.loadForMeta(playerId, minLevel, true);
      this.regenEnergy(p, now);
      const summary: RewardSummary = { gold: 0, exp: 0, stones: 0, gems: 0, dust: 0, items: [], autoSalvaged: 0, levelFrom: p.level, levelTo: p.level };
      const reward = await rule(p, `d:${dayKey(now)}`, now, summary);
      await this.grant(p, reward, summary, now);
      summary.levelTo = p.level;
      await savePlayer(this.db, p);
      return { rewards: summary, player: await this.view(p) };
    });
  }

  private async grant(p: Player, r: Reward & { exp?: number }, summary: RewardSummary, now: number): Promise<void> {
    await this.pay(p, summary, { gold: r.gold ?? 0, exp: r.exp ?? 0, stones: r.stones ?? 0, gems: r.gems ?? 0 }, "reward", null, now);
    if (r.crystals) await adjust(this.db, p, "crystals", r.crystals, "reward", null, now);
    if (r.energy) p.energy = Math.min(ENERGY.overflowMax, p.energy + r.energy);
    const rng = new Rng(randomInt(0, 2 ** 32));
    if (r.chestPulls) {
      await this.giveItems(p, await this.rollChest(p, rng, r.chestPulls), summary, now);
      await this.bump(p, "chest", r.chestPulls);
    }
    if (r.item) {
      const item = generateItem(rng, { rarity: r.item.rarity, ilvl: Math.max(1, p.highestFloor), slot: r.item.slot, classId: p.classId });
      await this.giveItems(p, [item], summary, now);
    }
  }

  /** Abyss Chest pulls for the class being played: 10-pull guarantees an Epic, Legendary pity at 60 (kept forever). */
  private async rollChest(p: Player, rng: Rng, n: number): Promise<Item[]> {
    let pity = await this.pity(p.id, "chest");
    const out: Item[] = [];
    for (let i = 0; i < n; i++) {
      pity += 1;
      let rarity: Rarity = rng.weighted(DROP_RARITY.chest);
      if (pity >= SHOP.chest.pity) rarity = "legendary";
      if (n === 10 && i === n - 1 && !out.some((it) => RANK[it.rarity] >= RANK.epic) && RANK[rarity] < RANK.epic) rarity = "epic";
      if (rarity === "legendary") pity = 0;
      out.push(generateItem(rng, { rarity, ilvl: Math.max(1, p.highestFloor), classId: p.classId }));
    }
    await this.setPity(p.id, "chest", pity);
    return out;
  }
}

function weeklyResetIn(now: number): number {
  const d = new Date(now);
  const daysToMonday = (8 - d.getUTCDay()) % 7 || 7;
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToMonday);
  return next - now;
}

