'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Crown, Calendar, CreditCard, Check, Loader2,
  ChevronRight, XCircle, Zap, Users, Shield, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: number; name: string; slug: string; price: number;
  period: string; features: string[]; targetRole?: string;
};
type Sub = {
  subscription: { id: number; status: string; expiresAt: string; autoRenew: boolean; planId: number };
  plan: Plan;
} | null;
type Payment = {
  id: number; type: string; amount: number; provider: string | null;
  status: string; createdAt: string;
};
type PaymentMethod = {
  id: number; provider: string; cardLastFour: string | null;
  cardType: string | null; isDefault: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-600', pending: 'text-yellow-600',
  failed: 'text-red-500',      refunded: 'text-blue-500',
};
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum' };
const PROVIDER_STYLES: Record<string, { bg: string; label: string; hint: string }> = {
  click: { bg: 'bg-[#00B4E6]', label: 'Click',  hint: 'UzCard, HUMO' },
  payme: { bg: 'bg-[#33CCCC]', label: 'Payme',  hint: 'UzCard, HUMO' },
  uzum:  { bg: 'bg-[#7B2D8E]', label: 'Uzum',   hint: 'Visa, Mastercard, Uzum' },
};
const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:             <Zap className="w-4 h-4 text-[#9a96a8]" />,
  premium:          <Crown className="w-4 h-4 text-[#9c5e6c]" />,
  'premium-family': <Users className="w-4 h-4 text-[#7a5090]" />,
  annual:           <Shield className="w-4 h-4 text-[#2a7040]" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatPrice(p: number) {
  if (p === 0) return 'Бесплатно';
  return p.toLocaleString('ru-RU') + ' сум';
}
function periodLabel(p: string) {
  return p === 'annual' ? '/год' : p === 'monthly' ? '/мес' : '';
}

// ─── Provider Picker ──────────────────────────────────────────────────────────

function ProviderPicker({ onPick, onClose, paying }: {
  onPick: (p: string) => void;
  onClose: () => void;
  paying: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
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

// ─── Change Plan Modal ────────────────────────────────────────────────────────

function ChangePlanModal({ plans, currentSub, defaultMethod, paying, onClose, onSelect }: {
  plans: Plan[];
  currentSub: Sub;
  defaultMethod: PaymentMethod | undefined;
  paying: boolean;
  onClose: () => void;
  onSelect: (plan: Plan) => void;
}) {
  const currentPrice = currentSub?.plan.price ?? 0;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-[#e8e4dc]">
          <p className="text-[16px] font-bold text-[#2a2540]">Сменить тариф</p>
          <p className="text-[12px] text-[#7a7290]">
            {defaultMethod
              ? `Привязанная карта: ${PROVIDER_LABELS[defaultMethod.provider] ?? defaultMethod.provider} *${defaultMethod.cardLastFour ?? '????'}`
              : 'Нет привязанной карты'}
          </p>
        </div>

        <div className="p-4 space-y-3">
          {plans.map(plan => {
            const isCurrent = currentSub?.subscription.planId === plan.id;
            const isUpgrade = plan.price > currentPrice || currentPrice === 0;

            let btnLabel: React.ReactNode = null;
            if (!isCurrent) {
              if (plan.price === 0) {
                btnLabel = 'Перейти на Free';
              } else if (defaultMethod) {
                btnLabel = isUpgrade
                  ? `Оплатить картой *${defaultMethod.cardLastFour ?? '????'}`
                  : `Сменить (картой *${defaultMethod.cardLastFour ?? '????'})`;
              } else {
                btnLabel = isUpgrade ? 'Оформить' : 'Сменить';
              }
            }

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-4 ${isCurrent ? 'border-[#9c5e6c]' : 'border-[#e8e4dc]'} bg-white`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {PLAN_ICONS[plan.slug] ?? <Star className="w-4 h-4 text-[#9c5e6c]" />}
                    <span className="text-[14px] font-bold text-[#2a2540]">{plan.name}</span>
                    {isCurrent && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ✓ Текущий
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[14px] font-extrabold text-[#2a2540]">{formatPrice(plan.price)}</span>
                    <span className="text-[11px] text-[#7a7290]">{periodLabel(plan.period)}</span>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => onSelect(plan)}
                    disabled={paying}
                    className={`w-full py-2.5 rounded-xl text-[13px] font-bold transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                      plan.price === 0
                        ? 'bg-[#f4f3ef] text-[#7a7290]'
                        : 'bg-[#9c5e6c] text-white'
                    }`}
                  >
                    {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : btnLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 pb-10">
          <button onClick={onClose} className="w-full py-2.5 text-[13px] text-[#7a7290] font-medium">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Downgrade Confirm Modal ──────────────────────────────────────────────────

function DowngradeConfirmModal({ sub, onConfirm, onClose, cancelling }: {
  sub: Sub;
  onConfirm: () => void;
  onClose: () => void;
  cancelling: boolean;
}) {
  const lostFeatures = ['Безлимит AI-чат', 'Безлимит чекапов', 'Чат с врачом онлайн', 'PDF отчёты для врача'];
  const expiresAt = sub?.subscription.expiresAt ? formatDate(sub.subscription.expiresAt) : '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl px-5 pt-6 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-[17px] font-bold text-[#2a2540] mb-1">Перейти на Free?</p>
        <p className="text-[13px] text-[#7a7290] mb-4">
          Подписка действует до {expiresAt}. После этого вы потеряете:
        </p>
        <ul className="space-y-2 mb-5">
          {lostFeatures.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] text-[#2a2540]">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <button
          onClick={onConfirm}
          disabled={cancelling}
          className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-bold text-[14px] mb-2 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
          Отменить подписку
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-[13px] text-[#7a7290] font-medium">
          Оставить подписку
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubscriptionClient({ showSuccess }: { showSuccess: boolean }) {
  const [sub, setSub]           = useState<Sub>(null);
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [methods, setMethods]   = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showDowngrade, setShowDowngrade]   = useState(false);
  const [showPicker, setShowPicker]         = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<Plan | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying]         = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, methodsRes, plansRes] = await Promise.all([
          fetch(`${API}/v1/aivita/payments/subscription`, { credentials: 'include' }),
          fetch(`${API}/v1/aivita/payment-methods`, { credentials: 'include' }),
          fetch(`${API}/v1/aivita/payments/plans`, { credentials: 'include' }),
        ]);
        const [s, m, p] = await Promise.all([
          subRes.json(), methodsRes.json(), plansRes.json(),
        ]);
        setSub(s.data ?? null);
        setMethods(m.data ?? []);
        setPlans((p.data ?? []).filter((pl: Plan) => pl.targetRole === 'patient'));

        // history is optional — don't block loading if endpoint missing
        try {
          const histRes = await fetch(`${API}/v1/aivita/payments/history`, { credentials: 'include' });
          if (histRes.ok) {
            const h = await histRes.json();
            setPayments((h.data ?? []).slice(0, 10));
          }
        } catch { /* history not critical */ }
      } catch {
        // show page even on error
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const defaultMethod = methods.find(m => m.isDefault) ?? methods[0];

  async function reloadSub() {
    const res = await fetch(`${API}/v1/aivita/payments/subscription`, { credentials: 'include' });
    setSub((await res.json()).data);
  }

  async function handleCancelAutoRenew() {
    setCancelling(true);
    await fetch(`${API}/v1/aivita/payments/subscription/cancel`, { method: 'POST', credentials: 'include' });
    await reloadSub();
    setCancelling(false);
  }

  async function handlePay(plan: Plan, provider?: string) {
    setPaying(true);
    setShowPicker(false);
    try {
      const res = await fetch(`${API}/v1/aivita/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'subscription',
          planSlug: plan.slug,
          provider: provider ?? defaultMethod?.provider ?? 'click',
          paymentMethodId: defaultMethod?.id,
        }),
      });
      const data = await res.json() as { activated?: boolean; checkoutUrl?: string; error?: string };
      if (data.activated) {
        await reloadSub();
        setShowChangePlan(false);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error ?? 'Ошибка оплаты');
      }
    } finally {
      setPaying(false);
    }
  }

  function handlePlanSelect(plan: Plan) {
    setSelectedNewPlan(plan);
    if (plan.price === 0) {
      setShowChangePlan(false);
      setShowDowngrade(true);
      return;
    }
    setShowChangePlan(false);
    if (defaultMethod) {
      void handlePay(plan, defaultMethod.provider);
    } else {
      setShowPicker(true);
    }
  }

  async function handleDowngrade() {
    setCancelling(true);
    await fetch(`${API}/v1/aivita/payments/subscription/cancel`, { method: 'POST', credentials: 'include' });
    await reloadSub();
    setShowDowngrade(false);
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-[#9c5e6c]" />
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto">
      {showSuccess && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-[13px] font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          Подписка успешно оформлена!
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-[18px] font-bold text-[#2a2540] flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#9c5e6c]" />
          Подписка
        </h1>
      </div>

      {!sub ? (
        <div className="rounded-xl border border-[#e8e4dc] bg-white p-6 text-center">
          <Crown className="w-10 h-10 text-[#e8e4dc] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#2a2540]">Нет активной подписки</p>
          <p className="text-[12px] text-[#7a7290] mt-1 mb-4">Перейдите на Premium для безлимитного AI-чата</p>
          <button
            onClick={() => setShowChangePlan(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9c5e6c] text-white px-5 py-2.5 text-[13px] font-bold"
          >
            Выбрать тариф <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Current plan card */}
          <div className="rounded-xl border-2 border-[#9c5e6c] bg-white p-4 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#9c5e6c] uppercase tracking-wide">Текущий план</p>
                <p className="text-[18px] font-bold text-[#2a2540] mt-0.5">{sub.plan.name}</p>
                <p className="text-[13px] text-[#7a7290] mt-0.5">
                  {formatPrice(sub.plan.price)}{periodLabel(sub.plan.period)}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                sub.subscription.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {sub.subscription.status === 'active' ? 'Активна' : sub.subscription.status}
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {(sub.plan.features ?? []).slice(0, 3).map((f, i) => (
                <li key={i} className="text-[11px] text-[#7a7290] flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-[#9c5e6c] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Expiry, card & auto-renew */}
          <div className="rounded-xl border border-[#e8e4dc] bg-white p-4 space-y-3">
            {/* Renewal date */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f4f3ef] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#9c5e6c]" />
              </div>
              <div>
                <p className="text-[11px] text-[#7a7290]">
                  {sub.subscription.autoRenew ? 'Дата продления' : 'Действует до'}
                </p>
                <p className="text-[13px] font-semibold text-[#2a2540]">
                  {formatDate(sub.subscription.expiresAt)}
                </p>
                {!sub.subscription.autoRenew && (
                  <p className="text-[11px] text-orange-500 mt-0.5">Подписка не будет продлена</p>
                )}
              </div>
            </div>

            {/* Payment card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f4f3ef] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#9c5e6c]" />
                </div>
                <div>
                  <p className="text-[11px] text-[#7a7290]">Карта</p>
                  {defaultMethod ? (
                    <p className="text-[13px] font-semibold text-[#2a2540]">
                      {PROVIDER_LABELS[defaultMethod.provider] ?? defaultMethod.provider}
                      {' '}*{defaultMethod.cardLastFour ?? '????'}
                    </p>
                  ) : (
                    <Link href="/settings/payment-methods" className="text-[13px] font-semibold text-[#9c5e6c]">
                      Привязать карту →
                    </Link>
                  )}
                </div>
              </div>
              {defaultMethod && (
                <Link href="/settings/payment-methods" className="text-[12px] text-[#9c5e6c] font-medium">
                  Изменить
                </Link>
              )}
            </div>

            {/* Auto-renew */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f4f3ef] flex items-center justify-center text-sm">
                  🔄
                </div>
                <div>
                  <p className="text-[11px] text-[#7a7290]">Автопродление</p>
                  <p className={`text-[13px] font-semibold ${sub.subscription.autoRenew ? 'text-green-600' : 'text-[#7a7290]'}`}>
                    {sub.subscription.autoRenew ? 'Включено' : 'Отключено'}
                  </p>
                </div>
              </div>
              {sub.subscription.autoRenew && (
                <button
                  onClick={handleCancelAutoRenew}
                  disabled={cancelling}
                  className="text-[12px] text-red-400 hover:text-red-600 flex items-center gap-1 font-medium"
                >
                  {cancelling
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  Отменить
                </button>
              )}
            </div>
          </div>

          {/* Change plan */}
          <button
            onClick={() => setShowChangePlan(true)}
            className="flex items-center justify-between w-full rounded-xl border border-[#e8e4dc] bg-white px-4 py-3"
          >
            <p className="text-[13px] font-semibold text-[#2a2540]">Сменить тариф</p>
            <ChevronRight className="w-4 h-4 text-[#7a7290]" />
          </button>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-[#2a2540]">История оплат</h2>
            <Link href="/settings/payment-history" className="text-[12px] text-[#9c5e6c] font-medium">
              Показать все
            </Link>
          </div>
          <div className="rounded-xl border border-[#e8e4dc] bg-white divide-y divide-[#f4f3ef]">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#2a2540]">
                    {p.type === 'subscription' ? 'Подписка' : p.type}
                  </p>
                  <p className="text-[11px] text-[#7a7290]">
                    {formatDate(p.createdAt)} · {p.provider ? (PROVIDER_LABELS[p.provider] ?? p.provider) : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#2a2540]">{formatPrice(p.amount)}</p>
                  <p className={`text-[10px] font-semibold ${STATUS_COLORS[p.status] ?? 'text-[#7a7290]'}`}>
                    {p.status === 'completed' ? 'Оплачено'
                      : p.status === 'pending' ? 'Ожидает'
                      : p.status === 'failed' ? 'Ошибка'
                      : p.status === 'refunded' ? 'Возврат' : p.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showChangePlan && (
        <ChangePlanModal
          plans={plans}
          currentSub={sub}
          defaultMethod={defaultMethod}
          paying={paying}
          onClose={() => setShowChangePlan(false)}
          onSelect={handlePlanSelect}
        />
      )}

      {showDowngrade && (
        <DowngradeConfirmModal
          sub={sub}
          onConfirm={handleDowngrade}
          onClose={() => setShowDowngrade(false)}
          cancelling={cancelling}
        />
      )}

      {showPicker && selectedNewPlan && (
        <ProviderPicker
          onPick={p => void handlePay(selectedNewPlan!, p)}
          onClose={() => setShowPicker(false)}
          paying={paying}
        />
      )}
    </div>
  );
}
