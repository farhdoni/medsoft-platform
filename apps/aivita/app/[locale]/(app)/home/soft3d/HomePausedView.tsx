import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Plate, DarkPlate, Well, WellDark } from '@/components/soft3d/Surfaces';
import { StatTile } from '@/components/soft3d/StatTile';
import { Button3D } from '@/components/soft3d/Button3D';
import { nextIncompleteStage, type OnboardingStages } from '../home-state-logic';

const NEXT_STEP_HREF: Record<'checkup' | 'gadgets' | 'documents', string> = {
  checkup: '/ai-checkup',
  gadgets: '/gadgets',
  documents: '/medical-history',
};

/** HomePaused.dc.html — a medical card exists, but not all 4 roadmap stages are done. */
export async function HomePausedView({
  locale,
  greetingKey,
  displayName,
  stages,
  stagesDone,
}: {
  locale: string;
  greetingKey: string;
  displayName: string;
  stages: OnboardingStages;
  stagesDone: number;
}) {
  const t = await getTranslations('app.soft3d.home');
  const next = nextIncompleteStage(stages);

  const assistantBody = next === 'gadgets' ? t('paused.assistantRestGadgets')
    : next === 'documents' ? t('paused.assistantRestDocuments')
    : t('paused.assistantRestCheckup');
  const nextBody = next === 'gadgets' ? t('paused.nextGadgetsBody')
    : next === 'documents' ? t('paused.nextDocumentsBody')
    : t('paused.nextCheckupBody');
  const continueLabel = next === 'gadgets' ? t('paused.continueGadgetsButton')
    : next === 'documents' ? t('paused.continueDocumentsButton')
    : t('paused.continueCheckupButton');
  const continueHref = `/${locale}${NEXT_STEP_HREF[next ?? 'checkup']}`;

  return (
    <div style={{ padding: '18px 18px 0 18px' }}>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--s3-ink-soft)' }}>{t(`greeting${cap(greetingKey)}`)},</p>
      <h1 style={{ margin: '4px 0 0 0', fontSize: 28, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>
        {displayName}
      </h1>

      <Plate grain style={{ marginTop: 18, borderRadius: 28, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13, flexShrink: 0, background: 'var(--s3-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14,
          }}>A</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('paused.assistantLabel')}</p>
        </div>
        <p style={{ margin: '14px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink)' }}>{assistantBody}</p>
      </Plate>

      <DarkPlate grain style={{ marginTop: 14, borderRadius: 28, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <p className="eyebrow" style={{ margin: 0, color: 'var(--s3-clay-lt)' }}>{t('paused.progressEyebrow')}</p>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,.72)' }}>{t('paused.progressOf4', { n: stagesDone })}</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          {[0, 1, 2, 3].map((i) => (
            i < stagesDone
              ? <span key={i} style={{ flexGrow: 1, height: 7, borderRadius: 4, background: 'linear-gradient(176deg, var(--s3-clay-lt), var(--s3-clay-dk))' }} />
              : <WellDark key={i} style={{ flexGrow: 1, height: 7, borderRadius: 4 }} />
          ))}
        </div>
        <p style={{ margin: '14px 0 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>{nextBody}</p>
        <Link href={continueHref} style={{ textDecoration: 'none' }}>
          <Button3D style={{ marginTop: 16, width: '100%', height: 50, fontSize: 15 }}>{continueLabel}</Button3D>
        </Link>
      </DarkPlate>

      <p className="eyebrow" style={{ margin: '22px 0 0 0', color: 'var(--s3-ink-soft)' }}>{t('paused.availableEyebrow')}</p>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Link href={`/${locale}/medical-card`} style={{ textDecoration: 'none', display: 'block' }}>
          <StatTile grain style={{ padding: 18, borderRadius: 22 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#A86A72" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="4" width="8" height="8" rx="2" /><rect x="13" y="4" width="8" height="8" rx="2" /><rect x="3" y="14" width="8" height="6" rx="2" />
            </svg>
            <p style={{ margin: '12px 0 0 0', fontSize: 14, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('paused.cardShortcutTitle')}</p>
            <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--s3-ink-soft)' }}>{t('paused.cardShortcutSubtitle')}</p>
          </StatTile>
        </Link>
        <Link href={`/${locale}/ai-chat`} style={{ textDecoration: 'none', display: 'block' }}>
          <StatTile grain style={{ padding: 18, borderRadius: 22 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#A86A72" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V7a2 2 0 0 1 2-2z" />
            </svg>
            <p style={{ margin: '12px 0 0 0', fontSize: 14, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('paused.askShortcutTitle')}</p>
            <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--s3-ink-soft)' }}>{t('paused.askShortcutSubtitle')}</p>
          </StatTile>
        </Link>
      </div>

      <Well style={{ marginTop: 14, borderRadius: 20, padding: '15px 16px', display: 'flex', gap: 11 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8494" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
        </svg>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('paused.noVitalsNotice')}</p>
      </Well>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
