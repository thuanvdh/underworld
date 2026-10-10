import {
  ENEMY_BASE,
  TUTORIAL_SHIELD_FLOOR,
  chapterOf,
  emptyStats,
  floorMultiplier,
  isChapterBossFloor,
  type EnemyKind,
  type HeroBuild,
  type Stats,
} from "@underworld/shared";
import { TICKS_PER_SECOND, type BattleSetup, type EnemySetup } from "./types.ts";

export const DUNGEON_TIME_LIMIT_TICKS = 150 * TICKS_PER_SECOND;
export const DUNGEON_THREE_STAR_TICKS = 90 * TICKS_PER_SECOND;
export const PVP_TIME_LIMIT_TICKS = 60 * TICKS_PER_SECOND;

/** Enemy stats for a floor. DEF grows with the square root of the multiplier so it never walls the player. */
export function enemyStats(kind: EnemyKind, floor: number, scaleBp = 10000): Stats {
  const base = ENEMY_BASE[kind];
  const mult = floorMultiplier(floor);
  return {
    ...emptyStats(),
    hp: Math.max(1, Math.floor(((base.hp * mult) * scaleBp) / 10000)),
    atk: Math.max(1, Math.floor(((base.atk * mult) * scaleBp) / 10000)),
    def: Math.floor(base.def * Math.sqrt(mult)),
    spd: base.spd,
    critDmgBp: 15000,
  };
}

/**
 * Build a dungeon floor: two normal waves, one wave led by an elite, then the floor or chapter boss.
 * Enemy stats are computed here (on the server) and shipped inside the setup, so the combat code itself
 * never calls Math.pow and stays bit-for-bit deterministic across engines.
 */
export function buildDungeonSetup(floor: number, hero: HeroBuild, seed: number): BattleSetup {
  const chapter = chapterOf(floor);
  const [m1, m2, m3] = chapter.monsters;
  const normal = (key: string): EnemySetup => ({ key, kind: "normal", stats: enemyStats("normal", floor) });

  let boss: EnemySetup;
  if (isChapterBossFloor(floor)) {
    boss = { key: chapter.boss, kind: "chapterBoss", stats: enemyStats("chapterBoss", floor), mechanic: chapter.mechanic };
    boss.summon = summonFor(chapter.mechanic, floor);
  } else {
    boss = { key: `${chapter.key}_boss`, kind: "boss", stats: enemyStats("boss", floor) };
    if (floor === TUTORIAL_SHIELD_FLOOR) boss.mechanic = "bone_shield";
  }

  return {
    mode: "dungeon",
    seed,
    hero,
    waves: [
      [normal(m1), normal(m2), normal(m3)],
      [normal(m2), normal(m3), normal(m1)],
      [{ key: chapter.elite, kind: "elite", stats: enemyStats("elite", floor) }, normal(m1), normal(m3)],
      [boss],
    ],
    boonsEnabled: true,
    timeLimitTicks: DUNGEON_TIME_LIMIT_TICKS,
    threeStarTicks: DUNGEON_THREE_STAR_TICKS,
  };
}

function summonFor(mechanic: EnemySetup["mechanic"], floor: number): EnemySetup | undefined {
  switch (mechanic) {
    case "rat_king":
      return { key: "rat_pup", kind: "minion", stats: enemyStats("minion", floor) };
    case "spore_mother":
      return { key: "spore", kind: "minion", stats: enemyStats("minion", floor, 5000) };
    case "warden":
      return { key: "hollow_knight", kind: "elite", stats: enemyStats("elite", floor, 5000) };
    default:
      return undefined;
  }
}

/** Asynchronous PvP: the attacker fights an AI-controlled copy of the defender's saved build. */
export function buildPvpSetup(attacker: HeroBuild, defender: HeroBuild, seed: number): BattleSetup {
  return {
    mode: "pvp",
    seed,
    hero: attacker,
    waves: [[]],
    opponent: defender,
    boonsEnabled: false,
    timeLimitTicks: PVP_TIME_LIMIT_TICKS,
    threeStarTicks: 0,
  };
}
