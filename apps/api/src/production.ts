/**
 * Production entry: one process serves the API, the built Mini App and the Telegram bot (via webhook).
 * Works on Render, Fly, a VPS or any Docker host.
 *
 * Required env: BOT_TOKEN, SESSION_SECRET, and PUBLIC_URL (Render sets RENDER_EXTERNAL_URL automatically).
 * Optional: DB_PATH (default /data/underworld.db), BOT_MODE=polling to use long polling instead of a webhook.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { configureBot, createBot } from "@underworld/bot";
import { webhookCallback } from "grammy";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDb, type Db } from "./db.ts";

const BACKUP_EVERY_MS = 6 * 3600_000;
const BACKUPS_KEPT = 8;

const publicUrl = (process.env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").replace(/\/+$/, "");
const config = loadConfig({ dbPath: process.env.DB_PATH ?? "/data/underworld.db", devAuth: false });

const missing = [
  !config.botToken && "BOT_TOKEN",
  !process.env.SESSION_SECRET && "SESSION_SECRET",
  !publicUrl.startsWith("https://") && "PUBLIC_URL (https://…)",
].filter(Boolean);
if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

mkdirSync(dirname(config.dbPath), { recursive: true });
const db = openDb(config.dbPath);
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
