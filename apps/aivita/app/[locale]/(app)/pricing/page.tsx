'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Sparkles, Star, ChevronRight, Tag, Loader2 } from 'lucide-react';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

function formatPrice(price: number) {
  if (price === 0) return 'Бесплатно';
  return price.toLocaleString('ru-RU') + ' сум';
}

function periodLabel(period: string) {
  if (period === 'monthly') return '/месяц';
  if (period === 'annual') return '/год';
  return '';
}

const PROVIDER_STYLES: Record<string, { bg: string; label: string; hint: string }> = {
  click: { bg: 'bg-[#00B4E6]', label: 'Click', hint: 'UzCard, HUMO' },
  payme: { bg: 'bg-[#33CCCC]', label: 'Payme', hint: 'UzCard, HUMO' },
  uzum: { bg: 'bg-[#7B2D8E]', label: 'Uzum', hint: 'Visa, Mastercard, Uzum' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams?.get('status') === 'success';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSub>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discountType?: string; discountValue?: number; error?: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  useEffect(() => {
    if (showSuccess) {
      // Show confetti effect
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — optional peer dep
      import('canvas-confetti').then((m: { default: (opts: Record<string, unknown>) => void }) => {
        m.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
    load();
  }, []);

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

  function discountedPrice(plan: Plan) {
    if (!promoResult?.valid || !plan) return plan.price;
    if (promoResult.discountType === 'percent') {
      return Math.round(plan.price * (1 - (promoResult.discountValue ?? 0) / 100));
    }
    return Math.max(0, plan.price - (promoResult.discountValue ?? 0));
  }

  const defaultMethod = methods.find(m => m.isDefault) ?? methods[0];

  async function handlePay(provider?: string) {
    if (!selectedPlan) return;
    setPaying(true);
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
        router.push('/settings/subscription?status=success');
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? 'Ошибка оплаты');
      }
    } finally {
      setPaying(false);
      setShowProviderPicker(false);
    }
  }

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
      <div className="max-w-[480px] mx-auto">
        {showSuccess && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            Подписка активирована! Добро пожаловать в Premium.
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#2a2540] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#9c5e6c]" />
            Тарифы
          </h1>
          <p className="text-[13px] text-[#7a7290] mt-1">Выберите подходящий план</p>
        </div>

        {/* Plans */}
        <div className="space-y-3 mb-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSub?.subscription.planId === plan.id;
            const isPopular = plan.slug === 'premium';
            const finalPrice = discountedPrice(plan);

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  isCurrentPlan
                    ? 'border-[#9c5e6c] shadow-lg bg-white'
                    : selectedPlan?.id === plan.id
                    ? 'border-[#9c5e6c] bg-white'
                    : 'border-[#e8e4dc] bg-white hover:border-[#9c5e6c]/40'
                }`}
              >
                {isPopular && (
                  <span className="absolute top-0 right-0 bg-[#9c5e6c] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    Популярный
                  </span>
                )}
                {isCurrentPlan && (
                  <span className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl rounded-tl-xl">
                    Активный
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-[#2a2540]">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      {promoResult?.valid && plan.id === selectedPlan?.id && finalPrice !== plan.price ? (
                        <>
                          <span className="text-[18px] font-bold text-[#9c5e6c]">{formatPrice(finalPrice)}</span>
                          <span className="text-[12px] line-through text-[#7a7290]">{formatPrice(plan.price)}</span>
                        </>
                      ) : (
                        <span className="text-[18px] font-bold text-[#2a2540]">{formatPrice(plan.price)}</span>
                      )}
                      <span className="text-[12px] text-[#7a7290]">{periodLabel(plan.period)}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                    selectedPlan?.id === plan.id || isCurrentPlan ? 'border-[#9c5e6c] bg-[#9c5e6c]' : 'border-[#e8e4dc]'
                  }`}>
                    {(selectedPlan?.id === plan.id || isCurrentPlan) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {(plan.features ?? []).slice(0, 3).map((f, i) => (
                    <li key={i} className="text-[11px] text-[#7a7290] flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-[#9c5e6c] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Promo code */}
        {selectedPlan && selectedPlan.price > 0 && (
          <div className="mb-4 rounded-xl border border-[#e8e4dc] bg-white p-3">
            <p className="text-[12px] font-semibold text-[#2a2540] mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#9c5e6c]" />
              Промокод
            </p>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                placeholder="FIRST30"
                className="flex-1 rounded-lg border border-[#e8e4dc] px-3 py-2 text-[13px] outline-none focus:border-[#9c5e6c]"
              />
              <button
                onClick={handleValidatePromo}
                disabled={!promoCode.trim() || checkingPromo}
                className="rounded-lg bg-[#9c5e6c] text-white px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
              >
                {checkingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Применить'}
              </button>
            </div>
            {promoResult && (
              <p className={`mt-1.5 text-[11px] font-medium ${promoResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                {promoResult.valid
                  ? `Скидка ${promoResult.discountType === 'percent' ? promoResult.discountValue + '%' : promoResult.discountValue?.toLocaleString() + ' сум'} применена`
                  : promoResult.error ?? 'Недействительный промокод'}
              </p>
            )}
          </div>
        )}

        {/* Pay button */}
        {selectedPlan && !currentSub?.subscription.planId || (selectedPlan && currentSub?.subscription.planId !== selectedPlan?.id) ? (
          selectedPlan && selectedPlan.price === 0 ? (
            <button
              onClick={() => handlePay()}
              disabled={paying}
              className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[15px] font-bold flex items-center justify-center gap-2"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Активировать бесплатно'}
            </button>
          ) : defaultMethod ? (
            <button
              onClick={() => handlePay()}
              disabled={paying || !selectedPlan}
              className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  Оплатить {selectedPlan ? formatPrice(discountedPrice(selectedPlan)) : ''}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-[#7a7290] text-center mb-3">Выберите способ оплаты:</p>
              {Object.entries(PROVIDER_STYLES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setShowProviderPicker(false); handlePay(key); }}
                  disabled={paying}
                  className={`w-full rounded-xl ${val.bg} text-white py-3 text-[14px] font-bold flex items-center justify-between px-5`}
                >
                  <span>{val.label}</span>
                  <span className="text-[11px] opacity-80">{val.hint}</span>
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>
    </PageShell>
  );
}
