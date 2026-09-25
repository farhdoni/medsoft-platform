import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Plate, Well } from '@/components/soft3d/Surfaces';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { LadderFooter } from '@/components/soft3d/LadderFooter';

export default async function Step4Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={4} stepLabel={t('step4.stepLabel')} backHref={`/${locale}/onboarding/step3`} backAriaLabel={t('backAriaLabel')} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{t('step4.title')}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step4.subtitle')}</p>
      </div>

      {/* Decorative — the real "Прикрепить документ" upload+AI-analysis flow
          lives on /medical-card already; the CTA below routes there rather
          than duplicating an uploader on this teaser screen. */}
      <Well style={{ margin: '22px 18px 0 18px', borderRadius: 22, padding: '28px 20px', textAlign: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth={1.6} style={{ margin: '0 auto' }} aria-hidden="true"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
        <p style={{ margin: '12px 0 0 0', fontSize: 13, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('step4.dropzoneText')}</p>
      </Well>

      <Plate style={{ margin: '14px 18px 0 18px', borderRadius: 24, padding: 20 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('step4.whatThisGivesTitle')}</p>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step4.whatThisGivesText')}</p>
      </Plate>

      <LadderFooter
        prompt={t('step4.prompt')}
        ctaLabel={t('step4.continueButton')}
        continueHref={`/${locale}/medical-card`}
        skipLabel={t('step4.skipButton')}
        skipHref={`/${locale}/home`}
      />
    </div>
  );
}
