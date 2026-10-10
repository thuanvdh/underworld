/**
 * One command to play UNDERWORLD inside real Telegram during development:
 *   1. build the Mini App
 *   2. start the API (it also serves the built Mini App)
 *   3. open an HTTPS tunnel with cloudflared (skipped if WEBAPP_URL is set)
 *   4. start the bot pointing its buttons and menu at the tunnel URL
 *
 * Usage: put BOT_TOKEN (and ideally SESSION_SECRET) in .env, then `npm run dev:telegram`.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.PORT ?? 3000);
const children: ChildProcess[] = [];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  shutdown(1);
}

function shutdown(code = 0): never {
  for (const c of children) if (!c.killed) c.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function run(name: string, cmd: string, args: string[], env: NodeJS.ProcessEnv = {}): ChildProcess {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = `[${name}]`.padEnd(8);
  const forward = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) if (line.trim()) console.log(`${prefix} ${line}`);
  };
  child.stdout?.on("data", forward);
  child.stderr?.on("data", forward);
  child.on("exit", (code) => {
    if (code !== null && code !== 0) fail(`${name} exited with code ${code}`);
  });
  children.push(child);
  return child;
}

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Start a cloudflared quick tunnel and resolve with its public https URL. */
function startTunnel(): Promise<string> {
  const probe = spawnSync("cloudflared", ["--version"], { stdio: "ignore" });
  if (probe.error) {
    fail(
      "cloudflared is not installed. Install it (macOS: `brew install cloudflared`) " +
        "or set WEBAPP_URL to any public https URL that forwards to http://localhost:" + PORT,
    );
  }
  return new Promise((resolve, reject) => {
    const child = spawn("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${PORT}`], { stdio: ["ignore", "pipe", "pipe"] });
    children.push(child);
    const timer = setTimeout(() => reject(new Error("cloudflared did not report a URL within 30s")), 30_000);
    const scan = (chunk: Buffer) => {
      const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk.toString());
      if (m) {
        clearTimeout(timer);
        resolve(m[0]);
      }
    };
    child.stdout?.on("data", scan);
    child.stderr?.on("data", scan);
    child.on("exit", (code) => reject(new Error(`cloudflared exited with code ${code}`)));
  });
}

if (!process.env.BOT_TOKEN) {
  fail("BOT_TOKEN is missing. Create a bot with @BotFather (/newbot), then add BOT_TOKEN=... to .env");
}
const sessionSecret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) console.warn("! SESSION_SECRET not set in .env — players must reopen the app after each restart.");

console.log("▶ Building Mini App…");
const build = spawnSync("npm", ["run", "build", "-w", "@underworld/miniapp"], { stdio: "inherit" });
if (build.status !== 0) fail("Mini App build failed");

console.log("▶ Starting API…");
run("api", process.execPath, ["apps/api/src/server.ts"], { SESSION_SECRET: sessionSecret, PORT: String(PORT), DEV_AUTH: "" });
if (!(await waitFor(`http://localhost:${PORT}/api/health`, 20_000))) fail("API did not start");

let webAppUrl = process.env.WEBAPP_URL ?? "";
if (!webAppUrl) {
  console.log("▶ Opening HTTPS tunnel (cloudflared)…");
  webAppUrl = await startTunnel().catch((e: Error) => fail(e.message));
  // New trycloudflare hostnames can take a while to resolve on the local resolver (it may even cache the first
  // miss), while Telegram's clients resolve them fine — so an unreachable check here is only a warning.
  if (!(await waitFor(`${webAppUrl}/api/health`, 20_000))) {
    console.warn(`! ${webAppUrl} doesn't resolve from this machine yet (local DNS cache). Telegram usually reaches it fine.`);
  }
}
webAppUrl = webAppUrl.replace(/\/?$/, "/");

console.log(`▶ Starting bot with Mini App at ${webAppUrl}`);
run("bot", process.execPath, ["apps/bot/src/main.ts"], { WEBAPP_URL: webAppUrl });

console.log(
  `\n✔ Ready. Open your bot in Telegram and send /start (or tap the "Play" menu button).\n` +
    `  Quick-tunnel URLs change on every run; the bot updates its buttons automatically.\n` +
    `  Ctrl+C stops everything.\n`,
);
