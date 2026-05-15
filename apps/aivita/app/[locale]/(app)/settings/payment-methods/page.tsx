'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/cabinet/dashboard/PageShell';

type PaymentMethod = {
  id: number;
  provider: string;
  cardLastFour: string | null;
  cardType: string | null;
  isDefault: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

const PROVIDER_STYLES: Record<string, { bg: string; label: string; hint: string; textColor: string }> = {
  click:  { bg: 'bg-[#00B4E6]', label: 'Click',  hint: 'UzCard, HUMO',                textColor: 'text-white' },
  payme:  { bg: 'bg-[#33CCCC]', label: 'Payme',  hint: 'UzCard, HUMO',                textColor: 'text-white' },
  uzum:   { bg: 'bg-[#7B2D8E]', label: 'Uzum',   hint: 'Visa, Mastercard, Uzum',      textColor: 'text-white' },
};

function cardTypeLabel(type: string | null) {
  const map: Record<string, string> = {
    uzcard: 'UzCard', humo: 'HUMO', visa: 'Visa', mastercard: 'Mastercard', uzum_wallet: 'Uzum кошелёк',
  };
  return type ? (map[type] ?? type) : '';
}

// ─── Card binding modal ───────────────────────────────────────────────────────

function AddCardModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [step, setStep] = useState<'provider' | 'card' | 'sms'>('provider');
  const [provider, setProvider] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [cardToken, setCardToken] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCardSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/v1/payments/${provider}/card/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardNumber: cardNumber.replace(/\s/g, ''), expiry }),
      });
      const data = await res.json();
      if (data.cardToken) {
        setCardToken(data.cardToken);
        setPhone(data.phone ?? '');
        setStep('sms');
      } else {
        setError('Не удалось добавить карту');
      }
    } catch {
      setError('Ошибка соединения');
    }
    setLoading(false);
  }

  async function handleSmsVerify() {
    setLoading(true);
    setError('');
    try {
      const verifyRes = await fetch(`${API}/v1/payments/${provider}/card/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cardToken, smsCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.verified) { setError('Неверный код'); setLoading(false); return; }

      const lastFour = cardNumber.replace(/\s/g, '').slice(-4);
      const rawNum = cardNumber.replace(/\s/g, '');
      let cardType: string | null = null;
      if (rawNum.startsWith('8600') || rawNum.startsWith('9860')) cardType = 'uzcard';
      else if (rawNum.startsWith('9012')) cardType = 'humo';
      else if (rawNum.startsWith('4')) cardType = 'visa';
      else if (rawNum.startsWith('5')) cardType = 'mastercard';

      await fetch(`${API}/v1/aivita/payment-methods/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider, cardToken, cardLastFour: lastFour, cardType }),
      });
      onAdded();
      onClose();
    } catch {
      setError('Ошибка верификации');
    }
    setLoading(false);
  }

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-2xl bg-white p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        {step === 'provider' && (
          <>
            <h3 className="text-[16px] font-bold text-[#2a2540] mb-4">Привязать карту</h3>
            <div className="space-y-2">
              {Object.entries(PROVIDER_STYLES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setProvider(key); setStep('card'); }}
                  className={`w-full rounded-xl ${val.bg} ${val.textColor} py-3.5 text-[14px] font-bold flex items-center justify-between px-5`}
                >
                  <span>{val.label}</span>
                  <span className="text-[11px] opacity-80">{val.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'card' && (
          <>
            <h3 className="text-[16px] font-bold text-[#2a2540] mb-1">
              Карта {PROVIDER_STYLES[provider]?.label}
            </h3>
            <p className="text-[12px] text-[#7a7290] mb-4">Введите данные карты — только токен будет сохранён</p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#7a7290] uppercase tracking-wide">Номер карты</label>
                <input
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="8600 0000 0000 0000"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[15px] font-mono outline-none focus:border-[#9c5e6c]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#7a7290] uppercase tracking-wide">Срок действия</label>
                <input
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[15px] font-mono outline-none focus:border-[#9c5e6c]"
                />
              </div>
              {error && <p className="text-red-500 text-[12px]">{error}</p>}
              <button
                onClick={handleCardSubmit}
                disabled={loading || cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 4}
                className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[14px] font-bold disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Получить SMS-код'}
              </button>
            </div>
          </>
        )}

        {step === 'sms' && (
          <>
            <h3 className="text-[16px] font-bold text-[#2a2540] mb-1">Подтверждение</h3>
            <p className="text-[12px] text-[#7a7290] mb-4">SMS-код отправлен на {phone}</p>
            <div className="space-y-3">
              <input
                value={smsCode}
                onChange={e => setSmsCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                className="w-full rounded-xl border border-[#e8e4dc] px-4 py-3 text-[18px] font-mono text-center tracking-[0.3em] outline-none focus:border-[#9c5e6c]"
              />
              {error && <p className="text-red-500 text-[12px]">{error}</p>}
              <button
                onClick={handleSmsVerify}
                disabled={loading || smsCode.length < 4}
                className="w-full rounded-xl bg-[#9c5e6c] text-white py-3.5 text-[14px] font-bold disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Привязать карту'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    const res = await fetch(`${API}/v1/aivita/payment-methods`, { credentials: 'include' });
    const data = await res.json();
    setMethods(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    await fetch(`${API}/v1/aivita/payment-methods/${id}`, { method: 'DELETE', credentials: 'include' });
    await load();
  }

  async function handleSetDefault(id: number) {
    await fetch(`${API}/v1/aivita/payment-methods/${id}/set-default`, { method: 'POST', credentials: 'include' });
    await load();
  }

  return (
    <PageShell active="settings">
      <div className="max-w-[480px] mx-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#2a2540]">Способы оплаты</h1>
            <p className="text-[12px] text-[#7a7290]">Привязанные карты</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#9c5e6c] text-white px-3 py-2 text-[13px] font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#9c5e6c]" />
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e8e4dc] bg-white p-8 text-center">
            <CreditCard className="w-10 h-10 text-[#e8e4dc] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#2a2540]">Нет привязанных карт</p>
            <p className="text-[12px] text-[#7a7290] mt-1">Добавьте карту для быстрой оплаты</p>
          </div>
        ) : (
          <div className="space-y-2">
            {methods.map(method => {
              const style = PROVIDER_STYLES[method.provider] ?? PROVIDER_STYLES.click;
              return (
                <div key={method.id} className="rounded-xl border border-[#e8e4dc] bg-white p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0`}>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#2a2540]">
                        {cardTypeLabel(method.cardType) || style.label} **** {method.cardLastFour ?? '????'}
                      </p>
                      {method.isDefault && (
                        <span className="text-[10px] bg-[#9c5e6c]/10 text-[#9c5e6c] rounded-full px-2 py-0.5 font-semibold">
                          Основная
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7a7290]">{style.label} · {style.hint}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="p-1.5 rounded-lg hover:bg-[#f4f3ef] text-[#7a7290]"
                        title="Сделать основной"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(method.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <AddCardModal
            onClose={() => setShowModal(false)}
            onAdded={() => load()}
          />
        )}
      </div>
    </PageShell>
  );
}
