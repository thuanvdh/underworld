/** Thin wrapper over window.Telegram.WebApp so the app also runs in a normal browser during development. */
interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: { language_code?: string } };
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
  HapticFeedback?: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const tg = (): TelegramWebApp | undefined => window.Telegram?.WebApp;

export function initTelegram(): void {
  const app = tg();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor?.("#1c1c26");
  app.setBackgroundColor?.("#0e0e14");
  app.disableVerticalSwipes?.();
}

/** Signed initData from Telegram, or "" when opened outside Telegram. */
export function initData(): string {
  return tg()?.initData ?? "";
}

export function haptic(kind: "light" | "heavy" | "success" | "error"): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  if (kind === "success" || kind === "error") h.notificationOccurred(kind);
  else h.impactOccurred(kind);
}
