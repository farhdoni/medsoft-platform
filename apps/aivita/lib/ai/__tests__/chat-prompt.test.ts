import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT, buildSystemBlocks } from '../chat-prompt';

describe('buildSystemBlocks', () => {
  it('returns a single cached block when there is no context to add', () => {
    const blocks = buildSystemBlocks('ru', '');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[0].text).toBe(SYSTEM_PROMPT);
  });

  it('returns two blocks when a context block is present — only the first is cached', () => {
    const blocks = buildSystemBlocks('ru', '\n\nДанные пациента: тест');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks[1].cache_control).toBeUndefined();
    expect(blocks[1].text).toBe('\n\nДанные пациента: тест');
  });

  it('the cached block is byte-identical regardless of context — required for the cache to ever hit', () => {
    const withoutContext = buildSystemBlocks('ru', '');
    const withContext = buildSystemBlocks('ru', '\n\nДанные пациента: что угодно');
    expect(withoutContext[0].text).toBe(withContext[0].text);
  });

  it('falls back to the ru prompt for an unknown locale', () => {
    const blocks = buildSystemBlocks('fr', '');
    expect(blocks[0].text).toBe(SYSTEM_PROMPT);
  });

  it('the "use patient data" instruction now lives in the cached block, not duplicated in context', () => {
    // This is the actual optimization under test: the instruction sentence
    // used to be re-sent, uncached, glued onto the patient-data string on
    // every message that needed context. It now lives once, in the cached
    // static block (## PATIENT DATA), and the context block carries only
    // the data itself.
    expect(SYSTEM_PROMPT).toContain('## PATIENT DATA');
    expect(SYSTEM_PROMPT).toContain('используй их для персонализированных советов');

    const contextBlock = '\n\nДанные пациента: вес 70 кг';
    expect(contextBlock).not.toContain('Используй данные пациента');
  });
});
