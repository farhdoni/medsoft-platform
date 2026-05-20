'use client';

import Link from 'next/link';

interface PlanLimitModalProps {
  open: boolean;
  onClose: () => void;
  locale?: string;
  type?: 'chat' | 'checkup';
}

export function PlanLimitModal({ open, onClose, locale = 'ru', type = 'chat' }: PlanLimitModalProps) {
  if (!open) return null;

  const texts = {
    ru: {
      title: 'Лимит Free тарифа исчерпан',
      chat: 'Вы использовали 5 AI-сообщений в день. Обновитесь до Premium — безлимитный AI-чат, чекапы и чат с врачом.',
      checkup: 'Вы уже прошли чекап в этом месяце. Обновитесь до Premium — безлимитные чекапы, AI-чат и чат с врачом.',
      price: '29 000 сум/мес',
      upgrade: 'Обновить до Premium →',
      close: 'Закрыть',
    },
    uz: {
      title: 'Free tarif limiti tugadi',
      chat: 'Siz kuniga 5 ta AI-xabar ishlatdingiz. Premium ga yangilang — cheksiz AI-chat, checkup va shifokor bilan suhbat.',
      checkup: 'Siz bu oyda allaqachon checkup o\'tdingiz. Premium ga yangilang — cheksiz checkuplar, AI-chat va shifokor bilan suhbat.',
      price: '29 000 so\'m/oy',
      upgrade: 'Premium ga yangilash →',
      close: 'Yopish',
    },
    en: {
      title: 'Free plan limit reached',
      chat: 'You\'ve used 5 AI messages today. Upgrade to Premium — unlimited AI chat, checkups and doctor consultations.',
      checkup: 'You\'ve already taken a checkup this month. Upgrade to Premium — unlimited checkups, AI chat and doctor chat.',
      price: '29,000 UZS/month',
      upgrade: 'Upgrade to Premium →',
      close: 'Close',
    },
  };

  const t = texts[locale as keyof typeof texts] ?? texts.ru;
  const body = type === 'checkup' ? t.checkup : t.chat;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #f4e8f0 0%, #e8e4f8 100%)' }}
          >
            ⚡
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-extrabold text-center mb-2" style={{ color: '#2a2540' }}>
          {t.title}
        </h2>

        {/* Body */}
        <p className="text-[13px] text-center leading-relaxed mb-4" style={{ color: '#6a6580' }}>
          {body}
        </p>

        {/* Price chip */}
        <div
          className="flex items-center justify-center gap-2 rounded-2xl px-4 py-2 mb-5"
          style={{ background: 'linear-gradient(135deg, #f4e8f0 0%, #e8e4f8 100%)' }}
        >
          <span className="text-xl">👑</span>
          <span className="text-[14px] font-bold" style={{ color: '#9c5e6c' }}>Premium</span>
          <span className="text-[12px] font-semibold" style={{ color: '#8b6aae' }}>{t.price}</span>
        </div>

        {/* CTA */}
        <Link
          href={`/${locale}/pricing`}
          onClick={onClose}
          className="block w-full text-center py-4 rounded-2xl text-[14px] font-bold text-white mb-3 transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #8b6aae 100%)' }}
        >
          {t.upgrade}
        </Link>

        <button
          onClick={onClose}
          className="block w-full text-center py-3 rounded-2xl text-[13px] font-semibold transition hover:bg-gray-50"
          style={{ color: '#9a96a8' }}
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}
