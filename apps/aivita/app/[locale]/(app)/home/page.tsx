import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth/session';
import { api } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { HealthRing } from '@/components/cabinet/HealthRing';
import { ActivityBars } from '@/components/cabinet/ActivityBars';

async function getHomeData(sessionCookie: string) {
  const [scoreRes, notifRes] = await Promise.allSettled([
    api.healthScore.latest(sessionCookie),
    api.notifications.list(sessionCookie),
  ]);

  const score =
    scoreRes.status === 'fulfilled' && 'data' in scoreRes.value
      ? (scoreRes.value.data as { totalScore?: number } | null)
      : null;

  const notifData =
    notifRes.status === 'fulfilled' && 'data' in notifRes.value
      ? (notifRes.value as { data: unknown[]; unreadCount: number })
      : { data: [], unreadCount: 0 };

  return {
    healthScore: score?.totalScore ?? null,
    hasNotifications: notifData.unreadCount > 0,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';
  const session = await getSession();

  const { healthScore } = await getHomeData(sessionCookie);
  const displayScore = healthScore ?? 76;

  const userName = session?.name ?? 'Пользователь';
  const firstName = userName.split(' ')[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? 'Доброй ночи' :
    hour < 12 ? 'Доброе утро' :
    hour < 18 ? 'Добрый день' :
    'Добрый вечер';

  const healthLabel = displayScore >= 80 ? 'отлично' : displayScore >= 65 ? 'хорошо' : 'требует внимания';

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-4">

      {/* ─── HERO HEALTH INDEX CARD ─── */}
      <div
        className="rounded-3xl p-5 md:p-8"
        style={{ background: 'linear-gradient(135deg, #f0d4dc 0%, #e0d8f0 50%, #d4e8d8 100%)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

          {/* LEFT — greeting + 2 glass cards */}
          <div className="space-y-3">
            <div>
              <p className="text-[13px]" style={{ color: '#6a6580' }}>{greeting},</p>
              <h1 className="text-[26px] md:text-[28px] font-bold" style={{ color: '#2a2540' }}>
                {firstName} 👋
              </h1>
            </div>

            {/* Glass card Heart */}
            <div
              className="flex items-center gap-3 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
            >
              <Icon3D name="heart" size={28} />
              <div>
                <p className="text-[15px] font-bold leading-none" style={{ color: '#2a2540' }}>
                  72 <span className="text-[11px] font-normal" style={{ color: '#9a96a8' }}>bpm</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6a6580' }}>Пульс · сегодня</p>
              </div>
            </div>

            {/* Glass card Water */}
            <div
              className="flex items-center gap-3 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
            >
              <Icon3D name="drop" size={28} />
              <div>
                <p className="text-[15px] font-bold leading-none" style={{ color: '#2a2540' }}>
                  1.4 л
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6a6580' }}>Вода · сегодня</p>
              </div>
            </div>
          </div>

          {/* CENTER — HealthRing 220px */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13px]" style={{ color: '#6a6580' }}>Индекс здоровья</p>
            <HealthRing value={displayScore} size={220} stroke={14} />
            <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
              ↑ {healthLabel}
            </p>
          </div>

          {/* RIGHT — Steps + CTA */}
          <div className="space-y-3">
            {/* Glass card Steps */}
            <div
              className="flex items-center gap-3 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
            >
              <Icon3D name="steps" size={28} />
              <div>
                <p className="text-[15px] font-bold leading-none" style={{ color: '#2a2540' }}>8.2K</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6a6580' }}>шагов · сегодня</p>
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/${locale}/report`}
              className="block rounded-full px-5 py-3 text-center text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.9)', color: '#9c5e6c' }}
            >
              Запросить отчёт →
            </Link>

            {!healthScore && (
              <Link
                href={`/${locale}/test`}
                className="block rounded-full px-5 py-3 text-center text-[13px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(156, 94, 108, 0.15)', color: '#9c5e6c' }}
              >
                Пройти тест 5 систем →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── QUICK STATS GRID — 4 metric cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon="heart"
          value="72"
          label="Пульс, bpm"
          bg="#f0d4dc"
          trend="↑ 3"
          trendColor="#9c5e6c"
        />
        <MetricCard
          icon="drop"
          value="1.4 л"
          label="Вода (70% цели)"
          bg="#e0d8f0"
          trend="70%"
          trendColor="#6e5fa0"
        />
        <MetricCard
          icon="steps"
          value="8.2K"
          label="Шагов сегодня"
          bg="#d4e8d8"
          trend="↑ 12%"
          trendColor="#548068"
        />
        <MetricCard
          icon="book"
          value="2/3"
          label="Привычки"
          bg="#d4dff0"
          trend="67%"
          trendColor="#5e75a8"
        />
      </div>

      {/* ─── TWO COLUMN: Activity + Report ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

        {/* Activity bars card */}
        <div
          className="rounded-2xl p-5 border"
          style={{ background: '#ffffff', borderColor: '#e8e4dc' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[15px] font-bold" style={{ color: '#2a2540' }}>
                Активность за 7 дней
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#9a96a8' }}>
                Шаги, км, активные минуты
              </p>
            </div>
            <div className="flex gap-1">
              {['Шаги', 'Км', 'Сон'].map((tab, i) => (
                <button
                  key={tab}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
                  style={
                    i === 0
                      ? { background: '#f0d4dc', color: '#9c5e6c' }
                      : { color: '#9a96a8' }
                  }
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ActivityBars data={[40, 55, 30, 65, 45, 50, 85]} />
        </div>

        {/* Report card */}
        <div
          className="rounded-2xl p-5 border flex flex-col gap-3"
          style={{
            background: 'linear-gradient(135deg, #e0d8f0 0%, #d4e8d8 100%)',
            borderColor: '#e8e4dc',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.6)' }}
          >
            <Icon3D name="report" size={32} />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold mb-1" style={{ color: '#2a2540' }}>
              Отчёт врачу готов
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6a6580' }}>
              Сводка за 30 дней — биомаркеры, сон, активность.
            </p>
          </div>
          <Link
            href={`/${locale}/report`}
            className="self-start px-4 py-2 rounded-full text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#9c5e6c' }}
          >
            Скачать PDF →
          </Link>
        </div>
      </div>

    </div>
  );
}

// ─── MetricCard ───
interface MetricCardProps {
  icon: React.ComponentProps<typeof Icon3D>['name'];
  value: string;
  label: string;
  bg: string;
  trend: string;
  trendColor: string;
}

function MetricCard({ icon, value, label, bg, trend, trendColor }: MetricCardProps) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden flex flex-col justify-end"
      style={{ background: bg, minHeight: 110 }}
    >
      {/* Icon top-right, partially clipped */}
      <div className="absolute -top-1 -right-1 pointer-events-none">
        <Icon3D name={icon} size={56} />
      </div>

      {/* Trend top-left */}
      <p className="absolute top-3.5 left-4 text-[10px] font-semibold" style={{ color: trendColor }}>
        {trend}
      </p>

      {/* Value + label bottom */}
      <div>
        <p className="text-[28px] md:text-[32px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
          {value}
        </p>
        <p className="text-[11px] mt-1" style={{ color: '#6a6580' }}>{label}</p>
      </div>
    </div>
  );
}
