import { getTranslations } from 'next-intl/server';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Plate, Well } from '@/components/soft3d/Surfaces';
import { FlatButton } from '@/components/soft3d/Button3D';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { LadderFooter } from '@/components/soft3d/LadderFooter';

export default async function Step3Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder');

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={3} stepLabel={t('step3.stepLabel')} backHref={`/${locale}/onboarding/step2`} backAriaLabel={t('backAriaLabel')} />

      <div style={{ padding: '32px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 27, lineHeight: 1.2, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>{t('step3.title')}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step3.subtitle')}</p>
      </div>

      {/* Device connect is real Health-Connect wiring, tracked as its own
          part per the roadmap — these two links go to the existing /gadgets
          page rather than performing an OAuth-style connect flow here. */}
      <div style={{ margin: '22px 18px 0 18px', display: 'flex', gap: 10 }}>
        <a href={`/${locale}/gadgets`} style={{ flex: 1, textDecoration: 'none' }}>
          <FlatButton style={{ width: '100%' }}>{t('step3.appleHealth')}</FlatButton>
        </a>
        <a href={`/${locale}/gadgets`} style={{ flex: 1, textDecoration: 'none' }}>
          <FlatButton style={{ width: '100%' }}>{t('step3.googleFit')}</FlatButton>
        </a>
      </div>

      <Plate style={{ margin: '14px 18px 0 18px', borderRadius: 24, padding: 20 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('step3.whatThisGivesTitle')}</p>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('step3.whatThisGivesText')}</p>
      </Plate>

      <Well style={{ margin: '12px 18px 0 18px', borderRadius: 16, padding: '12px 16px' }}>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('step3.noDeviceNote')}</p>
      </Well>

      <LadderFooter
        prompt={t('step3.prompt')}
        ctaLabel={t('step3.continueButton')}
        continueHref={`/${locale}/onboarding/step4`}
        skipLabel={t('step3.skipButton')}
        skipHref={`/${locale}/home`}
      />
    </div>
  );
}
