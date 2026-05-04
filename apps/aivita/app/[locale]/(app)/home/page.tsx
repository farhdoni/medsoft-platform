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
  const displayScore = healthScore ?? 72;

  const userName = session?.name ?? 'Пользователь';
  const firstName = userName.split(' ')[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div className="p-6 min-h-screen" style={{ background: '#f4f3ef' }}>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm" style={{ color: '#6a6580' }}>{greeting},</p>
          <h1 className="text-2xl font-bold" style={{ color: '#2a2540' }}>{firstName} 👋</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm"
            style={{ background: '#ffffff', borderColor: '#e8e4dc', color: '#9a96a8' }}
          >
            <Icon3D name="search" size={14} />
            <span>Поиск…</span>
          </div>
          <Link
            href={`/${locale}/notifications`}
            className="p-2.5 rounded-xl border transition-colors hover:bg-[#f0d4dc]/30"
            style={{ background: '#ffffff', borderColor: '#e8e4dc' }}
          >
            <Icon3D name="bell" size={18} />
          </Link>
        </div>
      </div>

      {/* Top row: 3 metrics + Health Index */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Metric cards */}
        <div className="rounded-2xl p-4" style={{ background: '#f0d4dc' }}>
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Icon3D name="heart" size={18} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#2a2540', lineHeight: 1.1 }}>72</p>
          <p className="text-xs mt-0.5" style={{ color: '#6a6580' }}>Пульс, bpm</p>
          <p className="text-[11px] font-semibold mt-1.5" style={{ color: '#9c5e6c' }}>↑ 3</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#e0d8f0' }}>
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Icon3D name="drop" size={18} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#2a2540', lineHeight: 1.1 }}>1.4 л</p>
          <p className="text-xs mt-0.5" style={{ color: '#6a6580' }}>Вода сегодня</p>
          <p className="text-[11px] font-semibold mt-1.5" style={{ color: '#9889c4' }}>70%</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#d4e8d8' }}>
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <Icon3D name="steps" size={18} />
          </div>
          <p className="text-2xl font-bold" style={{ color: '#2a2540', lineHeight: 1.1 }}>8.2K</p>
          <p className="text-xs mt-0.5" style={{ color: '#6a6580' }}>Шагов</p>
          <p className="text-[11px] font-semibold mt-1.5" style={{ color: '#80b094' }}>↑ 12%</p>
        </div>

        {/* Health Index card */}
        <div className="rounded-2xl p-4 flex gap-3 items-center" style={{ background: 'linear-gradient(135deg, #f0d4dc 0%, #e0d8f0 50%, #d4e8d8 100%)' }}>
          <div className="flex-shrink-0">
            <HealthRing value={displayScore} size={80} stroke={7} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: '#6a6580' }}>Индекс здоровья</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: '#2a2540' }}>
              {displayScore >= 70 ? 'Хорошо' : 'Требует внимания'}
            </p>
            <Link
              href={`/${locale}/test`}
              className="inline-block mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors hover:bg-[#f0d4dc]/60"
              style={{ background: 'rgba(255,255,255,0.7)', color: '#9c5e6c' }}
            >
              Пройти тест →
            </Link>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left col */}
        <div className="flex flex-col gap-4">

          {/* AI Chat card */}
          <div className="rounded-2xl p-5 border" style={{ background: '#ffffff', borderColor: '#e8e4dc' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #cc8a96 0%, #9889c4 100%)' }}>
                  <Icon3D name="chat" size={18} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>AI-помощник</span>
              </div>
              <span className="text-[11px]" style={{ color: '#9a96a8' }}>сегодня</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#2a2540' }}>
              Привет, <em className="not-italic font-semibold" style={{ color: '#9c5e6c' }}>{firstName}!</em>{' '}
              Задай любой вопрос о здоровье — я на связи.
            </p>
            <Link
              href={`/${locale}/chat`}
              className="inline-block px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #cc8a96 0%, #9c5e6c 100%)', boxShadow: '0 6px 16px rgba(156, 94, 108, 0.25)' }}
            >
              Открыть чат →
            </Link>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-5 border" style={{ background: '#ffffff', borderColor: '#e8e4dc' }}>
            <p className="text-[13px] font-semibold mb-3" style={{ color: '#2a2540' }}>Быстрые действия</p>
            <div className="flex flex-col gap-2">
              {([
                { icon: 'book' as const, label: 'Привычки', sub: '3 на сегодня', href: '/habits', grad: 'linear-gradient(135deg, #9889c4 0%, #8aa1cc 100%)' },
                { icon: 'test' as const, label: 'Тест 5 систем', sub: '~7 минут', href: '/test', grad: 'linear-gradient(135deg, #cc8a96 0%, #9c5e6c 100%)' },
                { icon: 'report' as const, label: 'Отчёт врачу', sub: 'PDF готов', href: '/report', grad: 'linear-gradient(135deg, #9889c4 0%, #8aa1cc 100%)' },
                { icon: 'chat' as const, label: 'AI-чат', sub: '24/7 доступ', href: '/chat', grad: 'linear-gradient(135deg, #80b094 0%, #8aa1cc 100%)' },
              ]).map((a) => (
                <Link
                  key={a.href}
                  href={`/${locale}${a.href}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#f0d4dc]/30"
                  style={{ background: '#f4f3ef' }}
                >
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: a.grad }}>
                    <Icon3D name={a.icon} size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{a.label}</p>
                    <p className="text-[11px]" style={{ color: '#9a96a8' }}>{a.sub}</p>
                  </div>
                  <span style={{ color: '#9a96a8', fontSize: 18 }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-4">

          {/* Activity */}
          <div className="rounded-2xl p-5 border" style={{ background: '#ffffff', borderColor: '#e8e4dc' }}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Активность за 7 дней</p>
              <span className="text-[11px] font-semibold" style={{ color: '#80b094' }}>↑ +12%</span>
            </div>
            <ActivityBars data={[40, 55, 30, 65, 45, 50, 85]} />
          </div>

          {/* Habits today */}
          <div className="rounded-2xl p-5 border" style={{ background: '#ffffff', borderColor: '#e8e4dc' }}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>Привычки сегодня</p>
              <span className="text-[11px]" style={{ color: '#9a96a8' }}>2 из 3</span>
            </div>
            <div className="flex flex-col gap-2">
              {([
                { label: 'Выпить 2 л воды', done: true, bg: '#e0d8f0', check: '#9889c4' },
                { label: 'Пройти 8 000 шагов', done: true, bg: '#d4e8d8', check: '#80b094' },
                { label: 'Лечь до 23:00', done: false, bg: '#f0d4dc', check: '#9c5e6c' },
              ] as const).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                  style={{ background: h.bg }}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={h.done ? { background: h.check } : { border: `1.5px solid ${h.check}`, background: 'transparent' }}
                  >
                    {h.done ? '✓' : ''}
                  </div>
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: '#2a2540', textDecoration: h.done ? 'line-through' : 'none', opacity: h.done ? 0.6 : 1 }}
                  >
                    {h.label}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href={`/${locale}/habits`}
              className="inline-block mt-3 text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: '#9c5e6c' }}
            >
              Все привычки →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
