'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/messenger/Avatar';
import { displayName } from '@/components/messenger/format';
import {
  BACKGROUNDS,
  DEFAULT_PREFS,
  TEXT_SIZES,
  readPrefs,
  writePref,
  type ChatPrefs,
  type ThemeId,
} from '@/components/messenger/chat-prefs';
import type { ApiEnvelope, MessengerUser } from '@/components/messenger/types';

const PROXY = '/api/proxy';
const CHAT_VERSION = 'AV Chat 1.0 · MVP';

type BlockRow = { id: string; createdAt: string; user: MessengerUser };

export function SettingsClient({ locale }: { locale: string }) {
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_PREFS);
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [restrictNewChats, setRestrictNewChats] = useState(false);
  const [rules, setRules] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { setPrefs(readPrefs()); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2000);
    return () => clearTimeout(t);
  }, [notice]);

  const set = useCallback(<K extends keyof ChatPrefs>(key: K, value: ChatPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    writePref(key, value);
  }, []);

  // Server-side setting, unlike the appearance ones: it changes who may open
  // a conversation with this account, so it has to live with the account.
  useEffect(() => {
    fetch(`${PROXY}/messaging/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ApiEnvelope<{ restrictNewChats: boolean }> | null) => {
        if (j?.data) setRestrictNewChats(j.data.restrictNewChats);
      })
      .catch(() => {});
  }, []);

  async function setRestrict(value: boolean) {
    const before = restrictNewChats;
    setRestrictNewChats(value);
    try {
      const res = await fetch(`${PROXY}/messaging/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restrictNewChats: value }),
      });
      if (!res.ok) throw new Error('settings failed');
    } catch {
      setRestrictNewChats(before);
      setNotice('Не удалось сохранить настройку');
    }
  }

  const loadBlocks = useCallback(async () => {
    try {
      const res = await fetch(`${PROXY}/messaging/block`);
      if (!res.ok) { setBlocks([]); return; }
      const json = (await res.json()) as ApiEnvelope<BlockRow[]>;
      setBlocks(json.data ?? []);
    } catch {
      setBlocks([]);
    }
  }, []);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  async function unblock(userId: string) {
    const before = blocks ?? [];
    setBlocks(before.filter((b) => b.user.id !== userId)); // optimistic
    try {
      const res = await fetch(`${PROXY}/messaging/block/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('unblock failed');
      setNotice('Блокировка снята');
    } catch {
      setBlocks(before);
      setNotice('Не удалось снять блокировку');
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--av-surface)' }}>
      <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-2">
        <Link
          href={`/${locale}/messenger`}
          aria-label="Назад"
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: 'var(--av-panel)', border: '1px solid var(--av-border)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--av-text-dim)' }} />
          </svg>
        </Link>
        <h1 className="text-[18px] font-bold" style={{ color: 'var(--av-text)' }}>Настройки чата</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 min-h-0">
        {/* ── Внешний вид ────────────────────────────────────────────── */}
        <Section title="Внешний вид">
          <Row label="Тема">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--av-surface)' }}>
              {([['light', 'День'], ['dark', 'Ночь']] as [ThemeId, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('theme', id)}
                  aria-pressed={prefs.theme === id}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={
                    prefs.theme === id
                      ? { background: 'var(--accent-dark, #9c5e6c)', color: '#fff' }
                      : { background: 'transparent', color: 'var(--av-text-dim)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Размер текста">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--av-surface)' }}>
              {TEXT_SIZES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('textSize', t.id)}
                  aria-pressed={prefs.textSize === t.id}
                  className="w-9 py-1.5 rounded-lg font-semibold transition-colors"
                  style={{
                    fontSize: t.px,
                    ...(prefs.textSize === t.id
                      ? { background: 'var(--accent-dark, #9c5e6c)', color: '#fff' }
                      : { background: 'transparent', color: 'var(--av-text-dim)' }),
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Enter отправляет сообщение" hint="Выключите, если Enter должен переносить строку">
            <Switch checked={prefs.enterSend} onChange={(v) => set('enterSend', v)} label="Enter отправляет сообщение" />
          </Row>

          <div className="pt-1">
            <p className="text-xs mb-2" style={{ color: 'var(--av-text-dim)' }}>Фон чата</p>
            <div className="flex gap-2 flex-wrap">
              {BACKGROUNDS.map((b) => {
                const active = prefs.background === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => set('background', b.id)}
                    aria-pressed={active}
                    title={b.label}
                    className="w-14 h-14 rounded-xl flex-shrink-0 transition-transform active:scale-95"
                    style={{
                      background: prefs.theme === 'dark' ? b.dark : b.light,
                      border: active ? '2px solid var(--accent-dark, #9c5e6c)' : '1px solid var(--av-border)',
                    }}
                  >
                    <span className="sr-only">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Приватность ────────────────────────────────────────────── */}
        <Section title="Приватность">
          <Row
            label="Только знакомые могут писать"
            hint="Новые диалоги смогут начинать лишь те, с кем вы уже общаетесь"
          >
            <Switch
              checked={restrictNewChats}
              onChange={setRestrict}
              label="Только знакомые могут писать"
            />
          </Row>

          <div className="pt-1" style={{ borderTop: '1px solid var(--av-border)' }} />

          <p className="text-xs mb-2" style={{ color: 'var(--av-text-dim)' }}>Заблокированные пользователи</p>
          {blocks === null ? (
            <p className="text-xs" style={{ color: 'var(--av-text-mute)' }}>Загружаем…</p>
          ) : blocks.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--av-text-mute)' }}>Никто не заблокирован</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <Avatar user={b.user} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--av-text)' }}>
                      {displayName(b.user)}
                    </p>
                    {b.user.nickname && (
                      <p className="text-[11px] truncate" style={{ color: 'var(--av-text-mute)' }}>@{b.user.nickname}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => unblock(b.user.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold active:opacity-80"
                    style={{ color: 'var(--accent-dark, #9c5e6c)', border: '1px solid var(--accent-light, #f0d4dc)' }}
                  >
                    Разблокировать
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Уведомления ────────────────────────────────────────────── */}
        <Section title="Уведомления">
          <Row label="Звук уведомлений" hint="Звук появится в следующем обновлении">
            <Switch checked={prefs.sound} onChange={(v) => set('sound', v)} label="Звук уведомлений" />
          </Row>
        </Section>

        {/* ── О чате ─────────────────────────────────────────────────── */}
        <Section title="О чате">
          <Row label="Версия">
            <span className="text-xs" style={{ color: 'var(--av-text-mute)' }}>{CHAT_VERSION}</span>
          </Row>
          <button
            type="button"
            onClick={() => setRules(true)}
            className="w-full text-left py-2 text-sm font-medium active:opacity-70"
            style={{ color: 'var(--accent-dark, #9c5e6c)' }}
          >
            Правила общения
          </button>
        </Section>
      </div>

      {rules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(42,37,64,.45)' }} onClick={() => setRules(false)}>
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: 'var(--av-panel)', border: '1px solid var(--av-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--av-text)' }}>Правила общения</p>
            <ul className="text-xs space-y-1.5 list-disc pl-4" style={{ color: 'var(--av-text-dim)' }}>
              <li>Уважайте собеседника — оскорбления и травля недопустимы.</li>
              <li>Не делитесь чувствительными медицинскими данными в открытом чате.</li>
              <li>Чат не заменяет очную консультацию врача.</li>
              <li>О нарушении можно сообщить кнопкой «Пожаловаться» в диалоге.</li>
            </ul>
            <button
              type="button"
              onClick={() => setRules(false)}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent-dark, #9c5e6c)' }}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-28 z-40 pointer-events-none" role="status">
          <span className="px-4 py-2 rounded-full text-xs text-white shadow-lg" style={{ background: 'rgba(42,37,64,.92)' }}>
            {notice}
          </span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide px-1 pb-1.5" style={{ color: 'var(--av-text-mute)' }}>
        {title}
      </p>
      <div className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--av-panel)', border: '1px solid var(--av-border)' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--av-text)' }}>{label}</p>
        {hint && <p className="text-[11px]" style={{ color: 'var(--av-text-mute)' }}>{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full transition-colors relative"
      style={{ background: checked ? 'var(--accent-dark, #9c5e6c)' : 'var(--av-border)' }}
    >
      <span
        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: checked ? 26 : 4 }}
      />
    </button>
  );
}
