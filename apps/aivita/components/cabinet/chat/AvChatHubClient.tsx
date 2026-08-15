"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DoctorDialog {
  id: string;
  name: string;
  specialization: string;
  clinic: string;
  avatarEmoji: string;
  avatarBg: string;
  isOnline: boolean;
  lastTime: string;
  unreadCount: number;
  lastMessage: {
    type: "text" | "prescription" | "voice" | "image";
    content: string;
    isDoctor: boolean;
    isRead: boolean;
  };
}

const INITIAL_DIALOGS: DoctorDialog[] = [
  {
    id: "dr-anvar-sharipov",
    name: "Д-р Анвар Шарипов",
    specialization: "Кардиолог",
    clinic: "Клиника MedSoft",
    avatarEmoji: "👨‍⚕️",
    avatarBg: "from-[#6BA3D6] to-[#4a7fb5]",
    isOnline: true,
    lastTime: "10:45",
    unreadCount: 1,
    lastMessage: {
      type: "prescription",
      content: "Назначение: Кардиомагнил 75 мг (1 таб. утром)",
      isDoctor: true,
      isRead: false,
    },
  },
  {
    id: "dr-malika-karimova",
    name: "Д-р Малика Каримова",
    specialization: "Эндокринолог",
    clinic: "Высшая категория",
    avatarEmoji: "👩‍⚕️",
    avatarBg: "from-[#d6cfee] to-[#9889c4]",
    isOnline: false,
    lastTime: "Вчера",
    unreadCount: 0,
    lastMessage: {
      type: "voice",
      content: "Голосовое сообщение (0:42)",
      isDoctor: true,
      isRead: true,
    },
  },
  {
    id: "support-concierge",
    name: "Служба заботы AIVITA",
    specialization: "Медицинский куратор",
    clinic: "Поддержка 24/7",
    avatarEmoji: "🎧",
    avatarBg: "from-[#8e7db8] to-[#6e5fa0]",
    isOnline: true,
    lastTime: "12 авг",
    unreadCount: 0,
    lastMessage: {
      type: "text",
      content: "Запись на комплексный чекап подтверждена.",
      isDoctor: false,
      isRead: true,
    },
  },
];

type FolderTab = "all" | "doctors" | "ai" | "prescriptions" | "archive";

export function AvChatHubClient({ locale = "ru" }: { locale?: string }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<FolderTab>("all");
  const [showSettings, setShowSettings] = useState(false);

  // Filtered dialogs
  const filteredDialogs = useMemo(() => {
    return INITIAL_DIALOGS.filter((d) => {
      // Search match
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // Folder match
      if (activeFolder === "doctors") return d.id.startsWith("dr-");
      if (activeFolder === "prescriptions") return d.lastMessage.type === "prescription";
      if (activeFolder === "archive") return false;
      return true;
    });
  }, [searchQuery, activeFolder]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f3ef] pb-32">
      {/* ── 1. Top Telegram-Style Header ───────────────────────────────────── */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-[#e8e4dc] sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#2a2540] tracking-tight">Сообщения</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0d4dc] text-[#9c5e6c] text-[11px] font-black">
              2 новых
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-full bg-[#f4f3ef] hover:bg-[#eae6de] flex items-center justify-center text-sm transition"
              title="Настройки чатов"
            >
              ⚙️
            </button>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/find-doctor`)}
              className="w-9 h-9 rounded-full bg-[#9c5e6c] hover:bg-[#854b58] text-white flex items-center justify-center text-sm font-bold shadow-md transition active:scale-95"
              title="Написать врачу"
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Search Bar (WhatsApp style) */}
        <div className="flex items-center gap-2 bg-[#f4f3ef] rounded-2xl px-3.5 py-2 border border-[#e8e4dc] focus-within:border-[#9c5e6c] transition-colors">
          <span className="text-xs text-[#9a96a8]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по врачам, диалогам, рецептам..."
            className="bg-transparent text-xs text-[#2a2540] placeholder-[#9a96a8] flex-1 outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-[#9a96a8] hover:text-[#2a2540]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Telegram-Style Folders / Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto scrollbar-hide -mx-1 px-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveFolder("all")}
            className={`px-3.5 py-1.5 rounded-full font-black whitespace-nowrap transition-all ${
              activeFolder === "all"
                ? "bg-[#9c5e6c] text-white shadow-sm"
                : "bg-[#f4f3ef] text-[#6a6580] hover:bg-[#eae6de]"
            }`}
          >
            Все (4)
          </button>
          <button
            type="button"
            onClick={() => setActiveFolder("doctors")}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFolder === "doctors"
                ? "bg-[#9c5e6c] text-white shadow-sm"
                : "bg-[#f4f3ef] text-[#6a6580] hover:bg-[#eae6de]"
            }`}
          >
            <span>👨‍⚕️ Врачи</span>
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                activeFolder === "doctors"
                  ? "bg-white text-[#9c5e6c]"
                  : "bg-[#6BA3D6] text-white"
              }`}
            >
              2
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFolder("ai")}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              activeFolder === "ai"
                ? "bg-[#9c5e6c] text-white shadow-sm"
                : "bg-[#f4f3ef] text-[#6a6580] hover:bg-[#eae6de]"
            }`}
          >
            🤖 AI-Консилиум
          </button>
          <button
            type="button"
            onClick={() => setActiveFolder("prescriptions")}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
              activeFolder === "prescriptions"
                ? "bg-[#9c5e6c] text-white shadow-sm"
                : "bg-[#f4f3ef] text-[#6a6580] hover:bg-[#eae6de]"
            }`}
          >
            💊 Рецепты
          </button>
        </div>
      </div>

      {/* ── 2. Dialogs Feed (WhatsApp / Telegram List) ────────────────────── */}
      <div className="divide-y divide-[#eceae4] bg-white shadow-sm">
        {/* 📌 PINNED DIALOG: AI Health Assistant */}
        {(activeFolder === "all" || activeFolder === "ai") && (
          <div
            onClick={() => router.push(`/${locale}/ai-chat`)}
            className="flex items-center gap-3.5 p-4 bg-[#fdfafb] hover:bg-[#f9f3f5] cursor-pointer transition-colors border-b border-[#f0e8eb]"
          >
            <div className="relative flex-shrink-0">
              <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#b89dc4] to-[#9c5e6c] flex items-center justify-center text-xl text-white shadow-md">
                ✨
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-black text-xs text-[#2a2540] flex items-center gap-1.5 truncate">
                  <span>AIVITA AI Консилиум</span>
                  <span className="text-[10px] text-[#9c5e6c]" title="Закреплённый чат">
                    📌
                  </span>
                </h3>
                <span className="text-[10px] font-bold text-[#9c5e6c]">11:20</span>
              </div>
              <p className="text-[10px] text-[#9c5e6c] font-semibold">
                Персональный медицинский AI-ассистент
              </p>
              <p className="text-[11px] text-[#6a6580] truncate mt-0.5">
                <span className="text-[#9c5e6c] font-bold">AI:</span> Пульс 72 уд/мин в норме.
                Напомнить о приёме воды?
              </p>
            </div>
          </div>
        )}

        {/* Doctor Dialogs */}
        {filteredDialogs.map((dialog) => {
          const isPrescription = dialog.lastMessage.type === "prescription";
          const isVoice = dialog.lastMessage.type === "voice";

          return (
            <div
              key={dialog.id}
              onClick={() => router.push(`/${locale}/chat/${dialog.id}`)}
              className="flex items-center gap-3.5 p-4 hover:bg-[#f8f7f4] cursor-pointer transition-colors active:bg-[#f2efe9]"
            >
              {/* Doctor Avatar + Online Dot */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-13 h-13 rounded-full bg-gradient-to-br ${dialog.avatarBg} flex items-center justify-center text-xl text-white font-bold shadow-md`}
                >
                  {dialog.avatarEmoji}
                </div>
                {dialog.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                )}
              </div>

              {/* Text / Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-black text-xs text-[#2a2540] truncate">{dialog.name}</h3>
                  <span
                    className={`text-[10px] ${
                      dialog.unreadCount > 0
                        ? "font-black text-[#9c5e6c]"
                        : "font-semibold text-[#9a96a8]"
                    }`}
                  >
                    {dialog.lastTime}
                  </span>
                </div>

                <p className="text-[10px] text-[#6a6580] font-medium truncate">
                  {dialog.specialization} · {dialog.clinic}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5 text-[11px] truncate">
                    {dialog.lastMessage.isRead && (
                      <span className="text-blue-500 font-bold">✓✓</span>
                    )}
                    {isPrescription && <span>💊</span>}
                    {isVoice && <span>🎤</span>}
                    <span
                      className={`truncate ${
                        isPrescription
                          ? "text-[#548068] font-bold"
                          : dialog.unreadCount > 0
                          ? "text-[#2a2540] font-bold"
                          : "text-[#6a6580]"
                      }`}
                    >
                      {dialog.lastMessage.content}
                    </span>
                  </div>

                  {dialog.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#9c5e6c] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm ml-2">
                      {dialog.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Floating Action Button (New Consultation) ─────────────────── */}
      <button
        type="button"
        onClick={() => router.push(`/${locale}/find-doctor`)}
        className="fixed bottom-24 right-5 z-40 w-13 h-13 rounded-full bg-gradient-to-br from-[#9c5e6c] to-[#cc8a96] text-white flex items-center justify-center text-xl shadow-fab hover:scale-105 active:scale-95 transition-all"
        title="Найти врача"
      >
        ➕
      </button>

      {/* ── 4. Telegram-Style Settings Modal Sheet ───────────────────────── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-fade-in"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-t-[32px] p-6 space-y-4 animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#e8e4dc] rounded-full mx-auto mb-1" />

            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base text-[#2a2540]">Настройки AV Chat</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs font-bold text-[#9c5e6c]"
              >
                Готово
              </button>
            </div>

            <div className="space-y-3 divide-y divide-[#f0ede6] text-xs">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-[#2a2540]">Уведомления о сообщениях</div>
                  <div className="text-[10px] text-[#9a96a8]">Звуки и push-уведомления</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#9c5e6c] w-4 h-4" />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="font-bold text-[#2a2540]">Сквозное E2EE-шифрование</div>
                  <div className="text-[10px] text-[#548068]">Включено · Защита персданных</div>
                </div>
                <span className="text-sm">🔒</span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="font-bold text-[#2a2540]">Биометрический вход в чаты</div>
                  <div className="text-[10px] text-[#9a96a8]">Touch ID / Face ID</div>
                </div>
                <input type="checkbox" className="accent-[#9c5e6c] w-4 h-4" />
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] text-[#9a96a8]">
              AIVITA Medical Messenger v1.4 · Стандарты Telegram & WhatsApp
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
