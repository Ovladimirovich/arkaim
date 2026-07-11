'use client';

import { useState } from 'react';
import { Card, Typography, Progress, Row, Col, Tag, Statistic, Spin, Empty, Button, Space, Divider, Timeline, Tabs, Table, Modal, Form, Input, InputNumber, message } from 'antd';
import { HeartOutlined, ClockCircleOutlined, UserOutlined, TrophyOutlined, LinkOutlined, ReloadOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

type Milestone = {
  id: string;
  title: string;
  target_amount: number;
  reached: boolean;
};

type Campaign = {
  id: string;
  title: string;
  platform: string;
  url: string;
  target_amount: number;
  current_amount: number;
  backers_count: number;
  days_left: number;
  milestones: Milestone[];
};

type CampaignHistory = {
  campaign_id: string;
  snapshots: Array<{
    current_amount: number;
    backers_count: number;
    checked_at: string;
  }>;
  total: number;
};

// ── Hero Section ──────────────────────────────────

function HeroSection() {
  const { data } = useQuery({
    queryKey: ['crowdfunding'],
    queryFn: () => api.get<{ campaigns: Campaign[] }>('/book/crowdfunding/status'),
  });

  const campaigns = data?.campaigns || [];
  const totalRaised = campaigns.reduce((sum, c) => sum + c.current_amount, 0);
  const totalTarget = campaigns.reduce((sum, c) => sum + c.target_amount, 0);
  const totalBackers = campaigns.reduce((sum, c) => sum + c.backers_count, 0);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: 16,
      padding: '3rem 2rem',
      color: '#fff',
      marginBottom: 32,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>𓃉</div>
      <Title level={1} style={{ color: '#fff', marginBottom: 8 }}>
        Поддержите «Наследие Аркаима»
      </Title>
      <Paragraph style={{ color: '#94a3b8', fontSize: 16, maxWidth: 600, margin: '0 auto 24px' }}>
        Помогите выпустить книгу и создать цифровое сознание, которое будет жить вечно.
      </Paragraph>
      <Row gutter={[32, 16]} justify="center">
        <Col><Statistic title="Цель" value={totalTarget.toLocaleString('ru')} suffix="₽" valueStyle={{ color: '#fff' }} /></Col>
        <Col><Statistic title="Собрано" value={totalRaised.toLocaleString('ru')} suffix="₽" valueStyle={{ color: '#3b82f6' }} /></Col>
        <Col><Statistic title="Бэкеров" value={totalBackers} valueStyle={{ color: '#fff' }} /></Col>
      </Row>
    </div>
  );
}

// ── Campaign Card ──────────────────────────────────

function CampaignCard({ campaign, onHistory }: { campaign: Campaign; onHistory: (id: string) => void }) {
  const percent = campaign.target_amount > 0
    ? Math.round((campaign.current_amount / campaign.target_amount) * 100) : 0;
  const isUrgent = campaign.days_left <= 7 && campaign.days_left > 0;
  const isFinished = campaign.days_left <= 0;
  const isComplete = percent >= 100;
  const reachedMilestones = campaign.milestones?.filter(m => m.reached).length || 0;
  const totalMilestones = campaign.milestones?.length || 0;

  return (
    <Card hoverable style={{ height: '100%' }}
      title={<Space><span>{campaign.title}</span><Tag color={campaign.platform === 'planeta' ? 'blue' : 'green'}>{campaign.platform}</Tag>{isUrgent && <Tag color="red">Осталось {campaign.days_left} дн.</Tag>}{isFinished && <Tag>Завершена</Tag>}</Space>}
      extra={campaign.url ? <a href={campaign.url} target="_blank" rel="noopener noreferrer"><LinkOutlined /> Открыть</a> : null}
      actions={[
        <a key="history" onClick={() => onHistory(campaign.id)}><HistoryOutlined /> История</a>,
        campaign.url && !isFinished ? <a key="support" href={campaign.url} target="_blank" rel="noopener noreferrer"><HeartOutlined /> Поддержать</a> : null,
      ].filter(Boolean)}
    >
      <Progress percent={percent} status={isComplete ? 'success' : isFinished ? 'exception' : 'active'} strokeColor={isComplete ? '#52c41a' : '#1890ff'} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{campaign.current_amount.toLocaleString('ru')} ₽</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{campaign.target_amount.toLocaleString('ru')} ₽ ({percent}%)</Text>
      </div>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}><Statistic title="Собрано" value={campaign.current_amount} suffix="₽" valueStyle={{ fontSize: 16 }} /></Col>
        <Col span={8}><Statistic title="Бэкеров" value={campaign.backers_count} prefix={<UserOutlined />} valueStyle={{ fontSize: 16 }} /></Col>
        <Col span={8}><Statistic title="Осталось" value={campaign.days_left} suffix="дн." prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 16, color: isUrgent ? '#ef4444' : undefined }} /></Col>
      </Row>
      {totalMilestones > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Space><TrophyOutlined /><Text strong>Майлстоуны</Text><Tag>{reachedMilestones}/{totalMilestones}</Tag></Space>
          <Timeline style={{ marginTop: 8 }} items={campaign.milestones.map(m => ({
            color: m.reached ? 'green' : 'gray',
            children: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ textDecoration: m.reached ? 'line-through' : undefined }}>{m.title}</Text>
              <Tag color={m.reached ? 'green' : 'default'}>{m.reached ? 'Достигнут' : `${m.target_amount.toLocaleString('ru')} ₽`}</Tag>
            </div>,
          }))} />
        </>
      )}
    </Card>
  );
}

// ── Campaign History Modal ──────────────────────────

function CampaignHistoryModal({ campaignId, open, onClose }: { campaignId: string; open: boolean; onClose: () => void }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['crowdfunding-history', campaignId],
    queryFn: () => api.get<CampaignHistory>(`/book/crowdfunding/campaign/${campaignId}/history?limit=20`),
    enabled: open,
  });

  const columns = [
    { title: 'Дата', dataIndex: 'checked_at', key: 'date', render: (v: string) => new Date(v).toLocaleString('ru') },
    { title: 'Собрано', dataIndex: 'current_amount', key: 'amount', render: (v: number) => `${v.toLocaleString('ru')} ₽` },
    { title: 'Бэкеров', dataIndex: 'backers_count', key: 'backers' },
  ];

  return (
    <Modal title="История кампании" open={open} onCancel={onClose} footer={null} width={600}>
      {isLoading ? <Spin /> : (
        <Table columns={columns} dataSource={history?.snapshots || []} rowKey="checked_at" size="small" pagination={{ pageSize: 10 }} />
      )}
    </Modal>
  );
}

// ── Admin Config Panel ──────────────────────────────

function CrowdfundingAdminPanel() {
  const queryClient = useQueryClient();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: config } = useQuery({
    queryKey: ['crowdfunding-config'],
    queryFn: () => api.get<{ enabled: boolean; check_interval: number; campaigns: any[] }>('/book/crowdfunding/config'),
  });

  const checkNowMutation = useMutation({
    mutationFn: () => api.post('/book/crowdfunding/check-now'),
    onSuccess: () => {
      message.success('Проверка запущена');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding'] });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/crowdfunding/config', values),
    onSuccess: () => {
      message.success('Конфигурация обновлена');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-config'] });
      setConfigModalOpen(false);
    },
  });

  return (
    <Card title="Управление" style={{ marginBottom: 24 }}>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={() => checkNowMutation.mutate()} loading={checkNowMutation.isPending}>
          Проверить сейчас
        </Button>
        <Button icon={<SettingOutlined />} onClick={() => { form.setFieldsValue(config || {}); setConfigModalOpen(true); }}>
          Настройки
        </Button>
      </Space>

      <Modal title="Настройки краудфандинга" open={configModalOpen} onCancel={() => setConfigModalOpen(false)}
        onOk={() => form.validateFields().then(v => updateConfigMutation.mutate(v))} confirmLoading={updateConfigMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="enabled" label="Включено" valuePropName="checked">
            <input type="checkbox" />
          </Form.Item>
          <Form.Item name="check_interval" label="Интервал проверки (сек)">
            <InputNumber min={60} max={86400} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ── Main Content ──────────────────────────────────

function CrowdfundingContent() {
  const [historyCampaignId, setHistoryCampaignId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crowdfunding'],
    queryFn: () => api.get<{ campaigns: Campaign[] }>('/book/crowdfunding/status'),
  });

  const campaigns = data?.campaigns || [];
  const totalRaised = campaigns.reduce((sum, c) => sum + c.current_amount, 0);
  const totalTarget = campaigns.reduce((sum, c) => sum + c.target_amount, 0);
  const totalBackers = campaigns.reduce((sum, c) => sum + c.backers_count, 0);

  const items = [
    {
      key: 'campaigns',
      label: 'Кампании',
      children: (
        <>
          <HeroSection />
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={[24, 16]} justify="center">
              <Col span={6}><Statistic title="Кампаний" value={campaigns.length} /></Col>
              <Col span={6}><Statistic title="Всего собрано" value={totalRaised.toLocaleString('ru')} suffix="₽" /></Col>
              <Col span={6}><Statistic title="Общая цель" value={totalTarget.toLocaleString('ru')} suffix="₽" /></Col>
              <Col span={6}><Statistic title="Всего бэкеров" value={totalBackers} prefix={<UserOutlined />} /></Col>
            </Row>
          </Card>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
          ) : campaigns.length === 0 ? (
            <Empty description="Нет активных кампаний" style={{ padding: 48 }} />
          ) : (
            <Row gutter={[16, 16]}>
              {campaigns.map(c => <Col xs={24} lg={12} key={c.id}><CampaignCard campaign={c} onHistory={setHistoryCampaignId} /></Col>)}
            </Row>
          )}
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
            <Text type="secondary">Каждый рубль помогает создать цифровое сознание книги</Text>
          </div>
        </>
      ),
    },
    {
      key: 'admin',
      label: 'Управление',
      children: <CrowdfundingAdminPanel />,
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Tabs items={items} />
      <CampaignHistoryModal campaignId={historyCampaignId || ''} open={!!historyCampaignId} onClose={() => setHistoryCampaignId(null)} />
    </div>
  );
}

export default function CrowdfundingPage() {
  return (
    <ProtectedRoute>
      <CrowdfundingContent />
    </ProtectedRoute>
  );
}
