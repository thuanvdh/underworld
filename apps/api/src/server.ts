import { existsSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
if (!config.botToken && !config.devAuth) {
  console.error("Set BOT_TOKEN (Telegram login) or DEV_AUTH=1 (local dev login).");
  process.exit(1);
}
if (!process.env.SESSION_SECRET) console.warn("SESSION_SECRET not set: sessions reset on every restart.");

const app = buildApp({ config });
await app.listen({ port: config.port, host: "0.0.0.0" });
const serving = config.miniappDist && existsSync(join(config.miniappDist, "index.html"));
console.log(`UNDERWORLD API on http://localhost:${config.port} (db: ${config.dbPath}${config.devAuth ? ", DEV_AUTH on" : ""})`);
console.log(serving ? `Serving Mini App from ${config.miniappDist}` : "Mini App not built (npm run build) — API only.");
