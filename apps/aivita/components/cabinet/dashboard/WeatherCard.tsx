'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LAT = 41.31;
const DEFAULT_LON = 69.24;
const DEFAULT_CITY = 'Ташкент';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coords {
  lat: number;
  lon: number;
}

interface OMWeather {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    surface_pressure: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface OMAir {
  current: {
    pm2_5: number;
    us_aqi: number;
  };
}

interface GeoCity {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface Alert {
  level: 'warn' | 'bad';
  icon: string;
  text: string;
  detail: string;
}

// ─── WMO weather code helpers ─────────────────────────────────────────────────

function wmoIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 65) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function wmoDesc(code: number): string {
  if (code === 0) return 'Ясно';
  if (code === 1) return 'Преимущественно ясно';
  if (code === 2) return 'Переменная облачность';
  if (code === 3) return 'Пасмурно';
  if (code === 45 || code === 48) return 'Туман';
  if (code <= 55) return 'Морось';
  if (code <= 65) return 'Дождь';
  if (code <= 77) return 'Снег';
  if (code <= 82) return 'Ливень';
  return 'Гроза';
}

// ─── Label helpers ────────────────────────────────────────────────────────────

function uvLabel(uv: number): string {
  if (uv <= 2) return 'Низкий';
  if (uv <= 5) return 'Умеренный';
  if (uv <= 7) return 'Высокий';
  if (uv <= 10) return 'Очень высокий';
  return 'Экстремальный';
}

function kpLabel(kp: number): string {
  if (kp < 4) return 'Спокойно';
  if (kp < 5) return 'Активно';
  if (kp < 6) return 'Буря G1';
  if (kp < 7) return 'Буря G2';
  return 'Буря G3+';
}

// ─── Health alert logic ───────────────────────────────────────────────────────

function buildAlerts(uv: number, pm25: number, kp: number): Alert[] {
  const out: Alert[] = [];
  if (uv >= 8) {
    out.push({
      level: 'bad', icon: '☀️',
      text: 'Очень высокий УФ',
      detail: 'Меланома, онкология кожи, фотодерматит, СКВ, фотосенс. лекарства — тень и SPF обязательны',
    });
  } else if (uv >= 6) {
    out.push({
      level: 'warn', icon: '☀️',
      text: 'Высокий УФ-индекс',
      detail: 'Меланома, онкология кожи, фотодерматит, СКВ, фотосенс. лекарства — тень и SPF',
    });
  }
  if (pm25 > 25) {
    out.push({
      level: 'warn', icon: '💨',
      text: 'Качество воздуха снижено',
      detail: 'Астма, ХОБЛ, аллергия, поллиноз — меньше физических нагрузок на улице',
    });
  }
  if (kp >= 5) {
    out.push({
      level: 'bad', icon: '🌐',
      text: 'Сильная магнитная буря',
      detail: 'Гипертония, ИБС, метеозависимость, мигрень — контролируйте давление',
    });
  } else if (kp >= 4) {
    out.push({
      level: 'warn', icon: '🌐',
      text: 'Повышенная геомагнитная активность',
      detail: 'Гипертония, ИБС, метеозависимость, мигрень — контролируйте давление',
    });
  }
  return out;
}

// ─── Day name helper ──────────────────────────────────────────────────────────

const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;

function shortDayName(dateStr: string): string {
  // Use noon to avoid timezone-edge misclassification of the day.
  const d = new Date(dateStr + 'T12:00:00');
  return RU_DAYS[d.getDay()] ?? '';
}

// ─── Skeleton block ───────────────────────────────────────────────────────────

const SHIMMER: CSSProperties = {
  background: 'linear-gradient(90deg,#f0ede7 25%,#e8e4dc 50%,#f0ede7 75%)',
  backgroundSize: '200% 100%',
  animation: 'wSkl 1.4s infinite',
  borderRadius: 8,
};

function SkeletonRect({ h, w = '100%', r = 8 }: { h: number; w?: string; r?: number }) {
  return <div style={{ ...SHIMMER, height: h, width: w, borderRadius: r }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeatherCard() {
  const [coords, setCoords] = useState<Coords>({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [city, setCity] = useState(DEFAULT_CITY);
  const [geoReady, setGeoReady] = useState(false);

  const [weather, setWeather] = useState<OMWeather | null>(null);
  const [air, setAir] = useState<OMAir | null>(null);
  const [kp, setKp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [netError, setNetError] = useState(false);

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoCity[]>([]);
  const searchInput = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read collapse state from localStorage ────────────────────────────────
  useEffect(() => {
    try { setOpen(localStorage.getItem('aivita_weather_open') === '1'); } catch { /* ignore */ }
  }, []);

  // ── Step 1: resolve location via geolocation; fall back silently ────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCity('Моя локация');
        setGeoReady(true);
      },
      () => setGeoReady(true),
      { timeout: 6000, maximumAge: 600_000, enableHighAccuracy: false },
    );
  }, []);

  // ── Step 2: fetch Open-Meteo weather, air quality, and NOAA Kp ─────────
  const load = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setNetError(false);
    try {
      const [wRes, aRes, kRes] = await Promise.allSettled([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,weather_code,surface_pressure,uv_index` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
          `&timezone=auto&forecast_days=7`,
        ),
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
          `&current=pm2_5,us_aqi&timezone=auto`,
        ),
        fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
      ]);

      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        setWeather((await wRes.value.json()) as OMWeather);
      } else {
        setNetError(true);
      }
      if (aRes.status === 'fulfilled' && aRes.value.ok) {
        setAir((await aRes.value.json()) as OMAir);
      }
      if (kRes.status === 'fulfilled' && kRes.value.ok) {
        // Response: [header_row, ...data_rows]. Each data row: [time_tag, kp, ...]
        const rows = (await kRes.value.json()) as string[][];
        if (rows.length > 1) {
          const last = rows[rows.length - 1];
          if (last?.[1] !== undefined) setKp(parseFloat(last[1]));
        }
      }
    } catch {
      setNetError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!geoReady) return;
    void load(coords.lat, coords.lon);
  }, [geoReady, coords, load]);

  // ── City search via Open-Meteo geocoding ─────────────────────────────────
  const onQueryChange = (val: string) => {
    setQuery(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&language=ru&count=8`,
        );
        if (!r.ok) return;
        const d = (await r.json()) as { results?: GeoCity[] };
        setSuggestions(d.results ?? []);
      } catch { /* silent: search failure doesn't break the card */ }
    }, 400);
  };

  const pickCity = (g: GeoCity) => {
    setCoords({ lat: g.latitude, lon: g.longitude });
    setCity(g.name + (g.admin1 ? `, ${g.admin1}` : ''));
    setSearchOpen(false);
    setQuery('');
    setSuggestions([]);
  };

  // ── Collapse toggle ───────────────────────────────────────────────────────
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem('aivita_weather_open', next ? '1' : '0'); } catch { /* ignore */ }
  };

  // ── Re-trigger geolocation ────────────────────────────────────────────────
  const requestGeo = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCity('Моя локация');
      },
      () => {},
      { timeout: 6000, maximumAge: 0, enableHighAccuracy: false },
    );
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const pm25 = air?.current.pm2_5 ?? 0;
  const kpVal = kp ?? 0;
  const alerts = weather ? buildAlerts(weather.current.uv_index, pm25, kpVal) : [];
  const worstLevel: 'bad' | 'warn' | 'good' = alerts.some(a => a.level === 'bad') ? 'bad'
    : alerts.length > 0 ? 'warn' : 'good';

  const uvColor = (uv: number) =>
    uv >= 8 ? '#dc3545' : uv >= 6 ? '#e8873a' : '#3a7a4a';
  const uvBg = (uv: number) =>
    uv >= 8 ? '#fde8e8' : uv >= 6 ? '#fff3cd' : '#d4e8d8';

  const airColor = pm25 > 25 ? '#e8873a' : '#3a7a4a';
  const airBg   = pm25 > 25 ? '#fff3cd' : '#d4e8d8';
  const kpColor  = kpVal >= 5 ? '#dc3545' : kpVal >= 4 ? '#e8873a' : '#3a7a4a';
  const kpBg     = kpVal >= 5 ? '#fde8e8' : kpVal >= 4 ? '#fff3cd' : '#d4e8d8';

  return (
    <section style={{ borderBottom: '1px solid #e8e4dc' }}>
      <style>{`
        @keyframes wSkl { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .wCity:hover { background: #f4f3ef !important; }
      `}</style>

      {/* ── Always-visible compact toggle row ──────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 sm:px-7"
        style={{
          minHeight: 48, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', paddingTop: 10, paddingBottom: 10,
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <SkeletonRect w="28px" h={28} r={6} />
            <SkeletonRect w="40px" h={20} r={4} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SkeletonRect w="70px" h={10} r={3} />
              <SkeletonRect w="100px" h={8} r={3} />
            </div>
            <span style={{ fontSize: 14, color: '#9a96a8' }}>▾</span>
          </div>
        ) : (
          <>
            {/* Weather icon */}
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
              {weather ? wmoIcon(weather.current.weather_code) : '🌥️'}
            </span>

            {/* Temperature */}
            <span style={{ fontSize: 19, fontWeight: 800, color: '#2a2540', flexShrink: 0 }}>
              {weather ? `${Math.round(weather.current.temperature_2m)}°` : '—'}
            </span>

            {/* City + condition */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: '#2a2540',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                📍 {city}
              </div>
              {weather && (
                <div style={{
                  fontSize: 10, color: '#6a6580',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {wmoDesc(weather.current.weather_code)} · ощущается {Math.round(weather.current.apparent_temperature)}°
                </div>
              )}
            </div>

            {/* Risk chip — always visible */}
            <span style={{
              flexShrink: 0, padding: '3px 8px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: worstLevel === 'bad' ? '#fde8e8' : worstLevel === 'warn' ? '#fff3cd' : '#d4e8d8',
              color: worstLevel === 'bad' ? '#dc3545' : worstLevel === 'warn' ? '#c96a00' : '#3a7a4a',
            }}>
              {worstLevel === 'good' ? '✓ Спокойно' : 'Осторожно'}
            </span>

            {/* Chevron */}
            <span style={{
              flexShrink: 0, fontSize: 14, color: '#9a96a8', display: 'inline-block',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .3s',
            }}>
              ▾
            </span>
          </>
        )}
      </button>

      {/* ── Expandable block ───────────────────────────────────────────────── */}
      <div style={{
        maxHeight: open ? '1600px' : '0',
        overflow: 'hidden',
        opacity: open ? 1 : 0,
        transition: 'max-height .4s ease, opacity .4s ease',
      }}>
        <div className="px-4 sm:px-7" style={{ paddingBottom: 16 }}>

          {/* Subheader: label + geo + city search trigger */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#9a96a8',
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Прогноз и здоровье
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); requestGeo(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: '#f4f3ef', border: 'none', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#6a6580',
                }}
              >
                📍 Моя локация
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSearchOpen(o => !o);
                  setTimeout(() => searchInput.current?.focus(), 60);
                }}
                aria-label="Сменить город"
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: '#f4f3ef', border: 'none', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#6a6580',
                }}
              >
                🔍 Город
              </button>
            </div>
          </div>

          {/* City search */}
          {searchOpen && (
            <div
              style={{ position: 'relative', marginBottom: 12 }}
              onClick={e => e.stopPropagation()}
            >
              <input
                ref={searchInput}
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="Поиск города..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px', borderRadius: 12,
                  border: '1.5px solid #e8e4dc',
                  background: '#f4f3ef', color: '#2a2540',
                  fontSize: 13, outline: 'none',
                }}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '105%', left: 0, right: 0, zIndex: 20,
                  background: '#fff', border: '1px solid #e8e4dc',
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(60,50,60,.12)',
                }}>
                  {suggestions.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className="wCity"
                      onClick={() => pickCity(g)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none',
                        border: 'none', borderBottom: '1px solid #f4f3ef',
                        fontSize: 13, color: '#2a2540', cursor: 'pointer',
                      }}
                    >
                      {g.name}{g.admin1 ? `, ${g.admin1}` : ''}
                      {g.country ? (
                        <span style={{ color: '#9a96a8', marginLeft: 4 }}>· {g.country}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* States: loading / error / data */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([1, 2, 3, 4] as const).map(i => <SkeletonRect key={i} h={58} r={12} />)}
              </div>
              <SkeletonRect h={44} r={10} />
            </div>
          ) : netError || !weather ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>🌥️</div>
              <p style={{ fontSize: 13, color: '#9a96a8', margin: '0 0 12px' }}>
                Не удалось загрузить погоду
              </p>
              <button
                type="button"
                onClick={() => void load(coords.lat, coords.lon)}
                style={{
                  padding: '6px 16px', borderRadius: 12,
                  border: '1.5px solid #e8e4dc', background: 'none',
                  fontSize: 12, color: '#6a6580', cursor: 'pointer',
                }}
              >
                Повторить
              </button>
            </div>
          ) : (
            <>
              {/* ── 4 Metrics grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>

                {/* Pressure — always neutral blue */}
                <div style={{ background: '#d4dff0', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>🌡️</div>
                  <div style={{ fontSize: 10, color: '#6a6580' }}>Давление</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#4A7FB5', lineHeight: 1.1, marginTop: 2 }}>
                    {Math.round(weather.current.surface_pressure)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6BA3D6' }}>гПа</div>
                </div>

                {/* UV index */}
                <div style={{ background: uvBg(weather.current.uv_index), borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>☀️</div>
                  <div style={{ fontSize: 10, color: '#6a6580' }}>УФ-индекс</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: uvColor(weather.current.uv_index), lineHeight: 1.1, marginTop: 2 }}>
                    {Math.round(weather.current.uv_index)}
                  </div>
                  <div style={{ fontSize: 10, color: uvColor(weather.current.uv_index) }}>
                    {uvLabel(weather.current.uv_index)}
                  </div>
                </div>

                {/* Air quality */}
                <div style={{ background: airBg, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>💨</div>
                  <div style={{ fontSize: 10, color: '#6a6580' }}>Воздух PM2.5</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: airColor, lineHeight: 1.1, marginTop: 2 }}>
                    {air ? Math.round(pm25) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: airColor }}>
                    {air ? 'мкг/м³' : 'нет данных'}
                  </div>
                </div>

                {/* Geomagnetic / Kp */}
                <div style={{ background: kpBg, borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>🌐</div>
                  <div style={{ fontSize: 10, color: '#6a6580' }}>Магн. бури</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: kpColor, lineHeight: 1.1, marginTop: 2 }}>
                    {kp !== null ? `Kp ${Math.round(kpVal)}` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: kpColor }}>{kpLabel(kpVal)}</div>
                </div>

              </div>

              {/* ── Health hints (always visible) ── */}
              <div style={{ background: '#f4f3ef', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                {alerts.length > 0 ? (
                  <>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color: '#9a96a8',
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                      margin: '0 0 8px',
                    }}>
                      Кому осторожно на улице сегодня
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {alerts.map((a, idx) => (
                        <div key={idx} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          padding: '7px 10px', borderRadius: 9,
                          background: a.level === 'bad' ? '#fde8e8' : '#fff3cd',
                          border: `1px solid ${a.level === 'bad' ? 'rgba(220,53,69,.18)' : 'rgba(232,135,58,.18)'}`,
                        }}>
                          <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{a.icon}</span>
                          <div>
                            <p style={{
                              margin: 0, fontSize: 12, fontWeight: 700,
                              color: a.level === 'bad' ? '#dc3545' : '#c96a00',
                            }}>
                              {a.text}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6a6580', lineHeight: 1.4 }}>
                              {a.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: '7px 10px', borderRadius: 9,
                    background: '#d4e8d8', border: '1px solid rgba(58,122,74,.18)',
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#3a7a4a' }}>
                        Сегодня благоприятно
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6a6580', lineHeight: 1.4 }}>
                        Давление, УФ, воздух и магнитный фон в норме — для гипертоников, астматиков и после онкологии кожи особых рисков на улице нет.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 7-day slim strip ── */}
              {weather.daily.time.length > 0 && (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
                    {weather.daily.time.map((dateStr, i) => (
                      <div key={dateStr} style={{
                        flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '8px 10px', borderRadius: 12, minWidth: 44,
                        background: i === 0 ? '#f3e7ea' : '#f4f3ef',
                        border: `1px solid ${i === 0 ? 'rgba(156,94,108,.15)' : 'transparent'}`,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: i === 0 ? 700 : 400,
                          color: i === 0 ? '#9c5e6c' : '#9a96a8',
                        }}>
                          {i === 0 ? 'Сег.' : shortDayName(dateStr)}
                        </span>
                        <span style={{ fontSize: 18, lineHeight: 1.2 }}>
                          {wmoIcon(weather.daily.weather_code[i] ?? 0)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2a2540' }}>
                          {Math.round(weather.daily.temperature_2m_max[i] ?? 0)}°
                        </span>
                        <span style={{ fontSize: 10, color: '#9a96a8' }}>
                          {Math.round(weather.daily.temperature_2m_min[i] ?? 0)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
