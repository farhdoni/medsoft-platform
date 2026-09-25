import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiRequest } from '@/lib/api-client';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Plate, DarkPlate, WellDark } from '@/components/soft3d/Surfaces';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { LadderFooter } from '@/components/soft3d/LadderFooter';

interface LadderStatus { hasQ1: boolean; gender: string | null; age: number | null; isMinor: boolean; parentConsentCleared: boolean }

export default async function R1Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder.r1');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';
  const result = await apiRequest<LadderStatus>('/onboarding-ladder/status', { sessionCookie });
  const status = 'data' in result ? result.data : null;

  // Nothing to show a result about yet — send back to Q1 rather than
  // rendering an empty/broken interstitial.
  if (!status?.hasQ1 || status.age === null) redirect(`/${locale}/onboarding/q1`);

  const resultText = status.gender === 'female' ? t('resultFemale', { age: status.age }) : t('resultMale', { age: status.age });
  const nextHref = status.isMinor && !status.parentConsentCleared
    ? `/${locale}/onboarding/parent-consent`
    : `/${locale}/onboarding/q2`;

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={1} />

      <div style={{ padding: '28px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('headerText')}</h1>
      </div>

      <DarkPlate style={{ margin: '18px 18px 0 18px', borderRadius: 26, padding: 22 }}>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: '#fff', fontWeight: 700 }}>{resultText}</p>
        <WellDark style={{ marginTop: 16, borderRadius: 18, padding: '14px 16px' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{t('watchForTitle')}</p>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, lineHeight: 1.5, color: '#fff' }}>{t('watchForText')}</p>
        </WellDark>
      </DarkPlate>

      <Plate style={{ margin: '14px 18px 0 18px', borderRadius: 22, padding: 18 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('teaser')}</p>
      </Plate>

      <LadderFooter
        prompt={t('prompt')}
        ctaLabel={t('continueButton')}
        continueHref={nextHref}
        skipLabel={t('skipButton')}
        skipHref={`/${locale}/home`}
      />
    </div>
  );
}
