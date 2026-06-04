'use client';

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

// ─── Main Component ────────────────────────────────────────────────────────────

export function GadgetsClient({ catalog, connected }: Props) {
  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#9a96a8' }}>
          ИНТЕГРАЦИИ
        </p>
        <h1 className="text-[22px] font-extrabold" style={{ color: '#2a2540' }}>Мои гаджеты</h1>
      </div>

      {/* Stale connected-devices banner — replaces the fake "Подключён · синхр." cards */}
      {connected.length > 0 && (
        <div className="rounded-[16px] p-4 flex gap-3 mb-6" style={{ background: '#f0edf8', border: '1px solid #d8cff0' }}>
          <span className="text-[18px] flex-shrink-0">🔧</span>
          <p className="text-[12px]" style={{ color: '#5e40a0' }}>
            Интеграция с устройствами в разработке. Скоро вы сможете подключить Google Fit, Xiaomi Mi Band и другие — данные будут автоматически попадать в биометрию.
          </p>
        </div>
      )}

      {/* Devices catalog */}
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
                {/* All devices show "Скоро" — real OAuth/Health Connect not yet implemented */}
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

      {/* Info note — honest roadmap text */}
      <div className="rounded-[16px] p-4 flex gap-3" style={{ background: '#f4f3ef' }}>
        <span className="text-[18px] flex-shrink-0">ℹ️</span>
        <p className="text-[12px]" style={{ color: '#6a6580' }}>
          Подключение носимых устройств (Health Connect, Google Fit, Xiaomi Mi Band) появится в одном из ближайших обновлений.
        </p>
      </div>
    </>
  );
}
