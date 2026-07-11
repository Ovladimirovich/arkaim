'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Spin, Empty, List, Progress, Tooltip, Row, Col } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, BulbOutlined, HistoryOutlined, BookOutlined, ThunderboltOutlined, DatabaseOutlined, LinkOutlined, ArrowRightOutlined } from '@ant-design/icons';
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
};

type ReaderProfile = {
  topics: Array<{ name: string; depth: number; questions: number }>;
  questions_total: number;
  last_topic: string;
};

const SOURCE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pulse: { icon: <DatabaseOutlined />, color: '#059669', label: 'Геном' },
  llm: { icon: <ThunderboltOutlined />, color: '#7c3aed', label: 'AI' },
  hybrid: { icon: <LinkOutlined />, color: '#2563eb', label: 'Гибрид' },
  mock: { icon: <BulbOutlined />, color: '#6b7280', label: 'Заглушка' },
};

const POPULAR_QUESTIONS = [
  { q: 'Кто такой Велик?', tag: 'Персонаж' },
  { q: 'Расскажи об Аркаиме', tag: 'Локация' },
  { q: 'Какие темы раскрывает книга?', tag: 'Анализ' },
  { q: 'Что такое Гиперборея?', tag: 'Мифология' },
  { q: 'Какова миссия книги?', tag: 'Философия' },
  { q: 'Какие ценности проповедует книга?', tag: 'Ценности' },
  { q: 'Кто главный герой?', tag: 'Персонаж' },
  { q: 'Где происходит действие?', tag: 'Локация' },
];

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

function AskContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  const { data: profile } = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => api.get<ReaderProfile>('/book/reader/profile'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  const now = () => new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  const sendMessage = useCallback(async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || sending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q, time: now() }]);
    setSending(true);
    setStreamingText('');

    try {
      const token = document.cookie.split('; ').find(c => c.startsWith('arkaim_session='))?.split('=')[1] || '';
      const resp = await fetch('/v1/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
      });

      if (resp.ok && resp.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = resp.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) { fullText += data.text; setStreamingText(fullText); }
                } catch {}
              }
            }
          }
        }
        setMessages(prev => [...prev, { role: 'assistant', content: fullText || 'Получен пустой ответ.', sourceType: 'hybrid', time: now() }]);
      } else {
        const result = await api.post<{ data: { answer: string; source?: string } }>('/book/ask', { question: q });
        const sourceType = result.data.source === 'mock' ? 'mock' : result.data.source?.includes('pulse') ? 'pulse' : 'llm';
        setMessages(prev => [...prev, { role: 'assistant', content: result.data.answer, source: result.data.source, sourceType, time: now() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте позже.', sourceType: 'mock', time: now() }]);
    } finally {
      setSending(false);
      setStreamingText('');
    }
  }, [input, sending]);

  const hasHistory = messages.length > 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      {!hasHistory && (
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '4rem', marginBottom: 8 }}>𓃉</div>
          <Title level={2} style={{ marginBottom: 8 }}>Задайте вопрос книге</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Книга ответит на основе своего содержания, тем и знаний
          </Text>
          {profile && (
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {profile.questions_total} вопросов задано · {profile.topics?.length || 0} тем изучено
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
        {messages.length === 0 ? (
          /* Popular questions */
          <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 12, display: 'block' }}>
              <BulbOutlined /> Популярные вопросы:
            </Text>
            <Row gutter={[8, 8]}>
              {POPULAR_QUESTIONS.map((item, i) => (
                <Col xs={24} sm={12} key={i}>
                  <div
                    onClick={() => sendMessage(item.q)}
                    style={{
                      padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <Text style={{ fontSize: 13 }}>{item.q}</Text>
                    <Space size={4}>
                      <Tag style={{ fontSize: 10, margin: 0 }}>{item.tag}</Tag>
                      <ArrowRightOutlined style={{ color: '#999', fontSize: 10 }} />
                    </Space>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          /* Conversation */
          <div>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'assistant' ? 'linear-gradient(135deg, #1e293b, #334155)' : '#dbeafe',
                  color: msg.role === 'assistant' ? '#fff' : '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {msg.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
                </div>
                <div style={{ maxWidth: '80%' }}>
                  <Card size="small" style={{
                    background: msg.role === 'assistant' ? '#f8fafc' : '#eff6ff',
                    border: 'none',
                    borderRadius: msg.role === 'assistant' ? '2px 14px 14px 14px' : '14px 2px 14px 14px',
                  }}>
                    {msg.role === 'assistant' ? <Markdown content={msg.content} /> : <Text>{msg.content}</Text>}
                    <SourceBadge sourceType={msg.sourceType} />
                  </Card>
                  {msg.time && (
                    <Text type="secondary" style={{ fontSize: 10, marginTop: 2, display: 'block', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {msg.time}
                    </Text>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {sending && streamingText && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <RobotOutlined />
                </div>
                <Card size="small" style={{ background: '#f8fafc', border: 'none', borderRadius: '2px 14px 14px 14px', maxWidth: '80%' }}>
                  <Markdown content={streamingText} />
                  <Text type="secondary" style={{ fontSize: 12, animation: 'blink 1s infinite' }}>▌</Text>
                </Card>
              </div>
            )}

            {/* Typing */}
            {sending && !streamingText && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  <RobotOutlined />
                </div>
                <Card size="small" style={{ background: '#f8fafc', border: 'none', borderRadius: '2px 14px 14px 14px' }}>
                  <Space><Spin size="small" /><Text type="secondary" style={{ fontSize: 12 }}>Думаю...</Text></Space>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <Card size="small" style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <TextArea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={hasHistory ? 'Задайте ещё вопрос...' : 'Ваш вопрос книге...'}
            autoSize={{ minRows: 1, maxRows: 3 }}
            disabled={sending}
            style={{ borderRadius: 8 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={() => sendMessage()} loading={sending}
            style={{ borderRadius: 8, height: 'auto', minWidth: 80 }}>
            Отправить
          </Button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Enter — отправить · Shift+Enter — новая строка</Text>
          <Space size={4}>
            <Link href="/book" style={{ fontSize: 11 }}>💬 Чат</Link>
            <Link href="/library" style={{ fontSize: 11 }}>📖 Библиотека</Link>
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default function AskPage() {
  return (
    <ProtectedRoute>
      <AskContent />
    </ProtectedRoute>
  );
}
