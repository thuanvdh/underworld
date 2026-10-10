import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

from bot.config import BOT_TOKEN
from bot.db import init_db
from bot.handlers import common, guess


async def main() -> None:
    if not BOT_TOKEN:
        raise SystemExit("Thiếu BOT_TOKEN — hãy tạo file .env từ .env.example")

    await init_db()

    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_routers(common.router, guess.router)

    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Bắt đầu"),
            BotCommand(command="play", description="Chơi Đoán số"),
            BotCommand(command="stop", description="Bỏ ván đang chơi"),
            BotCommand(command="top", description="Bảng xếp hạng"),
            BotCommand(command="help", description="Hướng dẫn"),
        ]
    )
    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
