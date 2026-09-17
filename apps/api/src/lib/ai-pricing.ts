/**
 * Anthropic per-model pricing, USD per million tokens.
 *
 * Сверить с актуальным прайсом Anthropic перед доверием к финансовой
 * отчётности — цены меняются. Источник и дата сверки: platform.claude.com/
 * docs/en/about-claude/pricing, проверено 2026-09-17. Только модели, реально
 * используемые точками вызова из docs/llm-layer-audit.md.
 */

export interface ModelPricing {
  /** Base (uncached) input tokens, $/MTok. */
  input: number;
  /** Output tokens, $/MTok. */
  output: number;
  /** 5-minute cache write, $/MTok (1.25x base input on every model below). */
  cacheWrite5m: number;
  /** Cache read (hit), $/MTok (0.1x base input on every model below). */
  cacheRead: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-sonnet-4-6':          { input: 3,    output: 15, cacheWrite5m: 3.75, cacheRead: 0.30 },
  'claude-sonnet-4-5':          { input: 3,    output: 15, cacheWrite5m: 3.75, cacheRead: 0.30 },
  'claude-haiku-4-5':           { input: 1,    output: 5,  cacheWrite5m: 1.25, cacheRead: 0.10 },
  'claude-haiku-4-5-20251001':  { input: 1,    output: 5,  cacheWrite5m: 1.25, cacheRead: 0.10 },
};

/**
 * Cost in USD for one request. cacheCreationInputTokens is billed at the
 * 5-minute-write rate (this codebase never sets a 1h TTL) — cacheReadTokens
 * at the cache-hit rate; both are already excluded from inputTokens by the
 * Anthropic API (usage.input_tokens does not double-count cached tokens).
 * Unknown model -> null (caller decides whether to store a NULL cost rather
 * than a wrong number).
 */
export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationInputTokens: number,
  cacheReadInputTokens: number,
): number | null {
  const price = PRICING_TABLE[model];
  if (!price) return null;

  const cost =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output +
    (cacheCreationInputTokens / 1_000_000) * price.cacheWrite5m +
    (cacheReadInputTokens / 1_000_000) * price.cacheRead;

  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimal places, matches cost_usd's numeric(8,6)
}
