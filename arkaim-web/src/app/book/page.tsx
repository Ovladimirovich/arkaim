'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Spin, Empty, Popconfirm, Progress, Tooltip, Drawer } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, HistoryOutlined, BulbOutlined, ClearOutlined, BookOutlined, ThunderboltOutlined, DatabaseOutlined, LinkOutlined, MenuOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Markdown } from '@/shared/lib/markdown';
import { ProtectedRoute } from '@/shared/lib/guards';
import Link from 'next/link';

const { Title, Text } = Typography;
const { TextArea } = Input;

type Message = {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  time?: string;
  sourceType?: 'pulse' | 'llm' | 'hybrid' | 'mock';
  mood?: 'joy' | 'curiosity' | 'sadness' | 'doubt' | 'deep' | 'neutral';
  suggestion?: string;
};
type HistoryItem = { id: number; content: string; created_at: string };
type HistoryFullItem = { role: 'user' | 'assistant'; content: string; created_at: string };

const EXAMPLE_QUESTIONS = [
  'Кто такой Велик?',
  'Расскажи об Аркаиме',
  'Какие темы раскрывает книга?',
  'Что такое Гиперборея?',
  'Какова миссия книги?',
];

const SOURCE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pulse: { icon: <DatabaseOutlined />, color: '#059669', label: 'Геном' },
  llm: { icon: <ThunderboltOutlined />, color: '#7c3aed', label: 'AI' },
  hybrid: { icon: <LinkOutlined />, color: '#2563eb', label: 'Гибрид' },
  mock: { icon: <BulbOutlined />, color: '#6b7280', label: 'Заглушка' },
};

const SESSION_KEY = 'arkaim_chat_session';

function loadSession(): Message[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); } catch { return []; }
}

function saveSession(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-50))); } catch {}
}

function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (!sourceType) return null;
  const config = SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.mock;
  return (
    <Tooltip title={`Источник: ${config.label}`}>
      <Tag style={{ marginTop: 4, fontSize: 10, color: config.color, borderColor: config.color }}>
        {config.icon} {config.label}
      </Tag>
    </Tooltip>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', h);
    return () => mql.removeEventListener('change', h);
  }, []);
  return isMobile;
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const isMobile = useIsMobile();

  const { data: genome } = useQuery({
    queryKey: ['genome'],
    queryFn: () => api.get<{ themes: Array<{ name: string; description?: string }> }>('/book/genome'),
  });

  const { data: profile } = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => api.get<{ topics: Array<{ name: string; depth: number; questions: number }>; questions_total: number; conversation_count: number; last_topic: string }>('/book/reader/profile'),
  });

  const { data: historyData } = useQuery({
    queryKey: ['reader-history-preview'],
    queryFn: () => api.get<{ data: HistoryItem[] }>('/book/reader/history?limit=5'),
  });

  const { data: fullHistory } = useQuery({
    queryKey: ['reader-history-full'],
    queryFn: () => api.get<{ data: HistoryFullItem[] }>('/book/reader/history/full?limit=20'),
  });

  const recentQuestions = historyData?.data?.slice(0, 5) || [];

  useEffect(() => {
    const saved = loadSession();
    if (saved.length > 0) setMessages(saved);
  }, []);

  useEffect(() => {
    if (fullHistory?.data && messages.length === 0) {
      setMessages(fullHistory.data.map(item => ({
        role: item.role,
        content: item.content,
        time: new Date(item.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
        sourceType: 'pulse',
      })));
    }
  }, [fullHistory]);

  useEffect(() => { if (messages.length > 0) saveSession(messages); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingText]);
  useEffect(() => { if (!sending) inputRef.current?.focus(); }, [sending]);

  const now = () => new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  const sendMessage = useCallback(async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || sending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q, time: now() }]);
    setSending(true);
    setStreamingText('');

    // Подготовить историю диалога (последние 6 сообщений)
    const dialogueHistory = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('arkaim_session='))?.split('=')[1] || '';
      const resp = await fetch('/v1/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question: q, messages: dialogueHistory }),
      });

      if (resp.ok && resp.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value, { stream: true }).split('\n')) {
              if (line.startsWith('data: ')) {
                try { const d = JSON.parse(line.slice(6)); if (d.text) { fullText += d.text; setStreamingText(fullText); } } catch {}
              }
            }
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', content: fullText || 'Получен пустой ответ.', sourceType: 'hybrid', time: now() }]);
      } else {
        const result = await api.post<{ data: { answer: string; source?: string; mood?: string; suggestion?: string } }>('/book/ask', { question: q, messages: dialogueHistory });
        const sourceType = result.data.source === 'mock' ? 'mock' : result.data.source?.includes('pulse') ? 'pulse' : 'llm';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.data.answer,
          source: result.data.source,
          sourceType,
          mood: result.data.mood as any,
          suggestion: result.data.suggestion,
          time: now(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте позже.', sourceType: 'mock', time: now() }]);
    } finally {
      setSending(false);
      setStreamingText('');
    }
  }, [input, sending, messages]);

  const newSession = () => { setMessages([]); setInput(''); localStorage.removeItem(SESSION_KEY); };

  const selectTopic = (topicName: string) => {
    setMessages([]);
    setInput('');
    localStorage.removeItem(SESSION_KEY);
    setTimeout(() => sendMessage(`Расскажи о теме «${topicName}»`), 100);
  };

  // Sidebar content
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Card size="small" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', border: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>𓃉</div>
          <Text strong style={{ color: '#fff', fontSize: 14 }}>Наследие Аркаима</Text>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Цифровое сознание книги</div>
          {profile?.last_topic && (
            <div style={{ marginTop: 8 }}>
              <Tag style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>
                Последняя тема: {profile.last_topic}
              </Tag>
            </div>
          )}
        </div>
      </Card>

      <Card size="small" title="Навигация">
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Link href="/library" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><BookOutlined /> Библиотека</Link>
          <Link href="/search" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><BulbOutlined /> Поиск</Link>
          <Link href="/reading" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><BookOutlined /> Чтение</Link>
        </Space>
      </Card>

      <Card size="small" title={<><BookOutlined /> Темы</>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {genome?.themes?.slice(0, 12).map((t, i) => (
            <Tooltip key={i} title={t.description}>
              <Tag
                onClick={() => selectTopic(t.name)}
                style={{ marginBottom: 0, cursor: 'pointer', fontSize: 11, background: '#334155', color: '#e2e8f0', borderColor: '#475569' }}
              >{t.name}</Tag>
            </Tooltip>
          ))}
        </div>
      </Card>

      {profile?.topics && profile.topics.length > 0 && (
        <Card size="small" title="Мои темы">
          {profile.topics.slice(0, 5).map((t, i) => (
            <div key={i} style={{ marginBottom: 6, cursor: 'pointer', padding: '4px 0', borderRadius: 4, transition: 'background 0.2s' }}
              onClick={() => selectTopic(t.name)}
              onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: '#e2e8f0' }}>{t.name}</span><Text style={{ color: '#94a3b8', fontSize: 11 }}>{Math.round(t.depth * 100)}%</Text>
              </div>
              <Progress percent={Math.round(t.depth * 100)} size="small" showInfo={false}
                strokeColor={t.depth > 0.7 ? '#52c41a' : t.depth > 0.4 ? '#3b82f6' : '#475569'} />
            </div>
          ))}
        </Card>
      )}

      <Card size="small">
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <Text type="secondary">Вопросов</Text><Text>{profile?.questions_total ?? 0}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <Text type="secondary">Диалогов</Text><Text>{profile?.conversation_count ?? 0}</Text>
          </div>
        </Space>
      </Card>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 100px)' }}>
      {/* Sidebar: desktop */}
      {!isMobile && <div style={{ width: 260, flexShrink: 0, overflow: 'auto' }}>{sidebarContent}</div>}

      {/* Sidebar: mobile drawer */}
      <Drawer title="Навигация" placement="left" onClose={() => setSidebarOpen(false)} open={sidebarOpen} width={280}>
        {sidebarContent}
      </Drawer>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            {isMobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setSidebarOpen(true)} />}
            <div>
              <Title level={4} style={{ margin: 0 }}>Чат с книгой</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>Задайте вопрос книге «Наследие Аркаима»</Text>
            </div>
          </Space>
          {messages.length > 0 && (
            <Space>
              <Button icon={<PlusOutlined />} size="small" onClick={newSession}>Новая сессия</Button>
              <Popconfirm title="Очистить историю?" onConfirm={newSession} okText="Да" cancelText="Нет">
                <Button icon={<ClearOutlined />} size="small">Очистить</Button>
              </Popconfirm>
            </Space>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', borderRadius: 10, padding: 16, border: '1px solid #1e293b' }}>
          {messages.length === 0 && (
            <div style={{ padding: '2rem 0', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>𓃉</div>
              <Title level={4} style={{ marginBottom: 8 }}>Задайте вопрос книге</Title>
              <Text style={{ display: 'block', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', color: '#94a3b8', fontSize: 14 }}>
                Книга ответит на основе своего содержания, тем и знаний
              </Text>
              {recentQuestions.length > 0 && (
                <div style={{ marginBottom: 16, maxWidth: 500, margin: '0 auto 16px' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}><HistoryOutlined /> Недавние вопросы:</Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {recentQuestions.map((item, i) => (
                      <div key={i} onClick={() => sendMessage(item.content)}
                        style={{ padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left', color: '#e2e8f0', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                        {item.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ maxWidth: 500, margin: '0 auto' }}>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}><BulbOutlined /> Попробуйте спросить:</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {EXAMPLE_QUESTIONS.map((q, i) => (
                    <div key={i} onClick={() => sendMessage(q)}
                      style={{ padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left', color: '#e2e8f0', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <div style={{ maxWidth: '50%', minWidth: 120, background: '#2563eb', color: '#fff', padding: '10px 14px', borderRadius: '14px 2px 14px 14px', fontSize: 14, lineHeight: 1.6 }}>
                    {msg.content}
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserOutlined />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOutlined />
                  </div>
                  <div style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '2px 14px 14px 14px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
                      <Markdown content={msg.content} />
                    </div>
                    <SourceBadge sourceType={msg.sourceType} />
                    {msg.time && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, paddingLeft: 4 }}>{msg.time}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}

          {sending && streamingText && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOutlined />
              </div>
              <div style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '2px 14px 14px 14px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
                  <Markdown content={streamingText} />
                  <span style={{ color: '#3b82f6' }}>▌</span>
                </div>
              </div>
            </div>
          )}

          {sending && !streamingText && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOutlined />
              </div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '2px 14px 14px 14px', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <Space><Spin size="small" /><Text style={{ color: '#94a3b8', fontSize: 13 }}>Думаю...</Text></Space>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <TextArea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={messages.length === 0 ? 'Ваш вопрос книге...' : 'Задайте ещё вопрос...'}
            autoSize={{ minRows: 1, maxRows: 4 }} disabled={sending} style={{ borderRadius: 8 }} />
          <Button type="primary" icon={<SendOutlined />} onClick={() => sendMessage()} loading={sending}
            style={{ borderRadius: 8, height: 'auto' }}>Отправить</Button>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}
