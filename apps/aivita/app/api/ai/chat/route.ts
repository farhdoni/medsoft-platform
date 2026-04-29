import Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';

const SYSTEM_PROMPT = `Ты — AI-ассистент по здоровью приложения aivita. Твоя задача — давать персонализированные советы по здоровью на русском языке.

Правила:
1. Отвечай только на русском языке (или на том языке, на котором пишет пользователь)
2. Давай конкретные, научно обоснованные советы
3. Всегда напоминай, что твои рекомендации носят информационный характер и не заменяют врача
4. Будь дружелюбным и поддерживающим
5. Используй простой язык, избегай сложной медицинской терминологии
6. Когда уместно — давай конкретные цифры и факты
7. Отвечай кратко — 2-4 абзаца максимум

Области экспертизы: сон, питание, физическая активность, управление стрессом, профилактика хронических заболеваний, ментальное здоровье, формирование здоровых привычек.

Если вопрос выходит за рамки здоровья — вежливо перенаправь разговор обратно к теме здоровья.`;

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no API key, return mock response
  if (!apiKey) {
    const { messages } = await req.json();
    const lastMsg = messages?.[messages.length - 1]?.content ?? '';
    const mockResponse = getMockResponse(lastMsg);

    return new Response(
      JSON.stringify({ content: mockResponse, mock: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, userContext } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    userContext?: { name?: string; score?: number };
  };

  const client = new Anthropic({ apiKey });

  // Build system prompt with user context if available
  let systemPrompt = SYSTEM_PROMPT;
  if (userContext?.name) {
    systemPrompt += `\n\nПользователь: ${userContext.name}`;
    if (userContext.score) {
      systemPrompt += `, Health Score: ${userContext.score}/100`;
    }
  }

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.slice(-10), // last 10 messages for context
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
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

function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('сон') || lower.includes('спать')) {
    return 'Для улучшения сна рекомендую ложиться в одно и то же время. 7–9 часов — оптимальная продолжительность. Избегай экранов за час до сна и создай прохладную обстановку в спальне (18–20°C).';
  }
  if (lower.includes('питание') || lower.includes('еда') || lower.includes('диет')) {
    return 'Сбалансированное питание — основа здоровья. Используй метод тарелки: ½ — овощи, ¼ — белок, ¼ — злаки. Пей не менее 2 литров воды в день и старайся есть в одно и то же время.';
  }
  if (lower.includes('стресс') || lower.includes('тревог')) {
    return 'Техника дыхания 4-7-8 помогает снизить стресс: вдох на 4 счёта, задержка на 7, выдох на 8. Повтори 3-4 раза. Регулярные прогулки на свежем воздухе также снижают уровень кортизола на 15–20%.';
  }
  if (lower.includes('давление') || lower.includes('сердц') || lower.includes('пульс')) {
    return 'Норма давления — до 120/80 мм рт. ст., пульс в покое — 60–100 уд/мин. 150 минут умеренной активности в неделю благотворно влияют на сердечно-сосудистую систему. Если показатели стабильно отклоняются — обратись к кардиологу.';
  }
  return 'Отличный вопрос! Расскажи подробнее о своём состоянии, и я дам более точный совет. Помни, что мои рекомендации носят информационный характер и не заменяют консультацию врача.';
}
