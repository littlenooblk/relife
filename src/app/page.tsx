"use client";

import { FormEvent, useMemo, useState } from "react";
import { StoryResponse, StoryState, createNewLife } from "@/lib/game";

export default function Home() {
  const [state, setState] = useState<StoryState | null>(null);
  const [customAction, setCustomAction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const currentTurn = state?.history.at(-1);
  const sourceLabel = useMemo(() => {
    if (!state || !currentTurn) {
      return "";
    }

    return currentTurn.title === "乱世初醒" ? "本地开局" : "剧情生成";
  }, [currentTurn, state]);

  function startNewLife() {
    setState(createNewLife());
    setCustomAction("");
    setError("");
  }

  async function submitAction(action: string) {
    if (!state || !action.trim()) {
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

      setState((data as StoryResponse).state);
      setCustomAction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "剧情生成失败，请稍后重试。");
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
            {state ? "重开一生" : "开始新人生"}
          </button>
        </header>

        {!state || !currentTurn ? (
          <EmptyState onStart={startNewLife} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <aside className="space-y-4">
              <ProfileCard state={state} />
              <MemoryCard state={state} />
            </aside>

            <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-6 shadow-2xl shadow-black/30">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-amber-300/80">
                    {currentTurn.year}年 · {currentTurn.age}岁 · {sourceLabel}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-amber-50">
                    {currentTurn.title}
                  </h2>
                </div>
                <span className="rounded-full border border-amber-200/20 px-3 py-1 text-sm text-stone-300">
                  {state.currentLocation}
                </span>
              </div>

              <article className="space-y-5 text-lg leading-9 text-stone-100">
                <p>{currentTurn.narrative}</p>
                <div className="rounded-2xl border border-sky-200/10 bg-sky-950/25 p-4 text-base leading-7 text-sky-100">
                  <strong className="text-sky-200">历史地理：</strong>
                  {currentTurn.historicalContext}
                </div>
                <div className="rounded-2xl border border-red-200/10 bg-red-950/20 p-4 text-base leading-7 text-red-100">
                  <strong className="text-red-200">风险：</strong>
                  {currentTurn.risk}
                </div>
              </article>

              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold text-amber-100">
                  推荐选择
                </h3>
                <div className="grid gap-3">
                  {currentTurn.choices.map((choice) => (
                    <button
                      className="rounded-2xl border border-amber-200/15 bg-amber-50/5 p-4 text-left transition hover:border-amber-200/45 hover:bg-amber-100/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                      key={choice.id}
                      onClick={() => submitAction(choice.intent)}
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

              <form className="mt-6 space-y-3" onSubmit={handleCustomSubmit}>
                <label
                  className="block text-lg font-semibold text-amber-100"
                  htmlFor="custom-action"
                >
                  或输入你的决定
                </label>
                <textarea
                  className="min-h-28 w-full resize-y rounded-2xl border border-amber-200/15 bg-stone-900/90 p-4 leading-7 text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-200/50"
                  disabled={isLoading}
                  id="custom-action"
                  maxLength={300}
                  onChange={(event) => setCustomAction(event.target.value)}
                  placeholder="例如：我想托人给荆州的亲族送信，打听是否有避乱的去处。"
                  value={customAction}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="rounded-full bg-stone-100 px-5 py-2.5 font-bold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || !customAction.trim()}
                    type="submit"
                  >
                    {isLoading ? "推演中..." : "推动剧情"}
                  </button>
                  {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-amber-200/25 bg-stone-950/45 p-10 text-center">
      <h2 className="text-2xl font-bold text-amber-50">尚未开始</h2>
      <p className="mx-auto mt-3 max-w-2xl leading-8 text-stone-300">
        首版会随机生成三国时期的出生年月、地点与出身，然后以推荐选项和自由输入推进人生节点。
      </p>
      <button
        className="mt-6 rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-950 transition hover:bg-amber-200"
        onClick={onStart}
        type="button"
      >
        随机出生
      </button>
    </section>
  );
}

function ProfileCard({ state }: { state: StoryState }) {
  const { profile } = state;
  const rows = [
    ["出生", `${profile.birthYear}年${profile.birthMonth}月`],
    ["出生地", `${profile.birthPlace.name}（${profile.birthPlace.presentDay}）`],
    ["区域", profile.birthPlace.region],
    ["出身", profile.socialClass],
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

function MemoryCard({ state }: { state: StoryState }) {
  return (
    <section className="rounded-3xl border border-amber-200/15 bg-stone-950/70 p-5">
      <h2 className="text-xl font-bold text-amber-50">人生痕迹</h2>
      <InfoList title="关系" items={state.relationships} />
      <InfoList title="特质" items={state.traits} />
      <InfoList title="资源" items={state.inventory} />
      <div className="mt-5">
        <p className="text-sm font-semibold text-amber-200">经历</p>
        <ol className="mt-2 space-y-2 text-sm leading-6 text-stone-300">
          {state.history.slice(-5).map((turn, index) => (
            <li key={`${turn.year}-${turn.title}-${index}`}>
              {turn.year}年：{turn.title}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-amber-200">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className="rounded-full border border-amber-200/15 px-3 py-1 text-sm text-stone-300"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
