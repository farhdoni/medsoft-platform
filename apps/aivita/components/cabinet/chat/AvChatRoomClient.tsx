"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender: "doctor" | "patient" | "system";
  text?: string;
  time: string;
  isRead?: boolean;
  replyTo?: { senderName: string; text: string };
  prescription?: {
    drugName: string;
    dosage: string;
    instructions: string;
    isAdded?: boolean;
  };
  voiceNote?: {
    duration: string;
    waveform: number[];
  };
}

export function AvChatRoomClient({
  conversationId,
  locale = "ru",
}: {
  conversationId: string;
  locale?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "doctor",
      text: "Здравствуйте, Фарход! Изучил ваш профиль и показатели. Направляю курс поддерживающей терапии:",
      time: "10:42",
      prescription: {
        drugName: "Кардиомагнил 75 мг",
        dosage: "1 таб. утром после еды",
        instructions: "Курс 30 дней для нормализации кровотока",
        isAdded: false,
      },
    },
    {
      id: "msg-2",
      sender: "patient",
      text: "Спасибо, доктор! Уже добавил в аптечку на 09:00.",
      time: "10:45",
      isRead: true,
      replyTo: {
        senderName: "Д-р Анвар Шарипов",
        text: "💊 Кардиомагнил 75 мг",
      },
    },
    {
      id: "msg-3",
      sender: "doctor",
      time: "10:48",
      voiceNote: {
        duration: "0:42",
        waveform: [20, 45, 80, 60, 30, 90, 75, 40, 65, 85, 30, 50, 70, 95, 40, 25],
      },
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<"1x" | "1.5x" | "2x">("1x");
  const [callModal, setCallModal] = useState<"audio" | "video" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputVal.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "patient",
      text: inputVal.trim(),
      time: timeStr,
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal("");
  };

  const handleAddPrescriptionToSchedule = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.prescription) {
          return {
            ...m,
            prescription: { ...m.prescription, isAdded: true },
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f3ef]">
      {/* ── 1. Telegram-Style Doctor Header ───────────────────────────────── */}
      <header className="flex items-center justify-between px-3.5 pt-3 pb-2 bg-white/90 backdrop-blur-md border-b border-[#e8e4dc] sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/messenger`)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold text-[#2a2540] hover:bg-[#f4f3ef] transition"
          >
            ←
          </button>
          
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6BA3D6] to-[#4a7fb5] flex items-center justify-center text-base text-white font-bold shadow-sm">
              👨‍⚕️
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-black text-[#2a2540] truncate leading-tight">
              Д-р Анвар Шарипов
            </h2>
            <p className="text-[10px] text-green-600 font-bold leading-none mt-0.5">
              в сети · Кардиолог
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-base text-[#6a6580]">
          <button
            type="button"
            onClick={() => setCallModal("audio")}
            className="w-8 h-8 rounded-full hover:bg-[#f4f3ef] flex items-center justify-center transition"
            title="Аудиозвонок"
          >
            📞
          </button>
          <button
            type="button"
            onClick={() => setCallModal("video")}
            className="w-8 h-8 rounded-full hover:bg-[#f4f3ef] flex items-center justify-center transition"
            title="Видеоконсультация"
          >
            📹
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full hover:bg-[#f4f3ef] flex items-center justify-center transition"
            title="Меню"
          >
            ⋯
          </button>
        </div>
      </header>

      {/* ── 2. Messages Stream (Telegram Bubbles) ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="px-3.5 py-1 rounded-full bg-[#e8e4dc]/80 text-[#6a6580] text-[10px] font-extrabold shadow-2xs backdrop-blur-xs">
            Сегодня, 15 августа
          </span>
        </div>

        {messages.map((msg) => {
          const isDoctor = msg.sender === "doctor";

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-1.5 ${isDoctor ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-[20px] p-3 shadow-xs space-y-2 ${
                  isDoctor
                    ? "bg-white text-[#2a2540] rounded-bl-xs border border-[#e8e4dc]"
                    : "bg-[#9c5e6c] text-white rounded-br-xs"
                }`}
              >
                {/* Reply Quote Preview */}
                {msg.replyTo && (
                  <div className="border-l-2 border-white/60 bg-black/10 rounded-r-lg px-2.5 py-1 text-[10px] mb-1">
                    <div className="font-bold text-white/90">{msg.replyTo.senderName}</div>
                    <div className="text-white/75 truncate">{msg.replyTo.text}</div>
                  </div>
                )}

                {/* Text content */}
                {msg.text && (
                  <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
                )}

                {/* Rich Prescription Widget */}
                {msg.prescription && (
                  <div className="rounded-xl bg-[#f2faf3] border border-[#b8d8bc] p-2.5 space-y-1 text-[#2a2540]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#2a5a3a] flex items-center gap-1">
                        💊 {msg.prescription.drugName}
                      </span>
                      <span className="text-[9px] font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded">
                        Рецепт
                      </span>
                    </div>
                    <p className="text-[10px] text-[#4a6a50] font-semibold">
                      {msg.prescription.dosage}
                    </p>
                    <p className="text-[9px] text-[#6a7a6a]">
                      {msg.prescription.instructions}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleAddPrescriptionToSchedule(msg.id)}
                      disabled={msg.prescription.isAdded}
                      className={`mt-1.5 w-full py-1.5 text-[10px] font-black rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all ${
                        msg.prescription.isAdded
                          ? "bg-green-600 text-white cursor-default"
                          : "bg-[#d4efe4] hover:bg-[#c0e8d5] text-[#1e5a38] active:scale-95"
                      }`}
                    >
                      {msg.prescription.isAdded ? (
                        <span>✓ Добавлено в «Лекарства»</span>
                      ) : (
                        <span>+ Добавить в расписание лекарств</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Voice Note Player (Telegram Waveform) */}
                {msg.voiceNote && (
                  <div className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                      className="w-9 h-9 rounded-full bg-[#6BA3D6] text-white flex items-center justify-center text-xs shadow-md active:scale-95 transition"
                    >
                      {isPlayingVoice ? "❚❚" : "▶"}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-0.5 h-4">
                        {msg.voiceNote.waveform.map((h, i) => (
                          <div
                            key={i}
                            className="w-1 bg-[#6BA3D6] rounded-full transition-all"
                            style={{ height: `${(h / 100) * 16}px` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-[#9a96a8]">
                        <span>{msg.voiceNote.duration}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceSpeed(
                              voiceSpeed === "1x" ? "1.5x" : voiceSpeed === "1.5x" ? "2x" : "1x"
                            );
                          }}
                          className="bg-[#f0edf8] text-[#6e5fa0] font-black px-1.5 py-0.2 rounded hover:bg-[#e0d8f0]"
                        >
                          {voiceSpeed}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time & Delivery Checkmarks */}
                <div
                  className={`flex items-center gap-1 text-[9px] justify-end ${
                    isDoctor ? "text-[#9a96a8]" : "text-white/80"
                  }`}
                >
                  <span>{msg.time}</span>
                  {!isDoctor && <span className="text-blue-200 font-black">✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 3. Telegram Input Bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8e4dc] px-3 py-2 z-40 shadow-lg">
        <div className="max-w-[1100px] mx-auto flex items-center gap-2">
          {/* Paperclip / Attach */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(true)}
            className="text-xl text-[#6a6580] hover:text-[#9c5e6c] p-1 transition"
            title="Прикрепить"
          >
            📎
          </button>

          {/* Input field */}
          <div className="flex-1 bg-[#f4f3ef] rounded-full px-3.5 py-1.5 flex items-center gap-2 border border-[#e8e4dc] focus-within:border-[#9c5e6c] transition-colors">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Сообщение..."
              className="bg-transparent text-xs text-[#2a2540] placeholder-[#9a96a8] flex-1 outline-none font-medium"
            />
            <button type="button" className="text-sm text-[#9a96a8] hover:text-[#2a2540]">
              😀
            </button>
          </div>

          {/* Send / Mic button */}
          {inputVal.trim() ? (
            <button
              type="button"
              onClick={handleSendMessage}
              className="w-9 h-9 rounded-full bg-[#9c5e6c] text-white flex items-center justify-center text-sm shadow-md hover:bg-[#854b58] active:scale-95 transition"
              title="Отправить"
            >
              ➤
            </button>
          ) : (
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[#9c5e6c] text-white flex items-center justify-center text-sm shadow-md hover:bg-[#854b58] active:scale-95 transition"
              title="Голосовое сообщение"
            >
              🎤
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Telegram Attachment Action Sheet ───────────────────────────── */}
      {showAttachMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center"
          onClick={() => setShowAttachMenu(false)}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-t-[32px] p-5 space-y-4 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#e8e4dc] rounded-full mx-auto mb-1" />

            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-[#2a2540]">Прикрепить к сообщению</h3>
              <button
                type="button"
                onClick={() => setShowAttachMenu(false)}
                className="text-xs font-bold text-[#9a96a8]"
              >
                Отмена
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#fdf5f7] border border-[#f0d4dc] cursor-pointer hover:bg-[#fbf0f3] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#cc8a96] to-[#9c5e6c] text-white flex items-center justify-center text-lg shadow-sm">
                  📷
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Фото / Чек</span>
              </div>

              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#edf4fc] border border-[#dbeeff] cursor-pointer hover:bg-[#e4effc] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6BA3D6] to-[#4a7fb5] text-white flex items-center justify-center text-lg shadow-sm">
                  📄
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Анализы PDF</span>
              </div>

              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#edf7f0] border border-[#d4e8d8] cursor-pointer hover:bg-[#e4f2e8] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#548068] to-[#3a5a48] text-white flex items-center justify-center text-lg shadow-sm">
                  ❤️
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Замер пульса</span>
              </div>

              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#f0edf8] border border-[#e0d8f0] cursor-pointer hover:bg-[#e8e2f4] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#8e7db8] to-[#6e5fa0] text-white flex items-center justify-center text-lg shadow-sm">
                  📋
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Медкарта</span>
              </div>

              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#fffdf5] border border-[#ffe8a3] cursor-pointer hover:bg-[#fff9e6] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e8a838] to-[#c98020] text-white flex items-center justify-center text-lg shadow-sm">
                  💊
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Лекарства</span>
              </div>

              <div
                onClick={() => setShowAttachMenu(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#f4f3ef] border border-[#e8e4dc] cursor-pointer hover:bg-[#eae6de] active:scale-95 transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#9a96a8] to-[#6a6580] text-white flex items-center justify-center text-lg shadow-sm">
                  👤
                </div>
                <span className="text-[11px] font-bold text-[#2a2540]">Врач</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Call Modal Sheet ───────────────────────────────────────────── */}
      {callModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCallModal(null)}
        >
          <div
            className="w-full max-w-[340px] bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6BA3D6] to-[#4a7fb5] text-white flex items-center justify-center text-3xl mx-auto shadow-md">
              👨‍⚕️
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#2a2540]">Д-р Анвар Шарипов</h3>
              <p className="text-xs text-[#6a6580]">
                {callModal === "video" ? "Видеоконсультация" : "Аудиозвонок"}
              </p>
            </div>
            <p className="text-[11px] text-[#9a96a8]">
              Соединение через защищённый медицинский телемед-шлюз AIVITA...
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCallModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold shadow-md hover:bg-red-600 active:scale-95 transition"
              >
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
