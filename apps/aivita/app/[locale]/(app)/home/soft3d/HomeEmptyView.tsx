import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DarkPlate, Well } from '@/components/soft3d/Surfaces';
import { Button3D } from '@/components/soft3d/Button3D';

const PLACEHOLDER_ICONS = [
  <path key="score" d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  <path key="vitals" d="M3 12h4l2-5 3 10 2-6 2 3h5" />,
  <path key="history" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5" />,
];

/** HomeEmpty.dc.html — no medical card at all yet. */
export async function HomeEmptyView({ locale }: { locale: string }) {
  const t = await getTranslations('app.soft3d.home');
  const placeholders = [t('empty.scorePlaceholder'), t('empty.vitalsPlaceholder'), t('empty.historyPlaceholder')];

  return (
    <div style={{ padding: '18px 18px 0 18px' }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.02em' }}>
        {t('empty.title')}
      </h1>
      <p style={{ margin: '8px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>
        {t('empty.body')}
      </p>

      <DarkPlate grain style={{ marginTop: 20, borderRadius: 30, padding: '26px 22px' }}>
        <p style={{ margin: '0', fontSize: 19, lineHeight: 1.4, fontWeight: 800, color: '#ffffff' }}>
          {t('empty.panelTitle')}
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>
          {t('empty.panelBody')}
        </p>
        <Link href={`/${locale}/onboarding`} style={{ textDecoration: 'none' }}>
          <Button3D style={{ marginTop: 20, width: '100%', height: 52, fontSize: 15 }}>
            {t('empty.fillButton')}
          </Button3D>
        </Link>
      </DarkPlate>

      <p className="eyebrow" style={{ margin: '24px 0 0 0', color: 'var(--s3-ink-soft)' }}>
        {t('empty.emptyEyebrow')}
      </p>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {placeholders.map((text, i) => (
          <Well key={i} style={{ borderRadius: 22, padding: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{
              width: 40, height: 40, borderRadius: 14, flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: '#E8E2D8',
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9A94A2" strokeWidth="1.8" aria-hidden="true">
                {PLACEHOLDER_ICONS[i]}
              </svg>
            </span>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: '#9A94A2' }}>{text}</p>
          </Well>
        ))}
      </div>
    </div>
  );
}
