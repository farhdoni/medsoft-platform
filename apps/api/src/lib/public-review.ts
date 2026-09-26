// Public shape of a doctor review. Both public review routes
// (/v1/aivita/catalog/:id/reviews and /v1/aivita/doctor/reviews/doctor/:id)
// serialize reviews only through toPublicReview, so the set of public fields
// is defined in one place. No DB import — unit-tested directly.

export interface ReviewRowForPublic {
  id: string;
  rating: number;
  text: string | null;
  isAnonymous: boolean | null;
  createdAt: Date | string | null;
  reviewerName: string | null;
  reviewerAvatarUrl?: string | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  text: string | null;
  isAnonymous: boolean;
  createdAt: Date | string | null;
  reviewer: { name: string | null; avatarUrl: string | null } | null;
}

export function toPublicReview(row: ReviewRowForPublic): PublicReview {
  // A missing flag is treated as anonymous.
  const anonymous = row.isAnonymous !== false;
  return {
    id: row.id,
    rating: row.rating,
    text: row.text,
    isAnonymous: anonymous,
    createdAt: row.createdAt,
    reviewer: anonymous
      ? null
      : { name: row.reviewerName, avatarUrl: row.reviewerAvatarUrl ?? null },
  };
}
