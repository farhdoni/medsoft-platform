'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const PROXY = '/api/proxy';

interface PharmacyResult {
  pharmacyId: number;
  pharmacyName: string;
  pharmacyLogo?: string | null;
  productId: number;
  productName: string;
  dosage?: string | null;
  form?: string | null;
  price: number;
  oldPrice?: number | null;
  stock: number;
  branchId?: number | null;
  branchName?: string | null;
  branchAddress?: string | null;
  distanceKm?: number | null;
  deliveryEnabled: boolean;
  deliveryPrice: number;
  freeDeliveryFrom?: number | null;
  promo?: { title: string | null; discountType: string | null; discountValue: number | null } | null;
}

function fmtPrice(v: number) {
  return v.toLocaleString('ru') + ' сум';
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function PromoTag({ promo }: { promo: NonNullable<PharmacyResult['promo']> }) {
  const label = promo.discountType === 'percent'
    ? `-${promo.discountValue}%`
    : promo.title ?? 'Акция';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: '#FDE8E8', color: '#C44' }}>
      {label}
    </span>
  );
}

export default function PharmacySearchPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'ru';
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialDrug = searchParams?.get('drug') ?? '';
  const [drug, setDrug] = useState(initialDrug);
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [ordering, setOrdering] = useState<number | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  // Get user location once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLat(pos.coords.latitude); setUserLon(pos.coords.longitude); },
        () => {},
        { timeout: 5000 },
      );
    }
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const qs = new URLSearchParams({ drug: query });
      if (userLat != null) qs.set('lat', String(userLat));
      if (userLon != null) qs.set('lon', String(userLon));
      const j = await fetch(`${PROXY}/pharmacy/search?${qs}`).then(r => r.json());
      setResults(j.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [userLat, userLon]);

  // Auto-search if drug param passed
  useEffect(() => {
    if (initialDrug) void search(initialDrug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDrug]);

  async function handleOrder(result: PharmacyResult) {
    setOrdering(result.productId);
    try {
      const j = await fetch(`${PROXY}/pharmacy/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: result.pharmacyId,
          branchId: result.branchId,
          items: [{ productId: result.productId, name: result.productName, qty: 1, price: result.price }],
          deliveryType: 'pickup',
        }),
      }).then(r => r.json());

      if (j.data?.id) {
        setOrderSuccess(true);
        setTimeout(() => router.push(`/${locale}/pharmacy/orders`), 1500);
      }
    } finally {
      setOrdering(null);
    }
  }

  return (
    <div className="max-w-[480px] mx-auto" style={{ background: '#f4f3ef', minHeight: '100vh' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-12 pb-3"
        style={{ background: 'rgba(244,243,239,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a2540" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold" style={{ color: '#2a2540' }}>Аптеки-партнёры</h1>
            <p className="text-xs" style={{ color: '#9a96a8' }}>Поиск лекарств рядом с вами</p>
          </div>
          <Link href={`/${locale}/pharmacy/orders`} className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: '#e8f5e9', color: '#2E8B57' }}>
            Мои заказы
          </Link>
        </div>

        {/* Search bar */}
        <form onSubmit={e => { e.preventDefault(); void search(drug); }} className="flex gap-2">
          <input
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }}
            placeholder="Название лекарства..."
            value={drug}
            onChange={e => setDrug(e.target.value)}
            autoFocus={!initialDrug}
          />
          <button type="submit"
            className="px-4 py-3 rounded-2xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: '#2E8B57' }}>
            Найти
          </button>
        </form>
      </div>

      <div className="px-4 pb-24 pt-2">
        {/* Success banner */}
        {orderSuccess && (
          <div className="mb-4 rounded-2xl p-4 text-center font-semibold text-white"
            style={{ background: '#2E8B57' }}>
            ✅ Заказ оформлен! Перенаправляем...
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
              style={{ borderColor: '#2E8B57', borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏪</div>
            <p className="font-semibold text-[#2a2540] mb-1">Не найдено</p>
            <p className="text-sm text-[#9a96a8]">Попробуйте другое название или МНН препарата</p>
          </div>
        )}

        {/* Initial hint */}
        {!loading && !searched && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💊</div>
            <p className="font-semibold text-[#2a2540] mb-1">Найдите лекарство</p>
            <p className="text-sm text-[#9a96a8]">Введите название препарата или МНН</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[#9a96a8] mb-1">Найдено: {results.length} предложений</p>
            {results.map((r, i) => (
              <div key={`${r.pharmacyId}-${r.productId}-${i}`}
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: '1px solid #e8e4dc', borderLeft: '4px solid #2E8B57' }}>
                {/* Pharmacy header */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                  {r.pharmacyLogo ? (
                    <img src={r.pharmacyLogo} alt={r.pharmacyName}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: '#2E8B57' }}>
                      {initials(r.pharmacyName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2a2540] truncate">{r.pharmacyName}</p>
                    {r.branchAddress && (
                      <p className="text-[10px] text-[#9a96a8] truncate">📍 {r.branchAddress}</p>
                    )}
                  </div>
                  {r.distanceKm != null && (
                    <span className="text-[10px] font-semibold text-[#2E8B57] flex-shrink-0">
                      {r.distanceKm < 1
                        ? `${Math.round(r.distanceKm * 1000)} м`
                        : `${r.distanceKm.toFixed(1)} км`}
                    </span>
                  )}
                </div>

                {/* Product info */}
                <div className="px-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2a2540] leading-snug">{r.productName}</p>
                      {(r.dosage || r.form) && (
                        <p className="text-[11px] text-[#9a96a8] mt-0.5">
                          {[r.dosage, r.form].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-base font-extrabold" style={{ color: '#2a2540' }}>
                          {fmtPrice(r.price)}
                        </span>
                        {r.oldPrice && r.oldPrice > r.price && (
                          <span className="text-xs line-through text-[#bbb]">{fmtPrice(r.oldPrice)}</span>
                        )}
                        {r.promo && <PromoTag promo={r.promo} />}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-semibold" style={{ color: r.stock > 0 ? '#2E8B57' : '#e55' }}>
                        {r.stock > 0 ? `В наличии: ${r.stock}` : 'Нет в наличии'}
                      </p>
                      {r.deliveryEnabled && (
                        <p className="text-[10px] text-[#9a96a8] mt-0.5">
                          🚚 {r.deliveryPrice === 0 ? 'Бесплатно' : fmtPrice(r.deliveryPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order button */}
                {r.stock > 0 && (
                  <button
                    onClick={() => void handleOrder(r)}
                    disabled={ordering === r.productId}
                    className="w-full py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #2E8B57, #1a6b3c)' }}>
                    {ordering === r.productId ? 'Оформляем...' : 'Заказать'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
