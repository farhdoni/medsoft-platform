'use client';

import { useState } from 'react';

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
  huawei_band: '⌚',
  apple_health: '🍎',
  garmin: '⌚',
  fitbit: '⌚',
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

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

// ─── Instructions Modal ────────────────────────────────────────────────────────

function InstructionsModal({
  device,
  onClose,
  onConnect,
}: {
  device: DeviceCatalogItem;
  onClose: () => void;
  onConnect: (d: DeviceCatalogItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl z-[9999]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[32px]">{DEVICE_ICONS[device.type] ?? '📡'}</span>
          <div>
            <h2 className="text-[17px] font-bold" style={{ color: '#2a2540' }}>{device.name}</h2>
            <p className="text-[12px]" style={{ color: '#9a96a8' }}>
              {device.metrics.map((m) => METRIC_LABELS[m] ?? m).join(' · ')}
            </p>
          </div>
        </div>

        {device.connectMethod === 'oauth' ? (
          <div>
            <p className="text-[13px] mb-4" style={{ color: '#6a6580' }}>
              Подключение через OAuth 2.0. Нажмите кнопку ниже и авторизуйтесь в Google.
            </p>
            <button
              onClick={() => { onConnect(device); onClose(); }}
              className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 mb-2"
              style={{ background: '#4285f4' }}
            >
              Войти через Google
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[13px] font-semibold mb-3" style={{ color: '#2a2540' }}>
              Как подключить:
            </p>
            <ol className="space-y-2 mb-5">
              {device.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                    style={{ background: '#9c5e6c' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[13px]" style={{ color: '#6a6580' }}>{step}</p>
                </li>
              ))}
            </ol>
            <button
              onClick={() => { onConnect(device); onClose(); }}
              className="w-full py-3 rounded-[14px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 mb-2"
              style={{ background: 'linear-gradient(135deg, #9c5e6c, #6e5fa0)' }}
            >
              Подключить через Google Fit
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-[14px] text-[14px] font-semibold transition-colors hover:bg-[#f4f3ef]"
          style={{ color: '#9a96a8' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function GadgetsClient({ catalog, connected: initialConnected }: Props) {
  const [connected, setConnected] = useState<ConnectedDevice[]>(initialConnected);
  const [selectedDevice, setSelectedDevice] = useState<DeviceCatalogItem | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const connectedTypes = new Set(connected.map((d) => d.type));

  async function handleConnect(device: DeviceCatalogItem) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/devices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ type: device.type, name: device.name }),
        }
      );
      const json = await res.json();
      if (json.data) {
        setConnected((prev) => [...prev, json.data as ConnectedDevice]);
      }
    } catch {}
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/devices/${id}/sync`,
        { method: 'POST', credentials: 'include' }
      );
      setConnected((prev) =>
        prev.map((d) => (d.id === id ? { ...d, lastSyncAt: new Date().toISOString() } : d))
      );
    } catch {} finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect(id: string) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz'}/v1/aivita/devices/${id}`,
        { method: 'DELETE', credentials: 'include' }
      );
      setConnected((prev) => prev.filter((d) => d.id !== id));
    } catch {}
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

      {/* Connected devices */}
      {connected.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ПОДКЛЮЧЁННЫЕ</h2>
          <div className="space-y-3">
            {connected.map((device) => {
              const catalogItem = catalog.find((c) => c.type === device.type);
              return (
                <div
                  key={device.id}
                  className="rounded-[20px] bg-white border p-4"
                  style={{ borderColor: '#e8e4dc' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[28px]">{DEVICE_ICONS[device.type] ?? '📡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold truncate" style={{ color: '#2a2540' }}>{device.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: device.status === 'connected' ? '#688844' : '#9a96a8' }} />
                        <p className="text-[12px]" style={{ color: '#9a96a8' }}>
                          {device.status === 'connected' ? 'Подключён' : device.status}
                          {device.lastSyncAt ? ` · синхр. ${relativeTime(device.lastSyncAt)}` : ''}
                        </p>
                      </div>
                      {catalogItem && (
                        <p className="text-[11px] mt-1" style={{ color: '#9a96a8' }}>
                          {catalogItem.metrics.map((m) => METRIC_LABELS[m] ?? m).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSync(device.id)}
                      disabled={syncing === device.id}
                      className="flex-1 py-2 rounded-[12px] text-[13px] font-semibold transition-colors hover:bg-[#f4f3ef] disabled:opacity-50"
                      style={{ border: '1px solid #e8e4dc', color: '#6a6580' }}
                    >
                      {syncing === device.id ? 'Синхронизация...' : '🔄 Синхронизировать'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(device.id)}
                      className="px-3 py-2 rounded-[12px] text-[13px] transition-colors hover:bg-[#f0d4dc]"
                      style={{ border: '1px solid #e8e4dc', color: '#9c5e6c' }}
                    >
                      Отключить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Available devices catalog */}
      <section className="mb-6">
        <h2 className="text-[13px] font-bold mb-3" style={{ color: '#6a6580' }}>ДОСТУПНЫЕ ГАДЖЕТЫ</h2>
        <div className="rounded-[20px] bg-white border overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
          {catalog.map((device, idx) => {
            const isConnected = connectedTypes.has(device.type);
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
                {isConnected ? (
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#d4e8d8', color: '#548068' }}>
                    ✓ Подключён
                  </span>
                ) : device.status === 'coming_soon' ? (
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#f4f3ef', color: '#9a96a8' }}>
                    Скоро
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedDevice(device)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors hover:opacity-90"
                    style={{ background: '#9c5e6c', color: '#ffffff' }}
                  >
                    Подключить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Info note */}
      <div className="rounded-[16px] p-4 flex gap-3" style={{ background: '#f4f3ef' }}>
        <span className="text-[18px] flex-shrink-0">ℹ️</span>
        <p className="text-[12px]" style={{ color: '#6a6580' }}>
          Данные с подключённых гаджетов автоматически попадают в биометрию. Синхронизация происходит каждые 30 минут.
        </p>
      </div>

      {/* Instructions modal */}
      {selectedDevice && (
        <InstructionsModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onConnect={handleConnect}
        />
      )}
    </>
  );
}
