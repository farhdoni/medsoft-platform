'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~60s — matches the "waiting" copy's expectation

type LinkPair = { deepLink: string; appDeepLink: string };

export function TelegramClient() {
  const t = useTranslations('app.settings');

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [linked, setLinked] = useState(false);
  const [linking, setLinking] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [links, setLinks] = useState<LinkPair | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const loadStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/v1/aivita/notifications/settings`, { credentials: 'include' });
      const json = await res.json() as { data?: { telegramEnabled?: boolean; telegramChatId?: string | null } };
      const isLinked = !!(json.data?.telegramEnabled && json.data?.telegramChatId);
      setLinked(isLinked);
      return isLinked;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void loadStatus().finally(() => setLoadingStatus(false));
    return () => stopPolling();
  }, [loadStatus, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    attemptsRef.current = 0;
    pollRef.current = setInterval(() => {
      attemptsRef.current += 1;
      void loadStatus().then((isLinked) => {
        if (isLinked || attemptsRef.current >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          setWaiting(false);
        }
      });
    }, POLL_INTERVAL_MS);
  }, [loadStatus, stopPolling]);

  // Custom tg:// scheme first — reliably escapes WebView link interception
  // (an https://t.me/... link opened via window.open/location.href from
  // inside an embedded WebView is easy for the host app to swallow as an
  // in-app navigation instead of handing off to the real Telegram app,
  // which is what sent the /start payload nowhere three times in testing).
  // The https link stays visible underneath as an explicit manual fallback
  // instead of guessing at success/failure with visibility-change timers.
  function openDeepLink(pair: LinkPair) {
    window.location.href = pair.appDeepLink;
  }

  async function handleLink() {
    setLinking(true);
    setError('');
    try {
      const res = await fetch(`${API}/v1/aivita/telegram/link`, { method: 'POST', credentials: 'include' });
      const json = await res.json() as { data?: LinkPair };
      if (!json.data?.deepLink || !json.data.appDeepLink) {
        setError(t('telegramLinkError'));
        setLinking(false);
        return;
      }
      setLinks(json.data);
      openDeepLink(json.data);
      setWaiting(true);
      startPolling();
    } catch {
      setError(t('telegramLinkError'));
    }
    setLinking(false);
  }

  async function handleCheckNow() {
    setChecking(true);
    const isLinked = await loadStatus();
    setChecking(false);
    if (isLinked) { stopPolling(); setWaiting(false); }
  }

  async function handleUnlink() {
    setUnlinking(true);
    try {
      await fetch(`${API}/v1/aivita/telegram/link`, { method: 'DELETE', credentials: 'include' });
    } catch { /* best-effort — status refetch below is the source of truth */ }
    await loadStatus();
    setConfirmUnlink(false);
    setUnlinking(false);
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-bold text-[#2a2540] flex items-center gap-2">
          <Send className="w-[18px] h-[18px]" style={{ color: '#3a8fc7' }} />
          Telegram
        </h1>
      </div>

      {loadingStatus ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#9c5e6c]" /></div>
      ) : linked ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#d4e8d8] bg-[#f0f8f2] p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#3a7a4a] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-[#2a2540]">{t('telegramLinkedTitle')}</p>
              <p className="text-[12px] text-[#6a6580] mt-1 leading-relaxed">{t('telegramLinkedDesc')}</p>
            </div>
          </div>

          {!confirmUnlink ? (
            <button onClick={() => setConfirmUnlink(true)}
              className="w-full rounded-xl border border-[#e8e4dc] bg-white py-3 text-[13px] font-semibold text-red-500">
              {t('telegramUnlinkBtn')}
            </button>
          ) : (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#fde8e8' }}>
              <p className="text-[13px] font-semibold text-red-700">{t('telegramUnlinkConfirmTitle')}</p>
              <p className="text-[12px] text-red-600 leading-relaxed">{t('telegramUnlinkConfirmDesc')}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmUnlink(false)}
                  className="flex-1 h-9 rounded-full text-[13px] font-semibold border border-[#e8e4dc] text-[#6a6580]">
                  {t('cancel')}
                </button>
                <button onClick={() => void handleUnlink()} disabled={unlinking}
                  className="flex-1 h-9 rounded-full text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: '#cc0000' }}>
                  {unlinking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('telegramUnlinkBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : waiting ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#e8e4dc] bg-white p-5 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#9c5e6c] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#2a2540]">{t('telegramWaitingTitle')}</p>
            <p className="text-[12px] text-[#7a7290] mt-1.5 leading-relaxed">{t('telegramWaitingDesc')}</p>
          </div>
          {links && (
            <a href={links.deepLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#7a7290] py-1">
              <ExternalLink className="w-3.5 h-3.5" />{t('telegramFallbackLink')}
            </a>
          )}
          <button onClick={() => void handleCheckNow()} disabled={checking}
            className="w-full rounded-xl border border-[#e8e4dc] bg-white py-3 text-[13px] font-semibold text-[#2a2540] disabled:opacity-60 flex items-center justify-center">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : t('telegramCheckBtn')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-[#e8e4dc] bg-white p-8 text-center">
            <Send className="w-10 h-10 mx-auto mb-3" style={{ color: '#d4e8f5' }} />
            <p className="text-[14px] font-semibold text-[#2a2540]">{t('telegramNotLinkedTitle')}</p>
            <p className="text-[12px] text-[#7a7290] mt-1 leading-relaxed">{t('telegramNotLinkedDesc')}</p>
          </div>

          {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

          <button onClick={() => void handleLink()} disabled={linking}
            className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[14px] font-bold disabled:opacity-60 flex items-center justify-center gap-2">
            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />{t('telegramLinkBtn')}</>}
          </button>
          <p className="text-[11px] text-[#9a96a8] text-center">{t('telegramOpenHint')}</p>
        </div>
      )}
    </div>
  );
}
