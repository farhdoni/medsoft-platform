import { WeatherCard } from '@/components/cabinet/dashboard/WeatherCard';
import { selectHomeState, greetingKeyForHour, monthsSince } from '../home-state-logic';
import type { HomeSoft3dData } from '../soft3d-data';
import { HomeEmptyView } from './HomeEmptyView';
import { HomePausedView } from './HomePausedView';
import { HomeHealthyView } from './HomeHealthyView';
import { HomeDiagnosisView } from './HomeDiagnosisView';
import { HomeQuietView } from './HomeQuietView';
import { HomeReplyView } from './HomeReplyView';

/**
 * Part C: dispatches to one of the 6 Home states (docs/design/patient-cabinet
 * README's priority order: доктор ответил > на паузе > пустой > с диагнозом >
 * здоровый > тихий день), computed by the pure selectHomeState() so the rule
 * itself is unit-tested independent of this rendering.
 */
export function HomeSoft3d({ locale, data }: { locale: string; data: HomeSoft3dData }) {
  const now = new Date();
  const greetingKey = greetingKeyForHour(data.localHour);
  const displayName = data.displayName;
  const hs = data.homeState;

  const state = selectHomeState({
    doctorReplyUnread: hs?.doctorReply.hasUnread ?? false,
    hasCard: hs?.progress.hasCard ?? false,
    stagesDone: hs?.progress.stagesDone ?? 0,
    hasChronicConditions: hs?.hasChronicConditions ?? false,
    lastLabResultDate: hs?.lastLabResultDate ?? null,
    now,
  });

  return (
    <div>
      <WeatherCard />
      {state === 'empty' && <HomeEmptyView locale={locale} />}
      {state === 'paused' && hs && (
        <HomePausedView
          locale={locale}
          greetingKey={greetingKey}
          displayName={displayName}
          stages={hs.progress.stages}
          stagesDone={hs.progress.stagesDone}
        />
      )}
      {state === 'healthy' && (
        <HomeHealthyView
          locale={locale}
          greetingKey={greetingKey}
          displayName={displayName}
          lastLabResultDate={hs?.lastLabResultDate ?? null}
          monthsSinceLab={hs?.lastLabResultDate ? monthsSince(hs.lastLabResultDate, now) : null}
          latestPulseBpm={data.latestPulseBpm}
          latestSleepHours={data.latestSleepHours}
          weightPoints={data.weightPoints}
        />
      )}
      {state === 'diagnosis' && (
        <HomeDiagnosisView
          locale={locale}
          greetingKey={greetingKey}
          displayName={displayName}
          conditionName={hs?.firstChronicConditionName ?? ''}
          latestBP={data.latestBP}
          latestPulseBpm={data.latestPulseBpm}
          latestSleepHours={data.latestSleepHours}
        />
      )}
      {state === 'quiet' && (
        <HomeQuietView
          locale={locale}
          greetingKey={greetingKey}
          displayName={displayName}
          latestPulseBpm={data.latestPulseBpm}
          latestSleepHours={data.latestSleepHours}
          weightPoints={data.weightPoints}
        />
      )}
      {state === 'reply' && hs?.doctorReply.hasUnread && (
        <HomeReplyView
          locale={locale}
          greetingKey={greetingKey}
          displayName={displayName}
          senderName={hs.doctorReply.senderName ?? ''}
          message={hs.doctorReply.message ?? ''}
          sentAt={hs.doctorReply.sentAt ?? now.toISOString()}
          conversationId={hs.doctorReply.conversationId}
          latestBP={data.latestBP}
          latestPulseBpm={data.latestPulseBpm}
          latestSleepHours={data.latestSleepHours}
        />
      )}
    </div>
  );
}
