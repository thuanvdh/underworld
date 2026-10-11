import { randomBytes } from "node:crypto";
import { after } from "node:test";
import { PgStore, SqliteStore, type Store } from "../src/store.ts";

const opened: Store[] = [];
after(async () => {
  for (const s of opened) await s.close();
});

/**
 * A fresh, empty store per test. SQLite in memory by default; set TEST_DATABASE_URL to run the very same
 * tests against PostgreSQL (each store gets its own schema, so tests stay isolated).
 */
export async function testStore(): Promise<Store> {
  const url = process.env.TEST_DATABASE_URL;
  const store = url ? await PgStore.open(url, `t_${randomBytes(6).toString("hex")}`) : new SqliteStore(":memory:");
  opened.push(store);
  return store;
}
