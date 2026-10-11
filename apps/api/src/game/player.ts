import type { ClassId } from "@underworld/shared";
import type { Store } from "../store.ts";

export type Currency = "gold" | "gems" | "stones" | "dust" | "crystals" | "cores";

export interface Player {
  id: number;
  telegramId: number;
  name: string;
  language: string;
  classId: ClassId;
  /** False until the player confirms a class on the character select screen. */
  classChosen: boolean;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  stones: number;
  dust: number;
  crystals: number;
  cores: number;
  energy: number;
  /** ms timestamp from which the next energy point is counted. */
  energyAt: number;
  afkLastClaim: number;
  afkCarryStones: number;
  afkCarryDust: number;
  highestFloor: number;
  forgeDay: string;
  forgeBought: number;
  createdAt: number;
  lastSeenAt: number;
}

interface Row {
  id: number;
  telegram_id: number;
  name: string;
  language: string;
  class: string;
  class_chosen: number;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  stones: number;
  dust: number;
  crystals: number;
  cores: number;
  energy: number;
  energy_at: number;
  afk_last_claim: number;
  afk_carry_stones: number;
  afk_carry_dust: number;
  highest_floor: number;
  forge_day: string;
  forge_bought: number;
  created_at: number;
  last_seen_at: number;
}

function fromRow(r: Row): Player {
  return {
    id: r.id,
    telegramId: r.telegram_id,
    name: r.name,
    language: r.language,
    classId: r.class as ClassId,
    classChosen: r.class_chosen === 1,
    level: r.level,
    exp: r.exp,
    gold: r.gold,
    gems: r.gems,
    stones: r.stones,
    dust: r.dust,
    crystals: r.crystals,
    cores: r.cores,
    energy: r.energy,
    energyAt: r.energy_at,
    afkLastClaim: r.afk_last_claim,
    afkCarryStones: r.afk_carry_stones,
    afkCarryDust: r.afk_carry_dust,
    highestFloor: r.highest_floor,
    forgeDay: r.forge_day,
    forgeBought: r.forge_bought,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  };
}

/**
 * Load a player. With `lock` inside a transaction on PostgreSQL the row is locked (FOR UPDATE), so two
 * concurrent requests for the same player run one after the other and can't double-spend.
 */
export async function findPlayer(db: Store, id: number, lock = false): Promise<Player | null> {
  const row = await db.get<Row>(`SELECT * FROM players WHERE id = ?${lock && db.dialect === "postgres" ? " FOR UPDATE" : ""}`, id);
  return row ? fromRow(row) : null;
}

export async function findPlayerByTelegram(db: Store, telegramId: number): Promise<Player | null> {
  const row = await db.get<Row>(`SELECT * FROM players WHERE telegram_id = ?${db.dialect === "postgres" ? " FOR UPDATE" : ""}`, telegramId);
  return row ? fromRow(row) : null;
}

export async function insertPlayer(db: Store, telegramId: number, name: string, language: string, now: number): Promise<Player> {
  const row = await db.get<Row>(
    `INSERT INTO players (telegram_id, name, language, energy_at, afk_last_claim, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (telegram_id) DO NOTHING RETURNING *`,
    telegramId,
    name,
    language,
    now,
    now,
    now,
    now,
  );
  // Two first logins racing: the loser reads the row the winner created.
  return row ? fromRow(row) : (await findPlayerByTelegram(db, telegramId))!;
}

export async function savePlayer(db: Store, p: Player): Promise<void> {
  await db.run(
    `UPDATE players SET name = ?, language = ?, class = ?, class_chosen = ?, level = ?, exp = ?, gold = ?, gems = ?, stones = ?,
       dust = ?, crystals = ?, cores = ?, energy = ?, energy_at = ?, afk_last_claim = ?, afk_carry_stones = ?,
       afk_carry_dust = ?, highest_floor = ?, forge_day = ?, forge_bought = ?, last_seen_at = ?
     WHERE id = ?`,
    p.name,
    p.language,
    p.classId,
    p.classChosen ? 1 : 0,
    p.level,
    p.exp,
    p.gold,
    p.gems,
    p.stones,
    p.dust,
    p.crystals,
    p.cores,
    p.energy,
    p.energyAt,
    p.afkLastClaim,
    p.afkCarryStones,
    p.afkCarryDust,
    p.highestFloor,
    p.forgeDay,
    p.forgeBought,
    p.lastSeenAt,
    p.id,
  );
}

/** Change a balance and write the ledger entry. Throws if the balance would go negative. */
export async function adjust(db: Store, p: Player, currency: Currency, delta: number, reason: string, ref: string | null, now: number): Promise<void> {
  if (delta === 0) return;
  const next = p[currency] + delta;
  if (next < 0) throw new Error(`negative ${currency} balance`);
  p[currency] = next;
  await db.run(
    "INSERT INTO ledger (player_id, currency, delta, balance_after, reason, ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    p.id,
    currency,
    delta,
    next,
    reason,
    ref,
    now,
  );
}
