import { PageShell } from '@/components/cabinet/dashboard/PageShell';
import { Icon } from '@/components/cabinet/icons/Icon';
import { loadHabitsData } from './data';
import { HabitsList } from './HabitsList';

// ─── Progress ring (small) ────────────────────────────────────────────────────

function MiniRing({ pct }: { pct: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
      <svg viewBox="0 0 100 100" width={90} height={90} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="white" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-extrabold text-white leading-none">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HabitsPage() {
  const { habits, doneToday, today } = await loadHabitsData();
  const total = habits.length || 1;
  const pct = Math.round((doneToday / total) * 100);

  return (
    <PageShell active="habits">
      <div className="max-w-[680px] mx-auto pb-6">

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <section className="rounded-hero bg-hero-gradient p-6 mb-5 flex items-center gap-5">
          <MiniRing pct={pct} />
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
              ПРИВЫЧКИ
            </p>
            <p className="text-[22px] font-extrabold text-white leading-tight">
              {doneToday} из {habits.length}
            </p>
            <p className="text-[12px] text-white/70 mt-1">
              {pct === 100
                ? 'Все выполнено! 🎉'
                : doneToday === 0
                ? 'Начни с первой привычки'
                : 'Продолжай в том же духе'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Icon name="habit" size={48} />
          </div>
        </section>

        {/* ── Section label ──────────────────────────────────────────────── */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
          На сегодня
        </p>

        {/* ── Habits list (client — interactive) ─────────────────────────── */}
        <HabitsList initialHabits={habits} today={today} />

      </div>
    </PageShell>
  );
}
