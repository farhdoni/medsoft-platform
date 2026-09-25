import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { apiRequest } from '@/lib/api-client';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { AnamnesisClient } from './AnamnesisClient';

interface MedicalCardData {
  isMinor: boolean;
  allergies: Array<{ allergen: string }>;
  chronicConditions: Array<{ name: string }>;
  allergiesNone?: boolean;
  chronicConditionsNone?: boolean;
  teen?: { childDiseases?: string[] | null } | null;
}

const CHILD_DISEASES = ['Ветрянка', 'Корь', 'Краснуха', 'Скарлатина', 'Паротит', 'Мононуклеоз', 'Коклюш'];

export default async function AnamnesisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder.anamnesis');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';
  const result = await apiRequest<MedicalCardData>('/onboarding/medical-card', { sessionCookie });
  const data = 'data' in result ? result.data : null;

  return (
    <AnamnesisClient
      locale={locale}
      isMinor={data?.isMinor ?? false}
      initialAllergies={data?.allergies?.map((a) => a.allergen) ?? []}
      initialChronic={data?.chronicConditions?.map((c) => c.name) ?? []}
      initialAllergiesNone={data?.allergiesNone ?? false}
      initialChronicNone={data?.chronicConditionsNone ?? false}
      initialChildDiseases={data?.teen?.childDiseases ?? []}
      childDiseaseOptions={CHILD_DISEASES}
      strings={{
        title: t('title'),
        subtitle: t('subtitle'),
        allergiesLabel: t('allergiesLabel'),
        allergiesPlaceholder: t('allergiesPlaceholder'),
        chronicLabel: t('chronicLabel'),
        chronicPlaceholder: t('chronicPlaceholder'),
        noneButton: t('noneButton'),
        addButton: t('addButton'),
        listAddHint: t('listAddHint'),
        childDiseasesLabel: t('childDiseasesLabel'),
        saveButton: t('saveButton'),
        savedMessage: t('savedMessage'),
        backAriaLabel: t('backAriaLabel'),
      }}
    />
  );
}
