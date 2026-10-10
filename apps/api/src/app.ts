import { existsSync } from "node:fs";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import type { BattleInputs } from "@underworld/combat";
import { signSession, verifyInitData, verifySession } from "./auth.ts";
import type { Config } from "./config.ts";
import { openDb, type Db } from "./db.ts";
import { GameError } from "./game/errors.ts";
import { MetaService } from "./game/meta.ts";

declare module "fastify" {
  interface FastifyRequest {
    playerId: number;
  }
}

const MAX_SKILL_PRESSES = 400;
const MAX_BOON_PICKS = 3;

export interface AppDeps {
  config: Config;
  db?: Db;
  now?: () => number;
}

/** Build the HTTP API (detailed design §23). All routes live under /api. */
export function buildApp({ config, db = openDb(config.dbPath), now = Date.now }: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });
  const game = new MetaService(db, now);
  const seconds = () => Math.floor(now() / 1000);

  app.decorateRequest("playerId", 0);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof GameError) return reply.status(err.status).send({ error: err.code, message: err.message });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: "bad_request", message: (err as Error).message });
    app.log.error(err);
    return reply.status(500).send({ error: "internal" });
  });

  const auth = async (req: FastifyRequest) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const id = token ? verifySession(token, config.sessionSecret, seconds()) : null;
    if (!id) throw new GameError("unauthorized");
    req.playerId = id;
  };

  app.get("/api/health", async () => ({ ok: true }));

  app.post("/api/auth/session", async (req) => {
    const body = (req.body ?? {}) as { initData?: string; devUserId?: number; devName?: string };
    let telegramId: number;
    let name = "Hunter";
    let language = "en";
    if (typeof body.initData === "string" && body.initData.length > 0) {
      const user = verifyInitData(body.initData, config.botToken, config.initDataMaxAgeSeconds, seconds());
      if (!user) throw new GameError("unauthorized", "invalid initData");
      telegramId = user.id;
      name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || name;
      language = user.language_code?.slice(0, 2) ?? language;
    } else if (config.devAuth && Number.isInteger(body.devUserId)) {
      telegramId = body.devUserId!;
      name = body.devName ?? `Dev ${telegramId}`;
    } else {
      throw new GameError("unauthorized", "initData required");
    }
    const player = game.login(telegramId, name, language);
    return { token: signSession(player.id, config.sessionSecret, seconds()), player: game.view(player) };
  });

  app.register(async (r) => {
    r.addHook("preHandler", auth);

    r.get("/api/me", async (req) => game.me(req.playerId));
    r.post("/api/me/class", async (req) => game.chooseClass(req.playerId, str(req.body, "classId")));

    r.get("/api/dungeon", async (req) => game.dungeon(req.playerId));
    r.post("/api/battles/dungeon/start", async (req) => game.startDungeon(req.playerId, int(req.body, "floor")));
    r.post("/api/battles/:id/finish", async (req) => {
      const { id } = req.params as { id: string };
      return game.finishDungeon(req.playerId, id, parseInputs((req.body as { inputs?: unknown } | undefined)?.inputs));
    });
    r.post("/api/dungeon/sweep", async (req) => game.sweep(req.playerId, int(req.body, "floor"), int(req.body, "times")));

    r.post("/api/afk/claim", async (req) => game.claimAfk(req.playerId));

    r.get("/api/items", async (req) => game.items(req.playerId, (req.query as { class?: string }).class));
    r.post("/api/items/:id/equip", async (req) => game.equip(req.playerId, (req.params as { id: string }).id));
    r.post("/api/items/:id/enhance", async (req) => game.enhance(req.playerId, (req.params as { id: string }).id));
    r.post("/api/items/salvage", async (req) => {
      const ids = (req.body as { itemIds?: unknown } | undefined)?.itemIds;
      if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) throw new GameError("bad_request", "itemIds");
      return game.salvage(req.playerId, ids);
    });

    r.post("/api/forge/stones", async (req) => game.buyStones(req.playerId, int(req.body, "count")));

    r.get("/api/quests", async (req) => game.quests(req.playerId));
    r.post("/api/quests/chest/:at", async (req) => game.claimActivityChest(req.playerId, Number((req.params as { at: string }).at)));
    r.post("/api/quests/weekly/:id", async (req) => game.claimWeekly(req.playerId, (req.params as { id: string }).id));
    r.post("/api/calendar/claim", async (req) => game.claimCalendar(req.playerId));

    r.get("/api/shop", async (req) => game.shop(req.playerId));
    r.post("/api/shop/chest", async (req) => {
      const body = (req.body ?? {}) as { count?: unknown; free?: unknown };
      return game.openChest(req.playerId, int(body, "count"), body.free === true);
    });
    r.post("/api/shop/energy", async (req) => game.buyEnergy(req.playerId));
    r.post("/api/shop/afk", async (req) => game.instantAfk(req.playerId));
    r.post("/api/shop/deal/:id", async (req) => game.buyDeal(req.playerId, (req.params as { id: string }).id));
    r.post("/api/forge/convert-dust", async (req) => game.convertDust(req.playerId));
  });

  serveMiniApp(app, config.miniappDist);
  return app;
}

/**
 * Serve the built Mini App from the API's origin, so one HTTPS URL covers both (Telegram needs HTTPS).
 * Hashed assets are cached forever; index.html is never cached so new builds show up immediately.
 */
function serveMiniApp(app: FastifyInstance, dist: string): void {
  if (!dist || !existsSync(join(dist, "index.html"))) return;
  app.register(fastifyStatic, {
    root: dist,
    index: false,
    setHeaders: (reply, path) => {
      reply.header("cache-control", path.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
    },
  });
  app.get("/", (_req, reply) => reply.header("cache-control", "no-cache").sendFile("index.html"));
  app.setNotFoundHandler((req, reply) => {
    if (req.method === "GET" && !req.url.startsWith("/api/")) return reply.header("cache-control", "no-cache").sendFile("index.html");
    return reply.status(404).send({ error: "not_found" });
  });
}

function int(body: unknown, key: string): number {
  const v = (body as Record<string, unknown> | undefined)?.[key];
  if (typeof v !== "number" || !Number.isInteger(v)) throw new GameError("bad_request", `${key} must be an integer`);
  return v;
}

function str(body: unknown, key: string): string {
  const v = (body as Record<string, unknown> | undefined)?.[key];
  if (typeof v !== "string") throw new GameError("bad_request", `${key} must be a string`);
  return v;
}

/** Inputs come from the client, so only their shape is checked here; the replay decides what they're worth. */
function parseInputs(raw: unknown): BattleInputs {
  const r = raw as { skillTicks?: unknown; boonPicks?: unknown } | undefined;
  const ticks = r?.skillTicks;
  const picks = r?.boonPicks;
  const isInts = (a: unknown, max: number): a is number[] =>
    Array.isArray(a) && a.length <= max && a.every((x) => typeof x === "number" && Number.isInteger(x) && x >= 0);
  if (!isInts(ticks, MAX_SKILL_PRESSES) || !isInts(picks, MAX_BOON_PICKS)) throw new GameError("bad_request", "invalid inputs");
  return { skillTicks: ticks, boonPicks: picks };
}
