import { useState } from "react";
import { UNLOCK_LEVEL } from "@underworld/shared";
import { ICONS, navSprite, type NavIcon } from "./art/sprites/icons.ts";
import { SpriteImg } from "./art/Sprite.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { t } from "./i18n.ts";
import { BattleScreen } from "./screens/BattleScreen.tsx";
import { Hero } from "./screens/Hero.tsx";
import { CharacterSelect } from "./screens/CharacterSelect.tsx";
import { Home } from "./screens/Home.tsx";
import { useGame } from "./state.tsx";

type Tab = NavIcon;

const TABS: { id: Tab; unlock: number }[] = [
  { id: "abyss", unlock: 1 },
  { id: "hero", unlock: 1 },
  { id: "pvp", unlock: UNLOCK_LEVEL.arena },
  { id: "guild", unlock: UNLOCK_LEVEL.guild },
  { id: "shop", unlock: UNLOCK_LEVEL.shop },
];

export function App() {
  const { player } = useGame();
  const [tab, setTab] = useState<Tab>("abyss");
  const [fighting, setFighting] = useState<{ floor: number; key: number } | null>(null);
  const [changingClass, setChangingClass] = useState(false);

  // New players pick a hunter before anything else.
  if (!player.classChosen) {
    return (
      <div className="app">
        <CharacterSelect mode="first" onDone={() => setTab("abyss")} />
      </div>
    );
  }
  if (changingClass) {
    return (
      <div className="app">
        <CharacterSelect mode="change" onDone={() => setChangingClass(false)} onCancel={() => setChangingClass(false)} />
      </div>
    );
  }

  if (fighting) {
    return (
      <div className="app">
        <BattleScreen
          key={fighting.key}
          floor={fighting.floor}
          onExit={(next) => setFighting(next ? { floor: next, key: fighting.key + 1 } : null)}
        />
      </div>
    );
  }

  const current = TABS.find((x) => x.id === tab)!;
  const locked = player.level < current.unlock;

  return (
    <div className="app">
      <TopBar />
      {tab === "abyss" && <Home onFight={(floor) => setFighting({ floor, key: Date.now() })} onOpenHero={() => setTab("hero")} />}
      {tab === "hero" && <Hero onChangeClass={() => setChangingClass(true)} />}
      {(tab === "pvp" || tab === "guild" || tab === "shop") && (
        <div className="locked-screen">
          <div>
            <SpriteImg sprite={locked ? ICONS.lock : navSprite(tab, false)} scale={6} />
            <p>{locked ? t("locked.level", { level: current.unlock }) : t("locked.soon")}</p>
          </div>
        </div>
      )}
      <nav className="nav">
        {TABS.map((x) => {
          const isLocked = player.level < x.unlock;
          return (
            <button key={x.id} className={tab === x.id ? "active" : ""} onClick={() => setTab(x.id)}>
              <SpriteImg sprite={isLocked ? ICONS.lock : navSprite(x.id, tab === x.id)} scale={2} />
              {t(`nav.${x.id}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
