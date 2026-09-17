import { SOCIAL_ONLY_PHRASES, MEDICAL_KEYWORDS } from './context-trigger-keywords';

export type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

/**
 * How many of the most recent history messages (either role) still count
 * as "inside the same medical exchange" — keeps the patient-context
 * summary loaded for a few turns after a real health topic came up, so a
 * short "ok"/"thanks" mid-conversation doesn't suddenly drop it.
 */
export const CONTEXT_CONTINUITY_WINDOW = 6;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

const ALL_MEDICAL_KEYWORDS = [
  ...MEDICAL_KEYWORDS.ru,
  ...MEDICAL_KEYWORDS.uz,
  ...MEDICAL_KEYWORDS.en,
];

const ALL_SOCIAL_PHRASES = [
  ...SOCIAL_ONLY_PHRASES.ru,
  ...SOCIAL_ONLY_PHRASES.uz,
  ...SOCIAL_ONLY_PHRASES.en,
];

function hasMedicalKeyword(normalizedText: string): boolean {
  return ALL_MEDICAL_KEYWORDS.some((kw) => normalizedText.includes(kw));
}

/**
 * Conservative on purpose: only a message that IS (a prefix of) a
 * whitelisted social phrase, capped at a short length, counts as pure
 * social chit-chat. A longer message that happens to start with "спасибо"
 * but goes on to say something else must NOT be classified this way —
 * hence the length cap in addition to the prefix check.
 */
function isPureSocialReply(normalizedText: string): boolean {
  if (normalizedText.length > 40) return false;
  return ALL_SOCIAL_PHRASES.some(
    (phrase) =>
      normalizedText === phrase ||
      normalizedText.startsWith(`${phrase} `) ||
      normalizedText.startsWith(`${phrase},`) ||
      normalizedText.startsWith(`${phrase}!`),
  );
}

/**
 * Decides whether the current turn needs the patient-context summary
 * (buildPatientContext's 6 parallel HTTP calls). Pure — no I/O, no env,
 * fully unit-testable.
 *
 * Priority, in order:
 * 1. Empty message -> false (nothing to answer).
 * 2. Any medical-keyword hit in the CURRENT message -> true, regardless of
 *    anything else in it (e.g. a greeting prefix: "привет, у меня болит
 *    голова" still hits "болит").
 * 3. A medical-keyword hit anywhere in the last CONTEXT_CONTINUITY_WINDOW
 *    history messages -> true (stay in context through a short reply).
 * 4. A recognized pure social reply with no medical keyword -> false.
 * 5. Anything else — uncertain -> true. Safety over economy: a missed
 *    "false" only wastes 6 HTTP calls; a wrongly-skipped "true" means the
 *    model answers a real health question with no patient data at all.
 */
export function needsPatientContext(message: string, history: ChatHistoryMessage[] = []): boolean {
  const text = normalize(message);
  if (!text) return false;

  if (hasMedicalKeyword(text)) return true;

  const recent = history.slice(-CONTEXT_CONTINUITY_WINDOW);
  if (recent.some((m) => hasMedicalKeyword(normalize(m.content)))) return true;

  if (isPureSocialReply(text)) return false;

  return true;
}
