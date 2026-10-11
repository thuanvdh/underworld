import { randomInt, randomUUID } from "node:crypto";
import {
  AFK,
  DAILY_QUESTS,
  DAILY_QUEST_POINTS,
  DROP_RARITY,
  DUST_PER_STONE,
  ENERGY,
  ILVL_OVER_LEVEL,
  MAX_ENHANCE,
  MAX_FLOOR,
  Rng,
  UNLOCK_LEVEL,
  addExp,
  afkPerHour,
  buildHero,
  chapterOf,
  dropClass,
  dungeonRewards,
  enhanceCost,
  expToNext,
  forgeStonePrice,
  forgeStonesCost,
  generateItem,
  isChapterBossFloor,
  lookOf,
  power,
  rollEnhance,
  salvageYield,
  type BoonId,
  type ClassId,
  type CounterKey,
  type Equipment,
  type Item,
  type Slot,
} from "@underworld/shared";
import { buildDungeonSetup, simulate, type BattleInputs, type BattleResult, type BattleSetup } from "@underworld/combat";
import type { Store } from "../store.ts";
import { GameError } from "./errors.ts";
import { adjust, findPlayer, findPlayerByTelegram, insertPlayer, savePlayer, type Player } from "./player.ts";

const HOUR_MS = 3600_000;
const ENERGY_MS = ENERGY.regenSeconds * 1000;
const CLASS_CHANGE_FREE_MS = 72 * HOUR_MS;
const BAG_LIMIT = 150;
const MAX_SWEEPS = 10;
const CLASSES: readonly ClassId[] = ["butcher", "gunslinger", "hexer"];

export interface RewardSummary {
  gold: number;
  exp: number;
  stones: number;
  gems: number;
  dust: number;
  items: Item[];
  /** Items that did not fit in the bag and were salvaged on the spot. */
  autoSalvaged: number;
  levelFrom: number;
  levelTo: number;
}

export interface FinishResponse {
  result: BattleResult;
  rewards: RewardSummary;
  player: PlayerView;
}

export type PlayerView = Awaited<ReturnType<GameService["view"]>>;

/**
 * All game rules that change state. Every public method runs in one transaction and returns the new
 * player view, so the client never has to guess balances.
 */
export class GameService {
  protected readonly db: Store;
  protected readonly now: () => number;

  constructor(db: Store, now: () => number = Date.now) {
    this.db = db;
    this.now = now;
  }

  // ───────────────────────── account ─────────────────────────

  login(telegramId: number, name: string, language: string): Promise<Player> {
    return this.db.tx(async () => {
      const now = this.now();
      const p = (await findPlayerByTelegram(this.db, telegramId)) ?? (await insertPlayer(this.db, telegramId, name.slice(0, 64) || "Hunter", language, now));
      p.name = name.slice(0, 64) || p.name;
      p.lastSeenAt = now;
      if ((await this.counter(p.id, `d:${dayKey(now)}`, "login")) === 0) await this.bump(p, "login");
      await savePlayer(this.db, p);
      return p;
    });
  }

  async me(playerId: number): Promise<PlayerView> {
    return this.view(await this.load(playerId));
  }

  chooseClass(playerId: number, classId: string): Promise<PlayerView> {
    if (!CLASSES.includes(classId as ClassId)) throw new GameError("bad_request", "unknown class");
    // Switching is free at any time: level is shared, each class keeps its own bag.
    return this.write(playerId, async (p) => {
      p.classId = classId as ClassId;
      p.classChosen = true;
    });
  }

  // ───────────────────────── dungeon ─────────────────────────

  async dungeon(playerId: number): Promise<{ highestFloor: number; maxFloor: number; stars: Record<number, number> }> {
    const p = await this.load(playerId);
    const rows = await this.db.all<{ floor: number; stars: number }>("SELECT floor, stars FROM floor_progress WHERE player_id = ?", playerId);
    return { highestFloor: p.highestFloor, maxFloor: MAX_FLOOR, stars: Object.fromEntries(rows.map((r) => [r.floor, r.stars])) };
  }

  startDungeon(playerId: number, floor: number): Promise<{ battleId: string; setup: BattleSetup; player: PlayerView }> {
    if (!Number.isInteger(floor) || floor < 1) throw new GameError("bad_request", "invalid floor");
    return this.db.tx(async () => {
      const now = this.now();
      const p = await this.load(playerId, true);
      this.regenEnergy(p, now);
      if (!p.classChosen) throw new GameError("class_not_chosen");
      if (floor > Math.min(MAX_FLOOR, p.highestFloor + 1)) throw new GameError("floor_locked");

      const free = this.isFreeRun(p, floor, now);
      if (!free) this.spendEnergy(p, ENERGY.perRun);

      const seed = randomInt(0, 2 ** 32);
      const setup = buildDungeonSetup(floor, buildHero(p.classId, p.level, await this.equipment(p)), seed);
      setup.boonsEnabled = p.level >= UNLOCK_LEVEL.boons;
      const battleId = randomUUID();
      await this.db.run(
        "INSERT INTO battles (id, player_id, floor, seed, setup, free_energy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'started', ?)",
        battleId,
        p.id,
        floor,
        seed,
        JSON.stringify(setup),
        free ? 1 : 0,
        now,
      );
      await savePlayer(this.db, p);
      return { battleId, setup, player: await this.view(p) };
    });
  }

  /**
   * Replay the client's inputs, trust only our own result, then pay out. Finishing twice returns the
   * stored response, so a retried request can't double the rewards.
   */
  finishDungeon(playerId: number, battleId: string, inputs: BattleInputs): Promise<FinishResponse> {
    return this.db.tx(async () => {
      // Lock the player first so a concurrent finish of the same battle waits, then sees "finished".
      const p = await this.load(playerId, true);
      const row = await this.db.get<{ floor: number; seed: number; setup: string; free_energy: number; status: string; response: string | null }>(
        "SELECT * FROM battles WHERE id = ? AND player_id = ?",
        battleId,
        playerId,
      );
      if (!row) throw new GameError("not_found", "battle not found");
      if (row.status === "finished") return JSON.parse(row.response!) as FinishResponse;

      const now = this.now();
      this.regenEnergy(p, now);
      const setup = JSON.parse(row.setup) as BattleSetup;
      const result = simulate(setup, inputs);
      const rng = new Rng((row.seed ^ 0x5bd1e995) >>> 0);
      const summary = emptySummary(p.level);
      const floor = row.floor;
      const highestBefore = p.highestFloor;
      const ref = `battle:${battleId}`;

      if (result.victory) {
        const pityCode = `chapter_${chapterOf(floor).number}`;
        const firstClear = floor > p.highestFloor;
        const r = dungeonRewards(rng, {
          classId: p.classId,
          floor,
          firstClear,
          boons: result.boons as BoonId[],
          sets: setup.hero.sets,
          pity: await this.pity(p.id, pityCode),
        });
        if (isChapterBossFloor(floor)) await this.setPity(p.id, pityCode, r.pity);
        if (firstClear) p.highestFloor = floor;
        await this.db.run(
          `INSERT INTO floor_progress (player_id, floor, stars) VALUES (?, ?, ?)
           ON CONFLICT (player_id, floor) DO UPDATE SET stars = CASE WHEN excluded.stars > floor_progress.stars THEN excluded.stars ELSE floor_progress.stars END`,
          p.id,
          floor,
          result.stars,
        );
        await this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: r.stones, gems: r.gems }, "dungeon", ref, now);
        await this.giveItems(p, r.items, summary, now);
      } else {
        const r = dungeonRewards(rng, { classId: p.classId, floor, firstClear: false, boons: [], sets: {}, pity: 0, cleared: result.wavesCleared });
        await this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: 0, gems: 0 }, "dungeon_loss", ref, now);
        if (!row.free_energy) p.energy += Math.floor((ENERGY.perRun * ENERGY.refundOnLossBp) / 10000);
      }

      await this.bump(p, "runs");
      if (result.victory && result.stars === 3) await this.bump(p, "stars3");
      if (result.victory && floor > highestBefore) await this.bump(p, "newFloors");
      summary.levelTo = p.level;
      await savePlayer(this.db, p);
      const response: FinishResponse = { result, rewards: summary, player: await this.view(p) };
      await this.db.run("UPDATE battles SET status = 'finished', response = ?, finished_at = ? WHERE id = ?", JSON.stringify(response), now, battleId);
      return response;
    });
  }

  /** Instant clears of a 3-star floor. */
  sweep(playerId: number, floor: number, times: number): Promise<{ rewards: RewardSummary; player: PlayerView }> {
    if (!Number.isInteger(times) || times < 1 || times > MAX_SWEEPS) throw new GameError("bad_request", "invalid sweep count");
    return this.db.tx(async () => {
      const now = this.now();
      const p = await this.load(playerId, true);
      this.regenEnergy(p, now);
      const stars = (await this.db.get<{ stars: number }>("SELECT stars FROM floor_progress WHERE player_id = ? AND floor = ?", p.id, floor))?.stars;
      if (stars !== 3) throw new GameError("not_sweepable");

      const summary = emptySummary(p.level);
      const rng = new Rng(randomInt(0, 2 ** 32));
      const sets = buildHero(p.classId, p.level, await this.equipment(p)).sets;
      const pityCode = `chapter_${chapterOf(floor).number}`;
      for (let i = 0; i < times; i++) {
        this.spendEnergy(p, ENERGY.perRun);
        const r = dungeonRewards(rng, { classId: p.classId, floor, firstClear: false, boons: [], sets, pity: await this.pity(p.id, pityCode) });
        if (isChapterBossFloor(floor)) await this.setPity(p.id, pityCode, r.pity);
        await this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: r.stones, gems: r.gems }, "sweep", `floor:${floor}`, now);
        await this.giveItems(p, r.items, summary, now);
      }
      await this.bump(p, "runs", times);
      summary.levelTo = p.level;
      await savePlayer(this.db, p);
      return { rewards: summary, player: await this.view(p) };
    });
  }

  // ───────────────────────── AFK ─────────────────────────

  claimAfk(playerId: number): Promise<{ rewards: RewardSummary; player: PlayerView }> {
    return this.db.tx(async () => {
      const now = this.now();
      const p = await this.load(playerId, true);
      if (p.level < UNLOCK_LEVEL.afk) throw new GameError("locked_feature");
      const summary = emptySummary(p.level);
      const pending = this.afkPending(p, now);
      p.afkLastClaim = now;
      p.afkCarryStones = pending.carryStones;
      p.afkCarryDust = pending.carryDust;
      await this.pay(p, summary, { gold: pending.gold, exp: pending.exp, stones: pending.stones, gems: 0 }, "afk", null, now);
      await adjust(this.db, p, "dust", pending.dust, "afk", null, now);
      summary.dust += pending.dust;
      const rng = new Rng(randomInt(0, 2 ** 32));
      const items = Array.from({ length: pending.itemRolls }, () =>
        generateItem(rng, { rarity: rng.weighted(DROP_RARITY.afk), ilvl: Math.max(1, p.highestFloor), classId: dropClass(rng, p.classId) }),
      );
      await this.giveItems(p, items, summary, now);
      await this.bump(p, "afk");
      summary.levelTo = p.level;
      await savePlayer(this.db, p);
      return { rewards: summary, player: await this.view(p) };
    });
  }

  // ───────────────────────── items ─────────────────────────

  /** One class's gear: what it wears and its bag. Defaults to the class being played. */
  async items(playerId: number, classId?: string): Promise<{ classId: ClassId; equipped: Equipment; bag: Item[] }> {
    const cls = (classId && CLASSES.includes(classId as ClassId) ? classId : (await this.load(playerId)).classId) as ClassId;
    const rows = await this.db.all<{ data: string; class: string; equipped_slot: string | null }>(
      "SELECT data, class, equipped_slot FROM items WHERE player_id = ? AND class = ? ORDER BY created_at DESC",
      playerId,
      cls,
    );
    const equipped: Equipment = {};
    const bag: Item[] = [];
    for (const r of rows) {
      const item = parseItem(r.data, r.class);
      if (r.equipped_slot) equipped[r.equipped_slot as Slot] = item;
      else bag.push(item);
    }
    return { classId: cls, equipped, bag };
  }

  equip(playerId: number, itemId: string): Promise<PlayerView> {
    return this.write(playerId, async (p) => {
      const item = await this.item(p.id, itemId);
      if (item.classId !== p.classId) throw new GameError("wrong_class");
      if (item.ilvl > p.level + ILVL_OVER_LEVEL) throw new GameError("item_too_high");
      const current = (await this.equipment(p))[item.slot];
      if (current?.id === item.id) return;
      if (current) {
        // Free enhancement transfer: the new item keeps 80% of the old item's level.
        const transferred = Math.floor((current.enhance * 8) / 10);
        if (transferred > item.enhance) {
          item.enhance = transferred;
          current.enhance = 0;
          current.luck = 0;
        }
        await this.db.run("UPDATE items SET equipped_slot = NULL, data = ? WHERE id = ?", JSON.stringify(current), current.id);
      }
      await this.db.run("UPDATE items SET equipped_slot = ?, data = ? WHERE id = ?", item.slot, JSON.stringify(item), item.id);
    });
  }

  async enhance(playerId: number, itemId: string): Promise<{ success: boolean; item: Item; player: PlayerView }> {
    let success = false;
    let item: Item | null = null;
    const player = await this.write(playerId, async (p, now) => {
      if (p.level < UNLOCK_LEVEL.enhance) throw new GameError("locked_feature");
      const it = await this.item(p.id, itemId);
      if (it.enhance >= MAX_ENHANCE) throw new GameError("max_enhance");
      const cost = enhanceCost(it)!;
      if (p.gold < cost.gold) throw new GameError("not_enough_gold");
      if (p.stones < cost.stones) throw new GameError("not_enough_stones");
      await adjust(this.db, p, "gold", -cost.gold, "enhance", `item:${it.id}`, now);
      await adjust(this.db, p, "stones", -cost.stones, "enhance", `item:${it.id}`, now);
      success = rollEnhance(new Rng(randomInt(0, 2 ** 32)), it);
      await this.bump(p, "enhance");
      await this.db.run("UPDATE items SET data = ? WHERE id = ?", JSON.stringify(it), it.id);
      item = it;
    });
    return { success, item: item!, player };
  }

  async salvage(playerId: number, itemIds: string[]): Promise<{ salvaged: number; player: PlayerView }> {
    if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 200) throw new GameError("bad_request", "itemIds");
    let salvaged = 0;
    const player = await this.write(playerId, async (p, now) => {
      for (const id of new Set(itemIds)) {
        const row = await this.db.get<{ data: string; equipped_slot: string | null; locked: number }>(
          "SELECT data, equipped_slot, locked FROM items WHERE id = ? AND player_id = ?",
          id,
          p.id,
        );
        if (!row) throw new GameError("not_found", `item ${id}`);
        if (row.equipped_slot) throw new GameError("item_equipped");
        if (row.locked) continue;
        await this.salvageItem(p, JSON.parse(row.data) as Item, now);
        await this.db.run("DELETE FROM items WHERE id = ?", id);
        salvaged += 1;
      }
      await this.bump(p, "salvage", salvaged);
    });
    return { salvaged, player };
  }

  // ───────────────────────── forge ─────────────────────────

  /** Gold sink (detailed design §14.2): buy stones at a price that rises within the day. */
  buyStones(playerId: number, count: number): Promise<PlayerView> {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new GameError("bad_request", "invalid count");
    return this.write(playerId, async (p, now) => {
      this.resetForgeDay(p, now);
      const cost = forgeStonesCost(p.forgeBought, count);
      if (cost === null) throw new GameError("forge_cap");
      if (p.gold < cost) throw new GameError("not_enough_gold");
      await adjust(this.db, p, "gold", -cost, "forge_stones", null, now);
      await adjust(this.db, p, "stones", count, "forge_stones", null, now);
      p.forgeBought += count;
    });
  }

  convertDust(playerId: number): Promise<PlayerView> {
    return this.write(playerId, async (p, now) => {
      const stones = Math.floor(p.dust / DUST_PER_STONE);
      if (stones === 0) return;
      await adjust(this.db, p, "dust", -stones * DUST_PER_STONE, "convert_dust", null, now);
      await adjust(this.db, p, "stones", stones, "convert_dust", null, now);
    });
  }

  // ───────────────────────── view ─────────────────────────

  async view(p: Player) {
    const now = this.now();
    const energy = { ...p };
    this.regenEnergy(energy, now);
    const equipped = await this.equipment(p);
    const hero = buildHero(p.classId, p.level, equipped);
    const afkUnlocked = p.level >= UNLOCK_LEVEL.afk;
    const pending = afkUnlocked ? this.afkPending(p, now) : null;
    const forgeToday = p.forgeDay === dayKey(now) ? p.forgeBought : 0;
    return {
      id: p.id,
      name: p.name,
      classId: p.classId,
      classChosen: p.classChosen,
      level: p.level,
      exp: p.exp,
      expToNext: Number.isFinite(expToNext(p.level)) ? expToNext(p.level) : 0,
      gold: p.gold,
      gems: p.gems,
      stones: p.stones,
      dust: p.dust,
      crystals: p.crystals,
      cores: p.cores,
      energy: energy.energy,
      energyMax: ENERGY.max,
      energyNextAt: energy.energy >= ENERGY.max ? null : energy.energyAt + ENERGY_MS,
      highestFloor: p.highestFloor,
      power: power(hero.stats),
      stats: hero.stats,
      sets: hero.sets,
      look: lookOf(equipped),
      newbieFreeUntil: p.createdAt + ENERGY.newbieFreeHours * HOUR_MS,
      classChangeFreeUntil: p.createdAt + CLASS_CHANGE_FREE_MS,
      afk: pending
        ? { unlocked: true, hours: pending.hours, maxHours: AFK.maxHours, gold: pending.gold, exp: pending.exp, stones: pending.stones, items: pending.itemRolls }
        : { unlocked: false, hours: 0, maxHours: AFK.maxHours, gold: 0, exp: 0, stones: 0, items: 0 },
      forge: { boughtToday: forgeToday, nextPrice: forgeStonePrice(forgeToday) },
      bags: await this.bagCounts(p.id),
      serverTime: now,
    };
  }

  // ───────────────────────── internals ─────────────────────────

  /** `lock` (inside a transaction) serializes concurrent writes for the same player on PostgreSQL. */
  protected async load(playerId: number, lock = false): Promise<Player> {
    const p = await findPlayer(this.db, playerId, lock);
    if (!p) throw new GameError("unauthorized", "player not found");
    return p;
  }

  /** Load (locked), mutate, save and return the view, all in one transaction. */
  protected write(playerId: number, fn: (p: Player, now: number) => Promise<void>): Promise<PlayerView> {
    return this.db.tx(async () => {
      const now = this.now();
      const p = await this.load(playerId, true);
      await fn(p, now);
      await savePlayer(this.db, p);
      return this.view(p);
    });
  }

  protected regenEnergy(p: Pick<Player, "energy" | "energyAt">, now: number): void {
    if (p.energy >= ENERGY.max) {
      p.energyAt = now;
      return;
    }
    const gained = Math.floor((now - p.energyAt) / ENERGY_MS);
    if (gained <= 0) return;
    const next = Math.min(ENERGY.max, p.energy + gained);
    p.energyAt = next >= ENERGY.max ? now : p.energyAt + gained * ENERGY_MS;
    p.energy = next;
  }

  protected spendEnergy(p: Player, amount: number): void {
    if (p.energy < amount) throw new GameError("not_enough_energy");
    if (p.energy >= ENERGY.max) p.energyAt = this.now();
    p.energy -= amount;
  }

  protected isFreeRun(p: Player, floor: number, now: number): boolean {
    return floor <= ENERGY.newbieFreeFloors && now - p.createdAt < ENERGY.newbieFreeHours * HOUR_MS;
  }

  protected async equipment(p: Player): Promise<Equipment> {
    return (await this.items(p.id, p.classId)).equipped;
  }

  /** Unequipped item count per class, so the UI can point at gear waiting for another hunter. */
  protected async bagCounts(playerId: number): Promise<Record<ClassId, number>> {
    const rows = await this.db.all<{ class: ClassId; n: number }>(
      "SELECT class, COUNT(*) AS n FROM items WHERE player_id = ? AND equipped_slot IS NULL GROUP BY class",
      playerId,
    );
    const out = { butcher: 0, gunslinger: 0, hexer: 0 } as Record<ClassId, number>;
    for (const r of rows) out[r.class] = Number(r.n);
    return out;
  }

  protected async item(playerId: number, itemId: string): Promise<Item> {
    const row = await this.db.get<{ data: string; class: string }>("SELECT data, class FROM items WHERE id = ? AND player_id = ?", itemId, playerId);
    if (!row) throw new GameError("not_found", "item not found");
    return parseItem(row.data, row.class);
  }

  protected async pity(playerId: number, code: string): Promise<number> {
    return (await this.db.get<{ value: number }>("SELECT value FROM pity WHERE player_id = ? AND code = ?", playerId, code))?.value ?? 0;
  }

  protected async setPity(playerId: number, code: string, value: number): Promise<void> {
    await this.db.run(
      "INSERT INTO pity (player_id, code, value) VALUES (?, ?, ?) ON CONFLICT (player_id, code) DO UPDATE SET value = excluded.value",
      playerId,
      code,
      value,
    );
  }

  protected async pay(
    p: Player,
    summary: RewardSummary,
    r: { gold: number; exp: number; stones: number; gems: number },
    reason: string,
    ref: string | null,
    now: number,
  ): Promise<void> {
    await adjust(this.db, p, "gold", r.gold, reason, ref, now);
    await adjust(this.db, p, "stones", r.stones, reason, ref, now);
    await adjust(this.db, p, "gems", r.gems, reason, ref, now);
    const lv = addExp(p.level, p.exp, r.exp);
    p.level = lv.level;
    p.exp = lv.exp;
    summary.gold += r.gold;
    summary.exp += r.exp;
    summary.stones += r.stones;
    summary.gems += r.gems;
  }

  protected async giveItems(p: Player, items: Item[], summary: RewardSummary, now: number): Promise<void> {
    // Each class has its own bag; a drop goes to the bag of the class it belongs to.
    const counts = await this.bagCounts(p.id);
    for (const item of items) {
      if (counts[item.classId] >= BAG_LIMIT) {
        await this.salvageItem(p, item, now);
        summary.autoSalvaged += 1;
        continue;
      }
      await this.db.run("INSERT INTO items (id, player_id, data, class, created_at) VALUES (?, ?, ?, ?, ?)", item.id, p.id, JSON.stringify(item), item.classId, now);
      summary.items.push(item);
      counts[item.classId] += 1;
    }
  }

  protected async salvageItem(p: Player, item: Item, now: number): Promise<void> {
    const y = salvageYield(item);
    await adjust(this.db, p, "dust", y.dust, "salvage", `item:${item.id}`, now);
    await adjust(this.db, p, "crystals", y.crystals, "salvage", `item:${item.id}`, now);
    await adjust(this.db, p, "cores", y.cores, "salvage", `item:${item.id}`, now);
    await adjust(this.db, p, "stones", y.stones, "salvage", `item:${item.id}`, now);
  }

  protected afkPending(p: Player, now: number) {
    const hours = Math.max(0, Math.min(AFK.maxHours, (now - p.afkLastClaim) / HOUR_MS));
    if (p.highestFloor === 0 || hours <= 0) {
      return { hours, gold: 0, exp: 0, stones: 0, dust: 0, itemRolls: 0, carryStones: p.afkCarryStones, carryDust: p.afkCarryDust };
    }
    const rate = afkPerHour(p.highestFloor);
    const stonesF = p.afkCarryStones + rate.stones * hours;
    const dustF = p.afkCarryDust + rate.dust * hours;
    return {
      hours,
      gold: Math.floor(rate.gold * hours),
      exp: Math.floor(rate.exp * hours),
      stones: Math.floor(stonesF),
      dust: Math.floor(dustF),
      itemRolls: Math.floor(hours),
      carryStones: stonesF - Math.floor(stonesF),
      carryDust: dustF - Math.floor(dustF),
    };
  }

  // ───────────────────────── counters (quests, limits) ─────────────────────────

  protected async counter(playerId: number, period: string, key: string): Promise<number> {
    return Number((await this.db.get<{ n: number }>("SELECT n FROM counters WHERE player_id = ? AND period = ? AND key = ?", playerId, period, key))?.n ?? 0);
  }

  protected async addCounter(playerId: number, period: string, key: string, n: number): Promise<void> {
    await this.db.run(
      "INSERT INTO counters (player_id, period, key, n) VALUES (?, ?, ?, ?) ON CONFLICT (player_id, period, key) DO UPDATE SET n = counters.n + excluded.n",
      playerId,
      period,
      key,
      n,
    );
  }

  protected async setCounter(playerId: number, period: string, key: string, n: number): Promise<void> {
    await this.db.run(
      "INSERT INTO counters (player_id, period, key, n) VALUES (?, ?, ?, ?) ON CONFLICT (player_id, period, key) DO UPDATE SET n = excluded.n",
      playerId,
      period,
      key,
      n,
    );
  }

  /** Record an action for daily and weekly quests; completing a daily quest feeds weekly activity. */
  protected async bump(p: Player, key: CounterKey, n = 1): Promise<void> {
    if (n <= 0) return;
    const now = this.now();
    const day = `d:${dayKey(now)}`;
    const week = `w:${weekKey(now)}`;
    const before = await this.counter(p.id, day, key);
    await this.addCounter(p.id, day, key, n);
    await this.addCounter(p.id, week, key, n);
    for (const q of DAILY_QUESTS) {
      if (q.counter !== key || (q.minLevel ?? 0) > p.level) continue;
      if (before < q.target && before + n >= q.target) await this.addCounter(p.id, week, "activity", DAILY_QUEST_POINTS);
    }
  }

  protected resetForgeDay(p: Player, now: number): void {
    const key = dayKey(now);
    if (p.forgeDay !== key) {
      p.forgeDay = key;
      p.forgeBought = 0;
    }
  }
}

/** Items saved before per-class bags have no classId in their JSON; the row's class column is authoritative. */
function parseItem(data: string, cls: string): Item {
  const item = JSON.parse(data) as Item;
  item.classId = cls as ClassId;
  return item;
}

function emptySummary(level: number): RewardSummary {
  return { gold: 0, exp: 0, stones: 0, gems: 0, dust: 0, items: [], autoSalvaged: 0, levelFrom: level, levelTo: level };
}

/** Daily reset key. Uses UTC until per-Region reset (GDD §17.3) lands. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** ISO week key, e.g. "2026-W41" (weeks start Monday, UTC). */
export function weekKey(now: number): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
