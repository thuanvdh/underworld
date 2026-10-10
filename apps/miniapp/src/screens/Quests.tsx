import { useCallback, useEffect, useState } from "react";
import { api, type QuestState, type RewardSummary } from "../api.ts";
import { ICONS } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";
import { RewardChips, countdown } from "../components/RewardChips.tsx";
import { RewardSheet } from "../components/RewardSheet.tsx";
import { useGame } from "../state.tsx";
import { haptic } from "../telegram.ts";

type Tab = "daily" | "weekly" | "login";

/** Daily quests (activity chests), weekly quests and the 7-day login calendar. */
export function Quests({ onClose }: { onClose: () => void }) {
  const { setPlayer, run } = useGame();
  const [tab, setTab] = useState<Tab>("daily");
  const [state, setState] = useState<QuestState | null>(null);
  const [reward, setReward] = useState<RewardSummary | null>(null);

  const reload = useCallback(async () => {
    const s = await run(api.quests);
    if (s) setState(s);
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);

  const claim = async (fn: () => ReturnType<typeof api.claimCalendar>) => {
    const r = await run(fn);
    if (!r) return;
    haptic("success");
    setPlayer(r.player);
    setReward(r.rewards);
    reload();
  };

  if (!state) return <div className="locked-screen">…</div>;
  const dot = {
    daily: state.chests.some((c) => c.ready),
    weekly: state.weekly.some((q) => q.ready),
    login: state.calendar.canClaim,
  };

  return (
    <div className="screen quests">
      <div className="row">
        <span className="label">Quests</span>
        <button className="btn small" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="tabs">
        {(["daily", "weekly", "login"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "daily" ? "Daily" : t === "weekly" ? "Weekly" : "Login"}
            {dot[t] && <i className="red-dot" />}
          </button>
        ))}
      </div>

      {tab === "daily" && (
        <>
          <div className="panel">
            <div className="row">
              <span className="label small">Activity</span>
              <span className="muted pixel" style={{ fontSize: 12 }}>
                resets in {countdown(state.dailyResetIn)}
              </span>
            </div>
            <div className="activity">
              <div className="activity-bar">
                <div style={{ width: `${Math.min(100, state.activity)}%` }} />
              </div>
              {state.chests.map((c) => (
                <button
                  key={c.at}
                  className={`milestone ${c.ready ? "ready" : ""} ${c.claimed ? "claimed" : ""}`}
                  style={{ left: `${c.at}%` }}
                  disabled={!c.ready}
                  onClick={() => claim(() => api.claimActivity(c.at))}
                  title={`${c.at} points`}
                >
                  <SpriteImg sprite={ICONS.chest} scale={1} />
                  <span className="pixel">{c.at}</span>
                </button>
              ))}
            </div>
            <div className="milestone-rewards">
              {state.chests.map((c) => (
                <div key={c.at} className={c.claimed ? "muted" : ""}>
                  <b className="pixel">{c.at}</b> <RewardChips reward={c.reward} />
                </div>
              ))}
            </div>
          </div>
          <div className="items">
            {state.daily.map((q) => (
              <div key={q.id} className={`quest-row ${q.done ? "done" : ""} ${q.locked ? "locked" : ""}`}>
                <div className="grow">
                  <div>{q.title}</div>
                  {q.locked ? (
                    <div className="muted pixel" style={{ fontSize: 12 }}>
                      Unlocks at Lv {q.minLevel}
                    </div>
                  ) : (
                    <div className="mini-bar">
                      <div style={{ width: `${(q.progress / q.target) * 100}%` }} />
                    </div>
                  )}
                </div>
                <span className="pixel">{q.locked ? "" : `${q.progress}/${q.target}`}</span>
                <span className="pts pixel">{q.done ? "✓" : `+${q.points}`}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "weekly" && (
        <>
          <div className="muted pixel" style={{ fontSize: 12 }}>
            Resets in {countdown(state.weeklyResetIn)}
          </div>
          <div className="items">
            {state.weekly.map((q) => (
              <div key={q.id} className={`quest-row ${q.claimed ? "done" : ""}`}>
                <div className="grow">
                  <div>{q.title}</div>
                  <div className="mini-bar">
                    <div style={{ width: `${(q.progress / q.target) * 100}%` }} />
                  </div>
                  <RewardChips reward={q.reward} />
                </div>
                <span className="pixel">
                  {q.progress}/{q.target}
                </span>
                <button className="btn small" disabled={!q.ready} onClick={() => claim(() => api.claimWeekly(q.id))}>
                  {q.claimed ? "✓" : "Claim"}
                  {q.ready && <i className="red-dot" />}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "login" && (
        <>
          <div className="calendar">
            {state.calendar.rewards.map((r, i) => {
              const claimed = i < state.calendar.claimed;
              const today = i === state.calendar.claimed && state.calendar.canClaim;
              return (
                <div key={i} className={`day ${claimed ? "claimed" : ""} ${today ? "today" : ""} ${i === 6 ? "final" : ""}`}>
                  <span className="label small">Day {i + 1}</span>
                  <RewardChips reward={r} big />
                  {claimed && <span className="check pixel">✓</span>}
                </div>
              );
            })}
          </div>
          <button className="btn primary big" disabled={!state.calendar.canClaim} onClick={() => claim(api.claimCalendar)}>
            {state.calendar.claimed >= 7 ? "ALL CLAIMED" : state.calendar.canClaim ? `CLAIM DAY ${state.calendar.claimed + 1}` : "COME BACK TOMORROW"}
          </button>
          <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>
            One reward per day. Day 7 is a Legendary weapon for your current hunter.
          </div>
        </>
      )}

      {reward && <RewardSheet rewards={reward} onClose={() => setReward(null)} />}
    </div>
  );
}
