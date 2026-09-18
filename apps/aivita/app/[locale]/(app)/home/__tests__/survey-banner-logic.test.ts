import { describe, expect, it } from 'vitest';
import {
  addToList,
  isPausedThisVisit,
  itemsIncludingDraft,
  listPlaceholderKeyFor,
  pauseForRestOfVisit,
  removeFromList,
  shouldAddChipOnKeydown,
  VISIT_PAUSE_KEY,
  type SimpleStorage,
} from '../survey-banner-logic';

// In-memory stand-in for sessionStorage — avoids needing jsdom just for
// two functions that only ever call getItem/setItem.
function fakeStorage(initial: Record<string, string> = {}): SimpleStorage {
  const store = { ...initial };
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value; },
  };
}

describe('addToList (A1/A3: chip add, trim, dedup)', () => {
  it('adds a trimmed value as a new chip and clears the draft', () => {
    const result = addToList({ items: [], draft: '  Пенициллин  ' });
    expect(result).toEqual({ items: ['Пенициллин'], draft: '' });
  });

  it('is a no-op on empty/whitespace-only draft', () => {
    const state = { items: ['Гипертония'], draft: '   ' };
    expect(addToList(state)).toEqual(state);
  });

  it('dedupes — adding an existing value again does not duplicate it', () => {
    const result = addToList({ items: ['Гипертония'], draft: 'Гипертония' });
    expect(result.items).toEqual(['Гипертония']);
    expect(result.draft).toBe('');
  });

  it('handles Cyrillic values identically to any other text', () => {
    const result = addToList({ items: ['Гипертония'], draft: 'Сахарный диабет' });
    expect(result.items).toEqual(['Гипертония', 'Сахарный диабет']);
  });
});

describe('removeFromList (A3: chip removal)', () => {
  it('removes exactly the matching item', () => {
    expect(removeFromList(['A', 'B', 'C'], 'B')).toEqual(['A', 'C']);
  });

  it('is a no-op when the value is not present', () => {
    expect(removeFromList(['A', 'B'], 'Z')).toEqual(['A', 'B']);
  });
});

describe('itemsIncludingDraft (A2: unconfirmed text is not lost on Save)', () => {
  it('folds trimmed, non-empty draft text into the returned list', () => {
    expect(itemsIncludingDraft({ items: ['Пенициллин'], draft: 'Аспирин' }))
      .toEqual(['Пенициллин', 'Аспирин']);
  });

  it('returns existing items unchanged when the draft is empty/whitespace', () => {
    expect(itemsIncludingDraft({ items: ['Пенициллин'], draft: '  ' }))
      .toEqual(['Пенициллин']);
  });

  it('does not duplicate draft text that already exists as a chip', () => {
    expect(itemsIncludingDraft({ items: ['Аспирин'], draft: 'Аспирин' }))
      .toEqual(['Аспирин']);
  });

  it('returns just the draft as a single-item list when there are no chips yet', () => {
    expect(itemsIncludingDraft({ items: [], draft: 'Пенициллин' })).toEqual(['Пенициллин']);
  });
});

describe('shouldAddChipOnKeydown (A1: composition-safe Enter/comma)', () => {
  it('true for Enter when not composing', () => {
    expect(shouldAddChipOnKeydown('Enter', false)).toBe(true);
  });

  it('true for comma when not composing', () => {
    expect(shouldAddChipOnKeydown(',', false)).toBe(true);
  });

  it('false for Enter while an IME composition is in progress', () => {
    expect(shouldAddChipOnKeydown('Enter', true)).toBe(false);
  });

  it('false for any other key', () => {
    expect(shouldAddChipOnKeydown('a', false)).toBe(false);
  });
});

describe('listPlaceholderKeyFor (A4: field-dependent placeholder)', () => {
  it('maps allergies to its own placeholder key', () => {
    expect(listPlaceholderKeyFor('allergies')).toBe('listPlaceholderAllergies');
  });

  it('maps chronicDiseases to its own placeholder key', () => {
    expect(listPlaceholderKeyFor('chronicDiseases')).toBe('listPlaceholderChronicDiseases');
  });

  it('falls back to the generic key for an unmapped field', () => {
    expect(listPlaceholderKeyFor('bloodType')).toBe('listPlaceholder');
  });
});

describe('isPausedThisVisit / pauseForRestOfVisit (A5: pause after skip/answer)', () => {
  it('is not paused before anything is written', () => {
    expect(isPausedThisVisit(fakeStorage())).toBe(false);
  });

  it('pauseForRestOfVisit sets the flag read back by isPausedThisVisit', () => {
    const storage = fakeStorage();
    pauseForRestOfVisit(storage);
    expect(isPausedThisVisit(storage)).toBe(true);
    expect(storage.getItem(VISIT_PAUSE_KEY)).toBe('1');
  });

  it('undefined storage (SSR / storage unavailable) reads as not-paused and writes as a no-op', () => {
    expect(isPausedThisVisit(undefined)).toBe(false);
    expect(() => pauseForRestOfVisit(undefined)).not.toThrow();
  });

  it('a storage that throws (private-mode quota) is treated as not-paused, not a crash', () => {
    const throwing: SimpleStorage = {
      getItem: () => { throw new Error('quota'); },
      setItem: () => { throw new Error('quota'); },
    };
    expect(isPausedThisVisit(throwing)).toBe(false);
    expect(() => pauseForRestOfVisit(throwing)).not.toThrow();
  });
});
