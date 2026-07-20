'use client';


// ── Simple Chart Components ──────────────────────────

function BarChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '20px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', height: `${(d.value / maxValue) * (height - 40)}px`, background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)', borderRadius: '4px 4px 0 0' }} />
          <span style={{ fontSize: 10, marginTop: 4 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}


import { Card, Typography, Row, Col, Statistic, Spin, Table, Tag, Progress, Divider, Space } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, RiseOutlined, DatabaseOutlined, ApiOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

// ── Types ──────────────────────────────────────────

type AnalyticsData = {
  total_requests: number;
  requests_by_type: Record<string, number>;
  requests_by_hour: Record<string, number>;
  avg_response_time_ms: number;
  error_rate: number;
};

type GraphStats = {
  nodes: number;
  edges: number;
  node_types: Record<string, number>;
  relationship_types: Record<string, number>;
};

type AdminStats = {
  users: { total: number; by_role: Record<string, number> };
  presence: { trending_topics: number; pending_suggestions: number };
  email: Record<string, unknown>;
};

// ── Request Analytics Panel ──────────────────────────

function RequestAnalyticsPanel({ data }: { data: AnalyticsData }) {
  const topTypes = Object.entries(data.requests_by_type || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topHours = Object.entries(data.requests_by_hour || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="Запросы по типу" size="small">
          {topTypes.length > 0 ? (
            <Table
              dataSource={topTypes.map(([type, count]) => ({ type, count, percent: data.total_requests > 0 ? Math.round(count / data.total_requests * 100) : 0 }))}
              rowKey="type"
              size="small"
              pagination={false}
              columns={[
                { title: 'Тип', dataIndex: 'type', key: 'type' },
                { title: 'Количество', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => a.count - b.count },
                { title: '%', dataIndex: 'percent', key: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
              ]}
            />
          ) : (
            <Text type="secondary">Нет данных</Text>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Запросы по часам" size="small">
          {topHours.length > 0 ? (
            <Table
              dataSource={topHours.map(([hour, count]) => ({ hour: `${hour}:00`, count }))}
              rowKey="hour"
              size="small"
              pagination={false}
              columns={[
                { title: 'Час', dataIndex: 'hour', key: 'hour' },
                { title: 'Количество', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => a.count - b.count },
              ]}
            />
          ) : (
            <Text type="secondary">Нет данных</Text>
          )}
        </Card>
      </Col>
    </Row>
  );
}

// ── Knowledge Graph Panel ──────────────────────────

function GraphStatsPanel({ data }: { data: GraphStats }) {
  const nodeTypes = Object.entries(data.node_types || {}).map(([type, count]) => ({ type, count }));
  const relTypes = Object.entries(data.relationship_types || {}).map(([type, count]) => ({ type, count }));

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card size="small">
          <Statistic title="Узлов" value={data.nodes} prefix={<DatabaseOutlined />} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card size="small">
          <Statistic title="Связей" value={data.edges} prefix={<ApiOutlined />} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card size="small">
          <Statistic title="Типов узлов" value={Object.keys(data.node_types || {}).length} />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Типы узлов" size="small">
          <Table
            dataSource={nodeTypes}
            rowKey="type"
            size="small"
            pagination={false}
            columns={[
              { title: 'Тип', dataIndex: 'type', key: 'type' },
              { title: 'Количество', dataIndex: 'count', key: 'count' },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Типы связей" size="small">
          <Table
            dataSource={relTypes}
            rowKey="type"
            size="small"
            pagination={false}
            columns={[
              { title: 'Тип', dataIndex: 'type', key: 'type' },
              { title: 'Количество', dataIndex: 'count', key: 'count' },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}

// ── System Stats Panel ──────────────────────────

function SystemStatsPanel({ analytics, adminStats }: { analytics: AnalyticsData; adminStats?: AdminStats }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} lg={6}>
        <Card size="small">
          <Statistic title="Всего запросов" value={analytics.total_requests} prefix={<BarChartOutlined />} />
        </Card>
      </Col>
      <Col xs={12} lg={6}>
        <Card size="small">
          <Statistic
            title="Среднее время"
            value={Math.round(analytics.avg_response_time_ms)}
            suffix="ms"
            prefix={<LineChartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} lg={6}>
        <Card size="small">
          <Statistic
            title="Ошибка"
            value={analytics.error_rate}
            suffix="%"
            valueStyle={{ color: analytics.error_rate > 5 ? '#ef4444' : '#16a34a' }}
          />
        </Card>
      </Col>
      <Col xs={12} lg={6}>
        <Card size="small">
          <Statistic title="Пользователей" value={adminStats?.users?.total ?? 0} />
        </Card>
      </Col>
    </Row>
  );
}

// ── Main Content ──────────────────────────────────

function AnalyticsContent() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<AnalyticsData>('/analytics'),
  });

  const { data: graphStats, isLoading: graphLoading } = useQuery({
    queryKey: ['graph-stats'],
    queryFn: () => api.get<GraphStats>('/book/graph/stats'),
  });

  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<AdminStats>('/auth/admin/stats'),
  });

  if (analyticsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}><Text type="secondary">Загрузка аналитики...</Text></div>
      </div>
    );
  }

  if (!analytics) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Text type="secondary">Данные аналитики недоступны</Text></div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><RiseOutlined /> Аналитика</Title>
      <Paragraph type="secondary">Статистика использования системы и знаний</Paragraph>

      {/* System Stats */}
      <SystemStatsPanel analytics={analytics} adminStats={adminStats} />

      <Divider />

      {/* Request Analytics */}
      <Title level={4}>Запросы</Title>
      <RequestAnalyticsPanel data={analytics} />

      <Divider />

      {/* Knowledge Graph */}
      <Title level={4}>Граф знаний</Title>
      {graphLoading ? <Spin /> : graphStats ? <GraphStatsPanel data={graphStats} /> : <Text type="secondary">Нет данных</Text>}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
