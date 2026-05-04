"use client";

import { Icon, type IconName } from "@/components/icons/Icon";
import type { DailyMetrics } from "@/lib/types";

export function MobileMetrics({ metrics }: { metrics: DailyMetrics }) {
  const cards: {
    icon: IconName;
    value: string;
    label: string;
    meta: string;
    metaColor: string;
    bg: string;
  }[] = [
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
      bg: "bg-bg-soft-pink",
    },
  ];

  return (
    <section className="mx-5 mt-3 grid grid-cols-4 gap-2">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`flex min-h-[100px] flex-col justify-between rounded-[14px] p-2.5 ${c.bg}`}
        >
          <div className="flex items-start justify-between gap-1">
            <Icon name={c.icon} size={24} />
            <span className={`text-[9px] font-semibold ${c.metaColor} text-right leading-tight`}>
              {c.meta}
            </span>
          </div>
          <div>
            <div className="text-[16px] font-extrabold leading-none text-text-primary">
              {c.value}
            </div>
            <div className="mt-1 text-[9px] leading-tight text-text-secondary">
              {c.label}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
