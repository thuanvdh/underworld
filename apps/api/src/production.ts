/**
 * Production entry: one process serves the API, the built Mini App and the Telegram bot (via webhook).
 * Works on Render, Fly, a VPS or any Docker host.
 *
 * Required env: BOT_TOKEN, SESSION_SECRET, and PUBLIC_URL (Render sets RENDER_EXTERNAL_URL automatically).
 * Optional: DB_PATH (default /data/underworld.db), BOT_MODE=polling to use long polling instead of a webhook.
 */
import { createHash } from "node:crypto";
import { accessSync, constants, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { configureBot, createBot } from "@underworld/bot";
import { webhookCallback } from "grammy";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDb, type Db } from "./db.ts";

const BACKUP_EVERY_MS = 6 * 3600_000;
const BACKUPS_KEPT = 8;

const publicUrl = (process.env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").replace(/\/+$/, "");
const config = loadConfig({ dbPath: writableDbPath(process.env.DB_PATH ?? "/data/underworld.db"), devAuth: false });
const TMP_DB = join(tmpdir(), "underworld", "underworld.db");

const missing = [
  !config.botToken && "BOT_TOKEN",
  !process.env.SESSION_SECRET && "SESSION_SECRET",
  !publicUrl.startsWith("https://") && "PUBLIC_URL (https://…)",
].filter(Boolean);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

let db: Db;
try {
  db = openDb(config.dbPath);
} catch (err) {
  // Some volumes allow writes but not SQLite's locking/WAL files; never fail to boot over storage.
  console.warn(`! Could not open ${config.dbPath} (${err instanceof Error ? err.message : err}) — using ${TMP_DB}.`);
  mkdirSync(dirname(TMP_DB), { recursive: true });
  config.dbPath = TMP_DB;
  db = openDb(TMP_DB);
}
const app = buildApp({ config, db });

// ───────── Telegram bot ─────────
const bot = createBot({ token: config.botToken, webAppUrl: `${publicUrl}/` });
const polling = process.env.BOT_MODE === "polling";
// Secret path + secret header so only Telegram can post updates.
const secret = createHash("sha256").update(`webhook:${config.botToken}`).digest("hex").slice(0, 32);
const webhookPath = `/telegram/${secret}`;

if (!polling) {
  app.post(webhookPath, webhookCallback(bot, "fastify", { secretToken: secret }));
}

await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(`UNDERWORLD up on :${config.port} · public ${publicUrl} · db ${config.dbPath}`);

// A bot problem (bad token, Telegram down) must not take the game offline, so it's logged, not fatal.
try {
  await bot.init();
  await configureBot(bot, `${publicUrl}/`);
  if (polling) {
    await bot.api.deleteWebhook();
    void bot.start({ drop_pending_updates: true });
    console.log(`Bot @${bot.botInfo.username} polling`);
  } else {
    await bot.api.setWebhook(`${publicUrl}${webhookPath}`, { secret_token: secret, allowed_updates: ["message", "callback_query"] });
    console.log(`Bot @${bot.botInfo.username} webhook set`);
  }
} catch (err) {
  console.error("Bot setup failed (game still running):", err instanceof Error ? err.message : err);
}

// ───────── Backups ─────────
startBackups(db, config.dbPath);

const shutdown = async () => {
  console.log("Shutting down…");
  if (polling) await bot.stop().catch(() => {});
  await app.close();
  db.close();
  process.exit(0);
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

/**
 * Use the configured DB path if its folder is writable; otherwise (e.g. a host running the container as an
 * unexpected user, or no disk attached) fall back to the temp dir so the game still starts.
 */
function writableDbPath(preferred: string): string {
  const dir = dirname(preferred);
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return preferred;
  } catch {
    const fallback = join(tmpdir(), "underworld", "underworld.db"); // same as TMP_DB (declared later)
    mkdirSync(dirname(fallback), { recursive: true });
    console.warn(`! ${dir} is not writable — using ${fallback}. Data will not survive restarts; attach a disk or a database.`);
    return fallback;
  }
}

/** Snapshot the SQLite DB next to it every few hours (VACUUM INTO is consistent while the app runs). */
function startBackups(database: Db, dbPath: string): void {
  if (dbPath === ":memory:") return;
  const dir = join(dirname(dbPath), "backups");
  mkdirSync(dir, { recursive: true });
  const run = () => {
    try {
      const file = join(dir, `underworld-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
      database.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
      const old = readdirSync(dir).filter((f) => f.endsWith(".db")).sort().slice(0, -BACKUPS_KEPT);
      for (const f of old) rmSync(join(dir, f));
      console.log(`Backup written: ${file}`);
    } catch (err) {
      console.error("Backup failed:", err);
    }
  };
  setTimeout(run, 60_000).unref();
  setInterval(run, BACKUP_EVERY_MS).unref();
}
