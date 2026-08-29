'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  HelpCircle, Send, Search, User, ShieldAlert, CheckCircle2, Ban,
  MessageSquare, Loader2, Calendar, ShieldCheck, Mail, Info, ShieldCheck as VerifiedIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import Link from 'next/link';

type SupportConversation = {
  id: string;
  name: string;
  nick: string | null;
  av: string;
  c: string;
  time: string;
  prev: string;
  state: 'wait' | 'open' | 'closed';
  reg: string;
  dlg: number;
  rep: number;
  plan: string;
};

type Message = {
  t: 'op' | 'user' | 'sys';
  x: string;
  mt: string;
};

type Report = {
  id: string;
  time: string;
  reporterNick: string;
  reportedNick: string;
  message: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  senderId: string;
};

export default function AivitaSupportPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'support' | 'reports'>('support');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<'all' | 'wait' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch support conversations
  const { data: conversations = [], isLoading: isConvsLoading } = useQuery<SupportConversation[]>({
    queryKey: ['support-conversations'],
    queryFn: () => api.get<{ data: SupportConversation[] }>('/v1/aivita-admin/support/conversations').then(r => r.data),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Fetch message history for selected conversation
  const { data: messages = [], isLoading: isMsgsLoading } = useQuery<Message[]>({
    queryKey: ['support-messages', selectedConvId],
    queryFn: () => api.get<{ data: Message[] }>(`/v1/aivita-admin/support/conversations/${selectedConvId}/messages`).then(r => r.data),
    enabled: !!selectedConvId,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  // Fetch reports/complaints
  const { data: reports = [], isLoading: isReportsLoading } = useQuery<Report[]>({
    queryKey: ['support-reports'],
    queryFn: () => api.get<{ data: Report[] }>('/v1/aivita-admin/support/reports').then(r => r.data),
    staleTime: 15_000,
  });

  // Auto-select first conversation once loaded
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => api.post(`/v1/aivita-admin/support/conversations/${selectedConvId}/messages`, { content: text }),
    onSuccess: () => {
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['support-messages', selectedConvId] });
      qc.invalidateQueries({ queryKey: ['support-conversations'] });
      toast.success('Ответ отправлен пользователю');
    },
    onError: () => {
      toast.error('Не удалось отправить сообщение');
    }
  });

  // Toggle status mutation (Archive/Close / Reopen)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ convId, archived }: { convId: string; archived: boolean }) =>
      api.patch(`/v1/aivita-admin/support/conversations/${convId}/status`, { archived }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['support-conversations'] });
      toast.success(variables.archived ? 'Обращение закрыто' : 'Обращение открыто заново');
    },
    onError: () => {
      toast.error('Не удалось обновить статус обращения');
    }
  });

  // Resolve report mutation
  const resolveReportMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: 'reviewed' | 'dismissed' }) =>
      api.patch(`/v1/aivita-admin/support/reports/${reportId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-reports'] });
      toast.success('Жалоба рассмотрена');
    },
    onError: () => {
      toast.error('Не удалось разрешить жалобу');
    }
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: (userId: string) =>
      api.patch(`/v1/aivita-admin/users/${userId}`, { deletedAt: new Date().toISOString() }),
    onSuccess: () => {
      toast.success('Пользователь успешно заблокирован (деактивирован)');
    },
    onError: () => {
      toast.error('Не удалось заблокировать пользователя');
    }
  });

  const activeConv = conversations.find(c => c.id === selectedConvId);

  // Filters & Search
  const filteredConvs = conversations.filter(c => {
    const matchesFilter =
      filterState === 'all' ||
      (filterState === 'wait' && c.state === 'wait') ||
      (filterState === 'closed' && c.state === 'closed');
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nick && c.nick.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleSend = () => {
    if (!replyText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(replyText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-6">
      {/* ─── Top Header & Navigation Tabs ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Поддержка и модерация</h1>
          <p className="text-muted-foreground text-sm mt-1">
            АРМ оператора: ответы на обращения пользователей и модерация жалоб.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'support' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('support')}
            className="rounded-md font-semibold text-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
            Обращения
            <Badge variant="secondary" className="ml-1.5 px-1 bg-white/20 text-current text-[10px]">
              {conversations.filter(c => c.state !== 'closed').length}
            </Badge>
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('reports')}
            className="rounded-md font-semibold text-xs ml-1"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
            Жалобы
            <Badge variant="secondary" className="ml-1.5 px-1 bg-white/20 text-current text-[10px]">
              {reports.filter(r => r.status === 'pending').length}
            </Badge>
          </Button>
        </div>
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === 'support' ? (
        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          {/* Column 1: Conversations List */}
          <div className="w-[320px] shrink-0 border rounded-xl bg-card flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="p-3 border-b space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени/нику..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={filterState === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterState('all')}
                  className="text-[10px] h-7 px-2.5 rounded-full"
                >
                  Все
                </Button>
                <Button
                  variant={filterState === 'wait' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterState('wait')}
                  className="text-[10px] h-7 px-2.5 rounded-full"
                >
                  Ждут ответа
                </Button>
                <Button
                  variant={filterState === 'closed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterState('closed')}
                  className="text-[10px] h-7 px-2.5 rounded-full"
                >
                  Закрытые
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y">
              {isConvsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Обращений не найдено
                </div>
              ) : (
                filteredConvs.map(c => {
                  const isSelected = c.id === selectedConvId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConvId(c.id)}
                      className={`p-3 cursor-pointer transition hover:bg-muted/40 relative flex gap-3 ${
                        isSelected ? 'bg-primary/5 hover:bg-primary/5' : ''
                      }`}
                    >
                      {/* Left border indicator for unanswered */}
                      {c.state === 'wait' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r" />
                      )}

                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-black"
                        style={{ backgroundColor: c.c }}
                      >
                        {c.av}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-xs truncate text-foreground">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono shrink-0 ml-1">{c.time}</span>
                        </div>
                        <div className="text-[10px] font-bold text-teal-600 truncate">{c.nick}</div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{c.prev}</div>
                        
                        {/* Status badges */}
                        <div className="mt-1.5">
                          {c.state === 'wait' && (
                            <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 text-[9px] px-1.5 py-0">
                              ждёт ответа
                            </Badge>
                          )}
                          {c.state === 'open' && (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/20 text-[9px] px-1.5 py-0">
                              открыто
                            </Badge>
                          )}
                          {c.state === 'closed' && (
                            <Badge variant="secondary" className="text-muted-foreground text-[9px] px-1.5 py-0">
                              закрыто
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Thread/Chat */}
          <div className="flex-1 border rounded-xl bg-muted/20 flex flex-col overflow-hidden relative">
            {selectedConvId && activeConv ? (
              <>
                {/* Header */}
                <div className="p-3 border-b bg-card flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: activeConv.c }}
                    >
                      {activeConv.av}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-foreground">{activeConv.name}</h3>
                      <span className="text-[10px] text-teal-600 font-bold">{activeConv.nick}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate({ convId: activeConv.id, archived: activeConv.state !== 'closed' })}
                      disabled={toggleStatusMutation.isPending}
                      className="h-8 text-xs font-bold"
                    >
                      {activeConv.state === 'closed' ? 'Открыть заново' : 'Закрыть обращение'}
                    </Button>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {isMsgsLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Сообщений нет
                    </div>
                  ) : (
                    messages.map((m, index) => {
                      if (m.t === 'sys') {
                        return (
                          <div key={index} className="flex justify-start">
                            <div className="max-w-[70%] bg-card p-3 rounded-2xl rounded-bl-sm border border-dashed text-xs text-muted-foreground leading-relaxed">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                Автоприветствие
                              </span>
                              {m.x}
                              <span className="text-[9px] font-mono block text-right mt-1.5 opacity-60">{m.mt}</span>
                            </div>
                          </div>
                        );
                      }

                      const isOperator = m.t === 'op';
                      return (
                        <div key={index} className={`flex ${isOperator ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                              isOperator
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-card text-foreground rounded-bl-sm border border-border'
                            }`}
                          >
                            {isOperator && (
                              <span className="text-[8px] font-black uppercase tracking-wider opacity-70 block mb-1">
                                Поддержка · @aivita
                              </span>
                            )}
                            {m.x}
                            <span className="text-[9px] font-mono block text-right mt-1.5 opacity-60">{m.mt}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                <div className="p-3 border-t bg-card shrink-0 flex items-end gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Напишите ответ..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      className="min-h-[50px] text-xs resize-none pr-8"
                    />
                  </div>
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!replyText.trim() || sendMessageMutation.isPending}
                    className="h-9 w-9 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Выберите чат для просмотра переписки</p>
              </div>
            )}
          </div>

          {/* Column 3: Profile Card */}
          {selectedConvId && activeConv && (
            <div className="w-[260px] shrink-0 border rounded-xl bg-card p-4 flex flex-col overflow-y-auto">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black mx-auto mb-3 shadow-md"
                style={{ backgroundColor: activeConv.c }}
              >
                {activeConv.av}
              </div>
              <h3 className="text-sm font-black text-foreground text-center">{activeConv.name}</h3>
              <div className="text-[11px] text-teal-600 font-bold text-center mb-4">{activeConv.nick}</div>

              <div className="space-y-3.5 text-xs border-y py-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Регистрация
                  </span>
                  <span className="font-bold text-foreground">{activeConv.reg}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Диалогов в чате
                  </span>
                  <span className="font-mono font-bold text-foreground">{activeConv.dlg}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Жалоб на него
                  </span>
                  <span className="font-mono font-bold text-destructive">{activeConv.rep}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Тариф
                  </span>
                  <Badge variant="outline" className="font-bold border-teal-500/20 text-teal-600 text-[10px] py-0 px-2 rounded-full">
                    {activeConv.plan}
                  </Badge>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full text-xs font-bold"
                asChild
              >
                <Link href={`/patients/${activeConv.id}`}>
                  Профиль в админке →
                </Link>
              </Button>

              <div className="mt-auto pt-6">
                <div className="p-3 bg-amber-50/60 border border-amber-200/50 rounded-lg text-[10px] leading-relaxed text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>Отвечайте от имени поддержки. Пользователь получит пуш-уведомление и ответ в своём чате с AIVITA.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═══ Tab B Content (Жалобы) ═══ */
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="shrink-0 pb-3 border-b">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              Жалобы пользователей на спам или оскорбления
            </CardTitle>
            <CardDescription className="text-xs">
              Все жалобы отсылаются к конкретным сообщениям в системе и рассматриваются модератором.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {isReportsLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Жалоб в базе данных пока нет
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b text-muted-foreground font-black text-left uppercase tracking-wider text-[10px]">
                      <th className="p-4 w-[160px]">Когда</th>
                      <th className="p-4 w-[240px]">От кого ➔ На кого</th>
                      <th className="p-4">Сообщение / Жалоба</th>
                      <th className="p-4 w-[120px]">Статус</th>
                      <th className="p-4 w-[240px] text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {reports.map(r => (
                      <tr
                        key={r.id}
                        className={`transition hover:bg-muted/20 ${r.status !== 'pending' ? 'opacity-50' : ''}`}
                      >
                        <td className="p-4 font-mono text-muted-foreground">{r.time}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <span>{r.reporterNick}</span>
                            <span className="text-muted-foreground/60">➔</span>
                            <span className="text-destructive font-black">{r.reportedNick}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="max-w-[450px]">
                            <div className="bg-muted p-2 rounded-lg border border-border text-[11px] leading-relaxed italic text-muted-foreground">
                              «{r.message}»
                            </div>
                            <div className="text-[10px] text-amber-600 font-bold mt-1">Причина: спам / реклама / фишинг</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {r.status === 'pending' && (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/20 text-[9px]">
                              на проверке
                            </Badge>
                          )}
                          {r.status === 'reviewed' && (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[9px]">
                              решено
                            </Badge>
                          )}
                          {r.status === 'dismissed' && (
                            <Badge variant="secondary" className="text-muted-foreground text-[9px]">
                              отклонено
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {r.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resolveReportMutation.mutate({ reportId: r.id, status: 'reviewed' })}
                                disabled={resolveReportMutation.isPending}
                                className="h-7 text-[10px] font-bold"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                                Решено
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => blockUserMutation.mutate(r.senderId)}
                                disabled={blockUserMutation.isPending}
                                className="h-7 text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Бан
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
