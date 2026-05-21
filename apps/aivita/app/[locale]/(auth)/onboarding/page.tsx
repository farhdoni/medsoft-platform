'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepData = Record<string, unknown>;

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A(I)+', 'A(I)−', 'B(II)+', 'B(II)−', 'AB(III)+', 'AB(III)−', 'O(IV)+', 'O(IV)−', 'Не знаю'];

const CHILD_DISEASES = ['Ветрянка', 'Корь', 'Краснуха', 'Скарлатина', 'Паротит', 'Мононуклеоз', 'Коклюш'];

const VACCINATIONS_ADULT = [
  { name: 'Грипп', rec: 'Ежегодно' },
  { name: 'COVID-19', rec: 'По рекомендации' },
  { name: 'Гепатит B', rec: 'Базовая' },
  { name: 'АДС-М', rec: 'Каждые 10 лет' },
  { name: 'Пневмококк', rec: '65+ лет' },
];

const VACCINATIONS_TEEN = [
  { name: 'БЦЖ (туберкулёз)', rec: 'При рождении' },
  { name: 'Гепатит B', rec: 'Базовая' },
  { name: 'АКДС (дифтерия, столбняк, коклюш)', rec: 'Базовая' },
  { name: 'Полиомиелит', rec: 'Базовая' },
  { name: 'КПК (корь, паротит, краснуха)', rec: 'Базовая' },
  { name: 'АДС-М (ревакцинация)', rec: '14 лет' },
  { name: 'ВПЧ', rec: '13–15 лет (рекомендуется)' },
  { name: 'Грипп', rec: 'Ежегодно' },
];

// ─── Orb background (inline) ─────────────────────────────────────────────────

function OrbBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-pink-100/60 blur-3xl" />
      <div className="absolute top-1/2 -right-20 w-48 h-48 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-emerald-100/40 blur-3xl" />
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {onBack && step > 1 ? (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border border-[rgba(120,160,200,0.2)] flex items-center justify-center hover:bg-white transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-[#2a2540]" />
        </button>
      ) : (
        <div className="w-10 h-10 flex-shrink-0" />
      )}
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step - 1) / (total - 1)) * 100}%`,
            background: 'linear-gradient(90deg, #f472b6, #60a5fa, #34d399)',
          }}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium flex-shrink-0">{step} / {total}</span>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

function NextBtn({ onClick, disabled, label = 'Продолжить', loading = false }: {
  onClick: () => void; disabled?: boolean; label?: string; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center h-14 font-bold rounded-2xl text-sm transition-all ${
        disabled || loading
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'text-white shadow-lg hover:-translate-y-0.5 active:scale-95'
      }`}
      style={!disabled && !loading ? { background: 'linear-gradient(135deg, #f472b6, #60a5fa, #34d399)' } : undefined}
    >
      {loading ? '⏳ Сохранение...' : label}
    </button>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onAdd, onRemove, placeholder }: {
  tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void; placeholder: string;
}) {
  const [val, setVal] = useState('');
  function add() {
    const t = val.trim();
    if (t && !tags.includes(t)) { onAdd(t); setVal(''); }
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
          style={{ color: '#2a2540' }}
        />
        <button onClick={add} className="px-3 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>+</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-pink-50 border border-pink-200 text-pink-700">
            {t}
            <button onClick={() => onRemove(t)} className="ml-1 text-pink-400 hover:text-pink-600">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Option cards ─────────────────────────────────────────────────────────────

function OptionCard({ value, selected, onClick, emoji, label, sub }: {
  value: string; selected: boolean; onClick: () => void; emoji: string; label: string; sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 h-16 px-4 rounded-2xl border transition-all ${
        selected
          ? 'border-pink-400 bg-gradient-to-r from-pink-50 to-blue-50 shadow-sm'
          : 'border-[rgba(120,160,200,0.2)] bg-white/60 backdrop-blur hover:bg-white/80'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${selected ? 'bg-gradient-to-r from-pink-400 to-blue-400' : 'bg-gray-50'}`}>
        {emoji}
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold text-sm text-[#2a2540]">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-pink-500 bg-gradient-to-r from-pink-400 to-blue-400' : 'border-gray-300'}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

// ─── Claim Card Block (shown in Step 1 when age 16-17) ───────────────────────

function ClaimCardBlock({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  const [cardInput,  setCardInput]  = useState('');
  const [searching,  setSearching]  = useState(false);
  const [found,      setFound]      = useState<{ memberName: string; cardNumber: string } | null>(null);
  const [claimSent,  setClaimSent]  = useState(!!(data.claimSent as boolean));
  const [claimErr,   setClaimErr]   = useState('');

  async function handleSearch() {
    const code = cardInput.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    setClaimErr('');
    setFound(null);
    try {
      const res = await fetch(`/api/proxy/family/search-child-card?card=${encodeURIComponent(code)}`);
      if (res.status === 404) { setClaimErr('Карта не найдена'); return; }
      if (res.status === 409) { setClaimErr('Эта карта уже перенесена'); return; }
      if (!res.ok) { setClaimErr('Ошибка поиска'); return; }
      const json = await res.json() as { data: { memberName: string; cardNumber: string } };
      setFound(json.data);
    } catch {
      setClaimErr('Ошибка соединения');
    } finally {
      setSearching(false);
    }
  }

  async function handleClaim() {
    if (!found) return;
    setSearching(true);
    try {
      const res = await fetch('/api/proxy/onboarding/claim-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: found.cardNumber }),
      });
      if (!res.ok) throw new Error('failed');
      setClaimSent(true);
      onChange({ ...data, claimSent: true, claimedCardNumber: found.cardNumber });
    } catch {
      setClaimErr('Не удалось отправить запрос');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="rounded-2xl p-4 mt-4" style={{ background: '#f0f6ff', border: '1px solid #b8d4f0' }}>
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#4a7fb5' }}>
        🔄 Есть медкарта AIVITA?
      </p>
      <p className="text-[12px] mb-3" style={{ color: '#6a6580' }}>
        Введи номер, чтобы перенести данные из детской карты
      </p>

      {claimSent ? (
        <div className="rounded-xl p-3" style={{ background: '#d4e8d8' }}>
          <p className="text-[13px] font-semibold" style={{ color: '#2a5a3a' }}>
            ✅ Запрос отправлен родителю на подтверждение
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#4a8a5a' }}>
            Данные перенесутся автоматически после подтверждения
          </p>
        </div>
      ) : found ? (
        <div className="space-y-2">
          <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #dbeeff' }}>
            <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
              ✅ Найдена карта на имя {found.memberName}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: '#9a96a8' }}>{found.cardNumber}</p>
          </div>
          <button
            onClick={() => void handleClaim()}
            disabled={searching}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: '#6BA3D6' }}
          >
            {searching ? '⏳…' : '📨 Отправить запрос родителю'}
          </button>
          <button onClick={() => setFound(null)} className="w-full text-xs py-1" style={{ color: '#9a96a8' }}>
            Ввести другой номер
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={cardInput}
              onChange={e => { setCardInput(e.target.value.toUpperCase()); setClaimErr(''); }}
              onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
              placeholder="AI-2026-XXXXX"
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-mono outline-none focus:border-[#6BA3D6]"
              style={{ borderColor: '#b8d4f0', color: '#2a2540' }}
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching || !cardInput.trim()}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: '#6BA3D6' }}
            >
              {searching ? '…' : 'Найти'}
            </button>
          </div>
          {claimErr && <p className="text-[12px] font-semibold" style={{ color: '#c0392b' }}>{claimErr}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Personal info ────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">О ТЕБЕ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-1">Расскажи о <em className="font-serif italic font-normal text-pink-500">себе</em></h3>
        <p className="text-sm text-gray-500 mb-5">Эти данные нужны для персонализации</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'lastName',  label: 'Фамилия',  placeholder: 'Иванов' },
          { key: 'firstName', label: 'Имя',       placeholder: 'Иван' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
            <input
              value={(data[f.key] as string) ?? ''}
              onChange={e => onChange({ ...data, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
              style={{ color: '#2a2540' }}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Дата рождения</label>
        <input
          type="date"
          value={(data.dateOfBirth as string) ?? ''}
          onChange={e => onChange({ ...data, dateOfBirth: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
          style={{ color: '#2a2540' }}
        />
      </div>

      <div className="flex gap-3">
        {[
          { val: 'male',   emoji: '👨', label: 'Мужской'  },
          { val: 'female', emoji: '👩', label: 'Женский'   },
        ].map(g => (
          <button
            key={g.val}
            onClick={() => onChange({ ...data, gender: g.val })}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition-all ${
              data.gender === g.val
                ? 'border-pink-400 bg-pink-50 text-pink-700'
                : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600 hover:bg-white'
            }`}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Телефон</label>
        <input
          type="tel"
          value={(data.phone as string) ?? ''}
          onChange={e => onChange({ ...data, phone: e.target.value })}
          placeholder="+998 90 123 45 67"
          className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
          style={{ color: '#2a2540' }}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Город</label>
        <input
          value={(data.city as string) ?? ''}
          onChange={e => onChange({ ...data, city: e.target.value })}
          placeholder="Ташкент"
          className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
          style={{ color: '#2a2540' }}
        />
      </div>

      {/* ── Claim child card if age 16-17 ─────────────────────────────────── */}
      {(() => {
        const dob = data.dateOfBirth as string | undefined;
        if (!dob) return null;
        const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age < 16 || age >= 18) return null;
        return <ClaimCardBlock data={data} onChange={onChange} />;
      })()}
    </div>
  );
}

// ─── Step 2: Body ─────────────────────────────────────────────────────────────

function Step2({ data, onChange, isMinor }: { data: StepData; onChange: (d: StepData) => void; isMinor: boolean }) {
  const h = Number(data.height) || 0;
  const w = Number(data.weight) || 0;
  const bmi = h > 0 && w > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">ПАРАМЕТРЫ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-1">Рост и <em className="font-serif italic font-normal text-pink-500">вес</em></h3>
        <p className="text-sm text-gray-500 mb-5">Для расчёта ИМТ и рекомендаций</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Рост (см)</label>
          <input
            type="number" min={50} max={250}
            value={(data.height as number) ?? ''}
            onChange={e => onChange({ ...data, height: e.target.value ? Number(e.target.value) : '' })}
            placeholder="170"
            className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
            style={{ color: '#2a2540' }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Вес (кг)</label>
          <input
            type="number" min={10} max={300} step={0.1}
            value={(data.weight as number) ?? ''}
            onChange={e => onChange({ ...data, weight: e.target.value ? Number(e.target.value) : '' })}
            placeholder="70"
            className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
            style={{ color: '#2a2540' }}
          />
        </div>
      </div>

      {bmi && (
        <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-3 text-center border border-[rgba(120,160,200,0.15)]">
          <p className="text-xs text-gray-500">ИМТ</p>
          <p className="text-2xl font-bold" style={{ color: '#2a2540' }}>{bmi}</p>
          <p className="text-xs text-gray-400">
            {Number(bmi) < 18.5 ? 'Недостаточный вес' : Number(bmi) < 25 ? 'Норма ✓' : Number(bmi) < 30 ? 'Избыточный вес' : 'Ожирение'}
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Группа крови</label>
        <div className="grid grid-cols-3 gap-2">
          {BLOOD_TYPES.map(bt => (
            <button
              key={bt}
              onClick={() => onChange({ ...data, bloodType: bt })}
              className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                data.bloodType === bt
                  ? 'border-pink-400 bg-pink-50 text-pink-700'
                  : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600 hover:bg-white'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {isMinor && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Школа</label>
              <input
                value={(data.school as string) ?? ''}
                onChange={e => onChange({ ...data, school: e.target.value })}
                placeholder="Школа №5"
                className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
                style={{ color: '#2a2540' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Класс</label>
              <input
                value={(data.grade as string) ?? ''}
                onChange={e => onChange({ ...data, grade: e.target.value })}
                placeholder="9 класс"
                className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
                style={{ color: '#2a2540' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Зрение</label>
            <div className="flex gap-2">
              {[
                { val: 'normal', label: '👁️ В норме' },
                { val: 'glasses', label: '🤓 Очки/линзы' },
                { val: 'unknown', label: '🤷 Не знаю' },
              ].map(v => (
                <button key={v.val} onClick={() => onChange({ ...data, visionStatus: v.val })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    data.visionStatus === v.val ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600'
                  }`}>{v.label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step 3: Health ───────────────────────────────────────────────────────────

function Step3({ data, onChange, isMinor }: { data: StepData; onChange: (d: StepData) => void; isMinor: boolean }) {
  const allergiesList = (data.allergiesList as string[]) ?? [];
  const chronicList   = (data.chronicList as string[]) ?? [];
  const childDiseases = (data.childDiseases as string[]) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">ЗДОРОВЬЕ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-1">
          Что важно <em className="font-serif italic font-normal text-pink-500">знать врачу</em>?
        </h3>
        <p className="text-sm text-gray-500 mb-4">Можно ничего не указывать</p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">⚠️ Аллергии</label>
        <TagInput
          tags={allergiesList}
          onAdd={t => onChange({ ...data, allergiesList: [...allergiesList, t] })}
          onRemove={t => onChange({ ...data, allergiesList: allergiesList.filter(x => x !== t) })}
          placeholder="Пенициллин, арахис..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">🏥 Хронические заболевания</label>
        <TagInput
          tags={chronicList}
          onAdd={t => onChange({ ...data, chronicList: [...chronicList, t] })}
          onRemove={t => onChange({ ...data, chronicList: chronicList.filter(x => x !== t) })}
          placeholder="Гипертония, диабет..."
        />
      </div>

      {isMinor && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">👦 Детские болезни</label>
          <p className="text-xs text-gray-400 mb-2">Можно уточнить у родителей 😊</p>
          <div className="flex flex-wrap gap-2">
            {CHILD_DISEASES.map(d => {
              const on = childDiseases.includes(d);
              return (
                <button key={d} onClick={() => onChange({ ...data, childDiseases: on ? childDiseases.filter(x => x !== d) : [...childDiseases, d] })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    on ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600'
                  }`}>{on ? '✓ ' : ''}{d}</button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl border border-[rgba(120,160,200,0.15)] p-4">
        <p className="text-xs text-gray-500">🔒 <strong>Данные зашифрованы</strong> и доступны только тебе. Никаких страховых компаний.</p>
      </div>
    </div>
  );
}

// ─── Step 4: Lifestyle (adult) / Vaccinations (teen) ─────────────────────────

function Step4Adult({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">ОБРАЗ ЖИЗНИ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-5">Расскажи о <em className="font-serif italic font-normal text-pink-500">привычках</em></h3>
      </div>

      {[
        { key: 'smoking', label: '🚬 Курение', options: [
          { val: 'never', emoji: '✅', label: 'Не курю' },
          { val: 'former', emoji: '🕐', label: 'Бросил(а)' },
          { val: 'current', emoji: '😶‍🌫️', label: 'Курю' },
        ]},
        { key: 'alcohol', label: '🍷 Алкоголь', options: [
          { val: 'never', emoji: '✅', label: 'Не пью' },
          { val: 'rare', emoji: '🎉', label: 'Редко' },
          { val: 'moderate', emoji: '🍺', label: 'Умеренно' },
          { val: 'frequent', emoji: '⚠️', label: 'Часто' },
        ]},
        { key: 'activity', label: '🏃 Физическая активность', options: [
          { val: 'sedentary', emoji: '🛋️', label: 'Сидячий' },
          { val: 'light', emoji: '🚶', label: 'Лёгкий' },
          { val: 'moderate', emoji: '🏋️', label: 'Умеренный' },
          { val: 'active', emoji: '🏃', label: 'Активный' },
        ]},
        { key: 'sleep', label: '😴 Сон', options: [
          { val: '<6', emoji: '😴', label: 'Меньше 6ч' },
          { val: '6-7', emoji: '🌙', label: '6–7 часов' },
          { val: '7-8', emoji: '✨', label: '7–8 часов' },
          { val: '>8', emoji: '💤', label: 'Больше 8ч' },
        ]},
      ].map(section => (
        <div key={section.key}>
          <label className="block text-xs font-semibold text-gray-500 mb-2">{section.label}</label>
          <div className={`grid gap-2 ${section.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {section.options.map(opt => (
              <button key={opt.val} onClick={() => onChange({ ...data, [section.key]: opt.val })}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  data[section.key] === opt.val
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600 hover:bg-white'
                }`}>
                <span className="text-lg mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Step4Teen({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  const vaxList = (data.vaccinations as Array<{ name: string; status: string }>) ?? [];
  function setVax(name: string, status: string) {
    const updated = vaxList.filter(v => v.name !== name);
    onChange({ ...data, vaccinations: [...updated, { name, status }] });
  }
  function getStatus(name: string) {
    return vaxList.find(v => v.name === name)?.status ?? '';
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">ПРИВИВКИ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-1">Вакцинация по <em className="font-serif italic font-normal text-pink-500">календарю</em></h3>
        <p className="text-sm text-gray-500 mb-4">Уточни у родителей или в поликлинике</p>
      </div>
      <div className="space-y-2">
        {VACCINATIONS_TEEN.map(v => (
          <div key={v.name} className="bg-white/70 backdrop-blur rounded-2xl border border-[rgba(120,160,200,0.15)] p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[#2a2540]">{v.name}</p>
                <p className="text-xs text-gray-400">{v.rec}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { val: 'done',      label: '✅ Сделана' },
                { val: 'not_done',  label: '❌ Нет' },
                { val: 'unknown',   label: '❓ Не знаю' },
              ].map(s => (
                <button key={s.val} onClick={() => setVax(v.name, s.val)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    getStatus(v.name) === s.val
                      ? 'border-pink-400 bg-pink-50 text-pink-700'
                      : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-500'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Emergency (adult) / Teen lifestyle ───────────────────────────────

function Step5Adult({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">ЭКСТРЕННЫЙ КОНТАКТ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-5">Кому <em className="font-serif italic font-normal text-pink-500">позвонить</em>?</h3>
      </div>

      {[
        { key: 'contactName',     label: 'Имя контакта',           placeholder: 'Мария Иванова'      },
        { key: 'contactPhone',    label: 'Телефон',                  placeholder: '+998 90 123 45 67'  },
        { key: 'contactRelation', label: 'Кем приходится',           placeholder: 'Супруга, мама...'   },
        { key: 'doctorName',      label: '👨‍⚕️ Лечащий врач (необяз.)', placeholder: 'Доктор Рашидов'    },
        { key: 'clinic',          label: '🏥 Клиника (необяз.)',       placeholder: 'Городская поликлиника №1' },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
          <input
            value={(data[f.key] as string) ?? ''}
            onChange={e => onChange({ ...data, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
            style={{ color: '#2a2540' }}
          />
        </div>
      ))}
    </div>
  );
}

function Step5Teen({ data, onChange }: { data: StepData; onChange: (d: StepData) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">ОБРАЗ ЖИЗНИ</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-5">Как ты <em className="font-serif italic font-normal text-pink-500">проводишь день</em>?</h3>
      </div>

      {[
        { key: 'activity', label: '⚽ Спорт', cols: 2, options: [
          { val: 'sedentary', emoji: '🛋️', label: 'Не занимаюсь' },
          { val: 'light', emoji: '🚶', label: 'Прогулки' },
          { val: 'moderate', emoji: '🏋️', label: 'Секция 2–3 р/нед' },
          { val: 'active', emoji: '🏃', label: 'Профессионально' },
        ]},
        { key: 'sleep', label: '😴 Сон', cols: 2, options: [
          { val: '<7', emoji: '😴', label: 'Меньше 7ч' },
          { val: '7-8', emoji: '🌙', label: '7–8 часов' },
          { val: '8-9', emoji: '✨', label: '8–9 часов' },
          { val: '>9', emoji: '💤', label: 'Больше 9ч' },
        ]},
        { key: 'screenTime', label: '📱 Экранное время', cols: 3, options: [
          { val: '<2h', emoji: '✅', label: 'До 2 ч' },
          { val: '2-4h', emoji: '📱', label: '2–4 ч' },
          { val: '>4h', emoji: '😵', label: 'Больше 4ч' },
        ]},
        { key: 'nutrition', label: '🍎 Питание', cols: 2, options: [
          { val: 'balanced', emoji: '🥗', label: 'Сбалансированное' },
          { val: 'fastfood', emoji: '🍔', label: 'Фастфуд' },
          { val: 'vegetarian', emoji: '🥦', label: 'Вегетарианское' },
          { val: 'irregular', emoji: '🤷', label: 'Нерегулярное' },
        ]},
      ].map(section => (
        <div key={section.key}>
          <label className="block text-xs font-semibold text-gray-500 mb-2">{section.label}</label>
          <div className={`grid gap-2 ${section.cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {section.options.map(opt => (
              <button key={opt.val} onClick={() => onChange({ ...data, [section.key]: opt.val })}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                  data[section.key] === opt.val
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : 'border-[rgba(120,160,200,0.2)] bg-white/60 text-gray-600 hover:bg-white'
                }`}>
                <span className="text-lg mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 6: Complete ─────────────────────────────────────────────────────────

function Step6({ data, onChange, isMinor, cardCode }: {
  data: StepData; onChange: (d: StepData) => void; isMinor: boolean; cardCode: string | null;
}) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ru';

  if (cardCode) {
    // Card created — show success
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">ГОТОВО!</p>
        <h3 className="text-2xl font-semibold text-[#2a2540] mb-2">
          Медкарта <em className="font-serif italic font-normal text-pink-500">создана!</em>
        </h3>
        <div className="bg-gradient-to-br from-[#e0d8f0] to-[#d4dff0] rounded-3xl p-6 mb-6 mt-4">
          <p className="text-xs text-gray-500 mb-1">Номер вашей медкарты</p>
          <p className="text-3xl font-extrabold tracking-widest" style={{ color: '#2a2540' }}>{cardCode}</p>
          <p className="text-xs text-gray-400 mt-1">aivita.uz/card/{cardCode}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          {[
            { emoji: '🧬', title: 'AI-чекап', sub: 'Оцени здоровье за 3 мин', href: `/${locale}/test` },
            { emoji: '📊', title: 'Показатели', sub: 'Добавь первые данные', href: `/${locale}/vitals` },
            { emoji: '📋', title: 'Медкарта', sub: 'Просмотр и дополнение', href: `/${locale}/medical-card` },
            { emoji: '💊', title: 'Лекарства', sub: 'Добавь свои препараты', href: `/${locale}/medications` },
          ].map(item => (
            <button key={item.title} onClick={() => router.push(item.href)}
              className="bg-white/70 backdrop-blur rounded-2xl border border-[rgba(120,160,200,0.15)] p-3 hover:bg-white transition-all text-left active:scale-95">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <div className="text-sm font-semibold text-[#2a2540]">{item.title}</div>
              <div className="text-xs text-gray-400">{item.sub}</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => router.push(`/${locale}/home`)}
          className="w-full h-14 font-bold rounded-2xl text-sm text-white transition-all hover:-translate-y-0.5 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f472b6, #60a5fa, #34d399)' }}
        >
          Открыть приложение →
        </button>
      </div>
    );
  }

  // Step 6 input — parent consent for minor, nothing for adult
  if (isMinor) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-600 mb-2">СОГЛАСИЕ РОДИТЕЛЯ</p>
          <h3 className="text-2xl font-semibold text-[#2a2540] mb-1">Последний <em className="font-serif italic font-normal text-pink-500">шаг</em></h3>
          <p className="text-sm text-gray-500 mb-5">Нам нужно согласие родителя или опекуна</p>
        </div>
        {[
          { key: 'parentPhone',    label: '📞 Телефон родителя',       placeholder: '+998 90 123 45 67'     },
          { key: 'parentRelation', label: '👨‍👩‍👦 Кем приходится',          placeholder: 'Мама, папа, опекун...' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
            <input
              value={(data[f.key] as string) ?? ''}
              onChange={e => onChange({ ...data, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-[rgba(120,160,200,0.25)] px-3 py-2.5 text-sm outline-none focus:border-pink-300"
              style={{ color: '#2a2540' }}
            />
          </div>
        ))}
        <button
          onClick={() => onChange({ ...data, consent: !data.consent })}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left"
          style={{ background: data.consent ? '#f0fdf4' : 'white', borderColor: data.consent ? '#86efac' : 'rgba(120,160,200,0.2)' }}
        >
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${data.consent ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
            {!!data.consent && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Я подтверждаю, что получил(а) согласие родителя или законного опекуна на использование этого сервиса
          </p>
        </button>
      </div>
    );
  }

  // Adult — just show "almost done"
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">✨</div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">ПОЧТИ ГОТОВО!</p>
      <h3 className="text-2xl font-semibold text-[#2a2540] mb-3">Создаём медкарту</h3>
      <p className="text-sm text-gray-500 mb-6">Нажми кнопку ниже — твоя персональная медкарта будет готова мгновенно</p>
      <div className="bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-[rgba(120,160,200,0.15)] p-5 mb-6">
        <p className="text-xs text-gray-500 mb-2">Что ты получишь:</p>
        <div className="space-y-1.5 text-left">
          {['🏥 Электронная медкарта с уникальным номером', '🔗 QR-код для врачей', '🤖 AI-мониторинг здоровья', '📊 Персональные рекомендации'].map(t => (
            <p key={t} className="text-xs text-gray-600">{t}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ru';

  const [step, setStep] = useState(1);
  const [isMinor, setIsMinor] = useState(false);
  const [cardCode, setCardCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepData, setStepData] = useState<Record<number, StepData>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const TOTAL_STEPS = 6;

  // Load status on mount
  useEffect(() => {
    fetch('/api/proxy/onboarding/status')
      .then(r => {
        if (r.status === 401) {
          // Session expired — force re-login
          window.location.href = `/${locale}/sign-in`;
          return null;
        }
        return r.json();
      })
      .then((j: { data?: { completed: boolean; currentStep: number; isMinor: boolean; cardCode: string | null } } | null) => {
        if (!j) return;
        if (j.data?.completed) {
          window.location.href = `/${locale}/home`;
          return;
        }
        if (j.data && j.data.currentStep > 0) {
          setStep(Math.min(j.data.currentStep + 1, TOTAL_STEPS));
          setIsMinor(j.data.isMinor);
        }
        if (j.data?.cardCode) setCardCode(j.data.cardCode);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentData = stepData[step] ?? {};
  function updateData(d: StepData) {
    setStepData(prev => ({ ...prev, [step]: d }));
  }
  // Update isMinor when step 1 birthDate changes
  useEffect(() => {
    const dob = stepData[1]?.dateOfBirth as string | undefined;
    if (dob) {
      const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      setIsMinor(age < 18);
    }
  }, [stepData]);

  const saveStep = useCallback(async (stepNum: number, data: StepData) => {
    setLoading(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/proxy/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepNum, data }),
      });

      // Session expired — redirect to login
      if (res.status === 401) {
        window.location.href = `/${locale}/sign-in`;
        return;
      }

      if (!res.ok) {
        setSaveError('Ошибка сервера. Попробуйте ещё раз.');
        return;
      }

      const json = await res.json() as { data?: { isMinor?: boolean; cardCode?: string; completed?: boolean } };
      if (json.data?.isMinor !== undefined) setIsMinor(json.data.isMinor);
      if (json.data?.cardCode) setCardCode(json.data.cardCode);
      if (json.data?.completed) {
        // Stay on step 6 to show the success card
        setStep(TOTAL_STEPS);
        return;
      }
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
    } catch (e) {
      console.error(e);
      setSaveError('Нет соединения. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  function handleNext() {
    void saveStep(step, currentData);
  }

  function handleSkip() {
    void saveStep(step, {});
  }

  // Validation per step
  function isValid(): boolean {
    const d = currentData;
    if (step === 1) return !!(d.dateOfBirth && d.gender);
    if (step === 6 && isMinor) return !!(d.consent);
    return true;
  }

  const showStep6Success = step === TOTAL_STEPS && cardCode;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[rgb(var(--bg-base-1))]">
      <OrbBg />
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-5 pb-6 max-w-sm mx-auto w-full">

        {/* Progress */}
        {!showStep6Success && (
          <ProgressBar
            step={step}
            total={TOTAL_STEPS}
            onBack={step > 1 ? () => setStep(s => s - 1) : undefined}
          />
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto mt-4 pb-4">
          {step === 1 && <Step1 data={currentData} onChange={updateData} />}
          {step === 2 && <Step2 data={currentData} onChange={updateData} isMinor={isMinor} />}
          {step === 3 && <Step3 data={currentData} onChange={updateData} isMinor={isMinor} />}
          {step === 4 && (isMinor ? <Step4Teen data={currentData} onChange={updateData} /> : <Step4Adult data={currentData} onChange={updateData} />)}
          {step === 5 && (isMinor ? <Step5Teen data={currentData} onChange={updateData} /> : <Step5Adult data={currentData} onChange={updateData} />)}
          {step === 6 && <Step6 data={currentData} onChange={updateData} isMinor={isMinor} cardCode={showStep6Success ? cardCode : null} />}
        </div>

        {/* Bottom actions */}
        {!showStep6Success && (
          <div className="mt-4 space-y-2">
            {saveError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                {saveError}
              </div>
            )}
            <NextBtn
              onClick={handleNext}
              disabled={!isValid()}
              loading={loading}
              label={step === TOTAL_STEPS ? '🎉 Создать медкарту' : 'Продолжить'}
            />
            {step < TOTAL_STEPS && step !== 1 && (
              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full flex items-center justify-center h-11 text-gray-400 text-sm hover:text-[#2a2540] transition-colors"
              >
                Пропустить →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
