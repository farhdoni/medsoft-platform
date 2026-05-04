"use client";

import { Icon } from "@/components/icons/Icon";

export function MobileAIRow() {
  return (
    <section className="mx-5 mt-4 flex items-center gap-3 rounded-[16px] border border-border-soft bg-white p-3">
      <Icon name="doctor" size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[13px] font-bold text-text-primary">
            AI ассистент
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-mint" aria-label="онлайн" />
        </div>
        <div className="mt-0.5 truncate text-[11px] text-text-muted">
          Расшифрую анализ, по…
        </div>
      </div>
      <button
        type="button"
        className="rounded-chip bg-accent-rose px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#8a4f5d]"
      >
        Спросить
      </button>
    </section>
  );
}
