'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const PROXY = '/api/proxy';

interface OrderItem { productId: number; name: string; qty: number; price: number; }

interface PharmacyOrder {
  id: number;
  pharmacyId: number;
  pharmacyName?: string | null;
  pharmacyLogo?: string | null;
  branchId?: number | null;
  items: OrderItem[];
  totalPrice: number;
  commissionAmount: number;
  deliveryType?: string | null;
  deliveryAddress?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  assembled: 'Собирается',
  ready: 'Готов к выдаче',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const STATUS_COLOR: Record<string, string> = {
  new: '#9a96a8',
  confirmed: '#2E8B57',
  assembled: '#f0a520',
  ready: '#2E8B57',
  delivered: '#2E8B57',
  cancelled: '#e55',
};

function fmtPrice(v: number) {
  return v.toLocaleString('ru') + ' сум';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}
function initials(name: string) {
  return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function PharmacyOrdersClient() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'ru';
  const router = useRouter();
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${PROXY}/pharmacy/orders`)
      .then(r => r.json())
      .then(j => { setOrders(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Section title — header replaced by PageShell TopBar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold" style={{ color: '#2a2540' }}>Мои заказы</h1>
          <p className="text-xs" style={{ color: '#9a96a8' }}>Заказы в аптеках-партнёрах</p>
        </div>
        <Link href={`/${locale}/pharmacy/search`} className="text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: '#e8f5e9', color: '#2E8B57' }}>
          🔍 Поиск
        </Link>
      </div>

      <div className="pb-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-[3px] rounded-full animate-spin"
              style={{ borderColor: '#2E8B57', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏪</div>
            <p className="font-semibold text-[#2a2540] mb-1">Заказов пока нет</p>
            <p className="text-sm text-[#9a96a8] mb-6">
              Купите лекарства из назначения врача в аптеке-партнёре
            </p>
            <Link href={`/${locale}/pharmacy/search`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: '#2E8B57' }}>
              🔍 Найти лекарство
            </Link>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl overflow-hidden"
                style={{ border: '1px solid #e8e4dc', borderLeft: '4px solid #2E8B57' }}>
                {/* Pharmacy + status */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                  {order.pharmacyLogo ? (
                    <img src={order.pharmacyLogo} alt={order.pharmacyName ?? ''}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: '#2E8B57' }}>
                      {initials(order.pharmacyName ?? 'А')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2a2540] truncate">
                      {order.pharmacyName ?? `Аптека #${order.pharmacyId}`}
                    </p>
                    <p className="text-[10px] text-[#9a96a8]">{fmtDate(order.createdAt)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: STATUS_COLOR[order.status] + '20',
                      color: STATUS_COLOR[order.status],
                    }}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                {/* Items */}
                <div className="px-4 pb-2 space-y-1">
                  {(order.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-[#2a2540] flex-1 min-w-0 truncate">
                        {item.name} × {item.qty}
                      </span>
                      <span className="font-semibold text-[#2a2540] ml-2 flex-shrink-0">
                        {fmtPrice(item.qty * item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 flex items-center justify-between"
                  style={{ borderTop: '1px solid #f0ece4' }}>
                  <div className="text-xs text-[#9a96a8]">
                    {order.deliveryType === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
                    {order.deliveryAddress && (
                      <span className="ml-1">· {order.deliveryAddress}</span>
                    )}
                  </div>
                  <span className="text-sm font-extrabold" style={{ color: '#2a2540' }}>
                    {fmtPrice(order.totalPrice)}
                  </span>
                </div>

                {/* Order number */}
                <div className="px-4 pb-2">
                  <p className="text-[10px] text-[#bbb]">Заказ №{order.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
