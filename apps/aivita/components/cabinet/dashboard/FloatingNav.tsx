"use client";

import { useRouter, useParams } from "next/navigation";
import { Icon, type IconName } from "@/components/cabinet/icons/Icon";

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "home",        label: "Главная",    icon: "home"   },
  { id: "vitals",      label: "Биометрия",  icon: "heart"  },
  { id: "medications", label: "Лекарства",  icon: "pill"   },
  { id: "gadgets",     label: "Гаджеты",    icon: "steps"  },
  { id: "family",      label: "Семья",      icon: "family" },
];

export function FloatingNav({ active = "home" }: { active?: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  function go(id: string) {
    router.push(`/${locale}/${id}`);
  }

  return (
    <nav className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 max-w-[calc(100vw-24px)]">
      <div className="flex items-center gap-1 rounded-[28px] bg-white p-2 shadow-dropdown">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              className="flex flex-col items-center gap-0.5 rounded-[20px] px-2 py-1 transition sm:px-3 sm:py-1.5"
              style={isActive ? { background: 'var(--accent-light)' } : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon name={t.icon} size={22} />
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--accent-dark)' : undefined }}
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
          className="ml-1 grid h-10 w-10 place-items-center rounded-full text-white shadow-card transition hover:scale-105 sm:h-12 sm:w-12"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
        >
          <Icon name="chat" size={22} />
        </button>
      </div>
    </nav>
  );
}
