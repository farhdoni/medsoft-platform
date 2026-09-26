import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DarkPlate, WellDark } from '@/components/soft3d/Surfaces';
import { StatTile } from '@/components/soft3d/StatTile';
import { Button3D } from '@/components/soft3d/Button3D';
import { AssistantInputRow } from './AssistantInputRow';
import {
  bloodPressureLabel, pulseLabel as pulseRangeLabel, sleepLabel as sleepRangeLabel,
  relativeTimeSince, type RangeLabel,
} from '../home-state-logic';

function rangeText(t: (k: string) => string, label: RangeLabel): string {
  return label === 'high' ? t('aboveNormLabel') : label === 'low' ? t('lowLabel') : t('normLabel');
}
function rangeColor(label: RangeLabel): string {
  return label === 'high' ? '#A86A72' : label === 'low' ? '#A86A72' : 'var(--s3-ink-soft)';
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/** HomeReply.dc.html — an unread reply from a doctor is the main block of the day. */
export async function HomeReplyView({
  locale,
  greetingKey,
  displayName,
  senderName,
  message,
  sentAt,
  conversationId,
  latestBP,
  latestPulseBpm,
  latestSleepHours,
}: {
  locale: string;
  greetingKey: string;
  displayName: string;
  senderName: string;
  message: string;
  sentAt: string;
  conversationId: string | undefined;
  latestBP: { systolic: number; diastolic: number } | null;
  latestPulseBpm: number | null;
  latestSleepHours: number | null;
}) {
  const t = await getTranslations('app.soft3d.home');
  const rel = relativeTimeSince(sentAt, new Date());
  const timeKey = rel.unit === 'minutes' ? 'reply.minutesAgo' : rel.unit === 'hours' ? 'reply.hoursAgo' : 'reply.daysAgo';

  return (
    <div style={{ padding: '16px 18px 0 18px' }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--s3-ink-soft)' }}>
        {t(`greeting${cap(greetingKey)}`)}, {displayName}
      </p>

      <p className="eyebrow" style={{ margin: '16px 0 0 0', color: 'var(--s3-ink-soft)' }}>{t('mainThingToday')}</p>

      <Link href={conversationId ? `/${locale}/messenger/${conversationId}` : `/${locale}/messenger`} style={{ textDecoration: 'none' }}>
        <DarkPlate grain style={{ marginTop: 10, borderRadius: 28, padding: 22, display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <WellDark style={{
              width: 38, height: 38, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', font: '800 14px/1 Nunito, sans-serif', color: '#fff',
            }}>
              {initials(senderName).toUpperCase()}
            </WellDark>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--s3-clay-lt)' }}>
                {t('reply.eyebrow')}
              </p>
              <p style={{ margin: '3px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,.66)' }}>
                {t(timeKey, { name: senderName, count: rel.value })}
              </p>
            </div>
            <span style={{ width: 11, height: 11, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(176deg, var(--s3-clay-lt), var(--s3-clay-dk))', boxShadow: '0 2px 0 -1px var(--s3-clay-wall)' }} />
          </div>
          <p style={{ margin: '16px 0 0 0', fontSize: 17, lineHeight: 1.45, fontWeight: 700, color: '#ffffff' }}>«{message}»</p>
          <Button3D style={{ marginTop: 18, width: '100%', height: 48, fontSize: 14 }}>{t('reply.openButton')}</Button3D>
        </DarkPlate>
      </Link>

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
