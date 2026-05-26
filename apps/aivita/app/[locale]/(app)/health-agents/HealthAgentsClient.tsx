'use client';

import { useState } from 'react';
import type { AgentAlert, AgentSettings } from './page';

const AGENT_LABELS: Record<string, string> = {
  vitals_monitor: 'Мониторинг показателей',
  medication_tracker: 'Слежение за лекарствами',
  weekly_checkup: 'Еженедельный чекап',
  document_parser: 'Анализ документов',
};

const AGENT_ICONS: Record<string, string> = {
  vitals_monitor: '❤️',
  medication_tracker: '💊',
  weekly_checkup: '📋',
  document_parser: '📄',
};

const SEVERITY_STYLES: Record<string, { border: string; icon: string; iconColor: string }> = {
  info:     { border: 'border-blue-100',   icon: 'ℹ️',  iconColor: 'text-blue-500'  },
  warning:  { border: 'border-amber-100',  icon: '⚠️',  iconColor: 'text-amber-500' },
  critical: { border: 'border-red-100',    icon: '🚨',  iconColor: 'text-red-500'   },
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--accent)]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function HealthAgentsClient({
  initialAlerts,
  initialSettings,
}: {
  initialAlerts: AgentAlert[];
  initialSettings: AgentSettings;
}) {
  const [alerts, setAlerts] = useState<AgentAlert[]>(initialAlerts);
  const [settings, setSettings] = useState<AgentSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');
  const [savingSettings, setSavingSettings] = useState(false);

  const unread = alerts.filter((a) => !a.isRead).length;

  async function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/proxy/agents/alerts/${id}/dismiss`, { method: 'PUT' }).catch(() => {});
  }

  async function readAllAlerts() {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    await fetch('/api/proxy/agents/alerts/read-all', { method: 'PUT' }).catch(() => {});
  }

  async function saveSettings(patch: Partial<AgentSettings>) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSavingSettings(true);
    await fetch('/api/proxy/agents/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {});
    setSavingSettings(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI-агенты здоровья</h1>
          <p className="text-sm text-gray-400 mt-0.5">Автоматический мониторинг 24/7</p>
        </div>
        {unread > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>
            {unread} новых
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'alerts' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Уведомления {unread > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">{unread}</span>}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Настройки агентов
        </button>
      </div>

      {/* Alerts tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length > 0 && unread > 0 && (
            <div className="flex justify-end">
              <button onClick={() => void readAllAlerts()} className="text-xs text-[var(--accent)] font-medium">
                Прочитать все
              </button>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="text-4xl mb-3">🤖</span>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Всё под контролем</h3>
              <p className="text-sm text-gray-400">AI-агенты следят за вашим здоровьем. Уведомления появятся здесь.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4 bg-white transition-opacity ${style.border} ${alert.isRead ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${alert.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                            {alert.title}
                            {!alert.isRead && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[var(--accent)] align-middle" />}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {AGENT_ICONS[alert.agentType]} {AGENT_LABELS[alert.agentType] ?? alert.agentType} · {new Date(alert.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => void dismissAlert(alert.id)}
                          className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                          aria-label="Dismiss"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      {alert.description && (
                        <p className="text-sm text-gray-600 mt-1.5">{alert.description}</p>
                      )}
                      {alert.recommendation && (
                        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                          <p className="text-sm text-gray-700">💡 {alert.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {savingSettings && (
            <p className="text-xs text-[var(--accent)] text-center">Сохранение...</p>
          )}

          {/* Agent toggles */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-700">Активные агенты</p>
            </div>
            {[
              { key: 'vitalsMonitorEnabled' as const, label: 'Мониторинг показателей', desc: 'Проверяет пульс, давление, SpO2 каждые 30 минут', icon: '❤️' },
              { key: 'medicationTrackerEnabled' as const, label: 'Слежение за лекарствами', desc: 'Напоминает о пропущенных приёмах ежечасно', icon: '💊' },
              { key: 'weeklyCheckupEnabled' as const, label: 'Еженедельный чекап', desc: 'Напоминание о чекапе каждый понедельник', icon: '📋' },
              { key: 'documentParserEnabled' as const, label: 'Анализ документов', desc: 'AI-разбор медицинских документов', icon: '📄' },
            ].map(({ key, label, desc, icon }) => (
              <div key={key} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
                <Toggle
                  checked={settings[key]}
                  onChange={(v) => void saveSettings({ [key]: v })}
                />
              </div>
            ))}
          </div>

          {/* Vitals thresholds */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-700">Пороги для показателей</p>
              <p className="text-xs text-gray-400 mt-0.5">Оставьте пустым для стандартных значений</p>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Пульс (уд/мин)', low: 'pulse_low' as const, high: 'pulse_high' as const, defaultLow: 50, defaultHigh: 100 },
                { label: 'Систолическое давление (мм рт.ст.)', low: 'systolic_low' as const, high: 'systolic_high' as const, defaultLow: 90, defaultHigh: 140 },
                { label: 'Диастолическое давление (мм рт.ст.)', low: 'diastolic_low' as const, high: 'diastolic_high' as const, defaultLow: 60, defaultHigh: 90 },
                { label: 'Сахар крови (ммоль/л)', low: 'sugar_low' as const, high: 'sugar_high' as const, defaultLow: 3.3, defaultHigh: 11.1 },
                { label: 'Температура (°C)', low: 'temp_low' as const, high: 'temp_high' as const, defaultLow: 36.0, defaultHigh: 37.5 },
              ].map(({ label, low, high, defaultLow, defaultHigh }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder={`Мин (${defaultLow})`}
                        value={settings.alertThresholds[low] ?? ''}
                        onChange={(e) => void saveSettings({
                          alertThresholds: {
                            ...settings.alertThresholds,
                            [low]: e.target.value ? Number(e.target.value) : undefined,
                          },
                        })}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder={`Макс (${defaultHigh})`}
                        value={settings.alertThresholds[high] ?? ''}
                        onChange={(e) => void saveSettings({
                          alertThresholds: {
                            ...settings.alertThresholds,
                            [high]: e.target.value ? Number(e.target.value) : undefined,
                          },
                        })}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {/* SpO2 only has a low threshold */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">SpO2 (%)</p>
                <input
                  type="number"
                  placeholder="Мин (94)"
                  value={settings.alertThresholds.spo2_low ?? ''}
                  onChange={(e) => void saveSettings({
                    alertThresholds: {
                      ...settings.alertThresholds,
                      spo2_low: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 max-w-[150px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
