import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { ParentConsentClient } from './ParentConsentClient';

export default async function ParentConsentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <ParentConsentClient
      locale={locale}
      strings={{
        backAriaLabel: t('backAriaLabel'),
        stepLabel: t('parentConsent.stepLabel'),
        title: t('parentConsent.title'),
        subtitle: t('parentConsent.subtitle'),
        phoneLabel: t('parentConsent.phoneLabel'),
        phonePlaceholder: t('parentConsent.phonePlaceholder'),
        relationLabel: t('parentConsent.relationLabel'),
        relationPlaceholder: t('parentConsent.relationPlaceholder'),
        consentLabel: t('parentConsent.consentLabel'),
        continueButton: t('parentConsent.continueButton'),
        errorRequired: t('parentConsent.errorRequired'),
      }}
    />
  );
}
