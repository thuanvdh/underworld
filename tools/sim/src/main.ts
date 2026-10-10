/**
 * Economy simulation (detailed design §24): virtual players play the real combat engine and the real
 * reward tables for N days. Run: npm run sim -- --players 300 --days 30 --seed 1
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Rng, type ClassId } from "@underworld/shared";
import { ARCHETYPES, SimPlayer, type Archetype } from "./player.ts";

const { values } = parseArgs({
  options: {
    players: { type: "string", default: "300" },
    days: { type: "string", default: "30" },
    seed: { type: "string", default: "1" },
    out: { type: "string", default: "sim-report.json" },
    "pass-share": { type: "string", default: "0.08" },
  },
});

const PLAYERS = Number(values.players);
const DAYS = Number(values.days);
const rng = new Rng(Number(values.seed));
const CLASSES: ClassId[] = ["butcher", "gunslinger", "hexer"];

// Targets from GDD §6.3 (day index is 0-based: "end of day 1" = index 0).
const LEVEL_TARGETS: [level: number, dayIndex: number][] = [
  [20, 0],
  [30, 2],
  [45, 13],
  [60, 34],
];

function pickArchetype(): Archetype {
  let roll = rng.int(10000) / 10000;
  for (const a of ARCHETYPES) {
    if (roll < a.share) return a;
    roll -= a.share;
  }
  return ARCHETYPES[ARCHETYPES.length - 1]!;
}

const started = Date.now();
const players: SimPlayer[] = [];
for (let i = 0; i < PLAYERS; i++) {
  const pass = rng.int(10000) < Number(values["pass-share"]) * 10000;
  players.push(new SimPlayer(i, pickArchetype(), CLASSES[i % 3]!, pass, rng.nextU32()));
}
for (let day = 0; day < DAYS; day++) {
  for (const p of players) p.playDay(day);
  process.stderr.write(`\rday ${day + 1}/${DAYS}`);
}
process.stderr.write(`\rsimulated ${PLAYERS} players × ${DAYS} days in ${((Date.now() - started) / 1000).toFixed(1)}s\n\n`);

// ───────────────────────── report ─────────────────────────

const median = (xs: number[]): number => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const fmt = (n: number): string => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—");
const sum = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);

const checkpoints = [0, 2, 6, 13, 29].filter((d) => d < DAYS);
const groups: [string, SimPlayer[]][] = [
  ...ARCHETYPES.map((a) => [a.name, players.filter((p) => p.archetype.name === a.name)] as [string, SimPlayer[]]),
  ...CLASSES.map((c) => [`class:${c}`, players.filter((p) => p.classId === c)] as [string, SimPlayer[]]),
  ["monthly pass", players.filter((p) => p.monthlyPass)],
  ["no pass", players.filter((p) => !p.monthlyPass)],
];

const report: Record<string, unknown> = { players: PLAYERS, days: DAYS, seed: Number(values.seed), groups: {} };

console.log("Median per group at day N (level / floor / power / avg enhance / gold income per day / gold spent per day)\n");
for (const [name, ps] of groups) {
  if (ps.length === 0) continue;
  const rows = checkpoints.map((d) => {
    const snaps = ps.map((p) => p.history[d]!);
    return {
      day: d + 1,
      level: median(snaps.map((s) => s.level)),
      floor: median(snaps.map((s) => s.floor)),
      power: median(snaps.map((s) => s.power)),
      enhance: median(snaps.map((s) => s.avgEnhance)),
      goldIn: median(snaps.map((s) => sum(s.day_.goldEarned))),
      goldOut: median(snaps.map((s) => sum(s.day_.goldSpent))),
      gold: median(snaps.map((s) => s.gold)),
      winRate: median(snaps.map((s) => (s.day_.battles ? s.day_.battlesWon / s.day_.battles : 1))),
    };
  });
  (report.groups as Record<string, unknown>)[name] = { count: ps.length, rows };
  console.log(`■ ${name} (${ps.length})`);
  for (const r of rows) {
    console.log(
      `  day ${String(r.day).padStart(2)}: Lv ${String(r.level).padStart(2)} · floor ${String(r.floor).padStart(2)} · power ${fmt(r.power).padStart(6)} · +${r.enhance.toFixed(1)} · gold in ${fmt(r.goldIn).padStart(7)} / out ${fmt(r.goldOut).padStart(7)} · bank ${fmt(r.gold).padStart(8)} · win ${(r.winRate * 100).toFixed(0)}%`,
    );
  }
  console.log("");
}

console.log("Level pacing vs GDD targets (median day reached, 1-based):");
const pacing: Record<string, unknown> = {};
for (const a of ARCHETYPES) {
  const ps = players.filter((p) => p.archetype.name === a.name);
  const cells = LEVEL_TARGETS.map(([lv, target]) => {
    const reached = ps.map((p) => p.milestones[lv]).filter((d): d is number => d !== undefined);
    const share = reached.length / ps.length;
    const med = reached.length > ps.length / 2 ? median(reached) + 1 : NaN;
    return { level: lv, targetDay: target + 1, medianDay: med, reachedShare: share };
  });
  pacing[a.name] = cells;
  console.log(
    `  ${a.name.padEnd(9)} ` +
      cells.map((c) => `Lv${c.level}: ${Number.isNaN(c.medianDay) ? `not reached (${(c.reachedShare * 100).toFixed(0)}%)` : `day ${c.medianDay}`} [target ${c.targetDay}]`).join(" · "),
  );
}
report.pacing = pacing;

// Floors where players sat for 3+ days without progress.
const stuck = new Map<number, number>();
for (const p of players) {
  let run = 0;
  for (let d = 1; d < p.history.length; d++) {
    run = p.history[d]!.floor === p.history[d - 1]!.floor ? run + 1 : 0;
    if (run === 3) stuck.set(p.history[d]!.floor, (stuck.get(p.history[d]!.floor) ?? 0) + 1);
  }
}
const stuckTop = [...stuck.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
report.stuckFloors = Object.fromEntries(stuckTop);
console.log("\nFloors where players stalled 3+ days (floor: players):");
console.log("  " + (stuckTop.length ? stuckTop.map(([f, n]) => `${f}: ${n}`).join(" · ") : "none"));

// Economy totals.
let goldIn = 0;
let goldOut = 0;
const goldBySource: Record<string, number> = {};
let gemsIn = 0;
let gemsOut = 0;
for (const p of players) {
  for (const s of p.history) {
    for (const [k, v] of Object.entries(s.day_.goldEarned)) goldBySource[k] = (goldBySource[k] ?? 0) + v;
    goldIn += sum(s.day_.goldEarned);
    goldOut += sum(s.day_.goldSpent);
    gemsIn += s.day_.gemsEarned;
    gemsOut += s.day_.gemsSpent;
  }
}
report.economy = { goldIn, goldOut, goldBySource, gemsIn, gemsOut };
console.log("\nEconomy totals:");
console.log(`  gold: earned ${fmt(goldIn)} · spent ${fmt(goldOut)} · sink ratio ${((goldOut / goldIn) * 100).toFixed(0)}%`);
console.log("  gold by source: " + Object.entries(goldBySource).map(([k, v]) => `${k} ${((v / goldIn) * 100).toFixed(0)}%`).join(" · "));
console.log(`  gems: earned ${fmt(gemsIn)} · spent ${fmt(gemsOut)} (per player per day ${fmt(gemsIn / PLAYERS / DAYS)})`);

writeFileSync(values.out!, JSON.stringify(report, null, 2));
console.log(`\nFull report: ${values.out}`);
