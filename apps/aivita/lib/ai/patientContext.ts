/**
 * Builds a compact, human-readable patient health summary for AI system
 * prompts — profile + allergies + chronic conditions + active medications +
 * lifestyle + latest vitals + a short weight trend.
 *
 * This runs in apps/aivita (a Next.js app with no direct DB access), so it
 * assembles the summary the same way the code it replaces did: parallel
 * HTTP calls to api.aivita.uz, authenticated by forwarding the caller's own
 * `aivita_api` session cookie. There is no separate "userId" parameter
 * anywhere in this flow — the backend's requireAivitaAuth middleware derives
 * the user strictly from that cookie, so a caller can never fetch another
 * patient's data by passing a different id; the only way to change whose
 * data comes back is to have a different session.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

type Json = Record<string, unknown> | null;

function authedFetch(sessionCookie: string, path: string) {
  return fetch(`${API_BASE}${path}`, {
    headers: { Cookie: `aivita_api=${sessionCookie}`, 'Content-Type': 'application/json' },
    cache: 'no-store' as const,
  });
}

async function parseData(r: PromiseSettledResult<Response>): Promise<Json> {
  if (r.status !== 'fulfilled' || !r.value.ok) return null;
  try { return (await r.value.json())?.data ?? null; } catch { return null; }
}

const GENDER_RU: Record<string, string> = { male: 'Мужчина', female: 'Женщина' };

// Same label sets as messages/ru.json's lifestyle.{smoking,alcohol,activity}
// (kept local rather than imported — MedicalCardClient.tsx does the same,
// this is a Node API route context, not a next-intl-loaded one). Covers the
// codes written by every onboarding path, not just one, so nothing here
// falls through to a raw code — see the earlier lifestyle-labels fix.
const SMOKING_RU: Record<string, string> = {
  quit: 'бросил(а)', sometimes: 'иногда', regular: 'регулярно', former: 'бросил(а)', current: 'курит',
};
const ALCOHOL_RU: Record<string, string> = {
  rarely: 'редко', moderate: 'умеренно', regular: 'регулярно', rare: 'редко', frequent: 'часто',
};
const ACTIVITY_RU: Record<string, string> = {
  sedentary: 'малоактивный', light: 'лёгкая', moderate: 'умеренная', active: 'высокая',
  rare: 'малоактивный', sometimes: 'иногда', often: 'часто', daily: 'каждый день',
};

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'недостаток веса';
  if (bmi < 25) return 'норма';
  if (bmi < 30) return 'избыток веса';
  return 'ожирение';
}

/** "08:00" -> "утром", buckets by hour; multiple distinct buckets joined with "и". */
function timesOfDayLabel(times: string[]): string | null {
  if (!times.length) return null;
  const bucket = (t: string) => {
    const h = Number(t.split(':')[0]);
    if (Number.isNaN(h)) return null;
    if (h < 12) return 'утром';
    if (h < 17) return 'днём';
    if (h < 22) return 'вечером';
    return 'ночью';
  };
  const labels = Array.from(new Set(times.map(bucket).filter((l): l is NonNullable<typeof l> => !!l)));
  if (!labels.length) return null;
  return labels.length <= 2 ? labels.join(' и ') : null; // 3+ times/day -> fall back to frequency text
}

export async function buildPatientContext(sessionCookie: string): Promise<string> {
  if (!sessionCookie) return 'Пациент не авторизован, данных о здоровье нет.';

  try {
    const [profileRes, latestRes, allergiesRes, chronicRes, medsRes, weightRes] = await Promise.allSettled([
      authedFetch(sessionCookie, '/v1/aivita/health-profile'),
      authedFetch(sessionCookie, '/v1/aivita/vitals/latest'),
      authedFetch(sessionCookie, '/v1/aivita/health-profile/allergies'),
      authedFetch(sessionCookie, '/v1/aivita/health-profile/chronic-conditions'),
      authedFetch(sessionCookie, '/v1/aivita/medications'), // default status=active
      authedFetch(sessionCookie, '/v1/aivita/vitals?type=weight&limit=10'),
    ]);

    const [profile, latest, allergies, chronic, meds, weightHistory] = await Promise.all([
      parseData(profileRes), parseData(latestRes), parseData(allergiesRes),
      parseData(chronicRes), parseData(medsRes), parseData(weightRes),
    ]);

    const p = profile as { birthDate?: string; gender?: string; heightCm?: number; weightKg?: string | number;
      bloodType?: string; smokingStatus?: string; alcoholFrequency?: string; exerciseFrequency?: string } | null;

    const age = p?.birthDate
      ? new Date().getFullYear() - new Date(p.birthDate).getFullYear()
      : null;

    const bmi = p?.heightCm && p?.weightKg
      ? Number(p.weightKg) / ((p.heightCm / 100) ** 2)
      : null;

    const facts: string[] = [];

    // ── Demographics + BMI + blood type, one compact clause ──────────────────
    const demo: string[] = [];
    if (p?.gender) demo.push(GENDER_RU[p.gender] ?? p.gender);
    if (age) demo.push(String(age));
    if (bmi) demo.push(`ИМТ ${bmi.toFixed(1)} (${bmiCategory(bmi)})`);
    if (p?.bloodType) demo.push(`группа крови ${p.bloodType}`);
    if (demo.length) facts.push(demo.join(', '));

    // ── Chronic conditions ────────────────────────────────────────────────────
    if (Array.isArray(chronic) && chronic.length) {
      const names = (chronic as Array<{ name: string }>).map(c => c.name).join(', ');
      facts.push(`Хронические: ${names}`);
    }

    // ── Active medications ────────────────────────────────────────────────────
    if (Array.isArray(meds) && meds.length) {
      const list = (meds as Array<{ title: string; dosage?: string; frequency?: string; times?: string[] }>)
        .map(m => {
          const timing = timesOfDayLabel(m.times ?? []) ?? m.frequency ?? '';
          return [m.title, m.dosage, timing].filter(Boolean).join(' ');
        })
        .join(', ');
      facts.push(`Лекарства: ${list}`);
    }

    // ── Allergies ──────────────────────────────────────────────────────────────
    if (Array.isArray(allergies) && allergies.length) {
      const list = (allergies as Array<{ allergen: string; severity?: string }>)
        .map(a => a.allergen + (a.severity ? ` (${a.severity})` : ''))
        .join(', ');
      facts.push(`Аллергии: ${list}`);
    }

    // ── Lifestyle ──────────────────────────────────────────────────────────────
    const lifestyle: string[] = [];
    if (p?.smokingStatus && p.smokingStatus !== 'never') {
      lifestyle.push(`курение: ${SMOKING_RU[p.smokingStatus] ?? p.smokingStatus}`);
    }
    if (p?.alcoholFrequency && p.alcoholFrequency !== 'never') {
      lifestyle.push(`алкоголь: ${ALCOHOL_RU[p.alcoholFrequency] ?? p.alcoholFrequency}`);
    }
    if (p?.exerciseFrequency) {
      lifestyle.push(`активность: ${ACTIVITY_RU[p.exerciseFrequency] ?? p.exerciseFrequency}`);
    }
    if (lifestyle.length) facts.push(`Образ жизни: ${lifestyle.join(', ')}`);

    // ── Latest vitals (single most recent value each) ────────────────────────
    if (latest && typeof latest === 'object') {
      const vitalLabels: Record<string, string> = {
        heart_rate: 'пульс', blood_pressure: 'давление', blood_sugar: 'сахар',
        temperature: 'температура', weight: 'вес',
      };
      const rows: string[] = [];
      for (const [type, row] of Object.entries(latest as Record<string, { value?: number; unit?: string; systolic?: number; diastolic?: number }>)) {
        const label = vitalLabels[type];
        if (!label) continue; // keep the compact summary to the "key" vitals the task asked for
        const val = type === 'blood_pressure'
          ? (row.systolic && row.diastolic ? `${row.systolic}/${row.diastolic}` : null)
          : (row.value ? `${row.value}${row.unit ? ` ${row.unit}` : ''}` : null);
        if (val) rows.push(`${label} ${val}`);
      }
      if (rows.length) facts.push(`Показатели: ${rows.join(', ')}`);
    }

    // ── Short weight trend (oldest vs newest point in the last few readings) ─
    if (Array.isArray(weightHistory) && weightHistory.length >= 2) {
      const rows = weightHistory as Array<{ value: { value?: number }; recordedAt: string }>;
      const newest = rows[0]?.value?.value; // API returns newest-first
      const oldest = rows[rows.length - 1]?.value?.value;
      if (typeof newest === 'number' && typeof oldest === 'number' && oldest !== newest) {
        facts.push(`Тренд веса: ${oldest}→${newest} кг`);
      }
    }

    if (!facts.length) return 'Пациент новый, данных о здоровье в профиле пока мало.';
    return facts.join('. ') + '.';
  } catch {
    return 'Пациент новый, данных о здоровье в профиле пока мало.';
  }
}
