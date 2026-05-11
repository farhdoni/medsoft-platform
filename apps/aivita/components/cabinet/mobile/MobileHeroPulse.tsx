"use client";

import { Icon } from "@/components/cabinet/icons/Icon";
import type { DailyMetrics } from "@/lib/types";

export function MobileHeroPulse({ metrics }: { metrics: DailyMetrics }) {
  return (
    <section
      className="relative mx-5 mt-3 overflow-hidden rounded-[20px] p-5 text-white"
      style={{
        background:
          "linear-gradient(135deg, var(--hero-from-light) 0%, var(--hero-from) 50%, var(--hero-mid) 100%)",
      }}
    >
      <div className="text-[12px] font-medium opacity-90">Индекс здоровья</div>
      <div className="mt-1 text-[44px] font-extrabold leading-none">
        {metrics.healthIndex.score}
      </div>
      <div className="mt-3 inline-block rounded-chip bg-white/20 px-3 py-1 text-[11px] font-medium backdrop-blur">
        ↑ +{metrics.heartRate.deltaWeek} за неделю · {metrics.healthIndex.label}
      </div>
      <div
        className="absolute -bottom-2 -right-2"
        aria-hidden
      >
        <Icon name="heart" size={86} />
      </div>
    </section>
  );
}
