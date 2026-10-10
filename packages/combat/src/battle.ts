import {
  BOONS,
  BOON_OFFER_SIZE,
  BOON_RARITY_WEIGHTS,
  PASSIVE_LEVELS,
  Rng,
  SKILLS,
  skillTier,
  type BoonId,
  type BossMechanic,
  type EnemyKind,
  type HeroBuild,
  type Stats,
} from "@underworld/shared";
import {
  ACTION_GAUGE,
  RING_TICKS,
  TICKS_PER_SECOND,
  type Autopilot,
  type BattleEvent,
  type BattleInputs,
  type BattleResult,
  type BattleSetup,
  type EnemySetup,
  type SkillQuality,
  type UnitView,
} from "./types.ts";

const QUALITY_BP: Record<SkillQuality, number> = { normal: 10000, good: 11000, perfect: 13000 };
const BOSS_ENRAGE_TICKS = 60 * TICKS_PER_SECOND;
const STUN_IMMUNITY_TICKS = 5 * TICKS_PER_SECOND;
/** Spore explosion damage as a share of the Spore Mother's ATK (ignores DEF). */
const SPORE_EXPLOSION_BP = 3500;

interface PoisonStack {
  perSec: number;
  nextTick: number;
  endTick: number;
  /** Applied by a Hexer with Curse (−10% ATK on the target). */
  curse: boolean;
  /** Applied by a Sporeborne 6 wearer (+50% poison damage). */
  boosted: boolean;
}

interface HeroState {
  build: HeroBuild;
  controlled: boolean;
  energy: number;
  readyTick: number;
  boons: BoonId[];
  skillsCast: number;
  wrathStacks: number;
  undyingUsed: boolean;
  reviveUsed: boolean;
  emergencyShieldUsed: boolean;
}

interface MechanicState {
  type: BossMechanic;
  summon: EnemySetup | undefined;
  nextTick: number;
  thresholdsHit: number;
  chargeEndTick: number;
  stolen: BoonId[];
  enraged: boolean;
}

interface Unit {
  uid: number;
  side: 0 | 1;
  key: string;
  kind: EnemyKind | "hero";
  base: Stats;
  maxHp: number;
  hp: number;
  gauge: number;
  alive: boolean;
  shield: number;
  poison: PoisonStack[];
  slowUntil: number;
  stunUntil: number;
  stunImmuneUntil: number;
  spdBuffUntil: number;
  spawnTick: number;
  fuseTick: number;
  hero: HeroState | null;
  mech: MechanicState | null;
}

interface HitOptions {
  skill?: boolean;
  basic?: boolean;
  quality?: SkillQuality;
  forceCrit?: boolean;
  /** Ignores DEF, crit and variance (poison, auras, reflects). */
  pure?: boolean;
}

export interface BattleOptions {
  autopilot?: Autopilot;
  recordEvents?: boolean;
}

/**
 * One battle as a tick-driven state machine. The client drives it live with tick(press) and
 * chooseBoon(i); the server replays the same inputs with simulate() and must reach the same result.
 */
export class Battle {
  readonly setup: BattleSetup;
  tick = 0;
  phase: "fighting" | "boonChoice" | "ended" = "fighting";
  boonOffer: BoonId[] = [];
  events: BattleEvent[] = [];
  result: BattleResult | null = null;

  private readonly rng: Rng;
  private readonly units: Unit[] = [];
  private readonly heroUnit: Unit;
  private readonly autopilot: Autopilot | null;
  private readonly recordEvents: boolean;
  private nextUid = 1;
  private waveIndex = 0;
  private waveStartTick = 0;
  private damageDealt = 0;
  private damageTaken = 0;
  private readonly inputs: BattleInputs = { skillTicks: [], boonPicks: [] };

  constructor(setup: BattleSetup, options: BattleOptions = {}) {
    this.setup = setup;
    this.rng = new Rng(setup.seed);
    this.autopilot = options.autopilot ?? null;
    this.recordEvents = options.recordEvents ?? false;
    this.heroUnit = this.addHero(setup.hero, 0, true);
    this.startWave();
  }

  get ended(): boolean {
    return this.phase === "ended";
  }

  /** Units for rendering. */
  get snapshot(): readonly UnitView[] {
    return this.units;
  }

  /** Boons the controlled hero currently holds. */
  get heroBoons(): readonly BoonId[] {
    return this.heroUnit.hero!.boons;
  }

  /** Is the controlled hero's skill ready, and what would a press give right now? */
  skillState(): { ready: boolean; ringPhase: number; energy: number } {
    const h = this.heroUnit.hero!;
    const ready = h.readyTick >= 0;
    return { ready, ringPhase: ready ? (this.tick + 1 - h.readyTick) % RING_TICKS : 0, energy: h.energy };
  }

  /** Advance one tick. `pressSkill` is the player's tap on this tick. */
  step(pressSkill = false): void {
    if (this.phase !== "fighting") throw new Error(`cannot step in phase ${this.phase}`);
    this.tick += 1;
    const t = this.tick;

    this.tickPoison();
    this.tickMechanics();
    if (this.phase !== "fighting") return;

    for (const u of this.livingUnits()) {
      if (u.hero && u.hero.readyTick >= 0 && this.wantsSkill(u, pressSkill)) {
        if (u === this.heroUnit) this.inputs.skillTicks.push(t);
        this.castSkill(u);
        if (this.phase !== "fighting") return;
      }
    }

    for (const u of this.livingUnits()) {
      if (!u.alive || u.stunUntil >= t) continue;
      if (u.mech?.type === "furnace_golem" && u.mech.chargeEndTick > 0) continue;
      u.gauge += this.effSpd(u);
      if (u.gauge >= ACTION_GAUGE) {
        u.gauge -= ACTION_GAUGE;
        this.basicAttack(u);
        if (this.phase !== "fighting") return;
      }
    }

    if (this.phase === "fighting" && t >= this.setup.timeLimitTicks) this.finish(false);
  }

  /** Pick one of the offered boons (index into boonOffer). */
  chooseBoon(index: number): void {
    if (this.phase !== "boonChoice") throw new Error("no boon offer pending");
    const i = index >= 0 && index < this.boonOffer.length ? index : 0;
    const boon = this.boonOffer[i]!;
    this.inputs.boonPicks.push(i);
    const hero = this.heroUnit;
    hero.hero!.boons.push(boon);
    if (boon === "vigor") {
      const bonus = Math.floor((hero.maxHp * 1500) / 10000);
      hero.maxHp += bonus;
      this.heal(hero, bonus);
    }
    this.emit({ t: this.tick, kind: "boonPicked", boon });
    this.boonOffer = [];
    this.phase = "fighting";
    this.waveIndex += 1;
    this.startWave();
  }

  /** The pick an unattended player makes: highest rarity, then first offered. */
  autoBoonPick(): number {
    const rank = { epic: 2, rare: 1, common: 0 } as const;
    let best = 0;
    this.boonOffer.forEach((b, i) => {
      if (rank[BOONS[b]] > rank[BOONS[this.boonOffer[best]!]]) best = i;
    });
    return best;
  }

  // ───────────────────────── setup ─────────────────────────

  private addHero(build: HeroBuild, side: 0 | 1, controlled: boolean): Unit {
    const u = this.addUnit(side, build.classId, "hero", build.stats);
    u.hero = {
      build,
      controlled,
      energy: 0,
      readyTick: -1,
      boons: [],
      skillsCast: 0,
      wrathStacks: 0,
      undyingUsed: false,
      reviveUsed: false,
      emergencyShieldUsed: false,
    };
    if (build.legendaryEffects.includes("abyss_heart")) this.addEnergy(u, 50, true);
    return u;
  }

  private addUnit(side: 0 | 1, key: string, kind: EnemyKind | "hero", stats: Stats): Unit {
    const u: Unit = {
      uid: this.nextUid++,
      side,
      key,
      kind,
      base: { ...stats },
      maxHp: stats.hp,
      hp: stats.hp,
      gauge: 0,
      alive: true,
      shield: 0,
      poison: [],
      slowUntil: 0,
      stunUntil: 0,
      stunImmuneUntil: 0,
      spdBuffUntil: 0,
      spawnTick: this.tick,
      fuseTick: 0,
      hero: null,
      mech: null,
    };
    this.units.push(u);
    this.emit({ t: this.tick, kind: "spawn", uid: u.uid, key });
    return u;
  }

  private addEnemy(e: EnemySetup): Unit {
    const u = this.addUnit(1, e.key, e.kind, e.stats);
    if (e.mechanic) {
      u.mech = {
        type: e.mechanic,
        summon: e.summon,
        nextTick: this.tick + mechanicInterval(e.mechanic),
        thresholdsHit: 0,
        chargeEndTick: 0,
        stolen: [],
        enraged: false,
      };
    }
    return u;
  }

  private startWave(): void {
    this.waveStartTick = this.tick;
    this.emit({ t: this.tick, kind: "wave", index: this.waveIndex });
    if (this.setup.mode === "pvp") {
      if (!this.setup.opponent) throw new Error("pvp battle without opponent");
      this.addHero(this.setup.opponent, 1, false);
      return;
    }
    const wave = this.setup.waves[this.waveIndex];
    if (!wave) throw new Error(`missing wave ${this.waveIndex}`);
    for (const e of wave) this.addEnemy(e);
  }

  // ───────────────────────── effective stats ─────────────────────────

  private boons(u: Unit): readonly BoonId[] {
    return u.hero?.boons ?? [];
  }

  private effAtk(u: Unit): number {
    let bonus = 0;
    const lowHp = u.hp * 2 < u.maxHp;
    const b = this.boons(u);
    if (b.includes("sharpened")) bonus += 1200;
    if (b.includes("blood_frenzy") && lowHp) bonus += 3000;
    if (u.hero) {
      bonus += u.hero.wrathStacks * 500;
      if (u.hero.build.classId === "butcher" && u.hero.build.level >= PASSIVE_LEVELS.second && lowHp) bonus += 2500;
    }
    if (u.poison.some((p) => p.curse)) bonus -= 1000;
    if (u.mech?.enraged) bonus += 2000;
    if ((u.kind === "boss" || u.kind === "chapterBoss") && this.tick - this.waveStartTick >= BOSS_ENRAGE_TICKS) bonus += 5000;
    return Math.max(1, Math.floor((u.base.atk * (10000 + bonus)) / 10000));
  }

  private effDef(u: Unit): number {
    const b = this.boons(u);
    const bonus = (b.includes("tough_skin") ? 1200 : 0) - (b.includes("greed") ? 1000 : 0);
    return Math.max(0, Math.floor((u.base.def * (10000 + bonus)) / 10000));
  }

  private effSpd(u: Unit): number {
    let spd = u.base.spd;
    if (this.boons(u).includes("swift")) spd += 10;
    if (u.spdBuffUntil >= this.tick) spd += 10;
    if (u.mech?.enraged) spd += 10;
    if (u.slowUntil >= this.tick) spd = Math.floor((spd * 7) / 10);
    return Math.max(1, spd);
  }

  private effCrit(u: Unit): number {
    return u.base.critBp + (this.boons(u).includes("killer_eye") ? 1000 : 0);
  }

  private effLifesteal(u: Unit): number {
    return u.base.lifestealBp + (this.boons(u).includes("leech") ? 800 : 0);
  }

  private hasSet(u: Unit, set: keyof HeroBuild["sets"], pieces: number): boolean {
    return (u.hero?.build.sets[set] ?? 0) >= pieces;
  }

  private hasLegendary(u: Unit, effect: HeroBuild["legendaryEffects"][number]): boolean {
    return u.hero?.build.legendaryEffects.includes(effect) ?? false;
  }

  // ───────────────────────── actions ─────────────────────────

  private wantsSkill(u: Unit, pressSkill: boolean): boolean {
    const h = u.hero!;
    if (!h.controlled) return true; // PvP AI casts as soon as it can
    if (pressSkill) return true;
    if (!this.autopilot) return false;
    const phase = (this.tick - h.readyTick) % RING_TICKS;
    if (this.autopilot === "auto") return true;
    if (this.autopilot === "good") return phase === 16;
    return phase === 21;
  }

  private qualityNow(h: HeroState): SkillQuality {
    const phase = (this.tick - h.readyTick) % RING_TICKS;
    if (phase >= 20 && phase <= 22) return "perfect";
    if (phase >= 16 && phase <= 23) return "good";
    return "normal";
  }

  private basicAttack(u: Unit): void {
    const target = this.frontTarget(u);
    if (!target) return;
    this.emit({ t: this.tick, kind: "attack", src: u.uid, dst: target.uid });
    this.hit(u, target, 10000, { basic: true });
    if (!u.alive || this.phase !== "fighting") return;

    if (this.hasLegendary(u, "bloodthirst") && target.alive && this.rng.chance(1000)) this.hit(u, target, 10000, { basic: true });
    const h = u.hero;
    if (h && h.build.classId === "gunslinger" && h.build.level >= PASSIVE_LEVELS.third && this.rng.chance(2000)) {
      const next = this.frontTarget(u);
      if (next) this.hit(u, next, 10000, { basic: true });
    }
    if (this.hasSet(u, "sporeborne", 4) && target.alive) {
      this.applyPoison(u, target, Math.floor(this.effAtk(u) / 10), 3 * TICKS_PER_SECOND);
    }
  }

  private castSkill(u: Unit): void {
    const h = u.hero!;
    const quality = h.controlled ? this.qualityNow(h) : "normal";
    h.energy = 0;
    h.readyTick = -1;
    h.skillsCast += 1;
    this.emit({ t: this.tick, kind: "skill", src: u.uid, quality });

    let powerBp = 10000;
    if (h.skillsCast === 1 && this.hasSet(u, "drifter", 6)) powerBp += 5000;
    if (this.hasSet(u, "underlord", 6)) powerBp += 4000;

    this.skillEffect(u, quality, powerBp);
    if (this.boons(u).includes("echo") && u.alive && this.phase === "fighting") {
      this.skillEffect(u, quality, Math.floor(powerBp / 2));
    }
    if (this.hasSet(u, "underlord", 6) && u.alive) this.heal(u, Math.floor(u.maxHp / 10));
  }

  private skillEffect(u: Unit, quality: SkillQuality, powerBp: number): void {
    const h = u.hero!;
    const tier = skillTier(h.build.level);
    const enemies = () => this.livingUnits().filter((e) => e.side !== u.side);

    switch (h.build.classId) {
      case "butcher": {
        const cfg = SKILLS.butcher;
        const mult = Math.floor((cfg.hitMultBp[tier] * powerBp) / 10000);
        let dealt = 0;
        for (let i = 0; i < cfg.hits; i++) {
          for (const e of enemies()) dealt += this.hit(u, e, mult, { skill: true, quality });
          if (this.phase !== "fighting") break;
        }
        if (u.alive) this.heal(u, Math.floor((dealt * cfg.healShareBp[tier]) / 10000));
        break;
      }
      case "gunslinger": {
        const targets = enemies();
        const target = targets.reduce<Unit | null>((best, e) => (!best || e.hp > best.hp ? e : best), null);
        if (target) {
          const mult = Math.floor((SKILLS.gunslinger.multBp[tier] * powerBp) / 10000);
          this.hit(u, target, mult, { skill: true, quality, forceCrit: true });
        }
        break;
      }
      case "hexer": {
        const cfg = SKILLS.hexer;
        const mult = Math.floor((cfg.multBp * powerBp) / 10000);
        const perSec = Math.floor((this.effAtk(u) * cfg.poisonPerSecBp[tier]) / 10000);
        for (const e of enemies()) {
          this.hit(u, e, mult, { skill: true, quality });
          if (this.phase !== "fighting") return;
          if (!e.alive) continue;
          this.applyPoison(u, e, perSec, cfg.poisonTicks);
          e.slowUntil = Math.max(e.slowUntil, this.tick + cfg.slowTicks);
          if (h.build.level >= PASSIVE_LEVELS.third) this.stun(e, 30);
        }
        break;
      }
    }
  }

  /** Deal one hit. Returns damage dealt to HP. */
  private hit(src: Unit, dst: Unit, multBp: number, opt: HitOptions): number {
    if (!dst.alive) return 0;

    if (opt.basic && this.hasLegendary(dst, "shadowstep") && this.rng.chance(1000)) {
      this.emit({ t: this.tick, kind: "dodge", src: src.uid, dst: dst.uid });
      return 0;
    }

    if (opt.skill && dst.mech) {
      if (dst.mech.type === "bone_shield" && opt.quality === "perfect" && dst.shield > 0) {
        dst.shield = 0;
        this.emit({ t: this.tick, kind: "mechanic", uid: dst.uid, what: "shield_broken" });
      }
      if (dst.mech.type === "furnace_golem" && dst.mech.chargeEndTick > 0) {
        dst.mech.chargeEndTick = 0;
        dst.mech.nextTick = this.tick + mechanicInterval("furnace_golem");
        this.emit({ t: this.tick, kind: "mechanic", uid: dst.uid, what: "charge_interrupted" });
      }
    }

    let dmg: number;
    let crit = false;
    if (opt.pure) {
      dmg = Math.max(1, Math.floor(multBp));
    } else {
      const raw = Math.floor((this.effAtk(src) * multBp) / 10000);
      const def = Math.floor((this.effDef(dst) * (10000 - src.base.penBp)) / 10000);
      dmg = Math.floor((raw * 100) / (100 + def));
      dmg = Math.floor((dmg * (10000 - dst.base.dmgReduceBp)) / 10000);
      crit = opt.forceCrit === true || this.rng.chance(this.effCrit(src));
      if (crit) dmg = Math.floor((dmg * src.base.critDmgBp) / 10000);
      if (opt.skill) dmg = Math.floor((dmg * QUALITY_BP[opt.quality ?? "normal"]) / 10000);
      dmg = Math.floor((dmg * this.rng.range(9500, 10500)) / 10000);
      dmg = Math.max(1, dmg);
    }

    let toHp = dmg;
    if (dst.shield > 0) {
      const absorbed = Math.min(dst.shield, toHp);
      dst.shield -= absorbed;
      toHp -= absorbed;
    }
    toHp = Math.min(toHp, dst.hp);
    dst.hp -= toHp;
    this.emit({ t: this.tick, kind: "damage", src: src.uid, dst: dst.uid, amount: dmg, crit, skill: opt.skill === true });
    if (src.side === 0) this.damageDealt += toHp;
    else this.damageTaken += toHp;

    if (!opt.pure) {
      const ls = this.effLifesteal(src);
      if (ls > 0 && src.alive) this.heal(src, Math.floor((toHp * ls) / 10000));
      if (src.hero && opt.basic) this.addEnergy(src, 12);
      if (dst.hero) this.addEnergy(dst, 6);
      if (crit && this.hasSet(src, "smuggler", 6)) this.addEnergy(src, 5);
      this.reflect(src, dst, dmg, opt.basic === true);
    }

    this.afterDamage(dst);
    if (!dst.alive) this.onKill(src, dst);
    return toHp;
  }

  private reflect(src: Unit, dst: Unit, dmg: number, basic: boolean): void {
    if (!src.alive) return;
    let bp = 0;
    const h = dst.hero;
    if (h && basic && h.build.classId === "butcher" && h.build.level >= PASSIVE_LEVELS.third) bp += 1500;
    if (this.hasLegendary(dst, "thorns")) bp += 800;
    if (this.hasSet(dst, "forgeborn", 4)) bp += 1000;
    const amount = Math.floor((dmg * bp) / 10000);
    if (amount > 0) this.hit(dst, src, amount, { pure: true });
  }

  /** Death prevention, emergency shield and HP-threshold mechanics. */
  private afterDamage(u: Unit): void {
    if (u.hp <= 0) {
      const h = u.hero;
      if (h && h.boons.includes("undying") && !h.undyingUsed) {
        h.undyingUsed = true;
        u.hp = 1;
      } else if (h && this.hasSet(u, "gravedigger", 6) && !h.reviveUsed) {
        h.reviveUsed = true;
        u.hp = Math.floor((u.maxHp * 3) / 10);
        this.emit({ t: this.tick, kind: "heal", dst: u.uid, amount: u.hp });
      } else {
        this.kill(u);
        return;
      }
    }
    const h = u.hero;
    if (h && this.hasSet(u, "forgeborn", 6) && !h.emergencyShieldUsed && u.hp * 10 < u.maxHp * 3) {
      h.emergencyShieldUsed = true;
      u.shield = Math.max(u.shield, Math.floor(u.maxHp / 4));
      this.emit({ t: this.tick, kind: "shield", uid: u.uid, amount: u.shield });
    }
    if (u.mech) this.hpThresholdMechanics(u);
  }

  private kill(u: Unit): void {
    u.alive = false;
    u.hp = 0;
    this.emit({ t: this.tick, kind: "death", uid: u.uid });
    if (u.mech?.type === "debt_collector" && u.mech.stolen.length > 0) {
      this.heroUnit.hero!.boons.push(...u.mech.stolen);
      u.mech.stolen = [];
    }
    if (u === this.heroUnit) {
      this.finish(false);
      return;
    }
    if (u.side === 1 && this.setup.mode === "pvp" && u.hero) {
      this.finish(true);
      return;
    }
    if (this.livingUnits().every((x) => x.side === 0)) this.waveCleared();
  }

  private onKill(src: Unit, dead: Unit): void {
    if (!src.hero || src.side === dead.side || dead.key === "spore_exploded") return;
    this.addEnergy(src, 10);
    if (src.hero.boons.includes("wrath")) src.hero.wrathStacks = Math.min(10, src.hero.wrathStacks + 1);
    if (this.hasSet(src, "drifter", 4)) src.spdBuffUntil = this.tick + 5 * TICKS_PER_SECOND;
    const b = src.hero.build;
    if (b.classId === "hexer" && b.level >= PASSIVE_LEVELS.second && dead.poison.length > 0) {
      const next = this.livingUnits().find((x) => x.side === dead.side);
      if (next) {
        for (const p of dead.poison) if (next.poison.length < 5) next.poison.push({ ...p });
      }
    }
  }

  private waveCleared(): void {
    if (this.phase !== "fighting") return;
    const hero = this.heroUnit;
    const last = this.waveIndex >= this.setup.waves.length - 1;
    if (last) {
      this.finish(true);
      return;
    }
    if (this.hasSet(hero, "gravedigger", 4)) this.heal(hero, Math.floor(hero.maxHp / 20));
    // Dead enemies are dropped so the unit list stays short across waves.
    for (let i = this.units.length - 1; i >= 0; i--) if (!this.units[i]!.alive) this.units.splice(i, 1);

    if (this.setup.boonsEnabled) {
      this.boonOffer = this.rollBoonOffer();
      this.phase = "boonChoice";
      this.emit({ t: this.tick, kind: "boonOffer", offer: [...this.boonOffer] });
    } else {
      this.waveIndex += 1;
      this.startWave();
    }
  }

  private rollBoonOffer(): BoonId[] {
    const owned = new Set(this.heroUnit.hero!.boons);
    const offer: BoonId[] = [];
    const all = Object.keys(BOONS) as BoonId[];
    for (let guard = 0; offer.length < BOON_OFFER_SIZE && guard < 50; guard++) {
      const rarity = this.rng.weighted(BOON_RARITY_WEIGHTS);
      const pool = all.filter((b) => BOONS[b] === rarity && !owned.has(b) && !offer.includes(b));
      if (pool.length > 0) offer.push(this.rng.pick(pool));
    }
    return offer;
  }

  // ───────────────────────── effects ─────────────────────────

  private addEnergy(u: Unit, amount: number, ignoreBonus = false): void {
    const h = u.hero;
    if (!h) return;
    let bonusBp = 10000;
    if (!ignoreBonus) {
      if (h.boons.includes("quick_hands")) bonusBp += 2500;
      if (h.build.legendaryEffects.includes("quick_grip")) bonusBp += 2500;
    }
    h.energy = Math.min(100, h.energy + Math.floor((amount * bonusBp) / 10000));
    if (h.energy >= 100 && h.readyTick < 0) h.readyTick = this.tick;
  }

  private heal(u: Unit, amount: number): void {
    if (amount <= 0 || !u.alive) return;
    const healed = Math.min(amount, u.maxHp - u.hp);
    if (healed <= 0) return;
    u.hp += healed;
    this.emit({ t: this.tick, kind: "heal", dst: u.uid, amount: healed });
  }

  private applyPoison(src: Unit, dst: Unit, perSec: number, ticks: number): void {
    if (perSec <= 0) return;
    const b = src.hero?.build;
    const stack: PoisonStack = {
      perSec,
      nextTick: this.tick + TICKS_PER_SECOND,
      endTick: this.tick + ticks,
      curse: b?.classId === "hexer" && b.level >= PASSIVE_LEVELS.first,
      boosted: this.hasSet(src, "sporeborne", 6),
    };
    if (dst.poison.length >= 5) dst.poison.shift();
    dst.poison.push(stack);
  }

  private stun(u: Unit, ticks: number): void {
    const isBoss = u.kind === "boss" || u.kind === "chapterBoss";
    if (isBoss) {
      if (u.stunImmuneUntil >= this.tick) return;
      u.stunUntil = this.tick + Math.min(ticks, 10);
      u.stunImmuneUntil = this.tick + STUN_IMMUNITY_TICKS;
    } else {
      u.stunUntil = Math.max(u.stunUntil, this.tick + ticks);
    }
  }

  private tickPoison(): void {
    for (const u of this.livingUnits()) {
      for (const p of u.poison) {
        if (p.nextTick > this.tick || p.nextTick > p.endTick) continue;
        p.nextTick += TICKS_PER_SECOND;
        const amount = p.boosted ? Math.floor((p.perSec * 3) / 2) : p.perSec;
        const source = this.units.find((x) => x.side !== u.side && x.hero) ?? this.heroUnit;
        this.hit(source, u, amount, { pure: true });
        if (this.phase !== "fighting" || !u.alive) break;
      }
      u.poison = u.poison.filter((p) => p.nextTick <= p.endTick);
    }
  }

  // ───────────────────────── boss mechanics ─────────────────────────

  private tickMechanics(): void {
    const t = this.tick;
    for (const u of this.livingUnits()) {
      if (u.fuseTick > 0 && t >= u.fuseTick) {
        // Spore explodes: damages the hero and disappears without counting as a kill.
        const boss = this.units.find((x) => x.mech?.type === "spore_mother" && x.alive);
        const atk = boss ? this.effAtk(boss) : u.base.atk;
        u.key = "spore_exploded";
        this.emit({ t, kind: "mechanic", uid: u.uid, what: "spore_explode" });
        this.hit(u, this.heroUnit, Math.floor((atk * SPORE_EXPLOSION_BP) / 10000), { pure: true });
        if (this.phase !== "fighting") return;
        if (u.alive) this.kill(u);
        if (this.phase !== "fighting") return;
        continue;
      }
      const m = u.mech;
      if (!m) continue;
      switch (m.type) {
        case "bone_shield":
          if (t >= m.nextTick) {
            m.nextTick = t + mechanicInterval(m.type);
            u.shield = Math.floor((u.maxHp * 3) / 10);
            this.emit({ t, kind: "shield", uid: u.uid, amount: u.shield });
          }
          break;
        case "debt_collector":
          if (t >= m.nextTick) {
            m.nextTick = t + mechanicInterval(m.type);
            const stolen = this.heroUnit.hero!.boons.pop();
            if (stolen) {
              m.stolen.push(stolen);
              this.emit({ t, kind: "mechanic", uid: u.uid, what: `steal_${stolen}` });
            }
          }
          break;
        case "furnace_golem":
          if (m.chargeEndTick === 0 && t >= m.nextTick) {
            m.chargeEndTick = t + 3 * TICKS_PER_SECOND;
            this.emit({ t, kind: "mechanic", uid: u.uid, what: "charge_start" });
          } else if (m.chargeEndTick > 0 && t >= m.chargeEndTick) {
            m.chargeEndTick = 0;
            m.nextTick = t + mechanicInterval(m.type);
            this.emit({ t, kind: "mechanic", uid: u.uid, what: "slam" });
            this.hit(u, this.heroUnit, 30000, {});
            if (this.phase !== "fighting") return;
          }
          break;
        case "spore_mother":
          if ((t - u.spawnTick) % TICKS_PER_SECOND === 0) {
            this.hit(u, this.heroUnit, Math.max(1, Math.floor(this.heroUnit.maxHp / 100)), { pure: true });
            if (this.phase !== "fighting") return;
          }
          if (t >= m.nextTick && m.summon) {
            m.nextTick = t + mechanicInterval(m.type);
            for (let i = 0; i < 2; i++) this.addEnemy(m.summon).fuseTick = t + 6 * TICKS_PER_SECOND;
          }
          break;
        default:
          break;
      }
    }
  }

  private hpThresholdMechanics(u: Unit): void {
    const m = u.mech!;
    if (!u.alive) return;
    const hpBp = Math.floor((u.hp * 10000) / u.maxHp);
    if (m.type === "rat_king" && m.summon) {
      const thresholds = [7500, 5000, 2500];
      while (m.thresholdsHit < thresholds.length && hpBp <= thresholds[m.thresholdsHit]!) {
        m.thresholdsHit += 1;
        this.emit({ t: this.tick, kind: "mechanic", uid: u.uid, what: "summon_rats" });
        for (let i = 0; i < 3; i++) this.addEnemy(m.summon);
      }
    }
    if (m.type === "warden") {
      if (m.thresholdsHit === 0 && hpBp <= 6600) {
        m.thresholdsHit = 1;
        this.emit({ t: this.tick, kind: "mechanic", uid: u.uid, what: "summon_knights" });
        if (m.summon) for (let i = 0; i < 2; i++) this.addEnemy(m.summon);
      }
      if (m.thresholdsHit === 1 && hpBp <= 3300) {
        m.thresholdsHit = 2;
        m.enraged = true;
        this.emit({ t: this.tick, kind: "mechanic", uid: u.uid, what: "enrage" });
      }
    }
  }

  // ───────────────────────── helpers ─────────────────────────

  private livingUnits(): Unit[] {
    return this.units.filter((u) => u.alive);
  }

  private frontTarget(u: Unit): Unit | undefined {
    return this.units.find((x) => x.alive && x.side !== u.side);
  }

  private finish(victory: boolean): void {
    if (this.phase === "ended") return;
    this.phase = "ended";
    const hero = this.heroUnit;
    const hpLeftBp = hero.alive ? Math.floor((hero.hp * 10000) / hero.maxHp) : 0;
    let stars: 0 | 1 | 2 | 3 = 0;
    if (victory) {
      if (this.setup.mode === "pvp") stars = hpLeftBp > 7000 ? 3 : hpLeftBp >= 3000 ? 2 : 1;
      else stars = hpLeftBp > 5000 ? (this.tick < this.setup.threeStarTicks ? 3 : 2) : 1;
    }
    this.result = {
      victory,
      ticks: this.tick,
      hpLeftBp,
      stars,
      wavesCleared: victory ? this.setup.waves.length : this.waveIndex,
      boons: [...(hero.hero?.boons ?? [])],
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      inputs: { skillTicks: [...this.inputs.skillTicks], boonPicks: [...this.inputs.boonPicks] },
    };
    this.emit({ t: this.tick, kind: "end", victory });
  }

  private emit(e: BattleEvent): void {
    if (this.recordEvents) this.events.push(e);
  }
}

function mechanicInterval(m: BossMechanic): number {
  switch (m) {
    case "bone_shield":
    case "furnace_golem":
      return 15 * TICKS_PER_SECOND;
    case "debt_collector":
      return 20 * TICKS_PER_SECOND;
    case "spore_mother":
      return 12 * TICKS_PER_SECOND;
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Run a whole battle from its inputs. The server calls this with the client's inputs and trusts only
 * its own result. Without inputs, `autopilot` decides when the player's skill is pressed.
 */
export function simulate(setup: BattleSetup, inputs?: Partial<BattleInputs>, options: BattleOptions = {}): BattleResult {
  const battle = new Battle(setup, { ...options, autopilot: inputs?.skillTicks ? undefined : (options.autopilot ?? "auto") });
  const presses = new Set(inputs?.skillTicks ?? []);
  const picks = inputs?.boonPicks ?? [];
  let pickIndex = 0;
  while (!battle.ended) {
    if (battle.phase === "boonChoice") {
      const pick = picks[pickIndex++];
      battle.chooseBoon(pick ?? battle.autoBoonPick());
    } else {
      battle.step(presses.has(battle.tick + 1));
    }
  }
  return battle.result!;
}
