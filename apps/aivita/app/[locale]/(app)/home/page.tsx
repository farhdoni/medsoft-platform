import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  Shield, FileText, MessageCircle, ClipboardList,
  Heart, Droplets, Footprints, TrendingUp,
} from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';
import { HealthScoreCircle } from '@/components/shared/health-score-circle';
import { api } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

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

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aivita_session')?.value ?? '';
  const session = await getSession();

  const { healthScore, hasNotifications } = await getHomeData(sessionCookie);

  const displayScore = healthScore ?? 72;
  const userName = session?.name ?? 'Пользователь';
  const firstName = userName.split(' ')[0];

  return (
    <div className="min-h-screen">
      <AppHeader name={firstName} hasNotifications={hasNotifications} />

      <div className="px-5 space-y-4 pb-6">

        {/* Health Score card */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-pink-200/20 blur-2xl pointer-events-none" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-3">
            ИНДЕКС ЗДОРОВЬЯ
          </p>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-light text-navy tabular-nums">{displayScore}</span>
                <span className="text-lg text-[rgb(var(--text-muted))]">/ 100</span>
              </div>
              <p className="text-xs text-[rgb(var(--text-secondary))] mb-2">
                {healthScore
                  ? 'Актуальные данные из профиля'
                  : 'Пройди тест чтобы узнать свой счёт'}
              </p>
              {healthScore && (
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-100">
                  <TrendingUp className="w-3 h-3" />
                  Обновлён сегодня
                </span>
              )}
              {!healthScore && (
                <Link
                  href="/test"
                  className="inline-flex items-center gap-1 text-xs bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full font-medium border border-pink-100 hover:bg-pink-100 transition-colors"
                >
                  Пройти тест →
                </Link>
              )}
            </div>
            <HealthScoreCircle score={displayScore} size={96} animate={false} strokeWidth={5} />
          </div>
        </div>

        {/* AI card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-1">
                AI · СЕГОДНЯ
              </p>
              <p className="text-sm text-navy leading-relaxed">
                Привет, <em className="font-serif italic text-pink-500 not-italic">{firstName}!</em>{' '}
                Задай любой вопрос о здоровье — я на связи.
              </p>
              <Link href="/chat" className="inline-flex items-center gap-1 mt-2 text-xs text-pink-500 font-medium hover:text-pink-600 transition-colors">
                Открыть AI-чат →
              </Link>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[rgba(120,160,200,0.15)] p-3 shadow-soft">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
              <Heart className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-navy tabular-nums">72</p>
            <p className="text-[10px] text-[rgb(var(--text-muted))]">bpm</p>
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-[72%] bg-blue-400 rounded-full" />
            </div>
          </div>
          <div className="bg-pink-50/80 backdrop-blur-xl rounded-2xl border border-pink-100 p-3 shadow-soft">
            <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center mb-2">
              <Droplets className="w-4 h-4 text-pink-500" />
            </div>
            <p className="text-lg font-semibold text-navy tabular-nums">1.4</p>
            <p className="text-[10px] text-[rgb(var(--text-muted))]">/ 2.5л</p>
            <div className="mt-2 h-1 bg-pink-100 rounded-full overflow-hidden">
              <div className="h-full w-[56%] bg-pink-400 rounded-full" />
            </div>
          </div>
          <div className="bg-emerald-50/80 backdrop-blur-xl rounded-2xl border border-emerald-100 p-3 shadow-soft">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2">
              <Footprints className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-navy tabular-nums">8.2K</p>
            <p className="text-[10px] text-[rgb(var(--text-muted))]">шагов</p>
            <div className="mt-2 h-1 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full w-[82%] bg-emerald-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-navy mb-3 px-1">Быстрые действия</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: ClipboardList, label: 'Профиль', href: '/profile', color: 'from-blue-400 to-blue-600' },
              { icon: Shield, label: 'Тест 5', href: '/test', color: 'from-pink-400 to-pink-600' },
              { icon: FileText, label: 'К врачу', href: '/report', color: 'from-violet-400 to-violet-600' },
              { icon: MessageCircle, label: 'AI чат', href: '/chat', color: 'from-emerald-400 to-emerald-600' },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all group-hover:-translate-y-0.5`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] text-[rgb(var(--text-secondary))] font-medium text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5">
          <h3 className="text-sm font-semibold text-navy mb-3">Активность за 7 дней</h3>
          <div className="grid grid-cols-7 gap-1 items-end h-14">
            {[60, 75, 68, 82, 70, 87, 90].map((val, i) => (
              <div
                key={i}
                className={`rounded-sm transition-all ${i === 6 ? 'bg-gradient-pink-blue-mint' : 'bg-gray-100'}`}
                style={{ height: `${val}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <span key={d} className="text-[10px] text-[rgb(var(--text-muted))] text-center flex-1">{d}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
