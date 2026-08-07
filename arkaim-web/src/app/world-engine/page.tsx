'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { LCard, LTag, LSpace, LStatistic, LTable, LModal, LButton, LInput, LTextArea, LTabs, toast } from '@/shared/ui/light';
import { SearchOutlined, DatabaseOutlined, LinkOutlined, PictureOutlined, CheckCircleOutlined, SettingOutlined, GlobalOutlined, AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';

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

  useEffect(() => {
    loadStats();
    loadModes();
    loadRules();
    loadCategories();
  }, []);

  const loadStats = async () => {
    try { const data = await api.get<{ stats: WorldStats }>("/book/world/summary"); setStats(data.stats); }
    catch (e) { console.error('Error loading stats:', e); }
  };

  const loadModes = async () => {
    try { const data = await api.get<{ modes: WorldMode[] }>("/book/world/modes"); setModes(data.modes); }
    catch (e) { console.error('Error loading modes:', e); }
  };

  const loadRules = async () => {
    try { const data = await api.get<{ rules: WorldRule[] }>("/book/world/rules"); setRules(data.rules); }
    catch (e) { console.error('Error loading rules:', e); }
  };

  const loadCategories = async () => {
    try { const data = await api.get<{ categories: Record<string, number> }>("/book/world/categories"); setCategories(data.categories); }
    catch (e) { console.error('Error loading categories:', e); }
  };

  const loadCategoryEntities = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: category, limit: 50 }) });
      const data = await res.json();
      setCategoryEntities(data.world_model || []);
      setActiveTab('search');
    } catch { toast.error('Ошибка загрузки категории'); }
    finally { setLoading(false); }
  };

  const handleSearch = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, limit: 20 }) });
      const data = await res.json();
      setSearchResults(data.world_model || []);
    } catch { toast.error('Ошибка поиска'); }
    finally { setLoading(false); }
  };

  const loadEntityContext = async (entityId: string) => {
    try {
      const data = await api.get<{ entity: Entity; relations: { outgoing_count: number; incoming_count: number; outgoing: { relation_type: string; target_id: string }[] } }>(`/book/world/entity/${entityId}/context`);
      setEntityContext(data);
      setSelectedEntity(data.entity);
    } catch { toast.error('Ошибка загрузки контекста'); }
  };

  const generateVisualPrompt = async (entityId: string) => {
    try {
      const data = await api.get<{ prompt: string }>(`/book/world/entity/${entityId}/visual-prompt?style=cinematic`);
      setVisualPrompt(data.prompt);
    } catch { toast.error('Ошибка генерации промпта'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 150 },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Категория', dataIndex: 'category', key: 'category',
      render: (v: unknown) => <LTag color="blue">{String(v)}</LTag> },
    { title: 'Описание', dataIndex: 'description', key: 'description',
      render: (v: unknown) => String(v).substring(0, 100) + '...' },
    { title: 'Действия', key: 'actions',
      render: (_: unknown, record: unknown) => {
        const r = record as Entity;
        return <LSpace><LButton size="small" onClick={() => loadEntityContext(r.id)}>Контекст</LButton><LButton size="small" onClick={() => generateVisualPrompt(r.id)}>Промпт</LButton></LSpace>;
      },
    },
  ];

  const tagColors = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#2f54eb'];

  return (
    <div style={{ padding: 24 }}>
      <h2><GlobalOutlined /> World Engine</h2>
      <p style={{ color: '#999' }}>Вычислимая модель мира книги «Наследие Аркаима» — 547 сущностей, 287 связей, 55 форм</p>

      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1 }}><LCard><LStatistic title="Сущностей" value={stats.total_entities} prefix={<DatabaseOutlined />} /></LCard></div>
          <div style={{ flex: 1 }}><LCard><LStatistic title="Категорий" value={stats.total_categories} prefix={<AppstoreOutlined />} /></LCard></div>
          <div style={{ flex: 1 }}><LCard><LStatistic title="Режимов" value={modes.length} prefix={<SettingOutlined />} /></LCard></div>
          <div style={{ flex: 1 }}><LCard><LStatistic title="Правил" value={rules.length} prefix={<CheckCircleOutlined />} /></LCard></div>
        </div>
      )}

      <LTabs items={[
        { key: 'search', label: <><SearchOutlined /> Поиск</>, children: (
          <LCard>
            <LSpace style={{ marginBottom: 16 }}>
              <LInput placeholder="Поиск по миру (например: Аркаим, Гиперборея, философия)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: 400 }} />
              <LButton type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => handleSearch(searchQuery)}>Найти</LButton>
            </LSpace>
            {selectedCategory && (
              <div style={{ marginBottom: 16 }}>
                <LTag color="purple" style={{ cursor: 'default' }} onClick={() => { setSelectedCategory(null); setCategoryEntities([]); }}>
                  ✕ Категория: {selectedCategory}
                </LTag>
              </div>
            )}
            <LTable columns={columns} dataSource={selectedCategory ? categoryEntities : searchResults} rowKey="id" pagination={{ pageSize: 10 }} />
          </LCard>
        )},
        { key: 'categories', label: <><AppstoreOutlined /> Категории</>, children: (
          <LCard>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {Object.entries(categories).map(([cat, count], i) => (
                <div key={cat} style={{ flex: '1 1 calc(25% - 16px)', minWidth: 150 }}>
                  <LCard hoverable onClick={() => loadCategoryEntities(cat)} style={{ textAlign: 'center' }}>
                    <LStatistic title={cat} value={count} />
                  </LCard>
                </div>
              ))}
            </div>
          </LCard>
        )},
        { key: 'modes', label: <><SettingOutlined /> Режимы</>, children: (
          <LCard title="Режимы работы World Engine">
            <p style={{ marginBottom: 16 }}>Выберите режим для перехода к соответствующему функционалу:</p>
            {modes.map((mode) => {
              const routes: Record<string, string> = { 'dialog': '/book', 'story': '/story', 'movie': '/film-studio', 'quest': '/world-explorer', 'game': '/world-explorer', 'research': '/search', 'lesson': '/library', 'timeline': '/map', 'documentary': '/film-studio', 'illustration': '/visual-view' };
              return (
                <div key={mode.mode} style={{ cursor: 'pointer', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => { window.location.href = routes[mode.mode] || '/world-engine'; }}>
                  <div><strong>{mode.name}</strong><div style={{ fontSize: 12, color: '#666' }}>{mode.description}</div></div>
                  <LSpace><LTag color="green">{mode.mode}</LTag><span style={{ color: '#1890ff' }}>→</span></LSpace>
                </div>
              );
            })}
          </LCard>
        )},
        { key: 'rules', label: <><CheckCircleOutlined /> Правила</>, children: (
          <LCard title="Правила консистентности мира">
            <p style={{ marginBottom: 16 }}>Правила определяют допустимость построений в мире книги:</p>
            {rules.map((rule) => (
              <div key={rule.id} style={{ cursor: 'pointer', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setSelectedRule(rule)}>
                <div><strong>{rule.name_ru}</strong><div style={{ fontSize: 12, color: '#666' }}>{rule.description_ru?.substring(0, 100) + '...'}</div></div>
                <LSpace><LTag color={rule.severity === 'hard' ? 'red' : 'orange'}>{rule.severity}</LTag><LTag>{rule.rule_type}</LTag><span style={{ color: '#1890ff' }}>Подробнее →</span></LSpace>
              </div>
            ))}

            <LModal open={!!selectedRule} title={selectedRule?.name_ru || 'Правило'} onCancel={() => setSelectedRule(null)}
              width={600}
              footer={<><LButton onClick={() => setSelectedRule(null)}>Закрыть</LButton><LButton type="primary" onClick={() => window.location.href = '/editor'}>Открыть редактор</LButton></>}>
              {selectedRule && (
                <div>
                  <p><strong>Описание:</strong> {selectedRule.description_ru}</p>
                  <p><strong>Тип:</strong> <LTag>{selectedRule.rule_type}</LTag></p>
                  <p><strong>Серьёзность:</strong> <LTag color={selectedRule.severity === 'hard' ? 'red' : 'orange'}>{selectedRule.severity}</LTag></p>
                </div>
              )}
            </LModal>
          </LCard>
        )},
        { key: 'visual', label: <><PictureOutlined /> Визуал</>, children: (
          <>
            {stats && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                {Object.entries(stats.categories || {}).map(([cat, count], i) => (
                  <div key={cat} style={{ flex: '1 1 calc(25% - 16px)', minWidth: 150 }}>
                    <LCard hoverable onClick={() => loadCategoryEntities(cat)} style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <LStatistic title={cat} value={count} />
                      <div style={{ marginTop: 8, fontSize: 12, color: '#1890ff' }}>Нажмите для поиска →</div>
                    </LCard>
                  </div>
                ))}
              </div>
            )}
            <LCard title="Генерация визуального промпта">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <LSpace>
                  <LInput placeholder="ID сущности (например: region_arkaim)" id="visual-entity-id" style={{ width: 400 }} />
                  <LButton type="primary" icon={<PictureOutlined />} onClick={() => {
                    const el = document.getElementById('visual-entity-id') as HTMLInputElement;
                    if (el) generateVisualPrompt(el.value);
                  }}>Генерировать</LButton>
                </LSpace>
                {visualPrompt && (
                  <LCard size="small" title="Промпт" style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 13 }}>{visualPrompt}</p>
                  </LCard>
                )}
              </div>
            </LCard>
          </>
        )},
        { key: 'context', label: <><FileTextOutlined /> Контекст</>, children: (
          <LCard title="Контекст сущности">
            <p style={{ marginBottom: 16 }}>Введите ID сущности для просмотра её контекста и связей:</p>
            <LSpace style={{ marginBottom: 16 }}>
              <LInput placeholder="ID сущности (например: region_arkaim)" id="context-entity-id" style={{ width: 400 }} />
              <LButton type="primary" icon={<SearchOutlined />} onClick={() => {
                const el = document.getElementById('context-entity-id') as HTMLInputElement;
                if (el) loadEntityContext(el.value);
              }}>Загрузить</LButton>
            </LSpace>

            {selectedEntity && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, padding: 16, border: '1px solid var(--card-border)', borderRadius: 8 }}>
                  <div style={{ flex: '1 1 50%' }}><strong>ID:</strong> {selectedEntity.id}</div>
                  <div style={{ flex: '1 1 50%' }}><strong>Название:</strong> {selectedEntity.name}</div>
                  <div style={{ flex: '1 1 50%' }}><strong>Категория:</strong> <LTag color="blue">{selectedEntity.category}</LTag></div>
                  <div style={{ flex: '1 1 100%' }}><strong>Описание:</strong> {selectedEntity.description}</div>
                </div>

                {entityContext?.relations && (
                  <LCard title="Связи" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <LStatistic title="Исходящих" value={entityContext.relations.outgoing_count} />
                      <LStatistic title="Входящих" value={entityContext.relations.incoming_count} />
                    </div>
                    {entityContext.relations.outgoing?.length > 0 && (
                      <div>
                        <p><strong>Исходящие связи:</strong></p>
                        {entityContext.relations.outgoing.slice(0, 5).map((rel: any, i: number) => (
                          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <LTag>{rel.relation_type}</LTag> → {rel.target_id}
                          </div>
                        ))}
                      </div>
                    )}
                  </LCard>
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
          </LCard>
        )},
      ]} />
    </div>
  );
}