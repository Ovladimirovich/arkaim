'use client';

import { useState } from 'react';
import { Card, Typography, List, Select, Button, Space, Statistic, Row, Col, Empty, Spin } from 'antd';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text } = Typography;

type HistoryItem = {
  id: number;
  session_id: string;
  content: string;
  created_at: string;
};

type HistoryStats = {
  questions: number;
  sessions: number;
  last_active: string | null;
};

type ConversationItem = {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function HistoryContent() {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'conversation'>('list');

  const { data: stats } = useQuery({
    queryKey: ['history-stats'],
    queryFn: () => api.get<HistoryStats>('/book/reader/history/stats'),
  });

  const { data: sessions } = useQuery({
    queryKey: ['history-sessions'],
    queryFn: () => api.get<{ data: string[] }>('/book/reader/history/sessions'),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['history', selectedSession],
    queryFn: () => selectedSession
      ? api.get<{ data: any[] }>(`/book/reader/history/full?session_id=${encodeURIComponent(selectedSession)}&limit=100`)
      : api.get<{ data: any[] }>('/book/reader/history?limit=50'),
  });

  const items = history?.data || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>
        <HistoryOutlined /> История вопросов
      </Title>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="Вопросов" value={stats?.questions ?? 0} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Сессий" value={stats?.sessions ?? 0} /></Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Последняя активность"
              value={stats?.last_active ? new Date(stats.last_active).toLocaleDateString('ru') : '—'}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            style={{ width: 300 }}
            placeholder="Выберите сессию"
            allowClear
            value={selectedSession || undefined}
            onChange={(v) => { setSelectedSession(v || ''); setViewMode(v ? 'conversation' : 'list'); }}
            options={(sessions?.data || []).map(s => ({ label: s.slice(0, 30) + '...', value: s }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            Обновить
          </Button>
        </Space>
      </Card>

      {/* Content */}
      <Card>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : items.length === 0 ? (
          <Empty description="Нет истории вопросов" />
        ) : viewMode === 'list' ? (
          <List
            dataSource={items as HistoryItem[]}
            renderItem={(item) => (
              <List.Item style={{ cursor: 'pointer' }} onClick={() => {
                setSelectedSession(item.session_id);
                setViewMode('conversation');
              }}>
                <List.Item.Meta
                  title={item.content}
                  description={
                    <Space>
                      <Text type="secondary">{new Date(item.created_at).toLocaleString('ru')}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>Сессия: {item.session_id.slice(0, 16)}...</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <List
            dataSource={items as ConversationItem[]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.role === 'user' ? 'Вы' : 'Книга'}
                  description={
                    <div>
                      <Text>{item.content}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleString('ru')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
