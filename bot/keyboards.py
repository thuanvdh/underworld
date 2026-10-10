from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

PLAY_GUESS = "play_guess"


def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎮 Chơi Đoán số", callback_data=PLAY_GUESS)],
        ]
    )


def play_again() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔁 Chơi lại", callback_data=PLAY_GUESS)],
        ]
    )
