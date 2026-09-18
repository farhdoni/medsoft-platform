'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HelpCircle, X } from 'lucide-react';
import { formatBloodType } from '@medsoft/shared';
import type { SurveyQuestion } from './data';
import {
  addToList,
  isPausedThisVisit,
  itemsIncludingDraft,
  listPlaceholderKeyFor,
  pauseForRestOfVisit,
  removeFromList,
  shouldAddChipOnKeydown,
} from './survey-banner-logic';

type Locale = 'ru' | 'uz' | 'en';
type Phase = 'prompt' | 'answering' | 'done' | 'hidden';

function sessionStorageOrUndefined(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.sessionStorage;
}

// Chrome/layout modeled on TelegramBanner.tsx (card, icon circle, dismiss-X)
// — but NOT its state model: TelegramBanner is one permanent localStorage
// flag because there's only ever one question. This banner rotates through
// different fields over time, so its "seen it" state lives server-side (the
// survey_prompts table via /v1/aivita/survey/*), not localStorage — the
// server decides whether to show a banner at all (loadHomeData() calls
// POST /survey/next), this component only renders what it was handed and
// records the answer/skip.
//
// No dark-mode variant: checked globals.css/tailwind.config.ts — this app
// has no prefers-color-scheme / .dark handling anywhere yet (TelegramBanner
// itself is hardcoded-hex, light-only), so there is nothing to adapt to.
// Colors here match TelegramBanner's exact palette for visual consistency
// with the rest of home.
export function SurveyBanner({ locale, initialQuestion }: { locale: string; initialQuestion: SurveyQuestion }) {
  const t = useTranslations('app.surveyBanner');
  const router = useRouter();
  const loc = (['ru', 'uz', 'en'].includes(locale) ? locale : 'ru') as Locale;

  const [phase, setPhase] = useState<Phase>('prompt');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [listItems, setListItems] = useState<string[]>([]);
  const [listDraft, setListDraft] = useState('');
  const [numberValue, setNumberValue] = useState('');

  // Runs before paint (useLayoutEffect, not useEffect) so a paused visit
  // never flashes the banner for a frame before hiding it. Always starts
  // from 'prompt' on the server and on this first client render (matching
  // SSR output, so no hydration mismatch) — this effect is what actually
  // applies the pause, right after mount.
  useLayoutEffect(() => {
    if (isPausedThisVisit(sessionStorageOrUndefined())) setPhase('hidden');
  }, []);

  if (phase === 'hidden') return null;

  const q = initialQuestion;

  async function submitAnswer(value: unknown, none?: boolean) {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch('/api/proxy/survey/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(none ? { field: q.field, channel: 'banner', none: true } : { field: q.field, channel: 'banner', value }),
      });
      if (!res.ok) { setError(true); setSaving(false); return; }
      pauseForRestOfVisit(sessionStorageOrUndefined());
      setPhase('done');
      setTimeout(() => setPhase('hidden'), 1800);
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  function skip() {
    pauseForRestOfVisit(sessionStorageOrUndefined());
    setPhase('hidden'); // don't make the user wait on the network for a dismiss
    fetch('/api/proxy/survey/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: q.field, channel: 'banner' }),
    }).catch(() => {});
  }

  function addListChip() {
    const next = addToList({ items: listItems, draft: listDraft });
    setListItems(next.items);
    setListDraft(next.draft);
  }

  function removeListChip(v: string) {
    setListItems(removeFromList(listItems, v));
  }

  // Computed synchronously (not via addListChip()+setState, whose update
  // wouldn't be visible until the next render) so submitAnswer always gets
  // the complete list — including unconfirmed draft text — on the very
  // click that triggers it. See itemsIncludingDraft() for why this exists.
  function saveList() {
    const items = itemsIncludingDraft({ items: listItems, draft: listDraft });
    if (items.length === 0) return;
    void submitAnswer(items);
  }

  const pillClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-[12px] font-bold transition active:scale-95 ${
      active ? 'border-[#3a8fc7] bg-[#d4e8f5] text-[#3a8fc7]' : 'border-[#e8e4dc] bg-white text-[#6a6580]'
    }`;

  function renderInput() {
    switch (q.type) {
      case 'enum':
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            {(q.options ?? []).map((opt) => (
              <button key={opt.value} type="button" disabled={saving} className={pillClass(false)}
                onClick={() => submitAnswer(opt.value)}>
                {opt.label[loc]}
              </button>
            ))}
          </div>
        );

      case 'blood_type':
        return (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {(q.options ?? []).map((opt) => (
              <button key={opt.value} type="button" disabled={saving} className={pillClass(false)}
                onClick={() => submitAnswer(opt.value)}>
                {formatBloodType(opt.value)}
              </button>
            ))}
          </div>
        );

      case 'number':
        return (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              placeholder={t('numberPlaceholder')}
              className="w-24 rounded-xl border border-[#e8e4dc] px-3 py-2 text-[13px] font-semibold text-[#2a2540] outline-none focus:border-[#3a8fc7]"
            />
            <button type="button" disabled={saving || !numberValue}
              className="rounded-full px-3.5 py-2 text-[12px] font-bold text-white active:scale-95 disabled:opacity-40"
              style={{ background: '#3a8fc7' }}
              onClick={() => submitAnswer(Number(numberValue))}>
              {t('saveButton')}
            </button>
          </div>
        );

      case 'list':
        return (
          <div className="mt-2">
            {listItems.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {listItems.map((v) => (
                  <span key={v} className="flex items-center gap-1 rounded-full bg-[#f4f3ef] px-2.5 py-1 text-[11px] font-semibold text-[#2a2540]">
                    {v}
                    <button type="button" aria-label="remove" onClick={() => removeListChip(v)} className="text-[#9a96a8]">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={listDraft}
                onChange={(e) => setListDraft(e.target.value)}
                onKeyDown={(e) => {
                  // isComposing covers an IME composition still in
                  // progress (some mobile/OS Cyrillic keyboards route
                  // Enter through composition-commit rather than a plain
                  // keydown) — see shouldAddChipOnKeydown for why this
                  // keystroke is left alone rather than treated as "add".
                  // The following, real Enter still works — and the
                  // explicit "+" button plus the flush-on-save in
                  // saveList() never depend on this path firing at all.
                  if (shouldAddChipOnKeydown(e.key, e.nativeEvent.isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                    addListChip();
                  }
                }}
                placeholder={t(listPlaceholderKeyFor(q.field))}
                className="min-w-0 flex-1 rounded-xl border border-[#e8e4dc] px-3 py-2 text-[13px] font-semibold text-[#2a2540] outline-none focus:border-[#3a8fc7]"
              />
              <button
                type="button"
                onClick={addListChip}
                disabled={!listDraft.trim()}
                className="flex-shrink-0 rounded-xl border border-[#3a8fc7] px-3 py-2 text-[12px] font-bold text-[#3a8fc7] active:scale-95 disabled:opacity-40"
              >
                {t('addButton')}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-[#9a96a8]">{t('listAddHint')}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={saving || (listItems.length === 0 && !listDraft.trim())}
                className="rounded-full px-3.5 py-2 text-[12px] font-bold text-white active:scale-95 disabled:opacity-40"
                style={{ background: '#3a8fc7' }}
                onClick={saveList}>
                {t('saveButton')}
              </button>
              <button type="button" disabled={saving} className={pillClass(false)} onClick={() => submitAnswer(undefined, true)}>
                {t('noneButton')}
              </button>
            </div>
          </div>
        );

      case 'medications_special':
        return (
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-full px-3.5 py-2 text-[12px] font-bold text-white active:scale-95"
              style={{ background: '#3a8fc7' }}
              onClick={() => router.push(`/${locale}/medications`)}>
              {t('medsYes')}
            </button>
            <button type="button" disabled={saving} className={pillClass(false)} onClick={() => submitAnswer(undefined, true)}>
              {t('medsNo')}
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <section className="mx-3 mt-4 sm:mx-7">
      <div className="relative rounded-[22px] border border-[#e8e4dc] bg-white p-3.5 pr-10 shadow-card">
        {phase !== 'done' && (
          <button
            type="button"
            onClick={skip}
            aria-label={t('laterButton')}
            className="absolute right-2 top-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(42,37,64,0.06)' }}
          >
            <X className="h-3.5 w-3.5" style={{ color: '#9a96a8' }} />
          </button>
        )}

        {phase === 'done' ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: '#d4e8f5' }}>
              <HelpCircle className="h-5 w-5" style={{ color: '#3a8fc7' }} />
            </div>
            <p className="text-[13px] font-black text-[#2a2540]">{t('thankYou')}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: '#d4e8f5' }}>
              <HelpCircle className="h-5 w-5" style={{ color: '#3a8fc7' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black leading-snug text-[#2a2540]">{q.question[loc]}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#6a6580]">{q.why[loc]}</p>

              {phase === 'prompt' && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhase('answering')}
                    className="whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold text-white transition active:scale-95"
                    style={{ background: '#3a8fc7' }}
                  >
                    {t('answerButton')}
                  </button>
                  <button
                    type="button"
                    onClick={skip}
                    className="whitespace-nowrap rounded-full border border-[#e8e4dc] px-3.5 py-2 text-[12px] font-bold text-[#6a6580] transition active:scale-95"
                  >
                    {t('laterButton')}
                  </button>
                </div>
              )}

              {phase === 'answering' && renderInput()}
              {error && <p className="mt-1.5 text-[11px] font-semibold text-[#c0304a]">⚠</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
