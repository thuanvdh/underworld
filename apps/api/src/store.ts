import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

/**
 * Storage behind the game. Two implementations share one async interface and the same SQL
 * (written with `?` placeholders):
 * - SQLite (built into Node) for local dev and tests — zero setup;
 * - PostgreSQL for production (set DATABASE_URL), e.g. a free Neon database, so data survives
 *   restarts and redeploys on hosts without a persistent disk.
 *
 * `tx()` runs a function on one connection inside a transaction; calls made inside it (even from
 * helpers) automatically use that connection. Nested `tx()` calls join the outer transaction.
 */
export interface Store {
  readonly dialect: "sqlite" | "postgres";
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<void>;
  tx<T>(fn: () => Promise<T>): Promise<T>;
  /** Raw multi-statement SQL (schema, maintenance). */
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

// ───────────────────────── SQLite ─────────────────────────

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id     INTEGER NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  language        TEXT    NOT NULL DEFAULT 'en',
  class           TEXT    NOT NULL DEFAULT 'butcher',
  level           INTEGER NOT NULL DEFAULT 1,
  exp             INTEGER NOT NULL DEFAULT 0,
  gold            INTEGER NOT NULL DEFAULT 0,
  gems            INTEGER NOT NULL DEFAULT 0,
  stones          INTEGER NOT NULL DEFAULT 0,
  dust            INTEGER NOT NULL DEFAULT 0,
  crystals        INTEGER NOT NULL DEFAULT 0,
  cores           INTEGER NOT NULL DEFAULT 0,
  energy          INTEGER NOT NULL DEFAULT 100,
  energy_at       INTEGER NOT NULL,
  afk_last_claim  INTEGER NOT NULL,
  afk_carry_stones REAL   NOT NULL DEFAULT 0,
  afk_carry_dust  REAL    NOT NULL DEFAULT 0,
  highest_floor   INTEGER NOT NULL DEFAULT 0,
  forge_day       TEXT    NOT NULL DEFAULT '',
  forge_bought    INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id            TEXT    PRIMARY KEY,
  player_id     INTEGER NOT NULL REFERENCES players(id),
  data          TEXT    NOT NULL,
  class         TEXT    NOT NULL DEFAULT 'butcher',
  equipped_slot TEXT,
  locked        INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS items_player ON items(player_id);
CREATE TABLE IF NOT EXISTS floor_progress (player_id INTEGER NOT NULL, floor INTEGER NOT NULL, stars INTEGER NOT NULL, PRIMARY KEY (player_id, floor));
CREATE TABLE IF NOT EXISTS pity (player_id INTEGER NOT NULL, code TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (player_id, code));
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY, player_id INTEGER NOT NULL, floor INTEGER NOT NULL, seed INTEGER NOT NULL, setup TEXT NOT NULL,
  free_energy INTEGER NOT NULL, status TEXT NOT NULL, response TEXT, created_at INTEGER NOT NULL, finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS battles_player ON battles(player_id, status);
CREATE TABLE IF NOT EXISTS counters (player_id INTEGER NOT NULL, period TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (player_id, period, key));
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL, currency TEXT NOT NULL, delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL, reason TEXT NOT NULL, ref TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_player ON ledger(player_id, created_at);
`;

export class SqliteStore implements Store {
  readonly dialect = "sqlite" as const;
  readonly db: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly inTx = new AsyncLocalStorage<true>();

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(SQLITE_SCHEMA);
    this.migrate();
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    return this.db.prepare(sql).get(...(params as never[])) as T | undefined;
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    this.db.prepare(sql).run(...(params as never[]));
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  /** One connection: transactions are queued so two requests never interleave inside BEGIN…COMMIT. */
  tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inTx.getStore()) return fn();
    const run = async () => {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const result = await this.inTx.run(true, fn);
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /** Additive, idempotent changes for databases created by older versions. */
  private migrate(): void {
    const cols = (table: string) => new Set((this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));
    if (!cols("players").has("class_chosen")) {
      this.db.exec("ALTER TABLE players ADD COLUMN class_chosen INTEGER NOT NULL DEFAULT 0");
      this.db.exec("UPDATE players SET class_chosen = 1 WHERE highest_floor > 0");
    }
    if (!cols("items").has("class")) {
      this.db.exec("ALTER TABLE items ADD COLUMN class TEXT NOT NULL DEFAULT 'butcher'");
      this.db.exec("UPDATE items SET class = (SELECT class FROM players WHERE players.id = items.player_id)");
    }
    this.db.exec("DROP INDEX IF EXISTS items_equipped");
    this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS items_equipped_class ON items(player_id, class, equipped_slot) WHERE equipped_slot IS NOT NULL");
    this.db.exec("CREATE INDEX IF NOT EXISTS items_player_class ON items(player_id, class)");
  }
}

// ───────────────────────── PostgreSQL ─────────────────────────

// Integer columns are BIGINT; return them as JS numbers (all values here fit in 2^53).
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id               BIGSERIAL PRIMARY KEY,
  telegram_id      BIGINT  NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  language         TEXT    NOT NULL DEFAULT 'en',
  class            TEXT    NOT NULL DEFAULT 'butcher',
  class_chosen     INTEGER NOT NULL DEFAULT 0,
  level            INTEGER NOT NULL DEFAULT 1,
  exp              BIGINT  NOT NULL DEFAULT 0,
  gold             BIGINT  NOT NULL DEFAULT 0,
  gems             BIGINT  NOT NULL DEFAULT 0,
  stones           BIGINT  NOT NULL DEFAULT 0,
  dust             BIGINT  NOT NULL DEFAULT 0,
  crystals         BIGINT  NOT NULL DEFAULT 0,
  cores            BIGINT  NOT NULL DEFAULT 0,
  energy           INTEGER NOT NULL DEFAULT 100,
  energy_at        BIGINT  NOT NULL,
  afk_last_claim   BIGINT  NOT NULL,
  afk_carry_stones DOUBLE PRECISION NOT NULL DEFAULT 0,
  afk_carry_dust   DOUBLE PRECISION NOT NULL DEFAULT 0,
  highest_floor    INTEGER NOT NULL DEFAULT 0,
  forge_day        TEXT    NOT NULL DEFAULT '',
  forge_bought     INTEGER NOT NULL DEFAULT 0,
  created_at       BIGINT  NOT NULL,
  last_seen_at     BIGINT  NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id            TEXT    PRIMARY KEY,
  player_id     BIGINT  NOT NULL REFERENCES players(id),
  data          TEXT    NOT NULL,
  class         TEXT    NOT NULL DEFAULT 'butcher',
  equipped_slot TEXT,
  locked        INTEGER NOT NULL DEFAULT 0,
  created_at    BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS items_player_class ON items(player_id, class);
CREATE UNIQUE INDEX IF NOT EXISTS items_equipped_class ON items(player_id, class, equipped_slot) WHERE equipped_slot IS NOT NULL;
CREATE TABLE IF NOT EXISTS floor_progress (player_id BIGINT NOT NULL, floor INTEGER NOT NULL, stars INTEGER NOT NULL, PRIMARY KEY (player_id, floor));
CREATE TABLE IF NOT EXISTS pity (player_id BIGINT NOT NULL, code TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (player_id, code));
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY, player_id BIGINT NOT NULL, floor INTEGER NOT NULL, seed BIGINT NOT NULL, setup TEXT NOT NULL,
  free_energy INTEGER NOT NULL, status TEXT NOT NULL, response TEXT, created_at BIGINT NOT NULL, finished_at BIGINT
);
CREATE INDEX IF NOT EXISTS battles_player ON battles(player_id, status);
CREATE TABLE IF NOT EXISTS counters (player_id BIGINT NOT NULL, period TEXT NOT NULL, key TEXT NOT NULL, n BIGINT NOT NULL DEFAULT 0, PRIMARY KEY (player_id, period, key));
CREATE TABLE IF NOT EXISTS ledger (
  id BIGSERIAL PRIMARY KEY, player_id BIGINT NOT NULL, currency TEXT NOT NULL, delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL, reason TEXT NOT NULL, ref TEXT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_player ON ledger(player_id, created_at);
`;

/** `?` → `$1, $2…` (our SQL never contains a literal question mark). */
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export class PgStore implements Store {
  readonly dialect = "postgres" as const;
  private readonly pool: pg.Pool;
  private readonly client = new AsyncLocalStorage<pg.PoolClient>();

  private constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  /** Connect, create the schema if needed, and return the store. `schema` isolates tests. */
  static async open(connectionString: string, schema?: string): Promise<PgStore> {
    const pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true,
      ssl: /sslmode=require|neon\.tech|supabase\.co/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
      options: schema ? `-c search_path=${schema}` : undefined,
    });
    if (schema) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await pool.query(PG_SCHEMA);
    return new PgStore(pool);
  }

  private q(): pg.Pool | pg.PoolClient {
    return this.client.getStore() ?? this.pool;
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    return (await this.q().query(toPg(sql), params)).rows[0] as T | undefined;
  }

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    return (await this.q().query(toPg(sql), params)).rows as T[];
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    await this.q().query(toPg(sql), params);
  }

  async exec(sql: string): Promise<void> {
    await this.q().query(sql);
  }

  async tx<T>(fn: () => Promise<T>): Promise<T> {
    if (this.client.getStore()) return fn();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const result = await this.client.run(c, fn);
      await c.query("COMMIT");
      return result;
    } catch (err) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** PostgreSQL when a URL is given, otherwise a SQLite file (or ":memory:"). */
export async function openStore(opts: { databaseUrl?: string; sqlitePath: string }): Promise<Store> {
  return opts.databaseUrl ? PgStore.open(opts.databaseUrl) : new SqliteStore(opts.sqlitePath);
}
