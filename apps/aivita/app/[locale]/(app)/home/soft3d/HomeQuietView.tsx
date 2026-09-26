import { getTranslations } from 'next-intl/server';
import { Plate, Well } from '@/components/soft3d/Surfaces';
import { StatTile } from '@/components/soft3d/StatTile';
import { AssistantInputRow } from './AssistantInputRow';
import { hasEnoughDataForTrend, weightTrend, type WeightPoint } from '../home-state-logic';

/** HomeQuiet.dc.html — no chronic conditions, no open state, screening recent enough: nothing to flag today. */
export async function HomeQuietView({
  locale,
  greetingKey,
  displayName,
  latestPulseBpm,
  latestSleepHours,
  weightPoints,
}: {
  locale: string;
  greetingKey: string;
  displayName: string;
  latestPulseBpm: number | null;
  latestSleepHours: number | null;
  weightPoints: WeightPoint[];
}) {
  const t = await getTranslations('app.soft3d.home');
  const enoughData = hasEnoughDataForTrend(weightPoints);
  const trend = weightTrend(weightPoints);
  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].kg : null;

  const sorted = [...weightPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sorted.map((p) => p.kg);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const range = max - min || 1;

  return (
    <div style={{ padding: '16px 18px 0 18px' }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--s3-ink-soft)' }}>
        {t(`greeting${cap(greetingKey)}`)}, {displayName}
      </p>

      <Plate grain style={{ marginTop: 16, borderRadius: 28, padding: '24px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13, flexShrink: 0, background: 'var(--s3-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14,
          }}>A</div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--s3-ink)' }}>{t('quiet.assistantLabel')}</p>
        </div>
        {enoughData ? (
          <>
            <p style={{ margin: '16px 0 0 0', fontSize: 19, lineHeight: 1.38, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.01em' }}>
              {t('quiet.title')}
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('quiet.body')}</p>
          </>
        ) : (
          <>
            <p style={{ margin: '16px 0 0 0', fontSize: 19, lineHeight: 1.38, fontWeight: 800, color: 'var(--s3-ink)', letterSpacing: '-0.01em' }}>
              {t('quiet.notEnoughDataTitle')}
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: 15, lineHeight: 1.55, color: 'var(--s3-ink-soft)' }}>{t('quiet.notEnoughDataBody')}</p>
          </>
        )}
      </Plate>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9 }}>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('pulseLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--s3-ink)' }}>{latestPulseBpm ?? '—'}</p>
        </StatTile>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('sleepLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--s3-ink)' }}>
            {latestSleepHours !== null ? latestSleepHours.toFixed(1).replace('.', ',') : '—'}
          </p>
        </StatTile>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('weightLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 18, fontWeight: 800, color: 'var(--s3-ink)' }}>{latestWeight ?? '—'}</p>
          {trend.kind === 'steady' && <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#6B8F6B' }}>{t('steadyLabel')}</p>}
        </StatTile>
      </div>

      <Well style={{ marginTop: 16, borderRadius: 22, padding: '18px 20px' }}>
        <p className="eyebrow" style={{ margin: 0, color: 'var(--s3-ink-soft)' }}>{t('quiet.trendEyebrow')}</p>
        {enoughData ? (
          <>
            <div style={{ marginTop: 14, height: 62, display: 'flex', alignItems: 'flex-end', gap: 5 }}>
              {sorted.map((p, i) => {
                const heightPct = 30 + ((p.kg - min) / range) * 70;
                const isLast = i === sorted.length - 1;
                return (
                  <span
                    key={p.date + i}
                    style={{
                      flexGrow: 1, height: `${heightPct}%`, borderRadius: 4,
                      background: isLast ? 'linear-gradient(176deg, var(--s3-clay-lt), var(--s3-clay-dk))' : '#CFC7B8',
                    }}
                  />
                );
              })}
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>
              {trend.kind === 'change'
                ? (trend.deltaKg > 0 ? t('quiet.trendRisingCaption') : t('quiet.trendFallingCaption'))
                : t('quiet.trendCaption')}
            </p>
          </>
        ) : (
          <p style={{ margin: '14px 0 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--s3-ink-soft)' }}>{t('quiet.notEnoughDataBody')}</p>
        )}
      </Well>

      <AssistantInputRow
        locale={locale}
        placeholder={t('askPlaceholder')}
        ariaLabel={t('askAriaLabel')}
        openChatAriaLabel={t('openChatAriaLabel')}
      />
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
