"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "ru";

  const [navConfig, setNavConfig] = useState(DEFAULT_NAV);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNavConfig(loadNavConfig()); }, []);

  function go(id: string) {
    router.push(`/${locale}/${id}`);
  }

  function openCamera() {
    fileInputRef.current?.click();
  }

  function handleCameraFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem('aivita_photo_for_ai', reader.result as string);
      } catch {}
      router.push(`/${locale}/chat?photo=attached`);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const leftTabs  = navConfig.left.map(id  => ALL_NAV_OPTIONS.find(o => o.id === id)).filter(Boolean) as typeof ALL_NAV_OPTIONS;
  const rightTabs = navConfig.right.map(id => ALL_NAV_OPTIONS.find(o => o.id === id)).filter(Boolean) as typeof ALL_NAV_OPTIONS;

  function renderTab(t: (typeof ALL_NAV_OPTIONS)[0]) {
    const isActive = t.id === active;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => go(t.id)}
        className="flex flex-col items-center gap-0.5 rounded-[20px] px-2.5 py-1.5 transition sm:px-3 sm:py-2"
        style={isActive ? { background: 'var(--accent-light)' } : undefined}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon name={t.icon} size={22} />
        <span
          className="text-[10px] font-semibold"
          style={{ color: isActive ? 'var(--accent-dark)' : '#9a96a8' }}
        >
          {t.label}
        </span>
      </button>
    );
  }

  return (
    <nav className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 max-w-[calc(100vw-24px)]">
      {/* Hidden camera file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraFile}
      />

      <div className="flex items-end gap-1 rounded-[28px] bg-white px-2 pb-2 pt-2 shadow-dropdown">
        {/* Left tabs */}
        {leftTabs.map(renderTab)}

        {/* Center camera button — elevated */}
        <div className="flex flex-col items-center mx-1 -mt-5">
          <button
            type="button"
            aria-label="Сфотографировать для AI"
            onClick={openCamera}
            className="grid h-14 w-14 place-items-center rounded-full text-white shadow-card transition hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
          >
            <span className="text-[22px]">📷</span>
          </button>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: '#9a96a8' }}>AI фото</span>
        </div>

        {/* Right tabs */}
        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
}
