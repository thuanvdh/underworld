import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Update } from "grammy/types";
import { createBot, webAppLink } from "../src/bot.ts";

const WEBAPP = "https://play.example.com/";

/** A bot whose outgoing API calls are captured instead of sent. */
function harness() {
  const bot = createBot({
    token: "1:TEST",
    webAppUrl: WEBAPP,
    botInfo: {
      id: 1,
      is_bot: true,
      first_name: "Underworld",
      username: "UnderworldLootBot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
      can_manage_bots: false,
      supports_join_request_queries: false,
    },
  });
  const calls: { method: string; payload: Record<string, any> }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, any> });
    return { ok: true, result: true } as never;
  });
  return { bot, calls };
}

function command(text: string, chatType: "private" | "group" = "private"): Update {
  const entityLength = text.split(" ")[0]!.length;
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: chatType === "private" ? { id: 10, type: "private", first_name: "Ryn" } : { id: -5, type: "group", title: "Black Dragons" },
      from: { id: 10, is_bot: false, first_name: "Ryn" },
      text,
      entities: [{ type: "bot_command", offset: 0, length: entityLength }],
    },
  };
}

describe("bot", () => {
  it("/start replies with a button that opens the Mini App", async () => {
    const { bot, calls } = harness();
    await bot.handleUpdate(command("/start"));
    const msg = calls.find((c) => c.method === "sendMessage")!;
    assert.match(msg.payload.text, /Welcome to the Undercity/);
    assert.equal(msg.payload.reply_markup.inline_keyboard[0][0].web_app.url, WEBAPP);
  });

  it("/start ref_123 carries the referral into the Mini App URL", async () => {
    const { bot, calls } = harness();
    await bot.handleUpdate(command("/start ref_123"));
    const url = calls[0]!.payload.reply_markup.inline_keyboard[0][0].web_app.url as string;
    assert.equal(new URL(url).searchParams.get("ref"), "123");
  });

  it("ignores malformed referral payloads", async () => {
    const { bot, calls } = harness();
    await bot.handleUpdate(command("/start ref_<script>"));
    assert.equal(calls[0]!.payload.reply_markup.inline_keyboard[0][0].web_app.url, WEBAPP);
  });

  it("in groups, /play deep-links to the private chat instead of a web_app button", async () => {
    const { bot, calls } = harness();
    await bot.handleUpdate(command("/play@UnderworldLootBot", "group"));
    const button = calls[0]!.payload.reply_markup.inline_keyboard[0][0];
    assert.equal(button.web_app, undefined);
    assert.equal(button.url, "https://t.me/UnderworldLootBot?start=play");
  });

  it("webAppLink keeps the base URL when there is no referral", () => {
    assert.equal(webAppLink(WEBAPP), WEBAPP);
  });
});
