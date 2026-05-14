'use client';
import * as React from 'react';
import Link from 'next/link';
import type { MedicalCardData } from './page';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined, fallback = '—') {
  return v?.trim() || fallback;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const ms = Date.now() - new Date(dob).getTime();
  const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
  return `${years} лет`;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Мужской', female: 'Женский', other: 'Другой',
};

const BLOOD_TYPE_MAP: Record<string, string> = {
  'A+': 'A (II) Rh+', 'A-': 'A (II) Rh−',
  'B+': 'B (III) Rh+', 'B-': 'B (III) Rh−',
  'AB+': 'AB (IV) Rh+', 'AB-': 'AB (IV) Rh−',
  'O+': 'O (I) Rh+', 'O-': 'O (I) Rh−',
};

const SMOKING_LABELS: Record<string, string> = {
  none: 'Не курю', occasional: 'Иногда', regular: 'Регулярно', ex: 'Бросил(а)',
};
const ALCOHOL_LABELS: Record<string, string> = {
  none: 'Не употребляю', occasional: 'Изредка', moderate: 'Умеренно', often: 'Часто',
};
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Малоактивный', light: 'Лёгкая активность',
  moderate: 'Умеренная активность', active: 'Высокая активность',
};
const SLEEP_LABELS: Record<string, string> = {
  '<6': 'Менее 6 часов', '6-7': '6–7 часов', '7-8': '7–8 часов', '8-9': '8–9 часов', '>9': 'Более 9 часов',
};

// ─── QR Code (simple data URL via canvas) ────────────────────────────────────

function QrPlaceholder({ code }: { code: string }) {
  // Simple visual placeholder — real QR would use a library
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-2xl p-3"
      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', width: 90, height: 90 }}
    >
      <div className="grid grid-cols-5 gap-[2px]">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: 2,
              background: (i % 7 === 0 || i % 3 === 0 || i === 12) ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
      <span className="text-[9px] font-bold text-white/80 mt-1 tracking-wide">{code}</span>
    </div>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
  icon, title, children, defaultOpen = false, badge,
}: {
  icon: string; title: string; children: React.ReactNode;
  defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid #e8e4dc', background: 'white' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-xl">{icon}</span>
        <span className="flex-1 text-[14px] font-semibold" style={{ color: '#2a2540' }}>{title}</span>
        {badge && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-light, #f0d4dc)', color: 'var(--accent, #9c5e6c)' }}
          >
            {badge}
          </span>
        )}
        <span style={{ color: '#9a96a8', fontSize: 16, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: '#f0ece4' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0" style={{ borderColor: '#f5f3ef' }}>
      <span className="text-[12px]" style={{ color: '#9a96a8' }}>{label}</span>
      <span className="text-[13px] font-medium text-right ml-4 max-w-[55%]" style={{ color: '#2a2540' }}>{value}</span>
    </div>
  );
}

function Tag({ label, color = '#f0d4dc', textColor = '#9c5e6c' }: { label: string; color?: string; textColor?: string }) {
  return (
    <span
      className="inline-block text-[12px] font-medium px-3 py-1 rounded-full mr-1.5 mb-1.5"
      style={{ background: color, color: textColor }}
    >
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MedicalCardClient({ data, locale }: { data: MedicalCardData | null; locale: string }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">📋</div>
        <p className="text-[16px] font-semibold" style={{ color: '#2a2540' }}>Медкарта не найдена</p>
        <p className="text-[13px] text-center" style={{ color: '#9a96a8' }}>
          Пройдите онбординг, чтобы создать медицинскую карту
        </p>
        <Link
          href={`/${locale}/onboarding`}
          className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-[14px]"
          style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)' }}
        >
          Пройти онбординг
        </Link>
      </div>
    );
  }

  const { card, completionPercent, isMinor, personal, body, allergies, chronicConditions, lifestyle, emergency, doctor, insurance, teen } = data;

  // Compute BMI
  let bmi = '';
  if (body.height && body.weight) {
    const h = body.height / 100;
    const w = parseFloat(body.weight);
    if (h > 0 && w > 0) {
      const val = w / (h * h);
      bmi = val.toFixed(1);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">

      {/* ── Hero card ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 flex flex-col gap-3"
        style={{
          background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)',
          minHeight: 180,
        }}
      >
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">Медицинская карта</p>
            <p className="text-[22px] font-bold text-white mt-0.5">{fmt(personal.name)}</p>
            {personal.dateOfBirth && (
              <p className="text-[13px] text-white/80 mt-0.5">{fmtDate(personal.dateOfBirth)} · {calcAge(personal.dateOfBirth)}</p>
            )}
          </div>
          {card?.cardCode && <QrPlaceholder code={card.cardCode} />}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {body.bloodType && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-base">🩸</span>
              <span className="text-[13px] font-bold text-white">{BLOOD_TYPE_MAP[body.bloodType] ?? body.bloodType}</span>
            </div>
          )}
          {card?.cardCode && (
            <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-[12px] font-bold text-white/90 font-mono">{card.cardCode}</span>
            </div>
          )}
          {isMinor && (
            <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <span className="text-[12px] font-bold text-white">👶 Несовершеннолетний</span>
            </div>
          )}
        </div>

        {/* completion bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-white/70">Заполненность карты</span>
            <span className="text-[12px] font-bold text-white">{completionPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${completionPercent}%`, background: 'white' }}
            />
          </div>
        </div>
      </div>

      {/* ── Edit / onboarding CTA if incomplete ── */}
      {completionPercent < 80 && (
        <Link
          href={`/${locale}/onboarding`}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{ background: '#fdf4e8', border: '1px solid #f5d9a0' }}
        >
          <span className="text-xl">✏️</span>
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: '#8a6a20' }}>Дополните карту</p>
            <p className="text-[11px]" style={{ color: '#b89040' }}>Заполнено {completionPercent}% — добавьте данные для врачей</p>
          </div>
          <span style={{ color: '#b89040' }}>›</span>
        </Link>
      )}

      {/* ── Sections ── */}

      {/* 1. Personal */}
      <Section icon="👤" title="Личные данные" defaultOpen>
        <Row label="ФИО" value={fmt(personal.name)} />
        <Row label="Email" value={fmt(personal.email)} />
        <Row label="Дата рождения" value={personal.dateOfBirth ? `${fmtDate(personal.dateOfBirth)} (${calcAge(personal.dateOfBirth)})` : '—'} />
        <Row label="Пол" value={personal.gender ? (GENDER_LABELS[personal.gender] ?? personal.gender) : '—'} />
        <Row label="Телефон" value={fmt(personal.phone)} />
        <Row label="Город" value={fmt(personal.city)} />
        {personal.pinfl && <Row label="ПИНФЛ" value={personal.pinfl} />}
      </Section>

      {/* 2. Body metrics */}
      <Section icon="📏" title="Физические параметры" badge={body.bloodType ?? undefined}>
        <Row label="Рост" value={body.height ? `${body.height} см` : '—'} />
        <Row label="Вес" value={body.weight ? `${body.weight} кг` : '—'} />
        <Row label="Группа крови" value={body.bloodType ? (BLOOD_TYPE_MAP[body.bloodType] ?? body.bloodType) : '—'} />
        {bmi && <Row label="ИМТ" value={`${bmi} кг/м²`} />}
      </Section>

      {/* 3. Allergies */}
      <Section icon="⚠️" title="Аллергии" badge={allergies.length > 0 ? String(allergies.length) : undefined}>
        {allergies.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Аллергии не указаны</p>
        ) : (
          <div className="pt-2 flex flex-wrap">
            {allergies.map(a => (
              <Tag key={a.id} label={a.allergen} color="#fde8e8" textColor="#b03030" />
            ))}
          </div>
        )}
      </Section>

      {/* 4. Chronic conditions */}
      <Section icon="🏥" title="Хронические заболевания" badge={chronicConditions.length > 0 ? String(chronicConditions.length) : undefined}>
        {chronicConditions.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Хронические заболевания не указаны</p>
        ) : (
          <div className="pt-2 flex flex-wrap">
            {chronicConditions.map(c => (
              <Tag key={c.id} label={c.diagnosedYear ? `${c.name} (${c.diagnosedYear})` : c.name} color="#e8eef8" textColor="#2a4080" />
            ))}
          </div>
        )}
      </Section>

      {/* 5. Lifestyle */}
      {!isMinor && (
        <Section icon="🏃" title="Образ жизни">
          <Row label="Курение" value={lifestyle.smoking ? (SMOKING_LABELS[lifestyle.smoking] ?? lifestyle.smoking) : '—'} />
          <Row label="Алкоголь" value={lifestyle.alcohol ? (ALCOHOL_LABELS[lifestyle.alcohol] ?? lifestyle.alcohol) : '—'} />
          <Row label="Физическая активность" value={lifestyle.activity ? (ACTIVITY_LABELS[lifestyle.activity] ?? lifestyle.activity) : '—'} />
          <Row label="Сон" value={lifestyle.sleep ? (SLEEP_LABELS[lifestyle.sleep] ?? lifestyle.sleep) : '—'} />
          {lifestyle.diet && <Row label="Диета" value={lifestyle.diet} />}
          {lifestyle.nutrition && <Row label="Питание" value={lifestyle.nutrition} />}
        </Section>
      )}

      {/* 6. Emergency contact */}
      <Section icon="🆘" title="Экстренный контакт">
        {!emergency.name && !emergency.phone ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Экстренный контакт не указан</p>
        ) : (
          <>
            <Row label="Имя" value={fmt(emergency.name)} />
            <Row label="Телефон" value={fmt(emergency.phone)} />
            <Row label="Отношение" value={fmt(emergency.relation)} />
          </>
        )}
      </Section>

      {/* 7. Doctor / clinic */}
      <Section icon="🩺" title="Лечащий врач">
        {!doctor.name && !doctor.clinic ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Лечащий врач не указан</p>
        ) : (
          <>
            <Row label="Врач" value={fmt(doctor.name)} />
            {doctor.phone && <Row label="Телефон" value={doctor.phone} />}
            <Row label="Клиника" value={fmt(doctor.clinic)} />
          </>
        )}
      </Section>

      {/* 8. Insurance */}
      <Section icon="🛡️" title="Страховка">
        {!insurance.company ? (
          <p className="text-[13px] py-2" style={{ color: '#9a96a8' }}>Страховой полис не указан</p>
        ) : (
          <>
            <Row label="Страховая компания" value={fmt(insurance.company)} />
            <Row label="Номер полиса" value={fmt(insurance.number)} />
            <Row label="Действует до" value={fmtDate(insurance.expires)} />
            {insurance.hotline && <Row label="Горячая линия" value={insurance.hotline} />}
          </>
        )}
      </Section>

      {/* 9–11. Teen sections */}
      {isMinor && teen && (
        <>
          <Section icon="🏫" title="Школа">
            <Row label="Школа" value={fmt(teen.school)} />
            <Row label="Класс" value={fmt(teen.grade)} />
            <Row label="Зрение" value={fmt(teen.visionStatus)} />
          </Section>

          {teen.childDiseases && teen.childDiseases.length > 0 && (
            <Section icon="💉" title="Детские болезни" badge={String(teen.childDiseases.length)}>
              <div className="pt-2 flex flex-wrap">
                {teen.childDiseases.map((d, i) => (
                  <Tag key={i} label={d} color="#e8f0e8" textColor="#2a6040" />
                ))}
              </div>
            </Section>
          )}

          {teen.vaccinationHistory && teen.vaccinationHistory.length > 0 && (
            <Section icon="🩹" title="Вакцинация" badge={String(teen.vaccinationHistory.length)}>
              <div className="mt-2 flex flex-col gap-1">
                {teen.vaccinationHistory.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f5f3ef' }}>
                    <span className="text-[13px]" style={{ color: '#2a2540' }}>{v.name}</span>
                    <div className="flex items-center gap-2">
                      {v.date && <span className="text-[11px]" style={{ color: '#9a96a8' }}>{fmtDate(v.date)}</span>}
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: v.status === 'done' ? '#e8f5e8' : v.status === 'partial' ? '#fef8e8' : '#f5f0f0',
                          color: v.status === 'done' ? '#2a7040' : v.status === 'partial' ? '#8a6020' : '#8a3030',
                        }}
                      >
                        {v.status === 'done' ? 'Сделана' : v.status === 'partial' ? 'Частично' : 'Не сделана'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section icon="🏃" title="Образ жизни (подросток)">
            <Row label="Физическая активность" value={teen.screenTime ? (ACTIVITY_LABELS[teen.screenTime] ?? teen.screenTime) : '—'} />
            {lifestyle.activity && <Row label="Активность" value={ACTIVITY_LABELS[lifestyle.activity] ?? lifestyle.activity} />}
            {lifestyle.sleep && <Row label="Сон" value={SLEEP_LABELS[lifestyle.sleep] ?? lifestyle.sleep} />}
            {teen.screenTime && <Row label="Экранное время" value={teen.screenTime} />}
          </Section>
        </>
      )}

      {/* 12. Card info */}
      {card && (
        <Section icon="📋" title="Информация о карте">
          <Row label="Номер карты" value={card.cardCode} />
          <Row label="Создана" value={fmtDate(card.createdAt)} />
          <Row label="Статус" value={card.isActive ? 'Активна' : 'Неактивна'} />
          <Row label="Кол-во сканирований" value={String(card.accessCount)} />
        </Section>
      )}

      {/* Share / print action */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-colors"
          style={{ background: '#f5f3ef', color: '#2a2540' }}
        >
          🖨️ Распечатать
        </button>
        <Link
          href={`/${locale}/onboarding`}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c) 0%, var(--accent-dark, #7a3d4a) 100%)', color: 'white' }}
        >
          ✏️ Редактировать
        </Link>
      </div>
    </div>
  );
}
