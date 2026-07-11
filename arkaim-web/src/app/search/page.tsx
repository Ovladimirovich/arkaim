'use client';

import { useState, useCallback } from 'react';
import { Card, Typography, Input, Tabs, Table, Tag, Space, Empty, Spin, List, Button, Select, Row, Col, Statistic } from 'antd';
import { SearchOutlined, DatabaseOutlined, BookOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
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
    { key: 'knowledge', label: <><BookOutlined /> Знания</>, children: <KnowledgeSearchPanel /> },
    { key: 'facts', label: <><FileTextOutlined /> Факты</>, children: <FactsSearchPanel /> },
    { key: 'entities', label: <><DatabaseOutlined /> Сущности</>, children: <EntitiesSearchPanel /> },
    { key: 'graph', label: 'Граф', children: <GraphSearchPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><SearchOutlined /> Поиск</Title>
      <Paragraph type="secondary">
        Ищите информацию в базе знаний книги «Наследие Аркаима» — знания, факты, сущности, связи.
      </Paragraph>
      <Tabs items={items} />
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
