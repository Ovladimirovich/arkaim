'use client';

import { useState } from 'react';
import { Card, Typography, Input, Tabs, Table, Tag, Space, Empty, Spin, List, Button, Row, Col, Badge } from 'antd';
import { SearchOutlined, DatabaseOutlined, BookOutlined, FileTextOutlined, TeamOutlined, BulbOutlined, GlobalOutlined, CommentOutlined, LikeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// ── Types ──────────────────────────────────────────

type SearchResult = {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
};

type FactResult = {
  id: string;
  statement: string;
  entity_id: string;
  confidence: number;
};

type EntityResult = {
  name: string;
  type?: string;
  resolved?: string;
};

type Interpretation = {
  id: string;
  reader_name: string;
  text: string;
  themes: string[];
  characters: string[];
  likes: number;
  created_at: string;
};

type Artifact = {
  id: string;
  reader_name: string;
  title: string;
  description: string;
  category: string;
  related_themes: string[];
  location: string;
  likes: number;
  created_at: string;
};

// ── Global Search Panel ──────────────────────────

function GlobalSearchPanel() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: knowledgeData, isLoading: knowledgeLoading } = useQuery({
    queryKey: ['search-knowledge', searchQuery],
    queryFn: () => api.post<{ results: SearchResult[] }>('/book/os/search', { query: searchQuery, n_results: 5 }),
    enabled: searchQuery.length >= 2,
  });

  const { data: communityData, isLoading: communityLoading } = useQuery({
    queryKey: ['search-community', searchQuery],
    queryFn: () => api.get<{ interpretations: Interpretation[]; artifacts: Artifact[]; total: number }>(`/book/community/search?q=${encodeURIComponent(searchQuery)}&limit=5`),
    enabled: searchQuery.length >= 2,
  });

  const isLoading = knowledgeLoading || communityLoading;
  const knowledgeResults = knowledgeData?.results || [];
  const interpretations = communityData?.interpretations || [];
  const artifacts = communityData?.artifacts || [];
  const totalResults = knowledgeResults.length + interpretations.length + artifacts.length;

  const handleSearch = (value: string) => {
    if (value.trim().length >= 2) {
      setSearchQuery(value.trim());
    }
  };

  return (
    <div>
      <Search
        placeholder="Поиск по всему — знания, факты, интерпретации, артефакты..."
        enterButton={<><SearchOutlined /> Найти</>}
        size="large"
        loading={isLoading}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {searchQuery && !isLoading && (
        <Tag color="blue" style={{ marginBottom: 16 }}>Найдено: {totalResults} результатов</Tag>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : totalResults > 0 ? (
        <Row gutter={[16, 16]}>
          {/* Knowledge */}
          {knowledgeResults.length > 0 && (
            <Col xs={24} lg={12}>
              <Card title={<><BookOutlined /> Знания ({knowledgeResults.length})</>} size="small">
                <List
                  size="small"
                  dataSource={knowledgeResults}
                  renderItem={(item: SearchResult) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={item.score > 0.7 ? 'green' : item.score > 0.4 ? 'blue' : 'default'}>
                              {(item.score * 100).toFixed(0)}%
                            </Tag>
                            <Text ellipsis style={{ maxWidth: 300 }}>{item.text.substring(0, 80)}...</Text>
                          </Space>
                        }
                        description={<Text type="secondary" style={{ fontSize: 11 }}>{item.metadata?.doc_id || ''}</Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}

          {/* Interpretations */}
          {interpretations.length > 0 && (
            <Col xs={24} lg={12}>
              <Card title={<><BulbOutlined /> Интерпретации ({interpretations.length})</>} size="small">
                <List
                  size="small"
                  dataSource={interpretations}
                  renderItem={(item: Interpretation) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{item.reader_name}</Text>
                            <LikeOutlined /> {item.likes}
                          </Space>
                        }
                        description={
                          <div>
                            <Text ellipsis style={{ fontSize: 12 }}>{item.text.substring(0, 100)}...</Text>
                            <br />
                            <Space wrap style={{ marginTop: 4 }}>
                              {item.themes.slice(0, 3).map((t, i) => <Tag key={i} style={{ fontSize: 10 }}>{t}</Tag>)}
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}

          {/* Artifacts */}
          {artifacts.length > 0 && (
            <Col xs={24} lg={12}>
              <Card title={<><DatabaseOutlined /> Артефакты ({artifacts.length})</>} size="small">
                <List
                  size="small"
                  dataSource={artifacts}
                  renderItem={(item: Artifact) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Tag color={item.category === 'archaeology' ? 'brown' : 'blue'}>{item.category}</Tag>
                            <Text strong>{item.title}</Text>
                            <LikeOutlined /> {item.likes}
                          </Space>
                        }
                        description={
                          <div>
                            <Text ellipsis style={{ fontSize: 12 }}>{item.description.substring(0, 100)}...</Text>
                            {item.location && <Text type="secondary" style={{ fontSize: 11 }}> · {item.location}</Text>}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}
        </Row>
      ) : searchQuery ? (
        <Empty description="Ничего не найдено" />
      ) : null}
    </div>
  );
}

// ── Knowledge Search Panel ──────────────────────────

function KnowledgeSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.post<{ results: SearchResult[] }>('/book/os/search', {
        query: query.trim(),
        n_results: 20,
      });
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Релевантность', dataIndex: 'score', key: 'score', width: 100, render: (v: number) => (
      <Tag color={v > 0.7 ? 'green' : v > 0.4 ? 'blue' : 'default'}>{(v * 100).toFixed(0)}%</Tag>
    )},
    { title: 'Текст', dataIndex: 'text', key: 'text', render: (v: string) => (
      <Text style={{ fontSize: 13 }}>{v.length > 200 ? v.slice(0, 200) + '...' : v}</Text>
    )},
    { title: 'Документ', key: 'doc', render: (_: any, r: SearchResult) => (
      <Tag>{r.metadata?.doc_id || '—'}</Tag>
    )},
  ];

  return (
    <div>
      <Search
        placeholder="Поиск по базе знаний книги..."
        enterButton="Найти"
        size="large"
        loading={loading}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {searched && (
        <Space style={{ marginBottom: 16 }}>
          <Tag>Найдено: {results.length} результатов</Tag>
        </Space>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : results.length > 0 ? (
        <Table columns={columns} dataSource={results} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      ) : searched ? (
        <Empty description="Ничего не найдено" />
      ) : null}
    </div>
  );
}

// ── Community Search Panel ──────────────────────────

function CommunitySearchPanel() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['community-search-tab', searchQuery],
    queryFn: () => api.get<{ interpretations: Interpretation[]; artifacts: Artifact[]; total: number }>(`/book/community/search?q=${encodeURIComponent(searchQuery)}&limit=20`),
    enabled: searchQuery.length >= 2,
  });

  const interpretations = data?.interpretations || [];
  const artifacts = data?.artifacts || [];

  const handleSearch = (value: string) => {
    if (value.trim().length >= 2) {
      setSearchQuery(value.trim());
    }
  };

  return (
    <div>
      <Search
        placeholder="Поиск по интерпретациям и артефактам сообщества..."
        enterButton="Найти"
        size="large"
        loading={isLoading}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : (interpretations.length + artifacts.length) > 0 ? (
        <Tabs
          items={[
            {
              key: 'interpretations',
              label: <><BulbOutlined /> Интерпретации ({interpretations.length})</>,
              children: (
                <List
                  dataSource={interpretations}
                  renderItem={(item: Interpretation) => (
                    <Card size="small" style={{ marginBottom: 8 }}>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{item.reader_name}</Text>
                          <LikeOutlined /> {item.likes}
                        </Space>
                        <Text>{item.text}</Text>
                        <Space wrap>
                          {item.themes.map((t, i) => <Tag key={i}>{t}</Tag>)}
                          {item.characters.map((c, i) => <Tag key={i} color="blue">{c}</Tag>)}
                        </Space>
                      </Space>
                    </Card>
                  )}
                />
              ),
            },
            {
              key: 'artifacts',
              label: <><DatabaseOutlined /> Артефакты ({artifacts.length})</>,
              children: (
                <List
                  dataSource={artifacts}
                  renderItem={(item: Artifact) => (
                    <Card size="small" style={{ marginBottom: 8 }} title={item.title}>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Space>
                          <Tag color={item.category === 'archaeology' ? 'brown' : 'blue'}>{item.category}</Tag>
                          <Text type="secondary">{item.location}</Text>
                          <LikeOutlined /> {item.likes}
                        </Space>
                        <Text>{item.description}</Text>
                        <Space wrap>
                          {item.related_themes.map((t, i) => <Tag key={i}>{t}</Tag>)}
                        </Space>
                      </Space>
                    </Card>
                  )}
                />
              ),
            },
          ]}
        />
      ) : searchQuery ? (
        <Empty description="Ничего не найдено" />
      ) : null}
    </div>
  );
}

// ── Facts Search Panel ──────────────────────────────

function FactsSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FactResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.get<{ facts: FactResult[] }>(`/book/os/facts/search?statement=${encodeURIComponent(query.trim())}`);
      setResults(data.facts || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Утверждение', dataIndex: 'statement', key: 'statement', render: (v: string) => <Text>{v}</Text> },
    { title: 'Сущность', dataIndex: 'entity_id', key: 'entity', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Уверенность', dataIndex: 'confidence', key: 'confidence', render: (v: number) => (
      <Tag color={v > 0.7 ? 'green' : v > 0.4 ? 'blue' : 'default'}>{(v * 100).toFixed(0)}%</Tag>
    )},
  ];

  return (
    <div>
      <Search
        placeholder="Поиск по фактам книги..."
        enterButton="Найти"
        size="large"
        loading={loading}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {searched && (
        <Space style={{ marginBottom: 16 }}>
          <Tag>Найдено: {results.length} фактов</Tag>
        </Space>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : results.length > 0 ? (
        <Table columns={columns} dataSource={results} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      ) : searched ? (
        <Empty description="Фактов не найдено" />
      ) : null}
    </div>
  );
}

// ── Entities Search Panel ──────────────────────────

function EntitiesSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.get<{ entities: EntityResult[] }>(`/book/os/entities?query=${encodeURIComponent(query.trim())}`);
      setResults(data.entities || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Тип', dataIndex: 'type', key: 'type', render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Разрешено', dataIndex: 'resolved', key: 'resolved', render: (v: string) => v || '—' },
  ];

  return (
    <div>
      <Search
        placeholder="Поиск по сущностям (персонажи, локации, события)..."
        enterButton="Найти"
        size="large"
        loading={loading}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {searched && (
        <Space style={{ marginBottom: 16 }}>
          <Tag>Найдено: {results.length} сущностей</Tag>
        </Space>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : results.length > 0 ? (
        <Table columns={columns} dataSource={results} rowKey="name" size="small" pagination={{ pageSize: 10 }} />
      ) : searched ? (
        <Empty description="Сущностей не найдено" />
      ) : null}
    </div>
  );
}

// ── Graph Search Panel ──────────────────────────────

function GraphSearchPanel() {
  const [entityId, setEntityId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!entityId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.get<{ neighbors: any[] }>(`/book/graph/entity/${encodeURIComponent(entityId.trim())}/neighbors?depth=2`);
      setResults(data.neighbors || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Название', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Тип', dataIndex: 'type', key: 'type', render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Связь', dataIndex: 'relationship', key: 'rel', render: (v: string) => v || '—' },
  ];

  return (
    <div>
      <Search
        placeholder="Введите ID сущности для поиска связей..."
        enterButton="Найти"
        size="large"
        loading={loading}
        value={entityId}
        onChange={e => setEntityId(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {searched && (
        <Space style={{ marginBottom: 16 }}>
          <Tag>Найдено: {results.length} связей</Tag>
        </Space>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : results.length > 0 ? (
        <Table columns={columns} dataSource={results} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
      ) : searched ? (
        <Empty description="Связей не найдено" />
      ) : null}
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function SearchContent() {
  const items = [
    { key: 'global', label: <><GlobalOutlined /> Везде</>, children: <GlobalSearchPanel /> },
    { key: 'knowledge', label: <><BookOutlined /> Знания</>, children: <KnowledgeSearchPanel /> },
    { key: 'community', label: <><TeamOutlined /> Сообщество</>, children: <CommunitySearchPanel /> },
    { key: 'facts', label: <><FileTextOutlined /> Факты</>, children: <FactsSearchPanel /> },
    { key: 'entities', label: <><DatabaseOutlined /> Сущности</>, children: <EntitiesSearchPanel /> },
    { key: 'graph', label: 'Граф', children: <GraphSearchPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><SearchOutlined /> Поиск</Title>
      <Paragraph type="secondary">
        Ищите информацию в базе знаний книги «Наследие Аркаима» — знания, факты, сущности, связи, интерпретации и артефакты сообщества.
      </Paragraph>
      <Tabs items={items} defaultActiveKey="global" />
    </div>
  );
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  );
}
