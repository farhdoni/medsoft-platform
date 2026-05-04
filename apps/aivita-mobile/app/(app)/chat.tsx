import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Bot, User } from 'lucide-react-native';
import { apiRequest, isOk } from '../../src/lib/api';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  aiMetadata?: { quick_replies?: string[] };
  createdAt: string;
};

type Session = { id: string; title: string };

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Create or reuse last session
  useEffect(() => {
    async function init() {
      try {
        const listRes = await apiRequest<Session[]>('/chat/sessions');
        const sessions = isOk(listRes) ? listRes.data : [];
        let currentSession: Session;

        if (sessions.length > 0) {
          currentSession = sessions[0];
        } else {
          const createRes = await apiRequest<Session>('/chat/sessions', {
            method: 'POST',
            body: JSON.stringify({ title: 'Новый чат' }),
          });
          if (!isOk(createRes)) throw new Error('Failed to create session');
          currentSession = createRes.data;
        }

        setSession(currentSession);

        // Load messages
        const msgsRes = await apiRequest<Message[]>(`/chat/sessions/${currentSession.id}/messages`);
        if (isOk(msgsRes)) {
          setMessages(msgsRes.data);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
        }
      } catch (err) {
        console.warn('Chat init error:', err);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  async function sendMessage(text: string) {
    if (!session || !text.trim() || sending) return;
    const trimmed = text.trim();
    setInput('');
    setSending(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await apiRequest<{ userMessage: Message; aiMessage: Message }>(
        `/chat/sessions/${session.id}/messages`,
        { method: 'POST', body: JSON.stringify({ role: 'user', content: trimmed }) },
      );

      if (isOk(res)) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          res.data.userMessage,
          res.data.aiMessage,
        ]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.warn('Send error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  const QUICK_REPLIES = ['Как улучшить сон?', 'Моя диета правильная?', 'Почему я устаю?', 'Как снизить стресс?'];
  const lastAi = [...messages].reverse().find((m) => m.role === 'assistant');
  const quickReplies = lastAi?.aiMetadata?.quick_replies ?? (messages.length === 0 ? QUICK_REPLIES : []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9f7f4' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e8e4dc',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f9f7f4', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#9c5e6c', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={18} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1a1a2e' }}>AI-ассистент</Text>
          <Text style={{ fontSize: 11, color: '#9090a8' }}>Медицинские рекомендации</Text>
        </View>
      </View>

      {/* Messages */}
      {initializing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#9c5e6c" size="large" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#f5eaed', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Bot size={32} color="#9c5e6c" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 }}>
                Привет! Я AI-ассистент Aivita
              </Text>
              <Text style={{ fontSize: 13, color: '#9090a8', textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>
                Задай вопрос о здоровье, симптомах или образе жизни — я помогу разобраться.
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {sending && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#9c5e6c', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} color="#ffffff" />
              </View>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: '#e8e4dc' }}>
                <ActivityIndicator size="small" color="#9090a8" />
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Quick replies */}
      {quickReplies.length > 0 && !sending && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
          {quickReplies.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => sendMessage(r)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e8e4dc' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#4a4a6a' }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e8e4dc',
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Задай вопрос о здоровье..."
          placeholderTextColor="#c0c0d0"
          multiline
          maxLength={500}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            backgroundColor: '#f9f7f4',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e8e4dc',
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 14,
            color: '#1a1a2e',
          }}
        />
        <TouchableOpacity
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || sending}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: input.trim() && !sending ? '#9c5e6c' : '#e8e4dc',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={18} color={input.trim() && !sending ? '#ffffff' : '#9090a8'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      {!isUser && (
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#9c5e6c', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={16} color="#ffffff" />
        </View>
      )}
      <View
        style={{
          maxWidth: '75%',
          backgroundColor: isUser ? '#9c5e6c' : '#ffffff',
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          padding: 12,
          borderWidth: isUser ? 0 : 1,
          borderColor: '#e8e4dc',
        }}
      >
        <Text style={{ fontSize: 14, color: isUser ? '#ffffff' : '#1a1a2e', lineHeight: 20 }}>
          {msg.content}
        </Text>
      </View>
      {isUser && (
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f5eaed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={16} color="#9c5e6c" />
        </View>
      )}
    </View>
  );
}
