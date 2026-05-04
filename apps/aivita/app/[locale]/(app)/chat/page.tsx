'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useParams } from 'next/navigation';
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

/** Simple inline markdown → JSX renderer (bold, italic, bullet lists) */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, li) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
    const content = isBullet ? trimmed.slice(2) : line;

    const inlineNodes = inlineFormat(content);

    if (isBullet) {
      elements.push(
        <div key={li} className="flex gap-1.5 items-baseline">
          <span className="flex-shrink-0 mt-1" style={{ color: '#cc8a96' }}>•</span>
          <span>{inlineNodes}</span>
        </div>
      );
    } else if (trimmed === '' || trimmed === '---') {
      elements.push(<div key={li} className="h-2" />);
    } else {
      elements.push(<p key={li} className="mb-0.5">{inlineNodes}</p>);
    }
  });

  return <>{elements}</>;
}

/** Replace **bold** and *italic* with JSX spans */
function inlineFormat(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{m[2]}</strong>);
    } else if (m[3]) {
      parts.push(<em key={key++}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ChatPage() {
  const params = useParams();
  const locale = (['ru', 'uz', 'en'].includes(params?.locale as string) ? params?.locale : 'ru') as string;

  const initData = INITIAL[locale] ?? INITIAL.ru;
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: initData.content, time: 'сейчас', quickReplies: initData.quickReplies },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const didAutoSend = useRef(false);

  // Handle ?q= from home page search — read from window.location (no Suspense needed)
  useEffect(() => {
    if (didAutoSend.current) return;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      didAutoSend.current = true;
      sendMessage(q);
    }
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
                <div className="text-[14px] leading-relaxed">
                  {msg.role === 'assistant'
                    ? renderMarkdown(msg.content)
                    : <span className="whitespace-pre-wrap">{msg.content}</span>}
                  {msg.streaming && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-text-bottom"
                      style={{ background: '#cc8a96' }}
                    />
                  )}
                </div>
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

/** Detect language from message text (same logic as the API mock) */
function detectLang(text: string): 'uz' | 'en' | 'ru' {
  const t = text.toLowerCase();
  const uzWords = ['salom','uyqu','uxla','ovqat','parhez','qanday','gapir','olaysan',
    'bosh','charchoq','stress','tashvish','bosim','yurak','tomoq',
    'салом','уйқу','овқат','ҳам','учун','билан','ўзбек','гапир','олайсан',
    'қандай','сўз','жавоб','оғри','томоқ'];
  if (uzWords.some(w => t.includes(w))) return 'uz';

  const enWords = ['sleep','food','diet','nutrition','stress','anxiety','health',
    'hello','hi ','how are','can you','exercise','weight'];
  if (enWords.some(w => t.includes(w))) return 'en';

  return 'ru';
}

function getQuickReplies(userMessage: string): string[] {
  const lang = detectLang(userMessage);
  const t = userMessage.toLowerCase();

  if (lang === 'uz') {
    if (t.includes('uyqu') || t.includes('уйқу') || t.includes('uxla') || t.includes('ухла'))
      return ['Tezroq uxlash mumkinmi?', 'Uyqu normalari?', 'Melatonin yordam beradimi?'];
    if (t.includes('ovqat') || t.includes('овқат') || t.includes('parhez') || t.includes('taom'))
      return ['Eng yaxshi nonushta?', 'Kechqurun ovqatlansa bo\'ladimi?', 'Kaloriyani qanday hisoblash?'];
    if (t.includes('stress') || t.includes('tashvish') || t.includes('nerv'))
      return ['Relaksatsiya usullari', 'Meditatsiya boshlash', 'Psixologga qachon borish?'];
    return ['Batafsil ayting', 'Qanday tahlillar topshirish kerak?', 'Shifokorga qachon borish?'];
  }

  if (lang === 'en') {
    if (t.includes('sleep')) return ['How to fall asleep faster?', 'Sleep norms by age?', 'Does melatonin help?'];
    if (t.includes('food') || t.includes('diet') || t.includes('nutrition'))
      return ['Best breakfast?', 'Eating after 6pm?', 'How to count calories?'];
    if (t.includes('stress') || t.includes('anxiety'))
      return ['Relaxation techniques', 'Meditation for beginners', 'When to see a therapist?'];
    return ['Tell me more', 'What tests should I take?', 'When to see a doctor?'];
  }

  // Russian
  if (t.includes('сон') || t.includes('спать')) return ['Как засыпать быстрее?', 'Нормы сна по возрасту', 'Мелатонин — помогает?'];
  if (t.includes('питание') || t.includes('еда')) return ['Лучший завтрак?', 'Можно есть после 18?', 'Как считать калории?'];
  if (t.includes('стресс') || t.includes('тревог')) return ['Техники релаксации', 'Медитация для начинающих', 'Когда идти к психологу?'];
  if (t.includes('вес') || t.includes('спорт')) return ['Сколько тренироваться?', 'Кардио или силовые?', 'Как не сорваться с диеты?'];
  return ['Расскажи подробнее', 'Какие анализы сдать?', 'Когда обратиться к врачу?'];
}
