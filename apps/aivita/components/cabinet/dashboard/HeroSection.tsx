"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { ChatPrompt, DailyMetrics, User } from "@/lib/cabinet-types";

const PROMPTS: ChatPrompt[] = ["Анализы", "Сон", "Питание", "Тренировки"];

interface Props {
  user: User;
  metrics: DailyMetrics;
}

export function HeroSection({ user, metrics }: Props) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  function ask(q: string) {
    if (!q.trim() || submitting) return;
    setSubmitting(true);
    router.push(`/${locale}/chat?q=${encodeURIComponent(q)}`);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Доброй ночи" :
    hour < 12 ? "Доброе утро" :
    hour < 18 ? "Добрый день" : "Добрый вечер";

  const ringPct = Math.min(100, Math.max(0, metrics.healthIndex.score));
  const C = 2 * Math.PI * 56;
  const dash = (ringPct / 100) * C;

  return (
    <section
      className="relative mx-7 mt-3 overflow-hidden rounded-hero p-8 text-white"
      style={{
        background:
          "linear-gradient(135deg, #b89dc4 0%, #a890b8 45%, #957aaa 100%)",
      }}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
        {/* LEFT: greeting + AI input */}
        <div>
          <div className="text-[13px] font-medium opacity-85">
            {greeting}, {user.name.split(" ")[0]}
          </div>
          <h1 className="mt-2 max-w-md text-[28px] font-bold leading-[1.15]">
            Чем сегодня помочь
            <br />
            твоему здоровью?
          </h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="mt-6 flex max-w-md items-center gap-2 rounded-chip bg-white/95 p-1.5 pl-4 shadow-card"
          >
            <span aria-hidden className="text-[18px]">💬</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задай вопрос AI о здоровье…"
              className="flex-1 bg-transparent py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-chip bg-accent-rose px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#8a4f5d] disabled:opacity-60"
            >
              {submitting ? "…" : "Спросить"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ask(p)}
                className="rounded-chip border border-white/40 bg-white/10 px-3.5 py-1.5 text-[12px] font-medium text-white/95 transition hover:bg-white/20"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: health-index ring card */}
        <div className="rounded-card bg-white/95 p-5 text-text-primary shadow-card md:w-[230px]">
          <div className="text-center text-[12px] font-medium text-text-secondary">
            Индекс здоровья
          </div>
          <div className="relative mx-auto mt-3 grid h-[140px] w-[140px] place-items-center">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r="56" fill="none" stroke="#f0d4dc" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r="56"
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
              />
              <defs>
                <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#cc8a96" />
                  <stop offset="55%" stopColor="#9889c4" />
                  <stop offset="100%" stopColor="#80b094" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-[34px] font-extrabold leading-none">
                {metrics.healthIndex.score}
              </div>
              <div className="text-[10px] font-medium text-text-muted">/100</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/test`)}
            className="mt-3 w-full rounded-chip bg-accent-rose py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#8a4f5d]"
          >
            Пройти тест →
          </button>
        </div>
      </div>
    </section>
  );
}
