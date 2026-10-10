import { randomInt, randomUUID } from "node:crypto";
import {
  AFK,
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
  power,
  rollEnhance,
  salvageYield,
  type BoonId,
  type ClassId,
  type Equipment,
  type Item,
  type Slot,
} from "@underworld/shared";
import { buildDungeonSetup, simulate, type BattleInputs, type BattleResult, type BattleSetup } from "@underworld/combat";
import { tx, type Db } from "../db.ts";
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

export type PlayerView = ReturnType<GameService["view"]>;

/**
 * All game rules that change state. Every public method runs in one transaction and returns the new
 * player view, so the client never has to guess balances.
 */
export class GameService {
  private readonly db: Db;
  private readonly now: () => number;

  constructor(db: Db, now: () => number = Date.now) {
    this.db = db;
    this.now = now;
  }

  // ───────────────────────── account ─────────────────────────

  login(telegramId: number, name: string, language: string): Player {
    return tx(this.db, () => {
      const now = this.now();
      const existing = findPlayerByTelegram(this.db, telegramId);
      if (!existing) return insertPlayer(this.db, telegramId, name.slice(0, 64) || "Hunter", language, now);
      existing.name = name.slice(0, 64) || existing.name;
      existing.lastSeenAt = now;
      savePlayer(this.db, existing);
      return existing;
    });
  }

  me(playerId: number): PlayerView {
    return this.view(this.load(playerId));
  }

  chooseClass(playerId: number, classId: string): PlayerView {
    if (!CLASSES.includes(classId as ClassId)) throw new GameError("bad_request", "unknown class");
    // Switching is free at any time: level and gear are shared by all three classes.
    return this.write(playerId, (p) => {
      p.classId = classId as ClassId;
      p.classChosen = true;
    });
  }

  // ───────────────────────── dungeon ─────────────────────────

  dungeon(playerId: number): { highestFloor: number; maxFloor: number; stars: Record<number, number> } {
    const p = this.load(playerId);
    const rows = this.db.prepare("SELECT floor, stars FROM floor_progress WHERE player_id = ?").all(playerId) as { floor: number; stars: number }[];
    return { highestFloor: p.highestFloor, maxFloor: MAX_FLOOR, stars: Object.fromEntries(rows.map((r) => [r.floor, r.stars])) };
  }

  startDungeon(playerId: number, floor: number): { battleId: string; setup: BattleSetup; player: PlayerView } {
    if (!Number.isInteger(floor) || floor < 1) throw new GameError("bad_request", "invalid floor");
    return tx(this.db, () => {
      const now = this.now();
      const p = this.load(playerId);
      this.regenEnergy(p, now);
      if (!p.classChosen) throw new GameError("class_not_chosen");
      if (floor > Math.min(MAX_FLOOR, p.highestFloor + 1)) throw new GameError("floor_locked");

      const free = this.isFreeRun(p, floor, now);
      if (!free) this.spendEnergy(p, ENERGY.perRun);

      const seed = randomInt(0, 2 ** 32);
      const setup = buildDungeonSetup(floor, buildHero(p.classId, p.level, this.equipment(p)), seed);
      setup.boonsEnabled = p.level >= UNLOCK_LEVEL.boons;
      const battleId = randomUUID();
      this.db
        .prepare("INSERT INTO battles (id, player_id, floor, seed, setup, free_energy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'started', ?)")
        .run(battleId, p.id, floor, seed, JSON.stringify(setup), free ? 1 : 0, now);
      savePlayer(this.db, p);
      return { battleId, setup, player: this.view(p) };
    });
  }

  /**
   * Replay the client's inputs, trust only our own result, then pay out. Finishing twice returns the
   * stored response, so a retried request can't double the rewards.
   */
  finishDungeon(playerId: number, battleId: string, inputs: BattleInputs): FinishResponse {
    return tx(this.db, () => {
      const row = this.db.prepare("SELECT * FROM battles WHERE id = ? AND player_id = ?").get(battleId, playerId) as
        | { floor: number; seed: number; setup: string; free_energy: number; status: string; response: string | null }
        | undefined;
      if (!row) throw new GameError("not_found", "battle not found");
      if (row.status === "finished") return JSON.parse(row.response!) as FinishResponse;

      const now = this.now();
      const p = this.load(playerId);
      this.regenEnergy(p, now);
      const setup = JSON.parse(row.setup) as BattleSetup;
      const result = simulate(setup, inputs);
      const rng = new Rng((row.seed ^ 0x5bd1e995) >>> 0);
      const levelFrom = p.level;
      const summary = emptySummary(levelFrom);
      const floor = row.floor;
      const ref = `battle:${battleId}`;

      if (result.victory) {
        const chapter = chapterOf(floor).number;
        const pityCode = `chapter_${chapter}`;
        const firstClear = floor > p.highestFloor;
        const r = dungeonRewards(rng, {
          classId: p.classId,
          floor,
          firstClear,
          boons: result.boons as BoonId[],
          sets: setup.hero.sets,
          pity: this.pity(p.id, pityCode),
        });
        if (isChapterBossFloor(floor)) this.setPity(p.id, pityCode, r.pity);
        if (firstClear) p.highestFloor = floor;
        this.db
          .prepare(
            `INSERT INTO floor_progress (player_id, floor, stars) VALUES (?, ?, ?)
             ON CONFLICT(player_id, floor) DO UPDATE SET stars = MAX(stars, excluded.stars)`,
          )
          .run(p.id, floor, result.stars);
        this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: r.stones, gems: r.gems }, "dungeon", ref, now);
        this.giveItems(p, r.items, summary, now);
      } else {
        const r = dungeonRewards(rng, { classId: p.classId, floor, firstClear: false, boons: [], sets: {}, pity: 0, cleared: result.wavesCleared });
        this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: 0, gems: 0 }, "dungeon_loss", ref, now);
        if (!row.free_energy) p.energy += Math.floor((ENERGY.perRun * ENERGY.refundOnLossBp) / 10000);
      }

      summary.levelTo = p.level;
      savePlayer(this.db, p);
      const response: FinishResponse = { result, rewards: summary, player: this.view(p) };
      this.db.prepare("UPDATE battles SET status = 'finished', response = ?, finished_at = ? WHERE id = ?").run(JSON.stringify(response), now, battleId);
      return response;
    });
  }

  /** Instant clears of a 3-star floor. */
  sweep(playerId: number, floor: number, times: number): { rewards: RewardSummary; player: PlayerView } {
    if (!Number.isInteger(times) || times < 1 || times > MAX_SWEEPS) throw new GameError("bad_request", "invalid sweep count");
    return tx(this.db, () => {
      const now = this.now();
      const p = this.load(playerId);
      this.regenEnergy(p, now);
      const stars = (this.db.prepare("SELECT stars FROM floor_progress WHERE player_id = ? AND floor = ?").get(p.id, floor) as { stars: number } | undefined)?.stars;
      if (stars !== 3) throw new GameError("not_sweepable");

      const summary = emptySummary(p.level);
      const rng = new Rng(randomInt(0, 2 ** 32));
      const sets = buildHero(p.classId, p.level, this.equipment(p)).sets;
      for (let i = 0; i < times; i++) {
        this.spendEnergy(p, ENERGY.perRun);
        const pityCode = `chapter_${chapterOf(floor).number}`;
        const r = dungeonRewards(rng, { classId: p.classId, floor, firstClear: false, boons: [], sets, pity: this.pity(p.id, pityCode) });
        if (isChapterBossFloor(floor)) this.setPity(p.id, pityCode, r.pity);
        this.pay(p, summary, { gold: r.gold, exp: r.exp, stones: r.stones, gems: r.gems }, "sweep", `floor:${floor}`, now);
        this.giveItems(p, r.items, summary, now);
      }
      summary.levelTo = p.level;
      savePlayer(this.db, p);
      return { rewards: summary, player: this.view(p) };
    });
  }

  // ───────────────────────── AFK ─────────────────────────

  claimAfk(playerId: number): { rewards: RewardSummary; player: PlayerView } {
    return tx(this.db, () => {
      const now = this.now();
      const p = this.load(playerId);
      if (p.level < UNLOCK_LEVEL.afk) throw new GameError("locked_feature");
      const summary = emptySummary(p.level);
      const pending = this.afkPending(p, now);
      p.afkLastClaim = now;
      p.afkCarryStones = pending.carryStones;
      p.afkCarryDust = pending.carryDust;
      this.pay(p, summary, { gold: pending.gold, exp: pending.exp, stones: pending.stones, gems: 0 }, "afk", null, now);
      adjust(this.db, p, "dust", pending.dust, "afk", null, now);
      summary.dust += pending.dust;
      const rng = new Rng(randomInt(0, 2 ** 32));
      const items = Array.from({ length: pending.itemRolls }, () =>
        generateItem(rng, { rarity: rng.weighted(DROP_RARITY.afk), ilvl: Math.max(1, p.highestFloor), classId: dropClass(rng, p.classId) }),
      );
      this.giveItems(p, items, summary, now);
      summary.levelTo = p.level;
      savePlayer(this.db, p);
      return { rewards: summary, player: this.view(p) };
    });
  }

  // ───────────────────────── items ─────────────────────────

  /** One class's gear: what it wears and its bag. Defaults to the class being played. */
  items(playerId: number, classId?: string): { classId: ClassId; equipped: Equipment; bag: Item[] } {
    const cls = (classId && CLASSES.includes(classId as ClassId) ? classId : this.load(playerId).classId) as ClassId;
    const rows = this.db
      .prepare("SELECT data, class, equipped_slot FROM items WHERE player_id = ? AND class = ? ORDER BY created_at DESC")
      .all(playerId, cls) as { data: string; class: string; equipped_slot: string | null }[];
    const equipped: Equipment = {};
    const bag: Item[] = [];
    for (const r of rows) {
      const item = parseItem(r.data, r.class);
      if (r.equipped_slot) equipped[r.equipped_slot as Slot] = item;
      else bag.push(item);
    }
    return { classId: cls, equipped, bag };
  }

  equip(playerId: number, itemId: string): PlayerView {
    return this.write(playerId, (p) => {
      const item = this.item(p.id, itemId);
      if (item.classId !== p.classId) throw new GameError("wrong_class");
      if (item.ilvl > p.level + ILVL_OVER_LEVEL) throw new GameError("item_too_high");
      const current = this.equipment(p)[item.slot];
      if (current?.id === item.id) return;
      if (current) {
        // Free enhancement transfer: the new item keeps 80% of the old item's level.
        const transferred = Math.floor((current.enhance * 8) / 10);
        if (transferred > item.enhance) {
          item.enhance = transferred;
          current.enhance = 0;
          current.luck = 0;
        }
        this.db.prepare("UPDATE items SET equipped_slot = NULL, data = ? WHERE id = ?").run(JSON.stringify(current), current.id);
      }
      this.db.prepare("UPDATE items SET equipped_slot = ?, data = ? WHERE id = ?").run(item.slot, JSON.stringify(item), item.id);
    });
  }

  enhance(playerId: number, itemId: string): { success: boolean; item: Item; player: PlayerView } {
    let success = false;
    let item: Item | null = null;
    const player = this.write(playerId, (p, now) => {
      if (p.level < UNLOCK_LEVEL.enhance) throw new GameError("locked_feature");
      const it = this.item(p.id, itemId);
      if (it.enhance >= MAX_ENHANCE) throw new GameError("max_enhance");
      const cost = enhanceCost(it)!;
      if (p.gold < cost.gold) throw new GameError("not_enough_gold");
      if (p.stones < cost.stones) throw new GameError("not_enough_stones");
      adjust(this.db, p, "gold", -cost.gold, "enhance", `item:${it.id}`, now);
      adjust(this.db, p, "stones", -cost.stones, "enhance", `item:${it.id}`, now);
      success = rollEnhance(new Rng(randomInt(0, 2 ** 32)), it);
      this.db.prepare("UPDATE items SET data = ? WHERE id = ?").run(JSON.stringify(it), it.id);
      item = it;
    });
    return { success, item: item!, player };
  }

  salvage(playerId: number, itemIds: string[]): { salvaged: number; player: PlayerView } {
    if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 200) throw new GameError("bad_request", "itemIds");
    let salvaged = 0;
    const player = this.write(playerId, (p, now) => {
      for (const id of new Set(itemIds)) {
        const row = this.db.prepare("SELECT data, equipped_slot, locked FROM items WHERE id = ? AND player_id = ?").get(id, p.id) as
          | { data: string; equipped_slot: string | null; locked: number }
          | undefined;
        if (!row) throw new GameError("not_found", `item ${id}`);
        if (row.equipped_slot) throw new GameError("item_equipped");
        if (row.locked) continue;
        this.salvageItem(p, JSON.parse(row.data) as Item, now);
        this.db.prepare("DELETE FROM items WHERE id = ?").run(id);
        salvaged += 1;
      }
    });
    return { salvaged, player };
  }

  // ───────────────────────── forge ─────────────────────────

  /** Gold sink (detailed design §14.2): buy stones at a price that rises within the day. */
  buyStones(playerId: number, count: number): PlayerView {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new GameError("bad_request", "invalid count");
    return this.write(playerId, (p, now) => {
      this.resetForgeDay(p, now);
      const cost = forgeStonesCost(p.forgeBought, count);
      if (cost === null) throw new GameError("forge_cap");
      if (p.gold < cost) throw new GameError("not_enough_gold");
      adjust(this.db, p, "gold", -cost, "forge_stones", null, now);
      adjust(this.db, p, "stones", count, "forge_stones", null, now);
      p.forgeBought += count;
    });
  }

  convertDust(playerId: number): PlayerView {
    return this.write(playerId, (p, now) => {
      const stones = Math.floor(p.dust / DUST_PER_STONE);
      if (stones === 0) return;
      adjust(this.db, p, "dust", -stones * DUST_PER_STONE, "convert_dust", null, now);
      adjust(this.db, p, "stones", stones, "convert_dust", null, now);
    });
  }

  // ───────────────────────── view ─────────────────────────

  view(p: Player) {
    const now = this.now();
    const energy = { ...p };
    this.regenEnergy(energy, now);
    const hero = buildHero(p.classId, p.level, this.equipment(p));
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
      newbieFreeUntil: p.createdAt + ENERGY.newbieFreeHours * HOUR_MS,
      classChangeFreeUntil: p.createdAt + CLASS_CHANGE_FREE_MS,
      afk: pending
        ? { unlocked: true, hours: pending.hours, maxHours: AFK.maxHours, gold: pending.gold, exp: pending.exp, stones: pending.stones, items: pending.itemRolls }
        : { unlocked: false, hours: 0, maxHours: AFK.maxHours, gold: 0, exp: 0, stones: 0, items: 0 },
      forge: { boughtToday: forgeToday, nextPrice: forgeStonePrice(forgeToday) },
      bags: this.bagCounts(p.id),
      serverTime: now,
    };
  }

  // ───────────────────────── internals ─────────────────────────

  private load(playerId: number): Player {
    const p = findPlayer(this.db, playerId);
    if (!p) throw new GameError("unauthorized", "player not found");
    return p;
  }

  /** Load, mutate, save and return the view, all in one transaction. */
  private write(playerId: number, fn: (p: Player, now: number) => void): PlayerView {
    return tx(this.db, () => {
      const now = this.now();
      const p = this.load(playerId);
      fn(p, now);
      savePlayer(this.db, p);
      return this.view(p);
    });
  }

  private regenEnergy(p: Pick<Player, "energy" | "energyAt">, now: number): void {
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

  private spendEnergy(p: Player, amount: number): void {
    if (p.energy < amount) throw new GameError("not_enough_energy");
    if (p.energy >= ENERGY.max) p.energyAt = this.now();
    p.energy -= amount;
  }

  private isFreeRun(p: Player, floor: number, now: number): boolean {
    return floor <= ENERGY.newbieFreeFloors && now - p.createdAt < ENERGY.newbieFreeHours * HOUR_MS;
  }

  private equipment(p: Player): Equipment {
    return this.items(p.id, p.classId).equipped;
  }

  /** Unequipped item count per class, so the UI can point at gear waiting for another hunter. */
  private bagCounts(playerId: number): Record<ClassId, number> {
    const rows = this.db.prepare("SELECT class, COUNT(*) AS n FROM items WHERE player_id = ? AND equipped_slot IS NULL GROUP BY class").all(playerId) as {
      class: ClassId;
      n: number;
    }[];
    const out = { butcher: 0, gunslinger: 0, hexer: 0 } as Record<ClassId, number>;
    for (const r of rows) out[r.class] = r.n;
    return out;
  }

  private item(playerId: number, itemId: string): Item {
    const row = this.db.prepare("SELECT data, class FROM items WHERE id = ? AND player_id = ?").get(itemId, playerId) as { data: string; class: string } | undefined;
    if (!row) throw new GameError("not_found", "item not found");
    return parseItem(row.data, row.class);
  }

  private pity(playerId: number, code: string): number {
    return (this.db.prepare("SELECT value FROM pity WHERE player_id = ? AND code = ?").get(playerId, code) as { value: number } | undefined)?.value ?? 0;
  }

  private setPity(playerId: number, code: string, value: number): void {
    this.db
      .prepare("INSERT INTO pity (player_id, code, value) VALUES (?, ?, ?) ON CONFLICT(player_id, code) DO UPDATE SET value = excluded.value")
      .run(playerId, code, value);
  }

  private pay(
    p: Player,
    summary: RewardSummary,
    r: { gold: number; exp: number; stones: number; gems: number },
    reason: string,
    ref: string | null,
    now: number,
  ): void {
    adjust(this.db, p, "gold", r.gold, reason, ref, now);
    adjust(this.db, p, "stones", r.stones, reason, ref, now);
    adjust(this.db, p, "gems", r.gems, reason, ref, now);
    const lv = addExp(p.level, p.exp, r.exp);
    p.level = lv.level;
    p.exp = lv.exp;
    summary.gold += r.gold;
    summary.exp += r.exp;
    summary.stones += r.stones;
    summary.gems += r.gems;
  }

  private giveItems(p: Player, items: Item[], summary: RewardSummary, now: number): void {
    // Each class has its own bag; a drop goes to the bag of the class it belongs to.
    const counts = this.bagCounts(p.id);
    for (const item of items) {
      if (counts[item.classId] >= BAG_LIMIT) {
        this.salvageItem(p, item, now);
        summary.autoSalvaged += 1;
        continue;
      }
      this.db.prepare("INSERT INTO items (id, player_id, data, class, created_at) VALUES (?, ?, ?, ?, ?)").run(item.id, p.id, JSON.stringify(item), item.classId, now);
      summary.items.push(item);
      counts[item.classId] += 1;
    }
  }

  private salvageItem(p: Player, item: Item, now: number): void {
    const y = salvageYield(item);
    adjust(this.db, p, "dust", y.dust, "salvage", `item:${item.id}`, now);
    adjust(this.db, p, "crystals", y.crystals, "salvage", `item:${item.id}`, now);
    adjust(this.db, p, "cores", y.cores, "salvage", `item:${item.id}`, now);
    adjust(this.db, p, "stones", y.stones, "salvage", `item:${item.id}`, now);
  }

  private afkPending(p: Player, now: number) {
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

  private resetForgeDay(p: Player, now: number): void {
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
function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

