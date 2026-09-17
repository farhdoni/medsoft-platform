import { describe, expect, it } from 'vitest';
import { needsPatientContext, CONTEXT_CONTINUITY_WINDOW, type ChatHistoryMessage } from '../context-trigger';

describe('needsPatientContext', () => {
  it('returns false for an empty or whitespace-only message', () => {
    expect(needsPatientContext('')).toBe(false);
    expect(needsPatientContext('   ')).toBe(false);
  });

  describe('short social replies -> false', () => {
    const cases: Array<[string, string]> = [
      ['ru', 'привет'],
      ['ru', 'Привет!'],
      ['ru', 'спасибо'],
      ['ru', 'спасибо!'],
      ['ru', 'ок'],
      ['ru', 'хорошо'],
      ['ru', 'да'],
      ['ru', 'нет'],
      ['ru', 'добрый день'],
      ['uz-latin', 'salom'],
      ['uz-latin', 'rahmat'],
      ['uz-latin', 'mayli'],
      ['uz-cyrillic', 'салом'],
      ['uz-cyrillic', 'рахмат'],
      ['en', 'hi'],
      ['en', 'thanks'],
      ['en', 'ok'],
      ['en', 'got it'],
    ];
    it.each(cases)('%s: %j -> false', (_lang, message) => {
      expect(needsPatientContext(message)).toBe(false);
    });
  });

  describe('medical mentions -> true', () => {
    const cases: Array<[string, string]> = [
      ['ru', 'у меня температура'],
      ['ru', 'какие лекарства пить от давления'],
      ['ru', 'болит спина уже неделю'],
      ['ru', 'привет, у меня болит голова'], // greeting prefix must not mask the symptom
      ['ru', 'какой у меня должен быть анализ крови'],
      ['ru', 'мучает кашель и насморк'],
      ['uz-latin', "boshim og'riyapti"],
      ['uz-cyrillic', 'бошим оғрияпти'],
      ['uz-latin', 'bosim yuqori'],
      ['en', 'I have a headache'],
      ['en', 'what medication should I take for my blood pressure'],
      ['en', 'hi, my stomach hurts'], // greeting prefix must not mask the symptom
    ];
    it.each(cases)('%s: %j -> true', (_lang, message) => {
      expect(needsPatientContext(message)).toBe(true);
    });
  });

  describe('ambiguous / uncertain messages default to true', () => {
    const cases = [
      'мне нужна помощь',
      'расскажи что-нибудь интересное',
      'а что ты умеешь',
      'how does this app work',
    ];
    it.each(cases)('%j -> true (safety over economy)', (message) => {
      expect(needsPatientContext(message)).toBe(true);
    });
  });

  describe('conversation continuity', () => {
    const medicalHistory: ChatHistoryMessage[] = [
      { role: 'user', content: 'у меня третий день болит горло' },
      { role: 'assistant', content: 'Понимаю, расскажите подробнее...' },
    ];

    it('keeps loading context on a short follow-up inside the continuity window', () => {
      expect(needsPatientContext('хорошо, спасибо', medicalHistory)).toBe(true);
      expect(needsPatientContext('ок', medicalHistory)).toBe(true);
    });

    it('ignores history outside the continuity window', () => {
      const oldMedicalTurn: ChatHistoryMessage = { role: 'user', content: 'болит спина' };
      const paddingTurns: ChatHistoryMessage[] = Array.from(
        { length: CONTEXT_CONTINUITY_WINDOW },
        (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: 'обычный разговор без медицины' }),
      );
      const history = [oldMedicalTurn, ...paddingTurns];
      expect(needsPatientContext('спасибо', history)).toBe(false);
    });

    it('a purely social reply with no medical history at all stays false', () => {
      const chitchat: ChatHistoryMessage[] = [
        { role: 'user', content: 'как дела' },
        { role: 'assistant', content: 'Всё отлично, а у вас?' },
      ];
      expect(needsPatientContext('спасибо', chitchat)).toBe(false);
    });
  });
});
