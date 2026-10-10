# UNDERWORLD: Loot & Raid

Telegram Mini App loot RPG. Design docs live in [`docs/`](docs/):

- [`underworld_gdd.md`](docs/underworld_gdd.md) — game design document
- [`underworld_detailed_design.md`](docs/underworld_detailed_design.md) — numbers, screens, bot, data model, API, simulation results

## Code layout

| Path | What |
|---|---|
| `packages/shared` | Game data (classes, chapters, items, economy) and formulas: item generation, enhancement, hero stats, Power, rewards, seeded RNG |
| `packages/combat` | Deterministic tick-based battle engine. The client drives it live; the server replays the client's inputs with `simulate()` and trusts only its own result |
| `apps/api` | HTTP API (Fastify). Telegram login, dungeon start/finish with server-side replay, AFK, items, forge. Dev storage: SQLite via `node:sqlite` |
| `apps/miniapp` | Telegram Mini App (React + Vite). Home, live battle (pixel Canvas 2D renderer over the real engine), hero/gear screen. Art system in `src/art/` |
| `apps/bot` | Telegram bot (grammY): `/start`, `/play`, `/help`, Mini App button + chat menu button, referral pass-through |
| `tools/sim` | Economy simulation: virtual players play the real engine and reward tables for N days |
| `bot/` | Earlier Python demo bot (number guessing), not part of UNDERWORLD |

## Requirements

Node.js 23.6+ (TypeScript runs natively via type stripping, no build step).

```bash
npm install
npm test          # unit + API tests (determinism, replay, timing, items, rewards, auth, dungeon flow)
npm run typecheck
npm run sim -- --players 300 --days 30 --seed 1   # writes sim-report.json
```

## Run locally

```bash
DEV_AUTH=1 SESSION_SECRET=dev npm run api   # API on :3000, SQLite file underworld.db
npm run miniapp                            # Mini App on :5173, proxies /api to :3000
```

Open http://localhost:5173 in a browser (phone-sized window). Outside Telegram the app logs in as a random dev user
(`DEV_AUTH=1` only — never enable it in production).

## Play inside Telegram

1. Create a bot: open [@BotFather](https://t.me/BotFather), send `/newbot`, copy the token.
2. `cp .env.example .env`, then fill in `BOT_TOKEN` and `SESSION_SECRET` (`openssl rand -hex 32`).
3. Install cloudflared once (macOS: `brew install cloudflared`) — Telegram only opens Mini Apps over HTTPS.
4. Run:

   ```bash
   npm run dev:telegram
   ```

   It builds the Mini App, starts the API (which also serves the Mini App), opens a free `trycloudflare.com`
   HTTPS tunnel and starts the bot with that URL. Open your bot in Telegram → `/start` → **⚔️ Play now**, or tap the
   **Play** menu button next to the message box.

Already have a public HTTPS URL that forwards to the API port? Set `WEBAPP_URL` and no tunnel is opened.
Stop the old Python demo bot (`bot/`) if it runs with the same token — two pollers on one token conflict.

| Env var | Purpose |
|---|---|
| `BOT_TOKEN` | Verifies Mini App `initData` |
| `SESSION_SECRET` | Signs session tokens (set it, or sessions reset on restart) |
| `DB_PATH` | SQLite path (default `underworld.db`) |
| `DEV_AUTH=1` | Allow `{ devUserId }` logins for local dev |
| `PORT` | API port (default 3000) |
| `WEBAPP_URL` | Public https URL of the Mini App (bot buttons + menu); optional with `dev:telegram` |
| `MINIAPP_DIST` | Built Mini App folder the API serves (default `apps/miniapp/dist`) |

## Determinism rules for `packages/combat`

- Integer math only (stats are integers, percentages are basis points: 10000 = 100%).
- All randomness comes from the battle's seeded `Rng`, in a fixed call order.
- No `Math.pow`/`Math.sqrt` inside combat — enemy stats are computed by `buildDungeonSetup` on the server and shipped inside the setup.
- Any change to combat logic must keep `npm test` green, in particular the "server replay matches exactly" test.

## Deploy (Render)

The repo ships a `Dockerfile` (API + Mini App + bot in one process) and a `render.yaml` Blueprint.

1. Render dashboard → **New → Blueprint** → connect GitHub → pick this repo. Render reads `render.yaml`.
2. When asked, paste **`BOT_TOKEN`** (from @BotFather). `SESSION_SECRET` is generated automatically.
3. Deploy. Render gives the service an `https://<name>.onrender.com` URL and sets `RENDER_EXTERNAL_URL`;
   on start the app points the bot's webhook, buttons and menu at it. Open the bot → `/start`.
4. Stop `npm run dev:telegram` locally first — the same token can't be used by two places at once.

Every push to `main` redeploys. Player data lives on the 1 GB disk at `/data`, with snapshots in
`/data/backups` every 6 hours (last 8 kept).

**Plans:** `starter` (in `render.yaml`) keeps the game awake and allows the disk. On `free` the service sleeps
after 15 minutes (first message wakes it in ~1 min) and has **no disk — player data resets on every deploy**;
to try it anyway, change `plan: free` and delete the `disk:` block.

Other hosts: any Docker host works — `docker build -t underworld . && docker run -p 3000:3000 -v data:/data
-e BOT_TOKEN=… -e SESSION_SECRET=… -e PUBLIC_URL=https://your.domain underworld`, behind HTTPS.
Set `BOT_MODE=polling` if the host can't receive webhooks.

## Deviations from the design docs (deliberate, for the first slice)

- **Fastify instead of NestJS:** Node runs TypeScript natively here, and NestJS decorators need a build step.
- **SQLite (`node:sqlite`) instead of PostgreSQL** for local dev: zero setup. The schema follows detailed design §22;
  moving to PostgreSQL is a storage swap in `apps/api/src/db.ts` + `game/player.ts`.
- **Canvas 2D instead of PixiJS** for the battle view: smaller bundle (86 KB gzip total); switch when real sprite art lands.
- **Code-drawn pixel art** following `UNDERWORLD Art Style Tile.pdf`: sprites are character grids in
  `apps/miniapp/src/art/sprites/`, chapter backdrops are procedural (`art/scene.ts`) from the tile's 5-step ramps.
  Replace grids with real artist sprite sheets later; open `http://localhost:5173/#gallery` (dev) to review all art.
