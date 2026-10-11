import { useEffect, useRef, useState } from "react";
import { useCountUp } from "../hooks/useCountUp.ts";
import { heroArt } from "../art/hero.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { short } from "../i18n.ts";
import { useGame } from "../state.tsx";

const REGEN_MS = 240_000;

/** Energy including points regenerated since the last server update. */
export function useLiveEnergy(): { energy: number; nextIn: string } {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  let energy = player.energy;
  let nextIn = "";
  if (player.energyNextAt && energy < player.energyMax) {
    const now = Date.now() + (player.serverTime - Date.now());
    const gained = Math.max(0, Math.floor((now - (player.energyNextAt - REGEN_MS)) / REGEN_MS));
    energy = Math.min(player.energyMax, energy + gained);
    if (energy < player.energyMax) {
      const left = Math.max(0, player.energyNextAt + gained * REGEN_MS - now);
      nextIn = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
    }
  }
  return { energy, nextIn };
}

/** Fixed resource bar from the style tile: portrait, segmented energy, gold, gems and the big Power number. */
export function TopBar({ onPortrait }: { onPortrait?: () => void }) {
  const { player } = useGame();
  const { energy, nextIn } = useLiveEnergy();
  const power = useCountUp(player.power, 900, false);
  const gold = useCountUp(player.gold, 600, false);
  // Floating "+N" whenever Power goes up.
  const prevPower = useRef(player.power);
  const [bump, setBump] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    const diff = player.power - prevPower.current;
    prevPower.current = player.power;
    if (diff > 0) setBump({ n: diff, key: Date.now() });
  }, [player.power]);
  const segments = 10;
  const lit = Math.round((Math.min(energy, player.energyMax) / player.energyMax) * segments);

  return (
    <div className="topbar">
      <div className="portrait" onClick={onPortrait} title="Switch hunter">
        <SpriteImg sprite={heroArt(player.classId, player.look).sprite} scale={3} />
        <div className="lv">Lv {player.level}</div>
      </div>
      <div className="chips">
        <span className="chip" title={nextIn ? `+1 in ${nextIn}` : undefined}>
          <SpriteImg sprite={ICONS.bolt} scale={2} />
          <span className="segbar">
            {Array.from({ length: segments }, (_, i) => (
              <i key={i} className={i < lit ? "on" : ""} />
            ))}
          </span>
          {energy}/{player.energyMax}
        </span>
        <span className="chip">
          <SpriteImg sprite={ICONS.coin} scale={1} />
          {short(gold)}
        </span>
        <span className="chip">
          <SpriteImg sprite={ICONS.gem} scale={1} />
          {short(player.gems)}
        </span>
      </div>
      <div className={`power ${bump ? "up" : ""}`} key={bump?.key ?? 0}>
        <SpriteImg sprite={ICONS.sword} scale={2} />
        <b>{power.toLocaleString("en-US")}</b>
        <small>POWER</small>
        {bump && <span className="bump">+{bump.n}</span>}
      </div>
    </div>
  );
}
