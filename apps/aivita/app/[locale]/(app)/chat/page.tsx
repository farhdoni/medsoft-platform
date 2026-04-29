'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { AppHeader } from '@/components/app/app-header';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  quickReplies?: string[];
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Привет! Я AI-помощник aivita. Расскажи о своём самочувствии — я помогу разобраться.',
    time: 'сейчас',
    quickReplies: ['Болит голова', 'Плохо сплю', 'Усталость', 'Другое'],
  },
];

const AI_RESPONSES: Record<string, string> = {
  'болит голова': 'Головная боль может быть связана с напряжением, обезвоживанием или нарушением сна. Когда она появилась? Пульсирующая или давящая?',
  'плохо сплю': 'Нарушения сна — сигнал от организма. Расскажи подробнее: трудно засыпать или часто просыпаешься ночью?',
  'усталость': 'Хроническая усталость часто связана со сном, питанием или уровнем стресса. По данным твоего профиля — сон у тебя неплохой. Как с едой и водой?',
  'default': 'Понял. Можешь описать подробнее? Это поможет мне дать более точный совет.',
};

function getTime() {
  return new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      time: getTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const key = text.toLowerCase();
      const response =
        AI_RESPONSES[key] ||
        AI_RESPONSES[Object.keys(AI_RESPONSES).find((k) => key.includes(k)) || 'default'] ||
        AI_RESPONSES['default'];

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        time: getTime(),
        quickReplies:
          messages.length < 4
            ? ['Расскажи подробнее', 'Как лечить?', 'Когда к врачу?']
            : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-screen">
      <AppHeader name="AI-помощник" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-pink-blue-mint text-white rounded-br-sm'
                    : 'bg-white/90 backdrop-blur text-navy border border-[rgba(120,160,200,0.15)] rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-[rgb(var(--text-muted))]'}`}>
                  {msg.time}
                </p>
              </div>
            </div>

            {/* Quick replies */}
            {msg.quickReplies && msg.id === messages[messages.length - 1].id && (
              <div className="flex flex-wrap gap-2 mt-2 ml-9">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    className="text-xs bg-white/80 backdrop-blur border border-[rgba(120,160,200,0.2)] text-navy px-3 py-1.5 rounded-full hover:bg-white hover:shadow-soft transition-all"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/90 backdrop-blur rounded-2xl rounded-bl-sm px-4 py-3 border border-[rgba(120,160,200,0.15)]">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
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
            disabled={!input.trim()}
            className="w-11 h-11 rounded-xl bg-gradient-pink-blue-mint flex items-center justify-center shadow-pink disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-pink-strong transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
