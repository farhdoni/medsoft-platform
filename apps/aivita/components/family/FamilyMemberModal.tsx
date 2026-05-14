'use client';
import { useState, useEffect } from 'react';
import { Search, X, UserCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const PROXY = '/api/proxy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  memberName: string;
  memberRelation: string;
  memberBirthDate?: string | null;
  memberGender?: string | null;
  phone?: string | null;
  notes?: string | null;
  inviteStatus?: string | null;
  memberUserId?: string | null;
}

interface SearchResult {
  userId: string;
  cardCode: string;
  name: string | null;
  avatarUrl: string | null;
}

// ─── Relation options — 4-column grid ────────────────────────────────────────

const RELATIONS = [
  { value: 'wife',    label: 'Жена',   emoji: '👩' },
  { value: 'husband', label: 'Муж',    emoji: '👨' },
  { value: 'son',     label: 'Сын',    emoji: '👦' },
  { value: 'daughter',label: 'Дочь',   emoji: '👧' },
  { value: 'mother',  label: 'Мама',   emoji: '👩‍🦳' },
  { value: 'father',  label: 'Папа',   emoji: '👨‍🦳' },
  { value: 'brother', label: 'Брат',   emoji: '🧑' },
  { value: 'sister',  label: 'Сестра', emoji: '👩' },
  { value: 'spouse',  label: 'Супруг', emoji: '💑' },
  { value: 'child',   label: 'Ребёнок',emoji: '🧒' },
  { value: 'parent',  label: 'Родитель',emoji: '🧑‍🦳'},
  { value: 'other',   label: 'Другое', emoji: '👤' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  member: FamilyMember | null;  // null = добавление
  onSaved: () => void;
}

export function FamilyMemberModal({ open, onClose, member, onSaved }: Props) {
  const isEdit = !!member;

  // ── Search state (only for add mode) ───────────────────────────────────────
  const [cardInput,    setCardInput]    = useState('');
  const [searching,    setSearching]    = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchErr,    setSearchErr]    = useState('');
  const [memberUserId, setMemberUserId] = useState<string | null>(null);
  const [nameReadonly, setNameReadonly] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,      setName]      = useState('');
  const [relation,  setRelation]  = useState('child');
  const [birthDate, setBirthDate] = useState('');
  const [gender,    setGender]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [err,       setErr]       = useState('');

  // Заполняем поля при открытии
  useEffect(() => {
    if (open) {
      setName(member?.memberName ?? '');
      setRelation(member?.memberRelation ?? 'child');
      setBirthDate(member?.memberBirthDate ?? '');
      setGender(member?.memberGender ?? '');
      setPhone(member?.phone ?? '');
      setNotes(member?.notes ?? '');
      setErr('');
      // Reset search
      setCardInput('');
      setSearchResult(null);
      setSearchErr('');
      setMemberUserId(null);
      setNameReadonly(false);
    }
  }, [open, member]);

  // ── Search handler ──────────────────────────────────────────────────────────
  async function handleSearch() {
    const code = cardInput.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    setSearchErr('');
    setSearchResult(null);
    setMemberUserId(null);
    setNameReadonly(false);
    try {
      const res = await fetch(`${PROXY}/family/search?card=${encodeURIComponent(code)}`);
      if (res.status === 404) { setSearchErr('Пользователь с такой медкартой не найден'); return; }
      if (res.status === 409) { setSearchErr('Это ваша собственная медкарта'); return; }
      if (!res.ok) { setSearchErr('Ошибка поиска. Попробуйте снова.'); return; }
      const json = await res.json() as { data: SearchResult };
      setSearchResult(json.data);
    } catch {
      setSearchErr('Ошибка соединения. Попробуйте снова.');
    } finally {
      setSearching(false);
    }
  }

  function handleLink() {
    if (!searchResult) return;
    setMemberUserId(searchResult.userId);
    setName(searchResult.name ?? '');
    setNameReadonly(true);
    setSearchErr('');
  }

  function handleUnlink() {
    setMemberUserId(null);
    setSearchResult(null);
    setNameReadonly(false);
    setCardInput('');
  }

  // ── Save / Delete ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) { setErr('Введите имя'); return; }
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = {
        memberName:      name.trim(),
        memberRelation:  relation,
        memberBirthDate: birthDate || null,
        memberGender:    gender || null,
        phone:           phone.trim() || null,
        notes:           notes.trim() || null,
      };

      // If linking to an Aivita user: create member with pending status (no memberUserId yet)
      const isLinking = !isEdit && !!memberUserId;
      if (isLinking) body.inviteStatus = 'pending';

      const url = isEdit ? `${PROXY}/family/${member!.id}` : `${PROXY}/family`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('server_error');
      const json = await res.json() as { data: { id: string } };

      // Send link request to the found user
      if (isLinking && memberUserId) {
        await fetch(`${PROXY}/family/link-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId: memberUserId, familyMemberId: json.data.id }),
        });
      }

      onSaved();
      onClose();
    } catch {
      setErr('Не удалось сохранить. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!member) return;
    if (!confirm(`Удалить ${member.memberName} из семьи?`)) return;
    setDeleting(true);
    try {
      await fetch(`${PROXY}/family/${member.id}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } catch {
      setErr('Не удалось удалить.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Редактировать: ${member?.memberName}` : 'Добавить члена семьи'}
      footer={
        <div className="flex flex-col gap-2">
          {err && <p className="text-xs font-semibold text-red-500">{err}</p>}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, var(--accent, #9c5e6c), var(--accent-dark, #7a3d4a))' }}
          >
            {saving ? 'Сохраняем…' : isEdit ? '💾 Сохранить изменения' : '👨‍👩‍👧 Добавить'}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              {deleting ? 'Удаляем…' : '🗑 Удалить из семьи'}
            </button>
          )}
        </div>
      }
    >
      {/* ── Поиск по медкарте (только добавление) ───────────────────────── */}
      {!isEdit && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: '#f4f3ef' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>
            Поиск по номеру медкарты
          </p>

          {/* Если пользователь уже привязан — показываем карточку */}
          {memberUserId && searchResult ? (
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: '#d4e8d8', border: '1px solid #a8d4b0' }}
            >
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base"
                style={{ background: '#fff' }}
              >
                {searchResult.avatarUrl
                  ? <img src={searchResult.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: '#1a4a2a' }}>
                  {searchResult.name ?? 'Пользователь Aivita'}
                </p>
                <p className="text-[11px] font-mono" style={{ color: '#4a8a5a' }}>
                  {searchResult.cardCode}
                </p>
              </div>
              <UserCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#2a7040' }} aria-hidden="true" />
              <button
                onClick={handleUnlink}
                className="ml-1 w-6 h-6 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ background: 'rgba(0,0,0,0.08)' }}
                title="Отвязать"
              >
                <X className="w-3 h-3" style={{ color: '#2a7040' }} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={cardInput}
                  onChange={e => { setCardInput(e.target.value.toUpperCase()); setSearchErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
                  placeholder="AI-2026-XXXXX"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm font-mono outline-none focus:border-[#9c5e6c] transition-colors"
                  style={{ color: '#2a2540', borderColor: '#e0ddd8', background: '#fff' }}
                />
                <button
                  onClick={() => void handleSearch()}
                  disabled={searching || !cardInput.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity flex items-center gap-1.5"
                  style={{ background: 'var(--accent, #9c5e6c)' }}
                >
                  {searching
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Search className="w-4 h-4" aria-hidden="true" />}
                  Найти
                </button>
              </div>

              {/* Ошибка поиска */}
              {searchErr && (
                <p className="text-[12px] font-semibold mt-2" style={{ color: '#c0392b' }}>
                  {searchErr}
                </p>
              )}

              {/* Найденный пользователь */}
              {searchResult && !memberUserId && (
                <div
                  className="flex items-center gap-3 mt-3 p-3 rounded-xl"
                  style={{ background: '#fff', border: '1px solid #e0ddd8' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base overflow-hidden"
                    style={{ background: '#f0d4dc' }}
                  >
                    {searchResult.avatarUrl
                      ? <img src={searchResult.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: '#2a2540' }}>
                      {searchResult.name ?? 'Пользователь Aivita'}
                    </p>
                    <p className="text-[11px] font-mono" style={{ color: '#9a96a8' }}>
                      {searchResult.cardCode}
                    </p>
                  </div>
                  <button
                    onClick={handleLink}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white transition hover:opacity-80"
                    style={{ background: 'var(--accent, #9c5e6c)' }}
                  >
                    Привязать
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Divider (только если не привязан и не в режиме редактирования) */}
      {!isEdit && !memberUserId && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: '#e8e4dc' }} />
          <span className="text-[11px]" style={{ color: '#b0acbc' }}>или введите вручную</span>
          <div className="flex-1 h-px" style={{ background: '#e8e4dc' }} />
        </div>
      )}

      {/* ── Имя ──────────────────────────────────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Имя *</p>
      <input
        autoFocus={isEdit}
        value={name}
        onChange={e => { if (!nameReadonly) setName(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Enter') void handleSave(); }}
        placeholder="Например: Алия, Дима..."
        readOnly={nameReadonly}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{
          color: '#2a2540',
          borderColor: '#e8e4dc',
          background: nameReadonly ? '#f4f3ef' : '#fff',
          cursor: nameReadonly ? 'default' : 'text',
        }}
      />

      {/* ── Кем приходится — 4-column grid ──────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9a96a8' }}>Кем приходится</p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {RELATIONS.map(r => {
          const selected = relation === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setRelation(r.value)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-[14px] text-center cursor-pointer transition-all border-2"
              style={{
                borderColor: selected ? '#9c5e6c' : '#e8e4dc',
                background:  selected ? '#f0d4dc' : '#fafafa',
              }}
            >
              <span className="text-lg leading-none">{r.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: selected ? '#7a3d4a' : '#6a6580' }}>
                {r.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Дата рождения ────────────────────────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Дата рождения (необязательно)</p>
      <input
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
        type="date"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />

      {/* ── Пол ──────────────────────────────────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Пол</p>
      <div className="flex gap-2 mb-5">
        {[
          { value: 'male',   label: '👨 Мужской' },
          { value: 'female', label: '👩 Женский' },
          { value: '',       label: '— Не указан' },
        ].map(g => {
          const sel = gender === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border-2"
              style={{
                borderColor: sel ? '#9c5e6c' : '#e8e4dc',
                background:  sel ? '#f0d4dc' : '#fafafa',
                color:        sel ? '#7a3d4a' : '#6a6580',
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* ── Телефон ──────────────────────────────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Телефон (необязательно)</p>
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        type="tel"
        placeholder="+998 90 123 45 67"
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-5 focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />

      {/* ── Заметки ──────────────────────────────────────────────────────── */}
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#9a96a8' }}>Заметки (необязательно)</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Аллергии, особенности здоровья..."
        rows={3}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none focus:border-[#9c5e6c] transition-colors"
        style={{ color: '#2a2540', borderColor: '#e8e4dc' }}
      />
    </Modal>
  );
}
