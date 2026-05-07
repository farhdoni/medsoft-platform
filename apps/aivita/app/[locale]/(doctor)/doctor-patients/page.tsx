'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface Patient {
  connection: { consultationCount: number; lastConsultationAt?: string; status: string; notes?: string };
  user: { id: string; name: string; email: string; avatarUrl?: string };
}

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(s?: string) { return s ? new Date(s).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'; }

const TABS = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'pending', label: 'Новые запросы' },
  { id: 'archived', label: 'Архив' },
];

export default function DoctorPatientsPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = (status?: string) => {
    setLoading(true);
    apiRequest<Patient[]>(`/doctor/patients${status && status !== 'all' ? `?status=${status}` : ''}`)
      .then(res => { if ('data' in res) setPatients(res.data ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const filtered = useMemo(() =>
    patients.filter(p => p.user.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  const pending = patients.filter(p => p.connection.status === 'pending');

  const handleAccept = async (patientId: string) => {
    setAccepting(patientId);
    await apiRequest('/doctor/patients/accept', { method: 'POST', body: { patientId } });
    setAccepting(null);
    load(tab);
  };

  const handleArchive = async (patientId: string) => {
    await apiRequest('/doctor/patients/archive', { method: 'POST', body: { patientId } });
    load(tab);
  };

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f4f3ef]/90 backdrop-blur-md px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#2a2540]">Мои пациенты</h1>
          <span className="text-sm text-[#9a96a8]">{patients.length} чел.</span>
        </div>
        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Icon3D name="search" size={16} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-white outline-none"
            style={{ borderColor: '#e8e4dc', color: '#2a2540' }}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                background: tab === t.id ? '#6e5fa0' : '#fff',
                color: tab === t.id ? '#fff' : '#9a96a8',
                border: `1px solid ${tab === t.id ? '#6e5fa0' : '#e8e4dc'}`,
              }}>
              {t.label}
              {t.id === 'pending' && pending.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 text-[10px]">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pending requests — отдельная секция */}
        {tab === 'all' && pending.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-[#9a96a8] uppercase tracking-wide mb-2">Ожидают подтверждения</h2>
            <div className="space-y-2">
              {pending.map(p => (
                <div key={p.user.id} className="bg-white rounded-2xl p-4 border flex items-center gap-3"
                  style={{ borderColor: '#e8e4dc' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                    {initials(p.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#2a2540] text-sm">{p.user.name}</p>
                    <p className="text-xs text-[#9a96a8]">Новый запрос</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(p.user.id)} disabled={accepting === p.user.id}
                      className="text-xs px-3 py-1.5 rounded-full text-white font-medium transition-opacity"
                      style={{ background: '#6e5fa0', opacity: accepting === p.user.id ? 0.6 : 1 }}>
                      {accepting === p.user.id ? '...' : 'Принять'}
                    </button>
                    <button onClick={() => handleArchive(p.user.id)}
                      className="text-xs px-3 py-1.5 rounded-full text-[#9a96a8] font-medium bg-gray-100">
                      Откл.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[#6e5fa0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Icon3D name="family" size={48} />
            <p className="text-[#9a96a8] text-sm mt-3">
              {search ? 'Не найдено' : 'Нет пациентов'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Link key={p.user.id} href={`/${locale}/doctor-patient/${p.user.id}`}>
                <div className="bg-white rounded-2xl p-4 border flex items-center gap-3 active:opacity-80"
                  style={{ borderColor: '#e8e4dc' }}>
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, #8aa1cc, #6e5fa0)' }}>
                    {initials(p.user.name)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#2a2540] text-sm">{p.user.name}</p>
                      {p.connection.status === 'pending' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Новый</span>
                      )}
                    </div>
                    <p className="text-xs text-[#9a96a8] mt-0.5">
                      {p.connection.consultationCount} конс. · последняя {fmtDate(p.connection.lastConsultationAt)}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div className="text-[#9a96a8] text-sm">›</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
