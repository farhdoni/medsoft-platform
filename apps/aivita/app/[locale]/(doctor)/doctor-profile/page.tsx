'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';
import Modal from '@/components/ui/Modal';

interface DoctorProfile {
  id: string; userId: string;
  dateOfBirth?: string; gender?: string; passportSeries?: string; passportNumber?: string;
  passportIssuedBy?: string; passportIssuedAt?: string; passportExpiresAt?: string;
  phone?: string; telegram?: string; whatsapp?: string; city?: string;
  languages?: string[]; photoUrl?: string;
  specialization?: string; additionalSkills?: string[]; diseasesTreated?: string[];
  experienceStartDate?: string; consultationPrice?: number; bio?: string;
  diplomaUniversity?: string; diplomaSpecialty?: string; diplomaYear?: number;
  diplomaNumber?: string; diplomaScanUrl?: string; diplomaVerified?: string;
  certificates?: Array<{ title: string; year?: number; scanUrl?: string; status?: string }>;
  licenseNumber?: string; licenseIssuedBy?: string; licenseIssuedAt?: string;
  licenseExpiresAt?: string; licenseScanUrl?: string; licenseVerified?: string;
  clinicName?: string; clinicAddress?: string; cabinetNumber?: string;
  clinicPhone?: string; clinicWebsite?: string;
  showInCatalog?: boolean; showPhone?: boolean; showEmail?: boolean;
  showPrice?: boolean; showRating?: boolean;
  rating?: number; ratingCount?: number; totalConsultations?: number;
  totalPatients?: number; likesCount?: number;
  verificationStatus?: string; verifiedAt?: string; rejectionReason?: string;
}

interface Session { name: string; email: string; avatarUrl?: string; }

const SPECIALIZATIONS = [
  'Терапевт', 'Кардиолог', 'Эндокринолог', 'Невролог', 'Хирург',
  'Ортопед', 'Офтальмолог', 'ЛОР', 'Дерматолог', 'Гинеколог',
  'Уролог', 'Психиатр', 'Педиатр', 'Онколог', 'Гастроэнтеролог',
  'Пульмонолог', 'Ревматолог', 'Нефролог', 'Иммунолог', 'Аллерголог',
  'Стоматолог', 'Психолог', 'Реабилитолог', 'Другое',
];

const LANGUAGES = [
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'uz', label: '🇺🇿 Узбекский' },
  { code: 'en', label: '🇬🇧 English' },
];

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function calcExp(dateStr?: string) {
  if (!dateStr) return null;
  const years = Math.floor((Date.now() - new Date(dateStr).getTime()) / 31557600000);
  return years;
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden border-app-border">
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center justify-between text-left">
        <span className="font-semibold text-[#2a2540] text-sm">{title}</span>
        <span className="text-[#9a96a8] transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-app-border"><div className="pt-4">{children}</div></div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#2a2540] mt-0.5">{value || <span className="text-[#9a96a8]">Не указано</span>}</p>
    </div>
  );
}

function EditField({ label, field, value, onChange, type = 'text', options }: {
  label: string; field: string; value: any; onChange: (f: string, v: any) => void;
  type?: string; options?: string[];
}) {
  if (options) return (
    <div className="mb-3">
      <label className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide">{label}</label>
      <select value={value ?? ''} onChange={e => onChange(field, e.target.value)}
        className="w-full mt-1 p-2.5 rounded-xl border text-sm outline-none bg-white"
        style={{ color: '#2a2540' }}>
        <option value="">Не указано</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  if (type === 'textarea') return (
    <div className="mb-3">
      <label className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide">{label}</label>
      <textarea value={value ?? ''} onChange={e => onChange(field, e.target.value)} rows={3}
        className="w-full mt-1 p-2.5 rounded-xl border text-sm outline-none resize-none"
        style={{ color: '#2a2540' }} />
    </div>
  );
  return (
    <div className="mb-3">
      <label className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(field, e.target.value)}
        className="w-full mt-1 p-2.5 rounded-xl border text-sm outline-none"
        style={{ color: '#2a2540' }} />
    </div>
  );
}

export default function DoctorProfilePage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DoctorProfile>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true, professional: false, education: false, workplace: false, public: false, verification: false,
  });
  const [newSkill, setNewSkill] = useState('');
  const [newDisease, setNewDisease] = useState('');
  const [newCert, setNewCert] = useState({ title: '', year: '' });

  useEffect(() => {
    Promise.all([
      apiRequest<DoctorProfile>('/doctor/profile'),
      apiRequest<Session>('/users'),
      apiRequest<{ percent: number }>('/doctor/profile/completion'),
    ]).then(([p, u, c]) => {
      if ('data' in p) setProfile(p.data);
      if ('data' in u) setSession(u.data);
      if ('data' in c) setCompletion(c.data?.percent ?? 0);
      setLoading(false);
    });
  }, []);

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const openEdit = (section: string) => {
    setEditData({ ...profile });
    setEditModal(section);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await apiRequest<DoctorProfile>('/doctor/profile', { method: 'PUT', body: editData });
    if ('data' in res) {
      setProfile(res.data);
      const c = await apiRequest<{ percent: number }>('/doctor/profile/completion');
      if ('data' in c) setCompletion(c.data?.percent ?? 0);
    }
    setSaving(false);
    setEditModal(null);
  };

  const setField = (field: string, value: any) => setEditData(prev => ({ ...prev, [field]: value }));

  const addSkill = () => {
    if (!newSkill.trim()) return;
    const updated = [...(profile?.additionalSkills ?? []), newSkill.trim()];
    setProfile(p => p ? { ...p, additionalSkills: updated } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { additionalSkills: updated } });
    setNewSkill('');
  };

  const removeSkill = (i: number) => {
    const updated = (profile?.additionalSkills ?? []).filter((_, idx) => idx !== i);
    setProfile(p => p ? { ...p, additionalSkills: updated } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { additionalSkills: updated } });
  };

  const addDisease = () => {
    if (!newDisease.trim()) return;
    const updated = [...(profile?.diseasesTreated ?? []), newDisease.trim()];
    setProfile(p => p ? { ...p, diseasesTreated: updated } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { diseasesTreated: updated } });
    setNewDisease('');
  };

  const removeDisease = (i: number) => {
    const updated = (profile?.diseasesTreated ?? []).filter((_, idx) => idx !== i);
    setProfile(p => p ? { ...p, diseasesTreated: updated } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { diseasesTreated: updated } });
  };

  const addCertificate = async () => {
    if (!newCert.title.trim()) return;
    await apiRequest('/doctor/profile/certificates', {
      method: 'POST', body: { title: newCert.title, year: newCert.year ? +newCert.year : undefined },
    });
    setNewCert({ title: '', year: '' });
    const res = await apiRequest<DoctorProfile>('/doctor/profile');
    if ('data' in res) setProfile(res.data);
  };

  const removeCertificate = async (index: number) => {
    await apiRequest(`/doctor/profile/certificates/${index}`, { method: 'DELETE' });
    const res = await apiRequest<DoctorProfile>('/doctor/profile');
    if ('data' in res) setProfile(res.data);
  };

  const toggleLanguage = (code: string) => {
    const langs = profile?.languages ?? [];
    const updated = langs.includes(code) ? langs.filter(l => l !== code) : [...langs, code];
    setProfile(p => p ? { ...p, languages: updated } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { languages: updated } });
  };

  const toggleVisibility = (field: keyof DoctorProfile) => {
    const val = !(profile?.[field] as boolean);
    setProfile(p => p ? { ...p, [field]: val } : p);
    apiRequest('/doctor/profile', { method: 'PUT', body: { [field]: val } });
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const exp = calcExp(profile?.experienceStartDate);
  const verStatus = profile?.verificationStatus ?? 'not_verified';

  return (
    <div>
      {/* Hero */}
      <div className="px-4 pt-14 pb-4" style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-white/40"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {session ? initials(session.name) : '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold">{session?.name ?? 'Доктор'}</h1>
            {profile?.specialization && <p className="text-white/80 text-sm">{profile.specialization}</p>}
            {profile?.clinicName && <p className="text-white/70 text-xs">{profile.clinicName}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Пациентов', value: profile?.totalPatients ?? 0 },
            { label: 'Консультаций', value: profile?.totalConsultations ?? 0 },
            { label: 'Рейтинг', value: profile?.rating ? (+profile.rating).toFixed(1) : '—' },
            { label: 'Лайков', value: profile?.likesCount ?? 0 },
          ].map((s, i) => (
            <div key={i} className="rounded-xl py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <p className="text-white text-base font-bold">{s.value}</p>
              <p className="text-white/70 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Completion bar */}
        <div className="bg-white rounded-2xl p-4 border border-app-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#2a2540]">Заполненность профиля</span>
            <span className="text-sm font-bold text-[color:var(--accent-dark)]">{completion}%</span>
          </div>
          <div className="h-2 bg-[#e8e4dc] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${completion}%`, background: 'linear-gradient(90deg, var(--hero-from), var(--accent-dark))' }} />
          </div>
          {completion < 80 && <p className="text-xs text-[#9a96a8] mt-2">Заполните профиль для прохождения верификации</p>}
        </div>

        {/* Verification status */}
        <div className="rounded-2xl p-4" style={{
          background: verStatus === 'verified' ? '#e8f4ec' : verStatus === 'pending' ? '#fffbe8' : '#fff0ec',
          border: `1px solid ${verStatus === 'verified' ? '#4caf82' : verStatus === 'pending' ? '#c8a840' : '#f47c5f'}`,
        }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{verStatus === 'verified' ? '✅' : verStatus === 'pending' ? '⏳' : '❌'}</span>
            <div>
              <p className="font-semibold text-sm text-[#2a2540]">
                {verStatus === 'verified' ? 'Профиль верифицирован' : verStatus === 'pending' ? 'Документы на проверке' : 'Требуется верификация'}
              </p>
              {verStatus === 'verified' && profile?.verifiedAt && (
                <p className="text-xs text-[#2d7a56]">Верифицирован {new Date(profile.verifiedAt).toLocaleDateString('ru')}</p>
              )}
              {verStatus === 'not_verified' && (
                <p className="text-xs" style={{ color: '#c0304a' }}>Загрузите диплом и паспорт для верификации</p>
              )}
              {profile?.rejectionReason && (
                <p className="text-xs text-red-600 mt-0.5">{profile.rejectionReason}</p>
              )}
            </div>
          </div>
        </div>

        {/* 1. Personal data */}
        <Section title="👤 Личные данные" open={openSections.personal} onToggle={() => toggleSection('personal')}>
          <div className="flex justify-end mb-3">
            <button onClick={() => openEdit('personal')}
              className="text-xs font-medium text-[color:var(--accent-dark)]">✎ Редактировать</button>
          </div>
          {/* Passport accordion */}
          <div className="mb-4 p-3 rounded-xl bg-[#f8f7ff]">
            <div className="flex items-center gap-2 mb-2">
              <span>🔒</span>
              <span className="text-xs font-bold text-[#2a2540]">Паспортные данные</span>
              <span className="text-[10px] text-[#9a96a8] ml-auto">Только вы видите</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Дата рождения" value={profile?.dateOfBirth} />
              <Field label="Пол" value={profile?.gender === 'male' ? 'Мужской' : profile?.gender === 'female' ? 'Женский' : undefined} />
              <Field label="Серия паспорта" value={profile?.passportSeries} />
              <Field label="Номер паспорта" value={profile?.passportNumber} />
              <Field label="Кем выдан" value={profile?.passportIssuedBy} />
              <Field label="Дата выдачи" value={profile?.passportIssuedAt} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Телефон" value={profile?.phone} />
            <Field label="Telegram" value={profile?.telegram} />
            <Field label="WhatsApp" value={profile?.whatsapp} />
            <Field label="Город" value={profile?.city} />
          </div>
          {/* Languages */}
          <div className="mt-2">
            <p className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide mb-2">Языки приёма</p>
            <div className="flex gap-2">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => toggleLanguage(l.code)}
                  className="flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: (profile?.languages ?? []).includes(l.code) ? 'var(--accent-dark)' : '#f0f0f0',
                    color: (profile?.languages ?? []).includes(l.code) ? '#fff' : '#9a96a8',
                  }}>{l.label}</button>
              ))}
            </div>
          </div>
        </Section>

        {/* 2. Professional */}
        <Section title="🩺 Профессиональные данные" open={openSections.professional} onToggle={() => toggleSection('professional')}>
          <div className="flex justify-end mb-3">
            <button onClick={() => openEdit('professional')} className="text-xs font-medium text-[color:var(--accent-dark)]">✎ Редактировать</button>
          </div>
          <Field label="Специализация" value={profile?.specialization} />
          {exp !== null && <Field label="Опыт работы" value={`${exp} лет`} />}
          <Field label="Стоимость консультации" value={profile?.consultationPrice ? `${profile.consultationPrice.toLocaleString('ru')} сум` : 'Бесплатно'} />
          {profile?.bio && <Field label="О себе" value={profile.bio} />}

          {/* Additional skills */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide mb-2">Доп. навыки</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(profile?.additionalSkills ?? []).map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ background: 'var(--accent-bg)', color: 'var(--accent-dark)' }}>
                  {s}
                  <button onClick={() => removeSkill(i)} className="ml-0.5 text-[color:var(--accent-dark)] font-bold">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSkill(); }}
                placeholder="Добавить навык..."
                className="flex-1 p-2 rounded-xl border text-xs outline-none" />
              <button onClick={addSkill} className="px-3 py-2 rounded-xl text-xs text-white font-medium"
                style={{ background: 'var(--accent-dark)' }}>+</button>
            </div>
          </div>

          {/* Diseases */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-[#9a96a8] uppercase tracking-wide mb-2">Болезни которые лечит</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(profile?.diseasesTreated ?? []).map((d, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                  style={{ background: '#e8f4ec', color: '#2d7a56' }}>
                  {d}
                  <button onClick={() => removeDisease(i)} className="ml-0.5 text-[#2d7a56] font-bold">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newDisease} onChange={e => setNewDisease(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addDisease(); }}
                placeholder="Добавить болезнь..."
                className="flex-1 p-2 rounded-xl border text-xs outline-none" />
              <button onClick={addDisease} className="px-3 py-2 rounded-xl text-xs text-white font-medium"
                style={{ background: 'var(--accent-dark)' }}>+</button>
            </div>
          </div>
        </Section>

        {/* 3. Education */}
        <Section title="🎓 Образование" open={openSections.education} onToggle={() => toggleSection('education')}>
          {/* Diploma */}
          <div className="mb-4 p-3 rounded-xl bg-[#f8f7ff]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#2a2540]">Диплом</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${profile?.diplomaVerified === 'verified' ? 'bg-green-100 text-green-700' : profile?.diplomaVerified === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {profile?.diplomaVerified === 'verified' ? '✅ Верифицирован' : profile?.diplomaVerified === 'pending' ? '⏳ На проверке' : '❌ Не загружен'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="ВУЗ" value={profile?.diplomaUniversity} />
              <Field label="Специальность" value={profile?.diplomaSpecialty} />
              <Field label="Год" value={profile?.diplomaYear} />
              <Field label="Номер" value={profile?.diplomaNumber} />
            </div>
            <button onClick={() => openEdit('diploma')}
              className="text-xs font-medium text-[color:var(--accent-dark)] mt-1">✎ Редактировать</button>
          </div>

          {/* Certificates */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#2a2540] mb-2">Сертификаты ({(profile?.certificates ?? []).length})</p>
            <div className="space-y-2 mb-3">
              {(profile?.certificates ?? []).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-[#f8f7ff]">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#2a2540]">{c.title}</p>
                    {c.year && <p className="text-[10px] text-[#9a96a8]">{c.year}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {c.status === 'verified' ? '✅' : '⏳'}
                  </span>
                  <button onClick={() => removeCertificate(i)} className="text-[#9a96a8] text-sm">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCert.title} onChange={e => setNewCert(p => ({ ...p, title: e.target.value }))}
                placeholder="Название сертификата"
                className="flex-1 p-2 rounded-xl border text-xs outline-none" />
              <input value={newCert.year} onChange={e => setNewCert(p => ({ ...p, year: e.target.value }))}
                type="number" placeholder="Год" style={{ width: 64 }}
                className="p-2 rounded-xl border border-app-border text-xs outline-none" />
              <button onClick={addCertificate}
                className="px-3 py-2 rounded-xl text-xs text-white font-medium" style={{ background: 'var(--accent-dark)' }}>+</button>
            </div>
          </div>

          {/* License */}
          <div className="p-3 rounded-xl bg-[#f8f7ff]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#2a2540]">Лицензия</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${profile?.licenseVerified === 'verified' ? 'bg-green-100 text-green-700' : profile?.licenseVerified === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {profile?.licenseVerified === 'verified' ? '✅ Верифицирована' : profile?.licenseVerified === 'pending' ? '⏳ На проверке' : '❌ Не загружена'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Номер" value={profile?.licenseNumber} />
              <Field label="Кем выдана" value={profile?.licenseIssuedBy} />
              <Field label="Дата выдачи" value={profile?.licenseIssuedAt} />
              <Field label="Действует до" value={profile?.licenseExpiresAt} />
            </div>
            <button onClick={() => openEdit('license')} className="text-xs font-medium text-[color:var(--accent-dark)] mt-1">✎ Редактировать</button>
          </div>
        </Section>

        {/* 4. Workplace */}
        <Section title="🏥 Место работы" open={openSections.workplace} onToggle={() => toggleSection('workplace')}>
          <div className="flex justify-end mb-3">
            <button onClick={() => openEdit('workplace')} className="text-xs font-medium text-[color:var(--accent-dark)]">✎ Редактировать</button>
          </div>
          {!profile?.clinicName ? (
            <div className="text-center py-4 text-[#9a96a8]">
              <p className="text-xl mb-1">🏠</p>
              <p className="text-sm">Частная практика</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4">
              <Field label="Клиника" value={profile.clinicName} />
              <Field label="Адрес" value={profile.clinicAddress} />
              <Field label="Кабинет" value={profile.cabinetNumber} />
              <Field label="Телефон клиники" value={profile.clinicPhone} />
              <Field label="Сайт" value={profile.clinicWebsite} />
            </div>
          )}
        </Section>

        {/* 5. Public profile */}
        <Section title="🌐 Публичный профиль" open={openSections.public} onToggle={() => toggleSection('public')}>
          <p className="text-xs text-[#9a96a8] mb-4">Настройте что видят пациенты в каталоге</p>
          {([
            { field: 'showInCatalog', label: 'Показывать в каталоге' },
            { field: 'showRating', label: 'Показывать рейтинг' },
            { field: 'showPrice', label: 'Показывать стоимость' },
            { field: 'showPhone', label: 'Показывать телефон' },
            { field: 'showEmail', label: 'Показывать email' },
          ] as const).map(item => (
            <div key={item.field} className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#2a2540]">{item.label}</span>
              <button onClick={() => toggleVisibility(item.field as keyof DoctorProfile)}
                className="w-12 h-6 rounded-full transition-colors relative"
                style={{ background: profile?.[item.field as keyof DoctorProfile] ? 'var(--accent-dark)' : '#e8e4dc' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: profile?.[item.field as keyof DoctorProfile] ? '26px' : '2px' }} />
              </button>
            </div>
          ))}

          {/* Preview card */}
          <div className="mt-4 p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--accent-dark)' }}>
            <p className="text-xs font-bold text-[color:var(--accent-dark)] mb-3">Превью для пациентов</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--accent-dark))' }}>
                {initials(session?.name ?? '?')}
              </div>
              <div>
                <p className="font-semibold text-[#2a2540] text-sm">{session?.name}</p>
                <p className="text-xs text-[#9a96a8]">{profile?.specialization}</p>
                {profile?.showRating && profile?.rating && (
                  <p className="text-xs text-[color:var(--accent-dark)]">★ {(+profile.rating).toFixed(1)} · {profile.ratingCount} отзывов</p>
                )}
              </div>
              {profile?.showPrice && (
                <div className="ml-auto text-right">
                  <p className="font-bold text-[#2a2540] text-sm">
                    {profile.consultationPrice ? `${profile.consultationPrice.toLocaleString('ru')} сум` : 'Бесплатно'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={
          editModal === 'personal' ? 'Личные данные' :
          editModal === 'professional' ? 'Профессиональные данные' :
          editModal === 'diploma' ? 'Диплом' :
          editModal === 'license' ? 'Лицензия' : 'Место работы'
        }
        footer={
          <div className="flex gap-3">
            <button onClick={() => setEditModal(null)}
              className="flex-1 py-3 rounded-xl text-sm font-medium border text-app-t3">Отмена</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-white"
              style={{ background: 'var(--accent-dark)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        }
      >
        {editModal === 'personal' && (
          <>
            <EditField label="Дата рождения" field="dateOfBirth" value={editData.dateOfBirth} onChange={setField} type="date" />
            <EditField label="Пол" field="gender" value={editData.gender} onChange={setField} options={['male', 'female']} />
            <EditField label="Серия паспорта" field="passportSeries" value={editData.passportSeries} onChange={setField} />
            <EditField label="Номер паспорта" field="passportNumber" value={editData.passportNumber} onChange={setField} />
            <EditField label="Кем выдан" field="passportIssuedBy" value={editData.passportIssuedBy} onChange={setField} />
            <EditField label="Дата выдачи" field="passportIssuedAt" value={editData.passportIssuedAt} onChange={setField} type="date" />
            <EditField label="Срок действия" field="passportExpiresAt" value={editData.passportExpiresAt} onChange={setField} type="date" />
            <EditField label="Телефон" field="phone" value={editData.phone} onChange={setField} type="tel" />
            <EditField label="Telegram" field="telegram" value={editData.telegram} onChange={setField} />
            <EditField label="WhatsApp" field="whatsapp" value={editData.whatsapp} onChange={setField} />
            <EditField label="Город" field="city" value={editData.city} onChange={setField} />
          </>
        )}

        {editModal === 'professional' && (
          <>
            <EditField label="Специализация" field="specialization" value={editData.specialization} onChange={setField} options={SPECIALIZATIONS} />
            <EditField label="Начало стажа" field="experienceStartDate" value={editData.experienceStartDate} onChange={setField} type="date" />
            <EditField label="Стоимость консультации (сум)" field="consultationPrice" value={editData.consultationPrice} onChange={setField} type="number" />
            <EditField label="О себе" field="bio" value={editData.bio} onChange={setField} type="textarea" />
          </>
        )}

        {editModal === 'diploma' && (
          <>
            <EditField label="ВУЗ" field="diplomaUniversity" value={editData.diplomaUniversity} onChange={setField} />
            <EditField label="Специальность" field="diplomaSpecialty" value={editData.diplomaSpecialty} onChange={setField} />
            <EditField label="Год выпуска" field="diplomaYear" value={editData.diplomaYear} onChange={setField} type="number" />
            <EditField label="Номер диплома" field="diplomaNumber" value={editData.diplomaNumber} onChange={setField} />
          </>
        )}

        {editModal === 'license' && (
          <>
            <EditField label="Номер лицензии" field="licenseNumber" value={editData.licenseNumber} onChange={setField} />
            <EditField label="Кем выдана" field="licenseIssuedBy" value={editData.licenseIssuedBy} onChange={setField} />
            <EditField label="Дата выдачи" field="licenseIssuedAt" value={editData.licenseIssuedAt} onChange={setField} type="date" />
            <EditField label="Действует до" field="licenseExpiresAt" value={editData.licenseExpiresAt} onChange={setField} type="date" />
          </>
        )}

        {editModal === 'workplace' && (
          <>
            <EditField label="Название клиники" field="clinicName" value={editData.clinicName} onChange={setField} />
            <EditField label="Адрес" field="clinicAddress" value={editData.clinicAddress} onChange={setField} />
            <EditField label="Кабинет №" field="cabinetNumber" value={editData.cabinetNumber} onChange={setField} />
            <EditField label="Телефон клиники" field="clinicPhone" value={editData.clinicPhone} onChange={setField} type="tel" />
            <EditField label="Сайт клиники" field="clinicWebsite" value={editData.clinicWebsite} onChange={setField} type="url" />
          </>
        )}
      </Modal>
    </div>
  );
}
