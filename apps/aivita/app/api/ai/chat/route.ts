import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ─── System prompts per locale ───────────────────────────────────────────────

// Single adaptive prompt — Claude auto-detects and mirrors user's language
const SYSTEM_PROMPT = `You are aivita's health AI assistant. You support three languages: Russian (русский), Uzbek (o'zbek / ўзбек), and English.

CRITICAL LANGUAGE RULE: Always respond in the SAME language the user writes in.
- If the user writes in Russian → respond in Russian
- If the user writes in Uzbek (Latin or Cyrillic) → respond in Uzbek
- If the user writes in English → respond in English
- Never switch languages. Never apologise for not knowing a language.

Rules:
1. Give specific, science-backed health advice
2. Always remind that recommendations are informational and don't replace a doctor
3. Be friendly and supportive
4. Use simple language, avoid complex medical terminology
5. Include specific numbers and facts
6. Keep answers concise — 2-4 paragraphs max
7. Use markdown: **bold** for key terms, bullet lists with - for tips

Areas of expertise: sleep, nutrition, physical activity, stress management, chronic disease prevention, mental health, healthy habit formation.

If the question goes beyond health — politely redirect back to health in the user's language.`;

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
    stream = await client.messages.stream({
      model: 'claude-haiku-4-5',
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
