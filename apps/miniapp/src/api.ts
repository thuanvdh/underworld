import type { BattleInputs, BattleResult, BattleSetup } from "@underworld/combat";
import type { ClassId, Equipment, Item, SetCode, Stats } from "@underworld/shared";
import { initData } from "./telegram.ts";

export interface PlayerView {
  id: number;
  name: string;
  classId: ClassId;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  gems: number;
  stones: number;
  dust: number;
  crystals: number;
  cores: number;
  energy: number;
  energyMax: number;
  energyNextAt: number | null;
  highestFloor: number;
  power: number;
  stats: Stats;
  sets: Partial<Record<SetCode, number>>;
  newbieFreeUntil: number;
  classChangeFreeUntil: number;
  afk: { unlocked: boolean; hours: number; maxHours: number; gold: number; exp: number; stones: number; items: number };
  forge: { boughtToday: number; nextPrice: number | null };
  serverTime: number;
}

export interface RewardSummary {
  gold: number;
  exp: number;
  stones: number;
  gems: number;
  dust: number;
  items: Item[];
  autoSalvaged: number;
  levelFrom: number;
  levelTo: number;
}

export class ApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

let token = "";

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new ApiError(data.error ?? "network", data.message ?? res.statusText);
  return data as T;
}

/** Log in with Telegram initData; outside Telegram fall back to a per-browser dev user (API needs DEV_AUTH=1). */
export async function login(): Promise<PlayerView> {
  const data = initData();
  let body: object;
  if (data) {
    body = { initData: data };
  } else {
    let devId = Number(safeStorage("uw-dev-id"));
    if (!devId) {
      devId = 100000 + Math.floor(Math.random() * 900000);
      safeStorage("uw-dev-id", String(devId));
    }
    body = { devUserId: devId };
  }
  const res = await request<{ token: string; player: PlayerView }>("POST", "/auth/session", body);
  token = res.token;
  return res.player;
}

function safeStorage(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const api = {
  me: () => request<PlayerView>("GET", "/me"),
  chooseClass: (classId: ClassId) => request<PlayerView>("POST", "/me/class", { classId }),
  dungeon: () => request<{ highestFloor: number; maxFloor: number; stars: Record<string, number> }>("GET", "/dungeon"),
  startDungeon: (floor: number) => request<{ battleId: string; setup: BattleSetup; player: PlayerView }>("POST", "/battles/dungeon/start", { floor }),
  finishDungeon: (battleId: string, inputs: BattleInputs) =>
    request<{ result: BattleResult; rewards: RewardSummary; player: PlayerView }>("POST", `/battles/${battleId}/finish`, { inputs }),
  sweep: (floor: number, times: number) => request<{ rewards: RewardSummary; player: PlayerView }>("POST", "/dungeon/sweep", { floor, times }),
  claimAfk: () => request<{ rewards: RewardSummary; player: PlayerView }>("POST", "/afk/claim", {}),
  items: () => request<{ equipped: Equipment; bag: Item[] }>("GET", "/items"),
  equip: (id: string) => request<PlayerView>("POST", `/items/${id}/equip`, {}),
  enhance: (id: string) => request<{ success: boolean; item: Item; player: PlayerView }>("POST", `/items/${id}/enhance`, {}),
  salvage: (itemIds: string[]) => request<{ salvaged: number; player: PlayerView }>("POST", "/items/salvage", { itemIds }),
  buyStones: (count: number) => request<PlayerView>("POST", "/forge/stones", { count }),
  convertDust: () => request<PlayerView>("POST", "/forge/convert-dust", {}),
};
