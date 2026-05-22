'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, Gift, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Friend = {
  id: number;
  referredId: string;
  status: string;
  rewardGiven: boolean;
  createdAt: string;
  friendName: string;
};

type ReferralData = {
  referralCode: string | null;
  referralLink: string | null;
  totalInvited: number;
  bonusesEarned: number;
  friends: Friend[];
};

export function ReferralClient() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetch('/api/proxy/referral/my')
      .then(r => r.json())
      .then(j => { setData(j.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function copy(text: string, type: 'code' | 'link') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'code') { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
      else { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }
    });
  }

  function share() {
    if (!data?.referralLink) return;
    const text = `Привет! Попробуй AIVITA — AI-платформа здоровья. Зарегистрируйся по моей ссылке и мы оба получим 1 месяц Premium бесплатно! ${data.referralLink}`;
    if (navigator.share) {
      navigator.share({ title: 'AIVITA — Приглашение', text, url: data.referralLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => alert('Текст скопирован! Вставьте в мессенджер.')).catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#e8e4dc] border-t-[#9c5e6c] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto px-4 pb-10">
      {/* Back */}
      <div className="flex items-center gap-2 mb-5 pt-2">
        <Link href={`/${locale}/settings`} className="flex items-center gap-1 text-[13px] text-[#9a96a8] hover:text-[#2a2540] transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Настройки
        </Link>
      </div>

      {/* Hero */}
      <div className="rounded-3xl p-6 mb-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #8b6aae 100%)' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div className="text-4xl mb-3">🎁</div>
        <h1 className="text-[22px] font-extrabold text-white leading-tight mb-1">Пригласи друга</h1>
        <p className="text-[13px] text-white/75">Поделись ссылкой — оба получите 1 месяц Premium бесплатно</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 text-center">
          <div className="text-[28px] font-extrabold text-[#2a2540]">{data?.totalInvited ?? 0}</div>
          <div className="text-[11px] text-[#9a96a8] mt-0.5">Приглашено друзей</div>
        </div>
        <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 text-center">
          <div className="text-[28px] font-extrabold text-[#9c5e6c]">{data?.bonusesEarned ?? 0}</div>
          <div className="text-[11px] text-[#9a96a8] mt-0.5">Месяцев Premium</div>
        </div>
      </div>

      {/* Code */}
      {data?.referralCode && (
        <div className="bg-white border border-dashed border-[#d4c8e0] rounded-2xl p-5 mb-4">
          <p className="text-[11px] font-semibold text-[#9a96a8] mb-2 uppercase tracking-wider">Ваш код</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[28px] font-black tracking-[6px] text-[#2a2540]">{data.referralCode}</span>
            <button
              onClick={() => copy(data.referralCode!, 'code')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{ background: codeCopied ? '#e8f5e8' : '#f4f3ef', color: codeCopied ? '#2a7040' : '#2a2540' }}
            >
              {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {codeCopied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
        </div>
      )}

      {/* Link */}
      {data?.referralLink && (
        <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-[#9a96a8] mb-2 uppercase tracking-wider">Ваша ссылка</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[12px] text-[#7a7290] truncate font-mono">{data.referralLink}</span>
            <button
              onClick={() => copy(data.referralLink!, 'link')}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{ background: linkCopied ? '#e8f5e8' : '#f4f3ef', color: linkCopied ? '#2a7040' : '#2a2540' }}
            >
              {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'OK' : 'Копировать'}
            </button>
          </div>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-bold text-white mb-6 transition active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, #9c5e6c 0%, #8b6aae 100%)' }}
      >
        <Share2 className="w-4 h-4" />
        Поделиться в мессенджере
      </button>

      {/* How it works */}
      <div className="bg-white border border-[#e8e4dc] rounded-2xl p-4 mb-5">
        <p className="text-[13px] font-bold text-[#2a2540] mb-3">Как это работает</p>
        <div className="space-y-3">
          {[
            { icon: '📤', text: 'Поделитесь своим кодом или ссылкой с другом' },
            { icon: '✍️', text: 'Друг регистрируется по вашей ссылке' },
            { icon: '✅', text: 'Друг подтверждает email' },
            { icon: '🎁', text: 'Вы оба получаете 1 месяц Premium бесплатно' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: '#f4f3ef' }}>
                {step.icon}
              </div>
              <p className="text-[12px] text-[#5a5470] leading-relaxed pt-1">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Friends list */}
      {(data?.friends?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[#9c5e6c]" />
            <p className="text-[13px] font-bold text-[#2a2540]">Приглашённые друзья</p>
          </div>
          <div className="space-y-2">
            {data!.friends.map(friend => (
              <div key={friend.id} className="bg-white border border-[#e8e4dc] rounded-2xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-[#2a2540]">{friend.friendName}</p>
                  <p className="text-[11px] text-[#9a96a8]">
                    {new Date(friend.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: friend.rewardGiven ? '#e8f5e8' : '#f4f3ef',
                    color: friend.rewardGiven ? '#2a7040' : '#9a96a8',
                  }}
                >
                  {friend.rewardGiven ? '✓ Бонус' : 'Ожидает'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.friends?.length ?? 0) === 0 && (
        <div className="text-center py-8">
          <Gift className="w-10 h-10 text-[#e8e4dc] mx-auto mb-2" />
          <p className="text-[13px] text-[#9a96a8]">Пока никого не пригласили</p>
          <p className="text-[12px] text-[#c4c0cc] mt-1">Поделитесь ссылкой — первый бонус уже ждёт вас!</p>
        </div>
      )}
    </div>
  );
}
