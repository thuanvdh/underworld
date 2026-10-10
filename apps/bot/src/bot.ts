import { Bot, InlineKeyboard, type Context } from "grammy";
import type { UserFromGetMe } from "grammy/types";

export interface BotConfig {
  token: string;
  /** Public HTTPS URL of the Mini App. */
  webAppUrl: string;
  /** Pre-filled bot identity, so tests can run without calling getMe. */
  botInfo?: UserFromGetMe;
}

// Message copy from detailed design §21.2 (English is the source language).
const TEXT = {
  welcome: "🕳️ <b>Welcome to the Undercity, Hunter.</b>\nMonsters below. Loot everywhere. Rivals who want your stash.",
  play: "⚔️ Play now",
  playGroup: "⚔️ Play UNDERWORLD",
  groupHint: "Mini Apps open in a private chat with me — tap below.",
  help:
    "<b>UNDERWORLD: Loot &amp; Raid</b>\n" +
    "Descend into the Abyss, grab loot, get stronger.\n\n" +
    "/play — open the game\n/help — this message",
  menu: "Play",
} as const;

/** Mini App URL with the referral code carried through (`/start ref_123` → `?ref=123`). */
export function webAppLink(base: string, ref?: string): string {
  if (!ref) return base;
  const url = new URL(base);
  url.searchParams.set("ref", ref);
  return url.toString();
}

function parseRef(payload: string | undefined): string | undefined {
  const m = /^ref_(\d{1,20})$/.exec(payload ?? "");
  return m?.[1];
}

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.token, config.botInfo ? { botInfo: config.botInfo } : {});

  const playKeyboard = (ctx: Context, ref?: string) => {
    // web_app buttons only work in private chats; in groups, deep-link to the private chat instead.
    if (ctx.chat?.type === "private") return new InlineKeyboard().webApp(TEXT.play, webAppLink(config.webAppUrl, ref));
    return new InlineKeyboard().url(TEXT.playGroup, `https://t.me/${ctx.me.username}?start=play`);
  };

  bot.command("start", async (ctx) => {
    const ref = parseRef(ctx.match);
    await ctx.reply(TEXT.welcome, { parse_mode: "HTML", reply_markup: playKeyboard(ctx, ref) });
  });

  bot.command("play", async (ctx) => {
    const text = ctx.chat.type === "private" ? TEXT.play : TEXT.groupHint;
    await ctx.reply(text, { reply_markup: playKeyboard(ctx) });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(TEXT.help, { parse_mode: "HTML", reply_markup: playKeyboard(ctx) });
  });

  bot.catch((err) => {
    console.error(`Update ${err.ctx.update.update_id} failed:`, err.error);
  });

  return bot;
}

/** One-time bot setup: command list and the chat menu button that opens the Mini App. */
export async function configureBot(bot: Bot, webAppUrl: string): Promise<void> {
  await bot.api.setMyCommands([
    { command: "play", description: "Open UNDERWORLD" },
    { command: "help", description: "How to play" },
  ]);
  await bot.api.setChatMenuButton({ menu_button: { type: "web_app", text: TEXT.menu, web_app: { url: webAppUrl } } });
}
