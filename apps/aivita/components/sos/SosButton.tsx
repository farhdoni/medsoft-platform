'use client';
import { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export default function SosButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showConfirm) return;
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (!sending) {
      triggerSos();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showConfirm, countdown]);

  async function triggerSos() {
    setSending(true);
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* GPS unavailable */ }

    try {
      const res = await fetch(`${API_BASE}/v1/aivita/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) setSent(true);
    } catch (err) {
      console.error('[SOS]', err);
    }
    setSending(false);
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowConfirm(false);
    setCountdown(3);
    setSending(false);
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-[#2a2540] mb-2">SOS отправлен</h3>
          <p className="text-sm text-[#6a6580] mb-4">
            SMS с вашими данными и координатами отправлено экстренному контакту
          </p>
          <a href="tel:103"
            className="block w-full py-3 bg-red-500 text-white rounded-2xl font-semibold mb-3 text-center">
            📞 Позвонить 103 (Скорая)
          </a>
          <button onClick={() => { setSent(false); setShowConfirm(false); setCountdown(3); }}
            className="text-sm text-[#9a96a8]">Закрыть</button>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
          <div className="text-4xl mb-3">🚨</div>
          <h3 className="text-lg font-bold text-[#2a2540] mb-2">ЭКСТРЕННЫЙ ВЫЗОВ</h3>
          <p className="text-sm text-[#6a6580] mb-4">
            SMS с вашими координатами, аллергиями и группой крови будет отправлено экстренному контакту.
          </p>
          <div className="h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all duration-1000"
              style={{ width: `${((3 - countdown) / 3) * 100}%` }} />
          </div>
          <p className="text-2xl font-bold text-red-500 mb-4">
            {countdown > 0 ? `${countdown} сек...` : sending ? 'Отправка...' : ''}
          </p>
          <a href="tel:103"
            className="block w-full py-3 bg-red-500 text-white rounded-2xl font-semibold mb-3 text-center">
            📞 Позвонить 103
          </a>
          <button onClick={cancel}
            className="w-full py-3 bg-[#f4f3ef] text-[#6a6580] rounded-2xl font-medium">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setShowConfirm(true); setCountdown(3); }}
      className="fixed bottom-24 left-6 z-40 w-14 h-14 rounded-full bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/30 flex items-center justify-center active:scale-95 transition-all"
      aria-label="SOS Экстренный вызов">
      SOS
    </button>
  );
}
