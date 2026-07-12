'use client';

import { Card, Row, Col, Statistic, Spin } from 'antd';
import { UserOutlined, TeamOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

type AdminStats = {
  users: { total: number; by_role: Record<string, number> };
  presence: { trending_topics: number; pending_suggestions: number };
};

export function StatsPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/auth/admin/stats'),
  });

  const { data: sessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => api.get<any[]>('/auth/admin/sessions'),
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: () => api.get<any[]>('/auth/admin/api-keys'),
  });

  if (isLoading) return <Spin />;

  return (
    <Row gutter={[16, 16]}>
      <Col span={6}>
        <Card><Statistic title="Пользователей" value={stats?.users?.total ?? 0} prefix={<UserOutlined />} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Читателей" value={stats?.users?.by_role?.reader ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Редакторов" value={stats?.users?.by_role?.editor ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Админов" value={stats?.users?.by_role?.admin ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Активных сессий" value={(sessions ?? []).length} prefix={<TeamOutlined />} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="API-ключей" value={(apiKeys ?? []).filter((k: any) => k.is_active).length} prefix={<KeyOutlined />} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Трендовых тем" value={stats?.presence?.trending_topics ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="Предложений" value={stats?.presence?.pending_suggestions ?? 0} prefix={<LinkOutlined />} /></Card>
      </Col>
    </Row>
  );
}
