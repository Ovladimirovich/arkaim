'use client';

import { useState } from 'react';
import { Card, Typography, List, Button, Space, Tag, Input, Form, Select, message, Empty, Statistic, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, LinkOutlined, EnvironmentOutlined, CommentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import { Comments } from '@/shared/ui/Comments';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CATEGORIES = [
  { value: 'archaeology', label: 'Археология' },
  { value: 'legend', label: 'Легенда' },
  { value: 'symbol', label: 'Символ' },
  { value: 'connection', label: 'Связь' },
];

type Artifact = {
  id: string;
  reader_name: string;
  title: string;
  description: string;
  category: string;
  source: string;
  connection_to_book: string;
  related_themes: string[];
  location: string;
  url: string;
  created_at: string;
  status: string;
  likes: number;
};

function ArtifactForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const submitMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/community/artifacts', {
      title: values.title,
      description: values.description,
      category: values.category,
      source: values.source,
      connection_to_book: values.connection_to_book,
      related_themes: values.related_themes ? values.related_themes.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      location: values.location || '',
      url: values.url || '',
    }),
    onSuccess: () => {
      message.success('Артефакт отправлен на модерацию');
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      onClose();
    },
  });

  return (
    <Card title="Новый артефакт" size="small" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" onFinish={submitMutation.mutate}>
        <Form.Item name="title" label="Название" rules={[{ required: true }]}>
          <Input placeholder="Каменная стела с символами" />
        </Form.Item>
        <Form.Item name="description" label="Описание" rules={[{ required: true }]}>
          <TextArea rows={3} placeholder="Что вы нашли? Где? Как это выглядит?" />
        </Form.Item>
        <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
          <Select options={CATEGORIES} placeholder="Выберите категорию" />
        </Form.Item>
        <Form.Item name="source" label="Источник" rules={[{ required: true }]}>
          <Input placeholder="Музей, книга, сайт, экспедиция" />
        </Form.Item>
        <Form.Item name="connection_to_book" label="Связь с книгой" rules={[{ required: true }]}>
          <TextArea rows={2} placeholder="Как это связано с 'Наследием Аркаима'?" />
        </Form.Item>
        <Form.Item name="related_themes" label="Связанные темы">
          <Input placeholder="Аркаим, Гиперборея, энергетика мест" />
        </Form.Item>
        <Form.Item name="location" label="Местоположение">
          <Input prefix={<EnvironmentOutlined />} placeholder="Южный Урал, Россия" />
        </Form.Item>
        <Form.Item name="url" label="Ссылка">
          <Input prefix={<LinkOutlined />} placeholder="https://..." />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitMutation.isPending}>Отправить</Button>
          <Button onClick={onClose}>Отмена</Button>
        </Space>
      </Form>
    </Card>
  );
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  archaeology: { label: 'Археология', color: 'brown' },
  legend: { label: 'Легенда', color: 'purple' },
  symbol: { label: 'Символ', color: 'gold' },
  connection: { label: 'Связь', color: 'blue' },
};

function ArtifactsContent() {
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('newest');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['artifacts', categoryFilter, sort],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('status', 'approved');
      params.set('sort', sort);
      if (categoryFilter) params.set('category', categoryFilter);
      return api.get<{ artifacts: Artifact[]; count: number }>(`/book/community/artifacts?${params}`);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['artifacts-stats'],
    queryFn: () => api.get<{ total: number; pending: number; categories: Record<string, number> }>('/book/community/artifacts/stats'),
  });

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/community/artifacts/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artifacts'] }),
  });

  const artifacts = data?.artifacts || [];

  const toggleComments = (id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}><SearchOutlined /> Артефакты</Title>
      <Paragraph type="secondary">Находки читателей: археология, легенды, символы, связи. Каждый артефакт — мост между книгой и реальностью.</Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="Всего" value={stats?.total ?? 0} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Археология" value={stats?.categories?.archaeology ?? 0} valueStyle={{ color: '#8B4513' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Легенды" value={stats?.categories?.legend ?? 0} valueStyle={{ color: '#7B1FA2' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Связи" value={stats?.categories?.connection ?? 0} valueStyle={{ color: '#1565C0' }} /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
          Добавить артефакт
        </Button>
        <Select
          placeholder="Фильтр по категории"
          allowClear
          style={{ width: 200 }}
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORIES}
        />
        <Select
          value={sort}
          onChange={setSort}
          style={{ width: 180 }}
          options={[
            { value: 'newest', label: 'Сначала новые' },
            { value: 'oldest', label: 'Сначала старые' },
            { value: 'popular', label: 'По популярности' },
          ]}
        />
      </Space>

      {showForm && <ArtifactForm onClose={() => setShowForm(false)} />}

      {artifacts.length === 0 ? (
        <Empty description="Пока нет артефактов. Будьте первым!" />
      ) : (
        <List
          dataSource={artifacts}
          renderItem={(item: Artifact) => {
            const cat = CATEGORY_LABELS[item.category] || { label: item.category, color: 'default' };
            return (
              <Card size="small" style={{ marginBottom: 8 }} title={item.title}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <Tag color={cat.color}>{cat.label}</Tag>
                    <UserOutlined />
                    <Text type="secondary">{item.reader_name}</Text>
                    {item.location && <Text type="secondary"><EnvironmentOutlined /> {item.location}</Text>}
                  </Space>
                  <Paragraph style={{ margin: 0 }}>{item.description}</Paragraph>
                  <Paragraph type="secondary" style={{ margin: 0, fontStyle: 'italic' }}>
                    Связь с книгой: {item.connection_to_book}
                  </Paragraph>
                  <Space wrap>
                    {item.related_themes.map((t, i) => <Tag key={i}>{t}</Tag>)}
                  </Space>
                  {item.url && (
                    <Button size="small" type="link" href={item.url} target="_blank" icon={<LinkOutlined />}>
                      Источник
                    </Button>
                  )}
                  <Space>
                    <Button size="small" onClick={() => likeMutation.mutate(item.id)}>
                      👍 {item.likes}
                    </Button>
                    <Button
                      size="small"
                      icon={<CommentOutlined />}
                      onClick={() => toggleComments(item.id)}
                    >
                      {expandedComments.has(item.id) ? 'Скрыть' : 'Комментарии'}
                    </Button>
                  </Space>
                  {expandedComments.has(item.id) && (
                    <Comments parentType="artifact" parentId={item.id} />
                  )}
                </Space>
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}

export default function ArtifactsPage() {
  return (
    <ProtectedRoute>
      <ArtifactsContent />
    </ProtectedRoute>
  );
}
