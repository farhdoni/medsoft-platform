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

export function HeroSection({ user, metrics }: Props) {
  const t = useTranslations('app.hero');
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // SSR/client hydration fix: start with '' (renders nothing), update after mount.
  // Previously used t('greetingDay') as initial value — but if DB-merged messages
  // differ from the SSR-time value by even one character, React throws #418.
  const [greeting, setGreeting] = useState('');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  useEffect(() => {
    const h = new Date().getHours();
    const key = h < 6 ? 'greetingNight' : h < 12 ? 'greetingMorning' : h < 18 ? 'greetingDay' : 'greetingEvening';
    setGreeting(t(key));
  // t is stable across renders for the same locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ask(q: string) {
    if (!q.trim() || submitting) return;
    setSubmitting(true);
    router.push(`/${locale}/chat?q=${encodeURIComponent(q)}`);
  }

  const prompts = [
    t('promptAnalyses'),
    t('promptSleep'),
    t('promptNutrition'),
    t('promptWorkouts'),
  ];

  const ringPct = Math.min(100, Math.max(0, metrics.healthIndex.score));
  const C = 2 * Math.PI * 56;
  const dash = (ringPct / 100) * C;

  return (
    <section
      className="relative mx-3 mt-3 overflow-hidden rounded-hero p-5 text-white sm:mx-7 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, var(--hero-from) 0%, var(--hero-mid) 45%, var(--hero-to) 100%)",
      }}
    >
      <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-8">
        {/* LEFT: greeting + AI input */}
        <div>
          <div className="text-[13px] font-medium opacity-85">
            {greeting}, {user.name.split(" ")[0]}
          </div>
          <CardCodeBadge
            className="mt-1"
            textStyle={{ fontSize: 11, color: '#fff', opacity: 0.7 }}
          />
          <h1 className="mt-2 max-w-md text-[22px] font-extrabold leading-[1.15] sm:text-[28px]">
            {t('titleLine1')}
            <br />
            {t('titleLine2')}
          </h1>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/test`)}
              className="inline-flex items-center gap-1.5 rounded-chip bg-white/20 px-4 py-2 text-[13px] font-bold text-white shadow-sm backdrop-blur-md transition hover:bg-white/30 active:scale-95"
            >
              <span>⚡</span>
              <span>Пройти чекап</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/medical-card`)}
              className="inline-flex items-center gap-1.5 rounded-chip bg-white/10 border border-white/30 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/20 active:scale-95"
            >
              <span>📄</span>
              <span>Медкарта</span>
            </button>
          </div>
        </div>

        {/* RIGHT: health-index ring card — compact on mobile, full on desktop */}
        <div className="rounded-card bg-white/95 p-4 text-text-primary shadow-card md:p-5 md:w-[230px]">
          <div className="text-center text-[12px] font-medium text-text-secondary">
            {t('healthIndex')}
          </div>
          {ringPct > 0 ? (
            <div className="relative mx-auto mt-3 grid h-[100px] w-[100px] place-items-center md:h-[140px] md:w-[140px]">
              <svg width="100" height="100" viewBox="0 0 140 140" className="-rotate-90 md:hidden absolute inset-0 w-full h-full">
                <circle cx="70" cy="70" r="56" fill="none" stroke='var(--accent-light)' strokeWidth="10" />
                <circle cx="70" cy="70" r="56" fill="none" stroke="url(#ring-grad-sm)" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
                <defs>
                  <linearGradient id="ring-grad-sm" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor='var(--accent)' />
                    <stop offset="100%" stopColor="#80b094" />
                  </linearGradient>
                </defs>
              </svg>
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90 hidden md:block absolute inset-0 w-full h-full">
                <circle cx="70" cy="70" r="56" fill="none" stroke='var(--accent-light)' strokeWidth="10" />
                <circle cx="70" cy="70" r="56" fill="none" stroke="url(#ring-grad)" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
                <defs>
                  <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor='var(--accent)' />
                    <stop offset="55%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="#80b094" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <div className="text-[24px] font-extrabold leading-none md:text-[34px]">
                  {metrics.healthIndex.score}
                </div>
                <div className="text-[10px] font-medium text-text-muted">/100</div>
              </div>
            </div>
          ) : (
            // No health score yet — prompt user to take the test
            <div className="mt-3 flex flex-col items-center gap-1 py-4">
              <span className="text-[32px]">🧬</span>
              <p className="text-[11px] text-center text-text-muted leading-snug">
                {t('noScoreYet')}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(`/${locale}/test`)}
            className="mt-3 w-full rounded-chip bg-accent-rose py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#8a4f5d]"
          >
            {t('takeTest')}
          </button>
        </div>
      </div>
    </section>
  );
}
