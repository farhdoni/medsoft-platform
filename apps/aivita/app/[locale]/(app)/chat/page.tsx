'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  streaming?: boolean;
  quickReplies?: string[];
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Привет! Я AI-помощник aivita. Расскажи о своём самочувствии — я помогу разобраться.',
    time: 'сейчас',
    quickReplies: ['Болит голова', 'Плохо сплю', 'Усталость', 'Как улучшить питание?'],
  },
];

function getTime() {
  return new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        body: JSON.stringify({ messages: payload }),
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
        const quickReplies = getQuickReplies(text);
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
        const quickReplies = getQuickReplies(text);
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
    <div className="flex flex-col h-screen">
      <AppHeader name="AI-помощник" />

      {/* Header badge */}
      <div className="px-5 pb-2 pt-1">
        <div className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-blue-50 rounded-2xl px-3 py-1.5 border border-[rgba(236,72,153,0.1)] w-fit">
          <Sparkles className="w-3 h-3 text-pink-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600">Claude AI · aivita</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0 mb-0.5 shadow-pink">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-pink-blue-mint text-white rounded-br-sm'
                    : 'bg-white/90 backdrop-blur text-navy border border-[rgba(120,160,200,0.15)] rounded-bl-sm shadow-soft'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-0.5 h-4 bg-pink-500 ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </p>
                {!msg.streaming && (
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-[rgb(var(--text-muted))]'}`}>
                    {msg.time}
                  </p>
                )}
              </div>
            </div>

            {/* Quick replies — only on last AI message */}
            {msg.quickReplies && !msg.streaming && msg.id === messages[messages.length - 1].id && (
              <div className="flex flex-wrap gap-2 mt-2 ml-9">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    disabled={isLoading}
                    className="text-xs bg-white/80 backdrop-blur border border-[rgba(120,160,200,0.2)] text-navy px-3 py-1.5 rounded-full hover:bg-white hover:shadow-soft transition-all disabled:opacity-50"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator when waiting for first token */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-[rgba(120,160,200,0.15)]">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 pb-24 md:pb-4 bg-white/80 backdrop-blur-xl border-t border-[rgba(120,160,200,0.1)]">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Напишите о самочувствии..."
            className="flex-1 bg-white border border-[rgba(120,160,200,0.2)] rounded-2xl px-4 py-3 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-pink-strong transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getQuickReplies(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  if (lower.includes('сон') || lower.includes('спать')) return ['Как засыпать быстрее?', 'Нормы сна по возрасту', 'Мелатонин — помогает?'];
  if (lower.includes('питание') || lower.includes('еда')) return ['Лучший завтрак?', 'Можно есть после 18?', 'Как считать калории?'];
  if (lower.includes('стресс') || lower.includes('тревог')) return ['Техники релаксации', 'Медитация для начинающих', 'Когда идти к психологу?'];
  if (lower.includes('вес') || lower.includes('спорт')) return ['Сколько тренироваться?', 'Кардио или силовые?', 'Как не сорваться с диеты?'];
  return ['Расскажи подробнее', 'Какие анализы сдать?', 'Когда обратиться к врачу?'];
}
