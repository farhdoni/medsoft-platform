import { getTranslations } from 'next-intl/server';
import { DarkPlate, WellDark } from '@/components/soft3d/Surfaces';
import { StatTile } from '@/components/soft3d/StatTile';
import { Button3D, ChipDark } from '@/components/soft3d/Button3D';
import { AssistantInputRow } from './AssistantInputRow';
import { weightTrend, type WeightPoint } from '../home-state-logic';

/** HomeHealthy.dc.html — no chronic conditions, no open state; a preventive-screening nudge (or a soft prompt when there's no lab date on file at all). */
export async function HomeHealthyView({
  locale,
  greetingKey,
  displayName,
  lastLabResultDate,
  monthsSinceLab,
  latestPulseBpm,
  latestSleepHours,
  weightPoints,
}: {
  locale: string;
  greetingKey: string;
  displayName: string;
  lastLabResultDate: string | null;
  monthsSinceLab: number | null;
  latestPulseBpm: number | null;
  latestSleepHours: number | null;
  weightPoints: WeightPoint[];
}) {
  const t = await getTranslations('app.soft3d.home');
  const trend = weightTrend(weightPoints);
  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].kg : null;

  return (
    <div style={{ padding: '16px 18px 0 18px' }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--s3-ink-soft)' }}>
        {t(`greeting${cap(greetingKey)}`)}, {displayName}
      </p>

      <p className="eyebrow" style={{ margin: '16px 0 0 0', color: 'var(--s3-ink-soft)' }}>{t('mainThingToday')}</p>

      <DarkPlate grain style={{ marginTop: 10, borderRadius: 28, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <WellDark style={{ width: 38, height: 38, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#D69AA0" strokeWidth="1.9" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          </WellDark>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
            {t('healthy.dueEyebrow')}
          </p>
        </div>
        {lastLabResultDate && monthsSinceLab !== null ? (
          <>
            <p style={{ margin: '14px 0 0 0', fontSize: 18, lineHeight: 1.4, fontWeight: 800, color: '#ffffff' }}>
              {t('healthy.dueTitle', { months: Math.round(monthsSinceLab) })}
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>{t('healthy.dueBody')}</p>
            <div style={{ marginTop: 18, display: 'flex', gap: 9 }}>
              <Button3D style={{ flexGrow: 1, height: 48, fontSize: 14 }}>{t('healthy.findLabButton')}</Button3D>
              <ChipDark style={{ height: 48, padding: '0 18px', fontSize: 14 }}>{t('healthy.laterButton')}</ChipDark>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: '14px 0 0 0', fontSize: 18, lineHeight: 1.4, fontWeight: 800, color: '#ffffff' }}>{t('healthy.noDataTitle')}</p>
            <p style={{ margin: '10px 0 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>{t('healthy.noDataBody')}</p>
            <Button3D style={{ marginTop: 18, width: '100%', height: 48, fontSize: 14 }}>{t('healthy.addResultButton')}</Button3D>
          </>
        )}
      </DarkPlate>

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
          {trend.kind === 'change' && (
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#A86A72' }}>
              {trend.deltaKg > 0
                ? t('healthy.weightRisingSubtitle', { delta: trend.deltaKg.toFixed(1) })
                : t('healthy.weightFallingSubtitle', { delta: trend.deltaKg.toFixed(1) })}
            </p>
          )}
        </StatTile>
      </div>

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
