'use client';
import * as React from 'react';
import { X } from 'lucide-react';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ParsedMedical {
  allergies?: string[];
  chronicDiseases?: string[];
  medications?: { name: string; dosage?: string; frequency?: string }[];
  vaccinations?: { name: string; date?: string }[];
  surgeries?: { name: string; date?: string }[];
  diagnoses?: { name: string; date?: string; doctor?: string }[];
  labResults?: {
    testName: string; value?: string; unit?: string;
    referenceRange?: string; status?: string; date?: string;
  }[];
}

interface Props {
  data: ParsedMedical;
  onClose: () => void;
  onApplied?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBlock({
  title, children,
}: {
  title: string; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 0',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2a2540', flex: 1, textAlign: 'left' }}>{title}</span>
        <span style={{ color: '#9a96a8', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ paddingLeft: 4 }}>{children}</div>}
    </div>
  );
}

function CheckItem({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
      <input
        type="checkbox" checked={checked} onChange={onChange}
        style={{ accentColor: '#9c5e6c', width: 14, height: 14, flexShrink: 0 }}
      />
      <span style={{ fontSize: 12, color: '#2a2540', lineHeight: 1.4 }}>{label}</span>
    </label>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AiDocumentModal({ data, onClose, onApplied }: Props) {
  const allergies = data.allergies ?? [];
  const chronicDiseases = data.chronicDiseases ?? [];
  const medications = data.medications ?? [];
  const labResults = data.labResults ?? [];
  const vaccinations = data.vaccinations ?? [];
  const surgeries = data.surgeries ?? [];
  const diagnoses = data.diagnoses ?? [];

  const [selAllergies, setSelAllergies] = React.useState(() =>
    new Set<number>(allergies.map((_, i) => i)));
  const [selChronic, setSelChronic] = React.useState(() =>
    new Set<number>(chronicDiseases.map((_, i) => i)));
  const [selMeds, setSelMeds] = React.useState(() =>
    new Set<number>(medications.map((_, i) => i)));
  const [selLabs, setSelLabs] = React.useState(() =>
    new Set<number>(labResults.map((_, i) => i)));
  const [applying, setApplying] = React.useState(false);

  function toggle(
    set: Set<number>,
    val: number,
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
  ) {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  }

  const totalSelected = selAllergies.size + selChronic.size + selMeds.size + selLabs.size;
  const hasAnything =
    allergies.length + chronicDiseases.length + medications.length +
    labResults.length + vaccinations.length + surgeries.length + diagnoses.length > 0;

  async function handleApply() {
    setApplying(true);
    try {
      const payload = {
        allergies: [...selAllergies].map(i => allergies[i]).filter(Boolean),
        chronicDiseases: [...selChronic].map(i => chronicDiseases[i]).filter(Boolean),
        medications: [...selMeds].map(i => medications[i]).filter(Boolean),
        labResults: [...selLabs].map(i => labResults[i]).filter(Boolean),
      };
      await fetch('/api/proxy/medical/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      onApplied?.();
      onClose();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'white', borderRadius: '20px 20px 0 0',
          padding: '20px 20px 32px', width: '100%', maxWidth: 480,
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2a2540', margin: 0 }}>🤖 AI нашёл в документе</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Закрыть"
          >
            <X size={20} color="#9a96a8" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!hasAnything ? (
            <p style={{ color: '#9a96a8', fontSize: 13 }}>Медицинские данные не найдены в документе.</p>
          ) : (
            <>
              {/* Allergies */}
              {allergies.length > 0 && (
                <CategoryBlock title={`Аллергии (${allergies.length})`}>
                  {allergies.map((a, i) => (
                    <CheckItem
                      key={i} label={a}
                      checked={selAllergies.has(i)}
                      onChange={() => toggle(selAllergies, i, setSelAllergies)}
                    />
                  ))}
                </CategoryBlock>
              )}

              {/* Chronic */}
              {chronicDiseases.length > 0 && (
                <CategoryBlock title={`Хронические заболевания (${chronicDiseases.length})`}>
                  {chronicDiseases.map((c, i) => (
                    <CheckItem
                      key={i} label={c}
                      checked={selChronic.has(i)}
                      onChange={() => toggle(selChronic, i, setSelChronic)}
                    />
                  ))}
                </CategoryBlock>
              )}

              {/* Medications */}
              {medications.length > 0 && (
                <CategoryBlock title={`Препараты (${medications.length})`}>
                  {medications.map((m, i) => (
                    <CheckItem
                      key={i}
                      label={[m.name, m.dosage, m.frequency].filter(Boolean).join(' — ')}
                      checked={selMeds.has(i)}
                      onChange={() => toggle(selMeds, i, setSelMeds)}
                    />
                  ))}
                </CategoryBlock>
              )}

              {/* Lab Results */}
              {labResults.length > 0 && (
                <CategoryBlock title={`Лабораторные результаты (${labResults.length})`}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ color: '#9a96a8' }}>
                          <th style={{ textAlign: 'left', padding: '3px 6px 3px 0', fontWeight: 600 }}></th>
                          <th style={{ textAlign: 'left', padding: '3px 6px 3px 0', fontWeight: 600 }}>Показатель</th>
                          <th style={{ textAlign: 'left', padding: '3px 6px 3px 0', fontWeight: 600 }}>Результат</th>
                          <th style={{ textAlign: 'left', padding: '3px 6px 3px 0', fontWeight: 600 }}>Норма</th>
                          <th style={{ textAlign: 'left', padding: '3px 0 3px 0', fontWeight: 600 }}>Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labResults.map((lr, i) => {
                          const isAbn = lr.status === 'abnormal' || lr.status === 'critical';
                          const isNorm = lr.status === 'normal';
                          return (
                            <tr
                              key={i}
                              style={{
                                background: isAbn ? '#fde8e8' : isNorm ? '#e8f5e8' : '#f9f9f9',
                                borderRadius: 6,
                              }}
                            >
                              <td style={{ padding: '4px 6px 4px 0' }}>
                                <input
                                  type="checkbox" checked={selLabs.has(i)}
                                  onChange={() => toggle(selLabs, i, setSelLabs)}
                                  style={{ accentColor: '#9c5e6c', width: 13, height: 13 }}
                                />
                              </td>
                              <td style={{ padding: '4px 6px 4px 0', color: '#2a2540', fontWeight: 500 }}>{lr.testName}</td>
                              <td style={{ padding: '4px 6px 4px 0', color: isAbn ? '#8a3a3a' : '#2a2540' }}>
                                {[lr.value, lr.unit].filter(Boolean).join(' ') || '—'}
                              </td>
                              <td style={{ padding: '4px 6px 4px 0', color: '#9a96a8' }}>{lr.referenceRange || '—'}</td>
                              <td style={{ padding: '4px 0' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 5px', borderRadius: 6,
                                  background: isAbn ? '#fde8e8' : isNorm ? '#d4e8d8' : '#f0f0f0',
                                  color: isAbn ? '#8a3a3a' : isNorm ? '#3a7a4a' : '#7a7a7a',
                                }}>
                                  {lr.status === 'normal' ? 'Норма'
                                    : lr.status === 'abnormal' ? 'Откл.'
                                    : lr.status === 'critical' ? 'Крит!'
                                    : lr.status === 'borderline' ? 'Гран.'
                                    : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CategoryBlock>
              )}

              {/* Info-only note */}
              {(vaccinations.length > 0 || surgeries.length > 0 || diagnoses.length > 0) && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: '#f5f3ef', fontSize: 11, color: '#9a96a8', lineHeight: 1.5,
                }}>
                  <strong>Также найдено (информационно):</strong>{' '}
                  {[
                    vaccinations.length ? `${vaccinations.length} прививок` : '',
                    surgeries.length ? `${surgeries.length} операций` : '',
                    diagnoses.length ? `${diagnoses.length} диагнозов` : '',
                  ].filter(Boolean).join(', ')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, marginTop: 16 }}>
          {hasAnything ? (
            <button
              onClick={handleApply}
              disabled={applying || totalSelected === 0}
              style={{
                display: 'block', width: '100%', padding: '14px',
                borderRadius: 14, border: 'none', cursor: applying || totalSelected === 0 ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #9c5e6c, #7a3d4a)',
                color: 'white', fontSize: 14, fontWeight: 700,
                opacity: applying || totalSelected === 0 ? 0.55 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {applying
                ? 'Сохраняю…'
                : totalSelected === 0
                  ? 'Выберите элементы'
                  : `Добавить выбранное в профиль (${totalSelected})`}
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                display: 'block', width: '100%', padding: '14px',
                borderRadius: 14, border: '1px solid #e8e4dc', cursor: 'pointer',
                background: '#f5f3ef', color: '#2a2540', fontSize: 14, fontWeight: 600,
              }}
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
