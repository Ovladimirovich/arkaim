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




// ── World Stats Charts ──────────────────────────

function WorldBarChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '20px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 10, marginBottom: 4 }}>{d.value}</div>
          <div style={{
            width: '100%',
            height: `${(d.value / maxValue) * (height - 40)}px`,
            background: 'linear-gradient(180deg, #722ed1 0%, #531dab 100%)',
            borderRadius: '4px 4px 0 0',
          }} />
          <div style={{ fontSize: 9, marginTop: 4, textAlign: 'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function WorldPieChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${data.map(d => {
        const angle = (d.value / total) * 360;
        const result = `${d.color} ${currentAngle}deg ${currentAngle + angle}deg`;
        currentAngle += angle;
        return result;
      }).join(', ')})`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '30%', left: '30%', width: '40%', height: '40%', borderRadius: '50%', background: 'white' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
            <span>{d.label}: {d.value}</span>
          </div>
        ))}
      </div>
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<WorldRule | null>(null);
  const [categoryEntities, setCategoryEntities] = useState<any[]>([]);

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

  const loadCategoryEntities = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: category, limit: 50 }),
      });
      const data = await res.json();
      setCategoryEntities(data.world_model || []);
      setActiveTab('search');
    } catch (error) {
      message.error('Ошибка загрузки категории');
    } finally {
      setLoading(false);
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
            
            {selectedCategory && (
              <div style={{ marginBottom: 16 }}>
                <Tag color="purple" closable onClose={() => { setSelectedCategory(null); setCategoryEntities([]); }}>
                  Категория: {selectedCategory}
                </Tag>
              </div>
            )}
            <Table
              columns={columns}
              dataSource={selectedCategory ? categoryEntities : searchResults}
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
                    onClick={() => loadCategoryEntities(cat)}
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
          <Card title="Режимы работы World Engine">
            <p style={{ marginBottom: 16 }}>Выберите режим для перехода к соответствующему функционалу:</p>
            <List
              dataSource={modes}
              renderItem={(mode: WorldMode) => (
                <List.Item 
                  style={{ cursor: 'pointer', padding: '12px', marginBottom: 8, borderRadius: 8, border: '1px solid #f0f0f0' }}
                  onClick={() => {
                    const routes: Record<string, string> = {
                      'dialog': '/book',
                      'story': '/story',
                      'movie': '/film-studio',
                      'quest': '/world-explorer',
                      'game': '/world-explorer',
                      'research': '/search',
                      'lesson': '/library',
                      'timeline': '/map',
                      'documentary': '/film-studio',
                      'illustration': '/visual-view',
                    };
                    window.location.href = routes[mode.mode] || '/world-engine';
                  }}
                >
                  <List.Item.Meta
                    title={<span style={{ fontWeight: 'bold' }}>{mode.name}</span>}
                    description={mode.description}
                  />
                  <Space>
                    <Tag color="green">{mode.mode}</Tag>
                    <span style={{ color: '#1890ff' }}>→</span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* Rules Tab */}
        <TabPane tab={<span><CheckCircleOutlined /> Правила</span>} key="rules">
          <Card title="Правила консистентности мира">
            <p style={{ marginBottom: 16 }}>Правила определяют допустимость построений в мире книги:</p>
            <List
              dataSource={rules}
              renderItem={(rule: WorldRule) => (
                <List.Item 
                  style={{ cursor: 'pointer', padding: '12px', marginBottom: 8, borderRadius: 8, border: '1px solid #f0f0f0' }}
                  onClick={() => setSelectedRule(rule)}
                >
                  <List.Item.Meta
                    title={<span style={{ fontWeight: 'bold' }}>{rule.name_ru}</span>}
                    description={rule.description_ru?.substring(0, 100) + '...'}
                  />
                  <Space>
                    <Tag color={rule.severity === 'hard' ? 'red' : 'orange'}>{rule.severity}</Tag>
                    <Tag>{rule.rule_type}</Tag>
                    <span style={{ color: '#1890ff' }}>Подробнее →</span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
          
          {/* Rule Detail Modal */}
          <Modal
            title={selectedRule?.name_ru || 'Правило'}
            open={!!selectedRule}
            onCancel={() => setSelectedRule(null)}
            footer={[
              <Button key="close" onClick={() => setSelectedRule(null)}>Закрыть</Button>,
              <Button key="editor" type="primary" onClick={() => window.location.href = '/editor'}>
                Открыть редактор
              </Button>,
            ]}
            width={600}
          >
            {selectedRule && (
              <div>
                <p><strong>Описание:</strong> {selectedRule.description_ru}</p>
                <p><strong>Тип:</strong> <Tag>{selectedRule.rule_type}</Tag></p>
                <p><strong>Серьёзность:</strong> <Tag color={selectedRule.severity === 'hard' ? 'red' : 'orange'}>{selectedRule.severity}</Tag></p>
                <p style={{ marginTop: 16 }}>
                  <strong>Примеры нарушений:</strong>
                </p>
                <ul>
                  <li>Персонаж знает события из будущего</li>
                  <li>Персонаж находится в двух местах одновременно</li>
                  <li>Технология появилась до своей эпохи</li>
                </ul>
                <p style={{ marginTop: 16 }}>
                  <strong>Как проверить:</strong>
                </p>
                <ul>
                  <li>Используйте кнопку "Проверить" в редакторе</li>
                  <li>Вызовите API <code>/book/world/validate</code></li>
                </ul>
              </div>
            )}
          </Modal>
        </TabPane>

        {/* Visual Prompt Tab */}
        <TabPane tab={<span><PictureOutlined /> Визуал</span>} key="visual">
            {/* Category Tiles - Clickable */}
            {stats && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {Object.entries(stats.categories || {}).map(([cat, count]) => (
                  <Col span={6} key={cat}>
                    <Card 
                      hoverable 
                      onClick={() => loadCategoryEntities(cat)}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <Statistic title={cat} value={count} />
                      <div style={{ marginTop: 8, fontSize: 12, color: '#1890ff' }}>Нажмите для поиска →</div>
                    </Card>
                  </Col>
                ))}
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
          <Card title="Контекст сущности">
            <p style={{ marginBottom: 16 }}>Введите ID сущности для просмотра её контекста и связей:</p>
            <Input.Search
              placeholder="ID сущности (например: region_arkaim)"
              enterButton="Загрузить"
              size="large"
              onSearch={(val) => loadEntityContext(val)}
              style={{ marginBottom: 16 }}
            />

            {selectedEntity && (
              <>
                <Descriptions bordered column={2} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="ID">{selectedEntity.id}</Descriptions.Item>
                  <Descriptions.Item label="Название">{selectedEntity.name}</Descriptions.Item>
                  <Descriptions.Item label="Категория">
                    <Tag color="blue">{selectedEntity.category}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Описание" span={2}>
                    {selectedEntity.description}
                  </Descriptions.Item>
                </Descriptions>

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
                    {entityContext.relations.outgoing?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p><strong>Исходящие связи:</strong></p>
                        <List
                          size="small"
                          dataSource={entityContext.relations.outgoing.slice(0, 5)}
                          renderItem={(rel: any) => (
                            <List.Item>
                              <Tag>{rel.relation_type}</Tag> → {rel.target_id}
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}

            {!selectedEntity && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p>Введите ID сущности и нажмите "Загрузить"</p>
                <p style={{ fontSize: 12 }}>Примеры: region_arkaim, region_hyperborea</p>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
