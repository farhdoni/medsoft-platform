"use client";

import { useState } from "react";
import type { ActivityPoint } from "@/lib/cabinet-types";

type Metric = "Шаги" | "Км" | "Сон";

const FIELD: Record<Metric, keyof Pick<ActivityPoint, "steps" | "km" | "sleepHours">> = {
  "Шаги": "steps",
  "Км": "km",
  "Сон": "sleepHours",
};

const CHART_H = 110;

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const [metric, setMetric] = useState<Metric>("Шаги");
  const field = FIELD[metric];
  const max = Math.max(...data.map((d) => d[field] as number));

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-bold text-text-primary">
            Активность за 7 дней
          </div>
          <div className="mt-0.5 text-[11px] text-text-muted">
            Шаги, км, активные минуты
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-chip bg-bg-app p-1">
          {(Object.keys(FIELD) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`rounded-chip px-3 py-1.5 text-[11px] font-semibold transition ${
                metric === m
                  ? "bg-bg-soft-pink text-accent-rose"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Pixel heights to avoid % height bug with implicit grid rows */}
      <div
        className="mt-5 flex items-end gap-3"
        style={{ height: CHART_H }}
      >
        {data.map((d, i) => {
          const v = d[field] as number;
          const barH = Math.max(8, Math.round((v / max) * CHART_H));
          const isToday = i === data.length - 1;
          return (
            <div
              key={d.day}
              className="flex-1 rounded-md transition-all"
              style={{
                height: barH,
                background: isToday
                  ? "linear-gradient(180deg, #cc8a96 0%, #9889c4 100%)"
                  : "#e8e4dc",
              }}
              aria-label={`${d.day}: ${v}`}
            />
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-3 text-center text-[11px] text-text-muted">
        {data.map((d) => (
          <div key={d.day}>{d.day}</div>
        ))}
      </div>
    </section>
  );
}
