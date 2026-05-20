'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  connection: { consultationCount: number };
  user: { id: string; name: string };
}

interface MedRow { id: string; title: string; dosage: string | null }

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none';
  description: string;
  recommendation: string;
}

const SEVERITY_CONFIG: Record<DrugInteraction['severity'], {
  bg: string; border: string; badge: string; icon: string; label: string;
}> = {
  critical: { bg: '#fde8e8', border: '#dc3545', badge: '#dc3545', icon: '⛔', label: 'Критично' },
  major:    { bg: '#fff3cd', border: '#fd7e14', badge: '#fd7e14', icon: '⚠️', label: 'Серьёзное' },
  moderate: { bg: '#fff8e1', border: '#ffc107', badge: '#ffc107', icon: 'ℹ️', label: 'Умеренное' },
  minor:    { bg: '#f8f9fa', border: '#adb5bd', badge: '#6c757d', icon: '💬', label: 'Незначительное' },
  none:     { bg: '#e8f4ec', border: '#28a745', badge: '#28a745', icon: '✅', label: 'Нет взаимодействия' },
};

function initials(n: string) {
  return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorDrugCheckerPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const searchParams = useSearchParams();
  const prePatientId = searchParams?.get('patientId') ?? '';

  const inputRef = useRef<HTMLInputElement>(null);

  const [patients, setPatients]         = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientMeds, setPatientMeds]   = useState<MedRow[]>([]);
  const [medsLoading, setMedsLoading]   = useState(false);

  const [newDrug, setNewDrug]           = useState('');
  const [interactions, setInteractions] = useState<DrugInteraction[] | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [sendLoading, setSendLoading]   = useState(false);
  const [error, setError]               = useState('');
  const [sent, setSent]                 = useState(false);

  // Load patients on mount
  useEffect(() => {
    apiRequest<Patient[]>('/doctor/patients?status=active')
      .then(r => { if ('data' in r) setPatients(r.data ?? []); })
      .finally(() => setPatientsLoading(false));
  }, []);

  // Preselect patient from URL param
  useEffect(() => {
    if (prePatientId && patients.length > 0 && !selectedPatient) {
      const found = patients.find(p => p.user.id === prePatientId);
      if (found) selectPatient(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prePatientId, patients]);

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setPatientSearch(p.user.name);
    setShowPatientDropdown(false);
    setInteractions(null);
    setNewDrug('');
    setSent(false);
    setError('');
    loadPatientMeds(p.user.id);
  }

  async function loadPatientMeds(patientId: string) {
    setMedsLoading(true);
    const res = await fetch(`/api/proxy/drugs/patient-meds?patientId=${patientId}`);
    const json = await res.json() as { data?: MedRow[] };
    setPatientMeds(json.data ?? []);
    setMedsLoading(false);
  }

  async function checkInteractions() {
    if (!selectedPatient || !newDrug.trim()) {
      setError('Выберите пациента и введите название лекарства');
      return;
    }
    setCheckLoading(true);
    setError('');
    setInteractions(null);
    setSent(false);
    const res = await fetch('/api/proxy/drugs/check-for-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: selectedPatient.user.id, newDrug: newDrug.trim() }),
    });
    const json = await res.json() as { data?: { interactions: DrugInteraction[]; patientDrugs: string[]; safe: boolean }; error?: string };
    setCheckLoading(false);
    if (json.error || !json.data) {
      setError(json.error ?? 'Ошибка проверки');
      return;
    }
    setInteractions(json.data.interactions);
  }

  async function sendPrescription() {
    if (!selectedPatient || !newDrug.trim()) return;
    setSendLoading(true);
    setError('');

    // Find or create conversation with patient
    const convRes = await fetch('/api/proxy/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: 'me', patientId: selectedPatient.user.id }),
    });
    // conversations POST requires patientId, but doctor sends doctorId from their own session
    // Use the reverse: find by patientId from doctor side
    const convJson = await convRes.json() as { data?: { id: string }; error?: string };

    if (!convJson.data?.id) {
      // Try GET to find existing conversation
      const listRes = await fetch('/api/proxy/conversations');
      const listJson = await listRes.json() as { data?: Array<{ id: string; patientId?: string }> };
      const existing = listJson.data?.find(c => c.patientId === selectedPatient.user.id);
      if (!existing) {
        setError('Нет активного чата с этим пациентом');
        setSendLoading(false);
        return;
      }
      convJson.data = existing;
    }

    const msgRes = await fetch(`/api/proxy/conversations/${convJson.data.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'prescription',
        content: `💊 Назначено: ${newDrug.trim()}`,
        metadata: { drugName: newDrug.trim(), title: newDrug.trim() },
      }),
    });

    setSendLoading(false);
    if (msgRes.ok) {
      setSent(true);
    } else {
      setError('Не удалось отправить назначение');
    }
  }

  const filteredPatients = patients.filter(p =>
    p.user.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const hasDanger = interactions?.some(i => i.severity === 'critical' || i.severity === 'major');

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-md px-4 pt-12 pb-3 flex items-center gap-3"
        style={{ background: 'rgba(244, 243, 239, 0.95)' }}>
        <Link href={`/${locale}/doctor-home`}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border text-[color:var(--accent-dark)] font-bold text-lg"
          style={{ borderColor: '#e8e4dc' }}>‹</Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9a96a8' }}>ВРАЧ</p>
          <h1 className="font-bold text-[#2a2540] text-[18px]">💊 Совместимость лекарств</h1>
        </div>
      </div>

      <div className="px-4 pb-28 space-y-4">

        {/* Patient selector */}
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9a96a8' }}>
            ПАЦИЕНТ
          </label>
          <div className="relative">
            <input
              value={patientSearch}
              onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
              onFocus={() => setShowPatientDropdown(true)}
              onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
              placeholder={patientsLoading ? 'Загрузка пациентов…' : 'Поиск пациента…'}
              className="w-full rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
              style={{ background: '#f4f3ef', border: '1px solid #e8e4dc' }}
            />
            {showPatientDropdown && filteredPatients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[14px] border shadow-lg z-20 max-h-48 overflow-y-auto"
                style={{ borderColor: '#e8e4dc' }}>
                {filteredPatients.map(p => (
                  <button
                    key={p.user.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f4f3ef] transition-colors"
                    onMouseDown={() => selectPatient(p)}
                  >
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #6BA3D6, #4a7fb5)' }}>
                      {initials(p.user.name)}
                    </div>
                    <span className="text-[13px] font-medium text-[#2a2540]">{p.user.name}</span>
                    <span className="text-[11px] text-[#9a96a8] ml-auto">{p.connection.consultationCount} конс.</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Patient current meds */}
          {selectedPatient && (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9a96a8' }}>
                ТЕКУЩИЕ ЛЕКАРСТВА ПАЦИЕНТА
              </p>
              {medsLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-[#9a96a8]">
                  <span className="animate-spin">⏳</span> Загружаем…
                </div>
              ) : patientMeds.length === 0 ? (
                <p className="text-[12px] text-[#9a96a8]">Нет активных лекарств</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patientMeds.map(m => (
                    <span key={m.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{ background: '#e8f0fb', color: '#4a7fb5', border: '1px solid #c8d8f0' }}>
                      💊 {m.title}{m.dosage ? ` · ${m.dosage}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* New drug input */}
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9a96a8' }}>
            НОВОЕ ЛЕКАРСТВО ДЛЯ НАЗНАЧЕНИЯ
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newDrug}
              onChange={e => { setNewDrug(e.target.value); setInteractions(null); setSent(false); }}
              onKeyDown={e => { if (e.key === 'Enter') void checkInteractions(); }}
              placeholder="Название лекарства…"
              className="flex-1 rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
              style={{ background: '#f4f3ef', border: '1px solid #e8e4dc' }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] font-semibold text-center" style={{ color: '#dc3545' }}>{error}</p>
        )}

        {/* Check button */}
        <button
          onClick={() => void checkInteractions()}
          disabled={checkLoading || !selectedPatient || !newDrug.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] text-[14px] font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #6BA3D6, #4a7fb5)' }}
        >
          {checkLoading
            ? <><span className="animate-spin">⏳</span> Проверяем…</>
            : <>🔍 Проверить совместимость</>}
        </button>

        {/* Results */}
        {interactions !== null && (
          <div className="space-y-3">
            {/* Summary banner */}
            <div
              className="rounded-[14px] px-4 py-3 text-[13px] font-semibold"
              style={{
                background: hasDanger ? '#fff3cd' : '#e8f4ec',
                color: '#2a2540',
                border: `1px solid ${hasDanger ? '#fd7e14' : '#28a745'}`,
              }}
            >
              {hasDanger
                ? `⚠️ Обнаружены взаимодействия с лекарствами пациента — назначение требует внимания.`
                : `✅ Опасных взаимодействий с текущими лекарствами пациента не обнаружено.`}
            </div>

            {/* Interaction cards */}
            {interactions.map((pair, i) => {
              const cfg = SEVERITY_CONFIG[pair.severity] ?? SEVERITY_CONFIG.none;
              return (
                <div key={i}
                  className="rounded-[16px] border-l-4 p-4"
                  style={{ background: cfg.bg, borderLeftColor: cfg.border }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{pair.drug1}</span>
                      <span className="text-[11px]" style={{ color: '#9a96a8' }}>+</span>
                      <span className="text-[14px] font-bold" style={{ color: '#2a2540' }}>{pair.drug2}</span>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                      style={{ background: cfg.badge }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  {pair.description && (
                    <p className="text-[12px] leading-relaxed mb-2" style={{ color: '#2a2540' }}>{pair.description}</p>
                  )}
                  {pair.recommendation && (
                    <p className="text-[12px] leading-relaxed font-semibold" style={{ color: '#2a2540' }}>
                      💡 {pair.recommendation}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Send prescription button */}
            {sent ? (
              <div className="rounded-[14px] px-4 py-3 text-[13px] font-semibold text-center"
                style={{ background: '#e8f4ec', color: '#2d7a56' }}>
                ✅ Назначение отправлено в чат с пациентом
              </div>
            ) : (
              <button
                onClick={() => void sendPrescription()}
                disabled={sendLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-[13px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: hasDanger ? '#fd7e14' : '#2d7a56' }}
              >
                {sendLoading
                  ? <><span className="animate-spin">⏳</span> Отправляем…</>
                  : hasDanger
                    ? '⚠️ Назначить (есть взаимодействия)'
                    : '✅ Назначить пациенту'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
