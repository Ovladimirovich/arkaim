'use client';

import { useState } from 'react';
import { Card, Tabs, Form, Input, Select, Button, Upload, message, Typography, Space, InputNumber, Table, Tag, Empty, Spin, Row, Col } from 'antd';
import { PictureOutlined, AudioOutlined, CameraOutlined, SendOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';

const { Title, Text } = Typography;
const { TextArea } = Input;

type GenomeData = {
  modules?: {
    scenes?: Array<{ chapter: number; scene_id: string; title: string; characters: string[]; location: string; emotion: string; meaning_tags: string[] }>;
    character_visuals?: Array<{ character_id: string; name: string; archetype?: string; visual_description: string; color_palette: string[] }>;
    location_visuals?: Array<{ location_id: string; name: string; atmosphere?: string; architecture?: string; lighting?: string }>;
  };
};

function CollectionPanel() {
  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  const scenes = genome?.modules?.scenes || [];
  const characters = genome?.modules?.character_visuals || [];
  const locations = genome?.modules?.location_visuals || [];

  const sceneColumns = [
    { title: 'Глава', dataIndex: 'chapter', key: 'chapter', width: 70 },
    { title: 'ID', dataIndex: 'scene_id', key: 'scene_id', render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Название', dataIndex: 'title', key: 'title', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Персонажи', dataIndex: 'characters', key: 'characters', render: (v: string[]) => v?.map((c, i) => <Tag key={i}>{c}</Tag>) },
    { title: 'Локация', dataIndex: 'location', key: 'location' },
    { title: 'Эмоция', dataIndex: 'emotion', key: 'emotion', render: (v: string) => <Tag color="purple">{v}</Tag> },
  ];

  const characterColumns = [
    { title: 'ID', dataIndex: 'character_id', key: 'id', render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Имя', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Архетип', dataIndex: 'archetype', key: 'archetype', render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Описание', dataIndex: 'visual_description', key: 'desc', render: (v: string) => <Text ellipsis style={{ maxWidth: 300 }}>{v}</Text> },
    { title: 'Палитра', dataIndex: 'color_palette', key: 'palette', render: (v: string[]) => v?.slice(0, 3).map((c, i) => (
      <span key={i} style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid #ccc', marginRight: 4 }} />
    )) },
  ];

  const locationColumns = [
    { title: 'ID', dataIndex: 'location_id', key: 'id', render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
    { title: 'Название', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Атмосфера', dataIndex: 'atmosphere', key: 'atmosphere' },
    { title: 'Архитектура', dataIndex: 'architecture', key: 'architecture' },
    { title: 'Освещение', dataIndex: 'lighting', key: 'lighting' },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small"><Text strong>Сцен:</Text> {scenes.length}</Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small"><Text strong>Персонажей:</Text> {characters.length}</Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small"><Text strong>Локаций:</Text> {locations.length}</Card>
        </Col>
      </Row>

      <Card title="Сцены" style={{ marginTop: 16 }}>
        {scenes.length > 0 ? (
          <Table columns={sceneColumns} dataSource={scenes} rowKey="scene_id" size="small" pagination={{ pageSize: 10 }} />
        ) : (
          <Empty description="Сцены ещё не созданы" />
        )}
      </Card>

      <Card title="Персонажи" style={{ marginTop: 16 }}>
        {characters.length > 0 ? (
          <Table columns={characterColumns} dataSource={characters} rowKey="character_id" size="small" pagination={{ pageSize: 10 }} />
        ) : (
          <Empty description="Визуалы персонажей ещё не созданы" />
        )}
      </Card>

      <Card title="Локации" style={{ marginTop: 16 }}>
        {locations.length > 0 ? (
          <Table columns={locationColumns} dataSource={locations} rowKey="location_id" size="small" pagination={{ pageSize: 10 }} />
        ) : (
          <Empty description="Локации ещё не созданы" />
        )}
      </Card>
    </div>
  );
}

function SceneForm() {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/scene', values),
    onSuccess: () => { message.success('Сцена создана'); form.resetFields(); },
    onError: () => message.error('Ошибка создания сцены'),
  });

  return (
    <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
      <Form.Item name="chapter" label="Глава" rules={[{ required: true }]}>
        <InputNumber min={1} max={42} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="title" label="Название" rules={[{ required: true }]}>
        <Input placeholder="Название сцены" />
      </Form.Item>
      <Form.Item name="characters" label="Персонажи">
        <Select mode="tags" placeholder="Введите имена персонажей" />
      </Form.Item>
      <Form.Item name="location" label="Локация">
        <Input placeholder="Место действия" />
      </Form.Item>
      <Form.Item name="emotion" label="Эмоция">
        <Select options={[
          { value: 'neutral', label: 'Нейтральная' },
          { value: 'joy', label: 'Радость' },
          { value: 'sadness', label: 'Грусть' },
          { value: 'anger', label: 'Гнев' },
          { value: 'fear', label: 'Страх' },
          { value: 'surprise', label: 'Удивление' },
        ]} />
      </Form.Item>
      <Form.Item name="meaning_tags" label="Теги смысла">
        <Select mode="tags" placeholder="Теги" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending} icon={<SendOutlined />}>
          Создать сцену
        </Button>
      </Form.Item>
    </Form>
  );
}

function CharacterForm() {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/character', values),
    onSuccess: () => { message.success('Визуал персонажа создан'); form.resetFields(); },
    onError: () => message.error('Ошибка'),
  });

  return (
    <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
      <Form.Item name="character_id" label="ID персонажа" rules={[{ required: true }]}>
        <Input placeholder="unique-id" />
      </Form.Item>
      <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
        <Input placeholder="Имя персонажа" />
      </Form.Item>
      <Form.Item name="archetype" label="Архетип">
        <Input placeholder="Герой, Тень, Мудрец..." />
      </Form.Item>
      <Form.Item name="visual_description" label="Описание">
        <TextArea rows={3} placeholder="Внешний вид персонажа" />
      </Form.Item>
      <Form.Item name="color_palette" label="Цветовая палитра">
        <Select mode="tags" placeholder="#hex цвета" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Сохранить
        </Button>
      </Form.Item>
    </Form>
  );
}

function LocationForm() {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/location', values),
    onSuccess: () => { message.success('Локация создана'); form.resetFields(); },
    onError: () => message.error('Ошибка'),
  });

  return (
    <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
      <Form.Item name="location_id" label="ID локации" rules={[{ required: true }]}>
        <Input placeholder="unique-id" />
      </Form.Item>
      <Form.Item name="name" label="Название" rules={[{ required: true }]}>
        <Input placeholder="Название локации" />
      </Form.Item>
      <Form.Item name="atmosphere" label="Атмосфера">
        <Input placeholder="Мрачная, светлая, таинственная..." />
      </Form.Item>
      <Form.Item name="architecture" label="Архитектура">
        <Input placeholder="Описание архитектуры" />
      </Form.Item>
      <Form.Item name="lighting" label="Освещение">
        <Input placeholder="Тёплое, холодное, контровое..." />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Сохранить
        </Button>
      </Form.Item>
    </Form>
  );
}

function VoiceForm() {
  const [description, setDescription] = useState('');
  const mutation = useMutation({
    mutationFn: (text: string) => api.post('/book/visual-genome/from-speech', { text }),
    onSuccess: () => { message.success('Описание обработано'); setDescription(''); },
    onError: () => message.error('Ошибка обработки'),
  });

  return (
    <div>
      <TextArea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={4}
        placeholder="Опишите сцену голосом или текстом..."
      />
      <Button
        type="primary"
        icon={<AudioOutlined />}
        style={{ marginTop: 12 }}
        loading={mutation.isPending}
        onClick={() => mutation.mutate(description)}
      >
        Обработать
      </Button>
    </div>
  );
}

function VisualContent() {
  const items = [
    { key: 'collection', label: <><DatabaseOutlined /> Коллекция</>, children: <CollectionPanel /> },
    { key: 'scene', label: <><PictureOutlined /> Сцены</>, children: <SceneForm /> },
    { key: 'character', label: 'Персонажи', children: <CharacterForm /> },
    { key: 'location', label: 'Локации', children: <LocationForm /> },
    { key: 'voice', label: <><AudioOutlined /> Голос</>, children: <VoiceForm /> },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2}><PictureOutlined /> Visual Genome</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Создавайте и управляйте визуальными описаниями сцен, персонажей и локаций
      </Text>
      <Tabs items={items} />
    </div>
  );
}

export default function VisualPage() {
  return (
    <ProtectedRoute>
      <RoleGuard roles={['editor', 'admin']}>
        <VisualContent />
      </RoleGuard>
    </ProtectedRoute>
  );
}
