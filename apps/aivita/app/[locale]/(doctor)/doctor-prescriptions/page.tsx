'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api-client';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

interface Prescription {
  id: string; type: string; title: string; details?: string;
  frequency?: string; durationDays?: number; status: string;
  patientId: string; createdAt: string;
}
interface PrescRow { prescription: Prescription; patient: { id: string; name: string }; }
interface Template { id: string; type: string; title: string; details?: string; frequency?: string; durationDays?: number; usageCount: number; }
interface Patient { user: { id: string; name: string }; }

const TYPE_ICON: Record<string, string> = { medication: '💊', test: '🧪', procedure: '🩺' };
const TYPE_LABEL: Record<string, string> = { medication: 'Лекарство', test: 'Анализ', procedure: 'Процедура' };
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'var(--accent-bg)', color: 'var(--accent-dark)', label: 'Активно' },
  pending:   { bg: '#fff3e8', color: '#c07038', label: 'Ожидание' },
  completed: { bg: '#e8f4ec', color: '#2d7a56', label: 'Выполнено' },
  cancelled: { bg: '#fff0ec', color: '#c0304a', label: 'Отменено' },
};

function initials(n: string) { return (n ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('ru', { day: '2-digit', month: 'short', year: '2-digit' }); }

export default function DoctorPrescriptionsPage() {
  const { locale = 'ru' } = useParams<{ locale: string }>() ?? {};
  const [presc, setPresc] = useState<PrescRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [tmplSearch, setTmplSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Create form
  const [form, setForm] = useState({
    type: 'medication',
    title: '',
    details: '',
    frequency: '',
    durationDays: '',
    patientId: '',
    templateId: '',
    saveAsTemplate: false,
  });

  const load = (status: string) => {
    setLoading(true);
    apiRequest<PrescRow[]>(`/doctor/prescriptions${status !== 'all' ? `?status=${status}` : ''}`)
      .then(res => { if ('data' in res) setPresc(res.data ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    apiRequest<Template[]>('/doctor/templates').then(res => { if ('data' in res) setTemplates(res.data ?? []); });
    apiRequest<Patient[]>('/doctor/patients?status=active').then(res => { if ('data' in res) setPatients(res.data ?? []); });
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.type === form.type && (tmplSearch === '' || t.title.toLowerCase().includes(tmplSearch.toLowerCase()))
  );

  const applyTemplate = (t: Template) => {
    setForm(f => ({ ...f, title: t.title, details: t.details ?? '', frequency: t.frequency ?? '', durationDays: t.durationDays?.toString() ?? '', templateId: t.id }));
    setTmplSearch('');
  };

  const handleCreate = async () => {
    if (!form.title || !form.patientId) return;
    setSaving(true);
    await apiRequest('/doctor/prescriptions', {
      method: 'POST', body: {
        patientId: form.patientId,
        type: form.type, title: form.title, details: form.details || undefined,
        frequency: form.frequency || undefined,
        durationDays: form.durationDays ? +form.durationDays : undefined,
        templateId: form.templateId || undefined,
      },
    });
    if (form.saveAsTemplate && form.title) {
      await apiRequest('/doctor/templates', {
        method: 'POST', body: { type: form.type, title: form.title, details: form.details, frequency: form.frequency, durationDays: form.durationDays ? +form.durationDays : undefined },
      });
    }
    setSaving(false);
    setShowCreate(false);
    setForm({ type: 'medication', title: '', details: '', frequency: '', durationDays: '', patientId: '', templateId: '', saveAsTemplate: false });
    load(tab);
  };

  const TABS = [
    { id: 'active' as const, label: 'Активные' },
    { id: 'completed' as const, label: 'Выполненные' },
    { id: 'all' as const, label: 'Все' },
  ];

  return (
    <div>
      <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#2a2540]">Назначения</h1>
          <button onClick={() => setShowCreate(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white"
            style={{ background: 'var(--accent-dark)' }}>+ Создать</button>
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{ background: tab === t.id ? 'var(--accent-dark)' : '#fff', color: tab === t.id ? '#fff' : '#9a96a8', border: `1px solid ${tab === t.id ? 'var(--accent-dark)' : '#e8e4dc'}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[color:var(--accent-dark)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : presc.length === 0 ? (
          <div className="text-center py-12">
            <Icon3D name="pill" size={48} />
            <p className="text-[#9a96a8] text-sm mt-3">Нет назначений</p>
          </div>
        ) : presc.map(row => {
          const st = STATUS_STYLE[row.prescription.status] ?? STATUS_STYLE.pending;
          return (
            <div key={row.prescription.id} className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#e8e4dc' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{TYPE_ICON[row.prescription.type] ?? '📋'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2a2540] text-sm">{row.prescription.title}</p>
                  <p className="text-xs text-[#9a96a8] mt-0.5">{row.patient.name}</p>
                  {row.prescription.frequency && <p className="text-xs text-[#9a96a8]">{row.prescription.frequency}</p>}
                  {row.prescription.durationDays && <p className="text-xs text-[#9a96a8]">{row.prescription.durationDays} дней</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  <span className="text-[10px] text-[#9a96a8]">{fmtDate(row.prescription.createdAt)}</span>
                </div>
              </div>
              {row.prescription.details && (
                <p className="text-xs text-[#9a96a8] mt-2 pl-9">{row.prescription.details}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Create prescription modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#2a2540] text-lg">Новое назначение</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#9a96a8] text-xl">✕</button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-2 mb-4">
              {(['medication', 'test', 'procedure'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t, templateId: '' }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: form.type === t ? 'var(--accent-dark)' : '#f0f0f0', color: form.type === t ? '#fff' : '#9a96a8' }}>
                  {TYPE_ICON[t]} {TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            {/* Template search */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#9a96a8]">Шаблоны</label>
              <input value={tmplSearch} onChange={e => setTmplSearch(e.target.value)}
                placeholder="Поиск по шаблонам..."
                className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#e8e4dc' }} />
              {tmplSearch && filteredTemplates.length > 0 && (
                <div className="mt-1.5 border rounded-xl overflow-hidden" style={{ borderColor: '#e8e4dc' }}>
                  {filteredTemplates.slice(0, 5).map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="w-full px-3 py-2.5 text-left text-sm text-[#2a2540] hover:bg-[#f8f7ff] border-b last:border-b-0"
                      style={{ borderColor: '#e8e4dc' }}>
                      {t.title}
                      <span className="text-xs text-[#9a96a8] ml-2">({t.usageCount} исп.)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Patient */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-[#9a96a8]">Пациент *</label>
              <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none bg-white"
                style={{ borderColor: '#e8e4dc', color: form.patientId ? '#2a2540' : '#9a96a8' }}>
                <option value="">Выбрать пациента...</option>
                {patients.map(p => (
                  <option key={p.user.id} value={p.user.id}>{p.user.name}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-[#9a96a8]">Название *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Название назначения..."
                className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#e8e4dc' }} />
            </div>

            {/* Details */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-[#9a96a8]">Детали</label>
              <textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                rows={2} placeholder="Инструкции, дозировка..."
                className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: '#e8e4dc' }} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#9a96a8]">Частота</label>
                <input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                  placeholder="2 раза в день"
                  className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e8e4dc' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#9a96a8]">Дней</label>
                <input type="number" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                  placeholder="7"
                  className="w-full mt-1.5 p-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e8e4dc' }} />
              </div>
            </div>

            {/* Save as template */}
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={form.saveAsTemplate}
                onChange={e => setForm(f => ({ ...f, saveAsTemplate: e.target.checked }))}
                className="w-4 h-4 rounded" style={{ accentColor: 'var(--accent-dark)' }} />
              <span className="text-sm text-[#2a2540]">Сохранить как шаблон</span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border text-[#9a96a8]"
                style={{ borderColor: '#e8e4dc' }}>Отмена</button>
              <button onClick={handleCreate} disabled={saving || !form.title || !form.patientId}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                style={{ background: 'var(--accent-dark)', opacity: saving || !form.title || !form.patientId ? 0.5 : 1 }}>
                {saving ? 'Сохранение...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
