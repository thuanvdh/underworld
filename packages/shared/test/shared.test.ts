import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAPTER_BOSS_PITY,
  Rng,
  addExp,
  buildHero,
  dungeonRewards,
  enhanceCost,
  expToNext,
  generateItem,
  power,
  rollEnhance,
} from "@underworld/shared";

describe("rng", () => {
  it("is reproducible from a seed", () => {
    const a = new Rng(99);
    const b = new Rng(99);
    for (let i = 0; i < 1000; i++) assert.equal(a.nextU32(), b.nextU32());
  });

  it("int stays in range", () => {
    const r = new Rng(1);
    for (let i = 0; i < 10000; i++) {
      const v = r.int(7);
      assert.ok(v >= 0 && v < 7);
    }
  });
});

describe("hero stats", () => {
  it("a level 1 Butcher without gear matches the GDD tutorial Power (~116)", () => {
    const p = power(buildHero("butcher", 1, {}).stats);
    assert.ok(p >= 116 && p <= 118, `power ${p}`);
  });

  it("set pieces add their stat bonus", () => {
    const rng = new Rng(3);
    const helmet = generateItem(rng, { rarity: "rare", ilvl: 20, slot: "helmet", setCode: "gravedigger" });
    const armor = generateItem(rng, { rarity: "rare", ilvl: 20, slot: "armor", setCode: "gravedigger" });
    const one = buildHero("butcher", 20, { helmet });
    const two = buildHero("butcher", 20, { helmet, armor: { ...armor, setCode: null } });
    const twoSet = buildHero("butcher", 20, { helmet, armor });
    assert.equal(one.sets.gravedigger, 1);
    assert.ok(twoSet.stats.hp > two.stats.hp);
  });
});

describe("items", () => {
  it("legendaries have 4 substats and an effect; substats never repeat", () => {
    const rng = new Rng(11);
    for (let i = 0; i < 200; i++) {
      const it = generateItem(rng, { rarity: "legendary", ilvl: 40 });
      assert.equal(it.substats.length, 4);
      assert.ok(it.legendaryEffect);
      assert.equal(new Set(it.substats.map((s) => s.key)).size, 4);
    }
  });

  it("enhancing never drops a level and the luck meter guarantees success", () => {
    const rng = new Rng(5);
    const item = generateItem(rng, { rarity: "epic", ilvl: 30, slot: "weapon" });
    item.enhance = 14;
    let attempts = 0;
    while (item.enhance === 14) {
      rollEnhance(rng, item);
      attempts += 1;
      assert.ok(item.enhance >= 14);
    }
    assert.ok(attempts <= 14, `took ${attempts} attempts`);
  });

  it("enhancement cost scales with ilvl", () => {
    const rng = new Rng(6);
    const low = generateItem(rng, { rarity: "rare", ilvl: 10, slot: "weapon" });
    const high = generateItem(rng, { rarity: "rare", ilvl: 50, slot: "weapon" });
    assert.ok(enhanceCost(high)!.gold > enhanceCost(low)!.gold);
  });
});

describe("progression", () => {
  it("EXP curve matches the detailed design table", () => {
    assert.equal(expToNext(1), 100);
    assert.equal(expToNext(10), 7940);
    let total = 0;
    for (let l = 1; l < 10; l++) total += expToNext(l);
    assert.equal(total, 23540);
  });

  it("addExp carries over multiple levels", () => {
    const r = addExp(1, 0, 2000);
    assert.ok(r.level >= 3);
  });
});

describe("rewards", () => {
  it("chapter boss pity forces a Legendary on run 41", () => {
    const r = dungeonRewards(new Rng(1), { floor: 10, firstClear: false, boons: [], sets: {}, pity: CHAPTER_BOSS_PITY });
    assert.ok(r.items.some((i) => i.rarity === "legendary"));
    assert.equal(r.pity, 0);
  });

  it("the first chapter boss drop belongs to the chapter set", () => {
    const r = dungeonRewards(new Rng(2), { floor: 20, firstClear: true, boons: [], sets: {}, pity: 0 });
    assert.equal(r.items.at(-2)?.setCode ?? r.items.find((i) => i.setCode)?.setCode, "gravedigger");
    assert.equal(r.gems, 20);
  });
});
