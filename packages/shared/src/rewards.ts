import type { BoonId } from "./data/boons.ts";
import { chapterOf, floorMultiplier, isChapterBossFloor } from "./data/chapters.ts";
import {
  BLUEPRINT_CHANCE_BP,
  CHAPTER_BOSS_PITY,
  DROP_RARITY,
  ENCOUNTER_REWARDS,
  FIRST_CLEAR_CHAPTER_GEMS,
  FIRST_CLEAR_MULT,
} from "./data/economy.ts";
import { generateItem } from "./items.ts";
import type { Rng } from "./rng.ts";
import { RARITIES, type Item, type Rarity, type SetCode } from "./types.ts";

export interface DungeonRewardInput {
  floor: number;
  firstClear: boolean;
  boons: readonly BoonId[];
  sets: Partial<Record<SetCode, number>>;
  /** Chapter boss runs since the last Legendary from this chapter boss. */
  pity: number;
  /** Encounters cleared. Fewer than 4 means a lost run: half gold and EXP for cleared encounters, nothing else. */
  cleared?: number;
}

export interface DungeonRewards {
  gold: number;
  exp: number;
  stones: number;
  gems: number;
  items: Item[];
  blueprint: SetCode | null;
  /** New pity counter value for this chapter boss (unchanged on regular floors). */
  pity: number;
}

type EncounterKey = keyof typeof ENCOUNTER_REWARDS;

/** EXP grows slower than enemy strength so levels don't outrun content. */
const EXP_FLOOR_EXPONENT = 0.6;

/** Rewards for a dungeon run (detailed design §12.1). */
export function dungeonRewards(rng: Rng, input: DungeonRewardInput): DungeonRewards {
  const { floor } = input;
  const cleared = input.cleared ?? 4;
  if (cleared < 4) return lostRunRewards(floor, cleared, input.pity);
  const mult = floorMultiplier(floor);
  const chapterBoss = isChapterBossFloor(floor);
  const encounters: EncounterKey[] = ["normal", "normal", "elite", chapterBoss ? "chapterBoss" : "boss"];
  const greed = input.boons.includes("greed");
  const fortune = input.boons.includes("fortune");
  const goldBonusBp = (greed ? 5000 : 0) + ((input.sets.smuggler ?? 0) >= 2 ? 1000 : 0);

  const out: DungeonRewards = { gold: 0, exp: 0, stones: 0, gems: 0, items: [], blueprint: null, pity: input.pity };
  const firstMult = input.firstClear ? FIRST_CLEAR_MULT : 1;

  for (const [i, key] of encounters.entries()) {
    const r = ENCOUNTER_REWARDS[key];
    out.gold += Math.floor(r.gold * Math.pow(mult, 0.7) * firstMult);
    out.exp += Math.floor(r.exp * Math.pow(mult, EXP_FLOOR_EXPONENT) * firstMult);
    if (rng.chance(r.stoneChanceBp)) out.stones += rng.range(r.stones[0], r.stones[1]);

    const isLast = i === encounters.length - 1;
    let rolls = rng.chance(r.itemChanceBp) ? 1 : 0;
    if (key === "chapterBoss") rolls = 2;
    if (isLast && input.boons.includes("treasure_hunter")) rolls += 1;

    for (let n = 0; n < rolls; n++) {
      const table = key === "chapterBoss" ? DROP_RARITY.chapterBoss : key === "boss" ? DROP_RARITY.boss : DROP_RARITY.normal;
      let rarity = rng.weighted(table);
      // 40 runs without a Legendary → the 41st run's first drop is Legendary.
      if (key === "chapterBoss" && n === 0 && input.pity >= CHAPTER_BOSS_PITY) rarity = "legendary";
      if (fortune && rng.chance(2000)) rarity = upgradeRarity(rarity);
      // The first chapter boss drop always belongs to the chapter set.
      const setCode = key === "chapterBoss" && n === 0 ? chapterOf(floor).setCode : null;
      out.items.push(generateItem(rng, { rarity, ilvl: floor, setCode }));
    }
  }

  if (chapterBoss) {
    out.pity = out.items.some((it) => it.rarity === "legendary") ? 0 : input.pity + 1;
    if (rng.chance(BLUEPRINT_CHANCE_BP)) out.blueprint = chapterOf(floor).setCode;
    if (input.firstClear) out.gems += FIRST_CLEAR_CHAPTER_GEMS;
  }
  out.gold = Math.floor((out.gold * (10000 + goldBonusBp)) / 10000);
  return out;
}

/** A lost run still pays half the gold and EXP of the encounters cleared, so no run is wasted. */
function lostRunRewards(floor: number, cleared: number, pity: number): DungeonRewards {
  const mult = floorMultiplier(floor);
  const order: EncounterKey[] = ["normal", "normal", "elite"];
  let gold = 0;
  let exp = 0;
  for (const key of order.slice(0, cleared)) {
    gold += Math.floor((ENCOUNTER_REWARDS[key].gold * Math.pow(mult, 0.7)) / 2);
    exp += Math.floor((ENCOUNTER_REWARDS[key].exp * Math.pow(mult, EXP_FLOOR_EXPONENT)) / 2);
  }
  return { gold, exp, stones: 0, gems: 0, items: [], blueprint: null, pity };
}

function upgradeRarity(r: Rarity): Rarity {
  return RARITIES[Math.min(RARITIES.length - 1, RARITIES.indexOf(r) + 1)] ?? r;
}
