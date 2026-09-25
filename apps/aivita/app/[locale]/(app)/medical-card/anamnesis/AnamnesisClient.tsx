'use client';

import * as React from 'react';
import { Plate } from '@/components/soft3d/Surfaces';
import { Button3D, FlatButton } from '@/components/soft3d/Button3D';
import {
  addToList,
  itemsIncludingDraft,
  removeFromList,
  shouldAddChipOnKeydown,
  type ChipInputState,
} from '@/app/[locale]/(app)/home/survey-banner-logic';

interface Strings {
  title: string; subtitle: string;
  allergiesLabel: string; allergiesPlaceholder: string;
  chronicLabel: string; chronicPlaceholder: string;
  noneButton: string; addButton: string; listAddHint: string;
  childDiseasesLabel: string; saveButton: string; savedMessage: string; backAriaLabel: string;
}

function TagList({
  items, draft, onDraftChange, onAdd, onRemove, none, onToggleNone, placeholder, addLabel, hint, noneLabel,
}: {
  items: string[]; draft: string; onDraftChange: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void;
  none: boolean; onToggleNone: () => void; placeholder: string; addLabel: string; hint: string; noneLabel: string;
}) {
  return (
    <div>
      {items.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((v) => (
            <span key={v} className="chip-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 'auto', padding: '6px 10px' }}>
              {v}
              <button type="button" aria-label="remove" onClick={() => onRemove(v)} style={{ color: 'rgba(255,255,255,0.6)', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="well"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (shouldAddChipOnKeydown(e.key, e.nativeEvent.isComposing || e.keyCode === 229)) {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          disabled={none}
          style={{ flex: 1, minWidth: 0, height: 46, padding: '0 14px', borderRadius: 14, fontSize: 14, fontWeight: 600, border: 'none' }}
        />
        <FlatButton onClick={onAdd} disabled={!draft.trim() || none} style={{ height: 46, fontSize: 12, padding: '0 14px' }}>{addLabel}</FlatButton>
      </div>
      <p style={{ margin: '6px 0 0 0', fontSize: 10, color: 'var(--s3-ink-soft)' }}>{hint}</p>
      <label style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={none} onChange={onToggleNone} style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{noneLabel}</span>
      </label>
    </div>
  );
}

export function AnamnesisClient({
  locale, isMinor, initialAllergies, initialChronic, initialAllergiesNone, initialChronicNone,
  initialChildDiseases, childDiseaseOptions, strings: s,
}: {
  locale: string; isMinor: boolean;
  initialAllergies: string[]; initialChronic: string[];
  initialAllergiesNone: boolean; initialChronicNone: boolean;
  initialChildDiseases: string[]; childDiseaseOptions: string[];
  strings: Strings;
}) {
  const [allergyState, setAllergyState] = React.useState<ChipInputState>({ items: [], draft: '' });
  const [allergiesNone, setAllergiesNone] = React.useState(initialAllergiesNone);
  const [chronicState, setChronicState] = React.useState<ChipInputState>({ items: [], draft: '' });
  const [chronicNone, setChronicNone] = React.useState(initialChronicNone);
  const [childDiseases, setChildDiseases] = React.useState<string[]>(initialChildDiseases);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Pre-existing saved items are shown read-only in-line above the new-item
  // input (they're already persisted rows — re-adding them via this form
  // would create duplicates rather than edit them; editing/removing an
  // existing item is the medical-card's own job, not this screen's).
  const allergyNewItems = allergyState.items;
  const chronicNewItems = chronicState.items;

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/proxy/onboarding-ladder/anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allergiesList: itemsIncludingDraft(allergyState).length ? itemsIncludingDraft(allergyState) : undefined,
          allergiesNone: allergyNewItems.length === 0 ? allergiesNone : undefined,
          chronicList: itemsIncludingDraft(chronicState).length ? itemsIncludingDraft(chronicState) : undefined,
          chronicNone: chronicNewItems.length === 0 ? chronicNone : undefined,
          childDiseases: isMinor ? childDiseases : undefined,
        }),
      });
      setSaved(true);
      setTimeout(() => { window.location.href = `/${locale}/medical-card`; }, 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', padding: '24px 18px 100px 18px' }}>
      <a href={`/${locale}/medical-card`} aria-label={s.backAriaLabel} className="btn-flat" style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3A3646" strokeWidth={2.2} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </a>

      <h1 style={{ margin: '18px 0 0 0', fontSize: 24, fontWeight: 800, color: 'var(--s3-ink)' }}>{s.title}</h1>
      <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{s.subtitle}</p>

      <Plate style={{ marginTop: 18, borderRadius: 24, padding: 18 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{s.allergiesLabel}</p>
        {initialAllergies.length > 0 && (
          <div style={{ margin: '8px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {initialAllergies.map((a) => <span key={a} style={{ fontSize: 12, fontWeight: 700, color: 'var(--s3-ink-soft)', background: 'var(--s3-tile)', border: '1px solid var(--s3-wall)', borderRadius: 999, padding: '4px 10px' }}>{a}</span>)}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <TagList
            items={allergyNewItems} draft={allergyState.draft}
            onDraftChange={(draft) => setAllergyState((st) => ({ ...st, draft }))}
            onAdd={() => setAllergyState(addToList)}
            onRemove={(v) => setAllergyState((st) => ({ ...st, items: removeFromList(st.items, v) }))}
            none={allergiesNone} onToggleNone={() => setAllergiesNone((v) => !v)}
            placeholder={s.allergiesPlaceholder} addLabel={s.addButton} hint={s.listAddHint} noneLabel={s.noneButton}
          />
        </div>
      </Plate>

      <Plate style={{ marginTop: 14, borderRadius: 24, padding: 18 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{s.chronicLabel}</p>
        {initialChronic.length > 0 && (
          <div style={{ margin: '8px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {initialChronic.map((cItem) => <span key={cItem} style={{ fontSize: 12, fontWeight: 700, color: 'var(--s3-ink-soft)', background: 'var(--s3-tile)', border: '1px solid var(--s3-wall)', borderRadius: 999, padding: '4px 10px' }}>{cItem}</span>)}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <TagList
            items={chronicNewItems} draft={chronicState.draft}
            onDraftChange={(draft) => setChronicState((st) => ({ ...st, draft }))}
            onAdd={() => setChronicState(addToList)}
            onRemove={(v) => setChronicState((st) => ({ ...st, items: removeFromList(st.items, v) }))}
            none={chronicNone} onToggleNone={() => setChronicNone((v) => !v)}
            placeholder={s.chronicPlaceholder} addLabel={s.addButton} hint={s.listAddHint} noneLabel={s.noneButton}
          />
        </div>
      </Plate>

      {isMinor && (
        <Plate style={{ marginTop: 14, borderRadius: 24, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{s.childDiseasesLabel}</p>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {childDiseaseOptions.map((d) => {
              const checked = childDiseases.includes(d);
              return (
                <button
                  key={d} type="button"
                  onClick={() => setChildDiseases((prev) => checked ? prev.filter((x) => x !== d) : [...prev, d])}
                  className={checked ? 'chip-dark' : undefined}
                  style={checked ? undefined : { fontSize: 12, fontWeight: 700, color: 'var(--s3-ink-soft)', background: 'var(--s3-tile)', border: '1px solid var(--s3-wall)', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Plate>
      )}

      <div style={{ marginTop: 20 }}>
        <Button3D variant="clay" onClick={save} disabled={saving} style={{ width: '100%', height: 52 }}>
          {saved ? s.savedMessage : s.saveButton}
        </Button3D>
      </div>
    </div>
  );
}
