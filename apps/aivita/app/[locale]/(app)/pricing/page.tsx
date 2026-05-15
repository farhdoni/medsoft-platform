'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Sparkles, Star, ChevronRight, Tag, Loader2, Crown, Users, Shield, Zap } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

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

type PaymentMethod = {
  id: number;
  provider: string;
  cardLastFour: string;
  cardType: string;
  isDefault: boolean;
};

type CurrentSub = {
  subscription: { planId: number; status: string; expiresAt: string };
  plan: Plan;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

function formatPrice(price: number) {
  if (price === 0) return 'Бесплатно';
  return price.toLocaleString('ru-RU') + ' сум';
}

function periodLabel(period: string) {
  if (period === 'monthly') return '/мес';
  if (period === 'annual') return '/год';
  return '';
}

const PROVIDER_STYLES: Record<string, { bg: string; label: string; hint: string }> = {
  click: { bg: 'bg-[#00B4E6]', label: 'Click',  hint: 'UzCard, HUMO' },
  payme: { bg: 'bg-[#33CCCC]', label: 'Payme',  hint: 'UzCard, HUMO' },
  uzum:  { bg: 'bg-[#7B2D8E]', label: 'Uzum',   hint: 'Visa, Mastercard, Uzum' },
};

// Static features per slug (fallback if API returns empty)
const PLAN_FEATURES: Record<string, string[]> = {
  free:             ['Медкарта и биометрия', 'AI-биоанализ 1×/мес', '5 AI-сообщений/день', '2 человека в семье', 'Карта вспышек болезней', 'QR-код медкарты'],
  premium:          ['Безлимит AI-чат', 'Безлимит чекапов', '30-дневный план здоровья', 'PDF-отчёт для врача', 'Уведомления о вспышках', 'Чат с врачом онлайн'],
  'premium-family': ['Всё из Premium', '5 человек в семье', 'Детские медкарты', 'Семейный дашборд', 'Прививочный календарь', 'Безлимит AI-чат'],
  annual:           ['Всё из Premium Family', '12 месяцев действия', 'Приоритетная поддержка', 'Ранний доступ к функциям', 'Бейдж Premium', 'Скидка 28% vs месячного'],
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:             <Zap className="w-5 h-5 text-[#9a96a8]" />,
  premium:          <Crown className="w-5 h-5 text-[#9c5e6c]" />,
  'premium-family': <Users className="w-5 h-5 text-[#7a5090]" />,
  annual:           <Shield className="w-5 h-5 text-[#2a7040]" />,
};

// ─── Provider picker modal ─────────────────────────────────────────────────────

function ProviderPicker({ onPick, onClose, paying }: {
  onPick: (p: string) => void;
  onClose: () => void;
  paying: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl px-5 pt-5 pb-10">
        <p className="text-[15px] font-bold text-[#2a2540] mb-1">Выберите способ оплаты</p>
        <p className="text-[12px] text-[#7a7290] mb-4">Перенаправим на страницу оплаты</p>
        <div className="flex flex-col gap-2">
          {Object.entries(PROVIDER_STYLES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => onPick(key)}
              disabled={paying}
              className={`w-full rounded-xl ${val.bg} text-white py-3.5 text-[14px] font-bold flex items-center justify-between px-5 transition active:scale-[0.98] disabled:opacity-60`}
            >
              <span>{val.label}</span>
              <span className="text-[11px] opacity-80">{val.hint}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2.5 text-[13px] text-[#7a7290] font-medium">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams?.get('status') === 'success';

  const [plans, setPlans]             = useState<Plan[]>([]);
  const [methods, setMethods]         = useState<PaymentMethod[]>([]);
  const [currentSub, setCurrentSub]   = useState<CurrentSub>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [promoCode, setPromoCode]     = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discountType?: string; discountValue?: number; error?: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [paying, setPaying]           = useState(false);
  const [showPicker, setShowPicker]   = useState(false);

  useEffect(() => {
    if (showSuccess) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      import('canvas-confetti').then((m: { default: (o: Record<string, unknown>) => void }) => {
        m.default({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }).catch(() => {});
    }
  }, [showSuccess]);

  useEffect(() => {
    async function load() {
      const [plansRes, methodsRes, subRes] = await Promise.all([
        fetch(`${API}/v1/aivita/payments/plans`, { credentials: 'include' }),
        fetch(`${API}/v1/aivita/payment-methods`, { credentials: 'include' }),
        fetch(`${API}/v1/aivita/payments/subscription`, { credentials: 'include' }),
      ]);
      const [p, m, s] = await Promise.all([plansRes.json(), methodsRes.json(), subRes.json()]);
      setPlans((p.data ?? []).filter((pl: Plan) => pl.targetRole === 'patient'));
      setMethods(m.data ?? []);
      setCurrentSub(s.data);
      setLoading(false);
    }
    void load();
  }, []);

  function discountedPrice(plan: Plan) {
    if (!promoResult?.valid || plan.id !== selectedPlan?.id) return plan.price;
    if (promoResult.discountType === 'percent') {
      return Math.round(plan.price * (1 - (promoResult.discountValue ?? 0) / 100));
    }
    return Math.max(0, plan.price - (promoResult.discountValue ?? 0));
  }

  async function handleValidatePromo() {
    if (!promoCode.trim() || !selectedPlan) return;
    setCheckingPromo(true);
    const res = await fetch(`${API}/v1/aivita/promo/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: promoCode, planSlug: selectedPlan.slug }),
    });
    setPromoResult(await res.json());
    setCheckingPromo(false);
  }

  const defaultMethod = methods.find(m => m.isDefault) ?? methods[0];

  async function handlePay(provider?: string) {
    if (!selectedPlan) return;
    setPaying(true);
    setShowPicker(false);
    try {
      const res = await fetch(`${API}/v1/aivita/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'subscription',
          planSlug: selectedPlan.slug,
          provider: provider ?? defaultMethod?.provider ?? 'click',
          promoCode: promoResult?.valid ? promoCode : undefined,
          paymentMethodId: defaultMethod?.id,
        }),
      });
      const data = await res.json();
      if (data.activated) {
        router.push('?status=success');
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? 'Ошибка оплаты');
      }
    } finally {
      setPaying(false);
    }
  }

  function handleSubscribeClick(plan: Plan) {
    setSelectedPlan(plan);
    if (plan.price === 0) {
      void handlePay();
      return;
    }
    if (defaultMethod) {
      void handlePay(defaultMethod.provider);
    } else {
      setShowPicker(true);
    }
  }

  const isCurrentPlan = (plan: Plan) => currentSub?.subscription.planId === plan.id;

  if (loading) {
    return (
      <PageShell active="pricing">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#9c5e6c]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell active="pricing">
      <div className="max-w-[480px] mx-auto pb-8">

        {/* ── Success banner ── */}
        {showSuccess && (
          <div className="mb-4 mx-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            Подписка активирована! Добро пожаловать в Premium.
          </div>
        )}

        {/* ── Hero ── */}
        <div
          className="mx-4 mb-5 rounded-3xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent,#9c5e6c) 0%, #7a3d8a 100%)' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-white/80" />
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Тарифы AIVITA</span>
          </div>
          <h1 className="text-[22px] font-extrabold text-white leading-tight">
            Ваше здоровье —<br />наш приоритет
          </h1>
          <p className="text-[13px] text-white/75 mt-1.5">
            Выберите план и получите полный контроль над своим здоровьем
          </p>
        </div>

        {/* ── Current subscription ── */}
        {currentSub && (
          <div className="mx-4 mb-4 rounded-2xl bg-white border border-[#e8e4dc] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#7a7290]">Текущий тариф</p>
              <p className="text-[14px] font-bold text-[#2a2540]">{currentSub.plan.name}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{
                background: currentSub.subscription.status === 'active' ? '#e8f5e8' : '#fde8e8',
                color: currentSub.subscription.status === 'active' ? '#2a7040' : '#b03030',
              }}>
                {currentSub.subscription.status === 'active' ? 'Активен' : 'Истёк'}
              </span>
              {currentSub.subscription.expiresAt && (
                <p className="text-[10px] text-[#7a7290] mt-0.5">
                  до {new Date(currentSub.subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Promo banner ── */}
        <div className="mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: '#fdf4e8', border: '1px solid #f5d9a0' }}>
          <span className="text-xl">🎁</span>
          <div>
            <p className="text-[13px] font-bold" style={{ color: '#8a6020' }}>Промокод FIRST30</p>
            <p className="text-[11px]" style={{ color: '#b89040' }}>Скидка 30% на первый месяц для новых пользователей</p>
          </div>
        </div>

        {/* ── Plan cards ── */}
        <div className="px-4 space-y-3 mb-5">
          {plans.map(plan => {
            const isCurrent = isCurrentPlan(plan);
            const isPopular = plan.slug === 'premium';
            const isSelected = selectedPlan?.id === plan.id;
            const features = plan.features?.length ? plan.features : (PLAN_FEATURES[plan.slug] ?? []);
            const finalPrice = discountedPrice(plan);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  isCurrent ? 'border-[#9c5e6c] shadow-md bg-white'
                  : isSelected ? 'border-[#9c5e6c] bg-white shadow-sm'
                  : 'border-[#e8e4dc] bg-white hover:border-[#9c5e6c]/40'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-px right-4 bg-[#9c5e6c] text-white text-[10px] font-bold px-3 py-1 rounded-b-xl">
                    ⭐ Популярный
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-px left-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-b-xl">
                    ✓ Активный
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {PLAN_ICONS[plan.slug] ?? <Star className="w-4 h-4 text-[#9c5e6c]" />}
                      <p className="text-[15px] font-bold text-[#2a2540]">{plan.name}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      {isSelected && promoResult?.valid && finalPrice !== plan.price ? (
                        <>
                          <span className="text-[20px] font-extrabold text-[#9c5e6c]">{formatPrice(finalPrice)}</span>
                          <span className="text-[12px] line-through text-[#7a7290]">{formatPrice(plan.price)}</span>
                        </>
                      ) : (
                        <span className="text-[20px] font-extrabold text-[#2a2540]">{formatPrice(plan.price)}</span>
                      )}
                      <span className="text-[12px] text-[#7a7290]">{periodLabel(plan.period)}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                    isSelected || isCurrent ? 'border-[#9c5e6c] bg-[#9c5e6c]' : 'border-[#e8e4dc]'
                  }`}>
                    {(isSelected || isCurrent) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <ul className="mt-2.5 space-y-1">
                  {features.slice(0, 4).map((f, i) => (
                    <li key={i} className="text-[11px] text-[#7a7290] flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#9c5e6c] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={e => { e.stopPropagation(); handleSubscribeClick(plan); }}
                    disabled={paying}
                    className={`mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#9c5e6c] text-white'
                        : 'bg-[#f4f3ef] text-[#2a2540] hover:bg-[#ede9e0]'
                    }`}
                  >
                    {paying && selectedPlan?.id === plan.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : plan.price === 0 ? 'Активировать' : <>Оформить <ChevronRight className="w-3.5 h-3.5" /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Promo code ── */}
        {selectedPlan && selectedPlan.price > 0 && (
          <div className="mx-4 mb-5 rounded-2xl border border-[#e8e4dc] bg-white p-4">
            <p className="text-[12px] font-semibold text-[#2a2540] mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#9c5e6c]" />
              Промокод
            </p>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                placeholder="FIRST30"
                className="flex-1 rounded-xl border border-[#e8e4dc] px-3 py-2 text-[13px] outline-none focus:border-[#9c5e6c] transition-colors"
              />
              <button
                onClick={handleValidatePromo}
                disabled={!promoCode.trim() || checkingPromo}
                className="rounded-xl bg-[#9c5e6c] text-white px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
              >
                {checkingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Применить'}
              </button>
            </div>
            {promoResult && (
              <p className={`mt-1.5 text-[11px] font-medium ${promoResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                {promoResult.valid
                  ? `✅ Скидка ${promoResult.discountType === 'percent' ? promoResult.discountValue + '%' : (promoResult.discountValue ?? 0).toLocaleString() + ' сум'} применена`
                  : promoResult.error ?? 'Недействительный промокод'}
              </p>
            )}
          </div>
        )}

        {/* ── Info cards ── */}
        <div className="px-4 mb-5">
          <p className="text-[14px] font-bold text-[#2a2540] mb-3">Что вы получаете</p>
          <div className="space-y-2">
            {[
              { icon: '🧬', title: 'AI-чекап здоровья', desc: 'Персональный анализ биометрии и рекомендации от AI-ассистента' },
              { icon: '🩺', title: 'Чат с врачом', desc: 'Онлайн-консультации с верифицированными специалистами 24/7' },
              { icon: '👨‍👩‍👧', title: 'Семейный мониторинг', desc: 'Медкарты для всей семьи, детские профили и прививочный календарь' },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#e8e4dc] px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#f0ece8' }}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#2a2540]">{item.title}</p>
                  <p className="text-[11px] text-[#7a7290] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Provider picker modal ── */}
        {showPicker && selectedPlan && (
          <ProviderPicker
            onPick={p => void handlePay(p)}
            onClose={() => setShowPicker(false)}
            paying={paying}
          />
        )}
      </div>
    </PageShell>
  );
}
