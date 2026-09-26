import type { ReactNode } from 'react';
import { Section } from './ShowcaseClient';
import { HomeEmptyView } from '../../home/soft3d/HomeEmptyView';
import { HomePausedView } from '../../home/soft3d/HomePausedView';
import { HomeHealthyView } from '../../home/soft3d/HomeHealthyView';
import { HomeDiagnosisView } from '../../home/soft3d/HomeDiagnosisView';
import { HomeQuietView } from '../../home/soft3d/HomeQuietView';
import { HomeReplyView } from '../../home/soft3d/HomeReplyView';

/**
 * Part C, on the user's own request: all 6 Home states on hardcoded test
 * data, right here in the showcase — nothing here reads or writes the
 * database. This is the live-verification surface for this part instead of
 * a local Docker stack; the person checks these against the mockup files
 * themselves with a real flagged account, in prod.
 *
 * Frame(): a fixed 390px shell matching the mockups' own preview width, so
 * a screenshot lines up directly against docs/design/patient-cabinet/*.png.
 * WeatherCard is deliberately not repeated here — it's a real, live,
 * already-tested component (see weather-pressure-logic.test.ts /
 * weather-alerts.test.ts); this section is about the state-specific content
 * below it.
 */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 390, maxWidth: '100%', border: '1px solid var(--s3-wall)', borderRadius: 12, overflow: 'hidden', background: 'var(--s3-board)' }}>
      {children}
    </div>
  );
}

const NOW = new Date();
const twelveMinutesAgo = new Date(NOW.getTime() - 12 * 60 * 1000).toISOString();

export async function HomeShowcaseSection({ locale }: { locale: string }) {
  return (
    <>
      <Section title="Home — пустой" mockup="HomeEmpty.dc.html">
        <Frame>
          <HomeEmptyView locale={locale} />
        </Frame>
      </Section>

      <Section title="Home — на паузе (следующий шаг: чекап)" mockup="HomePaused.dc.html">
        <Frame>
          <HomePausedView
            locale={locale}
            greetingKey="evening"
            displayName="Фарход"
            stages={{ questionnaire: true, checkup: false, gadgets: false, documents: false }}
            stagesDone={1}
          />
        </Frame>
      </Section>

      <Section title="Home — здоровый (пора на анализы)" mockup="HomeHealthy.dc.html">
        <Frame>
          <HomeHealthyView
            locale={locale}
            greetingKey="morning"
            displayName="Фарход"
            lastLabResultDate="2025-07-20"
            monthsSinceLab={14}
            latestPulseBpm={68}
            latestSleepHours={7.4}
            weightPoints={[
              { date: '2026-06-28', kg: 82 },
              { date: '2026-07-25', kg: 83 },
              { date: '2026-08-22', kg: 85 },
              { date: '2026-09-20', kg: 86 },
            ]}
          />
        </Frame>
        <p style={{ fontSize: 12, color: 'var(--s3-ink-soft)', margin: '4px 0 0 0' }}>
          Вариант «нет данных об анализах» (мягкое приглашение вместо конкретного срока) — тот же компонент, lastLabResultDate=null:
        </p>
        <Frame>
          <HomeHealthyView
            locale={locale}
            greetingKey="morning"
            displayName="Фарход"
            lastLabResultDate={null}
            monthsSinceLab={null}
            latestPulseBpm={68}
            latestSleepHours={7.4}
            weightPoints={[]}
          />
        </Frame>
      </Section>

      <Section title="Home — с диагнозом (резкая смена давления)" mockup="HomeDiagnosis.dc.html">
        <Frame>
          <HomeDiagnosisView
            locale={locale}
            greetingKey="morning"
            displayName="Фарход"
            conditionName="гипертония"
            latestBP={{ systolic: 142, diastolic: 91 }}
            latestPulseBpm={78}
            latestSleepHours={6.1}
          />
        </Frame>
      </Section>

      <Section title="Home — тихий день" mockup="HomeQuiet.dc.html">
        <Frame>
          <HomeQuietView
            locale={locale}
            greetingKey="morning"
            displayName="Фарход"
            latestPulseBpm={66}
            latestSleepHours={7.6}
            weightPoints={[
              { date: '2026-06-28', kg: 82 },
              { date: '2026-07-25', kg: 82.5 },
              { date: '2026-08-22', kg: 81.5 },
              { date: '2026-09-20', kg: 82 },
            ]}
          />
        </Frame>
        <p style={{ fontSize: 12, color: 'var(--s3-ink-soft)', margin: '4px 0 0 0' }}>
          Вариант «данных пока мало для вывода о тренде» (решение №5, крайний случай) — тот же компонент, слишком мало точек:
        </p>
        <Frame>
          <HomeQuietView
            locale={locale}
            greetingKey="morning"
            displayName="Фарход"
            latestPulseBpm={66}
            latestSleepHours={7.6}
            weightPoints={[{ date: '2026-09-18', kg: 82 }, { date: '2026-09-24', kg: 82.2 }]}
          />
        </Frame>
      </Section>

      <Section title="Home — врач ответил" mockup="HomeReply.dc.html">
        <Frame>
          <HomeReplyView
            locale={locale}
            greetingKey="day"
            displayName="Фарход"
            senderName="Азиза Каримова"
            message="Цифры нормальные для вашего возраста. Давайте понаблюдаем неделю и решим, нужно ли к кардиологу"
            sentAt={twelveMinutesAgo}
            conversationId={undefined}
            latestBP={{ systolic: 128, diastolic: 82 }}
            latestPulseBpm={74}
            latestSleepHours={6.8}
          />
        </Frame>
      </Section>
    </>
  );
}
