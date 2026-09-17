import Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';
import { buildPatientContext } from '@/lib/ai/patientContext';
import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const maxDuration = 30;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.aivita.uz';

// Single source of truth for the chat model — used both in the actual
// request and in the usage-log payload, so cost lookup (apps/api's
// ai-pricing.ts) can never drift from what was actually called.
const CHAT_MODEL = 'claude-sonnet-4-6';

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

## PRESCRIPTION / РЕЦЕПТ — MANDATORY ACTION BLOCK
When the image is a medical prescription (рецепт) — printed or handwritten — OR when the user asks to add medications from a photo or from text:
1. Read ALL text carefully including handwritten text
2. List EVERY medication: name, dosage (мг/кап/мад/таб), frequency, duration
3. Note any important instructions (до/после еды, без алкоголя)
4. ALWAYS append this EXACT block at the end (on its own line, no spaces inside tags):
[MEDICATIONS_ACTION]{"medications":[{"name":"НАЗВАНИЕ","dosage":"ДОЗИРОВКА","frequency":"1 раз в день","times":["14:00"],"durationDays":null,"foodInstruction":null}]}[/MEDICATIONS_ACTION]
5. After the block write exactly: "Нажмите кнопку ниже, чтобы добавить X лекарств в ваш список."

JSON field rules:
- name: medication name as written on prescription
- dosage: dose with unit (e.g. "10 мг", "500 мг", "1 таб", "5 кап", "1 мад")
- frequency: "1 раз в день" | "2 раза в день" | "3 раза в день" | "По необходимости"
- times: derive from frequency → 1 time: ["14:00"] | 2 times: ["08:00","20:00"] | 3 times: ["08:00","14:00","20:00"]
- durationDays: integer if course length mentioned, null for "постоянно" or unknown
- foodInstruction: "before" | "after" | "during" | "no_alcohol" | null

NEVER say you cannot add medications. ALWAYS output [MEDICATIONS_ACTION] block when a prescription image is sent.

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

async function checkDailyLimit(apiToken: string): Promise<boolean> {
  if (!apiToken) return true; // no token → let API handle auth
  try {
    const res = await fetch(`${API_BASE}/v1/aivita/ai-chat/daily-usage`, {
      headers: { Cookie: `aivita_api=${apiToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return true; // on error — don't block
    const { allowed } = await res.json() as { allowed: boolean };
    return allowed;
  } catch {
    return true; // on network error — don't block
  }
}

// ─── Usage logging ──────────────────────────────────────────────────────────
// apps/aivita has no direct DB access (see patientContext.ts), so this posts
// to apps/api's internal usage-log endpoint — but unlike
// buildPatientContext/checkDailyLimit, it does NOT forward the end user's
// own session cookie. That endpoint is called only by this service, after
// the user's own response has already been sent, so it authenticates via
// INTERNAL_SERVICE_TOKEN (a service secret, not a user session) and trusts
// aivitaUserId exactly because apps/aivita — not the browser — resolved it
// from its own verified aivita_session cookie first (see call site below).
// Runs after the stream has already closed, so it never adds latency;
// failures are caught and logged only.
async function logChatUsage(
  stream: ReturnType<Anthropic['messages']['stream']>,
  aivitaUserId: string,
  startedAt: number,
) {
  const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!serviceToken) return; // not configured — logging is simply off, chat is unaffected

  const finalMsg = await stream.finalMessage();
  const usage = finalMsg.usage;
  await fetch(`${API_BASE}/v1/aivita/ai-chat/usage-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Service-Token': serviceToken },
    body: JSON.stringify({
      aivitaUserId,
      model: CHAT_MODEL,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
      responseTimeMs: Date.now() - startedAt,
    }),
    cache: 'no-store',
  });
}

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

  // Check real daily message limit from API
  const cookieStore = await cookies();
  const apiToken = cookieStore.get('aivita_api')?.value ?? '';
  // Local-only (verifies aivita_session with the shared SESSION_SECRET, no
  // network call) — used only to attribute usage-log rows, since that
  // endpoint no longer accepts a forwarded user session (see logChatUsage).
  const session = await getSession();
  const allowed = await checkDailyLimit(apiToken);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'plan_limit' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
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

  // buildPatientContext derives the patient strictly from this session cookie
  // (requireAivitaAuth on the API side resolves userId from it) — there is no
  // client-suppliable id anywhere in this call, so a request can never pull
  // another patient's data.
  const lastUserMsg = messages?.filter(m => m.role === 'user').at(-1)?.content ?? '';
  const [patientContext, drugContext] = await Promise.all([
    buildPatientContext(apiToken),
    checkDrugInteractions(lastUserMsg, apiToken),
  ]);

  // System prompt as two blocks: the static instructions (identical on
  // every request, unchanged text) get an ephemeral cache breakpoint;
  // per-request patient data + drug-interaction results are appended
  // uncached right after, since they differ on every call and caching them
  // would never hit. Static block is currently ~730-970 tokens by a rough
  // char/4 estimate — right at the claude-sonnet-4-6 minimum of 1024, so it
  // may or may not actually get cached; if it's under the minimum the API
  // just skips caching for it (no error), which usage logging will show as
  // cache_creation_input_tokens: 0 on the first call.
  let contextBlock = `\n\nДанные пациента: ${patientContext}\n\nИспользуй данные пациента для персонализированных советов. Ссылайся на конкретные цифры (пульс, вес, ИМТ и т.д.) когда это уместно.`;
  if (drugContext) {
    contextBlock += drugContext;
  }

  const client = new Anthropic({ apiKey: apiKey! });

  // Build vision-aware messages (inject images into last user message if present)
  const visionMessages = buildVisionMessages(messages, images ?? []);

  const chatStartedAt = Date.now();
  let stream;
  try {
    // Sonnet has far better Uzbek language support than Haiku and supports vision
    stream = await client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.ru, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: contextBlock },
      ],
      messages: visionMessages.slice(-10) as Parameters<typeof client.messages.stream>[0]['messages'],
    });
  } catch (err) {
    console.error('[ai/chat] Anthropic SDK threw:', err);
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

        // Fired after close(), not awaited — never delays the stream the
        // user is reading. A logging failure is caught here and only
        // logged, never surfaced as a chat error. No session -> nothing to
        // attribute the row to, skip rather than send a bad payload.
        if (session?.userId) {
          logChatUsage(stream, session.userId, chatStartedAt).catch((err) => {
            console.error('[ai/chat] usage logging failed:', err);
          });
        }
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
