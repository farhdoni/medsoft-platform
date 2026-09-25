import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Plate } from '@/components/soft3d/Surfaces';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { LadderFooter } from '@/components/soft3d/LadderFooter';

export default async function Step2Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={2} stepLabel={t('step2.stepLabel')} backHref={`/${locale}/onboarding/done1`} backAriaLabel={t('backAriaLabel')} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{t('step2.title')}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step2.subtitle')}</p>
      </div>

      <Plate style={{ margin: '22px 18px 0 18px', borderRadius: 24, padding: 20 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('step2.whatThisGivesTitle')}</p>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step2.whatThisGivesText')}</p>
      </Plate>

      <LadderFooter
        prompt={t('step2.prompt')}
        ctaLabel={t('step2.continueButton')}
        continueHref={`/${locale}/ai-checkup`}
        skipLabel={t('step2.skipButton')}
        skipHref={`/${locale}/home`}
      />
    </div>
  );
}
