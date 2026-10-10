import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Battle, type BattleSetup } from "@underworld/combat";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { openDb } from "../src/db.ts";
import { weekKey } from "../src/game/service.ts";

const DAY = 86_400_000;

function setup() {
  let clock = Date.UTC(2026, 9, 10, 8);
  const db = openDb(":memory:");
  const config = loadConfig({ dbPath: ":memory:", devAuth: true, sessionSecret: "s", miniappDist: "" });
  const app = buildApp({ config, db, now: () => clock });
  return { app, db, advance: (ms: number) => (clock += ms) };
}

async function session(app: ReturnType<typeof setup>["app"], devUserId = 1) {
  const res = await app.inject({ method: "POST", url: "/api/auth/session", payload: { devUserId } });
  const token = res.json().token as string;
  const call = async (method: "GET" | "POST", url: string, payload?: unknown) => {
    const r = await app.inject({ method, url, payload: payload as object, headers: { authorization: `Bearer ${token}` } });
    return { status: r.statusCode, body: r.json() as Record<string, any> };
  };
  return call;
}

function play(setupData: BattleSetup) {
  const b = new Battle(setupData, { autopilot: "perfect" });
  while (!b.ended) {
    if (b.phase === "boonChoice") b.chooseBoon(b.autoBoonPick());
    else b.step();
  }
  return b.result!;
}

/** New player → class → clear floors (free newbie runs) until level 10, equipping as we go. */
async function levelTen(app: ReturnType<typeof setup>["app"], id = 1) {
  const call = await session(app, id);
  await call("POST", "/api/me/class", { classId: "butcher" });
  for (let floor = 1; floor <= 15; floor++) {
    const start = await call("POST", "/api/battles/dungeon/start", { floor });
    await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: play(start.body.setup).inputs });
    const items = await call("GET", "/api/items");
    for (const it of items.body.bag) await call("POST", `/api/items/${it.id}/equip`);
    if ((await call("GET", "/api/me")).body.level >= 10) break;
  }
  return call;
}

describe("quests", () => {
  it("are locked before level 10", async () => {
    const { app } = setup();
    const call = await session(app);
    assert.equal((await call("GET", "/api/quests")).body.error, "locked_feature");
    assert.equal((await call("GET", "/api/shop")).body.error, "locked_feature");
  });

  it("count actions, fill activity and pay out milestone chests once", async () => {
    const { app } = setup();
    const call = await levelTen(app);
    const q = (await call("GET", "/api/quests")).body;
    const byId = Object.fromEntries(q.daily.map((d: { id: string }) => [d.id, d]));
    assert.equal(byId.login.done, true);
    assert.equal(byId.runs.done, true, "levelling took 3+ runs");
    assert.ok(q.activity >= 40, `activity ${q.activity}`);
    const before = (await call("GET", "/api/me")).body.gold;
    const claim = await call("POST", "/api/quests/chest/40");
    assert.equal(claim.status, 200);
    assert.equal(claim.body.rewards.gold, 5000);
    assert.equal(claim.body.player.gold, before + 5000);
    assert.equal((await call("POST", "/api/quests/chest/40")).body.error, "already_claimed");
    assert.equal((await call("POST", "/api/quests/chest/100")).body.error, q.activity >= 100 ? undefined : "not_ready");
  });
});

describe("login calendar", () => {
  it("gives one reward per day in order", async () => {
    const { app, advance } = setup();
    const call = await levelTen(app);
    const day1 = await call("POST", "/api/calendar/claim");
    assert.equal(day1.body.rewards.gems, 500);
    assert.equal((await call("POST", "/api/calendar/claim")).body.error, "not_ready");
    advance(DAY);
    const again = await session(app);
    const day2 = await again("POST", "/api/calendar/claim");
    assert.equal(day2.body.rewards.stones, 20);
  });
});

describe("gem shop", () => {
  it("free chest once a day, paid pulls cost gems, limits hold", async () => {
    const { app, db } = setup();
    const call = await levelTen(app);
    db.prepare("UPDATE players SET gems = 5000").run();

    const free = await call("POST", "/api/shop/chest", { count: 1, free: true });
    assert.equal(free.body.rewards.items.length, 1);
    assert.equal((await call("POST", "/api/shop/chest", { count: 1, free: true })).body.error, "already_claimed");

    const ten = await call("POST", "/api/shop/chest", { count: 10 });
    assert.equal(ten.body.rewards.items.length, 10);
    assert.ok(ten.body.rewards.items.some((i: { rarity: string }) => i.rarity === "epic" || i.rarity === "legendary"), "10-pull guarantees an Epic");
    assert.ok(ten.body.rewards.items.every((i: { classId: string }) => i.classId === "butcher"), "chest gear is for the class played");
    assert.equal(ten.body.player.gems, 5000 - 1500);

    for (const price of [50, 80, 120]) {
      const r = await call("POST", "/api/shop/energy");
      assert.equal(r.status, 200, `energy buy at ${price}`);
    }
    assert.equal((await call("POST", "/api/shop/energy")).body.error, "limit_reached");

    const deal = await call("POST", "/api/shop/deal/stones");
    assert.equal(deal.body.rewards.stones, 30);

    const shop = (await call("GET", "/api/shop")).body;
    assert.equal(shop.chest.freeLeft, 0);
    assert.equal(shop.energy.nextPrice, null);
    assert.equal(shop.deals.find((d: { id: string }) => d.id === "stones").left, 2);
  });

  it("refuses purchases without enough gems", async () => {
    const { app, db } = setup();
    const call = await levelTen(app);
    db.prepare("UPDATE players SET gems = 10").run();
    assert.equal((await call("POST", "/api/shop/chest", { count: 10 })).body.error, "not_enough_gems");
  });
});

describe("week keys", () => {
  it("follow ISO weeks", () => {
    assert.equal(weekKey(Date.UTC(2026, 9, 10)), "2026-W41");
    assert.equal(weekKey(Date.UTC(2026, 0, 1)), "2026-W01");
    assert.equal(weekKey(Date.UTC(2027, 0, 1)), "2026-W53");
  });
});
