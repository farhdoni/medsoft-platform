'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Percent, Wallet, Stethoscope, Loader2 } from 'lucide-react';
import Link from 'next/link';

type EarningsData = {
  gross: number;
  commission: number;
  net: number;
  commissionPercent: number;
  consultations: number;
  payoutsHistory: Array<{ id: number; amount: number; period: string; status: string; paidAt: string | null; createdAt: string }>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' сум'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }); }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ожидает',     color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'В обработке', color: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Выплачено',   color: 'bg-green-100 text-green-700' },
};

export function EarningsClient() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/v1/aivita/doctor/earnings`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-[#9c5e6c]" /></div>
  );

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-bold text-[#2a2540] flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#9c5e6c]" />
          Доходы
        </h1>
        <p className="text-[12px] text-[#7a7290]">Текущий месяц</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-white border border-[#e8e4dc] p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-4 h-4 text-[#9c5e6c]" />
            <p className="text-[11px] text-[#7a7290]">Консультации</p>
          </div>
          <p className="text-[22px] font-bold text-[#2a2540]">{data?.consultations ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e8e4dc] p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-[11px] text-[#7a7290]">Валовой доход</p>
          </div>
          <p className="text-[16px] font-bold text-[#2a2540]">{fmt(data?.gross ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-white border border-[#e8e4dc] p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-red-400" />
            <p className="text-[11px] text-[#7a7290]">Комиссия {data?.commissionPercent}%</p>
          </div>
          <p className="text-[16px] font-bold text-red-400">-{fmt(data?.commission ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-[#9c5e6c] p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-white/70" />
            <p className="text-[11px] text-white/70">К выплате</p>
          </div>
          <p className="text-[16px] font-bold text-white">{fmt(data?.net ?? 0)}</p>
        </div>
      </div>

      <Link href="/doctor-settings/payout"
        className="flex items-center justify-between rounded-xl bg-white border border-[#e8e4dc] px-4 py-3 mb-5">
        <p className="text-[13px] font-semibold text-[#2a2540]">Настройки выплат</p>
        <svg className="w-4 h-4 text-[#7a7290]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {(data?.payoutsHistory?.length ?? 0) > 0 && (
        <>
          <h2 className="text-[14px] font-bold text-[#2a2540] mb-3">История выплат</h2>
          <div className="rounded-xl border border-[#e8e4dc] bg-white divide-y divide-[#f4f3ef]">
            {data!.payoutsHistory.map(p => {
              const st = STATUS_LABELS[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#2a2540]">{p.period ?? fmtDate(p.createdAt)}</p>
                    {p.paidAt && <p className="text-[11px] text-[#7a7290]">Выплачено {fmtDate(p.paidAt)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-[#2a2540]">{fmt(p.amount)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
