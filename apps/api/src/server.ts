import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openStore } from "./store.ts";

const config = loadConfig();
if (!config.botToken && !config.devAuth) {
  console.error("Set BOT_TOKEN (Telegram login) or DEV_AUTH=1 (local dev login).");
  process.exit(1);
}
if (!process.env.SESSION_SECRET) console.warn("SESSION_SECRET not set: sessions reset on every restart.");

const store = await openStore({ databaseUrl: config.databaseUrl, sqlitePath: config.dbPath });
const app = buildApp({ config, store });
await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(
  `UNDERWORLD API on http://localhost:${config.port} (db: ${store.dialect === "postgres" ? "PostgreSQL" : config.dbPath}${config.devAuth ? ", DEV_AUTH on" : ""})`,
);
