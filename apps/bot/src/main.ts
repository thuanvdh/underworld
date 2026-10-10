import { configureBot, createBot } from "./bot.ts";

const token = process.env.BOT_TOKEN ?? "";
const webAppUrl = process.env.WEBAPP_URL ?? "";

if (!token) {
  console.error("BOT_TOKEN is missing. Create a bot with @BotFather and put the token in .env.");
  process.exit(1);
}
if (!webAppUrl.startsWith("https://")) {
  console.error("WEBAPP_URL must be a public https:// URL (Telegram only opens Mini Apps over HTTPS).");
  process.exit(1);
}

const bot = createBot({ token, webAppUrl });
await configureBot(bot, webAppUrl);

const stop = () => bot.stop();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

await bot.start({
  drop_pending_updates: true,
  onStart: (me) => console.log(`Bot @${me.username} is running. Mini App: ${webAppUrl}`),
});
