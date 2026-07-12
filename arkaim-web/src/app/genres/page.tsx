'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Row, Col, Tag, Tabs, Empty, Spin, Space, Input, Badge, List, Tooltip } from 'antd';
import { BookOutlined, SearchOutlined, BulbOutlined, HeartOutlined, StarOutlined, ThunderboltOutlined, FireOutlined, EyeOutlined, TeamOutlined, EnvironmentOutlined, CrownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Text } = Typography;

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
  author_intent: Record<string, unknown>;
};

const GENRE_CATEGORIES = [
  { key: 'mythology', title: 'Мифология', icon: <ThunderboltOutlined />, color: '#a78bfa', keywords: ['миф', 'легенда', 'бог', 'божество', 'ритуал', 'обряд', 'древний', 'предание'] },
  { key: 'history', title: 'История', icon: <BookOutlined />, color: '#60a5fa', keywords: ['история', 'век', 'эпоха', 'царь', 'князь', 'битва', 'древний', 'цивилизация'] },
  { key: 'philosophy', title: 'Философия', icon: <EyeOutlined />, color: '#34d399', keywords: ['философия', 'смысл', 'истина', 'мудрость', 'познание', 'бытие', 'сознание'] },
  { key: 'adventure', title: 'Приключения', icon: <FireOutlined />, color: '#f87171', keywords: ['приключение', 'путешествие', 'поиск', 'открытие', 'экспедиция', 'путь'] },
  { key: 'mystery', title: 'Тайна', icon: <BulbOutlined />, color: '#818cf8', keywords: ['тайна', 'загадка', 'секрет', 'загадочный', 'неизвестный', 'пророчество'] },
  { key: 'spirituality', title: 'Духовность', icon: <StarOutlined />, color: '#fbbf24', keywords: ['духовность', 'медитация', 'осознанность', 'просветление', 'карма', 'учение'] },
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

function ThemesByGenre({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

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
      <Input prefix={<SearchOutlined />} placeholder="Поиск по темам..." value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ marginBottom: 16, maxWidth: 400, background: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />

      <Row gutter={[10, 10]} style={{ marginBottom: 24 }}>
        {GENRE_CATEGORIES.map(genre => {
          const count = (genreThemes[genre.key] || []).length;
          const isActive = selectedGenre === genre.key;
          return (
            <Col xs={12} sm={8} lg={4} key={genre.key}>
              <div onClick={() => setSelectedGenre(isActive ? null : genre.key)}
                style={{ padding: '14px 8px', borderRadius: 10, background: isActive ? `${genre.color}22` : '#1e293b', border: `2px solid ${isActive ? genre.color : '#334155'}`, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ color: genre.color, fontSize: 22, marginBottom: 6 }}>{genre.icon}</div>
                <Text style={{ fontSize: 12, color: '#e2e8f0' }}>{genre.title}</Text>
                <div style={{ marginTop: 4 }}><Badge count={count} style={{ backgroundColor: count > 0 ? genre.color : '#475569' }} size="small" /></div>
              </div>
            </Col>
          );
        })}
      </Row>

      {selectedGenre && selectedCat && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: '#1e293b', border: `1px solid ${selectedCat.color}44`, borderLeft: `3px solid ${selectedCat.color}`, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: selectedCat.color }}>{selectedCat.icon}</span>
            <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{selectedCat.title}</Text>
            <Tag style={{ background: '#334155', color: '#94a3b8', borderColor: '#475569', fontSize: 11 }}>{filteredThemes.length} тем</Tag>
          </div>
          <Row gutter={[8, 8]}>
            {filteredThemes.map((theme, i) => (
              <Col xs={24} sm={12} md={8} key={i}>
                <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 6, borderLeft: `2px solid ${selectedCat.color}` }}>
                  <Text style={{ fontSize: 13, color: '#e2e8f0' }}>{theme.name}</Text>
                  {theme.description && <div style={{ marginTop: 2 }}><Text style={{ fontSize: 11, color: '#94a3b8' }}>{theme.description}</Text></div>}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {!selectedGenre && (
        <div style={{ padding: '14px 18px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOutlined style={{ color: '#60a5fa' }} />
            <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>Все темы</Text>
            <Tag style={{ background: '#334155', color: '#94a3b8', borderColor: '#475569', fontSize: 11 }}>{filteredThemes.length}</Tag>
          </div>
          {filteredThemes.length === 0 ? <Empty description="Темы не найдены" /> : (
            <Row gutter={[8, 8]}>
              {filteredThemes.map((theme, i) => {
                const genres = detectGenre(theme.name, theme.description).filter(g => g !== 'other');
                return (
                  <Col xs={24} sm={12} md={8} key={i}>
                    <Tooltip title={theme.description}>
                      <div onClick={() => router.push(`/book?topic=${encodeURIComponent(theme.name)}`)}
                        style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 6, border: '1px solid #1e293b', cursor: 'pointer', transition: 'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                        <Text style={{ fontSize: 13, color: '#e2e8f0' }}>{theme.name}</Text>
                        {genres.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {genres.map(g => {
                              const cat = GENRE_CATEGORIES.find(c => c.key === g);
                              return cat ? <Tag key={g} style={{ fontSize: 10, margin: 0, background: `${cat.color}22`, color: cat.color, borderColor: `${cat.color}44` }}>{cat.title}</Tag> : null;
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
        </div>
      )}
    </div>
  );
}

function ValuesTab({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'description'>('name');

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome?.values || genome.values.length === 0) return <Empty description="Ценности не определены" />;

  const icons: Record<string, any> = { 'мудрость': <StarOutlined />, 'любовь': <HeartOutlined />, 'сила': <ThunderboltOutlined />, 'добра': <StarOutlined />, 'истина': <EyeOutlined /> };
  const colors: Record<string, string> = { 'мудрость': '#fbbf24', 'любовь': '#f87171', 'сила': '#60a5fa', 'добра': '#34d399', 'истина': '#a78bfa' };

  const filtered = genome.values
    .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.description || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a[sortBy] || '').localeCompare(b[sortBy] || ''));

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input prefix={<SearchOutlined />} placeholder="Поиск по ценностям..." value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 300, background: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
        <Input addonBefore="Сортировка" value={sortBy === 'name' ? 'По имени' : 'По описанию'} readOnly style={{ maxWidth: 200, background: '#1e293b', borderColor: '#334155', color: '#e2e8f0', cursor: 'pointer' }}
          onClick={() => setSortBy(sortBy === 'name' ? 'description' : 'name')} />
      </Space>
      <Row gutter={[12, 12]}>
        {filtered.map((value, i) => {
          const key = Object.keys(icons).find(k => value.name.toLowerCase().includes(k)) || '';
          const color = colors[key] || '#94a3b8';
          return (
            <Col xs={24} sm={12} md={8} key={i}>
              <div style={{ padding: '16px', background: '#1e293b', border: '1px solid #334155', borderTop: `3px solid ${color}`, borderRadius: 10, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <div style={{ fontSize: 24, color, flexShrink: 0 }}>{icons[key] || <StarOutlined />}</div>
                  <div>
                    <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>{value.name}</Text>
                    {value.description && <div style={{ marginTop: 4 }}><Text style={{ fontSize: 12, color: '#94a3b8' }}>{value.description}</Text></div>}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
      {filtered.length === 0 && <Empty description="Ценности не найдены" />}
    </div>
  );
}

function WorldTab({ genome, isLoading }: { genome?: GenomeData; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  if (isLoading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  if (!genome) return <Empty description="Данные не загружены" />;

  const allEntities = genome.world_entities || [];
  const characters = genome.characters || [];

  const typeConfig: Record<string, { icon: any; color: string }> = {
    location: { icon: <EnvironmentOutlined />, color: '#60a5fa' },
    character: { icon: <TeamOutlined />, color: '#a78bfa' },
    event: { icon: <ThunderboltOutlined />, color: '#f87171' },
    concept: { icon: <BulbOutlined />, color: '#34d399' },
    object: { icon: <CrownOutlined />, color: '#fbbf24' },
  };

  const filteredCharacters = characters.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.role || '').toLowerCase().includes(search.toLowerCase()));
  const filteredEntities = allEntities.filter(e => !typeFilter || e.type === typeFilter).filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));

  const byType: Record<string, any[]> = {};
  for (const entity of filteredEntities) {
    const t = entity.type || 'other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(entity);
  }

  const allTypes = [...new Set(allEntities.map(e => e.type || 'other'))];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input prefix={<SearchOutlined />} placeholder="Поиск по персонажам и сущностям..." value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 350, background: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }} />
        <Space size={4} wrap>
          <Tag style={{ cursor: 'pointer', background: !typeFilter ? '#3b82f6' : '#1e293b', color: !typeFilter ? '#fff' : '#94a3b8', borderColor: !typeFilter ? '#3b82f6' : '#334155' }} onClick={() => setTypeFilter(null)}>Все</Tag>
          {allTypes.map(t => {
            const config = typeConfig[t] || { icon: <BulbOutlined />, color: '#94a3b8' };
            return (
              <Tag key={t} style={{ cursor: 'pointer', background: typeFilter === t ? `${config.color}33` : '#1e293b', color: typeFilter === t ? config.color : '#94a3b8', borderColor: typeFilter === t ? config.color : '#334155' }} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                {config.icon} {t}
              </Tag>
            );
          })}
        </Space>
      </Space>

      {filteredCharacters.length > 0 && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TeamOutlined style={{ color: '#a78bfa' }} />
            <Text style={{ color: '#e2e8f0', fontWeight: 600 }}>Персонажи</Text>
            <Tag style={{ background: '#334155', color: '#94a3b8', borderColor: '#475569', fontSize: 11 }}>{filteredCharacters.length}</Tag>
          </div>
          <Row gutter={[8, 8]}>
            {filteredCharacters.map((char, i) => (
              <Col xs={24} sm={12} md={8} key={char.id || i}>
                <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{char.name}</Text>
                    {char.role && <Tag style={{ fontSize: 10, background: '#3b82f622', color: '#60a5fa', borderColor: '#3b82f644' }}>{char.role}</Tag>}
                  </div>
                  {char.description && <div style={{ marginTop: 4 }}><Text style={{ fontSize: 11, color: '#94a3b8' }}>{char.description}</Text></div>}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {Object.keys(byType).length > 0 ? (
        <Row gutter={[12, 12]}>
          {Object.entries(byType).map(([type, entities]) => {
            const config = typeConfig[type] || { icon: <BulbOutlined />, color: '#94a3b8' };
            return (
              <Col xs={24} sm={12} lg={8} key={type}>
                <div style={{ padding: '14px 18px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <Tag style={{ background: `${config.color}22`, color: config.color, borderColor: `${config.color}44` }}>{type}</Tag>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>{entities.length}</Text>
                  </div>
                  <List size="small" dataSource={entities} renderItem={(item: any) => (
                    <List.Item style={{ padding: '4px 0', borderBottom: '1px solid #1e293b' }}><Text style={{ fontSize: 13, color: '#e2e8f0' }}>{item.name}</Text></List.Item>
                  )} />
                </div>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Empty description="Сущности не найдены" />
      )}
    </div>
  );
}

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
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>Жанры</Text>
        <div style={{ marginTop: 4 }}><Text style={{ fontSize: 14, color: '#94a3b8' }}>Темы, ценности и мир книги «Наследие Аркаима» по категориям</Text></div>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <div style={{ padding: '16px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155', textAlign: 'center' }}>
            <BookOutlined style={{ fontSize: 20, color: '#60a5fa' }} />
            <div style={{ marginTop: 6 }}><Text style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{themeCount}</Text></div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>тем</Text>
          </div>
        </Col>
        <Col xs={8}>
          <div style={{ padding: '16px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155', textAlign: 'center' }}>
            <StarOutlined style={{ fontSize: 20, color: '#fbbf24' }} />
            <div style={{ marginTop: 6 }}><Text style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{valueCount}</Text></div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>ценностей</Text>
          </div>
        </Col>
        <Col xs={8}>
          <div style={{ padding: '16px', background: '#1e293b', borderRadius: 10, border: '1px solid #334155', textAlign: 'center' }}>
            <EyeOutlined style={{ fontSize: 20, color: '#a78bfa' }} />
            <div style={{ marginTop: 6 }}><Text style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{entityCount}</Text></div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>сущностей</Text>
          </div>
        </Col>
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
