'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Save, Loader2 } from 'lucide-react';

type Settings = { cardNumber?: string; bankName?: string; ownerName?: string } | null;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

export function PayoutClient() {
  const [form, setForm] = useState({ cardNumber: '', bankName: '', ownerName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/v1/aivita/doctor/earnings/payout-settings`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { data: Settings }) => {
        if (d.data) setForm({
          cardNumber: d.data.cardNumber ?? '',
          bankName: d.data.bankName ?? '',
          ownerName: d.data.ownerName ?? '',
        });
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch(`${API}/v1/aivita/doctor/earnings/payout-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-[#9c5e6c]" /></div>
  );

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[18px] font-bold text-[#2a2540] flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#9c5e6c]" />
          Настройки выплат
        </h1>
        <p className="text-[12px] text-[#7a7290]">Карта для получения выплат</p>
      </div>

      <div className="rounded-xl border border-[#e8e4dc] bg-white p-5 space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[#7a7290] uppercase tracking-wide">Владелец карты</label>
          <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
            placeholder="Иванов Иван Иванович"
            className="mt-1 w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[14px] outline-none focus:border-[#9c5e6c]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#7a7290] uppercase tracking-wide">Номер карты</label>
          <input value={form.cardNumber} onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value }))}
            placeholder="8600 0000 0000 0000" inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[14px] font-mono outline-none focus:border-[#9c5e6c]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#7a7290] uppercase tracking-wide">Банк</label>
          <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
            placeholder="Kapitalbank, Uzum Bank, IPAK YULI..."
            className="mt-1 w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[14px] outline-none focus:border-[#9c5e6c]" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Сохранено' : <><Save className="w-4 h-4" /> Сохранить</>}
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-[#f4f3ef] p-4 text-[12px] text-[#7a7290]">
        <p className="font-semibold text-[#2a2540] mb-1">Как работают выплаты</p>
        <p>Выплаты формируются ежемесячно. Сумма = выручка за консультации минус комиссия платформы 20%.</p>
        <p className="mt-1">Выплата поступает на карту в течение 3-5 рабочих дней после формирования ведомости.</p>
      </div>
    </div>
  );
}
