import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
Sleep · Nutrition · Physical activity · Stress · Mental health · Chronic disease prevention · Healthy habits

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

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages, userContext, locale = 'ru' } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    userContext?: { name?: string; score?: number };
    locale?: string;
  };

  const lang = ['ru', 'uz', 'en'].includes(locale) ? locale : 'ru';
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

  // Build system prompt for the chosen locale + optional user context
  let systemPrompt = SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.ru;
  if (userContext?.name) {
    const suffix: Record<string, string> = {
      ru: `\n\nПользователь: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
      uz: `\n\nFoydalanuvchi: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
      en: `\n\nUser: ${userContext.name}${userContext.score ? `, Health Score: ${userContext.score}/100` : ''}`,
    };
    systemPrompt += suffix[lang] ?? suffix.ru;
  }

  const client = new Anthropic({ apiKey: apiKey! });

  let stream;
  try {
    // Sonnet has far better Uzbek language support than Haiku
    stream = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.slice(-10),
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
