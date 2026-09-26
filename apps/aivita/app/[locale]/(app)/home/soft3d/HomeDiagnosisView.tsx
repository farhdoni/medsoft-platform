import { getTranslations } from 'next-intl/server';
import { DarkPlate, WellDark } from '@/components/soft3d/Surfaces';
import { StatTile } from '@/components/soft3d/StatTile';
import { Button3D } from '@/components/soft3d/Button3D';
import { AssistantInputRow } from './AssistantInputRow';
import { bloodPressureLabel, pulseLabel as pulseRangeLabel, sleepLabel as sleepRangeLabel, type RangeLabel } from '../home-state-logic';

function rangeText(t: (k: string) => string, label: RangeLabel): string {
  return label === 'high' ? t('aboveNormLabel') : label === 'low' ? t('lowLabel') : t('normLabel');
}
function rangeColor(label: RangeLabel): string {
  return label === 'high' ? '#A86A72' : label === 'low' ? '#A86A72' : 'var(--s3-ink-soft)';
}

/** HomeDiagnosis.dc.html — a chronic condition on file, and today's weather has a sharp pressure swing. */
export async function HomeDiagnosisView({
  locale,
  greetingKey,
  displayName,
  conditionName,
  latestBP,
  latestPulseBpm,
  latestSleepHours,
}: {
  locale: string;
  greetingKey: string;
  displayName: string;
  conditionName: string;
  latestBP: { systolic: number; diastolic: number } | null;
  latestPulseBpm: number | null;
  latestSleepHours: number | null;
}) {
  const t = await getTranslations('app.soft3d.home');

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
              <path d="M7 17a4.5 4.5 0 0 1 .6-8.96 6 6 0 0 1 11.2-1.1A4 4 0 0 1 18 17z" /><path d="M9 21l1-3M15 21l1-3" />
            </svg>
          </WellDark>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>
            {t('diagnosis.eyebrow')}
          </p>
        </div>
        <p style={{ margin: '14px 0 0 0', fontSize: 18, lineHeight: 1.4, fontWeight: 800, color: '#ffffff' }}>
          {t('diagnosis.title', { condition: conditionName })}
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,.72)' }}>{t('diagnosis.body')}</p>
        <WellDark style={{ marginTop: 16, borderRadius: 16, padding: '13px 15px', display: 'flex', gap: 10 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
          </svg>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,.66)' }}>{t('diagnosis.disclaimer')}</p>
        </WellDark>
        <Button3D style={{ marginTop: 16, width: '100%', height: 48, fontSize: 14 }}>{t('diagnosis.logButton')}</Button3D>
      </DarkPlate>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 9 }}>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('pressureLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 17, fontWeight: 800, color: 'var(--s3-ink)' }}>
            {latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '—'}
          </p>
          {latestBP && (
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: rangeColor(bloodPressureLabel(latestBP.systolic, latestBP.diastolic)) }}>
              {rangeText(t, bloodPressureLabel(latestBP.systolic, latestBP.diastolic))}
            </p>
          )}
        </StatTile>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('pulseLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 17, fontWeight: 800, color: 'var(--s3-ink)' }}>{latestPulseBpm ?? '—'}</p>
          {latestPulseBpm !== null && (
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: rangeColor(pulseRangeLabel(latestPulseBpm)) }}>
              {rangeText(t, pulseRangeLabel(latestPulseBpm))}
            </p>
          )}
        </StatTile>
        <StatTile grain style={{ padding: 13, borderRadius: 18 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--s3-ink-soft)' }}>{t('sleepLabel')}</p>
          <p style={{ margin: '3px 0 0 0', fontSize: 17, fontWeight: 800, color: 'var(--s3-ink)' }}>
            {latestSleepHours !== null ? latestSleepHours.toFixed(1).replace('.', ',') : '—'}
          </p>
          {latestSleepHours !== null && (
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: rangeColor(sleepRangeLabel(latestSleepHours)) }}>
              {rangeText(t, sleepRangeLabel(latestSleepHours))}
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
