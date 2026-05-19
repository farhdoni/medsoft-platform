'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, Calendar, CreditCard, Check, Loader2, ChevronRight, XCircle } from 'lucide-react';

type Plan = { id: number; name: string; slug: string; price: number; period: string; features: string[] };
type Sub = {
  subscription: { id: number; status: string; expiresAt: string; autoRenew: boolean; planId: number };
  plan: Plan;
} | null;
type Payment = {
  id: number; type: string; amount: number; provider: string | null;
  status: string; createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatPrice(p: number) {
  return p.toLocaleString('ru-RU') + ' сум';
}
function periodLabel(p: string) {
  return p === 'annual' ? 'в год' : p === 'monthly' ? 'в месяц' : '';
}
const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-600',
  pending: 'text-yellow-600',
  failed: 'text-red-500',
  refunded: 'text-blue-500',
};
const PROVIDER_LABELS: Record<string, string> = { click: 'Click', payme: 'Payme', uzum: 'Uzum' };

export function SubscriptionClient({ showSuccess }: { showSuccess: boolean }) {
  const [sub, setSub] = useState<Sub>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function load() {
      const [subRes, histRes] = await Promise.all([
        fetch(`${API}/v1/aivita/payments/subscription`, { credentials: 'include' }),
        fetch(`${API}/v1/aivita/payments/history`, { credentials: 'include' }),
      ]);
      const [s, h] = await Promise.all([subRes.json(), histRes.json()]);
      setSub(s.data);
      setPayments((h.data ?? []).slice(0, 10));
      setLoading(false);
    }
    void load();
  }, []);

  async function handleCancelAutoRenew() {
    setCancelling(true);
    await fetch(`${API}/v1/aivita/payments/subscription/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    const res = await fetch(`${API}/v1/aivita/payments/subscription`, { credentials: 'include' });
    const data = await res.json();
    setSub(data.data);
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
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9c5e6c] text-white px-5 py-2.5 text-[13px] font-bold"
          >
            Выбрать тариф <ChevronRight className="w-4 h-4" />
          </Link>
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
                  {formatPrice(sub.plan.price)} {periodLabel(sub.plan.period)}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                sub.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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

          {/* Expiry & auto-renew */}
          <div className="rounded-xl border border-[#e8e4dc] bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f4f3ef] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#9c5e6c]" />
              </div>
              <div>
                <p className="text-[11px] text-[#7a7290]">Действует до</p>
                <p className="text-[13px] font-semibold text-[#2a2540]">{formatDate(sub.subscription.expiresAt)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f4f3ef] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#9c5e6c]" />
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
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Отменить
                </button>
              )}
            </div>
          </div>

          <Link
            href="/pricing"
            className="flex items-center justify-between rounded-xl border border-[#e8e4dc] bg-white px-4 py-3"
          >
            <p className="text-[13px] font-semibold text-[#2a2540]">Сменить тариф</p>
            <ChevronRight className="w-4 h-4 text-[#7a7290]" />
          </Link>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mt-5">
          <h2 className="text-[14px] font-bold text-[#2a2540] mb-3">История оплат</h2>
          <div className="rounded-xl border border-[#e8e4dc] bg-white divide-y divide-[#f4f3ef]">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#2a2540] capitalize">{p.type === 'subscription' ? 'Подписка' : p.type}</p>
                  <p className="text-[11px] text-[#7a7290]">
                    {formatDate(p.createdAt)} · {p.provider ? PROVIDER_LABELS[p.provider] ?? p.provider : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-[#2a2540]">{formatPrice(p.amount)}</p>
                  <p className={`text-[10px] font-semibold capitalize ${STATUS_COLORS[p.status] ?? 'text-[#7a7290]'}`}>{
                    p.status === 'completed' ? 'Оплачено' :
                    p.status === 'pending' ? 'Ожидает' :
                    p.status === 'failed' ? 'Ошибка' :
                    p.status === 'refunded' ? 'Возврат' : p.status
                  }</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
