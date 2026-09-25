// Pure logic pulled out of SurveyBanner.tsx so the chip-add/remove/dedup
// behavior and the "pause for the rest of this visit" gate are directly
// unit-testable without a DOM/React renderer — this project has no
// @testing-library/react setup, and matches the same extraction pattern
// already used for lib/ai/chat-prompt.ts.

// ─── List chip add/remove/merge ─────────────────────────────────────────────

export interface ChipInputState {
  items: string[];
  draft: string;
}

/** Trims and dedupes; empty/duplicate input is a no-op on `items`. */
export function addToList(state: ChipInputState): ChipInputState {
  const v = state.draft.trim();
  if (!v) return state;
  const items = state.items.includes(v) ? state.items : [...state.items, v];
  return { items, draft: '' };
}

export function removeFromList(items: string[], value: string): string[] {
  return items.filter((x) => x !== value);
}

/**
 * What "Сохранить" actually submits: any already-added chips, PLUS
 * whatever is still sitting unconfirmed in the draft field (trimmed,
 * deduped against existing chips) — so text a user typed but never
 * pressed Enter/comma/"+" on isn't silently dropped.
 */
export function itemsIncludingDraft(state: ChipInputState): string[] {
  const v = state.draft.trim();
  if (!v) return state.items;
  return state.items.includes(v) ? state.items : [...state.items, v];
}

// ─── Composition-safe Enter/comma handling ──────────────────────────────────

/**
 * Whether a keydown should trigger addToList(). `isComposing` covers IME
 * composition in progress (some mobile/OS Cyrillic keyboards route Enter
 * through composition-commit rather than a plain keydown) — false while
 * composing means this keystroke is left alone, and the *next* real
 * keydown (composition already finished) still adds the chip normally.
 */
export function shouldAddChipOnKeydown(key: string, isComposing: boolean): boolean {
  if (isComposing) return false;
  return key === 'Enter' || key === ',';
}

// ─── Field-dependent list placeholder ───────────────────────────────────────

const LIST_PLACEHOLDER_KEY: Record<string, string> = {
  allergies: 'listPlaceholderAllergies',
  chronicDiseases: 'listPlaceholderChronicDiseases',
  medications: 'listPlaceholderMedications',
};

/** Falls back to the generic key for any field not in the map above. */
export function listPlaceholderKeyFor(field: string): string {
  return LIST_PLACEHOLDER_KEY[field] ?? 'listPlaceholder';
}

// ─── Field-dependent text-input placeholder (Part B's new 'text' type) ─────

const TEXT_PLACEHOLDER_KEY: Record<string, string> = {
  emergencyContactPhone: 'textPlaceholderPhone',
  phone: 'textPlaceholderPhone',
  city: 'textPlaceholderCity',
  doctorName: 'textPlaceholderDoctorName',
  clinic: 'textPlaceholderClinic',
};

/** Falls back to the generic key for any field not in the map above. */
export function textPlaceholderKeyFor(field: string): string {
  return TEXT_PLACEHOLDER_KEY[field] ?? 'textPlaceholder';
}

// ─── "Pause for the rest of this visit" (sessionStorage-backed) ────────────
//
// sessionStorage, not localStorage — localStorage would hide the banner
// forever, overriding the server's own daily-limit/cooldown logic in
// survey-queue.ts. This is a client-only "don't ask again this visit"
// latch on top of that, scoped to the tab session. Takes the storage as a
// parameter (rather than reaching for `sessionStorage` directly) so it's
// testable in plain Node without jsdom.

export const VISIT_PAUSE_KEY = 'aivita_survey_paused_visit';

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isPausedThisVisit(storage: SimpleStorage | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(VISIT_PAUSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function pauseForRestOfVisit(storage: SimpleStorage | undefined): void {
  if (!storage) return;
  try {
    storage.setItem(VISIT_PAUSE_KEY, '1');
  } catch {
    // Storage unavailable (private mode, quota) — worst case the banner
    // can reappear on the next page load, same as before this change.
  }
}
