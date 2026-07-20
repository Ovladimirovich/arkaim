'use client';


// ── VisualContext Generator ──────────────────────────
function VisualContextGenerator() {
  const [entityId, setEntityId] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const generate = async () => {
    const res = await fetch(`/book/world/entity/${entityId}/visual-prompt?style=cinematic`);
    const data = await res.json();
    setPrompt(data.prompt || "Error");
  };
  return (
    <div style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 8, marginBottom: 16 }}>
      <h3>Генерация из VisualContext</h3>
      <input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="ID сущности" style={{ width: 300, marginRight: 8 }} />
      <button onClick={generate}>Генерировать</button>
      {prompt && <pre style={{ marginTop: 16, padding: 16, background: '#f6f8fa', borderRadius: 8 }}>{prompt}</pre>}
    </div>
  );
}


import { useState } from 'react';
import { Card, Typography, Row, Col, Tabs, Empty, Spin, Space, Tag, Input, Descriptions, Modal, Button, Divider, Avatar } from 'antd';
import { PictureOutlined, TeamOutlined, EnvironmentOutlined, SearchOutlined, EyeOutlined, BookOutlined, BulbOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

type GenomeData = {
  modules?: {
    scenes?: Array<{ chapter: number; scene_id: string; title: string; characters: string[]; location: string; emotion: string; meaning_tags: string[]; color_palette?: string[]; source?: string }>;
    character_visuals?: Array<{ character_id: string; name: string; archetype?: string; visual_description: string; color_palette: string[] }>;
    location_visuals?: Array<{ location_id: string; name: string; atmosphere?: string; architecture?: string; lighting?: string }>;
  };
  themes?: Array<{ name: string; description?: string }>;
  characters?: Array<{ id: string; name: string; role?: string; description?: string }>;
  world_entities?: Array<{ id: string; name: string; type?: string }>;
};

const EMOTION_COLORS: Record<string, string> = {
  neutral: '#6b7280', joy: '#f59e0b', sadness: '#3b82f6', anger: '#ef4444',
  fear: '#8b5cf6', surprise: '#10b981', mystery: '#6366f1',
};

// ── Scenes Gallery ──────────────────────────────────

function ScenesGallery({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [selectedScene, setSelectedScene] = useState<any>(null);

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  const scenes = (genome?.modules?.scenes || [])
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.characters?.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
      s.location?.toLowerCase().includes(search.toLowerCase()));

  if (scenes.length === 0) return <Empty description="Сцены не найдены" />;

  // Группировка по главам
  const chapters = scenes.reduce((acc, scene) => {
    const ch = scene.chapter || 0;
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(scene);
    return acc;
  }, {} as Record<number, typeof scenes>);

  return (
    <div>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по сценам..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      {Object.entries(chapters).sort(([a], [b]) => Number(a) - Number(b)).map(([chapter, chScenes]) => (
        <div key={chapter} style={{ marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 12 }}>
            <BookOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            Глава {chapter}
          </Title>
          <Row gutter={[12, 12]}>
            {chScenes.map((scene, i) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={scene.scene_id || i}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => setSelectedScene(scene)}
                  style={{ height: '100%', borderLeft: `3px solid ${EMOTION_COLORS[scene.emotion] || '#6b7280'}` }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 14 }}>{scene.title}</Text>
                    <Tag color={EMOTION_COLORS[scene.emotion] ? undefined : 'default'}
                      style={{ background: EMOTION_COLORS[scene.emotion] || '#6b7280', color: '#fff', border: 'none', fontSize: 10 }}>
                      {scene.emotion}
                    </Tag>
                  </div>

                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {scene.characters?.length > 0 && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        <TeamOutlined style={{ marginRight: 4 }} />
                        {scene.characters.join(', ')}
                      </div>
                    )}
                    {scene.location && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                        {scene.location}
                      </div>
                    )}
                  </Space>

                  {scene.meaning_tags?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {scene.meaning_tags.slice(0, 3).map((t: string, j: number) => (
                        <Tag key={j} style={{ fontSize: 10, margin: 0 }}>{t}</Tag>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <Modal
        title={<Space><EyeOutlined /> {selectedScene?.title}</Space>}
        open={!!selectedScene}
        onCancel={() => setSelectedScene(null)}
        footer={null}
        width={600}
      >
        {selectedScene && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 0', background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎭</div>
              <Title level={3} style={{ margin: 0 }}>{selectedScene.title}</Title>
              <Tag style={{ marginTop: 8, background: EMOTION_COLORS[selectedScene.emotion] || '#6b7280', color: '#fff', border: 'none' }}>
                {selectedScene.emotion}
              </Tag>
            </div>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Глава">{selectedScene.chapter}</Descriptions.Item>
              <Descriptions.Item label="Сцена ID"><Text code>{selectedScene.scene_id}</Text></Descriptions.Item>
              <Descriptions.Item label="Персонажи">
                {selectedScene.characters?.map((c: string, i: number) => <Tag key={i} icon={<TeamOutlined />}>{c}</Tag>) || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Локация">
                {selectedScene.location ? <Tag icon={<EnvironmentOutlined />}>{selectedScene.location}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Теги смысла">
                {selectedScene.meaning_tags?.map((t: string, i: number) => <Tag key={i} color="purple">{t}</Tag>) || '—'}
              </Descriptions.Item>
              {selectedScene.color_palette?.length > 0 && (
                <Descriptions.Item label="Палитра">
                  <Space>
                    {selectedScene.color_palette.map((c: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: c, border: '1px solid #ddd' }} />
                        <Text code style={{ fontSize: 11 }}>{c}</Text>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Characters Gallery ──────────────────────────────────

function CharactersGallery({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [selectedChar, setSelectedChar] = useState<any>(null);

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  const visuals = (genome?.modules?.character_visuals || [])
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.archetype?.toLowerCase().includes(search.toLowerCase()));

  const bookChars = (genome?.characters || [])
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по персонажам..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      {visuals.length > 0 && (
        <>
          <Title level={5}><BgColorsOutlined style={{ marginRight: 8 }} />Визуалы персонажей</Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            {visuals.map((char, i) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={char.character_id || i}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => setSelectedChar(char)}
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: 12 }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Avatar
                      size={48}
                      style={{ backgroundColor: char.color_palette?.[0] || '#2563eb', fontSize: 20, flexShrink: 0 }}
                    >
                      {char.name?.[0]}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 14 }}>{char.name}</Text>
                      {char.archetype && <div><Tag color="purple" style={{ fontSize: 10, marginTop: 2 }}>{char.archetype}</Tag></div>}
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
                        {char.visual_description}
                      </Paragraph>
                    </div>
                  </div>

                  {char.color_palette?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 3 }}>
                      {char.color_palette.slice(0, 6).map((c: string, j: number) => (
                        <div key={j} style={{ width: 14, height: 14, borderRadius: 3, background: c, border: '1px solid #ddd' }} />
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {bookChars.length > 0 && (
        <>
          <Title level={5}><BookOutlined style={{ marginRight: 8 }} />Персонажи книги</Title>
          <Row gutter={[12, 12]}>
            {bookChars.map((char, i) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={char.id || i}>
                <Card size="small" style={{ height: '100%' }} bodyStyle={{ padding: 12 }}>
                  <Space>
                    <Avatar size={32} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>{char.name?.[0]}</Avatar>
                    <div>
                      <Text strong style={{ fontSize: 13 }}>{char.name}</Text>
                      {char.role && <div><Text type="secondary" style={{ fontSize: 11 }}>{char.role}</Text></div>}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {visuals.length === 0 && bookChars.length === 0 && <Empty description="Персонажи не найдены" />}

      <Modal
        title={<Space><EyeOutlined /> {selectedChar?.name}</Space>}
        open={!!selectedChar}
        onCancel={() => setSelectedChar(null)}
        footer={null}
        width={600}
      >
        {selectedChar && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 0', background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <Avatar
                size={80}
                style={{ backgroundColor: selectedChar.color_palette?.[0] || '#2563eb', fontSize: 32 }}
              >
                {selectedChar.name?.[0]}
              </Avatar>
              <Title level={3} style={{ margin: '12px 0 4px' }}>{selectedChar.name}</Title>
              {selectedChar.archetype && <Tag color="purple">{selectedChar.archetype}</Tag>}
            </div>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID"><Text code>{selectedChar.character_id}</Text></Descriptions.Item>
              <Descriptions.Item label="Архетип">{selectedChar.archetype || '—'}</Descriptions.Item>
              <Descriptions.Item label="Описание">{selectedChar.visual_description || '—'}</Descriptions.Item>
              <Descriptions.Item label="Цветовая палитра">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedChar.color_palette?.map((c: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#f8fafc', borderRadius: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 4, background: c, border: '1px solid #ddd' }} />
                      <Text code style={{ fontSize: 11 }}>{c}</Text>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Locations Gallery ──────────────────────────────────

function LocationsGallery({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<any>(null);

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  const locations = (genome?.modules?.location_visuals || [])
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  if (locations.length === 0) return <Empty description="Локации не найдены" />;

  return (
    <div>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по локациям..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      <Row gutter={[12, 12]}>
        {locations.map((loc, i) => (
          <Col xs={24} sm={12} lg={8} key={loc.location_id || i}>
            <Card
              hoverable
              size="small"
              onClick={() => setSelectedLoc(loc)}
              style={{ height: '100%', borderLeft: '3px solid #d97706' }}
              bodyStyle={{ padding: 12 }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <EnvironmentOutlined style={{ fontSize: 20, color: '#d97706' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 14 }}>{loc.name}</Text>
                  <Space direction="vertical" size={1} style={{ width: '100%', marginTop: 4 }}>
                    {loc.atmosphere && <Text type="secondary" style={{ fontSize: 12 }}>Атмосфера: {loc.atmosphere}</Text>}
                    {loc.architecture && <Text type="secondary" style={{ fontSize: 12 }}>Архитектура: {loc.architecture}</Text>}
                    {loc.lighting && <Text type="secondary" style={{ fontSize: 12 }}>Освещение: {loc.lighting}</Text>}
                  </Space>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={<Space><EyeOutlined /> {selectedLoc?.name}</Space>}
        open={!!selectedLoc}
        onCancel={() => setSelectedLoc(null)}
        footer={null}
        width={500}
      >
        {selectedLoc && (
          <div>
            <div style={{ textAlign: 'center', padding: '24px 0', background: '#fef3c7', borderRadius: 8, marginBottom: 16 }}>
              <EnvironmentOutlined style={{ fontSize: 48, color: '#d97706' }} />
              <Title level={3} style={{ margin: '12px 0 0' }}>{selectedLoc.name}</Title>
            </div>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID"><Text code>{selectedLoc.location_id}</Text></Descriptions.Item>
              <Descriptions.Item label="Атмосфера">{selectedLoc.atmosphere || '—'}</Descriptions.Item>
              <Descriptions.Item label="Архитектура">{selectedLoc.architecture || '—'}</Descriptions.Item>
              <Descriptions.Item label="Освещение">{selectedLoc.lighting || '—'}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function VisualViewContent() {
  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const sceneCount = genome?.modules?.scenes?.length || 0;
  const charCount = genome?.modules?.character_visuals?.length || 0;
  const locCount = genome?.modules?.location_visuals?.length || 0;

  const items = [
    {
      key: 'scenes',
      label: <><BookOutlined /> Сцены <Tag>{sceneCount}</Tag></>,
      children: <ScenesGallery genome={genome} isLoading={isLoading} />,
    },
    {
      key: 'characters',
      label: <><TeamOutlined /> Персонажи <Tag>{charCount}</Tag></>,
      children: <CharactersGallery genome={genome} isLoading={isLoading} />,
    },
    {
      key: 'locations',
      label: <><EnvironmentOutlined /> Локации <Tag>{locCount}</Tag></>,
      children: <LocationsGallery genome={genome} isLoading={isLoading} />,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>Визуал</Title>
        <Text type="secondary">Просмотр сцен, персонажей и локаций книги «Наследие Аркаима»</Text>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <BookOutlined style={{ fontSize: 20, color: '#2563eb' }} />
              <div><Text strong style={{ fontSize: 18 }}>{sceneCount}</Text></div>
              <Text type="secondary" style={{ fontSize: 11 }}>сцен</Text>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 20, color: '#7c3aed' }} />
              <div><Text strong style={{ fontSize: 18 }}>{charCount}</Text></div>
              <Text type="secondary" style={{ fontSize: 11 }}>персонажей</Text>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <EnvironmentOutlined style={{ fontSize: 20, color: '#d97706' }} />
              <div><Text strong style={{ fontSize: 18 }}>{locCount}</Text></div>
              <Text type="secondary" style={{ fontSize: 11 }}>локаций</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs items={items} />
    </div>
  );
}

export default function VisualViewPage() {
  return (
    <ProtectedRoute>
      <VisualViewContent />
    </ProtectedRoute>
  );
}
