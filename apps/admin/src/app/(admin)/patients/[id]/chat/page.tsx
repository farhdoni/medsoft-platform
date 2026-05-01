'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Message = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Session = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

type ChatResponse = { data: Session[] };

export default function PatientChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery<ChatResponse>({
    queryKey: ['aivita-user-chat', id],
    queryFn: () => api.get(`/v1/aivita-admin/users/${id}/chat`),
  });

  // Auto-expand the first session once data loads
  useEffect(() => {
    if (data?.data.length && Object.keys(expanded).length === 0) {
      setExpanded({ [data.data[0].id]: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function toggle(sessionId: string) {
    setExpanded((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  }

  const sessions = data?.data ?? [];
  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/patients/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-500" />
            История AI-чата
          </h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {sessions.length} сессий · {totalMessages} сообщений
            </p>
          )}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Конфиденциально — просмотр в служебных целях. Действие записывается в журнал аудита.</span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Нет истории переписки
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      {!isLoading && sessions.map((session) => {
        const isOpen = !!expanded[session.id];
        return (
          <Card key={session.id} className="overflow-hidden">
            {/* Session header */}
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggle(session.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <CardTitle className="text-sm font-medium truncate">
                    {session.title ?? 'Без названия'}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                  <Badge variant="secondary">{session.messages.length} сообщ.</Badge>
                  <span>{formatDate(session.updatedAt)}</span>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            {isOpen && (
              <CardContent className="pt-0 px-4 pb-4 space-y-3 max-h-[600px] overflow-y-auto">
                <div className="border-t pt-3 space-y-3">
                  {session.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Нет сообщений</p>
                  ) : session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {msg.role === 'user' ? 'Пользователь' : 'AI'} · {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
