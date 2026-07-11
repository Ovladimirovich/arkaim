'use client';

import { useState } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, Empty, Spin, Space, Button, Progress, List, Tooltip, Badge } from 'antd';
import { BulbOutlined, RiseOutlined, StarOutlined, BookOutlined, TeamOutlined, HistoryOutlined, ThunderboltOutlined, HeartOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
};

type ReaderProfile = {
  topics: Array<{ name: string; depth: number; questions: number }>;
  questions_total: number;
  conversation_count: number;
  last_topic: string;
};

type TrendingTopic = {
  keyword: string;
  hits: number;
  sources: string[];
};

type Suggestion = {
  id: string;
  topic: string;
  reason?: string;
  status: string;
};

// ── Recommended Topics ──────────────────────────────

function RecommendedTopics({ genome, profile }: { genome?: GenomeData; profile?: ReaderProfile }) {
  const router = useRouter();
  if (!genome || !profile) return <Spin />;

  const studiedNames = new Set(profile.topics?.map(t => t.name) || []);
  const studiedTopics = profile.topics || [];

  // Рекомендации: темы которые пользователь ещё не изучал
  const unstudied = genome.themes.filter(t => !studiedNames.has(t.name));
  // Рекомендации: связанные с изученными темами
  const related = genome.themes.filter(t => {
    if (studiedNames.has(t.name)) return false;
    const text = `${t.name} ${t.description || ''}`.toLowerCase();
    return studiedTopics.some(st => {
      const stWords = st.name.toLowerCase().split(' ');
      return stWords.some(w => w.length > 3 && text.includes(w));
    });
  });

  const recommendations = [...new Map([...related, ...unstudied].map(t => [t.name, t])).values()].slice(0, 8);

  if (recommendations.length === 0) return <Empty description="Все темы уже изучены!" />;

  return (
    <Card title={<><BulbOutlined /> Рекомендации для вас</>} extra={<Text type="secondary" style={{ fontSize: 12 }}>На основе вашего профиля</Text>}>
      <Row gutter={[12, 12]}>
        {recommendations.map((theme, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={theme.name}>
            <Card
              size="small"
              hoverable
              onClick={() => router.push(`/book`)}
              style={{ height: '100%', cursor: 'pointer' }}
              bodyStyle={{ padding: 12 }}
            >
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: 13 }}>{theme.name}</Text>
                  <Tag color={related.includes(theme) ? 'blue' : 'green'} style={{ fontSize: 10 }}>
                    {related.includes(theme) ? 'Связана' : 'Новая'}
                  </Tag>
                </div>
                {theme.description && (
                  <Text type="secondary" style={{ fontSize: 11 }} ellipsis={{ rows: 2 }}>{theme.description}</Text>
                )}
                <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}>
                  Спросить <ArrowRightOutlined />
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

// ── Trending Topics ──────────────────────────────

function TrendingSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get<{ trending: TrendingTopic[]; total: number }>('/book/presence/trending?min_hits=1'),
  });

  if (isLoading) return <Spin />;
  const trending = data?.trending || [];

  if (trending.length === 0) return <Empty description="Нет трендовых тем" />;

  return (
    <Card title={<><RiseOutlined /> Тренды</>} extra={<Text type="secondary" style={{ fontSize: 12 }}>Что читатели ищут</Text>}>
      <List
        dataSource={trending.slice(0, 10)}
        renderItem={(item: TrendingTopic, index: number) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Badge count={index + 1} style={{ backgroundColor: index < 3 ? '#2563eb' : '#d9d9d9' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: index < 3 ? '#eff6ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiseOutlined style={{ color: index < 3 ? '#2563eb' : '#999' }} />
                  </div>
                </Badge>
              }
              title={<Text strong style={{ fontSize: 13 }}>{item.keyword}</Text>}
              description={
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{item.hits} упоминаний</Text>
                  {item.sources?.map((s, i) => <Tag key={i} style={{ fontSize: 10 }}>{s}</Tag>)}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

// ── Suggested Questions ──────────────────────────────

function SuggestedQuestions({ genome, profile }: { genome?: GenomeData; profile?: ReaderProfile }) {
  const router = useRouter();

  if (!genome || !profile) return <Spin />;

  // Генерируем вопросы на основе тем которые пользователь ещё не изучал глубоко
  const shallowTopics = (profile.topics || []).filter(t => t.depth < 0.5);
  const unstudied = genome.themes.filter(t => !(profile.topics || []).some(pt => pt.name === t.name));

  const suggestions = [
    ...shallowTopics.slice(0, 3).map(t => ({
      question: `Расскажи подробнее о «${t.name}»`,
      reason: `Вы изучили только ${Math.round(t.depth * 100)}%`,
      icon: <BulbOutlined style={{ color: '#d97706' }} />,
    })),
    ...unstudied.slice(0, 3).map(t => ({
      question: `Что такое «${t.name}»?`,
      reason: 'Ещё не изучено',
      icon: <StarOutlined style={{ color: '#7c3aed' }} />,
    })),
  ];

  if (suggestions.length === 0) return <Empty description="Все темы изучены глубоко!" />;

  return (
    <Card title={<><ThunderboltOutlined /> Предложенные вопросы</>} extra={<Text type="secondary" style={{ fontSize: 12 }}>Персонализированные</Text>}>
      <Row gutter={[8, 8]}>
        {suggestions.map((s, i) => (
          <Col xs={24} sm={12} key={i}>
            <div
              onClick={() => router.push('/book')}
              style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'border-color 0.2s', display: 'flex', gap: 10, alignItems: 'flex-start' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <div style={{ fontSize: 16, marginTop: 2 }}>{s.icon}</div>
              <div>
                <Text strong style={{ fontSize: 13 }}>{s.question}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{s.reason}</Text></div>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

// ── Study Progress ──────────────────────────────

function StudyProgress({ profile, genome }: { profile?: ReaderProfile; genome?: GenomeData }) {
  if (!profile || !genome) return <Spin />;

  const totalThemes = genome.themes.length;
  const studied = profile.topics?.length || 0;
  const avgDepth = profile.topics?.length
    ? profile.topics.reduce((sum, t) => sum + t.depth, 0) / profile.topics.length
    : 0;

  return (
    <Card title={<><BookOutlined /> Прогресс обучения</>}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center' }}>
            <Progress type="circle" percent={totalThemes > 0 ? Math.round(studied / totalThemes * 100) : 0} size={80} strokeColor="#2563eb" />
            <div style={{ marginTop: 8 }}><Text strong>{studied}/{totalThemes}</Text></div>
            <Text type="secondary" style={{ fontSize: 11 }}>тем изучено</Text>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center' }}>
            <Progress type="circle" percent={Math.round(avgDepth * 100)} size={80} strokeColor={avgDepth > 0.7 ? '#52c41a' : avgDepth > 0.4 ? '#1890ff' : '#d9d9d9'} />
            <div style={{ marginTop: 8 }}><Text strong>{Math.round(avgDepth * 100)}%</Text></div>
            <Text type="secondary" style={{ fontSize: 11 }}>средняя глубина</Text>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, color: '#2563eb', marginBottom: 4 }}><BookOutlined /></div>
            <div style={{ marginTop: 8 }}><Text strong>{profile.questions_total}</Text></div>
            <Text type="secondary" style={{ fontSize: 11 }}>вопросов задано</Text>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, color: '#059669', marginBottom: 4 }}><HistoryOutlined /></div>
            <div style={{ marginTop: 8 }}><Text strong>{profile.conversation_count}</Text></div>
            <Text type="secondary" style={{ fontSize: 11 }}>диалогов</Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────

function RecommendationsContent() {
  const { data: genome, isLoading: genomeLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => api.get<ReaderProfile>('/book/reader/profile'),
  });

  const isLoading = genomeLoading || profileLoading;

  const items = [
    { key: 'recommendations', label: <><BulbOutlined /> Рекомендации</>, children: <RecommendedTopics genome={genome} profile={profile} /> },
    { key: 'questions', label: <><ThunderboltOutlined /> Вопросы</>, children: <SuggestedQuestions genome={genome} profile={profile} /> },
    { key: 'trending', label: <><RiseOutlined /> Тренды</>, children: <TrendingSection /> },
    { key: 'progress', label: <><BookOutlined /> Прогресс</>, children: <StudyProgress genome={genome} profile={profile} /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Рекомендации</Title>
          <Text type="secondary">Персонализированные предложения для чтения</Text>
        </div>
        <Link href="/book"><Button type="primary" icon={<BookOutlined />}>Перейти к чату</Button></Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Tabs items={items} />
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <RecommendationsContent />
    </ProtectedRoute>
  );
}
