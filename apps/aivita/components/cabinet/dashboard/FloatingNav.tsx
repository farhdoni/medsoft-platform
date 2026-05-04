"use client";

import { useRouter, useParams } from "next/navigation";
import { Icon, type IconName } from "@/components/cabinet/icons/Icon";

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "home",    label: "Главная",  icon: "heart"  },
  { id: "test",    label: "Тест",     icon: "test"   },
  { id: "habits",  label: "Привычки", icon: "habit"  },
  { id: "nutrition", label: "Питание", icon: "food"  },
  { id: "family",  label: "Семья",    icon: "family" },
];

export function FloatingNav({ active = "home" }: { active?: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  function go(id: string) {
    router.push(`/${locale}/${id}`);
  }

  return (
    <nav className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-[28px] bg-white p-2 shadow-dropdown">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              className={`flex flex-col items-center gap-0.5 rounded-[20px] px-3 py-1.5 transition ${
                isActive ? "bg-bg-soft-pink" : "hover:bg-bg-app"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon name={t.icon} size={26} />
              <span
                className={`text-[10px] font-semibold ${
                  isActive ? "text-accent-rose" : "text-text-secondary"
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
        {/* Central AI FAB */}
        <button
          type="button"
          aria-label="AI ассистент"
          onClick={() => go("chat")}
          className="ml-1 grid h-12 w-12 place-items-center rounded-full bg-accent-purple-deep text-white shadow-card transition hover:scale-105"
        >
          <Icon name="chat" size={26} />
        </button>
      </div>
    </nav>
  );
}
