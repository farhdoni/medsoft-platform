import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ─── System prompts per locale ───────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  ru: `Ты — AI-ассистент по здоровью приложения aivita. Отвечай ТОЛЬКО на русском языке.

Правила:
1. Давай конкретные, научно обоснованные советы
2. Всегда напоминай, что рекомендации носят информационный характер и не заменяют врача
3. Будь дружелюбным и поддерживающим
4. Используй простой язык, избегай сложной медицинской терминологии
5. Давай конкретные цифры и факты
6. Отвечай кратко — 2-4 абзаца максимум

Области экспертизы: сон, питание, физическая активность, управление стрессом, профилактика хронических заболеваний, ментальное здоровье, формирование здоровых привычек.

Если вопрос выходит за рамки здоровья — вежливо перенаправь разговор обратно к теме здоровья.`,

  uz: `You are aivita's health AI assistant for Uzbek-speaking users. You MUST reply ONLY in Uzbek language (Latin or Cyrillic script, matching what the user writes). Never switch to Russian or English.

Rules:
1. Always respond in Uzbek — this is mandatory
2. Give specific, science-backed health advice
3. Remind users that recommendations are informational and don't replace a doctor
4. Be friendly and supportive
5. Use simple language, avoid complex medical terminology
6. Include specific numbers and facts
7. Keep answers concise — 2-4 paragraphs max

Areas of expertise: sleep (uyqu), nutrition (ovqatlanish), physical activity (jismoniy faollik), stress management (stressni boshqarish), chronic disease prevention, mental health, healthy habits.

IMPORTANT: The user speaks Uzbek. You speak Uzbek back. Do not explain that you can't speak Uzbek — you can and you must.`,

  en: `You are aivita's health AI assistant. Reply ONLY in English.

Rules:
1. Give specific, science-backed advice
2. Always remind that recommendations are informational and don't replace a doctor
3. Be friendly and supportive
4. Use simple language, avoid complex medical terminology
5. Include specific numbers and facts
6. Keep answers concise — 2-4 paragraphs max

Areas of expertise: sleep, nutrition, physical activity, stress management, chronic disease prevention, mental health, healthy habit formation.

If the question goes beyond health topics — politely redirect back to health.`,
};

// ─── Mock responses per locale ────────────────────────────────────────────────

const MOCK: Record<string, (msg: string) => string> = {
  ru: (msg) => {
    const t = msg.toLowerCase();
    if (t.includes('сон') || t.includes('спать'))
      return 'Для улучшения сна ложитесь в одно и то же время. 7–9 часов — оптимально. Избегайте экранов за час до сна и поддерживайте температуру в спальне 18–20°C.';
    if (t.includes('питание') || t.includes('еда') || t.includes('диет'))
      return 'Используйте метод тарелки: ½ — овощи, ¼ — белок, ¼ — злаки. Пейте не менее 2 литров воды в день и старайтесь есть в одно и то же время.';
    if (t.includes('стресс') || t.includes('тревог'))
      return 'Техника дыхания 4-7-8 помогает снизить стресс: вдох на 4 счёта, задержка на 7, выдох на 8. Прогулки на свежем воздухе снижают уровень кортизола на 15–20%.';
    if (t.includes('давление') || t.includes('сердц') || t.includes('пульс'))
      return 'Норма давления — до 120/80 мм рт. ст., пульс в покое — 60–100 уд/мин. 150 минут умеренной активности в неделю благотворно влияют на сердце.';
    return 'Расскажите подробнее о своём состоянии, и я дам более точный совет. Мои рекомендации носят информационный характер и не заменяют консультацию врача.';
  },

  uz: (msg) => {
    const t = msg.toLowerCase();
    // Sleep — Latin + Cyrillic
    if (t.includes('uyqu') || t.includes('yotish') || t.includes('uxla') || t.includes('уйқу') || t.includes('ухла'))
      return 'Uyquni yaxshilash uchun har kuni bir xil vaqtda yoting. Kuniga **7–9 soat** uxlash maqbul. Uxlashdan bir soat oldin ekranlarga qaramang va xona haroratini **18–20°C** da saqlang.';
    // Nutrition — Latin + Cyrillic
    if (t.includes('ovqat') || t.includes('taomnoma') || t.includes('parhez') || t.includes('овқат') || t.includes('таом'))
      return 'Tarelka usulidan foydalaning:\n- ½ — sabzavotlar\n- ¼ — oqsil\n- ¼ — donli mahsulotlar\n\nKuniga kamida **2 litr** suv iching va bir xil vaqtda ovqatlaning.';
    // Stress — Latin + Cyrillic
    if (t.includes('stress') || t.includes('tashvish') || t.includes('nerv') || t.includes('стресс') || t.includes('ташвиш'))
      return '**4-7-8 nafas texnikasi** stressni kamaytiradi: 4 soniya nafas oling, 7 soniya ushlab turing, 8 soniyada chiqaring. Toza havoda sayr qilish kortizol darajasini **15–20%** ga kamaytiradi.';
    // Blood pressure / heart — Latin + Cyrillic
    if (t.includes('bosim') || t.includes('yurak') || t.includes('tomir') || t.includes('босим') || t.includes('юрак'))
      return 'Bosimning normasi — **120/80 mm.sim.ust.** gacha, dam olish vaqtidagi puls — minutiga **60–100** urish. Haftasiga 150 daqiqa o\'rtacha faollik yurak-qon tomir tizimiga foydali.';
    // Throat / pain — Cyrillic Uzbek
    if (t.includes('оғри') || t.includes('og\'ri') || t.includes('tomoq') || t.includes('томоқ') || t.includes('ауру') || t.includes('ağri'))
      return 'Og\'riq uchun bir necha maslahat:\n- Iliq ichimlik iching (choy, iliq suv)\n- Tuz bilan suv bilan tomoq chayqang\n- Sovuq, o\'tkir ovqatdan saqlaning\n- Ovozingizni tiying\n\n**Muhim:** Agar og\'riq 3–5 kun o\'tmasa yoki isitma ko\'tarilsa — shifokorga murojaat qiling.';
    // Greeting
    if (t.includes('salom') || t.includes('assalomu') || t.includes('салом') || t.includes('ассалому'))
      return 'Assalomu alaykum! Men aivita ilovasining AI-assistentiman. Sog\'ligʻingiz haqida savollaringiz bo\'lsa, yordam beraman. Nima haqida bilmoqchisiz?';
    return 'Holatingiz haqida batafsil gapiring, men aniqroq maslahat beraman. Mening tavsiyalarim axborot xarakteriga ega va shifokor maslahatlashuvini almashtirolmaydi.';
  },

  en: (msg) => {
    const t = msg.toLowerCase();
    if (t.includes('sleep'))
      return 'For better sleep, go to bed at the same time every day. 7–9 hours is optimal. Avoid screens 1 hour before bed and keep your bedroom at 18–20°C.';
    if (t.includes('food') || t.includes('diet') || t.includes('nutrition'))
      return 'Use the plate method: ½ vegetables, ¼ protein, ¼ whole grains. Drink at least 2 litres of water per day and try to eat at consistent times.';
    if (t.includes('stress') || t.includes('anxiety'))
      return 'The 4-7-8 breathing technique helps reduce stress: inhale for 4 counts, hold for 7, exhale for 8. Fresh air walks reduce cortisol by 15–20%.';
    return 'Tell me more about how you feel and I\'ll give you more specific advice. My recommendations are informational and do not replace a doctor\'s consultation.';
  },
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
