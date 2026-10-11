import { useEffect, useRef } from "react";
import { CHAPTERS, RARITIES, SLOTS, type Item } from "@underworld/shared";
import { backdrop } from "../art/scene.ts";
import { heroArt } from "../art/hero.ts";
import { HEROES, enemyScale, enemySprite } from "../art/sprites/characters.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { ItemIcon } from "../components/ItemIcon.tsx";
import { LootRow } from "../components/RewardSheet.tsx";
import { CLASS_NAMES, RARITY_NAMES } from "../i18n.ts";

/** Dev-only art sheet (open /#gallery): every frame, sprite and chapter backdrop on one page. */
export function Gallery() {
  const fake = (rarity: Item["rarity"], slot: Item["slot"], enhance = 0): Item => ({
    id: `${rarity}-${slot}`,
    classId: (["butcher", "gunslinger", "hexer"] as const)[rarity.length % 3]!,
    slot,
    rarity,
    ilvl: 10,
    setCode: null,
    main: [],
    substats: [],
    legendaryEffect: rarity === "legendary" ? "bloodthirst" : null,
    enhance,
    luck: 0,
  });

  return (
    <div className="screen" style={{ height: "100%" }}>
      <div className="panel">
        <div className="label">Rarity frames</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14, alignItems: "end" }}>
          {RARITIES.map((r, i) => (
            <div key={r} style={{ textAlign: "center" }}>
              <ItemIcon item={fake(r, SLOTS[i % SLOTS.length]!, i * 3)} size="lg" />
              <div className={`pixel r-${r}`} style={{ marginTop: 6 }}>
                {RARITY_NAMES[r]}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, filter: "grayscale(1)" }}>
          {RARITIES.map((r) => (
            <ItemIcon key={r} item={fake(r, "weapon")} size="sm" />
          ))}
          <span className="muted" style={{ alignSelf: "center" }}>grayscale check</span>
        </div>
      </div>

      <div className="panel" id="loot">
        <div className="label">Loot reveal</div>
        <LootRow
          rewards={{ gold: 12450, exp: 3200, stones: 6, gems: 20, dust: 0, autoSalvaged: 0, levelFrom: 9, levelTo: 10, items: RARITIES.map((r, i) => fake(r, SLOTS[i]!)) }}
        />
      </div>

      <div className="panel" id="paperdoll">
        <div className="label">Paper-doll · full sets by rarity</div>
        {(["butcher", "gunslinger", "hexer"] as const).map((c) => (
          <div key={c} style={{ display: "flex", gap: 6, alignItems: "end", marginTop: 10, flexWrap: "wrap" }}>
            {[undefined, ...RARITIES].map((r) => {
              const look = r ? Object.fromEntries(SLOTS.map((s) => [s, r])) : {};
              const art = heroArt(c, look);
              return (
                <div key={r ?? "none"} style={{ textAlign: "center" }}>
                  <SpriteImg sprite={art.sprite} scale={2} />
                  <div className={`r-${r ?? "common"}`} style={{ fontSize: 9 }}>
                    {r ?? "bare"}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="label">Heroes</div>
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          {Object.entries(HEROES).map(([k, s]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <SpriteImg sprite={s} scale={4} />
              <div className="label small">{CLASS_NAMES[k as keyof typeof CLASS_NAMES]}</div>
            </div>
          ))}
        </div>
      </div>

      {CHAPTERS.map((ch) => (
        <div key={ch.key} className="panel">
          <div className="label">
            CH.{ch.number} · {ch.key}
          </div>
          <Backdrop chapter={ch.key} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "end", marginTop: 10 }}>
            {[...ch.monsters, ch.elite, `${ch.key}_boss`, ch.boss].map((k, i) => (
              <div key={k} style={{ textAlign: "center" }}>
                <SpriteImg sprite={enemySprite(k)} scale={i >= 4 ? 2 * enemyScale(i === 5 ? "chapterBoss" : "boss") : 3} flip />
                <div className="muted" style={{ fontSize: 10 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="panel">
        <div className="label">Icons</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
          {Object.entries(ICONS).map(([k, s]) => (
            <SpriteImg key={k} sprite={s} scale={3} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Backdrop({ chapter }: { chapter: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const bg = backdrop(chapter, 120, 70);
    cv.width = 120;
    cv.height = 70;
    cv.getContext("2d")!.drawImage(bg.canvas, 0, 0);
  }, [chapter]);
  return <canvas ref={ref} className="px" style={{ width: 360, height: 210, marginTop: 8, maxWidth: "100%" }} />;
}
