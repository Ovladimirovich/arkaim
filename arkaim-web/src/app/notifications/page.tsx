'use client';

import { useState } from 'react';
import { Card, Typography, Tabs, Table, Tag, Button, Space, List, Statistic, Row, Col, Modal, message, Empty, Badge } from 'antd';
import { BellOutlined, MailOutlined, BulbOutlined, SendOutlined, CheckOutlined, CloseOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

// ── Types ──────────────────────────────────────────

type Suggestion = {
  id: string;
  topic: string;
  reason?: string;
  suggested_action?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
};

type TrendingTopic = {
  keyword: string;
  hits: number;
  sources: string[];
};

type EmailDraft = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  approved_at?: string;
  sent_at?: string;
};

type EmailStats = {
  subscribers: number;
  sent: number;
  errors: number;
};

// ── Suggestions Panel ──────────────────────────────

function SuggestionsPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.get<{ suggestions: Suggestion[] }>('/book/presence/suggestions'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/presence/suggestions/${id}/approve`),
    onSuccess: () => { message.success('Предложение одобрено'); queryClient.invalidateQueries({ queryKey: ['suggestions'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/presence/suggestions/${id}/reject`),
    onSuccess: () => { message.success('Предложение отклонено'); queryClient.invalidateQueries({ queryKey: ['suggestions'] }); },
  });

  const suggestions = data?.suggestions || [];
  const pending = suggestions.filter(s => s.status === 'pending');
  const approved = suggestions.filter(s => s.status === 'approved');
  const rejected = suggestions.filter(s => s.status === 'rejected');

  const columns = [
    { title: 'Тема', dataIndex: 'topic', key: 'topic', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Причина', dataIndex: 'reason', key: 'reason', render: (v: string) => v || '—' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (v: string) => (
      <Tag color={v === 'approved' ? 'green' : v === 'rejected' ? 'red' : 'orange'}>{v}</Tag>
    )},
    { title: 'Действия', key: 'actions', render: (_: any, record: Suggestion) => record.status === 'pending' ? (
      <Space>
        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approveMutation.mutate(record.id)}>Одобрить</Button>
        <Button size="small" danger icon={<CloseOutlined />} onClick={() => rejectMutation.mutate(record.id)}>Отклонить</Button>
      </Space>
    ) : null },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="Ожидают" value={pending.length} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Одобрено" value={approved.length} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Отклонено" value={rejected.length} valueStyle={{ color: '#dc2626' }} /></Card></Col>
      </Row>
      <Table columns={columns} dataSource={suggestions} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 10 }} />
    </div>
  );
}

// ── Trending Panel ──────────────────────────────

function TrendingPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get<{ trending: TrendingTopic[]; total: number }>('/book/presence/trending?min_hits=1'),
  });

  const trending = data?.trending || [];

  return (
    <div>
      <Card title="Трендовые темы" style={{ marginBottom: 16 }}>
        {isLoading ? <Text type="secondary">Загрузка...</Text> : trending.length === 0 ? (
          <Empty description="Нет трендовых тем" />
        ) : (
          <List
            dataSource={trending}
            renderItem={(item: TrendingTopic, index: number) => (
              <List.Item>
                <List.Item.Meta
                  title={<Space><Badge count={index + 1} style={{ backgroundColor: '#2563eb' }} /><Text strong>{item.keyword}</Text></Space>}
                  description={<Space>{item.sources?.map((s, i) => <Tag key={i}>{s}</Tag>)}</Space>}
                />
                <Statistic title="Упоминаний" value={item.hits} />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

// ── Email Drafts Panel ──────────────────────────────

function EmailDraftsPanel() {
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ['email-drafts'],
    queryFn: () => api.get<EmailDraft[]>('/book/email/drafts'),
  });

  const { data: stats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: () => api.get<EmailStats>('/book/email/stats'),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/book/email/draft/auto'),
    onSuccess: () => { message.success('Черновик создан'); queryClient.invalidateQueries({ queryKey: ['email-drafts'] }); },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/email/drafts/${id}/approve`),
    onSuccess: () => { message.success('Черновик одобрен'); queryClient.invalidateQueries({ queryKey: ['email-drafts'] }); },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/email/drafts/${id}/send`),
    onSuccess: () => { message.success('Письмо отправлено'); queryClient.invalidateQueries({ queryKey: ['email-drafts'] }); },
  });

  const columns = [
    { title: 'Тема', dataIndex: 'subject', key: 'subject' },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (v: string) => (
      <Tag color={v === 'sent' ? 'green' : v === 'approved' ? 'blue' : 'orange'}>{v}</Tag>
    )},
    { title: 'Создан', dataIndex: 'created_at', key: 'created', render: (v: string) => v ? new Date(v).toLocaleString('ru') : '—' },
    { title: 'Действия', key: 'actions', render: (_: any, record: EmailDraft) => (
      <Space>
        {record.status === 'draft' && <Button size="small" onClick={() => approveMutation.mutate(record.id)}>Одобрить</Button>}
        {record.status === 'approved' && <Button size="small" type="primary" onClick={() => sendMutation.mutate(record.id)}>Отправить</Button>}
        <Button size="small" onClick={() => setSelectedDraft(record)}>Просмотр</Button>
      </Space>
    )},
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="Подписчиков" value={stats?.subscribers ?? 0} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Отправлено" value={stats?.sent ?? 0} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Ошибок" value={stats?.errors ?? 0} valueStyle={{ color: stats?.errors ? '#dc2626' : undefined }} /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<MailOutlined />} onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
          Создать черновик
        </Button>
      </Space>

      <Table columns={columns} dataSource={drafts || []} rowKey="id" loading={isLoading} size="small" />

      <Modal title="Просмотр черновика" open={!!selectedDraft} onCancel={() => setSelectedDraft(null)} footer={null} width={600}>
        {selectedDraft && (
          <div>
            <Text strong>Тема: </Text><Text>{selectedDraft.subject}</Text>
            <br />
            <Text strong>Статус: </Text><Tag>{selectedDraft.status}</Tag>
            <br />
            <Text strong>Создан: </Text><Text>{selectedDraft.created_at ? new Date(selectedDraft.created_at).toLocaleString('ru') : '—'}</Text>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Subscribers Panel ──────────────────────────────

function SubscribersPanel() {
  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['subscribers'],
    queryFn: () => api.get<Array<{ email: string; name?: string; subscribed_at: string }>>('/book/email/subscribers'),
  });

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Имя', dataIndex: 'name', key: 'name', render: (v: string) => v || '—' },
    { title: 'Дата подписки', dataIndex: 'subscribed_at', key: 'date', render: (v: string) => v ? new Date(v).toLocaleString('ru') : '—' },
  ];

  return (
    <Table columns={columns} dataSource={subscribers || []} rowKey="email" loading={isLoading} size="small" pagination={{ pageSize: 20 }} />
  );
}

// ── Main Page ──────────────────────────────────

function NotificationsContent() {
  const items = [
    { key: 'suggestions', label: <><BulbOutlined /> Предложения</>, children: <SuggestionsPanel /> },
    { key: 'trending', label: 'Тренды', children: <TrendingPanel /> },
    { key: 'email', label: <><MailOutlined /> Email</>, children: <EmailDraftsPanel /> },
    { key: 'subscribers', label: <><TeamOutlined /> Подписчики</>, children: <SubscribersPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><BellOutlined /> Уведомления</Title>
      <Paragraph type="secondary">Предложения Presence, трендовые темы, email-рассылки</Paragraph>
      <Tabs items={items} />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
