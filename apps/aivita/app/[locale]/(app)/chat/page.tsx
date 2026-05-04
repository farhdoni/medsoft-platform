'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Icon3D } from '@/components/cabinet/icons/Icon3D';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  streaming?: boolean;
  quickReplies?: string[];
};

const INITIAL: Record<string, { content: string; quickReplies: string[] }> = {
  ru: {
    content: 'Привет! Я AI-помощник aivita. Расскажи о своём самочувствии — я помогу разобраться.',
    quickReplies: ['Болит голова', 'Плохо сплю', 'Усталость', 'Как улучшить питание?'],
  },
  uz: {
    content: 'Salom! Men aivita AI-yordamchisiman. O\'zingizni qanday his qilayotganingizni ayting — yordam beraman.',
    quickReplies: ['Bosh og\'riq', 'Uxlay olmayman', 'Charchoq', 'Ovqatlanishni yaxshilash?'],
  },
  en: {
    content: 'Hi! I\'m aivita\'s AI assistant. Tell me how you\'re feeling — I\'ll help you out.',
    quickReplies: ['Headache', 'Can\'t sleep', 'Fatigue', 'How to improve nutrition?'],
  },
};

function getTime() {
  return new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (['ru', 'uz', 'en'].includes(params?.locale as string) ? params?.locale : 'ru') as string;

  const initData = INITIAL[locale] ?? INITIAL.ru;
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: initData.content, time: 'сейчас', quickReplies: initData.quickReplies },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Handle ?q= from home page search
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) sendMessage(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      time: getTime(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiId,
      role: 'assistant',
      content: '',
      time: getTime(),
      streaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const payload = updatedMessages
        .filter((m) => !m.streaming)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload, locale }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get('Content-Type') ?? '';

      if (contentType.includes('text/event-stream')) {
        // Streaming SSE response
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiId
                        ? { ...m, content: accumulated, streaming: true }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        }

        // Final: mark not streaming, add quick replies
        const quickReplies = getQuickReplies(text, locale);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: accumulated || 'Произошла ошибка. Попробуй ещё раз.',
                  streaming: false,
                  quickReplies: updatedMessages.length < 6 ? quickReplies : undefined,
                }
              : m
          )
        );
      } else {
        // JSON fallback (mock mode)
        const json = await res.json();
        const quickReplies = getQuickReplies(text, locale);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: json.content ?? 'Ошибка ответа',
                  streaming: false,
                  quickReplies: updatedMessages.length < 6 ? quickReplies : undefined,
                }
              : m
          )
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Не удалось получить ответ. Проверь подключение.', streaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* AI banner */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-2">
        <div
          className="flex items-center gap-3 rounded-2xl p-3"
          style={{ background: 'linear-gradient(135deg, #e0d8f0 0%, #d4e8d8 100%)' }}
        >
          <Icon3D name="doctor" size={36} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold" style={{ color: '#2a2540' }}>AI ассистент</p>
              <span
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#d4e8d8', color: '#548068' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#548068] inline-block" />
                онлайн
              </span>
            </div>
            <p className="text-[11px]" style={{ color: '#6a6580' }}>Claude AI · aivita health</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-2 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.role === 'assistant' && (
                <div
                  className="w-8 h-8 rounded-2xl flex-shrink-0 mb-0.5 flex items-center justify-center"
                  style={{ background: '#e0d8f0' }}
                >
                  <Icon3D name="sparkle" size={20} />
                </div>
              )}
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={
                  msg.role === 'user'
                    ? { background: '#9c5e6c', color: '#ffffff', borderBottomRightRadius: 4 }
                    : { background: '#ffffff', color: '#2a2540', borderBottomLeftRadius: 4, border: '1px solid #e8e4dc' }
                }
              >
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.streaming && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom"
                      style={{ background: '#cc8a96' }}
                    />
                  )}
                </p>
                {!msg.streaming && (
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#9a96a8', textAlign: msg.role === 'user' ? 'right' : 'left' }}
                  >
                    {msg.time}
                  </p>
                )}
              </div>
            </div>

            {/* Quick replies */}
            {msg.quickReplies && !msg.streaming && msg.id === messages[messages.length - 1].id && (
              <div className="flex flex-wrap gap-2 mt-2 ml-10">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    disabled={isLoading}
                    className="text-[12px] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: '#f0d4dc', color: '#9c5e6c', fontWeight: 600 }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-end gap-2">
            <div
              className="w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: '#e0d8f0' }}
            >
              <Icon3D name="sparkle" size={20} />
            </div>
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: '#ffffff', border: '1px solid #e8e4dc', borderBottomLeftRadius: 4 }}
            >
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#cc8a96', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-4 md:px-6 py-3"
        style={{ background: 'rgba(244,243,239,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e8e4dc' }}
      >
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={locale === 'uz' ? 'O\'zingizni qanday his qilayotganingizni yozing...' : locale === 'en' ? 'Describe how you feel...' : 'Напишите о самочувствии...'}
            className="flex-1 rounded-2xl px-4 py-3 text-[14px] focus:outline-none"
            style={{
              background: '#ffffff',
              border: '1px solid #e8e4dc',
              color: '#2a2540',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: '#9c5e6c' }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getQuickReplies(userMessage: string, locale: string): string[] {
  const lower = userMessage.toLowerCase();

  if (locale === 'uz') {
    if (lower.includes('uyqu') || lower.includes('uxla') || lower.includes('yotish'))
      return ['Tezroq uxlash uchun maslahat?', 'Uyqu normalari?', 'Melatonin yordam beradimi?'];
    if (lower.includes('ovqat') || lower.includes('taom') || lower.includes('parhez'))
      return ['Eng yaxshi nonushta?', 'Kechqurun ovqatlansa bo\'ladimi?', 'Kaloriyani qanday hisoblash?'];
    if (lower.includes('stress') || lower.includes('tashvish') || lower.includes('nerv'))
      return ['Relaksatsiya usullari', 'Meditatsiya boshlash', 'Psixologga qachon borish?'];
    return ['Batafsil ayting', 'Qanday tahlillar topshirish kerak?', 'Shifokorga qachon borish?'];
  }

  if (locale === 'en') {
    if (lower.includes('sleep')) return ['How to fall asleep faster?', 'Sleep norms by age?', 'Does melatonin help?'];
    if (lower.includes('food') || lower.includes('diet') || lower.includes('nutrition'))
      return ['Best breakfast?', 'Eating after 6pm?', 'How to count calories?'];
    if (lower.includes('stress') || lower.includes('anxiety'))
      return ['Relaxation techniques', 'Meditation for beginners', 'When to see a therapist?'];
    return ['Tell me more', 'What tests to take?', 'When to see a doctor?'];
  }

  // Default: Russian
  if (lower.includes('сон') || lower.includes('спать')) return ['Как засыпать быстрее?', 'Нормы сна по возрасту', 'Мелатонин — помогает?'];
  if (lower.includes('питание') || lower.includes('еда')) return ['Лучший завтрак?', 'Можно есть после 18?', 'Как считать калории?'];
  if (lower.includes('стресс') || lower.includes('тревог')) return ['Техники релаксации', 'Медитация для начинающих', 'Когда идти к психологу?'];
  if (lower.includes('вес') || lower.includes('спорт')) return ['Сколько тренироваться?', 'Кардио или силовые?', 'Как не сорваться с диеты?'];
  return ['Расскажи подробнее', 'Какие анализы сдать?', 'Когда обратиться к врачу?'];
}
