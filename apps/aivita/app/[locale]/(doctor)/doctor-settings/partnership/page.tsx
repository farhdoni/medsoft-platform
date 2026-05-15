'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown, Loader2, Check, ChevronRight } from 'lucide-react';
import { DoctorBottomNav } from '@/components/doctor/DoctorBottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: number;
  name: string;
  slug: string;
  price: number;
  period: string;
  targetRole: string;
  features: string[];
  isActive: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const PROVIDER_STYLES: Record<string, { bg: string; label: string; hint: string }> = {
  click: { bg: 'bg-[#00B4E6]', label: 'Click',  hint: 'UzCard, HUMO' },
  payme: { bg: 'bg-[#33CCCC]', label: 'Payme',  hint: 'UzCard, HUMO' },
  uzum:  { bg: 'bg-[#7B2D8E]', label: 'Uzum',   hint: 'Visa, Mastercard, Uzum' },
};

const PLAN_FEATURES: Record<string, string[]> = {
  'doctor-free':    ['Профиль в каталоге', 'QR-визитка', 'До 5 пациентов/мес', 'Базовая статистика'],
  'doctor-pro':     ['Безлимит пациентов', 'Онлайн-чат с пациентами', 'Назначения и рецепты', 'Управление расписанием', 'Бейдж "Проверен"', 'Приоритет в каталоге'],
  'doctor-premium': ['AI-диагностический ассистент', 'Проверка совместимости лекарств', 'Детальная аналитика', 'Топ в каталоге', 'Верификация ✅', 'Приоритетная поддержка'],
};

const HOW_IT_WORKS = [
  { icon: '📋', title: 'Пациент находит вас', desc: 'Через каталог врачей или поиск по специальности', bg: '#e8f0f8', color: '#5580b0' },
  { icon: '📅', title: 'Записывается на приём', desc: 'Онлайн-запись в один клик без звонков', bg: '#ede8f5', color: '#7a5090' },
  { icon: '💬', title: 'Чат и консультации', desc: 'Общение через защищённый чат AIVITA', bg: '#e8f5e8', color: '#3a7040' },
  { icon: '🤖', title: 'AI-ассистент помогает', desc: 'Предварительный анализ симптомов пациента', bg: '#f5ede8', color: '#9c5e6c' },
  { icon: '💰', title: 'Получаете оплату', desc: 'Автоматические выплаты каждую пятницу', bg: '#fdf4e0', color: '#8a6020' },
];

const FAQ_ITEMS = [
  { q: 'Сколько я могу зарабатывать?', a: 'При 80 пациентах в месяц (60 записей + 20 онлайн) ваш чистый доход составит около 9 800 000 сум/мес. Всё зависит от вашего прайса и числа приёмов.' },
  { q: 'Могу ли я устанавливать свою цену?', a: 'Да, вы полностью сами устанавливаете стоимость консультации. AIVITA берёт комиссию от суммы сделки.' },
  { q: 'Как проходит верификация?', a: 'Загрузите диплом и лицензию врача. Верификация занимает до 2 рабочих дней. После проверки вы получите значок ✅ на профиле.' },
  { q: 'Когда приходят деньги?', a: 'Выплаты проводятся каждую пятницу. Минимальная сумма для вывода — 50 000 сум. Деньги приходят на вашу карту UzCard или HUMO.' },
  { q: 'Что если пациент отменит запись?', a: 'При отмене менее чем за 2 часа до приёма комиссия AIVITA не удерживается. Политику возврата вы устанавливаете сами.' },
];

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0" style={{ borderColor: '#f0ece4' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-3"
      >
        <span className="text-[13px] font-semibold text-[#2a2540] flex-1">{q}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: '#7a7290', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <p className="text-[12px] text-[#7a7290] pb-3.5 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DoctorPartnershipPage() {
  const router = useRouter();
  const [plans, setPlans]           = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [paying, setPaying]         = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch(`${API}/v1/aivita/payments/plans`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setPlans((d.data ?? []).filter((p: Plan) => p.targetRole === 'doctor'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handlePay(provider: string) {
    if (!selectedPlan) return;
    setPaying(true);
    setShowPicker(false);
    try {
      const res = await fetch(`${API}/v1/aivita/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'subscription', planSlug: selectedPlan.slug, provider }),
      });
      const data = await res.json();
      if (data.activated || data.checkoutUrl) {
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
        else router.push('/doctor-settings?tab=subscription&status=success');
      } else {
        alert(data.error ?? 'Ошибка оплаты');
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f4f3ef', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#e8e4dc] sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#f4f3ef' }}
        >
          <ChevronLeft className="w-5 h-5 text-[#2a2540]" />
        </button>
        <p className="text-[15px] font-bold text-[#2a2540]">Партнёрство с AIVITA</p>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── Hero ── */}
        <div
          className="px-5 py-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #5580b0 0%, #6BA3D6 100%)' }}
        >
          <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-2">Для врачей</p>
          <h1 className="text-[24px] font-extrabold text-white leading-tight mb-2">
            Зарабатывайте<br />с AIVITA
          </h1>
          <p className="text-[13px] text-white/80 leading-relaxed">
            Тысячи пациентов уже ищут врачей на нашей платформе. Присоединяйтесь и развивайте свою практику.
          </p>
          <div className="mt-4 flex gap-3">
            <div className="text-center">
              <p className="text-[20px] font-extrabold text-white">12K+</p>
              <p className="text-[10px] text-white/70">пациентов</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-[20px] font-extrabold text-white">4.9★</p>
              <p className="text-[10px] text-white/70">рейтинг</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-[20px] font-extrabold text-white">0%</p>
              <p className="text-[10px] text-white/70">скрытых сборов</p>
            </div>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-[15px] font-bold text-[#2a2540] mb-3">Как это работает</p>
          <div className="space-y-2">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#e8e4dc] px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: item.bg }}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>{item.title}</p>
                  <p className="text-[11px] text-[#7a7290]">{item.desc}</p>
                </div>
                <span className="ml-auto text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.bg, color: item.color }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Commission block ── */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl px-4 py-4" style={{ background: '#fdf8e8', border: '1px solid #e8d5a0' }}>
            <p className="text-[14px] font-bold text-[#8a6020] mb-3">💼 Комиссия AIVITA</p>
            <div className="space-y-2">
              {[
                { label: 'Запись к врачу',       pct: '10%' },
                { label: 'Онлайн-консультация',  pct: '15%' },
                { label: 'Повторный визит',       pct: '5%' },
                { label: 'Вывод средств',         pct: 'Бесплатно' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: '#e8d5a0' }}>
                  <span className="text-[13px] text-[#6a5020]">{row.label}</span>
                  <span className="text-[13px] font-bold text-[#8a6020]">{row.pct}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#b89040] mt-2">* Комиссия удерживается автоматически при выплате</p>
          </div>
        </div>

        {/* ── Income calculator ── */}
        <div className="px-4 pt-3">
          <div className="rounded-2xl px-4 py-4" style={{ background: '#e8f5ea', border: '1px solid #b8d8bc' }}>
            <p className="text-[14px] font-bold text-[#2a7040] mb-3">📊 Пример дохода за месяц</p>
            <p className="text-[11px] text-[#3a8050] mb-3">При 80 пациентах в месяц</p>
            <div className="space-y-2">
              {[
                { label: '60 записей × 150 000 сум',   val: '9 000 000 сум',  color: '#2a7040' },
                { label: '20 онлайн × 100 000 сум',    val: '2 000 000 сум',  color: '#2a7040' },
                { label: 'Комиссия AIVITA (~12%)',      val: '−1 200 000 сум', color: '#b03030' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#4a7050]">{row.label}</span>
                  <span className="text-[12px] font-semibold" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-1 flex items-center justify-between" style={{ borderColor: '#b8d8bc' }}>
                <span className="text-[14px] font-bold text-[#2a7040]">Итого к выплате</span>
                <span className="text-[16px] font-extrabold text-[#2a7040]">9 800 000 сум</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Doctor plans ── */}
        <div className="px-4 pt-5">
          <p className="text-[15px] font-bold text-[#2a2540] mb-3">Тарифы для врачей</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#5580b0]" /></div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => {
                const isPro = plan.slug === 'doctor-pro';
                const features = plan.features?.length ? plan.features : (PLAN_FEATURES[plan.slug] ?? []);
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all bg-white ${
                      selectedPlan?.id === plan.id ? 'border-[#5580b0] shadow-sm' : 'border-[#e8e4dc] hover:border-[#5580b0]/40'
                    }`}
                  >
                    {isPro && (
                      <span className="absolute -top-px right-4 text-white text-[10px] font-bold px-3 py-1 rounded-b-xl" style={{ background: '#5580b0' }}>
                        ⭐ Популярный
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[15px] font-bold text-[#2a2540]">{plan.name}</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-[20px] font-extrabold text-[#2a2540]">
                            {plan.price === 0 ? 'Бесплатно' : plan.price.toLocaleString('ru-RU') + ' сум'}
                          </span>
                          {plan.price > 0 && <span className="text-[12px] text-[#7a7290]">/мес</span>}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                        selectedPlan?.id === plan.id ? 'border-[#5580b0] bg-[#5580b0]' : 'border-[#e8e4dc]'
                      }`}>
                        {selectedPlan?.id === plan.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    <ul className="mt-2.5 space-y-1">
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="text-[11px] text-[#7a7290] flex items-center gap-1.5">
                          <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#5580b0' }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {plan.price > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedPlan(plan); setShowPicker(true); }}
                        disabled={paying}
                        className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 text-white"
                        style={{ background: '#5580b0' }}
                      >
                        {paying && selectedPlan?.id === plan.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <>Подключить <ChevronRight className="w-3.5 h-3.5" /></>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Start in 3 steps ── */}
        <div className="px-4 pt-5">
          <p className="text-[15px] font-bold text-[#2a2540] mb-3">Начать за 3 шага</p>
          <div className="rounded-2xl bg-white border border-[#e8e4dc] divide-y divide-[#f4f3ef]">
            {[
              { num: '1', title: 'Заполните профиль', desc: 'Фото, специализация, стаж, образование' },
              { num: '2', title: 'Настройте расписание', desc: 'Выберите дни, время и тип приёма' },
              { num: '3', title: 'Привяжите карту', desc: 'Для автоматических выплат каждую пятницу' },
            ].map(step => (
              <div key={step.num} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white flex-shrink-0" style={{ background: '#5580b0' }}>
                  {step.num}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#2a2540]">{step.title}</p>
                  <p className="text-[11px] text-[#7a7290]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="px-4 pt-5">
          <p className="text-[15px] font-bold text-[#2a2540] mb-3">Частые вопросы</p>
          <div className="rounded-2xl bg-white border border-[#e8e4dc] px-4">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Provider picker modal ── */}
      {showPicker && selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}
        >
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <p className="text-[15px] font-bold text-[#2a2540] mb-1">Выберите способ оплаты</p>
            <p className="text-[12px] text-[#7a7290] mb-4">{selectedPlan.name} — {selectedPlan.price.toLocaleString('ru-RU')} сум/мес</p>
            <div className="flex flex-col gap-2">
              {Object.entries(PROVIDER_STYLES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => void handlePay(key)}
                  disabled={paying}
                  className={`w-full rounded-xl ${val.bg} text-white py-3.5 text-[14px] font-bold flex items-center justify-between px-5 transition active:scale-[0.98] disabled:opacity-60`}
                >
                  <span>{val.label}</span>
                  <span className="text-[11px] opacity-80">{val.hint}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPicker(false)} className="w-full mt-3 py-2.5 text-[13px] text-[#7a7290] font-medium">
              Отмена
            </button>
          </div>
        </div>
      )}

      <DoctorBottomNav />
    </div>
  );
}
