"use client";

import { Icon, type IconName } from "@/components/icons/Icon";

interface Action {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
}

const ACTIONS: Action[] = [
  { id: "test", icon: "test", title: "Пройти тест 5 систем", subtitle: "5 минут" },
  { id: "meal", icon: "food", title: "Записать приём пищи", subtitle: "Завтрак" },
  { id: "vitamins", icon: "pill", title: "Принять витамины", subtitle: "09:00" },
];

export function MobileQuickActions() {
  return (
    <section className="mx-5 mt-5">
      <div className="mb-2 text-[13px] font-bold text-text-primary">
        Быстрые действия
      </div>
      <div className="flex flex-col gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="flex items-center gap-3 rounded-[14px] border border-border-soft bg-white px-3 py-2.5 text-left transition hover:bg-bg-app"
          >
            <Icon name={a.icon} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary">
                {a.title}
              </div>
              <div className="text-[11px] text-text-muted">{a.subtitle}</div>
            </div>
            <span aria-hidden className="text-[18px] text-text-muted">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
