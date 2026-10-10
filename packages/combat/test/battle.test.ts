import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Rng, SLOTS, buildHero, generateItem, type ClassId, type Equipment, type Rarity } from "@underworld/shared";
import { Battle, RING_TICKS, buildDungeonSetup, buildPvpSetup, simulate, type BattleEvent } from "@underworld/combat";

function gear(seed: number, rarity: Rarity, ilvl: number, enhance = 0, classId: ClassId = "butcher"): Equipment {
  const rng = new Rng(seed);
  const eq: Equipment = {};
  for (const slot of SLOTS) {
    const item = generateItem(rng, { rarity, ilvl, slot, classId });
    item.enhance = enhance;
    eq[slot] = item;
  }
  return eq;
}

/** Drive a battle like a human client: random taps and random boon picks. */
function playInteractively(battle: Battle, rng: Rng): void {
  while (!battle.ended) {
    if (battle.phase === "boonChoice") battle.chooseBoon(rng.int(battle.boonOffer.length));
    else battle.step(rng.chance(800));
  }
}

describe("determinism", () => {
  it("same setup and inputs give the same result", () => {
    const hero = buildHero("butcher", 12, gear(1, "rare", 12));
    const setup = buildDungeonSetup(12, hero, 12345);
    assert.deepEqual(simulate(setup), simulate(setup));
  });

  it("server replay of a live client battle matches exactly", () => {
    for (const classId of ["butcher", "gunslinger", "hexer"] as const) {
      for (const floor of [3, 10, 20, 30, 40, 50, 60]) {
        const hero = buildHero(classId, Math.min(60, floor + 2), gear(floor, "epic", floor, 0, classId));
        const setup = buildDungeonSetup(floor, hero, 900 + floor);
        const live = new Battle(setup, { recordEvents: true });
        playInteractively(live, new Rng(floor));
        const replay = simulate(setup, live.result!.inputs);
        assert.deepEqual(replay, live.result, `${classId} floor ${floor}`);
      }
    }
  });

  it("different seeds give different battles", () => {
    const hero = buildHero("gunslinger", 15, gear(2, "rare", 15, 0, "gunslinger"));
    const a = simulate(buildDungeonSetup(15, hero, 1));
    const b = simulate(buildDungeonSetup(15, hero, 2));
    assert.notDeepEqual(a, b);
  });

  it("a forged result cannot survive replay", () => {
    const weak = buildHero("butcher", 1, {});
    const setup = buildDungeonSetup(40, weak, 7);
    const claimed = { skillTicks: [], boonPicks: [0, 0, 0] };
    const verified = simulate(setup, claimed);
    assert.equal(verified.victory, false);
  });
});

describe("skill timing", () => {
  function firstSkill(pressAtPhase: number): BattleEvent | undefined {
    const hero = buildHero("butcher", 10, gear(3, "rare", 10));
    const battle = new Battle(buildDungeonSetup(10, hero, 77), { recordEvents: true });
    while (!battle.ended) {
      if (battle.phase === "boonChoice") {
        battle.chooseBoon(0);
        continue;
      }
      const s = battle.skillState();
      battle.step(s.ready && s.ringPhase === pressAtPhase);
      const skill = battle.events.find((e) => e.kind === "skill");
      if (skill) return skill;
    }
    return undefined;
  }

  it("pressing inside the ring window is Perfect", () => {
    const e = firstSkill(21);
    assert.equal(e?.kind === "skill" && e.quality, "perfect");
  });

  it("pressing near the window is Good, otherwise Normal", () => {
    const good = firstSkill(17);
    const normal = firstSkill(5);
    assert.equal(good?.kind === "skill" && good.quality, "good");
    assert.equal(normal?.kind === "skill" && normal.quality, "normal");
    assert.ok(RING_TICKS > 21);
  });

  it("a Perfect skill breaks the tutorial boss shield", () => {
    const hero = buildHero("butcher", 6, gear(4, "rare", 5));
    const battle = new Battle(buildDungeonSetup(3, hero, 5), { recordEvents: true, autopilot: "perfect" });
    while (!battle.ended) {
      if (battle.phase === "boonChoice") battle.chooseBoon(0);
      else battle.step();
    }
    const shielded = battle.events.some((e) => e.kind === "shield");
    const broken = battle.events.some((e) => e.kind === "mechanic" && e.what === "shield_broken");
    if (shielded) assert.ok(broken, "shield appeared but was never broken by a Perfect skill");
  });
});

describe("pvp", () => {
  it("a much stronger attacker wins", () => {
    const strong = buildHero("gunslinger", 40, gear(5, "legendary", 40, 0, "gunslinger"));
    const weak = buildHero("butcher", 10, gear(6, "common", 10));
    const r = simulate(buildPvpSetup(strong, weak, 3));
    assert.equal(r.victory, true);
    assert.ok(r.stars >= 2);
  });

  it("the attacker loses on timeout", () => {
    const tank = buildHero("butcher", 60, gear(7, "legendary", 60));
    const r = simulate(buildPvpSetup(buildHero("hexer", 1, {}), tank, 3));
    assert.equal(r.victory, false);
  });
});

describe("chapter bosses", () => {
  it("every chapter boss can be beaten by a well-geared hero", () => {
    for (const floor of [10, 20, 30, 40, 50, 60]) {
      const hero = buildHero("gunslinger", Math.min(60, floor + 5), gear(floor, "legendary", floor + 5, 12, "gunslinger"));
      const r = simulate(buildDungeonSetup(floor, hero, floor), undefined, { autopilot: "perfect" });
      assert.equal(r.victory, true, `floor ${floor}`);
    }
  });
});
