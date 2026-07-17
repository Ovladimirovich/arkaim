'use client';

import { useState } from 'react';
import { Card, Typography, List, Button, Space, Tag, Input, Form, message, Empty, Statistic, Row, Col, Select } from 'antd';
import { BulbOutlined, LikeOutlined, PlusOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import { Comments } from '@/shared/ui/Comments';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type Interpretation = {
  id: string;
  reader_id: string;
  reader_name: string;
  text: string;
  themes: string[];
  characters: string[];
  created_at: string;
  status: string;
  likes: number;
};

function InterpretationForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const submitMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/community/interpretations', {
      text: values.text,
      themes: values.themes ? values.themes.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      characters: values.characters ? values.characters.split(',').map((c: string) => c.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      message.success('Интерпретация отправлена на модерацию');
      queryClient.invalidateQueries({ queryKey: ['interpretations'] });
      onClose();
    },
  });

  return (
    <Card title="Новая интерпретация" size="small" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" onFinish={submitMutation.mutate}>
        <Form.Item name="text" label="Ваша интерпретация" rules={[{ required: true }]}>
          <TextArea rows={4} placeholder="Что вы нашли в книге? Какие связи обнаружили?" />
        </Form.Item>
        <Form.Item name="themes" label="Связанные темы (через запятую)">
          <Input placeholder="Гиперборея, звукознание, пробуждение" />
        </Form.Item>
        <Form.Item name="characters" label="Связанные персонажи (через запятую)">
          <Input placeholder="Велик, Учитель, Славный" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitMutation.isPending}>Отправить</Button>
          <Button onClick={onClose}>Отмена</Button>
        </Space>
      </Form>
    </Card>
  );
}

function InterpretationsContent() {
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState<string>('newest');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['interpretations', sort],
    queryFn: () => api.get<{ interpretations: Interpretation[]; count: number }>(`/book/community/interpretations?status=approved&sort=${sort}`),
  });

  const { data: stats } = useQuery({
    queryKey: ['interpretations-stats'],
    queryFn: () => api.get<{ total: number; pending: number; approved: number }>('/book/community/interpretations/stats'),
  });

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/book/community/interpretations/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interpretations'] }),
  });

  const interpretations = data?.interpretations || [];

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
      <Title level={2}><BulbOutlined /> Интерпретации</Title>
      <Paragraph type="secondary">Читатели делятся своим пониманием книги. Каждая интерпретация — новый взгляд на сокрытые знания.</Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="Всего" value={stats?.total ?? 0} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Одобрено" value={stats?.approved ?? 0} valueStyle={{ color: '#16a34a' }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Ожидают" value={stats?.pending ?? 0} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
          Поделиться интерпретацией
        </Button>
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

      {showForm && <InterpretationForm onClose={() => setShowForm(false)} />}

      {interpretations.length === 0 ? (
        <Empty description="Пока нет интерпретаций. Будьте первым!" />
      ) : (
        <List
          dataSource={interpretations}
          renderItem={(item: Interpretation) => (
            <Card size="small" style={{ marginBottom: 8 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <UserOutlined />
                  <Text strong>{item.reader_name || 'Читатель'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleString('ru')}</Text>
                </Space>
                <Paragraph style={{ margin: 0 }}>{item.text}</Paragraph>
                <Space wrap>
                  {item.themes.map((t, i) => <Tag key={i}>{t}</Tag>)}
                  {item.characters.map((c, i) => <Tag key={i} color="blue">{c}</Tag>)}
                </Space>
                <Space>
                  <Button size="small" icon={<LikeOutlined />} onClick={() => likeMutation.mutate(item.id)}>
                    {item.likes}
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
                  <Comments parentType="interpretation" parentId={item.id} />
                )}
              </Space>
            </Card>
          )}
        />
      )}
    </div>
  );
}

export default function InterpretationsPage() {
  return (
    <ProtectedRoute>
      <InterpretationsContent />
    </ProtectedRoute>
  );
}
