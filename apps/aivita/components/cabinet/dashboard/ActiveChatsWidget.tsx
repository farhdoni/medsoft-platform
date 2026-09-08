"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/messenger/Avatar";
import { displayName, formatListTime, previewOf } from "@/components/messenger/format";
import type { MessengerUser } from "@/components/messenger/types";

interface Props {
  locale: string;
}

type ConversationSummary = {
  id: string;
  participant: MessengerUser | null;
  lastMessage: {
    content: string | null;
    type?: string;
    attachmentUrl?: string | null;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type TodayMedication = {
  scheduleId: string;
  title: string;
  time: string;
  status: string;
};

const PROXY = "/api/proxy";

/** GET helper that never throws — a network hiccup degrades to the empty state, not a crash. */
async function safeJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = (await res.json()) as { data?: T };
    return json?.data ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Home-screen preview of the real AV Chat inbox + today's pending medications.
 *
 * Same data sources as the live screens it links to:
 *  - GET /messaging/conversations — the exact endpoint /messenger reads
 *    (apps/aivita/app/[locale]/(app)/messenger/MessengerHubClient.tsx),
 *    already sorted pinned-first-then-recency by the API.
 *  - GET /medications/today — the exact endpoint /medications reads.
 *
 * No fabricated online indicator: the conversations API has no presence field,
 * so unlike the old mock there is no green dot here — it would be lying.
 */
export function ActiveChatsWidget({ locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pendingMeds, setPendingMeds] = useState<TodayMedication[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [convData, medData] = await Promise.all([
        safeJson<ConversationSummary[]>(`${PROXY}/messaging/conversations`, []),
        safeJson<TodayMedication[]>(`${PROXY}/medications/today`, []),
      ]);
      if (cancelled) return;
      setConversations(convData);
      setPendingMeds(medData.filter((m) => m.status === "pending"));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-3 mt-4 sm:mx-7">
        <div className="mb-2 h-3 w-40 animate-pulse rounded bg-[#e8e4dc]" />
        <div className="h-[72px] animate-pulse rounded-[22px] border border-[#e8e4dc] bg-[#f5f3ee]" />
      </section>
    );
  }

  const topConversation = conversations[0] ?? null;
  const nextMed = pendingMeds[0] ?? null;
  const totalChats = conversations.length;
  const isEmpty = !topConversation && !nextMed;

  return (
    <section className="mx-3 mt-4 sm:mx-7">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#6a6580]">
          Сообщения и назначения
        </h3>
        {totalChats > 0 && (
          <button
            type="button"
            onClick={() => router.push(`/${locale}/messenger`)}
            className="text-[11px] font-bold text-[#9c5e6c] hover:underline"
          >
            Все чаты ({totalChats}) →
          </button>
        )}
      </div>

      {isEmpty ? (
        // No real conversations and nothing pending today — a quick action,
        // not a fake preview card.
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/doctors`)}
            className="flex-1 rounded-[18px] border border-[#e8e4dc] bg-white px-3.5 py-3 text-left text-xs font-bold text-[#2a2540] transition-all hover:border-[#f0d4dc] active:scale-[0.99]"
          >
            💬 Написать врачу
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/ai-chat`)}
            className="flex-1 rounded-[18px] border border-[#e8e4dc] bg-white px-3.5 py-3 text-left text-xs font-bold text-[#2a2540] transition-all hover:border-[#f0d4dc] active:scale-[0.99]"
          >
            🤖 Задать вопрос AI
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {topConversation && (
            <div
              onClick={() => router.push(`/${locale}/messenger/${topConversation.id}`)}
              className="group relative flex cursor-pointer items-center gap-3.5 rounded-[22px] border border-[#e8e4dc] bg-white p-3.5 shadow-card transition-all hover:border-[#f0d4dc] hover:shadow-md active:scale-[0.99]"
            >
              <Avatar user={topConversation.participant} size={44} />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <h4 className="truncate text-xs font-black text-[#2a2540] group-hover:text-[#9c5e6c]">
                    {displayName(topConversation.participant)}
                  </h4>
                  <span className="text-[10px] font-black text-[#9c5e6c]">
                    {formatListTime(
                      topConversation.lastMessageAt ?? topConversation.lastMessage?.createdAt ?? null,
                    )}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-semibold text-[#6a6580]">
                    {topConversation.lastMessage
                      ? previewOf(
                          topConversation.lastMessage.content,
                          topConversation.lastMessage.type,
                          !!topConversation.lastMessage.attachmentUrl,
                        )
                      : "Нет сообщений"}
                  </p>
                  {topConversation.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#9c5e6c] px-1 text-[10px] font-black text-white shadow-sm">
                      {topConversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {nextMed && (
            <div
              onClick={() => router.push(`/${locale}/medications`)}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-[18px] border border-[#e8e4dc] bg-white px-3.5 py-2.5 transition-all hover:border-[#f0d4dc] active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-bold text-[#548068]">
                <span>💊</span>
                <span className="truncate">
                  {nextMed.title} · {nextMed.time}
                </span>
              </div>
              {pendingMeds.length > 1 && (
                <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#548068] px-1 text-[10px] font-black text-white shadow-sm">
                  {pendingMeds.length}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
