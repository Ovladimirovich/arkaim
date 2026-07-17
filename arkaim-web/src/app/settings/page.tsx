'use client';

import { useState } from 'react';
import { Card, Typography, Form, Input, Switch, Button, Select, Divider, Space, message, Tabs, List, Tag, Popconfirm, Row, Col, Descriptions, Alert } from 'antd';
import { UserOutlined, BellOutlined, LockOutlined, BgColorsOutlined, DeleteOutlined, KeyOutlined, SaveOutlined, SafetyOutlined, GlobalOutlined, CommentOutlined, LikeOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useAuth, useTheme } from '@/app/providers';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

// ── Account Settings ──────────────────────────────────

function AccountSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const updateMutation = useMutation({
    mutationFn: (values: { display_name: string }) =>
      api.post('/auth/update-profile', values),
    onSuccess: () => {
      message.success('Профиль обновлён');
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });

  return (
    <Card title={<><UserOutlined /> Аккаунт</>}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          username: user?.username || '',
          display_name: user?.display_name || '',
        }}
        onFinish={(values) => updateMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="Имя пользователя" name="username">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Отображаемое имя" name="display_name"
              rules={[{ required: true, message: 'Введите имя' }]}>
              <Input placeholder="Как вас называть?" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Провайдер">
          <Tag icon={<SafetyOutlined />} color="blue">{user?.provider || 'dev'}</Tag>
        </Form.Item>

        <Form.Item label="Роль">
          <Tag color={user?.role === 'admin' ? 'red' : user?.role === 'editor' ? 'blue' : 'green'}>
            {user?.role === 'admin' ? 'Администратор' : user?.role === 'editor' ? 'Редактор' : 'Читатель'}
          </Tag>
        </Form.Item>

        <Form.Item>
          <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={updateMutation.isPending}>
            Сохранить
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ── Appearance Settings ──────────────────────────────

function AppearanceSettings() {
  const { isDark, toggle } = useTheme();
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('settings_font_size') || 'medium';
    }
    return 'medium';
  });

  const handleFontChange = (value: string) => {
    setFontSize(value);
    localStorage.setItem('settings_font_size', value);
    document.documentElement.style.fontSize = value === 'small' ? '13px' : value === 'large' ? '17px' : '16px';
    message.success('Размер шрифта изменён');
  };

  return (
    <Card title={<><BgColorsOutlined /> Внешний вид</>}>
      <Form layout="vertical">
        <Form.Item label="Тёмная тема" extra="Переключает цветовую схему приложения">
          <Switch checked={isDark} onChange={toggle} checkedChildren="Вкл" unCheckedChildren="Выкл" />
        </Form.Item>
        <Form.Item label="Размер шрифта" extra="Размер текста в приложении">
          <Select value={fontSize} onChange={handleFontChange} style={{ width: 200 }}>
            <Select.Option value="small">Маленький</Select.Option>
            <Select.Option value="medium">Средний</Select.Option>
            <Select.Option value="large">Большой</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ── Language Settings ──────────────────────────────

function LanguageSettings() {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('settings_language') || 'ru';
    }
    return 'ru';
  });

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem('settings_language', value);
    message.success('Язык изменён');
  };

  return (
    <Card title={<><GlobalOutlined /> Язык</>}>
      <Form layout="vertical">
        <Form.Item label="Язык интерфейса" extra="Язык отображения текста в приложении">
          <Select value={language} onChange={handleLanguageChange} style={{ width: 200 }}>
            <Select.Option value="ru">Русский</Select.Option>
            <Select.Option value="en">English</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ── Notification Settings ──────────────────────────────

function NotificationSettings() {
  const getSetting = (key: string, defaultValue: boolean) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('settings_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    }
    return defaultValue;
  };

  const [emailEnabled, setEmailEnabled] = useState(() => getSetting('emailEnabled', true));
  const [pushEnabled, setPushEnabled] = useState(() => getSetting('pushEnabled', false));
  const [weeklyDigest, setWeeklyDigest] = useState(() => getSetting('weeklyDigest', true));
  const [chatNotifications, setChatNotifications] = useState(() => getSetting('chatNotifications', true));

  // Community notification settings
  const [commentLiked, setCommentLiked] = useState(() => getSetting('commentLiked', true));
  const [commentAdded, setCommentAdded] = useState(() => getSetting('commentAdded', true));
  const [interpretationApproved, setInterpretationApproved] = useState(() => getSetting('interpretationApproved', true));
  const [interpretationRejected, setInterpretationRejected] = useState(() => getSetting('interpretationRejected', true));
  const [artifactApproved, setArtifactApproved] = useState(() => getSetting('artifactApproved', true));
  const [artifactRejected, setArtifactRejected] = useState(() => getSetting('artifactRejected', true));
  const [moderationQueue, setModerationQueue] = useState(() => getSetting('moderationQueue', true));

  const handleSave = () => {
    localStorage.setItem('settings_notifications', JSON.stringify({
      emailEnabled, pushEnabled, weeklyDigest, chatNotifications,
      commentLiked, commentAdded,
      interpretationApproved, interpretationRejected,
      artifactApproved, artifactRejected,
      moderationQueue,
    }));
    message.success('Настройки уведомлений сохранены');
  };

  return (
    <Card title={<><BellOutlined /> Уведомления</>}>
      <Tabs
        items={[
          {
            key: 'general',
            label: 'Общие',
            children: (
              <Form layout="vertical">
                <Form.Item label="Email-уведомления" extra="Получать уведомления на email">
                  <Switch checked={emailEnabled} onChange={setEmailEnabled} />
                </Form.Item>
                <Form.Item label="Push-уведомления" extra="Получать push-уведомления в приложении">
                  <Switch checked={pushEnabled} onChange={setPushEnabled} />
                </Form.Item>
                <Form.Item label="Уведомления о чате" extra="Уведомления о новых ответах книги">
                  <Switch checked={chatNotifications} onChange={setChatNotifications} />
                </Form.Item>
                <Form.Item label="Еженедельный дайджест" extra="Сводка активности за неделю">
                  <Switch checked={weeklyDigest} onChange={setWeeklyDigest} />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'community',
            label: <><TeamOutlined /> Сообщество</>,
            children: (
              <Form layout="vertical">
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Настройте уведомления о активности в сообществе
                </Paragraph>

                <Divider plain><CommentOutlined /> Комментарии</Divider>
                <Form.Item label="Лайк на комментарий" extra="Когда кто-то поставил лайк вашему комментарию">
                  <Switch checked={commentLiked} onChange={setCommentLiked} />
                </Form.Item>
                <Form.Item label="Новый комментарий" extra="Когда кто-то прокомментировал вашу интерпретацию или артефакт">
                  <Switch checked={commentAdded} onChange={setCommentAdded} />
                </Form.Item>

                <Divider plain><LikeOutlined /> Интерпретации</Divider>
                <Form.Item label="Интерпретация одобрена" extra="Когда ваша интерпретация прошла модерацию">
                  <Switch checked={interpretationApproved} onChange={setInterpretationApproved} />
                </Form.Item>
                <Form.Item label="Интерпретация отклонена" extra="Когда ваша интерпретация не прошла модерацию">
                  <Switch checked={interpretationRejected} onChange={setInterpretationRejected} />
                </Form.Item>

                <Divider plain><TeamOutlined /> Артефакты</Divider>
                <Form.Item label="Артефакт одобрен" extra="Когда ваш артефакт прошёл модерацию">
                  <Switch checked={artifactApproved} onChange={setArtifactApproved} />
                </Form.Item>
                <Form.Item label="Артефакт отклонён" extra="Когда ваш артефакт не прошёл модерацию">
                  <Switch checked={artifactRejected} onChange={setArtifactRejected} />
                </Form.Item>

                <Divider plain><LockOutlined /> Модерация</Divider>
                <Form.Item label="Очередь модерации" extra="Уведомления о новыхATERIAL на модерацию (для модераторов)">
                  <Switch checked={moderationQueue} onChange={setModerationQueue} />
                </Form.Item>
              </Form>
            ),
          },
        ]}
      />
      <Form.Item style={{ marginTop: 16 }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Сохранить</Button>
      </Form.Item>
    </Card>
  );
}

// ── Security Settings ──────────────────────────────

function SecuritySettings() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys } = useQuery({
    queryKey: ['api-keys-settings'],
    queryFn: () => api.get<any[]>('/auth/api-keys'),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<any[]>('/auth/admin/sessions'),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ key: string }>('/auth/api-key'),
    onSuccess: (data) => {
      setNewKey(data.key);
      message.success('API-ключ создан');
      queryClient.invalidateQueries({ queryKey: ['api-keys-settings'] });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => {
      message.success('Ключ удалён');
      queryClient.invalidateQueries({ queryKey: ['api-keys-settings'] });
    },
  });

  return (
    <Card title={<><LockOutlined /> Безопасность</>}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* API Keys */}
        <div>
          <Text strong style={{ fontSize: 14 }}>API-ключи</Text>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            Используйте ключи для программного доступа к API.
          </Paragraph>
          <Button type="primary" icon={<KeyOutlined />} onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            Создать ключ
          </Button>
          {newKey && (
            <Alert
              type="success"
              message={<Text copyable code>{newKey}</Text>}
              description="Сохраните ключ — он показывается только один раз!"
              closable
              onClose={() => setNewKey(null)}
              style={{ marginTop: 12 }}
            />
          )}
          {keys && keys.filter((k: any) => k.is_active).length > 0 && (
            <List
              size="small"
              style={{ marginTop: 12 }}
              dataSource={keys.filter((k: any) => k.is_active)}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Popconfirm key="del" title="Удалить ключ?" onConfirm={() => deleteKeyMutation.mutate(item.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<KeyOutlined style={{ color: '#2563eb' }} />}
                    title={<code style={{ fontSize: 12 }}>{item.key_prefix}...</code>}
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.last_used_at ? `Последнее использование: ${new Date(item.last_used_at).toLocaleString('ru')}` : 'Не использован'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>

        <Divider />

        {/* Sessions */}
        <div>
          <Text strong style={{ fontSize: 14 }}>Активные сессии</Text>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
            Управление устройствами, на которых выполнен вход.
          </Paragraph>
          {sessions && sessions.length > 0 ? (
            <List
              size="small"
              dataSource={sessions.slice(0, 5)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<SafetyOutlined style={{ color: '#52c41a' }} />}
                    title={<Text style={{ fontSize: 13 }}>Сессия {item.id?.slice(0, 8)}...</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Создана: {new Date(item.created_at).toLocaleString('ru')} · Истекает: {new Date(item.expires_at).toLocaleString('ru')}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: 13 }}>Информация о сессиях недоступна</Text>
          )}
        </div>
      </Space>
    </Card>
  );
}

// ── Privacy Settings ──────────────────────────────

function PrivacySettings() {
  const getSetting = (key: string, defaultValue: boolean) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('settings_privacy');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    }
    return defaultValue;
  };

  const [showProfile, setShowProfile] = useState(() => getSetting('showProfile', true));
  const [showHistory, setShowHistory] = useState(() => getSetting('showHistory', true));
  const [showTopics, setShowTopics] = useState(() => getSetting('showTopics', true));
  const [showActivity, setShowActivity] = useState(() => getSetting('showActivity', true));

  const handleSave = () => {
    localStorage.setItem('settings_privacy', JSON.stringify({ showProfile, showHistory, showTopics, showActivity }));
    message.success('Настройки конфиденциальности сохранены');
  };

  return (
    <Card title="Конфиденциальность">
      <Form layout="vertical">
        <Form.Item label="Показывать профиль другим" extra="Другие пользователи смогут видеть ваш профиль">
          <Switch checked={showProfile} onChange={setShowProfile} />
        </Form.Item>
        <Form.Item label="Показывать историю вопросов" extra="История будет видна в профиле">
          <Switch checked={showHistory} onChange={setShowHistory} />
        </Form.Item>
        <Form.Item label="Показывать изученные темы" extra="Темы будут видны в профиле">
          <Switch checked={showTopics} onChange={setShowTopics} />
        </Form.Item>
        <Form.Item label="Показывать активность в сообществе" extra="Ваша активность (лайки, комментарии) будет видна другим">
          <Switch checked={showActivity} onChange={setShowActivity} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Сохранить</Button>
        </Form.Item>
        <Divider />
        <Popconfirm title="Вы уверены? Это действие необратимо." onConfirm={() => message.success('Аккаунт будет удалён')}>
          <Button danger icon={<DeleteOutlined />}>Удалить аккаунт</Button>
        </Popconfirm>
      </Form>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────

function SettingsContent() {
  const items = [
    { key: 'account', label: <><UserOutlined /> Аккаунт</>, children: <AccountSettings /> },
    { key: 'appearance', label: <><BgColorsOutlined /> Внешний вид</>, children: <AppearanceSettings /> },
    { key: 'language', label: <><GlobalOutlined /> Язык</>, children: <LanguageSettings /> },
    { key: 'notifications', label: <><BellOutlined /> Уведомления</>, children: <NotificationSettings /> },
    { key: 'security', label: <><LockOutlined /> Безопасность</>, children: <SecuritySettings /> },
    { key: 'privacy', label: 'Конфиденциальность', children: <PrivacySettings /> },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 16 }}>Настройки</Title>
      <Tabs items={items} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

