import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { apiRequest } from '@/lib/api-client';
import { requireLadderAccess } from '@/lib/onboarding-ladder-guard';
import { Plate } from '@/components/soft3d/Surfaces';
import { LadderProgress } from '@/components/soft3d/LadderProgress';
import { LadderFooter } from '@/components/soft3d/LadderFooter';

interface LadderStatus {
  hasQ1: boolean; hasQ2: boolean; age: number | null;
  heightCm: number | null; weightKg: string | null;
  isMinor: boolean; parentConsentCleared: boolean;
}
interface CompleteResult { ok: boolean; cardCode: string }

export default async function Done1Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireLadderAccess(locale);
  const t = await getTranslations('app.soft3d.onboardingLadder.done1');

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_api')?.value ?? '';

  const statusResult = await apiRequest<LadderStatus>('/onboarding-ladder/status', { sessionCookie });
  const status = 'data' in statusResult ? statusResult.data : null;
  if (!status?.hasQ1) redirect(`/${locale}/onboarding/q1`);
  if (status.isMinor && !status.parentConsentCleared) redirect(`/${locale}/onboarding/parent-consent`);
  if (!status.hasQ2) redirect(`/${locale}/onboarding/q2`);

  // Idempotent server-side: reloading/revisiting this page is safe, it just
  // returns the same already-created card (see onboarding-ladder.ts's
  // /complete handler).
  const completeResult = await apiRequest<CompleteResult>('/onboarding-ladder/complete', { method: 'POST', sessionCookie });
  if (!('data' in completeResult)) redirect(`/${locale}/onboarding/q2`);

  const bmi = status.heightCm && status.weightKg
    ? Number(status.weightKg) / ((status.heightCm / 100) * (status.heightCm / 100))
    : null;

  return (
    <div className="soft3d" style={{ minHeight: '100vh', background: 'var(--s3-board)', display: 'flex', flexDirection: 'column' }}>
      <LadderProgress filledCount={1} />

      <div style={{ padding: '28px 22px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('title')}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('subtitle')}</p>
      </div>

      <Plate grain style={{ margin: '20px 18px 0 18px', borderRadius: 26, padding: 22, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--s3-ink-soft)' }}>AIVITA</p>
        <p style={{ margin: '4px 0 0 0', fontSize: 20, fontWeight: 800, color: 'var(--s3-ink)' }}>{completeResult.data.cardCode}</p>
        {status.age !== null && (
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: 'var(--s3-ink-soft)' }}>
            {t('summary', { age: status.age, bmi: bmi ? bmi.toFixed(1) : '—' })}
          </p>
        )}
      </Plate>

      <Plate style={{ margin: '14px 18px 0 18px', borderRadius: 22, padding: 18 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('nextStepTitle')}</p>
        <p style={{ margin: '6px 0 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('nextStepText')}</p>
      </Plate>

      <LadderFooter
        prompt={t('prompt')}
        ctaLabel={t('continueButton')}
        continueHref={`/${locale}/onboarding/step2`}
        skipLabel={t('skipButton')}
        skipHref={`/${locale}/home`}
      />
    </div>
  );
}
