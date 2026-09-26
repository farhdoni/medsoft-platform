// Public shape of a doctor profile in the catalog: an explicit list of
// fields. Anything not listed here is not serialized, including columns
// added to doctor_profiles later. No DB import — unit-tested directly.

export interface DoctorProfileRow {
  userId: string;
  specialization: string | null;
  bio: string | null;
  city: string | null;
  languages: unknown;
  photoUrl: string | null;
  experienceStartDate: string | null;
  additionalSkills: unknown;
  diseasesTreated?: unknown;
  consultationPrice: number | null;
  rating: number | null;
  ratingCount: number | null;
  totalConsultations: number | null;
  totalPatients: number | null;
  likesCount: number | null;
  thanksCount?: number | null;
  recommendsCount?: number | null;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone?: string | null;
  clinicWebsite?: string | null;
  diplomaUniversity?: string | null;
  diplomaSpecialty?: string | null;
  diplomaYear?: number | null;
  certificates?: unknown;
  verificationStatus: string | null;
  phone?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  showPrice: boolean | null;
  showRating: boolean | null;
  showPhone?: boolean | null;
  [other: string]: unknown;
}

export function toPublicDoctorProfile(p: DoctorProfileRow) {
  const showPrice = p.showPrice !== false;
  const showRating = p.showRating !== false;
  const showPhone = p.showPhone === true;
  const certificates = Array.isArray(p.certificates)
    ? (p.certificates as Array<Record<string, unknown>>).map(c => ({
        title: typeof c?.title === 'string' ? c.title : null,
        year: typeof c?.year === 'number' || typeof c?.year === 'string' ? c.year : null,
      }))
    : [];
  return {
    userId: p.userId,
    specialization: p.specialization,
    bio: p.bio,
    city: p.city,
    languages: p.languages,
    photoUrl: p.photoUrl,
    experienceStartDate: p.experienceStartDate,
    additionalSkills: p.additionalSkills,
    diseasesTreated: p.diseasesTreated ?? null,
    consultationPrice: showPrice ? p.consultationPrice : null,
    rating: showRating ? p.rating : null,
    ratingCount: showRating ? p.ratingCount : null,
    totalConsultations: p.totalConsultations,
    totalPatients: p.totalPatients,
    likesCount: p.likesCount,
    thanksCount: p.thanksCount ?? null,
    recommendsCount: p.recommendsCount ?? null,
    clinicName: p.clinicName,
    clinicAddress: p.clinicAddress,
    clinicPhone: p.clinicPhone ?? null,
    clinicWebsite: p.clinicWebsite ?? null,
    diplomaUniversity: p.diplomaUniversity ?? null,
    diplomaSpecialty: p.diplomaSpecialty ?? null,
    diplomaYear: p.diplomaYear ?? null,
    certificates,
    verificationStatus: p.verificationStatus,
    phone: showPhone ? p.phone ?? null : null,
    telegram: showPhone ? p.telegram ?? null : null,
    whatsapp: showPhone ? p.whatsapp ?? null : null,
    showPrice,
    showRating,
  };
}

/** List rows carry price/rating too — hide them the same way. */
export function maskCatalogListRow<T extends { showPrice: boolean | null; showRating: boolean | null; consultationPrice: number | null; rating: number | null; ratingCount: number | null }>(row: T): T {
  return {
    ...row,
    consultationPrice: row.showPrice === false ? null : row.consultationPrice,
    rating: row.showRating === false ? null : row.rating,
    ratingCount: row.showRating === false ? null : row.ratingCount,
  };
}
