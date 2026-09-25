import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Q2Client } from './Q2Client';

export default async function Q2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <Q2Client
      locale={locale}
      strings={{
        backAriaLabel: t('backAriaLabel'),
        stepLabel: t('q2.stepLabel'),
        title: t('q2.title'),
        subtitle: t('q2.subtitle'),
        heightLabel: t('q2.heightLabel'),
        weightLabel: t('q2.weightLabel'),
        bmiCalculating: t('q2.bmiCalculating'),
        bmiLabel: t('q2.bmiLabel'),
        bmiBelow: t('q2.bmiBelow'),
        bmiNormal: t('q2.bmiNormal'),
        bmiAbove: t('q2.bmiAbove'),
        noteText: t('q2.noteText'),
        continueButton: t('q2.continueButton'),
      }}
    />
  );
}
