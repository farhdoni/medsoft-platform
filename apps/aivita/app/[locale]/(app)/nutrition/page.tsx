'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { compressImageToDataUrl } from '@/lib/image/compress';

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f3ef', card: '#fff', border: '#e8e4dc',
  accent: '#9c5e6c', accentBg: '#f0d4dc',
  green: '#3a7a4a', greenBg: '#d4e8d8',
  blue: '#6BA3D6', blueBg: '#d4dff0',
  orange: '#e8873a', orangeBg: '#fff3cd',
  t1: '#2a2540', t2: '#6a6580', t3: '#9a96a8',
  red: '#dc3545', redBg: '#fde8e8',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dish { name: string; calories: number; protein?: number; fat?: number; carbs?: number }
interface MealEntry { id: string; mealType: string; name: string; calories: string; proteinG?: string; fatG?: string; carbsG?: string; consumedAt?: string; emoji?: string; date: string }
interface PlanDay { breakfast: { name: string; calories: number }; lunch: { name: string; calories: number }; dinner: { name: string; calories: number } }

const MEAL_LABELS: Record<string, string> = { breakfast: '🌅 Завтрак', lunch: '☀️ Обед', dinner: '🌙 Ужин', snack: '🍎 Перекус' };
const DAY_LABELS: Record<string, string> = { Mon: 'Пн', Tue: 'Вт', Wed: 'Ср', Thu: 'Чт', Fri: 'Пт', Sat: 'Сб', Sun: 'Вс' };
const TABS = [
  { id: 'diary', label: '📓 Дневник' },
  { id: 'add',   label: '➕ Добавить' },
  { id: 'plan',  label: '🤖 План' },
];

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 80, color }: { pct: number; size?: number; color: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct / 100, 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }} />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NutritionPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ru';
  const router = useRouter();

  const [tab, setTab] = useState<'diary' | 'add' | 'plan'>('diary');
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Add form state
  const [addForm, setAddForm] = useState({ name: '', calories: '', protein: '', fat: '', carbs: '', mealType: 'breakfast' });
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<Dish[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Plan state
  const [planGoal, setPlanGoal] = useState<'lose' | 'gain' | 'maintain'>('maintain');
  const [plan, setPlan] = useState<Record<string, PlanDay> | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Diary calculations
  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter(m => m.date === today);
  const totalCal = todayMeals.reduce((s, m) => s + Number(m.calories ?? 0), 0);
  const totalProt = todayMeals.reduce((s, m) => s + Number(m.proteinG ?? 0), 0);
  const totalFat = todayMeals.reduce((s, m) => s + Number(m.fatG ?? 0), 0);
  const totalCarbs = todayMeals.reduce((s, m) => s + Number(m.carbsG ?? 0), 0);
  const calGoal = 2000;
  const calPct = Math.min((totalCal / calGoal) * 100, 100);
  const calColor = calPct < 80 ? C.green : calPct < 100 ? C.orange : C.red;

  // Load meals on first diary visit
  const loadMeals = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/nutrition?from=${today}&to=${today}`);
      const json = await res.json() as { data?: MealEntry[] };
      if (json.data) setMeals(json.data);
    } catch { /* silent */ }
  }, [today]);

  const handleTabChange = (t: 'diary' | 'add' | 'plan') => {
    setTab(t);
    if (t === 'diary') loadMeals();
  };

  // ── Photo recognition ────────────────────────────────────────────────────────
  const handlePhotoCapture = async (file: File) => {
    const base64 = await compressImageToDataUrl(file);
    setCapturedPhoto(base64);
    setRecognizing(true);
    setRecognized(null);
    try {
      const res = await fetch('/api/proxy/nutrition/recognize', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const json = await res.json() as { data?: { dishes: Dish[] } };
      if (json.data?.dishes) {
        setRecognized(json.data.dishes);
        // Pre-fill form with first dish
        const d = json.data.dishes[0];
        if (d) setAddForm(f => ({ ...f, name: d.name, calories: String(d.calories), protein: String(d.protein ?? ''), fat: String(d.fat ?? ''), carbs: String(d.carbs ?? '') }));
      }
    } catch { setMsg('Ошибка распознавания'); }
    finally { setRecognizing(false); }
  };

  // ── Save meal ────────────────────────────────────────────────────────────────
  const handleSaveMeal = async () => {
    if (!addForm.name || !addForm.calories) { setMsg('Заполните название и калории'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/nutrition', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mealType: addForm.mealType, name: addForm.name, date: today,
          calories: Number(addForm.calories),
          proteinG: addForm.protein ? Number(addForm.protein) : undefined,
          fatG: addForm.fat ? Number(addForm.fat) : undefined,
          carbsG: addForm.carbs ? Number(addForm.carbs) : undefined,
        }),
      });
      const json = await res.json() as { data?: MealEntry };
      if (json.data) {
        setMeals(prev => [...prev, json.data!]);
        setAddForm({ name: '', calories: '', protein: '', fat: '', carbs: '', mealType: 'breakfast' });
        setCapturedPhoto(null); setRecognized(null);
        setMsg('✅ Добавлено!');
        setTimeout(() => { setMsg(''); handleTabChange('diary'); }, 1000);
      } else setMsg('Ошибка сохранения');
    } catch { setMsg('Ошибка сети'); }
    finally { setLoading(false); }
  };

  // ── Generate plan ────────────────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch('/api/proxy/nutrition/plan', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal: planGoal }),
      });
      const json = await res.json() as { data?: { plan: Record<string, PlanDay> } };
      if (json.data?.plan) setPlan(json.data.plan as Record<string, PlanDay>);
      else setMsg('Ошибка генерации плана');
    } catch { setMsg('Ошибка сети'); }
    finally { setPlanLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`,
    background: '#fafaf8', fontSize: 14, color: C.t1, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: C.card, padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: C.t2, padding: 0 }}>←</button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 }}>ПИТАНИЕ</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, margin: 0 }}>Нутрициология</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.card, padding: '0 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id as 'diary' | 'add' | 'plan')}
            style={{
              padding: '12px 14px', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: tab === t.id ? C.accent : C.t3,
              borderBottom: `2.5px solid ${tab === t.id ? C.accent : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── DIARY TAB ─────────────────────────────────────────────────────── */}
        {tab === 'diary' && (
          <>
            {/* Calorie ring */}
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <ProgressRing pct={calPct} color={calColor} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.t1, lineHeight: 1 }}>{totalCal}</span>
                    <span style={{ fontSize: 9, color: C.t3 }}>ккал</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Калории сегодня</p>
                  <p style={{ fontSize: 12, color: C.t2, marginBottom: 8 }}>{totalCal} / {calGoal} ккал · осталось {Math.max(calGoal - totalCal, 0)}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[{ l: 'Б', v: totalProt }, { l: 'Ж', v: totalFat }, { l: 'У', v: totalCarbs }].map(m => (
                      <div key={m.l} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.t1, margin: 0 }}>{Math.round(m.v)}<span style={{ fontSize: 10 }}>г</span></p>
                        <p style={{ fontSize: 10, color: C.t3, margin: 0 }}>{m.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Meals by type */}
            {(['breakfast','lunch','dinner','snack'] as const).map(mType => {
              const typeMeals = todayMeals.filter(m => m.mealType === mType);
              if (typeMeals.length === 0) return null;
              return (
                <div key={mType} style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.t3, marginBottom: 6 }}>{MEAL_LABELS[mType]}</p>
                  {typeMeals.map(m => (
                    <div key={m.id} style={{ background: C.card, borderRadius: 14, padding: '12px 16px', marginBottom: 6, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>{m.emoji ?? '🍽'} {m.name}</p>
                        {(m.proteinG || m.fatG || m.carbsG) && (
                          <p style={{ fontSize: 11, color: C.t3, margin: '2px 0 0' }}>Б{Math.round(Number(m.proteinG ?? 0))} Ж{Math.round(Number(m.fatG ?? 0))} У{Math.round(Number(m.carbsG ?? 0))}г</p>
                        )}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.accent, margin: 0 }}>{Math.round(Number(m.calories))} ккал</p>
                    </div>
                  ))}
                </div>
              );
            })}

            {todayMeals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🍽️</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>Ещё ничего не записано</p>
                <p style={{ fontSize: 13, color: C.t3 }}>Добавьте первый приём пищи</p>
                <button onClick={() => handleTabChange('add')}
                  style={{ marginTop: 16, padding: '12px 24px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  ➕ Добавить
                </button>
              </div>
            )}
          </>
        )}

        {/* ── ADD TAB ───────────────────────────────────────────────────────── */}
        {tab === 'add' && (
          <>
            {/* Photo section */}
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 12 }}>📷 Сфотографировать еду</p>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoCapture(f); }} />
              {capturedPhoto ? (
                <div>
                  <img src={capturedPhoto} alt="food" style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover', marginBottom: 10 }} />
                  {recognizing && <p style={{ textAlign: 'center', color: C.t2, fontSize: 13 }}>⏳ Распознаю блюдо...</p>}
                  {recognized && (
                    <div style={{ background: C.greenBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 6 }}>✅ Распознано:</p>
                      {recognized.map((d, i) => (
                        <p key={i} style={{ fontSize: 13, color: C.t1, margin: '2px 0' }}>{d.name} — {d.calories} ккал</p>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setCapturedPhoto(null); setRecognized(null); }} style={{ width: '100%', padding: '8px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'none', color: C.t2, fontSize: 13, cursor: 'pointer' }}>
                    🔄 Переснять
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', padding: '16px', borderRadius: 14, border: `2px dashed ${C.border}`, background: '#fafaf8', color: C.t2, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  📷 Открыть камеру
                </button>
              )}
            </div>

            {/* Manual form */}
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 14 }}>✏️ Ввод вручную</p>

              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Приём пищи</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(MEAL_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setAddForm(f => ({ ...f, mealType: k }))}
                      style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${addForm.mealType === k ? C.accent : C.border}`, background: addForm.mealType === k ? C.accentBg : '#fafaf8', fontSize: 12, fontWeight: 600, color: addForm.mealType === k ? C.accent : C.t2, cursor: 'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Название блюда *</p>
                <input style={inputStyle} placeholder="Например: Овсяная каша" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Калории *</p>
                  <input style={inputStyle} type="number" placeholder="350" value={addForm.calories} onChange={e => setAddForm(f => ({ ...f, calories: e.target.value }))} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Белки (г)</p>
                  <input style={inputStyle} type="number" placeholder="15" value={addForm.protein} onChange={e => setAddForm(f => ({ ...f, protein: e.target.value }))} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Жиры (г)</p>
                  <input style={inputStyle} type="number" placeholder="10" value={addForm.fat} onChange={e => setAddForm(f => ({ ...f, fat: e.target.value }))} />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Углеводы (г)</p>
                  <input style={inputStyle} type="number" placeholder="45" value={addForm.carbs} onChange={e => setAddForm(f => ({ ...f, carbs: e.target.value }))} />
                </div>
              </div>

              {msg && <p style={{ color: msg.includes('✅') ? C.green : C.red, fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{msg}</p>}

              <button onClick={handleSaveMeal} disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Сохраняю...' : '💾 Сохранить приём пищи'}
              </button>
            </div>
          </>
        )}

        {/* ── PLAN TAB ──────────────────────────────────────────────────────── */}
        {tab === 'plan' && (
          <>
            <div style={{ background: C.card, borderRadius: 20, padding: 20, marginBottom: 16, border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 14 }}>🎯 Ваша цель</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([['lose','🏃 Похудеть'], ['maintain','⚖️ Поддержать'], ['gain','💪 Набрать вес']] as const).map(([g, label]) => (
                  <button key={g} onClick={() => setPlanGoal(g)}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: `1.5px solid ${planGoal === g ? C.accent : C.border}`, background: planGoal === g ? C.accentBg : '#fafaf8', fontSize: 12, fontWeight: 700, color: planGoal === g ? C.accent : C.t2, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={handleGeneratePlan} disabled={planLoading}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.accent}, #7a3848)`, color: '#fff', fontSize: 15, fontWeight: 700, cursor: planLoading ? 'default' : 'pointer', opacity: planLoading ? 0.7 : 1 }}>
                {planLoading ? '⏳ Генерирую...' : '🤖 Составить план питания на неделю'}
              </button>
            </div>

            {plan && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(plan).map(([day, meals]) => {
                  const dayData = meals as PlanDay;
                  const dayTotal = (dayData.breakfast?.calories ?? 0) + (dayData.lunch?.calories ?? 0) + (dayData.dinner?.calories ?? 0);
                  return (
                    <div key={day} style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.t1, margin: 0 }}>{DAY_LABELS[day] ?? day}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.accent, margin: 0 }}>{dayTotal} ккал</p>
                      </div>
                      {[['🌅 Завтрак', dayData.breakfast], ['☀️ Обед', dayData.lunch], ['🌙 Ужин', dayData.dinner]].map(([label, meal]) => {
                        const m = meal as { name: string; calories: number } | undefined;
                        if (!m) return null;
                        return (
                          <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div>
                              <span style={{ fontSize: 11, color: C.t3, marginRight: 6 }}>{String(label)}</span>
                              <span style={{ fontSize: 13, color: C.t1 }}>{m.name}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.t2, flexShrink: 0, marginLeft: 8 }}>{m.calories} ккал</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {!plan && !planLoading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🤖</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>AI-план питания</p>
                <p style={{ fontSize: 13, color: C.t3 }}>Выберите цель и нажмите «Составить план»</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
