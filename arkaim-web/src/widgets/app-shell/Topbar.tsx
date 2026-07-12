'use client';

import { Button, Space, Typography, Badge, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, BulbOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth, useTheme } from '@/app/providers';
import { useWsContext } from '@/shared/lib/ws-hooks';
import { useState, useEffect, useCallback } from 'react';

const { Text } = Typography;

type TopbarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function Topbar({ collapsed, onToggleCollapse }: TopbarProps) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { connected, lastEvent } = useWsContext();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!lastEvent) return;
    if (['new_suggestion', 'your_question_answered', 'crowdfunding_milestone'].includes(lastEvent.event)) {
      setNotificationCount(prev => prev + 1);
    }
  }, [lastEvent]);

  const clearNotifications = useCallback(() => setNotificationCount(0), []);

  return (
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
          onClick={onToggleCollapse}
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
        <Tooltip title={isDark ? 'Светлая тема' : 'Тёмная тема'}>
          <Button type="text" icon={<BulbOutlined />} onClick={toggle} />
        </Tooltip>
        {user && (
          <>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: '.85rem' }}>
                {user.display_name || user.username}
              </Text>
              <Text type="secondary" style={{ fontSize: '.75rem' }}>
                ({user.role})
              </Text>
            </Space>
            <Tooltip title="Выйти">
              <Button type="text" icon={<LogoutOutlined />} onClick={logout} />
            </Tooltip>
          </>
        )}
      </Space>
    </div>
  );
}
