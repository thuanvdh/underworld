import { useEffect, useState } from "react";
import { HEROES } from "../art/sprites/characters.ts";
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
export function TopBar() {
  const { player } = useGame();
  const { energy, nextIn } = useLiveEnergy();
  const segments = 10;
  const lit = Math.round((Math.min(energy, player.energyMax) / player.energyMax) * segments);

  return (
    <div className="topbar">
      <div className="portrait">
        <SpriteImg sprite={HEROES[player.classId]} scale={3} />
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
          {short(player.gold)}
        </span>
        <span className="chip">
          <SpriteImg sprite={ICONS.gem} scale={1} />
          {short(player.gems)}
        </span>
      </div>
      <div className="power">
        <SpriteImg sprite={ICONS.sword} scale={2} />
        <b>{player.power.toLocaleString("en-US")}</b>
        <small>POWER</small>
      </div>
    </div>
  );
}
