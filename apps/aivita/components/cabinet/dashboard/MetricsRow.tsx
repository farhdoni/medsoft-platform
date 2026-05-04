"use client";

import { Icon, type IconName } from "@/components/cabinet/icons/Icon";
import type { DailyMetrics } from "@/lib/cabinet-types";

interface Card {
  icon: IconName;
  value: string;
  label: string;
  meta: string;
  metaColor: string;
  bg: string;
}

export function MetricsRow({ metrics }: { metrics: DailyMetrics }) {
  const cards: Card[] = [
    {
      icon: "heart",
      value: String(metrics.heartRate.bpm),
      label: "Пульс, bpm",
      meta: `↑ ${metrics.heartRate.deltaWeek}`,
      metaColor: "text-accent-rose",
      bg: "bg-bg-soft-pink",
    },
    {
      icon: "drop",
      value: `${metrics.water.liters} л`,
      label: `Вода (${Math.round((metrics.water.liters / metrics.water.goalLiters) * 100)}%)`,
      meta: `${metrics.water.liters}/${metrics.water.goalLiters} цели`,
      metaColor: "text-accent-purple-deep",
      bg: "bg-bg-soft-purple",
    },
    {
      icon: "steps",
      value: `${(metrics.steps.count / 1000).toFixed(1)}K`,
      label: "Шагов сегодня",
      meta: `↑ ${metrics.steps.deltaPctWeek}%`,
      metaColor: "text-accent-mint-deep",
      bg: "bg-bg-soft-mint",
    },
    {
      icon: "habit",
      value: `${metrics.habits.completed}/${metrics.habits.total}`,
      label: "Привычки",
      meta: `${Math.round((metrics.habits.completed / metrics.habits.total) * 100)}%`,
      metaColor: "text-text-muted",
      bg: "bg-bg-soft-blue",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 px-7 pt-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`relative flex min-h-[110px] flex-col justify-between rounded-card p-4 ${c.bg}`}
        >
          <div className="flex items-start justify-between">
            <Icon name={c.icon} size={32} />
            <div className={`text-[10px] font-semibold ${c.metaColor}`}>
              {c.meta}
            </div>
          </div>
          <div>
            <div className="text-[22px] font-extrabold leading-none text-text-primary">
              {c.value}
            </div>
            <div className="mt-1 text-[11px] text-text-secondary">{c.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
