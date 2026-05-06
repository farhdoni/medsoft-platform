'use client';

import { useState } from 'react';
import Link from 'next/link';

type HealthProfile = {
  birthDate?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: string | null;
  smokingStatus?: string | null;
  alcoholFrequency?: string | null;
  exerciseFrequency?: string | null;
  dietType?: string | null;
  city?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  doctorName?: string | null;
  insuranceCompany?: string | null;
  insuranceNumber?: string | null;
};

type Allergy = { id: string; allergen: string; type: string; severity?: string };
type ChronicCondition = { id: string; name: string; diagnosedYear?: number | null };
type HistoryEntry = { id: string; name: string; type: string; startDate?: string | null };

interface Props {
  locale: string;
  profile: HealthProfile | null;
  allergies: Allergy[];
  chronic: ChronicCondition[];
  history: HistoryEntry[];
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] bg-white border border-[#e8e4dc] p-4 mb-3">
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9a96a8' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#f0ede8] last:border-0">
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: value ? '#2a2540' : '#cc8a96' }}>
        {value || '+ добавить'}
      </span>
    </div>
  );
}

// ─── Passport accordion ───────────────────────────────────────────────────────

function PassportAccordion({ birthDate }: { birthDate?: string | null }) {
  const [open, setOpen] = useState(false);
  const formatted = birthDate ? new Date(birthDate).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="border border-[#e8e4dc] rounded-[12px] mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f9f8f5] transition"
      >
        <span className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>🪪 Паспортные данные</span>
        <span className="text-[11px] font-semibold" style={{ color: '#9a96a8' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[#e8e4dc]">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] bg-[#d4e8d8] text-[#548068] font-bold px-2 py-0.5 rounded-full">🔒 Зашифровано e2e</span>
          </div>
          <Row label="Дата рождения" value={formatted} />
          <Row label="Серия / Номер" value={null} />
          <Row label="Кем выдан" value={null} />
          <Row label="Дата выдачи" value={null} />
          <Row label="Срок действия" value={null} />
        </div>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function ProfileClient({ locale, profile, allergies, chronic, history }: Props) {
  const genderLabel = profile?.gender === 'male' ? 'Мужской' : profile?.gender === 'female' ? 'Женский' : null;

  const smokingLabels: Record<string, string> = { never: 'Никогда', quit: 'Бросил', sometimes: 'Иногда', regular: 'Регулярно' };
  const alcoholLabels: Record<string, string> = { never: 'Никогда', rarely: 'Редко', moderate: 'Умеренно', regular: 'Регулярно' };
  const activityLabels: Record<string, string> = { sedentary: 'Сидячий', light: 'Лёгкая', moderate: 'Умеренная', active: 'Активный' };
  const dietLabels: Record<string, string> = { regular: 'Обычное', vegetarian: 'Вегетарианское', vegan: 'Веганское', halal: 'Халяль' };

  return (
    <>
      {/* ── Two-column grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">

        {/* Left: Personal data */}
        <Card title="Личные данные" icon="👤">
          <PassportAccordion birthDate={profile?.birthDate} />
          <Row label="Пол" value={genderLabel} />
          <Row label="Город" value={profile?.city} />
          <Row label="Телефон" value={profile?.phone} />
          <Row label="Telegram" value={null} />
          <Row label="WhatsApp" value={null} />
        </Card>

        {/* Right: Lifestyle */}
        <Card title="Образ жизни" icon="🌿">
          <Row label="Курение" value={profile?.smokingStatus ? smokingLabels[profile.smokingStatus] ?? profile.smokingStatus : null} />
          <Row label="Алкоголь" value={profile?.alcoholFrequency ? alcoholLabels[profile.alcoholFrequency] ?? profile.alcoholFrequency : null} />
          <Row label="Активность" value={profile?.exerciseFrequency ? activityLabels[profile.exerciseFrequency] ?? profile.exerciseFrequency : null} />
          <Row label="Питание" value={profile?.dietType ? dietLabels[profile.dietType] ?? profile.dietType : null} />
          <Row label="Режим сна" value={null} />
          <Row label="Уровень стресса" value={null} />
        </Card>

        {/* Left: Medical profile */}
        <Card title="Медицинский профиль" icon="🏥">
          {/* Allergies */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>Аллергии</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>{allergies.length}</span>
            </div>
            {allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {allergies.map(a => (
                  <span key={a.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f0d4dc]" style={{ color: '#9c5e6c' }}>{a.allergen}</span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-medium" style={{ color: '#cc8a96' }}>+ добавить</p>
            )}
          </div>
          {/* Chronic */}
          <div className="mb-2 pt-2 border-t border-[#f0ede8]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>Хронические</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d4dff0]" style={{ color: '#5e75a8' }}>{chronic.length}</span>
            </div>
            {chronic.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {chronic.map(c => (
                  <span key={c.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#d4dff0]" style={{ color: '#5e75a8' }}>{c.name}</span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-medium" style={{ color: '#cc8a96' }}>+ добавить</p>
            )}
          </div>
          {/* History */}
          <div className="pt-2 border-t border-[#f0ede8]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px]" style={{ color: '#9a96a8' }}>История болезней</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#d4e8d8]" style={{ color: '#548068' }}>{history.length}</span>
            </div>
            {history.length > 0 ? (
              <div className="space-y-1">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: '#2a2540' }}>{h.name}</span>
                    {h.startDate && <span className="text-[11px]" style={{ color: '#9a96a8' }}>{new Date(h.startDate).getFullYear()}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-medium" style={{ color: '#cc8a96' }}>+ добавить</p>
            )}
          </div>
          <div className="pt-2 border-t border-[#f0ede8] mt-2">
            <Row label="Препараты" value={null} />
            <Row label="Прививки" value={null} />
            <Row label="Операции" value={null} />
          </div>
        </Card>

        {/* Right: Emergency contacts */}
        <Card title="Экстренные контакты" icon="🆘">
          <Row label="Контактное лицо" value={profile?.emergencyContactName} />
          <Row label="Телефон" value={profile?.emergencyContactPhone} />
          <Row label="Кем приходится" value={profile?.emergencyContactRelation} />
          <Row label="Мой врач" value={profile?.doctorName} />
          <Row label="Телефон врача" value={null} />
          <Row label="Моя клиника" value={null} />
        </Card>

        {/* Left: Family */}
        <Card title="Моя семья" icon="👨‍👩‍👧">
          <p className="text-[13px] text-center py-3" style={{ color: '#9a96a8' }}>Нет членов семьи</p>
          <Link
            href={`/${locale}/family`}
            className="block text-center text-[13px] font-semibold py-2 rounded-[12px] border border-[#e8e4dc] hover:bg-[#f4f3ef] transition"
            style={{ color: '#6e5fa0' }}
          >
            + Пригласить члена семьи
          </Link>
          <div className="mt-3 rounded-[10px] bg-[#f4f3ef] p-3">
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#6a6580' }}>Семья видит:</p>
            <p className="text-[11px]" style={{ color: '#9a96a8' }}>Health Score, шаги, вода</p>
            <p className="text-[11px] font-semibold mt-1 mb-0.5" style={{ color: '#6a6580' }}>Семья НЕ видит:</p>
            <p className="text-[11px]" style={{ color: '#9a96a8' }}>AI-чат, документы, паспорт</p>
          </div>
        </Card>

        {/* Right: Insurance */}
        <Card title="Страхование" icon="🛡️">
          <Row label="Страховая компания" value={profile?.insuranceCompany} />
          <Row label="Номер полиса" value={profile?.insuranceNumber} />
          <Row label="Срок действия" value={null} />
          <Row label="Горячая линия" value={null} />
        </Card>
      </div>
    </>
  );
}
