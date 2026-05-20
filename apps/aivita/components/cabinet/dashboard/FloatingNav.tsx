"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/cabinet/icons/Icon";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_LS_KEY = 'aivita_nav_config';

export const ALL_NAV_OPTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "home",        label: "Главная",   icon: "home"   },
  { id: "vitals",      label: "Биометрия", icon: "heart"  },
  { id: "medications", label: "Лекарства", icon: "pill"   },
  { id: "gadgets",     label: "Гаджеты",   icon: "steps"  },
  { id: "family",      label: "Семья",     icon: "family" },
];

const DEFAULT_NAV = { left: ["home", "vitals"], right: ["medications", "family"] };

export function loadNavConfig(): { left: string[]; right: string[] } {
  try {
    const raw = localStorage.getItem(NAV_LS_KEY);
    if (raw) return JSON.parse(raw) as { left: string[]; right: string[] };
  } catch {}
  return DEFAULT_NAV;
}

export function saveNavConfig(cfg: { left: string[]; right: string[] }) {
  try { localStorage.setItem(NAV_LS_KEY, JSON.stringify(cfg)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FloatingNav({ active = "home" }: { active?: string }) {
  const t = useTranslations('app.nav');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  const [navConfig, setNavConfig] = useState(DEFAULT_NAV);
  useEffect(() => { setNavConfig(loadNavConfig()); }, []);

  function go(id: string) {
    router.push(`/${locale}/${id}`);
  }

  function openAiChat() {
    router.push(`/${locale}/ai-chat`);
  }

  const leftTabs  = navConfig.left.map(id  => ALL_NAV_OPTIONS.find(o => o.id === id)).filter(Boolean) as typeof ALL_NAV_OPTIONS;
  const rightTabs = navConfig.right.map(id => ALL_NAV_OPTIONS.find(o => o.id === id)).filter(Boolean) as typeof ALL_NAV_OPTIONS;

  function renderTab(tab: (typeof ALL_NAV_OPTIONS)[0]) {
    const isActive = tab.id === active;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => go(tab.id)}
        className="flex flex-col items-center gap-0.5 rounded-[20px] px-2.5 py-1.5 transition sm:px-3 sm:py-2"
        style={isActive ? { background: 'var(--accent-light)' } : undefined}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon name={tab.icon} size={22} />
        <span
          className="text-[10px] font-semibold"
          style={{ color: isActive ? 'var(--accent-dark)' : '#9a96a8' }}
        >
          {t(tab.id as Parameters<typeof t>[0])}
        </span>
      </button>
    );
  }

  return (
    <nav className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 max-w-[calc(100vw-24px)]">
      <div className="flex items-end gap-1 rounded-[28px] bg-white px-2 pb-2 pt-2 shadow-dropdown">
        {/* Left tabs */}
        {leftTabs.map(renderTab)}

        {/* Center AI Aura button — navigates to /ai-chat */}
        <button
          type="button"
          aria-label={t('aiAssistant')}
          onClick={openAiChat}
          className="relative -mt-4 mx-1 flex-shrink-0 transition-transform active:scale-95 hover:scale-105"
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ animation: 'aura-pulse 2s ease-in-out infinite' }}
          />
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 4px 10px rgba(156,94,108,0.38))' }}>
            <defs>
              <linearGradient id="aura-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="var(--accent,       #9c5e6c)"/>
                <stop offset="100%" stopColor="var(--accent-light,  #cc8a96)"/>
              </linearGradient>
              <radialGradient id="aura-glare" cx="38%" cy="32%" r="55%">
                <stop offset="0%"   stopColor="white" stopOpacity="0.55"/>
                <stop offset="50%"  stopColor="white" stopOpacity="0.05"/>
                <stop offset="100%" stopColor="black" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="aura-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="white"   stopOpacity="0.8"/>
                <stop offset="30%"  stopColor="#cc8a96" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#6a3845" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Outer aura halo */}
            <circle cx="26" cy="26" r="26" fill="var(--accent, #9c5e6c)" opacity="0.14"/>

            {/* Main body */}
            <circle cx="26" cy="26" r="22" fill="url(#aura-grad)"/>
            <circle cx="26" cy="26" r="22" fill="none" stroke="white" strokeWidth="2"/>

            {/* Inner lens ring */}
            <circle cx="26" cy="26" r="15" fill="none" stroke="white" strokeWidth="0.4" strokeOpacity="0.22"/>

            {/* Lens pupil */}
            <circle cx="26" cy="26" r="10" fill="#4a2030" opacity="0.5"/>
            <circle cx="26" cy="26" r="10" fill="url(#aura-glare)"/>

            {/* AI sparkle particles */}
            <circle cx="11" cy="19" r="1"   fill="white" opacity="0.50"/>
            <circle cx="41" cy="22" r="0.8" fill="white" opacity="0.40"/>
            <circle cx="14" cy="34" r="0.8" fill="white" opacity="0.40"/>
            <circle cx="38" cy="32" r="1"   fill="white" opacity="0.45"/>
            <circle cx="18" cy="13" r="0.6" fill="white" opacity="0.30"/>
            <circle cx="34" cy="39" r="0.6" fill="white" opacity="0.30"/>
            <circle cx="8"  cy="27" r="0.5" fill="white" opacity="0.25"/>
            <circle cx="44" cy="28" r="0.5" fill="white" opacity="0.25"/>

            {/* Core glow */}
            <circle cx="26" cy="26" r="4"   fill="url(#aura-core)"/>
            <circle cx="26" cy="26" r="1.5" fill="white" opacity="0.85"/>
          </svg>
        </button>

        {/* Right tabs */}
        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
