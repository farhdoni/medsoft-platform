import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

const SYSTEMS = [
  {
    id: 'cardiovascular',
    emoji: '❤️',
    name: 'Сердце и сосуды',
    score: 82,
    done: true,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    id: 'digestive',
    emoji: '🍃',
    name: 'ЖКТ и питание',
    score: 68,
    done: true,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'sleep',
    emoji: '🌙',
    name: 'Сон и восстановление',
    score: 59,
    done: true,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'mental',
    emoji: '🧠',
    name: 'Психо и стресс',
    score: null,
    done: false,
    current: true,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'musculoskeletal',
    emoji: '💪',
    name: 'Опорно-двигательная',
    score: null,
    done: false,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

function getScoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 55) return 'text-orange-500';
  return 'text-red-500';
}

export default function TestPage() {
  const doneCount = SYSTEMS.filter((s) => s.done).length;

  return (
    <div className="min-h-screen">
      <AppHeader name="Тест 5 систем" />

      <div className="px-5 space-y-4 pb-6">
        {/* Progress card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-secondary))]">
              ПРОГРЕСС МЕСЯЦА
            </p>
            <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2.5 py-1 rounded-full">
              {doneCount} из 5 готово
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-pink-blue-mint rounded-full transition-all"
              style={{ width: `${(doneCount / 5) * 100}%` }}
            />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-navy">Текущий: <strong>71 / 100</strong></span>
            <span className="text-xs text-emerald-600 font-medium">+4 vs март</span>
          </div>
        </div>

        {/* Systems list */}
        <div className="space-y-3">
          {SYSTEMS.map((sys) => (
            <div
              key={sys.id}
              className={`relative bg-white/80 backdrop-blur-xl rounded-2xl border p-4 shadow-soft transition-all ${
                sys.current
                  ? 'border-pink-200 bg-pink-50/80'
                  : 'border-[rgba(120,160,200,0.15)]'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div className={`w-10 h-10 rounded-2xl ${sys.bgColor} flex items-center justify-center text-xl flex-shrink-0`}>
                  {sys.done ? (
                    <div className="relative">
                      <span>{sys.emoji}</span>
                      <span className="absolute -bottom-0.5 -right-0.5 text-xs">✅</span>
                    </div>
                  ) : sys.current ? (
                    <span>{sys.emoji}</span>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-base">{sys.emoji}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-navy text-sm">{sys.name}</p>
                  {sys.done && sys.score !== null ? (
                    <p className={`text-xs font-bold ${getScoreColor(sys.score)}`}>
                      {sys.score} / 100
                    </p>
                  ) : sys.current ? (
                    <p className="text-xs text-pink-600 font-medium">Сейчас · 2 мин</p>
                  ) : (
                    <p className="text-xs text-[rgb(var(--text-muted))]">Ожидает</p>
                  )}
                </div>

                {sys.current && (
                  <Link
                    href={`/test/${sys.id}`}
                    className="flex items-center gap-1 bg-gradient-pink-blue-mint text-white text-xs font-bold px-3 py-2 rounded-xl shadow-pink"
                  >
                    Начать <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
                {sys.done && (
                  <ChevronRight className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* See results */}
        <Link
          href="/test/results"
          className="w-full flex items-center justify-center h-12 bg-white/80 backdrop-blur border border-[rgba(120,160,200,0.2)] text-navy font-semibold rounded-2xl text-sm hover:bg-white transition-all"
        >
          Посмотреть результаты месяца →
        </Link>
      </div>
    </div>
  );
}
