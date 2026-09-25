import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Q1Client } from './Q1Client';

export default async function Q1Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <Q1Client
      locale={locale}
      strings={{
        backAriaLabel: t('backAriaLabel'),
        stepLabel: t('q1.stepLabel'),
        title: t('q1.title'),
        subtitle: t('q1.subtitle'),
        sexLabel: t('q1.sexLabel'),
        male: t('q1.male'),
        female: t('q1.female'),
        ageLabel: t('q1.ageLabel'),
        agePlaceholder: t('q1.agePlaceholder'),
        noteText: t('q1.noteText'),
        continueButton: t('q1.continueButton'),
      }}
    />
  );
}
