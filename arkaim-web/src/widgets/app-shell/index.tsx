'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, Space, Spin, Typography, Badge, Tooltip } from 'antd';
import {
  BookOutlined,
  ReadOutlined,
  EditOutlined,
  UserOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
  UploadOutlined,
  PictureOutlined,
  EyeOutlined,
  TagsOutlined,
  TrophyOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  BulbOutlined,
  LogoutOutlined,
  CodeOutlined,
  DollarOutlined,
  RiseOutlined,
  BellOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useTheme } from '@/app/providers';
import { useWsContext } from '@/shared/lib/ws-hooks';

const { Sider, Content } = Layout;
const { Text } = Typography;

const NAV_GROUPS = [
  {
    label: 'Книга',
    items: [
      { key: '/ask', icon: <QuestionCircleOutlined />, label: 'Задать вопрос' },
      { key: '/book', icon: <BookOutlined />, label: 'Чат с книгой' },
      { key: '/reading', icon: <FileTextOutlined />, label: 'Чтение' },
      { key: '/screenplay', icon: <VideoCameraOutlined />, label: 'Сценарий' },
      { key: '/library', icon: <ReadOutlined />, label: 'Библиотека' },
      { key: '/genres', icon: <TagsOutlined />, label: 'Жанры' },
      { key: '/visual-view', icon: <EyeOutlined />, label: 'Визуал' },
      { key: '/about', icon: <BookOutlined />, label: 'О книге' },
      { key: '/search', icon: <SearchOutlined />, label: 'Поиск' },
    ],
  },
  {
    label: 'Читатель',
    items: [
      { key: '/profile', icon: <UserOutlined />, label: 'Профиль' },
      { key: '/recommendations', icon: <TrophyOutlined />, label: 'Рекомендации' },
      { key: '/history', icon: <HistoryOutlined />, label: 'История' },
      { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
    ],
  },
  {
    label: 'Сообщество',
    items: [
      { key: '/crowdfunding', icon: <DollarOutlined />, label: 'Краудфандинг' },
      { key: '/notifications', icon: <BellOutlined />, label: 'Уведомления' },
      { key: '/analytics', icon: <RiseOutlined />, label: 'Аналитика' },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { key: '/api', icon: <CodeOutlined />, label: 'API' },
      { key: '/editor', icon: <EditOutlined />, label: 'Редактор', roles: ['editor', 'admin'] },
      { key: '/upload', icon: <UploadOutlined />, label: 'Загрузка', roles: ['editor', 'admin'] },
      { key: '/visual', icon: <PictureOutlined />, label: 'Визуалы', roles: ['editor', 'admin'] },
    ],
  },
  {
    label: 'Админ',
    items: [
      { key: '/admin', icon: <SettingOutlined />, label: 'Админ-панель', roles: ['admin'] },
      { key: '/xray', icon: <RiseOutlined />, label: 'X-Ray', roles: ['admin'] },
    ],
  },
  {
    label: 'Справка',
    items: [
      { key: '/help', icon: <InfoCircleOutlined />, label: 'Инструкции' },
    ],
  },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { connected, lastEvent } = useWsContext();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!lastEvent) return;
    if (['new_suggestion', 'your_question_answered', 'crowdfunding_milestone'].includes(lastEvent.event)) {
      setNotificationCount(prev => prev + 1);
    }
  }, [lastEvent]);

  const clearNotifications = useCallback(() => setNotificationCount(0), []);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </Layout>
    );
  }

  const selectedKey = '/' + (pathname.split('/')[1] || 'book');

  // Фильтруем группы по ролям
  const filteredGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !(item as any).roles || (item as any).roles.includes(user?.role || '')
      ),
    }))
    .filter(group => group.items.length > 0);

  // Развернутые пункты меню
  const menuItems = filteredGroups.flatMap(group => [
    { type: 'group' as const, label: group.label, children: group.items },
  ]);

  // Mobile: полная навигация в Drawer через CSS
  const sidebarWidth = collapsed ? 60 : 220;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        width={220}
        collapsedWidth={60}
        style={{
          background: isDark ? '#141414' : '#001529',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
        trigger={null}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Link href="/book" style={{ color: '#fff', fontWeight: 700, fontSize: collapsed ? '1.2rem' : '1rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {collapsed ? '𓃉' : 'Наследие Аркаима'}
          </Link>
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 0 }}
          onClick={({ key }) => router.push(key)}
        />

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 0',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <Tooltip title={isDark ? 'Светлая тема' : 'Тёмная тема'} placement="right">
            <Button type="text" icon={<BulbOutlined />} onClick={toggle} style={{ color: '#fff' }} />
          </Tooltip>
          {user && (
            <Tooltip title="Выйти" placement="right">
              <Button type="text" icon={<LogoutOutlined />} onClick={logout} style={{ color: '#94a3b8' }} />
            </Tooltip>
          )}
        </div>
      </Sider>

      {/* Main content */}
      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s' }}>
        {/* Top bar */}
        <div style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: isDark ? '#1f1f1f' : '#fff',
          borderBottom: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </Space>
          <Space>
            {connected && (
              <Tooltip title="WebSocket подключён">
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#52c41a' }} />
              </Tooltip>
            )}
            <Badge count={notificationCount} size="small" offset={[-2, 2]}>
              <Button
                type="text"
                icon={<BellOutlined />}
                onClick={clearNotifications}
              />
            </Badge>
            {user && (
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: '.85rem' }}>
                  {user.display_name || user.username}
                </Text>
                <Text type="secondary" style={{ fontSize: '.75rem' }}>
                  ({user.role})
                </Text>
              </Space>
            )}
          </Space>
        </div>

        {/* Page content */}
        <Content style={{ padding: '1.5rem', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
