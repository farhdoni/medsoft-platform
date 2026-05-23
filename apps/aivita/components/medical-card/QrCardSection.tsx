'use client';
import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

interface Card {
  cardCode: string;
  url: string;
  accessCount: number;
  isActive: boolean;
}

type Status = 'loading' | 'ok' | 'error';

export default function QrCardSection() {
  const [card, setCard] = useState<Card | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [showQr, setShowQr] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchCard = useCallback(async () => {
    setStatus('loading');
    try {
      const r = await fetch('/api/proxy/card/my');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json() as { data?: Card };
      if (j.data?.cardCode) {
        setCard(j.data);
        setStatus('ok');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void fetchCard();
  }, [fetchCard]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/proxy/card/regenerate', { method: 'POST' });
      const j = await res.json() as { data?: Partial<Card> };
      if (j.data) setCard(prev => prev ? { ...prev, ...j.data } : null);
    } catch { /* ignore */ }
    setRegenerating(false);
  };

  const handleShare = async () => {
    if (!card) return;
    if (navigator.share) {
      await navigator.share({ title: 'Моя медкарта Aivita', url: card.url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(card.url).catch(() => {});
    }
  };

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="w-full bg-white border border-[#e8e4dc] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-[#f0ede8] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[#f0ede8] rounded w-32" />
          <div className="h-2 bg-[#f0ede8] rounded w-48" />
        </div>
      </div>
    );
  }

  // ── Error / retry ────────────────────────────────────────────────────────────
  if (status === 'error' || !card) {
    return (
      <button
        onClick={() => void fetchCard()}
        className="w-full bg-white border border-[#e8e4dc] rounded-2xl p-4 flex items-center gap-3 hover:bg-[#faf9f6] transition-colors active:opacity-80"
      >
        <div className="w-10 h-10 rounded-full bg-[color:var(--accent-bg-light)] flex items-center justify-center text-lg flex-shrink-0">
          📱
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#2a2540]">QR-код медкарты</div>
          <div className="text-xs text-[#e07070]">Нажмите для загрузки</div>
        </div>
        <span className="text-[10px] text-[#9a96a8] flex-shrink-0">↻</span>
      </button>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(card.url)}`;

  return (
    <>
      <button
        onClick={() => setShowQr(true)}
        className="w-full bg-white border border-[#e8e4dc] rounded-2xl p-4 flex items-center gap-3 hover:bg-[#faf9f6] transition-colors active:opacity-80"
      >
        <div className="w-10 h-10 rounded-full bg-[color:var(--accent-bg-light)] flex items-center justify-center text-lg flex-shrink-0">
          📱
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#2a2540]">QR-код медкарты</div>
          <div className="text-xs text-[#9a96a8] font-mono">{card.cardCode}</div>
        </div>
        <span className="text-[10px] text-[#9a96a8] flex-shrink-0">
          Открыто {card.accessCount} раз
        </span>
      </button>

      <Modal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        title="МОЯ МЕДКАРТА"
        footer={
          <div className="space-y-2">
            <div className="flex gap-2">
              <a
                href={qrUrl}
                download={`aivita-card-${card.cardCode}.png`}
                className="flex-1 py-3 bg-app-bg text-app-t2 rounded-xl text-xs font-medium text-center"
              >
                📥 Скачать
              </a>
              <button
                onClick={handleShare}
                className="flex-1 py-3 text-white rounded-xl text-xs font-medium"
                style={{ background: 'var(--accent-dark)' }}
              >
                📤 Поделиться
              </button>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full py-2.5 border border-app-border text-app-t3 rounded-xl text-xs"
            >
              {regenerating ? 'Обновление...' : '🔄 Сгенерировать новый код'}
            </button>
          </div>
        }
      >
        <div className="text-center">
          <p className="text-xs text-app-t3 mb-4">Покажите врачу для быстрого доступа</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR код медкарты"
            className="mx-auto w-48 h-48 rounded-xl mb-3"
          />
          <p className="text-xs text-[color:var(--accent-dark)] font-mono mb-1">{card.cardCode}</p>
          <p className="text-xs text-app-t3">{card.url}</p>
        </div>
      </Modal>
    </>
  );
}
