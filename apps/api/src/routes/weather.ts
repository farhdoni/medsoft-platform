import { Hono } from 'hono';
import type { Context } from 'hono';
import { env } from '../env';
import { redis } from '../lib/redis';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';

export const weatherRouter = new Hono();

interface WeatherResponse {
  location: { name: string; country: string | null; lat: number; lon: number };
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windMs: number;
    condition: string;
    description: string;
    icon: string;
  };
  source: 'gps' | 'ip' | 'default';
  fetchedAt: string;
}

const OWM_URL = 'https://api.openweathermap.org/data/2.5/weather';
const IPAPI_URL = 'http://ip-api.com/json';

// Best-effort IP geolocation for clients that did not share GPS coordinates.
async function geolocateByIp(ip: string | undefined): Promise<{ lat: number; lon: number; city: string | null } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  try {
    const res = await fetch(`${IPAPI_URL}/${encodeURIComponent(ip)}?fields=status,lat,lon,city`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; lat?: number; lon?: number; city?: string };
    if (data.status !== 'success' || typeof data.lat !== 'number' || typeof data.lon !== 'number') return null;
    return { lat: data.lat, lon: data.lon, city: data.city ?? null };
  } catch {
    return null;
  }
}

async function handleWeather(c: Context) {
  if (!env.OPENWEATHER_API_KEY) {
    return c.json({ error: { code: 'WEATHER_UNCONFIGURED', message: 'Weather provider is not configured' } }, 503);
  }

  const latParam = c.req.query('lat');
  const lonParam = c.req.query('lon');

  let lat: number;
  let lon: number;
  let source: WeatherResponse['source'];

  if (latParam !== undefined && lonParam !== undefined) {
    lat = Number(latParam);
    lon = Number(lonParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return c.json({ error: { code: 'BAD_COORDINATES', message: 'Invalid lat/lon' } }, 400);
    }
    source = 'gps';
  } else {
    const ip = (c.req.header('x-forwarded-for')?.split(',')[0].trim()) || c.req.header('x-real-ip');
    const ipLoc = await geolocateByIp(ip);
    if (ipLoc) {
      lat = ipLoc.lat;
      lon = ipLoc.lon;
      source = 'ip';
    } else {
      lat = env.WEATHER_DEFAULT_LAT;
      lon = env.WEATHER_DEFAULT_LON;
      source = 'default';
    }
  }

  const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const payload = JSON.parse(cached) as WeatherResponse;
      return c.json({ ...payload, source });
    }
  } catch {
    // Redis is best-effort for weather caching — fall through to a live fetch.
  }

  let owm: {
    name?: string;
    sys?: { country?: string };
    coord?: { lat: number; lon: number };
    main?: { temp: number; feels_like: number; humidity: number };
    wind?: { speed: number };
    weather?: { main: string; description: string; icon: string }[];
  };

  try {
    const url = `${OWM_URL}?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${env.OPENWEATHER_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return c.json({ error: { code: 'WEATHER_UPSTREAM', message: `Provider returned ${res.status}` } }, 502);
    }
    owm = await res.json();
  } catch {
    return c.json({ error: { code: 'WEATHER_UPSTREAM', message: 'Failed to reach weather provider' } }, 502);
  }

  const condition = owm.weather?.[0];
  const payload: WeatherResponse = {
    location: {
      name: owm.name || env.WEATHER_DEFAULT_CITY,
      country: owm.sys?.country ?? null,
      lat: owm.coord?.lat ?? lat,
      lon: owm.coord?.lon ?? lon,
    },
    current: {
      tempC: Math.round(owm.main?.temp ?? 0),
      feelsLikeC: Math.round(owm.main?.feels_like ?? 0),
      humidity: owm.main?.humidity ?? 0,
      windMs: Math.round((owm.wind?.speed ?? 0) * 10) / 10,
      condition: condition?.main ?? 'Unknown',
      description: condition?.description ?? '',
      icon: condition?.icon ?? '01d',
    },
    source,
    fetchedAt: new Date().toISOString(),
  };

  try {
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', env.WEATHER_CACHE_TTL);
  } catch {
    // Caching failure is non-fatal.
  }

  return c.json(payload);
}

// Admin dashboard (cookie-authenticated).
weatherRouter.get('/', requireAuth, handleWeather);

// Public surfaces (landing page, mobile app) — no auth, IP rate-limited.
weatherRouter.get('/public', rateLimit(60, 60, 'weather'), handleWeather);
