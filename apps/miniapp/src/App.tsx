import { useEffect, useRef, useState } from "react";
import { UNLOCK_LEVEL } from "@underworld/shared";
import { ICONS, navSprite, type NavIcon } from "./art/sprites/icons.ts";
import { SpriteImg } from "./art/Sprite.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { t } from "./i18n.ts";
import { BattleScreen } from "./screens/BattleScreen.tsx";
import { Hero } from "./screens/Hero.tsx";
import { CharacterSelect } from "./screens/CharacterSelect.tsx";
import { Home } from "./screens/Home.tsx";
import { Quests } from "./screens/Quests.tsx";
import { Shop } from "./screens/Shop.tsx";
import { useGame } from "./state.tsx";
import { UNLOCKS, UnlockModal, type Unlock } from "./tutorial.tsx";

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
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [questsOpen, setQuestsOpen] = useState(false);
  const prevLevel = useRef(player.level);

  // Introduce each feature the moment its level is reached (shown once back from battle).
  useEffect(() => {
    const from = prevLevel.current;
    prevLevel.current = player.level;
    if (player.level > from) {
      const fresh = UNLOCKS.filter((u) => u.level > from && u.level <= player.level);
      if (fresh.length) setUnlocks((q) => [...q, ...fresh]);
    }
  }, [player.level]);

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
      <TopBar onPortrait={() => setChangingClass(true)} />
      {questsOpen && <Quests onClose={() => setQuestsOpen(false)} />}
      {!questsOpen && tab === "abyss" && (
        <Home onFight={(floor) => setFighting({ floor, key: Date.now() })} onOpenHero={() => setTab("hero")} onOpenQuests={() => setQuestsOpen(true)} />
      )}
      {!questsOpen && tab === "hero" && <Hero onChangeClass={() => setChangingClass(true)} />}
      {!questsOpen && tab === "shop" && !locked && <Shop />}
      {!questsOpen && (tab === "pvp" || tab === "guild" || (tab === "shop" && locked)) && (
        <div className="locked-screen">
          <div>
            <SpriteImg sprite={locked ? ICONS.lock : navSprite(tab, false)} scale={6} />
            <p>{locked ? t("locked.level", { level: current.unlock }) : t("locked.soon")}</p>
          </div>
        </div>
      )}
      {unlocks[0] && (
        <UnlockModal
          unlock={unlocks[0]}
          onClose={() => setUnlocks((q) => q.slice(1))}
          onGo={() => {
            const go = unlocks[0]!.go;
            setUnlocks((q) => q.slice(1));
            if (go === "quests") {
              setTab("abyss");
              setQuestsOpen(true);
            } else if (go) setTab(go);
          }}
        />
      )}
      <nav className="nav">
        {TABS.map((x) => {
          const isLocked = player.level < x.unlock;
          return (
            <button
            key={x.id}
            className={tab === x.id ? "active" : ""}
            onClick={() => {
              setQuestsOpen(false);
              setTab(x.id);
            }}
          >
              <SpriteImg sprite={isLocked ? ICONS.lock : navSprite(x.id, tab === x.id)} scale={2} />
              {t(`nav.${x.id}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
