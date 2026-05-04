"use client";

import { Icon, type IconName } from "@/components/icons/Icon";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon: IconName;
}

/**
 * 5-tab bottom bar with a centered "+" FAB.
 * Layout: [Главная] [Тест] [ + ] [Семья] [Профиль]
 *
 * In React Native: build with @react-navigation/bottom-tabs +
 * a custom tabBar component to render the centered FAB.
 */
const TABS: Tab[] = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "test", label: "Тест", icon: "test" },
  // [+] FAB sits in the middle — see render below
  { id: "family", label: "Семья", icon: "family" },
  { id: "profile", label: "Профиль", icon: "settings" },
];

export function MobileTabBar({
  active = "home",
  onChange,
  onAdd,
}: {
  active?: string;
  onChange?: (id: string) => void;
  onAdd?: () => void;
}) {
  const [current, setCurrent] = useState(active);
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  function pick(id: string) {
    setCurrent(id);
    onChange?.(id);
  }

  return (
    <nav
      role="tablist"
      aria-label="Главное меню"
      className="absolute inset-x-0 bottom-0 z-30 flex h-[78px] items-center justify-around border-t border-border-soft bg-white px-1 pt-1 pb-[18px]"
    >
      {left.map((t) => (
        <TabButton
          key={t.id}
          tab={t}
          active={current === t.id}
          onClick={() => pick(t.id)}
        />
      ))}

      {/* Center FAB — overlapping the bar */}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Добавить"
        className="-mt-7 grid h-[58px] w-[58px] place-items-center rounded-full text-white shadow-[0_8px_24px_rgba(110,95,160,0.4)] transition active:scale-95"
        style={{
          background:
            "linear-gradient(135deg, #9889c4 0%, #6e5fa0 100%)",
        }}
      >
        <span className="text-[28px] font-light leading-none">+</span>
      </button>

      {right.map((t) => (
        <TabButton
          key={t.id}
          tab={t}
          active={current === t.id}
          onClick={() => pick(t.id)}
        />
      ))}
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-0.5"
    >
      <Icon name={tab.icon} size={28} />
      <span
        className={`text-[10px] font-semibold ${
          active ? "text-accent-rose" : "text-text-muted"
        }`}
      >
        {tab.label}
      </span>
    </button>
  );
}
