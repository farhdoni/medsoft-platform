"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DailyMetrics, User } from "@/lib/cabinet-types";
import { CardCodeBadge } from "@/components/medical-card/CardCodeBadge";

interface Props {
  user: User;
  metrics: DailyMetrics;
}

export function HeroSection({ user }: Props) {
  const t = useTranslations("app.hero");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [greeting, setGreeting] = useState("");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  useEffect(() => {
    const h = new Date().getHours();
    const key =
      h < 6
        ? "greetingNight"
        : h < 12
        ? "greetingMorning"
        : h < 18
        ? "greetingDay"
        : "greetingEvening";
    setGreeting(t(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ask(q: string) {
    if (!q.trim() || submitting) return;
    setSubmitting(true);
    router.push(`/${locale}/chat?q=${encodeURIComponent(q)}`);
  }

  const prompts = [
    t("promptAnalyses"),
    t("promptSleep"),
    t("promptNutrition"),
    t("promptWorkouts"),
  ];

  return (
    <section
      className="relative mx-3 mt-3 overflow-hidden rounded-hero p-5 text-white sm:mx-7 sm:p-7 shadow-md"
      style={{
        background:
          "linear-gradient(135deg, var(--hero-from) 0%, var(--hero-mid) 45%, var(--hero-to) 100%)",
      }}
    >
      <div>
        <div className="text-[13px] font-medium opacity-85">
          {greeting}, {user.name.split(" ")[0]}
        </div>
        <CardCodeBadge
          className="mt-1"
          textStyle={{ fontSize: 11, color: "#fff", opacity: 0.7 }}
        />
        <h1 className="mt-2 max-w-lg text-[22px] font-extrabold leading-[1.18] sm:text-[28px]">
          {t("titleLine1")}
          <br />
          {t("titleLine2")}
        </h1>

        {/* Unified Search / Ask AI Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="mt-5 flex max-w-xl items-center gap-2 rounded-chip bg-white/95 p-1.5 pl-4 shadow-card"
        >
          <span aria-hidden className="text-[18px] flex-shrink-0">
            💬
          </span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("aiPlaceholder")}
            className="flex-1 min-w-0 bg-transparent py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 whitespace-nowrap rounded-chip bg-accent-rose px-5 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#8a4f5d] disabled:opacity-60 active:scale-95"
          >
            {submitting ? "…" : t("askButton")}
          </button>
        </form>

        {/* Quick Topic Chips */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => ask(p)}
              className="rounded-chip border border-white/40 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/95 backdrop-blur-xs transition hover:bg-white/20 active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
