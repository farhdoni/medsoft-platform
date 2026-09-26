import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toPublicDoctorProfile, maskCatalogListRow } from './public-doctor.js';

const row = {
  id: 'profile-row-id',
  userId: 'u1',
  specialization: 'Терапевт',
  bio: 'bio',
  city: 'Ташкент',
  languages: ['ru', 'uz'],
  photoUrl: null,
  experienceStartDate: '2010-01-01',
  additionalSkills: [],
  consultationPrice: 200000,
  rating: 4.8,
  ratingCount: 10,
  totalConsultations: 5,
  totalPatients: 4,
  likesCount: 1,
  clinicName: 'Клиника',
  clinicAddress: 'адрес',
  verificationStatus: 'verified',
  showPrice: true,
  showRating: true,
  showPhone: false,
  phone: '+998000000000',
  certificates: [{ title: 'Курс', year: 2020, scanUrl: '/v1/aivita/uploads/x.pdf' }],
  internalColumnA: 'not-public-a',
  internalColumnB: 'not-public-b',
};

const EXPECTED_KEYS = [
  'additionalSkills', 'bio', 'certificates', 'city', 'clinicAddress', 'clinicName', 'clinicPhone',
  'clinicWebsite', 'consultationPrice', 'diplomaSpecialty', 'diplomaUniversity', 'diplomaYear',
  'diseasesTreated', 'experienceStartDate', 'languages', 'likesCount', 'phone', 'photoUrl', 'rating',
  'ratingCount', 'recommendsCount', 'showPrice', 'showRating', 'specialization', 'telegram',
  'thanksCount', 'totalConsultations', 'totalPatients', 'userId', 'verificationStatus', 'whatsapp',
];

describe('toPublicDoctorProfile', () => {
  it('returns exactly the listed public fields', () => {
    expect(Object.keys(toPublicDoctorProfile(row)).sort()).toEqual(EXPECTED_KEYS);
  });

  it('columns not on the list are not serialized', () => {
    const json = JSON.stringify(toPublicDoctorProfile(row));
    for (const v of ['not-public-a', 'not-public-b', 'profile-row-id', 'x.pdf']) expect(json).not.toContain(v);
  });

  it('contacts only with opt-in', () => {
    expect(toPublicDoctorProfile(row).phone).toBeNull();
    expect(toPublicDoctorProfile({ ...row, showPhone: true }).phone).toBe('+998000000000');
  });

  it('respects show_price / show_rating', () => {
    const p = toPublicDoctorProfile({ ...row, showPrice: false, showRating: false });
    expect([p.consultationPrice, p.rating, p.ratingCount]).toEqual([null, null, null]);
  });
});

describe('maskCatalogListRow', () => {
  it('hides price/rating in the list when turned off', () => {
    const m = maskCatalogListRow({ showPrice: false, showRating: false, consultationPrice: 1, rating: 5, ratingCount: 3 });
    expect([m.consultationPrice, m.rating, m.ratingCount]).toEqual([null, null, null]);
  });
});

describe('doctor catalog route', () => {
  const src = readFileSync(new URL('../routes/aivita/doctor/catalog.ts', import.meta.url), 'utf8');
  it('GET /:id uses toPublicDoctorProfile and requires show_in_catalog', () => {
    const handler = src.slice(src.indexOf("doctorCatalogRouter.get('/:id',"), src.indexOf("doctorCatalogRouter.get('/:id/reviews'"));
    expect(handler).toContain('toPublicDoctorProfile');
    expect(handler).toContain('showInCatalog');
    expect(handler).not.toMatch(/data:\s*row\s*\}/);
  });
});
