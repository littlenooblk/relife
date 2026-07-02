"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  StoryResponse,
  StoryState,
  createNewLife,
  getPersonaDimensions,
} from "@/lib/game";

const SAVE_KEY = "relife:three-kingdoms-save";
const SAVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type LocalSave = {
  savedAt: number;
  selectedTurnIndex: number;
  state: StoryState;
};

export default function Home() {
  const [state, setState] = useState<StoryState | null>(null);
  const [selectedTurnIndex, setSelectedTurnIndex] = useState(0);
  const [customAction, setCustomAction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedGame, setSavedGame] = useState<LocalSave | null>(() =>
    typeof window === "undefined" ? null : readLocalSave(),
  );

  const currentTurn = state?.history[selectedTurnIndex];
  const latestTurnIndex = state ? state.history.length - 1 : 0;
  const isViewingLatestTurn = selectedTurnIndex === latestTurnIndex;
  const canContinue = Boolean(state && isViewingLatestTurn && !state.isGameOver);
  const sourceLabel = useMemo(() => {
    if (!state || !currentTurn) {
      return "";
    }

    return currentTurn.title === "乱世初醒" ? "本地开局" : "剧情生成";
  }, [currentTurn, state]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const save: LocalSave = {
      savedAt: Date.now(),
      selectedTurnIndex,
      state,
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [selectedTurnIndex, state]);

  async function startNewLife() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/new-life", {
        method: "POST",
      });
      const data = (await response.json()) as {
        state?: StoryState;
        error?: string;
      };

      if (!response.ok || !data.state) {
        throw new Error(data.error || "开局生成失败");
      }

      setState(data.state);
      setSelectedTurnIndex(0);
      setCustomAction("");
      setSavedGame(null);
    } catch (err) {
      setState(createNewLife());
      setSelectedTurnIndex(0);
      setCustomAction("");
      setSavedGame(null);
      setError(
        err instanceof Error
          ? `大模型开局生成失败，已使用本地随机开局：${err.message}`
          : "大模型开局生成失败，已使用本地随机开局。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function continueSavedGame() {
    const save = readLocalSave();

    if (!save) {
      setSavedGame(null);
      setError("没有找到 7 天内的本地存档。");
      return;
    }

    setState(save.state);
    setSelectedTurnIndex(
      Math.min(save.selectedTurnIndex, save.state.history.length - 1),
    );
    setCustomAction("");
    setError("");
    setSavedGame(save);
  }

  async function submitAction(action: string) {
    if (!state || !action.trim() || !canContinue) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state,
          action,
        }),
      });

      const data = (await response.json()) as StoryResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "剧情生成失败");
      }

      const nextState = (data as StoryResponse).state;
      setState(nextState);
      setSelectedTurnIndex(nextState.history.length - 1);
      setCustomAction("");
    } catch (err) {
      setError(
        err instanceof Error
          ? `剧情生成失败，当前进度已保存在本地：${err.message}`
          : "剧情生成失败，当前进度已保存在本地。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction(customAction);
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-3xl border border-amber-200/15 bg-stone-950/55 p-6 shadow-2xl shadow-black/30 backdrop-blur md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-[0.35em] text-amber-300/80">
              RELIFE · THREE KINGDOMS
            </p>
            <div>
              <h1 className="text-4xl font-bold text-amber-50 sm:text-6xl">
                三国人生
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">
                随机出生在东汉末年至三国归晋之间的中国，在一次次重大选择里成为乱世中的另一个人。
              </p>
            </div>
          </div>
          <button
            className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={startNewLife}
            type="button"
          >
            {isLoading ? "生成中..." : state ? "重开一生" : "开始新人生"}
          </button>
        </header>

        {!state || !currentTurn ? (
          <EmptyState
            onContinue={continueSavedGame}
            onStart={startNewLife}
            savedGame={savedGame}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <aside className="space-y-4">
              <ProfileCard state={state} />
              <PersonaRadarCard state={state} />
              <WorldStateCard state={state} />
              <MemoryCard
                selectedTurnIndex={selectedTurnIndex}
                setSelectedTurnIndex={setSelectedTurnIndex}
                state={state}
              />
            </aside>

            <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-6 shadow-2xl shadow-black/30">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-amber-300/80">
                    {formatTurnDate(currentTurn)} · {currentTurn.age}岁 ·{" "}
                    {sourceLabel}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-amber-50">
                    {currentTurn.title}
                  </h2>
                </div>
                <span className="rounded-full border border-amber-200/20 px-3 py-1 text-sm text-stone-300">
                  {isViewingLatestTurn ? state.currentLocation : "回看经历"}
                </span>
              </div>

              <article className="space-y-5 text-lg leading-9 text-stone-100">
                {currentTurn.chosenAction ? (
                  <div className="rounded-2xl border border-amber-200/10 bg-amber-950/20 p-4 text-base leading-7 text-amber-100">
                    <strong className="text-amber-200">当步选择：</strong>
                    {currentTurn.chosenAction}
                  </div>
                ) : null}
                <p>{currentTurn.narrative}</p>
                <div className="rounded-2xl border border-sky-200/10 bg-sky-950/25 p-4 text-base leading-7 text-sky-100">
                  <strong className="text-sky-200">历史地理：</strong>
                  {currentTurn.historicalContext}
                </div>
                <div className="rounded-2xl border border-red-200/10 bg-red-950/20 p-4 text-base leading-7 text-red-100">
                  <strong className="text-red-200">风险：</strong>
                  {currentTurn.risk}
                </div>
                {currentTurn.isEnding ? (
                  <div className="rounded-2xl border border-stone-200/10 bg-stone-900/80 p-4 text-base leading-7 text-stone-200">
                    这一生已经结束。你可以从左侧目录回看每一步，也可以重开一生。
                  </div>
                ) : null}
              </article>

              {!isViewingLatestTurn ? (
                <div className="mt-8 rounded-2xl border border-amber-200/10 bg-stone-900/70 p-4 text-sm leading-6 text-stone-300">
                  你正在回看过往经历。回到目录最后一项，才能继续推动当前人生。
                </div>
              ) : null}

              {canContinue ? (
                <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold text-amber-100">
                  人生转折选择
                </h3>
                <div className="grid gap-3">
                  {currentTurn.choices.map((choice) => (
                    <button
                      className="rounded-2xl border border-amber-200/15 bg-amber-50/5 p-4 text-left transition hover:border-amber-200/45 hover:bg-amber-100/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                      key={choice.id}
                      onClick={() =>
                        submitAction(`${choice.label}；真实意图：${choice.intent}`)
                      }
                      type="button"
                    >
                      <span className="block font-semibold text-amber-100">
                        {choice.label}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-stone-400">
                        {choice.intent}
                      </span>
                    </button>
                  ))}
                </div>
                </div>
              ) : null}

              {canContinue ? (
                <form className="mt-6 space-y-3" onSubmit={handleCustomSubmit}>
                <label
                  className="block text-lg font-semibold text-amber-100"
                  htmlFor="custom-action"
                >
                  或输入你想选择的人生方向
                </label>
                <textarea
                  className="min-h-28 w-full resize-y rounded-2xl border border-amber-200/15 bg-stone-900/90 p-4 leading-7 text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-200/50"
                  disabled={isLoading}
                  id="custom-action"
                  maxLength={300}
                  onChange={(event) => setCustomAction(event.target.value)}
                  placeholder="例如：我决定放弃仕途，带着家人迁往江东经营家业，即使要舍弃眼前的名声。"
                  value={customAction}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded-full bg-stone-100 px-5 py-2.5 font-bold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || !customAction.trim()}
                    type="submit"
                  >
                    {isLoading ? "推演中..." : "进入下一转折点"}
                  </button>
                  {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </div>
                </form>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState({
  onContinue,
  onStart,
  savedGame,
}: {
  onContinue: () => void;
  onStart: () => void;
  savedGame: LocalSave | null;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-amber-200/25 bg-stone-950/45 p-10 text-center">
      <h2 className="text-2xl font-bold text-amber-50">尚未开始</h2>
      <p className="mx-auto mt-3 max-w-2xl leading-8 text-stone-300">
        首版会随机生成三国时期的出生年月、地点与出身。中间的小事会由剧情自动推进，你只需要在重大人生转折点做选择。
      </p>
      <button
        className="mt-6 rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-950 transition hover:bg-amber-200"
        onClick={onStart}
        type="button"
      >
        随机出生
      </button>
      {savedGame ? (
        <div className="mt-6 rounded-2xl border border-amber-200/15 bg-stone-900/70 p-4">
          <p className="text-sm leading-6 text-stone-300">
            找到 7 天内的本地存档：
            {formatSaveSummary(savedGame)}
          </p>
          <button
            className="mt-3 rounded-full border border-amber-200/30 px-5 py-2.5 font-semibold text-amber-100 transition hover:bg-amber-100/10"
            onClick={onContinue}
            type="button"
          >
            继续游戏
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ProfileCard({ state }: { state: StoryState }) {
  const { profile } = state;
  const rows = [
    ["出生", `${profile.birthYear}年${profile.birthMonth}月`],
    ["出生地", `${profile.birthPlace.name}（${profile.birthPlace.presentDay}）`],
    [
      "当前日期",
      `${profile.currentYear}年${profile.currentMonth ?? profile.birthMonth}月${profile.currentDay ?? 1}日`,
    ],
    ["区域", profile.birthPlace.region],
    ["出身", profile.socialClass],
    ["家世", profile.familyBackground || profile.socialClass],
    ["当前大势", profile.faction],
  ];

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-5">
      <h2 className="text-xl font-bold text-amber-50">人物档案</h2>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div className="rounded-2xl bg-white/[0.04] p-3" key={label}>
            <dt className="text-xs uppercase tracking-[0.2em] text-amber-300/70">
              {label}
            </dt>
            <dd className="mt-1 leading-6 text-stone-100">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WorldStateCard({ state }: { state: StoryState }) {
  const worldState = state.worldState;

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-5">
      <h2 className="text-xl font-bold text-amber-50">世界线</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-stone-300">
        <p>
          {worldState?.alternateHistory
            ? "本局历史已经偏离史实。"
            : worldState?.canInfluenceHistory
              ? "你已具备影响重大历史走势的能力。"
              : "你暂时还无法影响重大历史走势。"}
        </p>
        <p className="text-stone-400">
          {worldState?.divergenceSummary ||
            worldState?.influenceReason ||
            "你目前影响的是自己、家庭与身边人的命运。"}
        </p>
        {worldState?.changedEvents?.length ? (
          <div className="flex flex-wrap gap-2">
            {worldState.changedEvents.slice(-4).map((event) => (
              <span
                className="rounded-full border border-purple-200/20 px-3 py-1 text-purple-100"
                key={event}
              >
                {event}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PersonaRadarCard({ state }: { state: StoryState }) {
  const dimensions = getPersonaDimensions(state.personaProfile);
  const size = 220;
  const center = size / 2;
  const maxRadius = 72;
  const levels = [0.25, 0.5, 0.75, 1];
  const points = dimensions.map((dimension, index) =>
    radarPoint(index, dimensions.length, center, maxRadius, dimension.value),
  );
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-5">
      <h2 className="text-xl font-bold text-amber-50">角色形象</h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        六维形象会影响他人如何看待你，也会推动后续剧情机会与代价。
      </p>
      <svg
        aria-label="角色六维雷达图"
        className="mt-3 h-auto w-full"
        role="img"
        viewBox={`0 0 ${size} ${size}`}
      >
        {levels.map((level) => {
          const levelPoints = dimensions
            .map((_, index) =>
              radarPoint(index, dimensions.length, center, maxRadius, level * 100),
            )
            .map((point) => `${point.x},${point.y}`)
            .join(" ");

          return (
            <polygon
              className="fill-none stroke-amber-100/10"
              key={level}
              points={levelPoints}
            />
          );
        })}
        {dimensions.map((dimension, index) => {
          const axisPoint = radarPoint(
            index,
            dimensions.length,
            center,
            maxRadius,
            100,
          );
          const labelPoint = radarPoint(
            index,
            dimensions.length,
            center,
            maxRadius + 24,
            100,
          );

          return (
            <g key={dimension.key}>
              <line
                className="stroke-amber-100/10"
                x1={center}
                x2={axisPoint.x}
                y1={center}
                y2={axisPoint.y}
              />
              <text
                className="fill-stone-300 text-[10px]"
                dominantBaseline="middle"
                textAnchor="middle"
                x={labelPoint.x}
                y={labelPoint.y}
              >
                {dimension.label}
              </text>
            </g>
          );
        })}
        <polygon
          className="fill-emerald-300/20 stroke-emerald-200"
          points={polygonPoints}
          strokeWidth="2"
        />
        {points.map((point, index) => (
          <circle
            className="fill-emerald-100"
            cx={point.x}
            cy={point.y}
            key={dimensions[index].key}
            r="3"
          />
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {dimensions.map((dimension) => (
          <div
            className="rounded-2xl border border-amber-200/10 bg-white/[0.03] px-3 py-2"
            key={dimension.key}
          >
            <p className="text-xs text-stone-400">{dimension.label}</p>
            <p className="mt-1 text-lg font-semibold text-amber-50">
              {dimension.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemoryCard({
  selectedTurnIndex,
  setSelectedTurnIndex,
  state,
}: {
  selectedTurnIndex: number;
  setSelectedTurnIndex: (index: number) => void;
  state: StoryState;
}) {
  const latestHistory = state.history
    .map((turn, index) => ({ turn, index }))
    .slice(-8)
    .reverse();

  return (
    <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-5">
      <h2 className="text-xl font-bold text-amber-50">人生痕迹</h2>
      <InfoList title="关系" items={state.relationships} />
      <InfoList title="特质" items={state.traits} />
      <InfoList title="资源" items={state.inventory} />
      <div className="mt-5">
        <p className="text-sm font-semibold text-amber-200">经历目录</p>
        <ol className="mt-2 space-y-2 text-sm leading-6 text-stone-300">
          {latestHistory.map(({ turn, index }) => (
            <li key={`${turn.year}-${turn.title}-${index}`}>
              <button
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedTurnIndex === index
                    ? "border-amber-200/45 bg-amber-100/10"
                    : "border-amber-200/10 bg-white/[0.03] hover:border-amber-200/30"
                }`}
                onClick={() => setSelectedTurnIndex(index)}
                type="button"
              >
                <span className="block text-stone-400">
                  第{index + 1}步 · {formatTurnDate(turn)}
                </span>
                <span className="mt-1 block font-semibold text-stone-100">
                  {turn.title}
                  {turn.isEnding ? " · 终局" : ""}
                </span>
                <span className="mt-1 block line-clamp-2 text-stone-500">
                  {turn.chosenAction ? `选择：${turn.chosenAction}` : "出生开局"}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {state.history.length > latestHistory.length ? (
          <p className="mt-2 text-xs leading-5 text-stone-500">
            仅显示最新 {latestHistory.length} 步，可继续通过剧情正文回看当前选中节点。
          </p>
        ) : null}
      </div>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  const latestItems = items.slice(0, 6);

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-amber-200">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {latestItems.map((item) => (
          <span
            className="rounded-full border border-amber-200/15 px-3 py-1 text-sm text-stone-300"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
      {items.length > latestItems.length ? (
        <p className="mt-2 text-xs text-stone-500">
          已隐藏较早的 {items.length - latestItems.length} 项
        </p>
      ) : null}
    </div>
  );
}

function formatTurnDate(turn: {
  year: number;
  month?: number;
  day?: number;
}) {
  return `${turn.year}年${turn.month ?? 1}月${turn.day ?? 1}日`;
}

function radarPoint(
  index: number,
  total: number,
  center: number,
  maxRadius: number,
  value: number,
) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = (Math.max(0, Math.min(value, 100)) / 100) * maxRadius;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function readLocalSave(): LocalSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return null;
    }

    const save = JSON.parse(raw) as LocalSave;

    if (!save.savedAt || !save.state || Date.now() - save.savedAt > SAVE_TTL_MS) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }

    return save;
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

function formatSaveSummary(save: LocalSave) {
  const latestTurn = save.state.history.at(-1);
  const savedAt = new Date(save.savedAt).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!latestTurn) {
    return `保存于 ${savedAt}`;
  }

  return `${latestTurn.age}岁，${latestTurn.title}，保存于 ${savedAt}`;
}
