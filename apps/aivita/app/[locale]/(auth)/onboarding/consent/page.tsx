import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { ConsentClient } from './ConsentClient';

export default async function ConsentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder.consent');

  return (
    <ConsentClient
      locale={locale}
      strings={{
        title: t('title'),
        subtitle: t('subtitle'),
        briefTitle: t('briefTitle'),
        brief1: t('brief1'),
        brief2: t('brief2'),
        brief3: t('brief3'),
        brief4: t('brief4'),
        medicalLabel: t('medicalLabel'),
        medicalHelper: t('medicalHelper'),
        marketingLabel: t('marketingLabel'),
        marketingHelper: t('marketingHelper'),
        legalTextBefore: t('legalTextBefore'),
        privacyLinkText: t('privacyLinkText'),
        legalTextMiddle: t('legalTextMiddle'),
        termsLinkText: t('termsLinkText'),
        continueButton: t('continueButton'),
        laterButton: t('laterButton'),
        declinedTitle: t('declinedTitle'),
        declinedText: t('declinedText'),
        goToSettings: t('goToSettings'),
        deleteAccount: t('deleteAccount'),
      }}
    />
  );
}
