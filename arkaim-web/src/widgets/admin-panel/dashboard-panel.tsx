'use client';

import { Card, Row, Col, Statistic, Typography, List, Tag, Space, Progress, Spin, Button } from 'antd';
import { UserOutlined, KeyOutlined, TeamOutlined, LinkOutlined, ReloadOutlined, HeartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

const { Title, Text } = Typography;

type AdminStats = {
  users: { total: number; by_role: Record<string, number> };
  presence: { trending_topics: number; pending_suggestions: number };
  email: Record<string, unknown>;
};

type AnalyticsData = {
  total_requests: number;
  avg_response_time_ms: number;
  error_rate: number;
};

type Suggestion = {
  id: string;
  topic: string;
  reason?: string;
  status: string;
};

export function DashboardPanel() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/auth/admin/stats'),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<AnalyticsData>('/analytics'),
  });

  const { data: sessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => api.get<any[]>('/auth/admin/sessions'),
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: () => api.get<any[]>('/auth/admin/api-keys'),
  });

  const { data: invites } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.get<any[]>('/auth/admin/invites'),
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.get<{ suggestions: Suggestion[] }>('/book/presence/suggestions'),
  });

  if (statsLoading) return <Spin size="large" />;

  const activeInvites = invites?.filter((i: any) => i.is_active && i.use_count < i.max_uses).length || 0;
  const pendingSuggestions = suggestions?.suggestions?.filter((s: Suggestion) => s.status === 'pending').length || 0;

  return (
    <div>
      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Пользователей" value={stats?.users?.total ?? 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Активных сессий" value={sessions?.length ?? 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="API-ключей" value={apiKeys?.filter((k: any) => k.is_active).length ?? 0} prefix={<KeyOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Инвайтов" value={activeInvites} prefix={<LinkOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Analytics Summary */}
      {analytics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic title="Всего запросов" value={analytics.total_requests} />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic title="Среднее время" value={Math.round(analytics.avg_response_time_ms)} suffix="ms" />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small">
              <Statistic
                title="Ошибка"
                value={analytics.error_rate}
                suffix="%"
                valueStyle={{ color: analytics.error_rate > 5 ? '#ef4444' : '#16a34a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* User Roles */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Роли пользователей" size="small">
            {stats?.users?.by_role && Object.entries(stats.users.by_role).map(([role, count]) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <Tag color={role === 'admin' ? 'red' : role === 'editor' ? 'blue' : 'green'}>{role}</Tag>
                <Text>{count} чел.</Text>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Последние инвайты" size="small">
            {invites && invites.length > 0 ? (
              <List
                size="small"
                dataSource={invites.slice(0, 5)}
                renderItem={(item: any) => (
                  <List.Item>
                    <Space>
                      <Tag color={item.is_active ? 'green' : 'default'}>{item.role}</Tag>
                      <Text>{item.note || 'Без заметки'}</Text>
                      <Text type="secondary">{item.use_count}/{item.max_uses}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">Нет инвайтов</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Suggestions */}
      {pendingSuggestions > 0 && (
        <Card title={<Space><HeartOutlined /> Предложения ({pendingSuggestions})</Space>} size="small" style={{ marginBottom: 24 }}>
          <List
            size="small"
            dataSource={suggestions?.suggestions?.filter((s: Suggestion) => s.status === 'pending').slice(0, 5) || []}
            renderItem={(item: Suggestion) => (
              <List.Item>
                <List.Item.Meta
                  title={item.topic}
                  description={item.reason}
                />
                <Tag color="orange">pending</Tag>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
