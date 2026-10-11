import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ILVL_OVER_LEVEL,
  MAX_ENHANCE,
  UNLOCK_LEVEL,
  buildHero,
  enhanceChanceBp,
  enhanceCost,
  enhancedMain,
  power,
  type ClassId,
  type Equipment,
  type Item,
  type Look,
  type Slot,
} from "@underworld/shared";
import { api } from "../api.ts";
import { heroArt, tierColor } from "../art/hero.ts";
import { CLASS_COLOR, ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { ItemIcon } from "../components/ItemIcon.tsx";
import { CLASS_NAMES, RARITY_NAMES, SET_NAMES, SLOT_NAMES, itemName, short, statLine, t } from "../i18n.ts";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

const LEGENDARY_TEXT: Record<string, string> = {
  bloodthirst: "10% chance on hit to strike again",
  iron_will: "+10% HP",
  thorns: "Reflect 8% of damage taken",
  quick_grip: "+25% skill energy",
  shadowstep: "10% chance to dodge attacks",
  abyss_heart: "Start battles with 50 skill energy",
};

const LEFT: Slot[] = ["weapon", "helmet", "armor"];
const RIGHT: Slot[] = ["gloves", "boots", "amulet"];

export function Hero({ onChangeClass }: { onChangeClass: () => void }) {
  const { player, setPlayer, run } = useGame();
  const [equipped, setEquipped] = useState<Equipment>({});
  const [bag, setBag] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string; key: number } | null>(null);

  const reload = useCallback(async () => {
    const r = await run(api.items);
    if (!r) return;
    setEquipped(r.equipped);
    setBag(r.bag);
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Power change if this item replaced what's in its slot (with the free 80% enhancement transfer). */
  const delta = useCallback(
    (item: Item) => {
      const current = equipped[item.slot];
      const carried = current ? Math.max(item.enhance, Math.floor((current.enhance * 8) / 10)) : item.enhance;
      const swapped = { ...equipped, [item.slot]: { ...item, enhance: carried } };
      return power(buildHero(player.classId, player.level, swapped).stats) - player.power;
    },
    [equipped, player.classId, player.level, player.power],
  );

  const sortedBag = useMemo(() => [...bag].map((it) => ({ it, d: delta(it) })).sort((a, b) => b.d - a.d), [bag, delta]);
  const isEquipped = (item: Item) => equipped[item.slot]?.id === item.id;

  const equip = async (item: Item) => {
    const p = await run(() => api.equip(item.id));
    if (!p) return;
    haptic("light");
    setPlayer(p);
    setSelected(null);
    reload();
  };

  const enhance = async (item: Item) => {
    const r = await run(() => api.enhance(item.id));
    if (!r) return;
    haptic(r.success ? "success" : "error");
    setFlash({ ok: r.success, text: r.success ? t("item.success") : t("item.fail"), key: Date.now() });
    window.setTimeout(() => setFlash(null), 1400);
    setPlayer(r.player);
    setSelected(r.item);
    reload();
  };

  const salvage = async (ids: string[]) => {
    if (ids.length === 0) return;
    const r = await run(() => api.salvage(ids));
    if (!r) return;
    setPlayer(r.player);
    setSelected(null);
    reload();
  };

  const junk = bag.filter((it) => (it.rarity === "common" || it.rarity === "uncommon") && delta(it) <= 0).map((it) => it.id);
  const forgeOpen = player.level >= UNLOCK_LEVEL.enhance;
  const slotButton = (slot: Slot) => (
    <button key={slot} className="slot-btn" onClick={() => equipped[slot] && setSelected(equipped[slot]!)} title={SLOT_NAMES[slot]}>
      <ItemIcon item={equipped[slot]} slot={slot} size="md" classId={player.classId} />
    </button>
  );

  return (
    <div className="screen">
      <div className="panel gear">
        <div className="gear-col">{LEFT.map(slotButton)}</div>
        <div className="gear-hero">
          <HeroFigure player={player} />
          <span className="label small">{CLASS_NAMES[player.classId]}</span>
          <button className="btn small" style={{ marginTop: 6 }} onClick={onChangeClass}>
            Switch hunter
          </button>
        </div>
        <div className="gear-col">{RIGHT.map(slotButton)}</div>
      </div>

      <div className="panel">
        <div className="label" style={{ marginBottom: 8 }}>
          {t("hero.stats")}
        </div>
        <div className="stat-lines">
          <span className="muted">HP</span>
          <span className="v">{player.stats.hp.toLocaleString("en-US")}</span>
          <span className="muted">ATK</span>
          <span className="v">{player.stats.atk.toLocaleString("en-US")}</span>
          <span className="muted">DEF</span>
          <span className="v">{player.stats.def.toLocaleString("en-US")}</span>
          <span className="muted">SPD</span>
          <span className="v">{player.stats.spd}</span>
          <span className="muted">Crit · Crit DMG</span>
          <span className="v">
            {(player.stats.critBp / 100).toFixed(1)}% · {(player.stats.critDmgBp / 100).toFixed(0)}%
          </span>
          {Object.entries(player.sets).map(([set, n]) => (
            <SetLine key={set} name={SET_NAMES[set as keyof typeof SET_NAMES]} pieces={n ?? 0} />
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="label">
            <SpriteImg sprite={ICONS.hammer} scale={2} style={{ verticalAlign: -3, marginRight: 6 }} />
            {t("forge.title")}
          </span>
          <span className="muted pixel" style={{ fontSize: 13 }}>
            {player.stones} stones · {player.dust} dust
          </span>
        </div>
        {!forgeOpen && <div className="muted">Old Rusty opens the forge at Lv {UNLOCK_LEVEL.enhance}.</div>}
        <div className="row" style={forgeOpen ? undefined : { display: "none" }}>
          <button
            className="btn small wide"
            disabled={player.dust < 10}
            onClick={async () => {
              const p = await run(api.convertDust);
              if (p) setPlayer(p);
            }}
          >
            {t("forge.convert")}
          </button>
          <button
            className="btn small wide"
            disabled={player.forge.nextPrice === null || player.gold < player.forge.nextPrice * 10}
            onClick={async () => {
              const p = await run(() => api.buyStones(10));
              if (p) setPlayer(p);
            }}
          >
            {player.forge.nextPrice === null ? (
              t("forge.cap")
            ) : (
              <>
                +10 stones · <SpriteImg sprite={ICONS.coin} scale={1} /> {short(player.forge.nextPrice * 10)}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="label">
            {CLASS_NAMES[player.classId]}'s bag ({bag.length})
          </span>
          <button className="btn small danger" disabled={junk.length === 0} onClick={() => salvage(junk)}>
            Salvage junk ({junk.length})
          </button>
        </div>
        {(["butcher", "gunslinger", "hexer"] as ClassId[]).some((c) => c !== player.classId && player.bags[c] > 0) && (
          <div className="bag-hint" style={{ marginBottom: 8 }}>
            <span className="muted">Waiting for other hunters:</span>
            {(["butcher", "gunslinger", "hexer"] as ClassId[])
              .filter((c) => c !== player.classId && player.bags[c] > 0)
              .map((c) => (
                <span key={c} className="pixel">
                  <i className="dot" style={{ background: CLASS_COLOR[c] }} />
                  {CLASS_NAMES[c]} {player.bags[c]}
                </span>
              ))}
            <button className="btn small" onClick={onChangeClass}>
              Switch
            </button>
          </div>
        )}
        {bag.length === 0 && <div className="muted">{t("hero.empty")}</div>}
        <div className="items">
          {sortedBag.map(({ it, d }) => (
            <button key={it.id} className="item-row" onClick={() => setSelected(it)}>
              <ItemIcon item={it} size="sm" />
              <span className="grow">
                <div className={`name r-${it.rarity}`}>{itemName(it)}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {RARITY_NAMES[it.rarity]} · ilvl {it.ilvl}
                  {it.ilvl > player.level + ILVL_OVER_LEVEL && ` · ${t("item.tooHigh", { level: it.ilvl - ILVL_OVER_LEVEL })}`}
                </div>
              </span>
              <span className={d > 0 ? "delta-up" : "delta-down"}>
                {d > 0 ? "▲" : "▼"}
                {Math.abs(d)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <ItemSheet
          item={selected}
          equipped={isEquipped(selected)}
          delta={isEquipped(selected) ? 0 : delta(selected)}
          playerLevel={player.level}
          forgeOpen={forgeOpen}
          canAfford={(cost) => player.gold >= cost.gold && player.stones >= cost.stones}
          flash={flash}
          onClose={() => setSelected(null)}
          onEquip={() => equip(selected)}
          onEnhance={() => enhance(selected)}
          onSalvage={() => salvage([selected.id])}
        />
      )}
    </div>
  );
}

/** Big paper-doll with a rarity aura and weapon glow (CSS), matching what the battle shows. */
function HeroFigure({ player }: { player: { classId: ClassId; look: Look } }) {
  const art = heroArt(player.classId, player.look);
  const glow = art.weaponTier === "none" || art.weaponTier === "common" ? undefined : tierColor(art.weaponTier);
  return (
    <div className={`hero-figure ${art.aura ?? ""}`}>
      <SpriteImg sprite={art.sprite} scale={6} style={glow ? { filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 2px ${glow})` } : undefined} />
    </div>
  );
}

function SetLine({ name, pieces }: { name: string; pieces: number }) {
  return (
    <>
      <span className="muted">Set · {name}</span>
      <span className="v">{pieces}/6</span>
    </>
  );
}

function ItemSheet(props: {
  item: Item;
  equipped: boolean;
  delta: number;
  playerLevel: number;
  forgeOpen: boolean;
  canAfford: (cost: { gold: number; stones: number }) => boolean;
  flash: { ok: boolean; text: string; key: number } | null;
  onClose: () => void;
  onEquip: () => void;
  onEnhance: () => void;
  onSalvage: () => void;
}) {
  const { item } = props;
  const cost = enhanceCost(item);
  const tooHigh = item.ilvl > props.playerLevel + ILVL_OVER_LEVEL;
  return (
    <div className="backdrop" onClick={props.onClose}>
      <div className="panel sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <EnhanceFx flash={props.flash}>
            <ItemIcon item={item} size="lg" />
          </EnhanceFx>
          <div>
            <div className={`pixel r-${item.rarity}`} style={{ fontSize: 20 }}>
              {itemName(item)}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {RARITY_NAMES[item.rarity]} · {SLOT_NAMES[item.slot]} · ilvl {item.ilvl}
            </div>
            {item.setCode && <div className="muted" style={{ fontSize: 13 }}>Set · {SET_NAMES[item.setCode]}</div>}
          </div>
        </div>
        <div className="stat-lines">
          {enhancedMain(item).map((m) => {
            const [name, value] = statLine(m.key, m.value);
            return <Line key={m.key} name={name} value={value} strong />;
          })}
          {item.substats.map((s) => {
            const [name, value] = statLine(s.key, s.value);
            return <Line key={s.key} name={name} value={value} />;
          })}
        </div>
        {item.legendaryEffect && <div className="r-legendary pixel">★ {LEGENDARY_TEXT[item.legendaryEffect]}</div>}
        {!props.equipped && (
          <div className={props.delta > 0 ? "delta-up" : "delta-down"}>
            Power {props.delta > 0 ? "+" : ""}
            {props.delta}
          </div>
        )}
        {props.flash && (
          <div className="pixel" style={{ textAlign: "center", fontSize: 18, color: props.flash.ok ? "var(--gold)" : "var(--muted)" }}>
            {props.flash.text}
          </div>
        )}

        {!props.forgeOpen ? (
          <div className="muted pixel" style={{ textAlign: "center" }}>
            Enhancing unlocks at Lv {UNLOCK_LEVEL.enhance}
          </div>
        ) : item.enhance < MAX_ENHANCE && cost ? (
          <button className="btn primary" disabled={!props.canAfford(cost)} onClick={props.onEnhance}>
            <span>
              {t("item.enhance", { next: item.enhance + 1 })} · <SpriteImg sprite={ICONS.coin} scale={1} /> {short(cost.gold)} · {cost.stones} stones
              <div style={{ fontSize: 12 }}>
                {t("item.chance", { chance: Math.round(enhanceChanceBp(item) / 100) })}
                {item.luck > 0 && ` · ${t("item.luck", { luck: item.luck })}`}
              </div>
            </span>
          </button>
        ) : (
          <div className="muted pixel" style={{ textAlign: "center" }}>
            {t("item.max")}
          </div>
        )}
        <div className="row">
          {props.equipped ? (
            <span className="muted pixel">{t("item.equipped")}</span>
          ) : (
            <>
              <button className="btn wide" disabled={tooHigh} onClick={props.onEquip}>
                {tooHigh ? t("item.tooHigh", { level: item.ilvl - ILVL_OVER_LEVEL }) : t("item.equip")}
              </button>
              <button className="btn danger" onClick={props.onSalvage}>
                {t("item.salvage")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Success: the frame flares and embers burst out. Failure: it shakes and puffs gray smoke. */
function EnhanceFx({ flash, children }: { flash: { ok: boolean; key: number } | null; children: React.ReactNode }) {
  const bits = useMemo(
    (): { x: number; y: number; c: string }[] => {
      const n = flash?.ok ? 16 : 7;
      return Array.from({ length: n }, (_: unknown, i: number) => {
        const ang = (i / n) * Math.PI * 2 + Math.random() * 0.3;
        const r = flash?.ok ? 50 + Math.random() * 25 : 26 + Math.random() * 14;
        return { x: Math.cos(ang) * r, y: Math.sin(ang) * r - (flash?.ok ? 0 : 18), c: ["#fff3c4", "#ffc93c", "#ff7a1a", "#ffffff"][i % 4]! };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flash?.key],
  );
  return (
    <div className={`enhance-fx ${flash ? (flash.ok ? "ok" : "fail") : ""}`} key={flash?.key ?? 0}>
      {children}
      {flash &&
        bits.map((b, i) => (
          <i key={i} className={flash.ok ? "ember" : "puff"} style={{ ["--x" as string]: `${b.x}px`, ["--y" as string]: `${b.y}px`, ["--c" as string]: b.c }} />
        ))}
    </div>
  );
}

function Line({ name, value, strong }: { name: string; value: string; strong?: boolean }) {
  return (
    <>
      <span className={strong ? "" : "muted"}>{name}</span>
      <span className="v" style={strong ? undefined : { fontSize: 13 }}>
        {value}
      </span>
    </>
  );
}
