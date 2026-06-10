'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceCatalogItem {
  type: string;
  name: string;
  icon: string;
  metrics: string[];
  status: 'available' | 'coming_soon';
  connectMethod: string;
  instructions: string[];
}

interface ConnectedDevice {
  id: string;
  type: string;
  name: string;
  status: string;
  lastSyncAt: string | null;
  connectedAt: string | null;
}

interface Props {
  catalog: DeviceCatalogItem[];
  connected: ConnectedDevice[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEVICE_ICONS: Record<string, string> = {
  xiaomi_band: '📱',
  samsung_galaxy_watch: '⌚',
  google_fit: '🏃',
};

const METRIC_LABELS: Record<string, string> = {
  heart_rate: 'Пульс',
  steps: 'Шаги',
  sleep_hours: 'Сон',
  spo2: 'SpO2',
  weight: 'Вес',
  blood_pressure: 'Давление',
  water_ml: 'Вода',
};

// ─── Health Connect native card ───────────────────────────────────────────────

// 'checking'    = ждём ответа от нативного слоя (кнопка скрыта до подтверждения)
// 'unavailable' = Health Connect реально недоступен на устройстве (не установлен/не Android)
// 'error'       = HC доступен, разрешения есть, но синхронизация с сервером упала
type HcState = 'checking' | 'idle' | 'connecting' | 'connected' | 'denied' | 'unavailable' | 'error';

function isInWebView(): boolean {
  return typeof window !== 'undefined' && !!(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView;
}

function postToNative(type: string) {
  if (isInWebView()) {
    (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } })
      .ReactNativeWebView?.postMessage(JSON.stringify({ type }));
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GadgetsClient({ catalog, connected }: Props) {
  // Начинаем с 'checking' — кнопка СКРЫТА пока нативный слой не подтвердит доступность HC.
  // Это предотвращает краш: кнопка появляется только после check-health-connect → ready.
  const [hcState, setHcState] = useState<HcState>('checking');
  const [inWebView, setInWebView] = useState(false);

  // isInWebView() reads window.ReactNativeWebView — undefined during SSR.
  // Must run client-side only, after hydration.
  useEffect(() => {
    setInWebView(isInWebView());
  }, []);

  // После определения WebView — проверяем доступность HC ПЕРЕД показом кнопки.
  // Это предотвращает нативный краш: кнопка показывается только если HC точно доступен.
  useEffect(() => {
    if (!inWebView) return;
    postToNative('check-health-connect');
  }, [inWebView]);

  // Слушаем статус доступности HC (ответ на check-health-connect)
  useEffect(() => {
    function onHcStatus(e: Event) {
      const detail = (e as CustomEvent<{ status: string }>).detail;
      if (detail?.status === 'ready') {
        setHcState('idle'); // доступен — показываем кнопку «Подключить»
      } else if (detail?.status?.startsWith('unavailable') || detail?.status === 'error') {
        setHcState('unavailable'); // HC не установлен — прячем кнопку
      }
    }
    window.addEventListener('aivita-hc-status', onHcStatus);
    return () => window.removeEventListener('aivita-hc-status', onHcStatus);
  }, []);

  // Слушаем ответ от нативного слоя после запроса разрешений
  useEffect(() => {
    function onHcConnected(e: Event) {
      const detail = (e as CustomEvent<{ status: string }>).detail;
      if (detail?.status === 'ready') {
        setHcState('connected');
      } else if (detail?.status === 'permission_denied') {
        setHcState('denied');
      } else if (detail?.status?.startsWith('unavailable')) {
        setHcState('unavailable');
      } else if (detail?.status === 'error') {
        // Разрешения выданы и HC доступен, но синк с сервером упал —
        // НЕ показываем «Недоступно», иначе карточка врёт. Даём «Повторить».
        setHcState('error');
      } else {
        setHcState('idle');
      }
    }
    window.addEventListener('aivita-hc-connected', onHcConnected);
    return () => window.removeEventListener('aivita-hc-connected', onHcConnected);
  }, []);

  function handleHcConnect() {
    if (!inWebView) return;
    setHcState('connecting');
    postToNative('request-health-connect');
  }

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9a96a8' }}>
          ИНТЕГРАЦИИ
        </p>
        <h1 className="text-[22px] font-extrabold" style={{ color: '#2a2540' }}>Мои гаджеты</h1>
      </div>

      {/* Stale connected-devices banner */}
      {connected.length > 0 && (
        <div className="rounded-[16px] p-4 flex gap-3 mb-6" style={{ background: '#f0edf8', border: '1px solid #d8cff0' }}>
          <span className="text-[18px] flex-shrink-0">🔧</span>
          <p className="text-[12px]" style={{ color: '#5e40a0' }}>
            Интеграция с устройствами в разработке. Скоро вы сможете подключить Google Fit, Xiaomi Mi Band и другие — данные будут автоматически попадать в биометрию.
          </p>
        </div>
      )}

      {/* Health Connect card — только в Android WebView и только если HC доступен (не checking) */}
      {inWebView && hcState !== 'checking' && (
        <section className="mb-6">
          <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ЗДОРОВЬЕ</h2>
          <div className="rounded-[20px] bg-white border border-app-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span
                className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: '#e8f4e8' }}
              >
                🏥
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>Health Connect</p>
                <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                  {hcState === 'connected'
                    ? 'Подключён · Шаги · Пульс'
                    : hcState === 'unavailable'
                    ? 'Недоступно на этом устройстве'
                    : hcState === 'error'
                    ? 'Ошибка синхронизации — попробуйте снова'
                    : 'Шаги · Пульс · Android 14+'}
                </p>
              </div>
              {hcState === 'connected' ? (
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                  style={{ background: '#d4e8d8', color: '#3a7a4a' }}
                >
                  ✓ Подключён
                </span>
              ) : hcState === 'unavailable' ? (
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
                  style={{ background: '#f4f3ef', color: '#9a96a8' }}
                >
                  Недоступно
                </span>
              ) : hcState === 'denied' || hcState === 'error' ? (
                <button
                  onClick={handleHcConnect}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
                  style={{ background: '#fde8e8', color: '#dc3545' }}
                >
                  Повторить
                </button>
              ) : (
                <button
                  onClick={handleHcConnect}
                  disabled={hcState === 'connecting'}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--accent-dark)', color: '#ffffff' }}
                >
                  {hcState === 'connecting' ? '...' : 'Подключить'}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Devices catalog — all "Скоро" until OAuth/integrations are ready */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ДОСТУПНЫЕ ГАДЖЕТЫ</h2>
        <div className="rounded-[20px] bg-white border overflow-hidden border-app-border">
          {catalog.map((device, idx) => {
            const isLast = idx === catalog.length - 1;
            return (
              <div
                key={device.type}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: isLast ? 'none' : '1px solid #f0ece4' }}
              >
                <span className="text-[26px] flex-shrink-0">{DEVICE_ICONS[device.type] ?? '📡'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>{device.name}</p>
                  <p className="text-[11px]" style={{ color: '#9a96a8' }}>
                    {device.metrics.map((m) => METRIC_LABELS[m] ?? m).join(', ')}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: '#f4f3ef', color: '#9a96a8' }}
                >
                  Скоро
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Info note */}
      <div className="rounded-[16px] p-4 flex gap-3" style={{ background: '#f4f3ef' }}>
        <span className="text-[18px] flex-shrink-0">ℹ️</span>
        <p className="text-[12px]" style={{ color: '#6a6580' }}>
          Подключение носимых устройств (Health Connect, Google Fit, Xiaomi Mi Band) появится в одном из ближайших обновлений.
        </p>
      </div>
    </>
  );
}
