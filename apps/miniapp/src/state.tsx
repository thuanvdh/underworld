import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, login, type PlayerView } from "./api.ts";
import { errorText } from "./i18n.ts";
import { haptic } from "./telegram.ts";

interface GameState {
  player: PlayerView;
  setPlayer: (p: PlayerView) => void;
  /** Run an API call; shows a toast on failure and returns null. */
  run: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

const Ctx = createContext<GameState | null>(null);

export function useGame(): GameState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame outside provider");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    login().then(setPlayer, (e: unknown) => setFatal(e instanceof ApiError ? errorText(e.code) : String(e)));
  }, []);

  const toast = useCallback((msg: string) => {
    setError(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setError(null), 2500);
  }, []);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (e) {
        haptic("error");
        toast(e instanceof ApiError ? errorText(e.code) : errorText("network"));
        return null;
      }
    },
    [toast],
  );

  const value = useMemo(() => (player ? { player, setPlayer, run } : null), [player, run]);

  if (fatal) return <div className="locked-screen">{fatal}</div>;
  if (!value) return <div className="splash">UNDERWORLD</div>;
  return (
    <Ctx.Provider value={value}>
      {children}
      {error && <div className="toast">{error}</div>}
    </Ctx.Provider>
  );
}
