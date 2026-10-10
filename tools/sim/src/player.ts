import {
  AFK,
  CHEST_PITY,
  DAILY_QUEST_REWARDS,
  DROP_RARITY,
  DUST_PER_STONE,
  ENERGY,
  ILVL_OVER_LEVEL,
  forgeStonePrice,
  MAX_FLOOR,
  Rng,
  SLOTS,
  UNLOCK_LEVEL,
  addExp,
  afkPerHour,
  dropClass,
  buildHero,
  dungeonRewards,
  enhanceCost,
  floorMultiplier,
  generateItem,
  power,
  rollEnhance,
  salvageYield,
  type ClassId,
  type Equipment,
  type Item,
} from "@underworld/shared";
import { buildDungeonSetup, simulate, type Autopilot } from "@underworld/combat";

export interface Archetype {
  name: "casual" | "regular" | "hardcore";
  share: number;
  sessionsPerDay: number;
  runsPerSession: number;
  autopilot: Autopilot;
}

export const ARCHETYPES: readonly Archetype[] = [
  { name: "casual", share: 0.35, sessionsPerDay: 2, runsPerSession: 5, autopilot: "auto" },
  { name: "regular", share: 0.45, sessionsPerDay: 4, runsPerSession: 8, autopilot: "good" },
  { name: "hardcore", share: 0.2, sessionsPerDay: 6, runsPerSession: 15, autopilot: "perfect" },
];

const HOUR = 3600;
const DAY = 24 * HOUR;
const WAKE_START = 7 * HOUR;
const WAKE_LENGTH = 16 * HOUR;
/** Expected share of AFK gold lost to raids once raiding unlocks (≈0.3 raids per 12h × 10% × 60% unvaulted). */
const RAID_LOSS_BP = 300;
/** Daily side income not simulated in detail: arena gems, weekly quests, guild boss (detailed design §14.1). */
const SIDE_INCOME = { arenaGems: 20, weeklyGems: 20, guildGold: 4000, guildStones: 8 } as const;
const CHEST_10_PRICE = 1500;

export interface DayStats {
  goldEarned: Record<string, number>;
  goldSpent: Record<string, number>;
  stonesEarned: number;
  stonesSpent: number;
  gemsEarned: number;
  gemsSpent: number;
  battles: number;
  battlesWon: number;
  runs: number;
}

function emptyDay(): DayStats {
  return { goldEarned: {}, goldSpent: {}, stonesEarned: 0, stonesSpent: 0, gemsEarned: 0, gemsSpent: 0, battles: 0, battlesWon: 0, runs: 0 };
}

export interface Snapshot {
  day: number;
  level: number;
  floor: number;
  power: number;
  gold: number;
  gems: number;
  avgEnhance: number;
  legendaries: number;
  day_: DayStats;
}

export class SimPlayer {
  readonly id: number;
  readonly archetype: Archetype;
  readonly classId: ClassId;
  readonly monthlyPass: boolean;
  private readonly rng: Rng;

  level = 1;
  exp = 0;
  gold = 0;
  gems = 0;
  stones = 0;
  dust = 0;
  crystals = 0;
  cores = 0;
  energy: number = ENERGY.max;
  private energyAt = 0;
  private afkLastClaim = 0;
  private afkCarry = { stones: 0, dust: 0 };
  highestFloor = 0;
  private readonly threeStar = new Set<number>();
  private readonly pity: Record<number, number> = {};
  private chestPity = 0;
  private lastFreeChestDay = -1;
  private lastQuestDay = -1;
  private forgeDay = -1;
  private forgeBought = 0;
  private currentDay = 0;
  private attemptsOnNext = 0;
  equipment: Equipment = {};
  legendariesFound = 0;
  readonly milestones: Record<number, number> = {};
  readonly history: Snapshot[] = [];
  private today: DayStats = emptyDay();

  constructor(id: number, archetype: Archetype, classId: ClassId, monthlyPass: boolean, seed: number) {
    this.id = id;
    this.archetype = archetype;
    this.classId = classId;
    this.monthlyPass = monthlyPass;
    this.rng = new Rng(seed);
  }

  /** Session start times for a day, in seconds since the player joined. */
  sessionTimes(day: number): number[] {
    const n = this.archetype.sessionsPerDay;
    if (day === 0) return Array.from({ length: n }, (_, i) => Math.floor((i * WAKE_LENGTH) / n));
    return Array.from({ length: n }, (_, i) => day * DAY + WAKE_START + Math.floor((i * WAKE_LENGTH) / n));
  }

  playDay(day: number): void {
    this.today = emptyDay();
    this.currentDay = day;
    const times = this.sessionTimes(day);
    times.forEach((t, i) => this.session(t, day, day === 0 && i === 0, i === times.length - 1));
    this.history.push({
      day,
      level: this.level,
      floor: this.highestFloor,
      power: this.power(),
      gold: this.gold,
      gems: this.gems,
      avgEnhance: this.avgEnhance(),
      legendaries: this.legendariesFound,
      day_: this.today,
    });
  }

  power(): number {
    return power(buildHero(this.classId, this.level, this.equipment).stats);
  }

  // ───────────────────────── a session ─────────────────────────

  private session(t: number, day: number, tutorial: boolean, lastOfDay: boolean): void {
    this.regenEnergy(t);
    if (this.level >= UNLOCK_LEVEL.afk) this.claimAfk(t);
    else this.afkLastClaim = t;

    const maxRuns = tutorial ? 25 : this.archetype.runsPerSession;
    this.attemptsOnNext = 0;
    for (let i = 0; i < maxRuns; i++) {
      if (!this.playRun(t)) break;
    }
    if (lastOfDay) this.dailyIncome(day);
    this.openChests(day);
    this.manageGear();
    this.spendOnEnhance();
  }

  private regenEnergy(t: number): void {
    if (this.energy < ENERGY.max) {
      const gained = Math.floor((t - this.energyAt) / ENERGY.regenSeconds);
      this.energy = Math.min(ENERGY.max, this.energy + gained);
    }
    this.energyAt = t;
  }

  private claimAfk(t: number): void {
    const cap = this.monthlyPass ? AFK.monthlyPassMaxHours : AFK.maxHours;
    const hours = Math.min(cap, (t - this.afkLastClaim) / HOUR);
    this.afkLastClaim = t;
    if (hours <= 0 || this.highestFloor === 0) return;
    const rate = afkPerHour(this.highestFloor);
    const bonus = this.monthlyPass ? 1 + AFK.monthlyPassBonusBp / 10000 : 1;
    let gold = Math.floor(rate.gold * hours * bonus);
    if (this.level >= UNLOCK_LEVEL.raid) gold -= Math.floor((gold * RAID_LOSS_BP) / 10000);
    this.earnGold("afk", gold);
    this.gainExp(Math.floor(rate.exp * hours * bonus));
    this.afkCarry.stones += rate.stones * hours * bonus;
    this.afkCarry.dust += rate.dust * hours * bonus;
    const stones = Math.floor(this.afkCarry.stones);
    this.afkCarry.stones -= stones;
    this.earnStones(stones);
    const dust = Math.floor(this.afkCarry.dust);
    this.afkCarry.dust -= dust;
    this.dust += dust;
    for (let i = 0; i < Math.floor(hours); i++) {
      this.receiveItem(generateItem(this.rng, { rarity: this.rng.weighted(DROP_RARITY.afk), ilvl: this.highestFloor, classId: dropClass(this.rng, this.classId) }));
    }
  }

  /** Returns false when the player is out of energy. */
  private playRun(t: number): boolean {
    const next = this.highestFloor + 1;
    const pushing = next <= MAX_FLOOR && this.attemptsOnNext < 3;
    const floor = pushing ? next : this.farmFloor();
    if (floor === 0) return false;

    const free = t < ENERGY.newbieFreeHours * HOUR && floor <= ENERGY.newbieFreeFloors;
    if (!free) {
      if (this.energy < ENERGY.perRun) return false;
      this.energy -= ENERGY.perRun;
    }
    this.today.runs += 1;

    const sweep = !pushing && this.threeStar.has(floor);
    let boons: readonly string[] = [];
    if (!sweep) {
      const hero = buildHero(this.classId, this.level, this.equipment);
      const result = simulate(buildDungeonSetup(floor, hero, this.rng.nextU32()), undefined, { autopilot: this.archetype.autopilot });
      this.today.battles += 1;
      if (!result.victory) {
        if (pushing) this.attemptsOnNext += 1;
        if (!free) this.energy += Math.floor((ENERGY.perRun * ENERGY.refundOnLossBp) / 10000);
        const consolation = dungeonRewards(this.rng, { classId: this.classId, floor, firstClear: false, boons: [], sets: {}, pity: 0, cleared: result.wavesCleared });
        this.earnGold("dungeon", consolation.gold);
        this.gainExp(consolation.exp);
        return true;
      }
      this.today.battlesWon += 1;
      boons = result.boons;
      if (result.stars === 3) this.threeStar.add(floor);
    }

    const chapter = Math.ceil(floor / 10);
    const firstClear = floor > this.highestFloor;
    const sets = buildHero(this.classId, this.level, this.equipment).sets;
    const r = dungeonRewards(this.rng, { classId: this.classId, floor, firstClear, boons: boons as never, sets, pity: this.pity[chapter] ?? 0 });
    if (floor % 10 === 0) this.pity[chapter] = r.pity;
    if (firstClear) {
      this.highestFloor = floor;
      this.attemptsOnNext = 0;
    }
    this.earnGold("dungeon", r.gold);
    this.gainExp(r.exp);
    this.earnStones(r.stones);
    this.earnGems(r.gems);
    for (const item of r.items) this.receiveItem(item);
    return true;
  }

  /** Best floor to farm: the highest 3-star floor (sweepable), else the highest cleared floor. */
  private farmFloor(): number {
    let best = 0;
    for (const f of this.threeStar) best = Math.max(best, f);
    return best || this.highestFloor;
  }

  private dailyIncome(day: number): void {
    if (this.level >= UNLOCK_LEVEL.dailyQuests && this.lastQuestDay !== day) {
      this.lastQuestDay = day;
      this.earnGold("quests", DAILY_QUEST_REWARDS.gold);
      this.earnGems(DAILY_QUEST_REWARDS.gems + SIDE_INCOME.weeklyGems);
      this.earnStones(DAILY_QUEST_REWARDS.stones);
      this.energy = Math.min(ENERGY.overflowMax, this.energy + DAILY_QUEST_REWARDS.energy);
    }
    if (this.level >= UNLOCK_LEVEL.arena) this.earnGems(SIDE_INCOME.arenaGems);
    if (this.level >= UNLOCK_LEVEL.guild) {
      this.earnGold("guild", SIDE_INCOME.guildGold);
      this.earnStones(SIDE_INCOME.guildStones);
    }
    if (this.monthlyPass) this.earnGems(100);
  }

  private openChests(day: number): void {
    if (this.level < UNLOCK_LEVEL.chest || this.highestFloor === 0) return;
    let rolls = 0;
    if (this.lastFreeChestDay !== day) {
      this.lastFreeChestDay = day;
      rolls += 1;
    }
    while (this.gems >= CHEST_10_PRICE) {
      this.gems -= CHEST_10_PRICE;
      this.today.gemsSpent += CHEST_10_PRICE;
      rolls += 10;
    }
    for (let i = 0; i < rolls; i++) {
      this.chestPity += 1;
      let rarity = this.rng.weighted(DROP_RARITY.chest);
      if (this.chestPity >= CHEST_PITY) rarity = "legendary";
      if (rarity === "legendary") this.chestPity = 0;
      this.receiveItem(generateItem(this.rng, { rarity, ilvl: this.highestFloor, classId: this.classId }));
    }
  }

  // ───────────────────────── gear ─────────────────────────

  private bag: Item[] = [];

  private receiveItem(item: Item): void {
    // This virtual player only plays one class; other classes' gear is salvaged (a real player keeps it).
    if (item.classId !== this.classId) {
      this.salvage(item);
      return;
    }
    if (item.rarity === "legendary") this.legendariesFound += 1;
    this.bag.push(item);
  }

  private itemScore(item: Item): number {
    return power(buildHero(this.classId, this.level, { [item.slot]: item }).stats);
  }

  private manageGear(): void {
    for (const item of this.bag) {
      const current = this.equipment[item.slot];
      const wearable = item.ilvl <= this.level + ILVL_OVER_LEVEL;
      if (wearable && (!current || this.itemScore({ ...item, enhance: transfer(current.enhance) }) > this.itemScore(current))) {
        if (current) {
          item.enhance = transfer(current.enhance);
          this.salvage({ ...current, enhance: 0 });
        }
        this.equipment[item.slot] = item;
      } else if (!wearable && item.rarity !== "common" && item.rarity !== "uncommon") {
        continue; // keep for later — simplified: kept items are re-evaluated next session
      } else {
        this.salvage(item);
      }
    }
    this.bag = this.bag.filter((it) => it.ilvl > this.level + ILVL_OVER_LEVEL && it.rarity !== "common" && it.rarity !== "uncommon" && this.equipment[it.slot] !== it);
    if (this.bag.length > 30) this.bag.splice(0, this.bag.length - 30).forEach((it) => this.salvage(it));

    const stones = Math.floor(this.dust / DUST_PER_STONE);
    this.dust -= stones * DUST_PER_STONE;
    this.earnStones(stones);
  }

  private salvage(item: Item): void {
    const y = salvageYield(item);
    this.dust += y.dust;
    this.crystals += y.crystals;
    this.cores += y.cores;
    this.earnStones(y.stones);
  }

  /** Enhance the least-enhanced equipped item while affordable (weapon first on ties). */
  private spendOnEnhance(): void {
    if (this.level < UNLOCK_LEVEL.enhance) return;
    for (let guard = 0; guard < 500; guard++) {
      const items = SLOTS.map((s) => this.equipment[s]).filter((it): it is Item => !!it && enhanceCost(it) !== null);
      if (items.length === 0) return;
      items.sort((a, b) => a.enhance - b.enhance);
      const item = items[0]!;
      const cost = enhanceCost(item)!;
      if (this.stones < cost.stones) this.buyStones(cost.stones - this.stones, cost.gold);
      if (this.gold < cost.gold || this.stones < cost.stones) return;
      this.gold -= cost.gold;
      this.stones -= cost.stones;
      this.today.goldSpent.enhance = (this.today.goldSpent.enhance ?? 0) + cost.gold;
      this.today.stonesSpent += cost.stones;
      rollEnhance(this.rng, item);
    }
  }

  /** Buy missing stones at the Forge, keeping enough gold for the enhancement itself. */
  private buyStones(missing: number, goldReserve: number): void {
    if (this.forgeDay !== this.currentDay) {
      this.forgeDay = this.currentDay;
      this.forgeBought = 0;
    }
    for (let i = 0; i < missing; i++) {
      const price = forgeStonePrice(this.forgeBought);
      if (price === null || this.gold - price < goldReserve) return;
      this.gold -= price;
      this.forgeBought += 1;
      this.stones += 1;
      this.today.goldSpent.forge = (this.today.goldSpent.forge ?? 0) + price;
    }
  }

  private avgEnhance(): number {
    const items = SLOTS.map((s) => this.equipment[s]).filter((it): it is Item => !!it);
    return items.length ? items.reduce((s, it) => s + it.enhance, 0) / items.length : 0;
  }

  // ───────────────────────── ledger helpers ─────────────────────────

  private earnGold(source: string, amount: number): void {
    this.gold += amount;
    this.today.goldEarned[source] = (this.today.goldEarned[source] ?? 0) + amount;
  }

  private earnStones(n: number): void {
    this.stones += n;
    this.today.stonesEarned += n;
  }

  private earnGems(n: number): void {
    this.gems += n;
    this.today.gemsEarned += n;
  }

  private gainExp(n: number): void {
    const before = this.level;
    const r = addExp(this.level, this.exp, n);
    this.level = r.level;
    this.exp = r.exp;
    const day = this.history.length;
    for (let l = before + 1; l <= this.level; l++) if (this.milestones[l] === undefined) this.milestones[l] = day;
  }
}

function transfer(enhance: number): number {
  return Math.floor((enhance * 8) / 10);
}

export { floorMultiplier };
