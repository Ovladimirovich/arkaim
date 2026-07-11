'use client';

import { useState } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, Empty, Spin, Space, Input, Progress, Divider, List, Tooltip, Badge } from 'antd';
import { BookOutlined, SearchOutlined, BulbOutlined, HeartOutlined, StarOutlined, ThunderboltOutlined, FireOutlined, EyeOutlined, TeamOutlined, EnvironmentOutlined, CrownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text } = Typography;

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
  author_intent: Record<string, unknown>;
};

// Жанровые категории
const GENRE_CATEGORIES = [
  { key: 'mythology', title: 'Мифология', icon: <ThunderboltOutlined />, color: '#7c3aed', bg: '#f5f3ff', desc: 'Древние мифы и легенды', keywords: ['миф', 'легенда', 'бог', 'божество', 'ритуал', 'обряд', 'древний', 'предание'] },
  { key: 'history', title: 'История', icon: <BookOutlined />, color: '#2563eb', bg: '#eff6ff', desc: 'Исторические события и личности', keywords: ['история', 'век', 'эпоха', 'царь', 'князь', 'битва', 'древний', 'цивилизация'] },
  { key: 'philosophy', title: 'Философия', icon: <EyeOutlined />, color: '#059669', bg: '#ecfdf5', desc: 'Размышления о смысле жизни', keywords: ['философия', 'смысл', 'истина', 'мудрость', 'познание', 'бытие', 'сознание'] },
  { key: 'adventure', title: 'Приключения', icon: <FireOutlined />, color: '#dc2626', bg: '#fef2f2', desc: 'Путешествия и открытия', keywords: ['приключение', 'путешествие', 'поиск', 'открытие', 'экспедиция', 'путь'] },
  { key: 'mystery', title: 'Тайна', icon: <BulbOutlined />, color: '#6366f1', bg: '#eef2ff', desc: 'Загадки и тайны', keywords: ['тайна', 'загадка', 'секрет', 'загадочный', 'неизвестный', 'пророчество'] },
  { key: 'spirituality', title: 'Духовность', icon: <StarOutlined />, color: '#d97706', bg: '#fffbeb', desc: 'Духовные практики и учения', keywords: ['духовность', 'медитация', 'осознанность', 'просветление', 'карма', 'учение'] },
];

function detectGenre(name: string, description?: string): string[] {
  const text = `${name} ${description || ''}`.toLowerCase();
  const genres: string[] = [];
  for (const cat of GENRE_CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw))) genres.push(cat.key);
  }
  if (genres.length === 0) genres.push('other');
  return genres;
}

// ── Themes by Genre ──────────────────────────────────

function ThemesByGenre({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome) return <Empty description="Данные не загружены" />;

  const genreThemes: Record<string, any[]> = {};
  for (const cat of GENRE_CATEGORIES) genreThemes[cat.key] = [];
  genreThemes['other'] = [];

  for (const theme of genome.themes) {
    if (search && !theme.name.toLowerCase().includes(search.toLowerCase()) && !(theme.description || '').toLowerCase().includes(search.toLowerCase())) continue;
    for (const g of detectGenre(theme.name, theme.description)) {
      if (!genreThemes[g]) genreThemes[g] = [];
      genreThemes[g].push(theme);
    }
  }

  const filteredThemes = selectedGenre
    ? (genreThemes[selectedGenre] || [])
    : genome.themes.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()));

  const selectedCat = GENRE_CATEGORIES.find(c => c.key === selectedGenre);

  return (
    <div>
      <Input prefix={<SearchOutlined />} placeholder="Поиск по темам..." value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ marginBottom: 16, maxWidth: 400 }} />

      {/* Genre selector */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {GENRE_CATEGORIES.map(genre => {
          const count = (genreThemes[genre.key] || []).length;
          const isActive = selectedGenre === genre.key;
          return (
            <Col xs={12} sm={8} lg={4} key={genre.key}>
              <div onClick={() => setSelectedGenre(isActive ? null : genre.key)} style={{ padding: '12px 8px', borderRadius: 8, background: isActive ? genre.bg : '#fafafa', border: `2px solid ${isActive ? genre.color : 'transparent'}`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ color: genre.color, fontSize: 24, marginBottom: 4 }}>{genre.icon}</div>
                <Text strong style={{ fontSize: 12 }}>{genre.title}</Text>
                <div><Badge count={count} style={{ backgroundColor: count > 0 ? genre.color : '#d9d9d9' }} size="small" /></div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Selected genre detail */}
      {selectedGenre && selectedCat && (
        <Card size="small" style={{ marginBottom: 16, borderLeft: `3px solid ${selectedCat.color}` }} title={<Space>{selectedCat.icon} {selectedCat.title}</Space>} extra={<Tag>{filteredThemes.length} тем</Tag>}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>{selectedCat.desc}</Text>
          <Row gutter={[8, 8]}>
            {filteredThemes.map((theme, i) => (
              <Col xs={24} sm={12} md={8} key={i}>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: `2px solid ${selectedCat.color}` }}>
                  <Text strong style={{ fontSize: 13 }}>{theme.name}</Text>
                  {theme.description && <div><Text type="secondary" style={{ fontSize: 11 }}>{theme.description}</Text></div>}
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* All themes */}
      {!selectedGenre && (
        <Card title={<><BookOutlined /> Все темы</>} extra={<Tag>{filteredThemes.length}</Tag>}>
          {filteredThemes.length === 0 ? <Empty description="Темы не найдены" /> : (
            <Row gutter={[8, 8]}>
              {filteredThemes.map((theme, i) => {
                const genres = detectGenre(theme.name, theme.description).filter(g => g !== 'other');
                return (
                  <Col xs={24} sm={12} md={8} key={i}>
                    <Tooltip title={theme.description}>
                      <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, cursor: 'default' }}>
                        <Text strong style={{ fontSize: 13 }}>{theme.name}</Text>
                        {genres.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {genres.map(g => {
                              const cat = GENRE_CATEGORIES.find(c => c.key === g);
                              return cat ? <Tag key={g} style={{ fontSize: 10, margin: 0, marginRight: 4, color: cat.color, borderColor: cat.color }}>{cat.title}</Tag> : null;
                            })}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Values Tab ──────────────────────────────────

function ValuesTab({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome?.values || genome.values.length === 0) return <Empty description="Ценности не определены" />;

  const icons: Record<string, any> = { 'мудрость': <StarOutlined />, 'любовь': <HeartOutlined />, 'сила': <ThunderboltOutlined />, 'добра': <StarOutlined />, 'истина': <EyeOutlined /> };
  const colors: Record<string, string> = { 'мудрость': '#d97706', 'любовь': '#dc2626', 'сила': '#2563eb', 'добра': '#059669', 'истина': '#7c3aed' };

  return (
    <Row gutter={[12, 12]}>
      {genome.values.map((value, i) => {
        const key = Object.keys(icons).find(k => value.name.toLowerCase().includes(k)) || '';
        return (
          <Col xs={24} sm={12} md={8} key={i}>
            <Card size="small" hoverable style={{ height: '100%', borderTop: `3px solid ${colors[key] || '#6b7280'}` }}>
              <Space align="start">
                <div style={{ fontSize: 24, color: colors[key] || '#6b7280' }}>{icons[key] || <StarOutlined />}</div>
                <div>
                  <Text strong>{value.name}</Text>
                  {value.description && <div><Text type="secondary" style={{ fontSize: 12 }}>{value.description}</Text></div>}
                </div>
              </Space>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

// ── World Tab ──────────────────────────────────

function WorldTab({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome) return <Empty description="Данные не загружены" />;

  const allEntities = genome.world_entities || [];
  const characters = genome.characters || [];

  const typeConfig: Record<string, { icon: any; color: string }> = {
    location: { icon: <EnvironmentOutlined />, color: '#2563eb' },
    character: { icon: <TeamOutlined />, color: '#7c3aed' },
    event: { icon: <ThunderboltOutlined />, color: '#dc2626' },
    concept: { icon: <BulbOutlined />, color: '#059669' },
    object: { icon: <CrownOutlined />, color: '#d97706' },
  };

  const byType: Record<string, any[]> = {};
  for (const entity of allEntities) {
    const t = entity.type || 'other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(entity);
  }

  return (
    <div>
      {/* Characters from genome */}
      {characters.length > 0 && (
        <Card title={<><TeamOutlined /> Персонажи</>} extra={<Tag>{characters.length}</Tag>} style={{ marginBottom: 16 }}>
          <Row gutter={[8, 8]}>
            {characters.map((char, i) => (
              <Col xs={24} sm={12} md={8} key={char.id || i}>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                  <Text strong style={{ fontSize: 13 }}>{char.name}</Text>
                  {char.role && <Tag color="blue" style={{ fontSize: 10, marginLeft: 8 }}>{char.role}</Tag>}
                  {char.description && <div><Text type="secondary" style={{ fontSize: 11 }}>{char.description}</Text></div>}
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* World entities */}
      {Object.keys(byType).length > 0 ? (
        <Row gutter={[16, 16]}>
          {Object.entries(byType).map(([type, entities]) => {
            const config = typeConfig[type] || { icon: <BulbOutlined />, color: '#6b7280' };
            return (
              <Col xs={24} sm={12} lg={8} key={type}>
                <Card size="small" title={<Space>{config.icon} <Tag color={config.color}>{type}</Tag> <Text style={{ fontSize: 13 }}>{entities.length}</Text></Space>}>
                  <List size="small" dataSource={entities} renderItem={(item: any) => (
                    <List.Item style={{ padding: '4px 0' }}><Text style={{ fontSize: 13 }}>{item.name}</Text></List.Item>
                  )} />
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Empty description="Сущности мира не определены" />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function GenresContent() {
  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const themeCount = genome?.themes?.length || 0;
  const valueCount = genome?.values?.length || 0;
  const entityCount = (genome?.world_entities?.length || 0) + (genome?.characters?.length || 0);

  const items = [
    { key: 'genres', label: <><BookOutlined /> Жанры</>, children: <ThemesByGenre genome={genome} isLoading={isLoading} /> },
    { key: 'values', label: <><StarOutlined /> Ценности</>, children: <ValuesTab genome={genome} isLoading={isLoading} /> },
    { key: 'world', label: <><EyeOutlined /> Мир</>, children: <WorldTab genome={genome} isLoading={isLoading} /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 4 }}>Жанры</Title>
        <Text type="secondary">Темы, ценности и мир книги «Наследие Аркаима» по категориям</Text>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><BookOutlined style={{ fontSize: 20, color: '#2563eb' }} /><div><Text strong style={{ fontSize: 18 }}>{themeCount}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>тем</Text></div></Card></Col>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><StarOutlined style={{ fontSize: 20, color: '#d97706' }} /><div><Text strong style={{ fontSize: 18 }}>{valueCount}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>ценностей</Text></div></Card></Col>
        <Col xs={8}><Card size="small" hoverable><div style={{ textAlign: 'center' }}><EyeOutlined style={{ fontSize: 20, color: '#7c3aed' }} /><div><Text strong style={{ fontSize: 18 }}>{entityCount}</Text></div><Text type="secondary" style={{ fontSize: 11 }}>сущностей</Text></div></Card></Col>
      </Row>

      <Tabs items={items} />
    </div>
  );
}

export default function GenresPage() {
  return (
    <ProtectedRoute>
      <GenresContent />
    </ProtectedRoute>
  );
}
