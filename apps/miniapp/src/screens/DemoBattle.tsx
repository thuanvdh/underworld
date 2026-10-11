import { useEffect, useRef, useState } from "react";
import { Rng, SLOTS, buildHero, chapterOf, generateItem, lookOf, type ClassId, type Equipment, type Rarity } from "@underworld/shared";
import { Battle, buildDungeonSetup } from "@underworld/combat";
import { BattleRenderer } from "../battle/renderer.ts";
import { usePixelCanvas } from "../art/usePixelCanvas.ts";

/**
 * Dev-only effects showcase (open /#demo?floor=10&class=hexer): a geared hero auto-plays a floor locally,
 * no API involved. Useful for reviewing VFX and boss mechanics.
 */
export function DemoBattle() {
  const params = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const floor = Number(params.get("floor") ?? 10);
  const classId = (params.get("class") ?? "butcher") as ClassId;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);
  usePixelCanvas(stageRef, canvasRef, { targetPixelWidth: 210, fillHeight: true });

  useEffect(() => {
    const rng = new Rng(floor * 31 + run);
    const eq: Equipment = {};
    for (const slot of SLOTS) {
      const it = generateItem(rng, { rarity: (params.get("rarity") as Rarity) ?? "epic", ilvl: floor + 4, slot, classId });
      it.enhance = 8;
      eq[slot] = it;
    }
    const hero = buildHero(classId, Math.min(60, floor + 6), eq);
    const battle = new Battle(buildDungeonSetup(floor, hero, 1000 + run), { recordEvents: true, autopilot: "perfect" });
    const renderer = new BattleRenderer(canvasRef.current!, chapterOf(floor).key, classId, lookOf(eq));
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      acc += Math.min(250, now - last) * renderer.timeScale(now);
      last = now;
      while (acc >= 50 && battle.phase !== "ended") {
        acc -= 50;
        if (battle.phase === "boonChoice") battle.chooseBoon(battle.autoBoonPick());
        battle.step();
        for (const e of battle.events) renderer.handle(e, now);
        battle.events.length = 0;
      }
      renderer.draw(battle.snapshot, battle.tick, now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [floor, classId, run]);

  return (
    <div className="app">
      <div className="battle">
        <div className="battle-hud">
          <span className="label">Demo · Floor {floor}</span>
          <button className="btn small" onClick={() => setRun((r) => r + 1)}>
            Replay
          </button>
        </div>
        <div className="battle-stage" ref={stageRef}>
          <canvas ref={canvasRef} className="px" />
        </div>
      </div>
    </div>
  );
}
