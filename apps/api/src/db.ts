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
  equipped_slot TEXT,
  locked        INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS items_player ON items(player_id);
CREATE UNIQUE INDEX IF NOT EXISTS items_equipped ON items(player_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

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
  return db;
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
