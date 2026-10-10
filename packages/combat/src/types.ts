import type { BoonId, BossMechanic, EnemyKind, HeroBuild, Stats } from "@underworld/shared";

export const TICKS_PER_SECOND = 20;
/** Action gauge fills by SPD every tick; a unit acts when it reaches this value (SPD 100 → once per second). */
export const ACTION_GAUGE = 2000;
/** The skill timing ring loops every 24 ticks once the skill is ready. */
export const RING_TICKS = 24;

export interface EnemySetup {
  key: string;
  kind: EnemyKind;
  stats: Stats;
  mechanic?: BossMechanic;
  /** Unit spawned by the mechanic (rats, spores, hollow knights). */
  summon?: EnemySetup;
}

export type BattleMode = "dungeon" | "pvp";

/** What a renderer may read about a unit. */
export interface UnitView {
  readonly uid: number;
  readonly side: 0 | 1;
  readonly key: string;
  readonly kind: EnemyKind | "hero";
  readonly maxHp: number;
  readonly hp: number;
  readonly alive: boolean;
  readonly shield: number;
  readonly stunUntil: number;
  readonly slowUntil: number;
  readonly poison: readonly unknown[];
}

export interface BattleSetup {
  mode: BattleMode;
  seed: number;
  hero: HeroBuild;
  /** Dungeon: 4 encounters. PvP: a single wave holding the opponent. */
  waves: EnemySetup[][];
  /** PvP opponent hero, fought as the only enemy. */
  opponent?: HeroBuild;
  boonsEnabled: boolean;
  timeLimitTicks: number;
  /** Dungeon only: win faster than this (with >50% HP) for 3 stars. */
  threeStarTicks: number;
}

/** Everything a client sends to prove a battle: which ticks it pressed the skill and which boons it picked. */
export interface BattleInputs {
  skillTicks: number[];
  boonPicks: number[];
}

export type SkillQuality = "normal" | "good" | "perfect";

/** How an unattended player presses the skill. Only "auto" exists in the real game; the others are for simulations. */
export type Autopilot = "auto" | "good" | "perfect";

export type BattleEvent =
  | { t: number; kind: "wave"; index: number }
  | { t: number; kind: "spawn"; uid: number; key: string }
  | { t: number; kind: "attack"; src: number; dst: number }
  | { t: number; kind: "damage"; src: number; dst: number; amount: number; crit: boolean; skill: boolean }
  | { t: number; kind: "dodge"; src: number; dst: number }
  | { t: number; kind: "heal"; dst: number; amount: number }
  | { t: number; kind: "skill"; src: number; quality: SkillQuality }
  | { t: number; kind: "death"; uid: number }
  | { t: number; kind: "shield"; uid: number; amount: number }
  | { t: number; kind: "mechanic"; uid: number; what: string }
  | { t: number; kind: "boonOffer"; offer: BoonId[] }
  | { t: number; kind: "boonPicked"; boon: BoonId }
  | { t: number; kind: "end"; victory: boolean };

export interface BattleResult {
  victory: boolean;
  ticks: number;
  /** Hero HP left as a share of max HP, in bp. */
  hpLeftBp: number;
  stars: 0 | 1 | 2 | 3;
  wavesCleared: number;
  boons: BoonId[];
  damageDealt: number;
  damageTaken: number;
  /** Normalized inputs: only presses that actually cast a skill, and the boon picks used. */
  inputs: BattleInputs;
}
