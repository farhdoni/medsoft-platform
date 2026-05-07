'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// ─── Question definition ───────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  sub: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  fact: string;
  higherIsBetter: boolean;
}

interface SystemConfig {
  emoji: string;
  name: string;
  colorClass: string;
  next: string | null;
  questions: Question[];
}

// ─── Per-system questions (no duplicates across systems) ──────────────────────

const SYSTEMS: Record<string, SystemConfig> = {
  cardiovascular: {
    emoji: '❤️',
    name: 'Сердце и сосуды',
    colorClass: 'text-rose-500',
    next: 'digestive',
    questions: [
      {
        id: 'cv1',
        text: 'Как часто у тебя бывает одышка при обычной ходьбе?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Одышка при ходьбе — ранний признак снижения кардиореспираторной функции.',
        higherIsBetter: false,
      },
      {
        id: 'cv2',
        text: 'Сколько раз в неделю ты занимаешься кардионагрузками?',
        sub: 'Бег, ходьба, велосипед, плавание',
        min: 0, max: 7, minLabel: '0 раз', maxLabel: '7 дней',
        fact: '150 минут умеренной кардионагрузки в неделю снижают риск инфаркта на 35%.',
        higherIsBetter: true,
      },
      {
        id: 'cv3',
        text: 'Как часто ты ешь жирную или жареную пищу?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Трансжиры повышают ЛПНП-холестерин и риск атеросклероза.',
        higherIsBetter: false,
      },
      {
        id: 'cv4',
        text: 'Как часто ты употребляешь алкоголь?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Даже умеренное потребление алкоголя повышает риск гипертонии.',
        higherIsBetter: false,
      },
      {
        id: 'cv5',
        text: 'Ты куришь или употребляешь никотин?',
        sub: 'Сигареты, вейп, жевательный табак',
        min: 0, max: 3, minLabel: 'Нет', maxLabel: 'Каждый день',
        fact: 'Курение — причина 30% сердечно-сосудистых смертей.',
        higherIsBetter: false,
      },
      {
        id: 'cv6',
        text: 'Как ты оцениваешь свой уровень физической активности в течение дня?',
        sub: 'В целом, не считая тренировок',
        min: 0, max: 10, minLabel: 'Сидячий образ жизни', maxLabel: 'Очень активный',
        fact: 'Даже 30 минут ходьбы ежедневно снижают давление на 4–9 мм рт.ст.',
        higherIsBetter: true,
      },
    ],
  },

  digestive: {
    emoji: '🍃',
    name: 'ЖКТ и питание',
    colorClass: 'text-emerald-600',
    next: 'sleep',
    questions: [
      {
        id: 'dg1',
        text: 'Как часто у тебя бывает вздутие или дискомфорт после еды?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Постоянный дискомфорт ЖКТ может указывать на дисбаланс микробиоты.',
        higherIsBetter: false,
      },
      {
        id: 'dg2',
        text: 'Сколько порций овощей и фруктов ты ешь в день?',
        sub: '1 порция = 1 фрукт или горсть овощей',
        min: 0, max: 5, minLabel: '0 порций', maxLabel: '5+ порций',
        fact: '5 порций овощей/фруктов в день снижают риск рака на 13%.',
        higherIsBetter: true,
      },
      {
        id: 'dg3',
        text: 'Как часто ты ешь фастфуд или полуфабрикаты?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Ультраобработанные продукты нарушают работу кишечного барьера.',
        higherIsBetter: false,
      },
      {
        id: 'dg4',
        text: 'Сколько литров воды ты выпиваешь в день?',
        sub: 'Чистой воды, не считая чай и кофе',
        min: 0, max: 4, minLabel: '0 литров', maxLabel: '4+ литра',
        fact: 'Недостаток воды замедляет пищеварение и нарушает всасывание питательных веществ.',
        higherIsBetter: true,
      },
      {
        id: 'dg5',
        text: 'Как часто ты пропускаешь приёмы пищи?',
        sub: 'Завтрак, обед или ужин',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Пропуск приёмов пищи вызывает резкие скачки сахара в крови.',
        higherIsBetter: false,
      },
    ],
  },

  sleep: {
    emoji: '🌙',
    name: 'Сон и восстановление',
    colorClass: 'text-purple-500',
    next: 'mental',
    questions: [
      {
        id: 'sl1',
        text: 'Сколько часов ты спишь в среднем за ночь?',
        sub: 'За последние 2 недели',
        min: 4, max: 10, minLabel: '4 часа', maxLabel: '10 часов',
        fact: 'Менее 7 часов сна повышают риск ожирения, диабета и сердечных заболеваний.',
        higherIsBetter: true,
      },
      {
        id: 'sl2',
        text: 'Как часто ты просыпаешься ночью?',
        sub: 'Не считая поход в туалет',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждую ночь',
        fact: 'Частые ночные пробуждения нарушают фазы глубокого сна и восстановления.',
        higherIsBetter: false,
      },
      {
        id: 'sl3',
        text: 'Как ты оцениваешь качество своего сна?',
        sub: 'В целом, насколько ты высыпаешься',
        min: 0, max: 10, minLabel: 'Очень плохо', maxLabel: 'Отлично',
        fact: 'Субъективное качество сна коррелирует с когнитивными функциями и иммунитетом.',
        higherIsBetter: true,
      },
      {
        id: 'sl4',
        text: 'Как часто ты используешь телефон или экраны перед сном?',
        sub: 'В течение 30 минут до сна',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Синий свет экранов подавляет выработку мелатонина на 50%.',
        higherIsBetter: false,
      },
      {
        id: 'sl5',
        text: 'Насколько регулярно ты ложишься и встаёшь в одно время?',
        sub: 'Отклонение менее 30 минут',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Регулярный режим сна синхронизирует циркадные ритмы и повышает качество сна.',
        higherIsBetter: true,
      },
    ],
  },

  mental: {
    emoji: '🧠',
    name: 'Психо и стресс',
    colorClass: 'text-pink-500',
    next: 'musculoskeletal',
    questions: [
      {
        id: 'mn1',
        text: 'Как часто ты испытываешь тревогу или беспокойство?',
        sub: 'За последние 2 недели',
        min: 0, max: 10, minLabel: 'Никогда', maxLabel: 'Постоянно',
        fact: 'Хроническая тревога снижает иммунитет и повышает риск сердечно-сосудистых заболеваний.',
        higherIsBetter: false,
      },
      {
        id: 'mn2',
        text: 'Как ты оцениваешь своё настроение в целом?',
        sub: 'За последние 2 недели',
        min: 0, max: 10, minLabel: 'Очень плохое', maxLabel: 'Отличное',
        fact: 'Хорошее эмоциональное состояние связано с более высокой иммунной активностью.',
        higherIsBetter: true,
      },
      {
        id: 'mn3',
        text: 'Как часто ты испытываешь стресс на работе или в быту?',
        sub: 'За последние 30 дней',
        min: 0, max: 10, minLabel: 'Никогда', maxLabel: 'Постоянно',
        fact: 'Хронический стресс снижает объём гиппокампа — зоны памяти мозга.',
        higherIsBetter: false,
      },
      {
        id: 'mn4',
        text: 'Как часто ты занимаешься снятием стресса?',
        sub: 'Медитация, хобби, прогулки, общение',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: '10 минут медитации в день снижают уровень кортизола на 15–20%.',
        higherIsBetter: true,
      },
    ],
  },

  musculoskeletal: {
    emoji: '💪',
    name: 'Опорно-двигательная',
    colorClass: 'text-lime-600',
    next: null,
    questions: [
      {
        id: 'ms1',
        text: 'Как часто ты занимаешься физическими упражнениями?',
        sub: 'Зарядка, тренировки, йога',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Регулярные упражнения укрепляют кости и снижают риск остеопороза на 40%.',
        higherIsBetter: true,
      },
      {
        id: 'ms2',
        text: 'Как часто ты испытываешь боли в спине, шее или суставах?',
        sub: 'За последние 30 дней',
        min: 0, max: 7, minLabel: 'Никогда', maxLabel: 'Каждый день',
        fact: 'Боль в спине — вторая по распространённости причина обращения к врачу.',
        higherIsBetter: false,
      },
      {
        id: 'ms3',
        text: 'Сколько часов в день ты проводишь сидя?',
        sub: 'Включая работу и отдых дома',
        min: 0, max: 16, minLabel: '0 часов', maxLabel: '16+ часов',
        fact: 'Сидение более 8 часов в день повышает риск хронических болей в спине на 40%.',
        higherIsBetter: false,
      },
      {
        id: 'ms4',
        text: 'Как ты оцениваешь свою гибкость и подвижность суставов?',
        sub: 'Можешь ли ты нормально наклониться, повернуться?',
        min: 0, max: 10, minLabel: 'Очень плохая', maxLabel: 'Отличная',
        fact: 'Гибкость суставов снижается без регулярной растяжки со временем.',
        higherIsBetter: true,
      },
    ],
  },
};

// ─── Score calculation ─────────────────────────────────────────────────────────

function calcSystemScore(questions: Question[], answers: number[]) {
  const scored = questions.map((q, i) => {
    const val = answers[i];
    const normalized = (val - q.min) / (q.max - q.min);
    const qScore = Math.round((q.higherIsBetter ? normalized : 1 - normalized) * 100);
    return { questionId: q.id, questionText: q.text, answer: val, score: qScore };
  });
  const total = Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length);
  return { score: total, scored };
}

function scoreLabel(n: number) {
  if (n >= 80) return { label: 'Отлично', zone: 'positive', text: 'Показатели этой системы — в норме. Продолжай в том же духе!' };
  if (n >= 65) return { label: 'Хорошо', zone: 'positive', text: 'Небольшие улучшения помогут перейти на следующий уровень.' };
  if (n >= 50) return { label: 'Норма', zone: 'warning', text: 'Есть зоны роста. Небольшие изменения дадут ощутимый результат.' };
  return { label: 'Требует внимания', zone: 'danger', text: 'Эта система требует особого внимания. Начни с малых шагов.' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SystemTestPage() {
  const params = useParams<{ systemId: string; locale: string }>();
  const systemId = params?.systemId ?? '';
  const locale = params?.locale ?? 'ru';
  const router = useRouter();

  const sys = SYSTEMS[systemId];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => {
    if (!sys) return [];
    return sys.questions.map((q) => Math.round((q.min + q.max) / 2));
  });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);

  // Unknown systemId
  if (!sys) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <p className="text-navy font-semibold mb-4">Система не найдена</p>
        <Link href={`/${locale}/test`} className="text-pink-500 text-sm font-medium">← Назад</Link>
      </div>
    );
  }

  const q = sys.questions[current];

  async function handleFinish() {
    setSaving(true);
    const { score, scored } = calcSystemScore(sys.questions, answers);
    setFinalScore(score);

    const periodMonth = new Date().toISOString().slice(0, 7);

    try {
      await fetch(`${API_BASE}/v1/aivita/health-score/system-tests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth,
          system: systemId,
          score,
          answers: scored,
        }),
      });
    } catch {
      // Non-blocking — show result screen anyway
    }

    setSaving(false);
    setDone(true);
  }

  async function handleNext() {
    if (sys.next) {
      router.push(`/${locale}/test/${sys.next}`);
    } else {
      // Last system — calculate overall score then go to results
      setSaving(true);
      try {
        await fetch(`${API_BASE}/v1/aivita/health-score/calculate`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // proceed anyway
      }
      setSaving(false);
      router.push(`/${locale}/test/results`);
    }
  }

  function next() {
    if (current < sys.questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      void handleFinish();
    }
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (done) {
    const { label, zone, text } = scoreLabel(finalScore);
    const isLast = sys.next === null;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <span className="text-4xl mb-4">{sys.emoji}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">
          {sys.name.toUpperCase()}
        </p>
        <h3 className="text-xl font-semibold text-navy mb-6 text-center">
          Твой результат <em className="font-serif italic font-normal text-pink-500">системы</em>
        </h3>
        <div className="text-center mb-6">
          <span className="text-6xl font-light text-pink-500">{finalScore}</span>
          <span className="text-xl text-[rgb(var(--text-muted))]"> / 100</span>
          <p className={`text-sm font-semibold mt-1 ${sys.colorClass}`}>{label}</p>
        </div>
        <div className="space-y-3 w-full max-w-sm mb-6">
          <div className={`rounded-2xl border p-4 ${zone === 'danger' ? 'bg-red-50 border-red-100' : zone === 'warning' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-sm font-medium ${zone === 'danger' ? 'text-red-700' : zone === 'warning' ? 'text-orange-700' : 'text-emerald-700'}`}>
              {zone === 'danger' ? '⚠ Зона роста' : zone === 'warning' ? '📈 Есть над чем работать' : '✓ Хорошие результаты'}
            </p>
            <p className={`text-xs mt-1 ${zone === 'danger' ? 'text-red-600' : zone === 'warning' ? 'text-orange-600' : 'text-emerald-600'}`}>
              {text}
            </p>
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full max-w-sm flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink text-sm disabled:opacity-60"
        >
          {saving ? 'Сохранение…' : isLast ? 'Посмотреть общий результат →' : 'Следующая система →'}
        </button>
      </div>
    );
  }

  // ── Question screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-5 pt-5 pb-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/test`}
          className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-navy" />
        </Link>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-pink-blue-mint rounded-full transition-all"
            style={{ width: `${((current + 1) / sys.questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[rgb(var(--text-muted))] font-medium">
          {current + 1} / {sys.questions.length}
        </span>
      </div>

      {/* System label */}
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${sys.colorClass}`}>
        {sys.emoji} {sys.name.toUpperCase()}
      </p>

      {/* Question text */}
      <h3 className="text-xl font-semibold text-navy mb-1">{q.text}</h3>
      <p className="text-xs text-[rgb(var(--text-secondary))] mb-6">{q.sub}</p>

      {/* Slider */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 shadow-soft mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[rgb(var(--text-secondary))]">Значение</span>
          <span className="text-3xl font-light text-pink-500 font-serif">{answers[current]}</span>
        </div>
        <input
          type="range"
          min={q.min}
          max={q.max}
          value={answers[current]}
          onChange={(e) => {
            const next = [...answers];
            next[current] = Number(e.target.value);
            setAnswers(next);
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ec4899 0%, #3b82f6 ${((answers[current] - q.min) / (q.max - q.min)) * 100}%, #e5e7eb ${((answers[current] - q.min) / (q.max - q.min)) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[rgb(var(--text-muted))]">{q.minLabel}</span>
          <span className="text-xs text-[rgb(var(--text-muted))]">{q.maxLabel}</span>
        </div>
      </div>

      {/* Fact card */}
      <div className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-2xl border border-[rgba(236,72,153,0.1)] p-4 mb-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-1">💡 ЗНАЕШЬ ЧТО</p>
        <p className="text-xs text-[rgb(var(--text-secondary))]">{q.fact}</p>
      </div>

      <button
        onClick={next}
        disabled={saving}
        className="mt-6 w-full flex items-center justify-center h-14 bg-gradient-pink-blue-mint text-white font-bold rounded-2xl shadow-pink hover:shadow-pink-strong hover:-translate-y-0.5 transition-all text-sm disabled:opacity-60"
      >
        {saving ? 'Сохранение…' : current < sys.questions.length - 1 ? 'Дальше →' : 'Завершить'}
      </button>
    </div>
  );
}
