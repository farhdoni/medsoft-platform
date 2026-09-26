import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toPublicReview } from './public-review.js';

const base = {
  id: 'r1',
  rating: 5,
  text: 'Спасибо',
  createdAt: '2026-09-26T10:00:00.000Z',
  reviewerName: 'Reviewer',
  reviewerAvatarUrl: 'https://example.test/a.png',
};

describe('toPublicReview', () => {
  it('returns only the public fields', () => {
    const out = toPublicReview({ ...base, isAnonymous: false, someInternalField: 'x' } as never);
    expect(Object.keys(out).sort()).toEqual(['createdAt', 'id', 'isAnonymous', 'rating', 'reviewer', 'text']);
  });

  it('no reviewer block when anonymous (or flag missing)', () => {
    expect(toPublicReview({ ...base, isAnonymous: true }).reviewer).toBeNull();
    expect(toPublicReview({ ...base, isAnonymous: null }).reviewer).toBeNull();
  });

  it('reviewer block when not anonymous', () => {
    expect(toPublicReview({ ...base, isAnonymous: false }).reviewer)
      .toEqual({ name: 'Reviewer', avatarUrl: 'https://example.test/a.png' });
  });
});

describe('public review routes use toPublicReview', () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  it('doctor/reviews.ts', () => {
    const src = read('../routes/aivita/doctor/reviews.ts');
    expect(src).toContain('toPublicReview');
    expect(src).not.toMatch(/review:\s*doctorReviews\s*,/);
  });
  it('catalog.ts', () => {
    expect(read('../routes/aivita/doctor/catalog.ts')).toContain('toPublicReview');
  });
});
