import random

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from bot import db
from bot.keyboards import PLAY_GUESS, play_again

router = Router()

MIN_NUMBER, MAX_NUMBER = 1, 100


class GuessGame(StatesGroup):
    playing = State()


async def start_game(message: Message, state: FSMContext) -> None:
    await state.set_state(GuessGame.playing)
    await state.update_data(secret=random.randint(MIN_NUMBER, MAX_NUMBER), attempts=0)
    await message.answer(
        f"🎲 Mình đã nghĩ ra một số từ {MIN_NUMBER} đến {MAX_NUMBER}. Đoán đi!\n"
        "(/stop để bỏ cuộc)"
    )


@router.message(Command("play"))
async def cmd_play(message: Message, state: FSMContext) -> None:
    await start_game(message, state)


@router.callback_query(F.data == PLAY_GUESS)
async def cb_play(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await start_game(callback.message, state)


@router.message(GuessGame.playing, Command("stop"))
async def cmd_stop(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await state.clear()
    await message.answer(f"Đã dừng. Số đúng là <b>{data['secret']}</b>.", reply_markup=play_again())


@router.message(GuessGame.playing, F.text)
async def on_guess(message: Message, state: FSMContext) -> None:
    text = message.text.strip()
    if not text.lstrip("-").isdigit():
        await message.answer("Hãy gửi một con số nhé 🙂")
        return

    guess = int(text)
    if not MIN_NUMBER <= guess <= MAX_NUMBER:
        await message.answer(f"Số phải nằm trong khoảng {MIN_NUMBER}–{MAX_NUMBER}.")
        return

    data = await state.get_data()
    secret, attempts = data["secret"], data["attempts"] + 1
    await state.update_data(attempts=attempts)

    if guess < secret:
        await message.answer(f"⬆️ Lớn hơn {guess}! (lượt {attempts})")
    elif guess > secret:
        await message.answer(f"⬇️ Nhỏ hơn {guess}! (lượt {attempts})")
    else:
        await state.clear()
        user = message.from_user
        await db.record_win(user.id, user.full_name, attempts)
        await message.answer(
            f"🎉 Chính xác! Số là <b>{secret}</b>. Bạn đoán trúng sau <b>{attempts}</b> lượt.\n"
            "Xem bảng xếp hạng: /top",
            reply_markup=play_again(),
        )
