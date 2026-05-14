import { cookies } from 'next/headers';
import { apiRequest } from '@/lib/api-client';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { MedicalCardClient } from './MedicalCardClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MedicalCardData = {
  card: {
    cardCode: string;
    isActive: boolean;
    accessCount: number;
    createdAt: string;
  } | null;
  completionPercent: number;
  isMinor: boolean;
  personal: {
    name?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    phone?: string | null;
    city?: string | null;
    pinfl?: string | null;
  };
  body: {
    height?: number | null;
    weight?: string | null;
    bloodType?: string | null;
  };
  allergies: Array<{ id: string; allergen: string; type: string; severity?: string | null }>;
  chronicConditions: Array<{ id: string; name: string; diagnosedYear?: number | null }>;
  lifestyle: {
    smoking?: string | null;
    alcohol?: string | null;
    activity?: string | null;
    sleep?: string | null;
    diet?: string | null;
    nutrition?: string | null;
  };
  emergency: {
    name?: string | null;
    phone?: string | null;
    relation?: string | null;
  };
  doctor: {
    name?: string | null;
    phone?: string | null;
    clinic?: string | null;
  };
  insurance: {
    company?: string | null;
    number?: string | null;
    expires?: string | null;
    hotline?: string | null;
  };
  teen: {
    school?: string | null;
    grade?: string | null;
    visionStatus?: string | null;
    childDiseases?: string[] | null;
    vaccinationHistory?: Array<{ name: string; status: string; date?: string }> | null;
    screenTime?: string | null;
  } | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MedicalCardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const result = await apiRequest<MedicalCardData>('/onboarding/medical-card', {
    sessionCookie,
  });

  const cardData: MedicalCardData | null =
    'data' in result ? result.data : null;

  return (
    <PageShell active="medical-card" locale={locale}>
      <div className="max-w-[680px] mx-auto pb-24">
        <MedicalCardClient data={cardData} locale={locale} />
      </div>
    </PageShell>
  );
}
