'use client';

import { Card, Typography, Row, Col, Statistic, Table, Tag, Spin, Tabs, Select } from 'antd';
import { BugOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';

const { Title, Text } = Typography;

type Trace = {
  trace_id: string;
  name: string;
  status: string;
  duration_ms: number;
  started_at: string;
  ended_at?: string;
};

type XRayStats = {
  active_traces: number;
  completed_traces: number;
  orphan_spans: number;
};

function StatsPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['xray-stats'],
    queryFn: () => api.get<XRayStats>('/xray/stats'),
  });

  if (isLoading) return <Spin />;

  return (
    <Row gutter={[16, 16]}>
      <Col span={8}>
        <Card><Statistic title="Активных трейсов" value={stats?.active_traces ?? 0} prefix={<ReloadOutlined />} /></Card>
      </Col>
      <Col span={8}>
        <Card><Statistic title="Завершённых" value={stats?.completed_traces ?? 0} prefix={<ClockCircleOutlined />} /></Card>
      </Col>
      <Col span={8}>
        <Card><Statistic title="Сиротских спанов" value={stats?.orphan_spans ?? 0} prefix={<BugOutlined />} /></Card>
      </Col>
    </Row>
  );
}

function TracesPanel() {
  const { data: traces, isLoading } = useQuery({
    queryKey: ['xray-traces'],
    queryFn: () => api.get<Trace[]>('/xray/traces?limit=50'),
  });

  const columns = [
    {
      title: 'ID', dataIndex: 'trace_id', key: 'id',
      render: (v: string) => <code style={{ fontSize: 11 }}>{v.slice(0, 12)}...</code>,
    },
    { title: 'Имя', dataIndex: 'name', key: 'name' },
    {
      title: 'Статус', dataIndex: 'status', key: 'status',
      render: (v: string) => (
        <Tag color={v === 'ok' ? 'green' : v === 'error' ? 'red' : 'blue'}>{v}</Tag>
      ),
    },
    {
      title: 'Длительность', dataIndex: 'duration_ms', key: 'duration',
      render: (v: number) => v ? `${Math.round(v)}ms` : '—',
    },
    {
      title: 'Начало', dataIndex: 'started_at', key: 'started',
      render: (v: string) => v ? new Date(v).toLocaleString('ru') : '—',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={traces || []}
      rowKey="trace_id"
      loading={isLoading}
      size="small"
      pagination={{ pageSize: 20 }}
    />
  );
}

function DiagnosticsPanel() {
  const { data: diag, isLoading } = useQuery({
    queryKey: ['xray-diagnostics'],
    queryFn: () => api.get<Record<string, any>>('/xray/diagnostics'),
  });

  if (isLoading) return <Spin />;

  return (
    <Card>
      <Text strong>Диагностика системы</Text>
      <div style={{ marginTop: 12 }}>
        {diag && Object.entries(diag).map(([key, value]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <Text>{key}</Text>
            <Text type="secondary">{String(value)}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function XRayContent() {
  const items = [
    { key: 'stats', label: <><ReloadOutlined /> Статистика</>, children: <StatsPanel /> },
    { key: 'traces', label: <><BugOutlined /> Трейсы</>, children: <TracesPanel /> },
    { key: 'diagnostics', label: 'Диагностика', children: <DiagnosticsPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><BugOutlined /> X-Ray Observability</Title>
      <Tabs items={items} />
    </div>
  );
}

export default function XRayPage() {
  return (
    <ProtectedRoute>
      <RoleGuard roles={['admin']}>
        <XRayContent />
      </RoleGuard>
    </ProtectedRoute>
  );
}
