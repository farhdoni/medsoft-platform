'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrugPair {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none';
  description: string;
  recommendation: string;
  source?: string;
}

interface CheckResult {
  pairs: DrugPair[];
  summary: string;
}

const SEVERITY_CONFIG: Record<DrugPair['severity'], {
  bg: string;
  border: string;
  badge: string;
  icon: string;
  label: string;
}> = {
  critical: { bg: '#fde8e8', border: '#dc3545', badge: '#dc3545', icon: '⛔', label: 'Критично' },
  major:    { bg: '#fff3cd', border: '#fd7e14', badge: '#fd7e14', icon: '⚠️', label: 'Серьёзное' },
  moderate: { bg: '#fff8e1', border: '#ffc107', badge: '#ffc107', icon: 'ℹ️', label: 'Умеренное' },
  minor:    { bg: '#f8f9fa', border: '#adb5bd', badge: '#6c757d', icon: '💬', label: 'Незначительное' },
  none:     { bg: '#d4e8d8', border: '#28a745', badge: '#28a745', icon: '✅', label: 'Нет взаимодействия' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugCheckerClient({ prefilledDrugs = [] }: { prefilledDrugs?: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [drugs, setDrugs]       = useState<string[]>(prefilledDrugs);
  const [input, setInput]       = useState('');
  const [result, setResult]     = useState<CheckResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError]       = useState('');

  // Auto-check if prefilled with 2+ drugs
  useEffect(() => {
    if (prefilledDrugs.length >= 2) void check(prefilledDrugs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addDrug() {
    const name = input.trim();
    if (!name) return;
    if (drugs.includes(name)) { setInput(''); return; }
    setDrugs((prev) => [...prev, name]);
    setInput('');
    setResult(null);
    inputRef.current?.focus();
  }

  function removeDrug(name: string) {
    setDrugs((prev) => prev.filter((d) => d !== name));
    setResult(null);
  }

  async function check(list: string[] = drugs) {
    if (list.length < 2) { setError('Добавьте минимум 2 лекарства'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/proxy/drugs/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: list }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json() as { data: CheckResult };
      setResult(json.data);
    } catch {
      setError('Не удалось выполнить проверку. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  async function checkMyMeds() {
    setMyLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/proxy/drugs/my-check');
      if (!res.ok) throw new Error();
      const json = await res.json() as { data: CheckResult & { drugs?: string[] } };
      if (json.data.drugs && json.data.drugs.length >= 2) {
        setDrugs(json.data.drugs);
      }
      setResult(json.data);
    } catch {
      setError('Не удалось загрузить лекарства из медкарты.');
    } finally {
      setMyLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#f4f3ef' }}
          aria-label="Назад"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9a96a8' }}>ЛЕКАРСТВА</p>
          <h1 className="text-[20px] font-extrabold" style={{ color: '#2a2540' }}>💊 Проверка совместимости</h1>
        </div>
      </div>

      {/* My meds button */}
      <button
        onClick={() => void checkMyMeds()}
        disabled={myLoading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-[13px] font-semibold mb-4 transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: '#f4f3ef', color: '#2a2540', border: '1px solid #e8e4dc' }}
      >
        {myLoading
          ? <><span className="animate-spin">⏳</span> Загружаем…</>
          : <><span>📋</span> Проверить мои лекарства</>}
      </button>

      {/* Input + chips */}
      <div className="rounded-[18px] bg-white border mb-4 p-4" style={{ borderColor: '#e8e4dc' }}>
        <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9a96a8' }}>
          ДОБАВИТЬ ЛЕКАРСТВО
        </label>
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addDrug(); }}
            placeholder="Название лекарства…"
            className="flex-1 rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
            style={{ background: '#f4f3ef', border: '1px solid #e8e4dc' }}
          />
          <button
            onClick={addDrug}
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #9c5e6c, #7a4455)' }}
          >
            + Добавить
          </button>
        </div>

        {/* Drug chips */}
        {drugs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {drugs.map((drug) => (
              <span
                key={drug}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: '#fff', border: '1px solid #e8e4dc', color: '#2a2540' }}
              >
                {drug}
                <button
                  onClick={() => removeDrug(drug)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                  style={{ background: '#e8e4dc', color: '#9a96a8' }}
                  aria-label={`Удалить ${drug}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {drugs.length < 2 && (
          <p className="text-[11px] mt-2" style={{ color: '#9a96a8' }}>
            Добавьте минимум 2 лекарства для проверки
          </p>
        )}
      </div>

      {/* Check button */}
      <button
        onClick={() => void check()}
        disabled={loading || drugs.length < 2}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] text-[14px] font-bold text-white mb-5 transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #9c5e6c, #7a4455)' }}
      >
        {loading
          ? <><span className="animate-spin">⏳</span> Проверяем…</>
          : <><span>🔍</span> Проверить совместимость</>}
      </button>

      {/* Error */}
      {error && (
        <p className="text-[12px] font-semibold text-center mb-4" style={{ color: '#dc3545' }}>{error}</p>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div
            className="rounded-[14px] px-4 py-3 mb-4 text-[13px] font-semibold"
            style={{ background: '#f4f3ef', color: '#2a2540' }}
          >
            {result.summary}
          </div>

          {/* Pairs */}
          <div className="space-y-3">
            {result.pairs.map((pair, i) => {
              const cfg = SEVERITY_CONFIG[pair.severity] ?? SEVERITY_CONFIG.none;
              return (
                <div
                  key={i}
                  className="rounded-[16px] border-l-4 p-4"
                  style={{ background: cfg.bg, borderLeftColor: cfg.border }}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold" style={{ color: '#2a2540' }}>{pair.drug1}</span>
                      <span className="text-[11px]" style={{ color: '#9a96a8' }}>+</span>
                      <span className="text-[15px] font-bold" style={{ color: '#2a2540' }}>{pair.drug2}</span>
                    </div>
                    <span
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                      style={{ background: cfg.badge }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* Description */}
                  {pair.description && (
                    <p className="text-[12px] leading-relaxed mb-2" style={{ color: '#2a2540' }}>
                      {pair.description}
                    </p>
                  )}

                  {/* Recommendation */}
                  {pair.recommendation && (
                    <p className="text-[12px] leading-relaxed font-semibold" style={{ color: '#2a2540' }}>
                      💡 {pair.recommendation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
