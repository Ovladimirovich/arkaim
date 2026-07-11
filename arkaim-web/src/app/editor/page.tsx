'use client';

import { useState } from 'react';
import { Card, Typography, Row, Col, Tabs, List, Empty, Spin, Space, Input, Button, Tag, Form, Select, InputNumber, Modal, message, Descriptions, Popconfirm, Divider } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined, BulbOutlined, AudioOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute, RoleGuard } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type GenomeData = {
  modules?: {
    scenes?: Array<{ chapter: number; scene_id: string; title: string; characters: string[]; location: string; emotion: string; meaning_tags: string[]; source?: string }>;
    character_visuals?: Array<{ character_id: string; name: string; archetype?: string; visual_description: string; color_palette: string[] }>;
    location_visuals?: Array<{ location_id: string; name: string; atmosphere?: string; architecture?: string; lighting?: string }>;
  };
  themes?: Array<{ name: string; description?: string }>;
  characters?: Array<{ id: string; name: string; role?: string; description?: string }>;
  world_entities?: Array<{ id: string; name: string; type?: string }>;
};

// ── Scenes Editor ──────────────────────────────────

function ScenesEditor({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editScene, setEditScene] = useState<any>(null);
  const [form] = Form.useForm();

  const scenes = genome?.modules?.scenes || [];

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/scene', values),
    onSuccess: () => {
      message.success('Сцена создана');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['genome-full'] });
    },
    onError: () => message.error('Ошибка создания'),
  });

  const handleCreate = () => {
    form.validateFields().then(values => createMutation.mutate(values));
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Сцен: {scenes.length}</Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Новая сцена
        </Button>
      </div>

      {scenes.length === 0 ? (
        <Empty description="Сцены ещё не созданы" />
      ) : (
        <Row gutter={[12, 12]}>
          {scenes.map((scene, i) => (
            <Col xs={24} sm={12} lg={8} key={scene.scene_id || i}>
              <Card
                size="small"
                hoverable
                onClick={() => setEditScene(scene)}
                title={<Space><Tag color="blue">Гл. {scene.chapter}</Tag> <Text strong style={{ fontSize: 13 }}>{scene.title}</Text></Space>}
                extra={<Tag>{scene.emotion}</Tag>}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  {scene.characters?.length > 0 && (
                    <div><TeamOutlined style={{ marginRight: 4, color: '#2563eb' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{scene.characters.join(', ')}</Text>
                    </div>
                  )}
                  {scene.location && (
                    <div><EnvironmentOutlined style={{ marginRight: 4, color: '#d97706' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>{scene.location}</Text>
                    </div>
                  )}
                  {scene.meaning_tags?.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {scene.meaning_tags.slice(0, 3).map((t: string, j: number) => (
                        <Tag key={j} style={{ fontSize: 10 }}>{t}</Tag>
                      ))}
                    </div>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Modal */}
      <Modal
        title="Новая сцена"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        okText="Создать"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="chapter" label="Глава" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="title" label="Название" rules={[{ required: true }]}>
            <Input placeholder="Название сцены" />
          </Form.Item>
          <Form.Item name="characters" label="Персонажи">
            <Select mode="tags" placeholder="Введите имена" />
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
              { value: 'mystery', label: 'Таинственность' },
            ]} />
          </Form.Item>
          <Form.Item name="meaning_tags" label="Теги смысла">
            <Select mode="tags" placeholder="Теги" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={<Space><EditOutlined /> {editScene?.title}</Space>}
        open={!!editScene}
        onCancel={() => setEditScene(null)}
        footer={null}
        width={600}
      >
        {editScene && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Глава">{editScene.chapter}</Descriptions.Item>
            <Descriptions.Item label="Сцена ID"><Text code>{editScene.scene_id}</Text></Descriptions.Item>
            <Descriptions.Item label="Название">{editScene.title}</Descriptions.Item>
            <Descriptions.Item label="Персонажи">
              {editScene.characters?.map((c: string, i: number) => <Tag key={i}>{c}</Tag>) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Локация">{editScene.location || '—'}</Descriptions.Item>
            <Descriptions.Item label="Эмоция"><Tag>{editScene.emotion}</Tag></Descriptions.Item>
            <Descriptions.Item label="Теги">
              {editScene.meaning_tags?.map((t: string, i: number) => <Tag key={i} color="purple">{t}</Tag>) || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Источник">{editScene.source || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ── Characters Editor ──────────────────────────────────

function CharactersEditor({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editChar, setEditChar] = useState<any>(null);
  const [form] = Form.useForm();

  const characters = genome?.modules?.character_visuals || [];
  const bookCharacters = genome?.characters || [];

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/character', values),
    onSuccess: () => {
      message.success('Персонаж создан');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['genome-full'] });
    },
    onError: () => message.error('Ошибка создания'),
  });

  const handleCreate = () => {
    form.validateFields().then(values => createMutation.mutate(values));
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>Визуалов: {characters.length}</Text>
          <Text type="secondary">· Книжных: {bookCharacters.length}</Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Новый персонаж
        </Button>
      </div>

      {characters.length === 0 ? (
        <Empty description="Визуалы персонажей ещё не созданы" />
      ) : (
        <Row gutter={[12, 12]}>
          {characters.map((char, i) => (
            <Col xs={24} sm={12} lg={8} key={char.character_id || i}>
              <Card
                size="small"
                hoverable
                onClick={() => setEditChar(char)}
                title={<Space><Avatar size={24} style={{ backgroundColor: char.color_palette?.[0] || '#2563eb' }}>{char.name?.[0]}</Avatar> <Text strong style={{ fontSize: 13 }}>{char.name}</Text></Space>}
                extra={char.archetype && <Tag color="purple">{char.archetype}</Tag>}
              >
                <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 12 }}>
                  {char.visual_description || 'Нет описания'}
                </Paragraph>
                {char.color_palette?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                    {char.color_palette.slice(0, 5).map((c: string, j: number) => (
                      <div key={j} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid #ddd' }} />
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Modal */}
      <Modal
        title="Новый персонаж"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        okText="Создать"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="character_id" label="ID персонажа" rules={[{ required: true }]}>
            <Input placeholder="unique-id" />
          </Form.Item>
          <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
            <Input placeholder="Имя персонажа" />
          </Form.Item>
          <Form.Item name="archetype" label="Архетип">
            <Select options={[
              { value: 'Герой', label: 'Герой' },
              { value: 'Мудрец', label: 'Мудрец' },
              { value: 'Тень', label: 'Тень' },
              { value: 'Наставник', label: 'Наставник' },
              { value: 'Искатель', label: 'Искатель' },
              { value: 'Бунтарь', label: 'Бунтарь' },
            ]} />
          </Form.Item>
          <Form.Item name="visual_description" label="Описание">
            <TextArea rows={3} placeholder="Внешний вид персонажа" />
          </Form.Item>
          <Form.Item name="color_palette" label="Цветовая палитра">
            <Select mode="tags" placeholder="#hex цвета" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={<Space><EditOutlined /> {editChar?.name}</Space>}
        open={!!editChar}
        onCancel={() => setEditChar(null)}
        footer={null}
        width={600}
      >
        {editChar && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID"><Text code>{editChar.character_id}</Text></Descriptions.Item>
            <Descriptions.Item label="Имя">{editChar.name}</Descriptions.Item>
            <Descriptions.Item label="Архетип">{editChar.archetype || '—'}</Descriptions.Item>
            <Descriptions.Item label="Описание">{editChar.visual_description || '—'}</Descriptions.Item>
            <Descriptions.Item label="Палитра">
              <Space>
                {editChar.color_palette?.map((c: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid #ddd' }} />
                    <Text code style={{ fontSize: 11 }}>{c}</Text>
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ── Locations Editor ──────────────────────────────────

function LocationsEditor({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<any>(null);
  const [form] = Form.useForm();

  const locations = genome?.modules?.location_visuals || [];

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/book/visual-genome/location', values),
    onSuccess: () => {
      message.success('Локация создана');
      setCreateOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['genome-full'] });
    },
    onError: () => message.error('Ошибка создания'),
  });

  const handleCreate = () => {
    form.validateFields().then(values => createMutation.mutate(values));
  };

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong>Локаций: {locations.length}</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Новая локация
        </Button>
      </div>

      {locations.length === 0 ? (
        <Empty description="Локации ещё не созданы" />
      ) : (
        <Row gutter={[12, 12]}>
          {locations.map((loc, i) => (
            <Col xs={24} sm={12} lg={8} key={loc.location_id || i}>
              <Card
                size="small"
                hoverable
                onClick={() => setEditLoc(loc)}
                title={<Text strong style={{ fontSize: 13 }}>{loc.name}</Text>}
                extra={<EnvironmentOutlined style={{ color: '#d97706' }} />}
              >
                <Space direction="vertical" size={2}>
                  {loc.atmosphere && <Text type="secondary" style={{ fontSize: 12 }}>Атмосфера: {loc.atmosphere}</Text>}
                  {loc.architecture && <Text type="secondary" style={{ fontSize: 12 }}>Архитектура: {loc.architecture}</Text>}
                  {loc.lighting && <Text type="secondary" style={{ fontSize: 12 }}>Освещение: {loc.lighting}</Text>}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Modal */}
      <Modal
        title="Новая локация"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createMutation.isPending}
        okText="Создать"
      >
        <Form form={form} layout="vertical">
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
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={<Space><EditOutlined /> {editLoc?.name}</Space>}
        open={!!editLoc}
        onCancel={() => setEditLoc(null)}
        footer={null}
      >
        {editLoc && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID"><Text code>{editLoc.location_id}</Text></Descriptions.Item>
            <Descriptions.Item label="Название">{editLoc.name}</Descriptions.Item>
            <Descriptions.Item label="Атмосфера">{editLoc.atmosphere || '—'}</Descriptions.Item>
            <Descriptions.Item label="Архитектура">{editLoc.architecture || '—'}</Descriptions.Item>
            <Descriptions.Item label="Освещение">{editLoc.lighting || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ── Voice Input ──────────────────────────────────

function VoiceInputSection() {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const processMutation = useMutation({
    mutationFn: (text: string) => api.post('/book/visual-genome/from-speech', { text }),
    onSuccess: () => {
      message.success('Описание обработано');
      setText('');
      queryClient.invalidateQueries({ queryKey: ['genome-full'] });
    },
    onError: () => message.error('Ошибка обработки'),
  });

  return (
    <Card title={<><AudioOutlined /> Голосовой ввод</>}>
      <Paragraph type="secondary" style={{ fontSize: 13 }}>
        Опишите сцену текстом — AI преобразует описание в структурированные элементы.
      </Paragraph>
      <TextArea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        placeholder="Опишите сцену: «Старый воин стоит на берегу реки, закатное освещение, атмосфера меланхолии...»"
        style={{ marginBottom: 12 }}
      />
      <Button
        type="primary"
        icon={<AudioOutlined />}
        onClick={() => processMutation.mutate(text)}
        loading={processMutation.isPending}
        disabled={!text.trim()}
      >
        Обработать
      </Button>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────

function EditorContent() {
  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const items = [
    {
      key: 'scenes',
      label: <><BookOutlined /> Сцены</>,
      children: <ScenesEditor genome={genome} isLoading={isLoading} />,
    },
    {
      key: 'characters',
      label: <><TeamOutlined /> Персонажи</>,
      children: <CharactersEditor genome={genome} isLoading={isLoading} />,
    },
    {
      key: 'locations',
      label: <><EnvironmentOutlined /> Локации</>,
      children: <LocationsEditor genome={genome} isLoading={isLoading} />,
    },
    {
      key: 'voice',
      label: <><AudioOutlined /> Голос</>,
      children: <VoiceInputSection />,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>Редактор глав</Title>
        <Text type="secondary">Создавайте и редактируйте сцены, персонажей и локации книги</Text>
      </div>

      <Tabs items={items} />
    </div>
  );
}

export default function EditorPage() {
  return (
    <ProtectedRoute>
      <RoleGuard roles={['editor', 'admin']}>
        <EditorContent />
      </RoleGuard>
    </ProtectedRoute>
  );
}
