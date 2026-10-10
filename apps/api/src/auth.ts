import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Verify Mini App initData as Telegram documents it: HMAC-SHA256 over the sorted `key=value` lines
 * (without `hash`), keyed by HMAC-SHA256("WebAppData", botToken). Returns the user or null.
 */
export function verifyInitData(initData: string, botToken: string, maxAgeSeconds: number, nowSeconds: number): TelegramUser | null {
  if (!botToken || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (expected.length !== hash.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || nowSeconds - authDate > maxAgeSeconds) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "null") as TelegramUser | null;
    return user && typeof user.id === "number" ? user : null;
  } catch {
    return null;
  }
}

const SESSION_TTL_SECONDS = 12 * 3600;

/** Session token: `<playerId>.<expiresAt>.<hmac>` — short-lived, re-issued from initData on app open. */
export function signSession(playerId: number, secret: string, nowSeconds: number): string {
  const exp = nowSeconds + SESSION_TTL_SECONDS;
  const body = `${playerId}.${exp}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function verifySession(token: string, secret: string, nowSeconds: number): number | null {
  const [pid, exp, sig] = token.split(".");
  if (!pid || !exp || !sig) return null;
  const expected = createHmac("sha256", secret).update(`${pid}.${exp}`).digest("base64url");
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  if (Number(exp) < nowSeconds) return null;
  const id = Number(pid);
  return Number.isInteger(id) && id > 0 ? id : null;
}
