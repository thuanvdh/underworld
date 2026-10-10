import { DatabaseSync } from "node:sqlite";

/**
 * Dev storage on SQLite (built into Node). The schema mirrors detailed design §22 closely enough to move
 * to PostgreSQL later; every write that touches balances or items runs inside `tx()`.
 */
export type Db = DatabaseSync;

const SCHEMA = `
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

CREATE TABLE IF NOT EXISTS floor_progress (
  player_id INTEGER NOT NULL,
  floor     INTEGER NOT NULL,
  stars     INTEGER NOT NULL,
  PRIMARY KEY (player_id, floor)
);

CREATE TABLE IF NOT EXISTS pity (
  player_id INTEGER NOT NULL,
  code      TEXT    NOT NULL,
  value     INTEGER NOT NULL,
  PRIMARY KEY (player_id, code)
);

CREATE TABLE IF NOT EXISTS battles (
  id          TEXT    PRIMARY KEY,
  player_id   INTEGER NOT NULL,
  floor       INTEGER NOT NULL,
  seed        INTEGER NOT NULL,
  setup       TEXT    NOT NULL,
  free_energy INTEGER NOT NULL,
  status      TEXT    NOT NULL,
  response    TEXT,
  created_at  INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS battles_player ON battles(player_id, status);

-- Generic per-period counters: quest progress, claims, daily purchase limits, login calendar.
-- period: "d:YYYY-MM-DD", "w:YYYY-Www" or "life".
CREATE TABLE IF NOT EXISTS counters (
  player_id INTEGER NOT NULL,
  period    TEXT    NOT NULL,
  key       TEXT    NOT NULL,
  n         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, period, key)
);

CREATE TABLE IF NOT EXISTS ledger (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id     INTEGER NOT NULL,
  currency      TEXT    NOT NULL,
  delta         INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason        TEXT    NOT NULL,
  ref           TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_player ON ledger(player_id, created_at);
`;

export function openDb(path: string): Db {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Additive, idempotent schema changes for databases created by older versions. */
function migrate(db: Db): void {
  const cols = new Set((db.prepare("PRAGMA table_info(players)").all() as { name: string }[]).map((c) => c.name));
  if (!cols.has("class_chosen")) {
    db.exec("ALTER TABLE players ADD COLUMN class_chosen INTEGER NOT NULL DEFAULT 0");
    // Anyone who already fought has effectively picked their class.
    db.exec("UPDATE players SET class_chosen = 1 WHERE highest_floor > 0");
  }
  // Per-class bags: every item belongs to one class; each class equips its own set.
  const itemCols = new Set((db.prepare("PRAGMA table_info(items)").all() as { name: string }[]).map((c) => c.name));
  if (!itemCols.has("class")) {
    db.exec("ALTER TABLE items ADD COLUMN class TEXT NOT NULL DEFAULT 'butcher'");
    db.exec("UPDATE items SET class = (SELECT class FROM players WHERE players.id = items.player_id)");
  }
  db.exec("DROP INDEX IF EXISTS items_equipped");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS items_equipped_class ON items(player_id, class, equipped_slot) WHERE equipped_slot IS NOT NULL");
  db.exec("CREATE INDEX IF NOT EXISTS items_player_class ON items(player_id, class)");
}

/** Run `fn` in a write transaction; rolls back on any throw. */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
