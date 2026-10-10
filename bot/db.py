import aiosqlite

from bot.config import DB_PATH


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS players (
                user_id       INTEGER PRIMARY KEY,
                name          TEXT    NOT NULL,
                wins          INTEGER NOT NULL DEFAULT 0,
                best_attempts INTEGER
            )
            """
        )
        await db.commit()


async def record_win(user_id: int, name: str, attempts: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO players (user_id, name, wins, best_attempts)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                wins = wins + 1,
                best_attempts = MIN(COALESCE(best_attempts, excluded.best_attempts),
                                    excluded.best_attempts)
            """,
            (user_id, name, attempts),
        )
        await db.commit()


async def top_players(limit: int = 10) -> list[tuple[str, int, int]]:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT name, wins, best_attempts FROM players "
            "ORDER BY wins DESC, best_attempts ASC LIMIT ?",
            (limit,),
        )
        return list(await cursor.fetchall())
