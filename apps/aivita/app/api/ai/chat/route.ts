import Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ─── Patient context builder ─────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

async function fetchPatientContext(sessionCookie: string): Promise<string> {
  if (!sessionCookie) return '';

  const headers = { Cookie: `aivita_api=${sessionCookie}`, 'Content-Type': 'application/json' };
  const opts = { headers, cache: 'no-store' as const };

  try {
    const [userRes, profileRes, latestRes, allergiesRes, chronicRes] = await Promise.allSettled([
      fetch(`${API_BASE}/v1/aivita/users`, opts),
      fetch(`${API_BASE}/v1/aivita/health-profile`, opts),
      fetch(`${API_BASE}/v1/aivita/vitals/latest`, opts),
      fetch(`${API_BASE}/v1/aivita/health-profile/allergies`, opts),
      fetch(`${API_BASE}/v1/aivita/health-profile/chronic-conditions`, opts),
    ]);

    const parse = async (r: PromiseSettledResult<Response>) => {
      if (r.status !== 'fulfilled' || !r.value.ok) return null;
      try { return (await r.value.json())?.data ?? null; } catch { return null; }
    };

    const [user, profile, latest, allergies, chronic] = await Promise.all([
      parse(userRes), parse(profileRes), parse(latestRes), parse(allergiesRes), parse(chronicRes),
    ]);

    const age = profile?.birthDate
      ? (() => {
          const d = new Date(profile.birthDate);
          const a = new Date().getFullYear() - d.getFullYear();
          return a > 0 ? `${a} лет` : '< 1 года';
        })()
      : null;

    const bmi = profile?.heightCm && profile?.weightKg
      ? (Number(profile.weightKg) / ((profile.heightCm / 100) ** 2)).toFixed(1)
      : null;

    const formatVital = (v: Record<string, number> | null, key?: string) => {
      if (!v?.value) return null;
      if (key === 'blood_pressure') return `${v.systolic}/${v.diastolic} мм рт.ст.`;
      return `${v.value} ${v.unit ?? ''}`.trim();
    };

    const lines: string[] = ['=== ДАННЫЕ ПАЦИЕНТА ==='];

    if (user?.name) lines.push(`Имя: ${user.name}`);
    if (age) lines.push(`Возраст: ${age}`);
    if (profile?.gender) lines.push(`Пол: ${profile.gender === 'male' ? 'мужской' : profile.gender === 'female' ? 'женский' : profile.gender}`);
    if (profile?.heightCm) lines.push(`Рост: ${profile.heightCm} см`);
    if (profile?.weightKg) lines.push(`Вес: ${profile.weightKg} кг`);
    if (bmi) lines.push(`ИМТ: ${bmi}`);
    if (profile?.bloodType) lines.push(`Группа крови: ${profile.bloodType}`);
    if (profile?.smokingStatus) lines.push(`Курение: ${profile.smokingStatus}`);
    if (profile?.alcoholFrequency) lines.push(`Алкоголь: ${profile.alcoholFrequency}`);
    if (profile?.exerciseFrequency) lines.push(`Активность: ${profile.exerciseFrequency}`);

    const allergyList = Array.isArray(allergies) && allergies.length > 0
      ? allergies.map((a: { allergen: string; severity?: string }) => `${a.allergen}${a.severity ? ` (${a.severity})` : ''}`).join(', ')
      : null;
    if (allergyList) lines.push(`Аллергии: ${allergyList}`);

    const chronicList = Array.isArray(chronic) && chronic.length > 0
      ? chronic.map((c: { name: string }) => c.name).join(', ')
      : null;
    if (chronicList) lines.push(`Хронические заболевания: ${chronicList}`);

    if (latest && typeof latest === 'object') {
      lines.push('\nПОСЛЕДНИЕ ПОКАЗАТЕЛИ:');
      const vitalLabels: Record<string, string> = {
        heart_rate: 'Пульс', blood_pressure: 'Давление', blood_sugar: 'Сахар',
        temperature: 'Температура', weight: 'Вес', sleep_hours: 'Сон',
        water_ml: 'Вода', steps: 'Шаги', spo2: 'SpO2',
      };
      for (const [type, row] of Object.entries(latest as Record<string, Record<string, number>>)) {
        const label = vitalLabels[type] ?? type;
        const val = formatVital(row, type);
        if (val) lines.push(`  ${label}: ${val}`);
      }
    }

    if (lines.length <= 1) return '';
    lines.push('\n=== КОНЕЦ ДАННЫХ ===');
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ─── Drug interaction check ───────────────────────────────────────────────────

const DRUG_INTERACTION_RE = /(?:совместимост|interaction|совмест|можно.{0,20}(?:пить|принима|вмест)|вмест.{0,20}(?:пить|принима)|compat|взаимодейств)/i;

async function checkDrugInteractions(message: string, apiToken: string): Promise<string> {
  if (!DRUG_INTERACTION_RE.test(message)) return '';

  const words = message.split(/[\s,;]+/).filter((w) => w.length > 3);
  if (words.length < 2) return '';

  const drugs = words.filter((w) => /^[A-ZА-Яа-яa-z]/.test(w) && w.length >= 4);
  if (drugs.length < 2) return '';

  try {
    const res = await fetch(`${API_BASE}/v1/aivita/drugs/check`, {
      method: 'POST',
      headers: { Cookie: `aivita_api=${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugs: drugs.slice(0, 5) }),
      cache: 'no-store',
    });
    if (!res.ok) return '';
    const json = await res.json() as { data?: { pairs?: Array<{ drug1: string; drug2: string; severity: string; description: string; recommendation: string }>; summary?: string } };
    const data = json?.data;
    if (!data?.pairs?.length) return '';

    const lines = ['\n\n=== РЕЗУЛЬТАТ ПРОВЕРКИ СОВМЕСТИМОСТИ ЛЕКАРСТВ ==='];
    lines.push(data.summary ?? '');
    for (const p of data.pairs) {
      const sev = p.severity === 'critical' ? '⛔ КРИТИЧНО'
        : p.severity === 'major' ? '⚠️ Серьёзное'
        : p.severity === 'moderate' ? 'ℹ️ Умеренное'
        : p.severity === 'minor' ? '💬 Незначительное'
        : '✅ Нет взаимодействия';
      lines.push(`\n${p.drug1} + ${p.drug2}: ${sev}`);
      if (p.description) lines.push(p.description);
      if (p.recommendation) lines.push(`Рекомендация: ${p.recommendation}`);
    }
    lines.push('=== КОНЕЦ РЕЗУЛЬТАТОВ ===');
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ─── System prompts per locale ───────────────────────────────────────────────

// Single adaptive prompt — model mirrors the user's language exactly
const SYSTEM_PROMPT = `You are aivita, a health AI assistant. You speak Russian, Uzbek, and English fluently.

## LANGUAGE RULE — TOP PRIORITY
Look at the user's LAST message. Identify its language:
- Cyrillic text with Uzbek words (ҳам, учун, билан, гапир, олайсан, қандай, сўз, жавоб, ўзбек) → respond in UZBEK CYRILLIC
- Latin Uzbek text (salom, uyqu, ovqat, sog'liq, qanday) → respond in UZBEK LATIN
- Russian text → respond in RUSSIAN
- English text → respond in ENGLISH

NEVER mix languages in one response. NEVER say you cannot speak Uzbek — you can and you will. NEVER apologise. Just respond in the correct language.

## HEALTH ASSISTANT RULES
1. Give science-backed, specific health advice
2. Add a brief disclaimer that advice is informational, not a replacement for a doctor
3. Be warm and friendly
4. Use simple language, specific numbers and facts
5. Keep responses to 2-4 paragraphs
6. Use **bold** for key terms and - bullet points for tips

## EXPERTISE
Sleep · Nutrition · Physical activity · Stress · Mental health · Chronic disease prevention · Healthy habits · Drug interactions · Medical image analysis

## DRUG INTERACTION RESULTS
If the context contains "=== РЕЗУЛЬТАТ ПРОВЕРКИ СОВМЕСТИМОСТИ ЛЕКАРСТВ ===" — incorporate those results into your answer with colored-label formatting using: ⛔ for critical, ⚠️ for major, ℹ️ for moderate, 💬 for minor, ✅ for none. Always add a note to consult a doctor.

## IMAGE ANALYSIS
When the user sends an image: describe what you see medically, identify any health metrics (lab results, blood pressure readings, ECG, prescriptions, food labels etc.), and give relevant health advice.

## AUTO-SAVE HEALTH DATA — CRITICAL RULE
After your main response, if the conversation or image contains SPECIFIC health metrics (not vague), append ONE line in this exact format (no spaces, no line break inside):
<!--HEALTH:{"weightKg":X,"heightCm":X,"bloodType":"A+"}-->

Only include fields you are CERTAIN about from this conversation. Supported fields:
weightKg (number), heightCm (number), bloodType (string: "A+","A-","B+","B-","AB+","AB-","O+","O-"),
smokingStatus (string: "never","quit","occasional","daily"), exerciseFrequency (string: "sedentary","light","moderate","active"),
gender (string: "male","female"), city (string).

If NO specific metrics are mentioned → do NOT add the <!--HEALTH:--> line at all.

If a question is outside health — gently redirect back in the user's language.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  ru: SYSTEM_PROMPT,
  uz: SYSTEM_PROMPT,
  en: SYSTEM_PROMPT,
};

// ─── Mock responses — language auto-detected from message text ────────────────

function mockResponse(msg: string): string {
  const t = msg.toLowerCase();

  // ── Uzbek detection (Latin or Cyrillic keywords) ──────────────────────────
  const isUz = t.includes('salom') || t.includes('assalomu') || t.includes('салом')
    || t.includes('uyqu') || t.includes('уйқу') || t.includes('uxla')
    || t.includes('ovqat') || t.includes('овқат') || t.includes('parhez')
    || t.includes('stress') && (t.includes('tashvish') || t.includes('nerv'))
    || t.includes('bosim') || t.includes('босим') || t.includes('yurak') || t.includes('юрак')
    || t.includes('оғри') || t.includes("og'ri") || t.includes('tomoq') || t.includes('томоқ')
    || t.includes('bosh') || t.includes('charchoq') || t.includes('qanday')
    || t.includes('gapir') || t.includes('гапир') || t.includes('olaysan') || t.includes('олайсан');

  // ── English detection ─────────────────────────────────────────────────────
  const isEn = !isUz && (t.includes('sleep') || t.includes('food') || t.includes('diet')
    || t.includes('stress') || t.includes('health') || t.includes('hello') || t.includes('hi ')
    || t.includes('how are') || t.includes('can you'));

  if (isUz) {
    if (t.includes('uyqu') || t.includes('уйқу') || t.includes('uxla'))
      return 'Uyquni yaxshilash uchun har kuni bir xil vaqtda yoting. Kuniga **7–9 soat** uxlash maqbul. Uxlashdan bir soat oldin ekranlarga qaramang va xona haroratini **18–20°C** da saqlang.';
    if (t.includes('ovqat') || t.includes('овқат') || t.includes('parhez') || t.includes('taom'))
      return 'Tarelka usulidan foydalaning:\n- ½ — sabzavotlar\n- ¼ — oqsil\n- ¼ — donli mahsulotlar\n\nKuniga kamida **2 litr** suv iching.';
    if (t.includes('оғри') || t.includes("og'ri") || t.includes('tomoq') || t.includes('томоқ'))
      return 'Og\'riq uchun maslahatlar:\n- Iliq ichimlik iching (choy, iliq suv)\n- Tuz suvi bilan tomoq chayqang\n- Ovozingizni tiying\n\n**Muhim:** 3–5 kun o\'tmasa — shifokorga murojaat qiling.';
    if (t.includes('salom') || t.includes('салом') || t.includes('assalomu'))
      return 'Assalomu alaykum! Men aivita AI-assistentiman. Sog\'ligʻingiz haqida savollaringiz bo\'lsa, yordam beraman!';
    return 'Holatingiz haqida batafsil gapiring — aniqroq maslahat beraman. Tavsiyalarim axborot xarakteriga ega va shifokorni almashtirolmaydi.';
  }

  if (isEn) {
    if (t.includes('sleep'))
      return 'For better sleep, go to bed at the same time every day. **7–9 hours** is optimal. Avoid screens 1 hour before bed and keep your bedroom at **18–20°C**.';
    if (t.includes('food') || t.includes('diet') || t.includes('nutrition'))
      return 'Use the plate method:\n- ½ vegetables\n- ¼ protein\n- ¼ whole grains\n\nDrink at least **2 litres** of water per day.';
    if (t.includes('stress') || t.includes('anxiety'))
      return 'The **4-7-8 breathing technique** reduces stress: inhale 4 counts, hold 7, exhale 8. Fresh air walks reduce cortisol by **15–20%**.';
    return 'Tell me more about how you feel and I\'ll give specific advice. My recommendations are informational and do not replace a doctor\'s consultation.';
  }

  // ── Default: Russian ──────────────────────────────────────────────────────
  if (t.includes('сон') || t.includes('спать') || t.includes('ночь'))
    return 'Для улучшения сна ложитесь в одно время каждый день. Оптимально **7–9 часов**. Избегайте экранов за час до сна, держите в спальне **18–20°C**.';
  if (t.includes('питание') || t.includes('еда') || t.includes('диет'))
    return 'Метод тарелки:\n- ½ — овощи\n- ¼ — белок\n- ¼ — злаки\n\nПейте не менее **2 литров** воды в день.';
  if (t.includes('стресс') || t.includes('тревог'))
    return '**Техника 4-7-8**: вдох 4 счёта, задержка 7, выдох 8. Прогулки на свежем воздухе снижают кортизол на **15–20%**.';
  if (t.includes('давление') || t.includes('сердц') || t.includes('пульс'))
    return 'Норма давления — **120/80 мм рт. ст.**, пульс в покое — **60–100 уд/мин**. 150 минут активности в неделю полезны для сердца.';
  return 'Расскажите подробнее о своём состоянии — дам более точный совет. Мои рекомендации носят информационный характер и не заменяют врача.';
}

const MOCK: Record<string, (msg: string) => string> = {
  ru: mockResponse,
  uz: mockResponse,
  en: mockResponse,
};

// ─── Session decode ───────────────────────────────────────────────────────────

async function getSessionPlan(token: string): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload as { plan?: string }).plan ?? 'free';
  } catch {
    return null;
  }
}

const FREE_DAILY_CHAT_LIMIT = 5;

// ─── Handler ──────────────────────────────────────────────────────────────────

// ─── Vision helpers ───────────────────────────────────────────────────────────

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/** Convert a plain-text history + optional image dataUrls for the last user message */
function buildVisionMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  images: string[],
): Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }> {
  if (!images.length) return messages;

  const result: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }> = [...messages];
  const lastUserIdx = result.reduce((acc, m, i) => m.role === 'user' ? i : acc, -1);
  if (lastUserIdx < 0) return result;

  const lastMsg = result[lastUserIdx];
  const imageBlocks: ContentBlock[] = images.map(dataUrl => {
    const [header, data] = dataUrl.split(',');
    const mediaType = header?.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
    return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data: data ?? '' } };
  });

  result[lastUserIdx] = {
    role: 'user',
    content: [
      ...imageBlocks,
      { type: 'text', text: typeof lastMsg.content === 'string' ? lastMsg.content : '' },
    ],
  };
  return result;
}

export async function POST(req: Request) {
  const { messages, userContext, locale = 'ru', images = [] } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    userContext?: { name?: string; score?: number };
    locale?: string;
    images?: string[];
  };

  const lang = ['ru', 'uz', 'en'].includes(locale) ? locale : 'ru';

  // Check free-plan chat limit
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('aivita_session')?.value
    ?? cookieStore.get('aivita_api')?.value ?? '';
  const plan = await getSessionPlan(sessionToken);
  if (!plan || plan === 'free') {
    const userMsgCount = (messages ?? []).filter(m => m.role === 'user').length;
    if (userMsgCount > FREE_DAILY_CHAT_LIMIT) {
      return new Response(JSON.stringify({ error: 'plan_limit' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const isRealKey = apiKey && apiKey.startsWith('sk-ant-api') && apiKey.length > 30;

  // Mock mode — no real API key
  if (!isRealKey) {
    const lastMsg = messages?.[messages.length - 1]?.content ?? '';
    const mockFn = MOCK[lang] ?? MOCK.ru;
    return new Response(
      JSON.stringify({ content: mockFn(lastMsg), mock: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fetch patient context — use API cookie (verified by api.aivita.uz)
  const apiToken = cookieStore.get('aivita_api')?.value ?? '';
  const lastUserMsg = messages?.filter(m => m.role === 'user').at(-1)?.content ?? '';
  const [patientContext, drugContext] = await Promise.all([
    fetchPatientContext(apiToken),
    checkDrugInteractions(lastUserMsg, apiToken),
  ]);

  // Build system prompt with patient data
  let systemPrompt = SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.ru;
  if (patientContext) {
    systemPrompt += `\n\n${patientContext}\n\nИспользуй данные пациента для персонализированных советов. Ссылайся на конкретные цифры (пульс, вес, ИМТ и т.д.) когда это уместно.`;
  }
  if (drugContext) {
    systemPrompt += drugContext;
  }
  if (!patientContext && userContext?.name) {
    const suffix: Record<string, string> = {
      ru: `\n\nПользователь: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
      uz: `\n\nFoydalanuvchi: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
      en: `\n\nUser: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
    };
    systemPrompt += suffix[lang] ?? suffix.ru;
  }

  const client = new Anthropic({ apiKey: apiKey! });

  // Build vision-aware messages (inject images into last user message if present)
  const visionMessages = buildVisionMessages(messages, images ?? []);

  let stream;
  try {
    // Sonnet has far better Uzbek language support than Haiku and supports vision
    stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: visionMessages.slice(-10) as Parameters<typeof client.messages.stream>[0]['messages'],
    });
  } catch {
    const lastMsg = messages?.[messages.length - 1]?.content ?? '';
    const mockFn = MOCK[lang] ?? MOCK.ru;
    return new Response(
      JSON.stringify({ content: mockFn(lastMsg), mock: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
