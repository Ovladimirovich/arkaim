'use client';

import { Tabs, Card, Typography } from 'antd';
import { UserOutlined, KeyOutlined, LinkOutlined, TeamOutlined, BarChartOutlined, SettingOutlined, DashboardOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';
import { UsersPanel } from '@/widgets/admin-panel/users-panel';
import { InvitesPanel } from '@/widgets/admin-panel/invites-panel';
import { SessionsPanel } from '@/widgets/admin-panel/sessions-panel';
import { ApiKeysPanel } from '@/widgets/admin-panel/api-keys-panel';
import { StatsPanel } from '@/widgets/admin-panel/stats-panel';
import { DashboardPanel } from '@/widgets/admin-panel/dashboard-panel';
import { ModerationPanel } from '@/widgets/admin-panel/moderation-panel';

const { Title, Paragraph } = Typography;

function AdminContent() {
  const items = [
    { key: 'dashboard', label: <><DashboardOutlined /> Дашборд</>, children: <DashboardPanel /> },
    { key: 'moderation', label: <><CheckCircleOutlined /> Модерация</>, children: <ModerationPanel /> },
    { key: 'users', label: <><UserOutlined /> Пользователи</>, children: <UsersPanel /> },
    { key: 'invites', label: <><LinkOutlined /> Инвайты</>, children: <InvitesPanel /> },
    { key: 'sessions', label: <><TeamOutlined /> Сессии</>, children: <SessionsPanel /> },
    { key: 'apikeys', label: <><KeyOutlined /> API-ключи</>, children: <ApiKeysPanel /> },
    { key: 'stats', label: <><BarChartOutlined /> Статистика</>, children: <StatsPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2}><SettingOutlined /> Админ-панель</Title>
      <Paragraph type="secondary">Управление пользователями, системой и мониторинг</Paragraph>
      <Tabs items={items} />
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <RoleGuard roles={['admin']}>
        <AdminContent />
      </RoleGuard>
    </ProtectedRoute>
  );
}
