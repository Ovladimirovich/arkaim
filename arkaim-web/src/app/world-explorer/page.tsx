use client;

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Typography, Input, Button, Select, Slider, Space, Tag, Tabs, List, Progress, Modal, Alert, Spin, Empty, Descriptions, Statistic, Tooltip, Badge, Divider, message } from 'antd';
import { ExperimentOutlined, ThunderboltOutlined, HistoryOutlined, DeleteOutlined, SwapOutlined, BranchesOutlined, BulbOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { api } from '@/shared/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ProtectedRoute } from '@/shared/lib/guards';
import { useWsEvent } from '@/shared/lib/ws-hooks';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

type Epoch = { id: string; name: string; name_ru: string; order: number };
type Hypothesis = { id: string; title: string; description: string; type: string; epoch: string; confidence: number; tags: string[] };
type RankedBranch = { rank: number; branch_type: string; title: string; quality_score: number; quality_summary: string; strengths: string[]; weaknesses: string[]; impact_score: number; contradictions: number; delta_changes: number };
type ExplorationResult = { request: { prompt: string; epoch?: string; location?: string; branch_count: number }; hypothesis: Hypothesis | null; scenario: { branch_count: number; best_branch_id: string; summary: string }; ranked_branches: RankedBranch[]; duration_ms: number; summary: string };
type CompatibilityResult = { overall_score: number; is_compatible: boolean; risk_level: string; axis_scores: { axis: string; score: number; violations_count: number; warnings_count: number }[]; violations_count: number; warnings_count: number; recommendations: string[] };
type Possibility = { id: string; title: string; title_ru: string; description: string; category: string; confidence: number; tags: string[] };
type HistoryItem = { id: string; timestamp: number; prompt: string; epoch?: string; result: ExplorationResult };

const RISK_COLORS: Record<string, string> = { low: '#52c41a', medium: '#faad14', high: '#ff7a45', rejected: '#ff4d4f' };
const BRANCH_TYPE_LABELS: Record<string, string> = { conservative: 'Консервативное', moderate: 'Умеренное', radical: 'Радикальное', unexpected: 'Неожиданное' };
const CRITERIA_LABELS: Record<string, string> = { canon_alignment: 'Канон', logical_consistency: 'Логика', thematic_depth: 'Глубина', dramatic_potential: 'Драма', originality: 'Оригинал' };
const PROGRESS_STEPS = ['Проверка совместимости', 'Генерация гипотез', 'Моделирование', 'Влияние', 'Противоречия', 'Изменения', 'Оценка', 'Ранжирование'];

async function loadHistory(): Promise<HistoryItem[]> {
    try {
      const res = await api.get<{ data: any[] }>('/book/world-explorer/history?limit=50');
      return (res.data || []).map((item: any) => ({
        id: String(item.id),
        timestamp: new Date(item.created_at).getTime(),
        prompt: item.prompt,
        epoch: item.epoch,
        result: item.result || { request: { prompt: item.prompt }, hypothesis: null, scenario: { branch_count: 0, best_branch_id: '', summary: '' }, ranked_branches: [], duration_ms: item.duration_ms || 0, summary: item.summary || '' },
      }));
    } catch { return []; }
  }
async function saveHistory(item: HistoryItem) {
    try {
      await api.post('/book/world-explorer/history', {
        prompt: item.prompt,
        epoch: item.epoch,
        branch_count: item.result?.request?.branch_count || 3,
        hypothesis_id: item.result?.hypothesis?.id || null,
        hypothesis_title: item.result?.hypothesis?.title || null,
        result_json: JSON.stringify(item.result),
        summary: item.result?.summary || '',
        overall_score: item.result?.ranked_branches?.[0]?.quality_score || 0,
        branch_count_actual: item.result?.ranked_branches?.length || 0,
        duration_ms: item.result?.duration_ms || 0,
      });
    } catch { /* silent */ }
  }

function WorldExplorerContent() {
  const [prompt, setPrompt] = useState('');
  const [epoch, setEpoch] = useState<string | undefined>();
  const [branchCount, setBranchCount] = useState(3);
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<RankedBranch | null>(null);
  const [compareBranches, setCompareBranches] = useState<RankedBranch[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [progress, setProgress] = useState(-1);
  const [activeTab, setActiveTab] = useState('explore');
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: epochsData } = useQuery({ queryKey: ['we-epochs'], queryFn: () => api.get<{ data: Epoch[] }>('/book/world-explorer/epochs') });
  const epochs = epochsData?.data || [];
  const { data: statsData } = useQuery({ queryKey: ['we-stats'], queryFn: () => api.get<{ data: Record<string, number> }>('/book/world-explorer/stats') });
  const { data: hypsData, isLoading: hypsLoading } = useQuery({ queryKey: ['we-hypotheses', epoch], queryFn: () => api.get<{ data: Hypothesis[] }>(/book/world-explorer/hypotheses/?limit=10), enabled: activeTab === 'hypotheses' });
  const hypotheses = hypsData?.data || [];
  const { data: possData, isLoading: possLoading } = useQuery({ queryKey: ['we-possibilities', epoch], queryFn: () => api.get<{ data: Possibility[] }>(/book/world-explorer/possibilities/?limit=10), enabled: activeTab === 'possibilities' });
  const possibilities = possData?.data || [];

  useEffect(() => { loadHistory().then(setHistory); }, []);
  const checkCompatibility = useCallback(async () => { if (!prompt || prompt.length < 5) { setCompatibility(null); return; } try { const res = await api.post<{ data: CompatibilityResult }>('/book/world-explorer/validate', { prompt, epoch: epoch || null, location: null }); setCompatibility(res.data); } catch { setCompatibility(null); } }, [prompt, epoch]);
  useEffect(() => { const t = setTimeout(checkCompatibility, 500); return () => clearTimeout(t); }, [checkCompatibility]);

  const exploreMutation = useMutation({
    mutationFn: async () => { setProgress(0); return api.post<{ data: ExplorationResult; summary: string }>('/book/world-explorer/explore', { prompt, epoch: epoch || undefined, branch_count: branchCount }); },
    onSuccess: (res) => { setResult(res.data); setProgress(-1); const item: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), prompt, epoch, result: res.data }; setHistory(prev => [item, ...prev].slice(0, 50)); saveHistory(item); message.success('Исследование завершено'); },
    onError: () => { setProgress(-1); message.error('Ошибка исследования'); },
  });

  // WebSocket real-time progress
  useWsEvent('exploration_progress' as any, (data: any) => { if (data.step !== undefined) setProgress(data.step); });
  useWsEvent('exploration_complete' as any, () => { setProgress(-1); });
  useWsEvent('exploration_started' as any, (data: any) => { console.log('Exploration started:', data.exploration_id); });

  const exploreFromHypothesis = async (hyp: Hypothesis) => { try { setProgress(0); const res = await api.post<{ data: ExplorationResult }>(/book/world-explorer/explore/hypothesis?hypothesis_id=&epoch=&branch_count=, {}); setResult(res.data); setProgress(-1); setActiveTab('explore'); } catch { setProgress(-1); message.error('Ошибка'); } };
  const loadFromHistory = (item: HistoryItem) => { setPrompt(item.prompt); setEpoch(item.epoch); setResult(item.result); setActiveTab('explore'); };
  const deleteFromHistory = async (id: string) => {
    try { await api.delete('/book/world-explorer/history/' + id); } catch {}
    setHistory(prev => prev.filter(x => x.id !== id));
  };
  const toggleCompare = (branch: RankedBranch) => { setCompareBranches(prev => { const exists = prev.find(b => b.rank === branch.rank); if (exists) return prev.filter(b => b.rank !== branch.rank); if (prev.length >= 3) return prev; return [...prev, branch]; }); };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}><Title level={2} style={{ margin: 0 }}><BranchesOutlined style={{ marginRight: 8 }} />Исследование мира</Title><Text type='secondary'>Исследуйте альтернативные линии развития мира книги</Text></div>
      {statsData?.data && (<div style={{ display: 'flex', gap: 16, marginBottom: 24 }}><Statistic title='Эпох' value={statsData.data.epochs_count || 0} /><Statistic title='Локаций' value={statsData.data.locations_count || 0} /><Statistic title='Паттернов' value={statsData.data.patterns_count || 0} /><Statistic title='Событий' value={statsData.data.events_count || 0} /></div>)}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><ExperimentOutlined /> Исследование</span>} key='explore'>
          <Card style={{ marginBottom: 16 }}><Space direction='vertical' style={{ width: '100%' }} size='middle'><TextArea rows={3} placeholder='Опишите вашу идею...' value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ fontSize: 15 }} /><div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}><Select placeholder='Эпоха' style={{ width: 200 }} allowClear value={epoch} onChange={setEpoch} options={epochs.map(e => ({ value: e.id, label: e.name_ru }))} /><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Text>Ветвей:</Text><Slider min={2} max={8} value={branchCount} onChange={setBranchCount} style={{ width: 120 }} /><Text strong>{branchCount}</Text></div><Button type='primary' icon={<ExperimentOutlined />} loading={exploreMutation.isPending} disabled={!prompt || prompt.length < 5} onClick={() => exploreMutation.mutate()} size='large'>Исследовать</Button></div></Space></Card>
          {progress >= 0 && (<Card style={{ marginBottom: 16 }}><Text strong>Прогресс:</Text><Progress percent={Math.round(((progress + 1) / PROGRESS_STEPS.length) * 100)} status='active' style={{ marginTop: 8 }} /><Text type='secondary' style={{ fontSize: 12 }}>{PROGRESS_STEPS[progress] || 'Завершение...'}</Text></Card>)}
          {compatibility && (<Card title='Совместимость' style={{ marginBottom: 16 }} size='small'><div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}><Progress type='circle' percent={Math.round(compatibility.overall_score * 100)} size={60} strokeColor={RISK_COLORS[compatibility.risk_level] || '#1890ff'} /><div><Text strong>Балл: {compatibility.overall_score.toFixed(2)}</Text><br /><Tag color={RISK_COLORS[compatibility.risk_level]}>{compatibility.risk_level.toUpperCase()}</Tag>{compatibility.is_compatible && <Tag color='green'>ОК</Tag>}</div></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{compatibility.axis_scores.map(ax => (<Tooltip key={ax.axis} title={${CRITERIA_LABELS[ax.axis] || ax.axis}: }><div style={{ textAlign: 'center' }}><Progress type='circle' percent={Math.round(ax.score * 100)} size={40} strokeColor={ax.score >= 0.7 ? '#52c41a' : ax.score >= 0.4 ? '#faad14' : '#ff4d4f'} /><div style={{ fontSize: 10, marginTop: 2 }}>{CRITERIA_LABELS[ax.axis] || ax.axis}</div></div></Tooltip>))}</div>{compatibility.recommendations.length > 0 && <Alert type='info' message={compatibility.recommendations[0]} style={{ marginTop: 12 }} showIcon />}</Card>)}
          {result && (<><Card title='Результаты' style={{ marginBottom: 16 }}><Descriptions size='small' column={3}><Descriptions.Item label='Гипотеза'>{result.hypothesis?.title || '-'}</Descriptions.Item><Descriptions.Item label='Ветвей'>{result.scenario.branch_count}</Descriptions.Item><Descriptions.Item label='Время'>{result.duration_ms.toFixed(0)}ms</Descriptions.Item></Descriptions></Card><div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{result.ranked_branches.map(branch => (<Badge key={branch.rank} count={'#' + branch.rank} color={branch.rank === 1 ? '#52c41a' : '#1890ff'}><Card size='small' hoverable onClick={() => setSelectedBranch(branch)} style={{ width: 260, cursor: 'pointer', border: branch.rank === 1 ? '2px solid #52c41a' : '1px solid #f0f0f0' }}><Space direction='vertical' style={{ width: '100%' }}><Tag color={branch.branch_type === 'unexpected' ? 'purple' : branch.branch_type === 'radical' ? 'orange' : branch.branch_type === 'moderate' ? 'green' : 'blue'}>{BRANCH_TYPE_LABELS[branch.branch_type] || branch.branch_type}</Tag><Text strong style={{ fontSize: 13 }}>{branch.title}</Text><Progress percent={Math.round(branch.quality_score * 100)} size='small' strokeColor={branch.quality_score >= 0.8 ? '#52c41a' : branch.quality_score >= 0.6 ? '#faad14' : '#ff4d4f'} /><div style={{ fontSize: 12, color: '#8c8c8c' }}>Влияние: {(branch.impact_score * 100).toFixed(0)}% | Противоречия: {branch.contradictions}</div><Button size='small' icon={<SwapOutlined />} onClick={(e) => { e.stopPropagation(); toggleCompare(branch); }} type={compareBranches.find(b => b.rank === branch.rank) ? 'primary' : 'default'}>Сравнить</Button></Space></Card></Badge>))}</div>{compareBranches.length >= 2 && <Button type='primary' icon={<SwapOutlined />} onClick={() => setShowCompare(true)} style={{ marginBottom: 16 }}>Сравнить ({compareBranches.length})</Button}</>)}
          {!result && !exploreMutation.isPending && <Empty description='Введите идею и нажмите «Исследовать»' />}
        </TabPane>
        <TabPane tab={<span><BulbOutlined /> Гипотезы</span>} key='hypotheses'>
          <Card style={{ marginBottom: 16 }}><Select placeholder='Эпоха' style={{ width: 250 }} value={epoch} onChange={setEpoch} options={epochs.map(e => ({ value: e.id, label: e.name_ru }))} /></Card>
          {hypsLoading ? <Spin /> : hypotheses.length === 0 ? <Empty description='Нет гипотез' /> : <List dataSource={hypotheses} renderItem={(hyp: Hypothesis) => <List.Item actions={[<Button key='e' type='primary' size='small' onClick={() => exploreFromHypothesis(hyp)}>Исследовать</Button>]}><List.Item.Meta title={<><Tag>{hyp.type}</Tag> {hyp.title}</>} description={hyp.description} /></List.Item>} />}
        </TabPane>
        <TabPane tab={<span><ThunderboltOutlined /> Возможности</span>} key='possibilities'>
          <Card style={{ marginBottom: 16 }}><Select placeholder='Эпоха' style={{ width: 250 }} value={epoch} onChange={setEpoch} options={epochs.map(e => ({ value: e.id, label: e.name_ru }))} /></Card>
          {possLoading ? <Spin /> : possibilities.length === 0 ? <Empty description='Нет возможностей' /> : <List dataSource={possibilities} renderItem={(p: Possibility) => <List.Item><List.Item.Meta title={<><Tag color='blue'>{p.category}</Tag> {p.title_ru}</>} description={p.description} /></List.Item>} />}
        </TabPane>
        <TabPane tab={<span><HistoryOutlined /> История</span>} key='history'>
          {history.length === 0 ? <Empty description='История пуста' /> : <List dataSource={history} renderItem={(item: HistoryItem) => <List.Item actions={[<Button key='l' size='small' onClick={() => loadFromHistory(item)}>Загрузить</Button>, <Button key='d' size='small' danger icon={<DeleteOutlined />} onClick={() => deleteFromHistory(item.id)} />]}><List.Item.Meta title={item.prompt} description={<Space><Tag>{item.epoch || 'Все эпохи'}</Tag><Tag color='blue'>{item.result.ranked_branches.length} ветвей</Tag><Text type='secondary' style={{ fontSize: 12 }}>{new Date(item.timestamp).toLocaleString('ru-RU')}</Text></Space>} /></List.Item>} />}
        </TabPane>
      </Tabs>
      <Modal title={selectedBranch?.title || 'Детали ветви'} open={!!selectedBranch} onCancel={() => setSelectedBranch(null)} footer={null} width={700}>
        {selectedBranch && <Space direction='vertical' style={{ width: '100%' }}><Descriptions column={2}><Descriptions.Item label='Тип'><Tag>{BRANCH_TYPE_LABELS[selectedBranch.branch_type] || selectedBranch.branch_type}</Tag></Descriptions.Item><Descriptions.Item label='Ранг'>#{selectedBranch.rank}</Descriptions.Item></Descriptions><Divider /><Title level={5}>Критерии</Title>{Object.entries(CRITERIA_LABELS).map(([key, label]) => <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><Text style={{ width: 120, fontSize: 13 }}>{label}</Text><Progress percent={Math.round(selectedBranch.quality_score * 100)} size='small' style={{ flex: 1 }} /></div>)}<Divider /><div style={{ display: 'flex', gap: 16 }}><div style={{ flex: 1 }}><Text strong>Сильные стороны:</Text>{selectedBranch.strengths.length > 0 ? selectedBranch.strengths.map((s, i) => <div key={i}><Tag color='green'>{s}</Tag></div>) : <Text type='secondary'>Нет</Text>}</div><div style={{ flex: 1 }}><Text strong>Слабые стороны:</Text>{selectedBranch.weaknesses.length > 0 ? selectedBranch.weaknesses.map((w, i) => <div key={i}><Tag color='red'>{w}</Tag></div>) : <Text type='secondary'>Нет</Text>}</div></div><Divider /><Descriptions column={3}><Descriptions.Item label='Влияние'><Progress type='circle' percent={Math.round(selectedBranch.impact_score * 100)} size={50} /></Descriptions.Item><Descriptions.Item label='Противоречия'><Badge count={selectedBranch.contradictions} showZero color={selectedBranch.contradictions > 0 ? 'red' : 'green'}><NodeIndexOutlined style={{ fontSize: 24 }} /></Badge></Descriptions.Item><Descriptions.Item label='Изменения'><Statistic value={selectedBranch.delta_changes} /></Descriptions.Item></Descriptions></Space>}
      </Modal>
      <Modal title='Сравнение ветвей' open={showCompare} onCancel={() => setShowCompare(false)} footer={null} width={900}>
        <div style={{ display: 'flex', gap: 16 }}>{compareBranches.map(branch => <Card key={branch.rank} size='small' style={{ flex: 1 }}><Title level={5}>{branch.title}</Title><Tag color={branch.rank === 1 ? 'green' : 'blue'}>#{branch.rank}</Tag><Divider />{Object.entries(CRITERIA_LABELS).map(([key, label]) => <div key={key} style={{ marginBottom: 4 }}><Text style={{ fontSize: 12 }}>{label}</Text><Progress percent={Math.round(branch.quality_score * 100)} size='small' strokeColor={branch.quality_score >= 0.8 ? '#52c41a' : '#faad14'} /></div>)}<Divider /><Statistic title='Балл' value={branch.quality_score} precision={3} /></Card>)}</div>
      </Modal>
    </div>
  );
}

export default function WorldExplorerPage() { return <ProtectedRoute><WorldExplorerContent /></ProtectedRoute>; }
