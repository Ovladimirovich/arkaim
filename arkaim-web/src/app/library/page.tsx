'use client';


// ── World Tab ──────────────────────────
function WorldTab() {
  const [categories, setCategories] = React.useState({});
  React.useEffect(() => {
    fetch('/book/world/categories').then(r => r.json()).then(d => setCategories(d.categories || {}));
  }, []);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Object.entries(categories).map(([cat, count]) => (
          <div key={cat} style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{count}</div>
            <div>{cat}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


import { useState } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, List, Empty, Spin, Space, Input, Badge, Avatar, Tooltip, Descriptions, Modal, Divider } from 'antd';
import { BookOutlined, TeamOutlined, EnvironmentOutlined, HeartOutlined, SearchOutlined, BulbOutlined, StarOutlined, EyeOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
  author_intent: Record<string, unknown>;
};

type LayersData = {
  knowledge_layer: string;
  meaning_layer: string;
  identity_layer: string;
  mission_layer: string;
};

type EvolutionData = {
  current_version: string;
  snapshots: Array<{ version: string; created_at: string; description?: string }>;
};

// ── Genome Tab ──────────────────────────────────

function GenomeTab({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemType, setItemType] = useState('');

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome) return <Empty description="Данные генома не загружены" />;

  const filter = (items: any[]) =>
    !search ? items : items.filter(item =>
      (item.name || item.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.role || '').toLowerCase().includes(search.toLowerCase())
    );

  const themes = filter(genome.themes);
  const characters = filter(genome.characters);
  const values = filter(genome.values);
  const entities = filter(genome.world_entities);

  return (
    <div>
      <Input prefix={<SearchOutlined />} placeholder="Поиск по геному..." value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ marginBottom: 16, maxWidth: 400 }} />

      <Row gutter={[16, 16]}>
        {/* Themes */}
        <Col xs={24} lg={12}>
          <Card title={<><BulbOutlined style={{ color: '#7c3aed' }} /> Темы</>} extra={<Tag>{themes.length}</Tag>}>
            {themes.length === 0 ? <Empty description="Нет тем" /> : (
              <List size="small" dataSource={themes} renderItem={(item: any) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setItemType('theme'); }}>
                  <List.Item.Meta
                    avatar={<div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BulbOutlined style={{ color: '#7c3aed' }} /></div>}
                    title={<Text strong>{item.name}</Text>}
                    description={item.description && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{item.description}</Text>}
                  />
                  <EyeOutlined style={{ color: '#999' }} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        {/* Characters */}
        <Col xs={24} lg={12}>
          <Card title={<><TeamOutlined style={{ color: '#2563eb' }} /> Персонажи</>} extra={<Tag>{characters.length}</Tag>}>
            {characters.length === 0 ? <Empty description="Нет персонажей" /> : (
              <List size="small" dataSource={characters} renderItem={(item: any) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setItemType('character'); }}>
                  <List.Item.Meta
                    avatar={<Avatar size={32} style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>{item.name?.[0] || '?'}</Avatar>}
                    title={<Text strong>{item.name}</Text>}
                    description={<Space size={4}>{item.role && <Tag color="blue" style={{ fontSize: 10 }}>{item.role}</Tag>}</Space>}
                  />
                  <EyeOutlined style={{ color: '#999' }} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        {/* Values */}
        <Col xs={24} lg={12}>
          <Card title={<><StarOutlined style={{ color: '#059669' }} /> Ценности</>} extra={<Tag>{values.length}</Tag>}>
            {values.length === 0 ? <Empty description="Нет ценностей" /> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {values.map((item: any, i: number) => (
                  <Tooltip key={i} title={item.description}>
                    <Tag color="green" style={{ padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}
                      onClick={() => { setSelectedItem(item); setItemType('value'); }}>
                      {item.name}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* World entities */}
        <Col xs={24} lg={12}>
          <Card title={<><EnvironmentOutlined style={{ color: '#d97706' }} /> Мир</>} extra={<Tag>{entities.length}</Tag>}>
            {entities.length === 0 ? <Empty description="Нет сущностей мира" /> : (
              <List size="small" dataSource={entities} renderItem={(item: any) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => { setSelectedItem(item); setItemType('entity'); }}>
                  <List.Item.Meta
                    avatar={<div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EnvironmentOutlined style={{ color: '#d97706' }} /></div>}
                    title={<Text strong>{item.name}</Text>}
                    description={item.type && <Tag style={{ fontSize: 10 }}>{item.type}</Tag>}
                  />
                  <EyeOutlined style={{ color: '#999' }} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Detail Modal */}
      <Modal title={<Space>{selectedItem?.name}</Space>} open={!!selectedItem} onCancel={() => setSelectedItem(null)} footer={null} width={500}>
        {selectedItem && (
          <Descriptions bordered size="small" column={1}>
            {selectedItem.id && <Descriptions.Item label="ID"><Text code>{selectedItem.id}</Text></Descriptions.Item>}
            <Descriptions.Item label="Название">{selectedItem.name}</Descriptions.Item>
            {selectedItem.description && <Descriptions.Item label="Описание">{selectedItem.description}</Descriptions.Item>}
            {selectedItem.role && <Descriptions.Item label="Роль"><Tag color="blue">{selectedItem.role}</Tag></Descriptions.Item>}
            {selectedItem.type && <Descriptions.Item label="Тип"><Tag>{selectedItem.type}</Tag></Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ── Layers Tab ──────────────────────────────────

function LayersTab({ layers, isLoading }: { layers?: LayersData; isLoading: boolean }) {
  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!layers) return <Empty description="Слои сознания не сформированы" />;

  const layerConfig = [
    { key: 'knowledge_layer', title: 'Знание', color: '#2563eb', desc: 'Факты, события, персонажи', icon: '📚' },
    { key: 'meaning_layer', title: 'Смысл', color: '#7c3aed', desc: 'Метафоры, символы, аллегории', icon: '💡' },
    { key: 'identity_layer', title: 'Идентичность', color: '#059669', desc: 'Кто мы в контексте книги', icon: '🪞' },
    { key: 'mission_layer', title: 'Миссия', color: '#d97706', desc: 'Зачем книга существует', icon: '🎯' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {layerConfig.map(layer => {
        const content = layers[layer.key as keyof LayersData];
        return (
          <Col xs={24} sm={12} key={layer.key}>
            <Card size="small" style={{ height: '100%', borderTop: `3px solid ${layer.color}` }}
              title={<Space><span style={{ fontSize: 18 }}>{layer.icon}</span> <span style={{ color: layer.color }}>{layer.title}</span></Space>}
              extra={<Text type="secondary" style={{ fontSize: 11 }}>{layer.desc}</Text>}>
              {content ? (
                <Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{content}</Paragraph>
              ) : (
                <Text type="secondary" style={{ fontSize: 13, fontStyle: 'italic' }}>Слой пока не определён</Text>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

// ── Evolution Tab ──────────────────────────────────

function EvolutionTab({ evolution, isLoading }: { evolution?: EvolutionData; isLoading: boolean }) {
  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!evolution) return <Empty description="Данные об эволюции не загружены" />;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Текущая версия:</Text>
          <Tag color="blue" style={{ fontSize: 14 }}>{evolution.current_version}</Tag>
        </Space>
      </Card>

      {evolution.snapshots && evolution.snapshots.length > 0 ? (
        <List
          dataSource={evolution.snapshots}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<HistoryOutlined style={{ fontSize: 16, color: '#2563eb' }} />}
                title={<Space><Tag>{item.version}</Tag> <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleString('ru')}</Text></Space>}
                description={item.description}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="Пока нет снапшотов эволюции" />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function LibraryContent() {
  const { data: genome, isLoading: genomeLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const { data: layers, isLoading: layersLoading } = useQuery({
    queryKey: ['book-layers'],
    queryFn: () => api.get<LayersData>('/book/layers'),
  });

  const { data: evolution, isLoading: evolutionLoading } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: () => api.get<EvolutionData>('/book/evolution/status'),
  });

  const stats = genome ? {
    themes: genome.themes?.length || 0,
    characters: genome.characters?.length || 0,
    values: genome.values?.length || 0,
    entities: genome.world_entities?.length || 0,
  } : null;

  const items = [
    { key: 'genome', label: <><BookOutlined /> Геном книги</>, children: <GenomeTab genome={genome} isLoading={genomeLoading} /> },
    { key: 'layers', label: <><BulbOutlined /> Слои сознания</>, children: <LayersTab layers={layers} isLoading={layersLoading} /> },
    { key: 'evolution', label: <><HistoryOutlined /> Эволюция</>, children: <EvolutionTab evolution={evolution} isLoading={evolutionLoading} /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>Библиотека</Title>
          <Text type="secondary">Содержимое книги «Наследие Аркаима» — темы, персонажи, ценности, мир</Text>
        </div>
        <Space>
          <Link href="/genres"><Tag color="purple" style={{ cursor: 'pointer', padding: '4px 12px' }}>Жанры</Tag></Link>
          <Link href="/search"><Tag color="blue" style={{ cursor: 'pointer', padding: '4px 12px' }}>Поиск</Tag></Link>
        </Space>
      </div>

      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><Card size="small" hoverable><Space><BulbOutlined style={{ color: '#7c3aed', fontSize: 18 }} /><div><Text strong style={{ fontSize: 18 }}>{stats.themes}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>тем</Text></div></Space></Card></Col>
          <Col xs={12} sm={6}><Card size="small" hoverable><Space><TeamOutlined style={{ color: '#2563eb', fontSize: 18 }} /><div><Text strong style={{ fontSize: 18 }}>{stats.characters}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>персонажей</Text></div></Space></Card></Col>
          <Col xs={12} sm={6}><Card size="small" hoverable><Space><StarOutlined style={{ color: '#059669', fontSize: 18 }} /><div><Text strong style={{ fontSize: 18 }}>{stats.values}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>ценностей</Text></div></Space></Card></Col>
          <Col xs={12} sm={6}><Card size="small" hoverable><Space><EnvironmentOutlined style={{ color: '#d97706', fontSize: 18 }} /><div><Text strong style={{ fontSize: 18 }}>{stats.entities}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>сущностей мира</Text></div></Space></Card></Col>
        </Row>
      )}

      <Tabs items={items} />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <ProtectedRoute>
      <LibraryContent />
    </ProtectedRoute>
  );
}
