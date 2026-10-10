from html import escape

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from bot import db
from bot.keyboards import main_menu

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    name = escape(message.from_user.full_name)
    await message.answer(
        f"Xin chào <b>{name}</b>! 👋\n"
        "Mình là bot game. Bấm nút bên dưới để bắt đầu.\n\n"
        "/help — hướng dẫn\n/top — bảng xếp hạng",
        reply_markup=main_menu(),
    )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "<b>Đoán số</b>: bot nghĩ một số từ 1 đến 100, bạn gõ số để đoán.\n"
        "Bot sẽ gợi ý lớn hơn / nhỏ hơn. Đoán đúng càng ít lượt càng tốt!\n\n"
        "/play — bắt đầu ván mới\n/stop — bỏ ván đang chơi\n/top — bảng xếp hạng"
    )


@router.message(Command("top"))
async def cmd_top(message: Message) -> None:
    rows = await db.top_players()
    if not rows:
        await message.answer("Chưa có ai thắng. Hãy là người đầu tiên! /play")
        return
    medals = ["🥇", "🥈", "🥉"]
    lines = [
        f"{medals[i] if i < 3 else f'{i + 1}.'} {escape(name)} — {wins} thắng, "
        f"tốt nhất {best} lượt"
        for i, (name, wins, best) in enumerate(rows)
    ]
    await message.answer("<b>🏆 Bảng xếp hạng</b>\n\n" + "\n".join(lines))
