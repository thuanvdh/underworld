import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export interface Config {
  port: number;
  /** Telegram bot token, used to verify Mini App initData. */
  botToken: string;
  /** Secret for signing session tokens. */
  sessionSecret: string;
  /** SQLite file path; ":memory:" for tests. Ignored when databaseUrl is set. */
  dbPath: string;
  /** PostgreSQL connection string (e.g. Neon). When set, data lives there instead of SQLite. */
  databaseUrl: string;
  /** Accept `{ devUserId }` logins without Telegram. Never enable in production. */
  devAuth: boolean;
  /** Reject initData older than this. */
  initDataMaxAgeSeconds: number;
  /** Built Mini App to serve from the same origin as the API; "" disables it. */
  miniappDist: string;
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    botToken: process.env.BOT_TOKEN ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
    dbPath: process.env.DB_PATH ?? "underworld.db",
    databaseUrl: process.env.DATABASE_URL ?? "",
    devAuth: process.env.DEV_AUTH === "1",
    initDataMaxAgeSeconds: 24 * 3600,
    miniappDist: process.env.MINIAPP_DIST ?? fileURLToPath(new URL("../../miniapp/dist", import.meta.url)),
    ...overrides,
  };
}
