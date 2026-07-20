'use client';


// ── Progress Charts ──────────────────────────
function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1890ff" strokeWidth={8} strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{percent}%</div>
    </div>
  );
}


import { useState } from 'react';
import { Card, Typography, List, Tag, Input, Button, Space, Form, message, Row, Col, Statistic, Progress, Avatar, Empty, Descriptions, Popconfirm, Timeline, Tabs, Switch } from 'antd';
import { UserOutlined, KeyOutlined, MailOutlined, ClockCircleOutlined, BookOutlined, HeartOutlined, TrophyOutlined, DeleteOutlined, SafetyOutlined, MessageOutlined, SearchOutlined, ReadOutlined, SettingOutlined, LinkOutlined, EditOutlined, BulbOutlined, CommentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useAuth } from '@/app/providers';
import { ProtectedRoute } from '@/shared/lib/guards';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

type ReaderProfile = {
  reader_id: string;
  display_name: string;
  questions_total: number;
  conversation_count: number;
  last_topic: string;
  topics: Array<{ name: string; depth: number; questions: number }>;
};

type HistoryItem = { id: number; content: string; created_at: string };
type ApiKeyItem = { id: string; key_prefix: string; name?: string; last_used_at?: string; is_active: boolean; created_at: string };

type Interpretation = {
  id: string;
  reader_name: string;
  text: string;
  themes: string[];
  status: string;
  likes: number;
  created_at: string;
};

type Artifact = {
  id: string;
  reader_name: string;
  title: string;
  category: string;
  status: string;
  likes: number;
  created_at: string;
};

type Comment = {
  id: string;
  parent_type: string;
  text: string;
  likes: number;
  created_at: string;
};

// ── Quick Actions ──────────────────────────────────

function QuickActions() {
  return (
    <Card title="Быстрые действия" size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[8, 8]}>
        <Col xs={12} sm={6}>
          <Link href="/book">
            <Card size="small" hoverable style={{ textAlign: 'center', height: 80 }}>
              <MessageOutlined style={{ fontSize: 20, color: '#2563eb' }} />
              <div><Text style={{ fontSize: 12 }}>Задать вопрос</Text></div>
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={6}>
          <Link href="/recommendations">
            <Card size="small" hoverable style={{ textAlign: 'center', height: 80 }}>
              <TrophyOutlined style={{ fontSize: 20, color: '#d97706' }} />
              <div><Text style={{ fontSize: 12 }}>Рекомендации</Text></div>
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={6}>
          <Link href="/library">
            <Card size="small" hoverable style={{ textAlign: 'center', height: 80 }}>
              <ReadOutlined style={{ fontSize: 20, color: '#059669' }} />
              <div><Text style={{ fontSize: 12 }}>Библиотека</Text></div>
            </Card>
          </Link>
        </Col>
        <Col xs={12} sm={6}>
          <Link href="/interpretations">
            <Card size="small" hoverable style={{ textAlign: 'center', height: 80 }}>
              <BulbOutlined style={{ fontSize: 20, color: '#7c3aed' }} />
              <div><Text style={{ fontSize: 12 }}>Интерпретации</Text></div>
            </Card>
          </Link>
        </Col>
      </Row>
    </Card>
  );
}

// ── User Header ──────────────────────────────────

function UserHeader({ user, profile }: { user: any; profile?: ReaderProfile }) {
  const roleColors: Record<string, string> = { admin: 'red', editor: 'blue', reader: 'green' };
  const roleLabels: Record<string, string> = { admin: 'Администратор', editor: 'Редактор', reader: 'Читатель' };
  const providerLabels: Record<string, string> = { telegram: 'Telegram', email: 'Email', dev: 'Разработчик' };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: roleColors[user?.role] || '#2563eb', fontSize: 32 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <Title level={3} style={{ margin: 0 }}>{user?.display_name || user?.username || 'Пользователь'}</Title>
          <Space style={{ marginTop: 6 }} size={8}>
            <Tag color={roleColors[user?.role] || 'default'}>{roleLabels[user?.role] || user?.role}</Tag>
            <Tag icon={<SafetyOutlined />}>{providerLabels[user?.provider] || user?.provider}</Tag>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              {profile?.questions_total ?? 0} вопросов · {profile?.conversation_count ?? 0} диалогов · {(profile?.topics?.length ?? 0)} тем
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Stats Cards ──────────────────────────────────

function StatsCards({ profile }: { profile?: ReaderProfile }) {
  const avgDepth = profile?.topics?.length
    ? Math.round(profile.topics.reduce((sum, t) => sum + t.depth, 0) / profile.topics.length * 100) : 0;

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={6}>
        <Card size="small"><Statistic title="Вопросов" value={profile?.questions_total ?? 0} prefix={<BookOutlined />} valueStyle={{ fontSize: 20 }} /></Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small"><Statistic title="Диалогов" value={profile?.conversation_count ?? 0} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: 20 }} /></Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small"><Statistic title="Тем" value={profile?.topics?.length ?? 0} prefix={<HeartOutlined />} valueStyle={{ fontSize: 20 }} /></Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card size="small">
          <Statistic title="Глубина" value={avgDepth} suffix="%" prefix={<TrophyOutlined />}
            valueStyle={{ fontSize: 20, color: avgDepth > 50 ? '#52c41a' : undefined }} />
        </Card>
      </Col>
    </Row>
  );
}

// ── Account Info ──────────────────────────────────

function AccountInfo({ user }: { user: any }) {
  return (
    <Card title={<><UserOutlined /> Информация об аккаунте</>}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Имя пользователя">{user?.username || '—'}</Descriptions.Item>
        <Descriptions.Item label="Отображаемое имя">{user?.display_name || '—'}</Descriptions.Item>
        <Descriptions.Item label="ID"><Text code style={{ fontSize: 11 }}>{user?.id || '—'}</Text></Descriptions.Item>
        <Descriptions.Item label="Роль">
          <Tag color={user?.role === 'admin' ? 'red' : user?.role === 'editor' ? 'blue' : 'green'}>{user?.role}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Провайдер">{user?.provider || '—'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

// ── Edit Profile ──────────────────────────────────

function EditProfile({ user }: { user: any }) {
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
    <Card title={<><EditOutlined /> Редактировать профиль</>}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ display_name: user?.display_name || '' }}
        onFinish={(values) => updateMutation.mutate(values)}
      >
        <Form.Item name="display_name" label="Отображаемое имя">
          <Input placeholder="Ваше имя" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
            Сохранить
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ── My Community Contributions ──────────────────────────────────

function MyContributions() {
  const { data: interps } = useQuery({
    queryKey: ['my-interps'],
    queryFn: () => api.get<{ interpretations: Interpretation[] }>('/book/community/interpretations/mine'),
  });

  const { data: artifacts } = useQuery({
    queryKey: ['my-artifacts'],
    queryFn: () => api.get<{ artifacts: Artifact[] }>('/book/community/artifacts/mine'),
  });

  const interpretations = interps?.interpretations || [];
  const myArtifacts = artifacts?.artifacts || [];

  const statusColors: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
  };

  return (
    <Card title={<><HeartOutlined /> Мои вклады в сообщество</>}>
      <Tabs
        items={[
          {
            key: 'interpretations',
            label: `Интерпретации (${interpretations.length})`,
            children: interpretations.length === 0 ? (
              <Empty description="Вы ещё не добавляли интерпретаций" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={interpretations}
                renderItem={(item: Interpretation) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text ellipsis style={{ maxWidth: 300 }}>{item.text.substring(0, 50)}...</Text>
                          <Tag color={statusColors[item.status]}>{item.status}</Tag>
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(item.created_at).toLocaleDateString('ru')}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            👍 {item.likes}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'artifacts',
            label: `Артефакты (${myArtifacts.length})`,
            children: myArtifacts.length === 0 ? (
              <Empty description="Вы ещё не добавляли артефактов" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={myArtifacts}
                renderItem={(item: Artifact) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text>{item.title}</Text>
                          <Tag color={statusColors[item.status]}>{item.status}</Tag>
                        </Space>
                      }
                      description={
                        <Space>
                          <Tag>{item.category}</Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            👍 {item.likes}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}

// ── Favorite Topics ──────────────────────────────────

function FavoriteTopics({ topics }: { topics: Array<{ name: string; depth: number; questions: number }> }) {
  if (!topics || topics.length === 0) {
    return (
      <Card title={<><HeartOutlined /> Изученные темы</>}>
        <Empty description="Начните задавать вопросы в чате" />
      </Card>
    );
  }

  return (
    <Card title={<><HeartOutlined /> Изученные темы</>}>
      <List
        dataSource={topics.sort((a, b) => b.depth - a.depth).slice(0, 10)}
        renderItem={(topic) => (
          <List.Item>
            <List.Item.Meta
              title={topic.name}
              description={
                <Progress percent={Math.round(topic.depth * 100)} size="small"
                  strokeColor={topic.depth > 0.7 ? '#52c41a' : topic.depth > 0.4 ? '#1890ff' : '#d9d9d9'} />
              }
            />
            <Space direction="vertical" align="end" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>{topic.questions} вопросов</Text>
              <Tag color={topic.depth > 0.7 ? 'green' : topic.depth > 0.4 ? 'blue' : 'default'} style={{ marginTop: 2 }}>
                {Math.round(topic.depth * 100)}%
              </Tag>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );
}

// ── Recent Activity ──────────────────────────────────

function RecentActivity() {
  const { data: history } = useQuery({
    queryKey: ['history-profile'],
    queryFn: () => api.get<{ data: HistoryItem[] }>('/book/reader/history?limit=10'),
  });

  const items = history?.data || [];

  return (
    <Card title={<><ClockCircleOutlined /> Недавняя активность</>}>
      {items.length === 0 ? (
        <Empty description="Нет недавней активности" />
      ) : (
        <Timeline items={items.map((item) => ({
          children: (
            <div>
              <Text style={{ fontSize: 13 }}>{item.content}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{new Date(item.created_at).toLocaleString('ru')}</Text>
            </div>
          ),
        }))} />
      )}
    </Card>
  );
}

// ── API Keys ──────────────────────────────────

function ApiKeysSection() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKeyItem[]>('/auth/api-keys'),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ key: string; key_masked: string }>('/auth/api-key'),
    onSuccess: (data) => { setNewKey(data.key); message.success('API-ключ сгенерирован'); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => { message.success('Ключ удалён'); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const activeKeys = keys?.filter(k => k.is_active) || [];

  return (
    <Card title={<><KeyOutlined /> API-ключи</>}>
      <Button type="primary" icon={<KeyOutlined />} onClick={() => generateMutation.mutate()} loading={generateMutation.isPending} style={{ marginBottom: 12 }}>
        Сгенерировать ключ
      </Button>
      {newKey && (
        <div style={{ marginBottom: 12, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <Text strong style={{ fontSize: 12 }}>Новый ключ: </Text>
          <Text copyable code style={{ fontSize: 12 }}>{newKey}</Text>
          <br />
          <Text type="warning" style={{ fontSize: 11 }}>Сохраните ключ — он показывается только один раз!</Text>
        </div>
      )}
      {isLoading ? <Text type="secondary">Загрузка...</Text> : activeKeys.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 13 }}>Нет активных ключей</Text>
      ) : (
        <List size="small" dataSource={activeKeys} renderItem={(item) => (
          <List.Item actions={[
            <Popconfirm key="del" title="Удалить ключ?" onConfirm={() => deleteMutation.mutate(item.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>,
          ]}>
            <List.Item.Meta
              avatar={<KeyOutlined style={{ color: '#2563eb' }} />}
              title={<code style={{ fontSize: 12 }}>{item.key_prefix}...</code>}
              description={<Text type="secondary" style={{ fontSize: 11 }}>
                {item.last_used_at ? `Последнее: ${new Date(item.last_used_at).toLocaleString('ru')}` : 'Не использован'} · {new Date(item.created_at).toLocaleDateString('ru')}
              </Text>}
            />
          </List.Item>
        )} />
      )}
    </Card>
  );
}

// ── Email Subscription ──────────────────────────────

function EmailSubscription() {
  const [form] = Form.useForm();
  const subscribeMutation = useMutation({
    mutationFn: (email: string) => api.post('/book/email/subscribe', { email }),
    onSuccess: () => { message.success('Подписка оформлена'); form.resetFields(); },
  });

  return (
    <Card title={<><MailOutlined /> Подписка на рассылку</>}>
      <Paragraph type="secondary" style={{ fontSize: 13 }}>
        Получайте уведомления о новых материалах и обновлениях книги.
      </Paragraph>
      <Form form={form} onFinish={(values) => subscribeMutation.mutate(values.email)} layout="vertical" size="small">
        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
          <Input placeholder="your@email.com" suffix={<MailOutlined />} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={subscribeMutation.isPending} block>Подписаться</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ── Main Content ──────────────────────────────────

function ProfileContent() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => api.get<ReaderProfile>('/book/reader/profile'),
  });

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 16 }}>Профиль</Title>

      <QuickActions />
      <UserHeader user={user} profile={profile} />
      <StatsCards profile={profile} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <MyContributions />
          <div style={{ marginTop: 16 }}>
            <FavoriteTopics topics={profile?.topics || []} />
          </div>
          <div style={{ marginTop: 16 }}>
            <RecentActivity />
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <AccountInfo user={user} />
          <div style={{ marginTop: 16 }}><EditProfile user={user} /></div>
          <div style={{ marginTop: 16 }}><ApiKeysSection /></div>
          <div style={{ marginTop: 16 }}><EmailSubscription /></div>
        </Col>
      </Row>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
