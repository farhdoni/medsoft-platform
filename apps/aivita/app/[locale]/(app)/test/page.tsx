import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

const SYSTEMS = [
  {
    id: 'cardiovascular',
    icon: 'heart' as const,
    name: 'Сердце и сосуды',
    score: 82,
    done: true,
    bg: '#f0d4dc',
    accentColor: '#9c5e6c',
  },
  {
    id: 'digestive',
    icon: 'food' as const,
    name: 'ЖКТ и питание',
    score: 68,
    done: true,
    bg: '#d4e8d8',
    accentColor: '#548068',
  },
  {
    id: 'sleep',
    icon: 'kit' as const,
    name: 'Сон и восстановление',
    score: 59,
    done: true,
    bg: '#d4dff0',
    accentColor: '#5e75a8',
  },
  {
    id: 'mental',
    icon: 'sparkle' as const,
    name: 'Психо и стресс',
    score: null,
    done: false,
    current: true,
    bg: '#e0d8f0',
    accentColor: '#6e5fa0',
  },
  {
    id: 'musculoskeletal',
    icon: 'steps' as const,
    name: 'Опорно-двигательная',
    score: null,
    done: false,
    bg: '#f4f3ef',
    accentColor: '#9a96a8',
  },
];

function scoreLabel(score: number) {
  if (score >= 75) return { text: 'отлично', color: '#548068' };
  if (score >= 55) return { text: 'норма', color: '#9889c4' };
  return { text: 'внимание', color: '#cc8a96' };
}

export default function TestPage() {
  const doneCount = SYSTEMS.filter((s) => s.done).length;
  const progress = (doneCount / 5) * 100;
  const avgScore = Math.round(
    SYSTEMS.filter((s) => s.score !== null).reduce((a, s) => a + (s.score ?? 0), 0) /
      Math.max(1, SYSTEMS.filter((s) => s.score !== null).length)
  );

  return (
    <PageShell active="test">
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="Тест 5 систем"
        subtitle="Оцени состояние каждой системы организма"
        accentColor="#9889c4"
      />

      <div className="space-y-4 pb-8">

        {/* Progress card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#ffffff', border: '1px solid #e8e4dc' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
              Прогресс месяца
            </p>
            <span
              className="text-[11px] font-bold px-3 py-1 rounded-full"
              style={{ background: '#e0d8f0', color: '#6e5fa0' }}
            >
              {doneCount} из 5 готово
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-2 rounded-full overflow-hidden mb-4"
            style={{ background: '#e8e4dc' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #cc8a96 0%, #9889c4 60%, #80b094 100%)',
              }}
            />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-extrabold leading-none" style={{ color: '#2a2540' }}>
              {avgScore}
            </span>
            <span className="text-[14px]" style={{ color: '#9a96a8' }}>/100 — средний балл</span>
            <span className="text-[12px] font-semibold" style={{ color: '#548068' }}>
              ↑ +4 за месяц
            </span>
          </div>
        </div>

        {/* Systems list */}
        <div className="space-y-3">
          {SYSTEMS.map((sys) => (
            <div
              key={sys.id}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: sys.current ? sys.bg : '#ffffff',
                border: `1px solid ${sys.current ? sys.accentColor + '40' : '#e8e4dc'}`,
              }}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: sys.bg }}
                >
                  <Icon3D name={sys.icon} size={28} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold" style={{ color: '#2a2540' }}>
                    {sys.name}
                  </p>
                  {sys.done && sys.score !== null ? (
                    <p
                      className="text-[12px] font-bold mt-0.5"
                      style={{ color: scoreLabel(sys.score).color }}
                    >
                      {sys.score} / 100 · {scoreLabel(sys.score).text}
                    </p>
                  ) : sys.current ? (
                    <p className="text-[12px] font-medium mt-0.5" style={{ color: sys.accentColor }}>
                      Пройти сейчас · ~2 мин
                    </p>
                  ) : (
                    <p className="text-[12px] mt-0.5" style={{ color: '#9a96a8' }}>
                      Ожидает очереди
                    </p>
                  )}
                </div>

                {/* Action */}
                {sys.current ? (
                  <Link
                    href={`/test/${sys.id}`}
                    className="flex items-center gap-1 px-4 py-2 rounded-full text-[12px] font-bold transition-opacity hover:opacity-80"
                    style={{ background: sys.accentColor, color: '#ffffff' }}
                  >
                    Начать <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : sys.done ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded-full"
                      style={{ background: '#d4e8d8', color: '#548068' }}
                    >
                      ✓
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: '#e8e4dc' }}
                  />
                )}
              </div>

              {/* Current indicator bar */}
              {sys.current && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-full"
                  style={{ background: sys.accentColor }}
                />
              )}
            </div>
          ))}
        </div>

        {/* View results */}
        <Link
          href="/test/results"
          className="flex items-center justify-center h-12 rounded-2xl text-[14px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#ffffff', color: '#9c5e6c', border: '1px solid #e8e4dc' }}
        >
          Посмотреть результаты месяца →
        </Link>

      </div>
    </div>
    </PageShell>
  );
}
