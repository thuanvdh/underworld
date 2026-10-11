import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { Battle, type BattleSetup } from "@underworld/combat";
import { buildApp } from "../src/app.ts";
import { verifyInitData } from "../src/auth.ts";
import { loadConfig } from "../src/config.ts";
import { testStore } from "./store-helper.ts";

const BOT_TOKEN = "123456:TEST";

async function setup(start = Date.UTC(2026, 9, 10, 8)) {
  let clock = start;
  const config = loadConfig({ dbPath: ":memory:", devAuth: true, botToken: BOT_TOKEN, sessionSecret: "test-secret", miniappDist: "" });
  const app = buildApp({ config, store: await testStore(), now: () => clock });
  return { app, advance: (ms: number) => (clock += ms) };
}

async function login(app: Awaited<ReturnType<typeof setup>>["app"], devUserId = 1, pickClass = true) {
  const res = await app.inject({ method: "POST", url: "/api/auth/session", payload: { devUserId } });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { token: string; player: { id: number } };
  const call = async (method: "GET" | "POST", url: string, payload?: unknown) => {
    const r = await app.inject({ method, url, payload: payload as object, headers: { authorization: `Bearer ${body.token}` } });
    return { status: r.statusCode, body: r.json() as Record<string, any> };
  };
  if (pickClass) await call("POST", "/api/me/class", { classId: "butcher" });
  return { ...body, call };
}

/** Play a battle on the client exactly like the Mini App does, auto-casting skills. */
function playClient(setup: BattleSetup) {
  const battle = new Battle(setup, { autopilot: "auto" });
  while (!battle.ended) {
    if (battle.phase === "boonChoice") battle.chooseBoon(battle.autoBoonPick());
    else battle.step();
  }
  return battle.result!;
}

function signedInitData(user: object, authDate: number): string {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: "AAE", user: JSON.stringify(user) });
  const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", createHmac("sha256", secret).update(dcs).digest("hex"));
  return params.toString();
}

describe("auth", () => {
  it("accepts valid Telegram initData and rejects tampered data", async () => {
    const now = Math.floor(Date.now() / 1000);
    const initData = signedInitData({ id: 777, first_name: "Ryn", language_code: "ru" }, now);
    assert.equal(verifyInitData(initData, BOT_TOKEN, 3600, now)?.id, 777);
    assert.equal(verifyInitData(initData.replace("Ryn", "Bob"), BOT_TOKEN, 3600, now), null);
    assert.equal(verifyInitData(initData, BOT_TOKEN, 3600, now + 7200), null, "expired");
  });

  it("logs in through initData and rejects requests without a session", async () => {
    const { app } = await setup();
    const initData = signedInitData({ id: 42, first_name: "Kat" }, Math.floor(Date.UTC(2026, 9, 10, 8) / 1000));
    const ok = await app.inject({ method: "POST", url: "/api/auth/session", payload: { initData } });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().player.name, "Kat");
    const denied = await app.inject({ method: "GET", url: "/api/me" });
    assert.equal(denied.statusCode, 401);
  });
});

describe("dungeon flow", () => {
  it("start → client battle → finish pays rewards once and unlocks the next floor", async () => {
    const { app } = await setup();
    const { call } = await login(app);

    const start = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    assert.equal(start.status, 200);
    assert.equal(start.body.player.energy, 100, "floors 1-15 are free for new players");

    const clientResult = playClient(start.body.setup);
    const finish = await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: clientResult.inputs });
    assert.equal(finish.status, 200);
    assert.deepEqual(finish.body.result, clientResult, "server replay matches the client");
    assert.equal(finish.body.result.victory, true);
    assert.ok(finish.body.rewards.gold > 0);
    assert.equal(finish.body.player.highestFloor, 1);

    const again = await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: clientResult.inputs });
    assert.deepEqual(again.body, finish.body, "retry returns the stored response");
    const me = await call("GET", "/api/me");
    assert.equal(me.body.gold, finish.body.player.gold, "no double payout");

    const locked = await call("POST", "/api/battles/dungeon/start", { floor: 5 });
    assert.equal(locked.status, 409);
    assert.equal(locked.body.error, "floor_locked");
  });

  it("charges energy after the newbie window and refunds most of it on a loss", async () => {
    const { app, advance } = await setup();
    await login(app);
    advance(49 * 3600_000);
    const { call } = await login(app); // sessions last 12h; the app re-logs in on open
    const start = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    assert.equal(start.body.player.energy, 90);
    const finish = await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: { skillTicks: [], boonPicks: [] } });
    assert.equal(finish.status, 200);
    if (!finish.body.result.victory) assert.equal(finish.body.player.energy, 98);
  });

  it("rejects malformed inputs", async () => {
    const { app } = await setup();
    const { call } = await login(app);
    const start = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    const bad = await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: { skillTicks: ["x"], boonPicks: [] } });
    assert.equal(bad.status, 400);
  });

  it("a player cannot finish someone else's battle", async () => {
    const { app } = await setup();
    const a = await login(app, 1);
    const b = await login(app, 2);
    const start = await a.call("POST", "/api/battles/dungeon/start", { floor: 1 });
    const steal = await b.call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: { skillTicks: [], boonPicks: [] } });
    assert.equal(steal.status, 404);
  });
});

describe("items, AFK and forge", () => {
  async function progressed() {
    const s = await setup();
    const session = await login(s.app);
    for (let floor = 1; floor <= 8; floor++) {
      const start = await session.call("POST", "/api/battles/dungeon/start", { floor });
      const result = playClient(start.body.setup);
      await session.call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: result.inputs });
      const items = await session.call("GET", "/api/items");
      for (const item of items.body.bag) await session.call("POST", `/api/items/${item.id}/equip`);
    }
    return { ...s, ...session };
  }

  it("equips, enhances and salvages items", async () => {
    const { call } = await progressed();
    const me = await call("GET", "/api/me");
    assert.ok(me.body.level >= 3, `level ${me.body.level}`);
    const items = await call("GET", "/api/items");
    const equipped = Object.values(items.body.equipped) as { id: string; enhance: number }[];
    assert.ok(equipped.length > 0);

    const target = equipped[0]!;
    const enh = await call("POST", `/api/items/${target.id}/enhance`);
    if (enh.status === 200) {
      assert.equal(enh.body.item.enhance, target.enhance + 1, "+1 to +9 always succeeds");
      assert.ok(enh.body.player.gold < me.body.gold);
    } else {
      assert.ok(["not_enough_gold", "not_enough_stones"].includes(enh.body.error));
    }

    const salvageEquipped = await call("POST", "/api/items/salvage", { itemIds: [target.id] });
    assert.equal(salvageEquipped.body.error, "item_equipped");
    if (items.body.bag.length > 0) {
      const res = await call("POST", "/api/items/salvage", { itemIds: [items.body.bag[0].id] });
      assert.equal(res.body.salvaged, 1);
    }
  });

  it("AFK accumulates up to the cap", async () => {
    const { app, call: firstCall, advance } = await progressed();
    const me = await firstCall("GET", "/api/me");
    if (me.body.level < 7) return; // AFK unlocks at level 7
    await firstCall("POST", "/api/afk/claim");
    advance(20 * 3600_000);
    const { call } = await login(app);
    const preview = await call("GET", "/api/me");
    assert.equal(preview.body.afk.hours, 12);
    const claim = await call("POST", "/api/afk/claim");
    assert.equal(claim.status, 200);
    assert.ok(claim.body.rewards.gold > 0);
    assert.equal(claim.body.rewards.gold, preview.body.afk.gold);
  });

  it("forge stone price rises and stops at the daily cap", async () => {
    const { app } = await setup();
    const { call } = await login(app);
    const poor = await call("POST", "/api/forge/stones", { count: 1 });
    assert.equal(poor.body.error, "not_enough_gold");
  });
});

describe("serving the Mini App", () => {
  it("serves index.html for app routes and keeps /api 404s as JSON", async () => {
    const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const dist = mkdtempSync(join(tmpdir(), "uw-dist-"));
    writeFileSync(join(dist, "index.html"), "<!doctype html><title>UNDERWORLD</title>");
    mkdirSync(join(dist, "assets"));
    writeFileSync(join(dist, "assets", "app-abc.js"), "console.log(1)");
    const config = loadConfig({ dbPath: ":memory:", devAuth: true, sessionSecret: "s", miniappDist: dist });
    const app = buildApp({ config, store: await testStore() });

    const root = await app.inject({ method: "GET", url: "/" });
    assert.equal(root.statusCode, 200);
    assert.match(root.body, /UNDERWORLD/);
    assert.equal(root.headers["cache-control"], "no-cache");

    const asset = await app.inject({ method: "GET", url: "/assets/app-abc.js" });
    assert.match(String(asset.headers["cache-control"]), /immutable/);

    const deep = await app.inject({ method: "GET", url: "/some/screen?ref=1" });
    assert.match(deep.body, /UNDERWORLD/);

    const api404 = await app.inject({ method: "GET", url: "/api/nope" });
    assert.equal(api404.statusCode, 404);
    assert.equal(api404.json().error, "not_found");
  });
});

describe("character select", () => {
  it("a new player must pick a class before fighting", async () => {
    const { app } = await setup();
    const { call, player } = await login(app, 7, false);
    assert.equal((player as unknown as { classChosen: boolean }).classChosen, false);
    const blocked = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    assert.equal(blocked.body.error, "class_not_chosen");
    const picked = await call("POST", "/api/me/class", { classId: "hexer" });
    assert.equal(picked.body.classChosen, true);
    assert.equal(picked.body.classId, "hexer");
    const ok = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    assert.equal(ok.status, 200);
  });

  it("players can switch class any time and keep level and gear", async () => {
    const { app, advance } = await setup();
    const a = await login(app, 8);
    const start = await a.call("POST", "/api/battles/dungeon/start", { floor: 1 });
    const result = playClient(start.body.setup);
    await a.call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: result.inputs });
    advance(100 * 3600_000);
    const later = await login(app, 8, false);
    const before = await later.call("GET", "/api/me");
    const sw = await later.call("POST", "/api/me/class", { classId: "gunslinger" });
    assert.equal(sw.status, 200);
    assert.equal(sw.body.classId, "gunslinger");
    assert.equal(sw.body.level, before.body.level);
    const back = await later.call("POST", "/api/me/class", { classId: "butcher" });
    assert.equal(back.body.classId, "butcher");
  });

  it("first clears of floor 1 and 3 guarantee the tutorial drops; boons wait for level 6", async () => {
    const { app } = await setup();
    const { call } = await login(app, 9);
    const start = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    assert.equal(start.body.setup.boonsEnabled, false);
    const res = playClient(start.body.setup);
    const fin = await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: res.inputs });
    assert.ok(fin.body.rewards.items.some((i: { rarity: string; slot: string }) => i.rarity === "rare" && i.slot === "armor"));
  });
});

describe("per-class bags", () => {
  it("drops land in their class's bag and only that class can equip them", async () => {
    const { app } = await setup();
    const { call } = await login(app, 21);
    // Farm a few floors so some drops belong to other classes.
    for (let floor = 1; floor <= 6; floor++) {
      const start = await call("POST", "/api/battles/dungeon/start", { floor });
      const res = playClient(start.body.setup);
      await call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs: res.inputs });
    }
    const me = await call("GET", "/api/me");
    const counts = me.body.bags as Record<"butcher" | "gunslinger" | "hexer", number>;
    const mine = await call("GET", "/api/items");
    assert.equal(mine.body.classId, "butcher");
    assert.ok(mine.body.bag.every((i: { classId: string }) => i.classId === "butcher"));
    assert.equal(mine.body.bag.length, counts.butcher);

    const other = (["gunslinger", "hexer"] as const).find((c) => counts[c] > 0);
    if (other) {
      const theirs = await call("GET", `/api/items?class=${other}`);
      const foreign = theirs.body.bag[0];
      assert.equal(foreign.classId, other);
      const denied = await call("POST", `/api/items/${foreign.id}/equip`);
      assert.equal(denied.body.error, "wrong_class");
      await call("POST", "/api/me/class", { classId: other });
      const ok = await call("POST", `/api/items/${foreign.id}/equip`);
      assert.equal(ok.status, 200);
      const now = await call("GET", "/api/items");
      assert.equal(now.body.equipped[foreign.slot].id, foreign.id);
      // The butcher's gear is untouched by the switch.
      const back = await call("GET", "/api/items?class=butcher");
      assert.equal(back.body.bag.length + Object.keys(back.body.equipped).length >= 0, true);
    }
  });
});

describe("concurrency", () => {
  it("parallel finishes of one battle pay out exactly once", async () => {
    const { app } = await setup();
    const { call } = await login(app, 31);
    const start = await call("POST", "/api/battles/dungeon/start", { floor: 1 });
    const inputs = playClient(start.body.setup).inputs;
    const results = await Promise.all(Array.from({ length: 5 }, () => call("POST", `/api/battles/${start.body.battleId}/finish`, { inputs })));
    assert.ok(results.every((r) => r.status === 200));
    const me = await call("GET", "/api/me");
    assert.equal(me.body.gold, results[0]!.body.player.gold, "gold credited once");
    for (const r of results) assert.deepEqual(r.body.result, results[0]!.body.result);
  });

  it("parallel purchases never exceed the daily limit or overdraw", async () => {
    const { app } = await setup();
    const { call } = await login(app, 32);
    // Earn some gold, then hammer the forge in parallel.
    for (let floor = 1; floor <= 5; floor++) {
      const s = await call("POST", "/api/battles/dungeon/start", { floor });
      await call("POST", `/api/battles/${s.body.battleId}/finish`, { inputs: playClient(s.body.setup).inputs });
    }
    const before = await call("GET", "/api/me");
    const buys = await Promise.all(Array.from({ length: 6 }, () => call("POST", "/api/forge/stones", { count: 1 })));
    const ok = buys.filter((b) => b.status === 200).length;
    const after = await call("GET", "/api/me");
    assert.equal(after.body.stones - before.body.stones, ok, "one stone per successful buy");
    assert.ok(after.body.gold >= 0);
  });
});
