'use client';


// ── Streaming Search ──────────────────────────
function StreamingSearch() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const search = async () => {
    if (!query) return;
    setLoading(true);
    const res = await fetch('/book/world/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, limit: 10 }) });
    const data = await res.json();
    setResults(data.world_model || []);
    setLoading(false);
  };
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск..." style={{ width: 300, marginRight: 8 }} />
      <button onClick={search}>Найти</button>
      {loading && <div>Загрузка...</div>}
      {results.map((r, i) => <div key={i} style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{r.name} - {r.category}</div>)}
    </div>
  );
}


// ── Responsive Styles ──────────────────────────

const responsiveStyles = {
  container: { padding: '24px' },
  header: { marginBottom: 24 },
  statsRow: { marginBottom: 24 },
  card: { marginBottom: 16 },
  searchInput: { marginBottom: 16 },
  resultItem: { padding: '12px', borderBottom: '1px solid #f0f0f0' },
  tag: { marginRight: 8 },
  chartContainer: { height: 200, padding: '20px 0' },
};

import { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Button, Tabs, Tag, Space, Statistic, Table, Modal, Select, message, Spin, Descriptions, List, Typography } from 'antd';
import { SearchOutlined, DatabaseOutlined, LinkOutlined, PictureOutlined, CheckCircleOutlined, SettingOutlined, GlobalOutlined, AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const API_BASE = '/book/world';

interface WorldStats {
  total_entities: number;
  total_categories: number;
  categories: Record<string, number>;
}

interface Entity {
  id: string;
  name: string;
  category: string;
  description: string;
  properties: Record<string, any>;
}

interface Relation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  description: string;
  strength: number;
}

interface WorldMode {
  mode: string;
  name: string;
  description: string;
}

interface WorldRule {
  id: string;
  name: string;
  name_ru: string;
  description: string;
  description_ru: string;
  rule_type: string;
  severity: string;
}

export default function WorldEnginePage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorldStats | null>(null);
  
  // Chart data from stats
  const categoryChartData = stats ? Object.entries(stats.categories || {}).map(([cat, count], i) => ({
    label: cat,
    value: count,
    color: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#2f54eb', '#faad14', '#a0d911', '#f5222d', '#722ed1', '#1890ff'][i % 13],
  })) : [];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityContext, setEntityContext] = useState<any>(null);
  const [visualPrompt, setVisualPrompt] = useState('');
  const [modes, setModes] = useState<WorldMode[]>([]);
  const [rules, setRules] = useState<WorldRule[]>([]);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('search');

  // Load stats on mount
  useEffect(() => {
    loadStats();
    loadModes();
    loadRules();
    loadCategories();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/summary`);
      const data = await res.json();
      setStats(data.stats.world_model);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadModes = async () => {
    try {
      const res = await fetch(`${API_BASE}/modes`);
      const data = await res.json();
      setModes(data.modes);
    } catch (error) {
      console.error('Error loading modes:', error);
    }
  };

  const loadRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/rules`);
      const data = await res.json();
      setRules(data.rules);
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 20 }),
      });
      const data = await res.json();
      setSearchResults(data.world_model || []);
    } catch (error) {
      message.error('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const loadEntityContext = async (entityId: string) => {
    try {
      const res = await fetch(`${API_BASE}/entity/${entityId}/context`);
      const data = await res.json();
      setEntityContext(data);
      setSelectedEntity(data.entity);
    } catch (error) {
      message.error('Ошибка загрузки контекста');
    }
  };

  const generateVisualPrompt = async (entityId: string) => {
    try {
      const res = await fetch(`${API_BASE}/entity/${entityId}/visual-prompt?style=cinematic`);
      const data = await res.json();
      setVisualPrompt(data.prompt);
    } catch (error) {
      message.error('Ошибка генерации промпта');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 150 },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Категория', dataIndex: 'category', key: 'category', 
      render: (cat: string) => <Tag color="blue">{cat}</Tag> },
    { title: 'Описание', dataIndex: 'description', key: 'description', 
      render: (desc: string) => desc?.substring(0, 100) + '...' },
    { title: 'Действия', key: 'actions',
      render: (_: any, record: Entity) => (
        <Space>
          <Button size="small" onClick={() => loadEntityContext(record.id)}>Контекст</Button>
          <Button size="small" onClick={() => generateVisualPrompt(record.id)}>Промпт</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={responsiveStyles.container}>
      <Title level={2}>
        <GlobalOutlined /> World Engine
      </Title>
      <Paragraph>
        Вычислимая модель мира книги «Наследие Аркаима» — 547 сущностей, 287 связей, 55 форм
      </Paragraph>

      {/* Stats */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Сущностей" value={stats.total_entities} prefix={<DatabaseOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Категорий" value={stats.total_categories} prefix={<AppstoreOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Режимов" value={modes.length} prefix={<SettingOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Правил" value={rules.length} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Search Tab */}
        <TabPane tab={<span><SearchOutlined /> Поиск</span>} key="search">
          <Card>
            <Search
              placeholder="Поиск по миру (например: Аркаим, Гиперборея, философия)"
              enterButton="Найти"
              size="large"
              loading={loading}
              onSearch={handleSearch}
              style={{ marginBottom: 16 }}
            />
            
            <Table
              columns={columns}
              dataSource={searchResults}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        {/* Categories Tab */}
        <TabPane tab={<span><AppstoreOutlined /> Категории</span>} key="categories">
          <Card>
            <Row gutter={[16, 16]}>
              {Object.entries(categories).map(([cat, count]) => (
                <Col span={6} key={cat}>
                  <Card 
                    hoverable 
                    onClick={() => handleSearch(cat)}
                    style={{ textAlign: 'center' }}
                  >
                    <Statistic title={cat} value={count} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>

        {/* Modes Tab */}
        <TabPane tab={<span><SettingOutlined /> Режимы</span>} key="modes">
          <Card>
            <List
              dataSource={modes}
              renderItem={(mode: WorldMode) => (
                <List.Item>
                  <List.Item.Meta
                    title={mode.name}
                    description={mode.description}
                  />
                  <Tag color="green">{mode.mode}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* Rules Tab */}
        <TabPane tab={<span><CheckCircleOutlined /> Правила</span>} key="rules">
          <Card>
            <List
              dataSource={rules}
              renderItem={(rule: WorldRule) => (
                <List.Item>
                  <List.Item.Meta
                    title={rule.name_ru}
                    description={rule.description_ru}
                  />
                  <Space>
                    <Tag color={rule.severity === 'hard' ? 'red' : 'orange'}>{rule.severity}</Tag>
                    <Tag>{rule.rule_type}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* Visual Prompt Tab */}
        <TabPane tab={<span><PictureOutlined /> Визуал</span>} key="visual">
            {/* World Stats Charts */}
            {stats && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Card title="Сущности по категориям" size="small">
                    <WorldBarChart data={Object.entries(stats.categories || {}).map(([cat, count]) => ({ label: cat, value: count }))} height={180} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Распределение" size="small">
                    <WorldPieChart data={categoryChartData.slice(0, 6)} size={100} />
                  </Card>
                </Col>
              </Row>
            )}
          <Card title="Генерация визуального промпта">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search
                placeholder="ID сущности (например: region_arkaim)"
                enterButton="Генерировать"
                onSearch={(val) => generateVisualPrompt(val)}
              />
              {visualPrompt && (
                <Card type="inner" title="Промпт">
                  <Paragraph copyable>{visualPrompt}</Paragraph>
                </Card>
              )}
            </Space>
          </Card>
        </TabPane>

        {/* Entity Context Tab */}
        <TabPane tab={<span><FileTextOutlined /> Контекст</span>} key="context">
          <Card>
            {selectedEntity ? (
              <Descriptions bordered column={2}>
                <Descriptions.Item label="ID">{selectedEntity.id}</Descriptions.Item>
                <Descriptions.Item label="Название">{selectedEntity.name}</Descriptions.Item>
                <Descriptions.Item label="Категория">
                  <Tag color="blue">{selectedEntity.category}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Описание" span={2}>
                  {selectedEntity.description}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Paragraph type="secondary">Выберите сущность из поиска</Paragraph>
            )}

            {entityContext?.relations && (
              <Card title="Связи" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic 
                      title="Исходящих" 
                      value={entityContext.relations.outgoing_count} 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="Входящих" 
                      value={entityContext.relations.incoming_count} 
                    />
                  </Col>
                </Row>
              </Card>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
