'use client';

import { useState, useCallback } from 'react';
import { Card, Typography, Tabs, Button, Table, Tag, Space, Input, message, Popconfirm, Select, Alert, Collapse, List, Badge } from 'antd';
import { KeyOutlined, CodeOutlined, DeleteOutlined, CopyOutlined, CaretRightOutlined, HistoryOutlined, BookOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type ApiKey = {
  id: string;
  key_prefix: string;
  name?: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
};

type TestResult = {
  endpoint: string;
  method: string;
  status: number;
  data: any;
  time: number;
  timestamp: Date;
};

// ── API Keys Panel ──────────────────────────────────

function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<ApiKey[]>('/auth/api-keys'),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<{ key: string; key_masked: string }>('/auth/api-key', null, { method: 'POST' }),
    onSuccess: (data) => {
      setNewKey(data.key);
      message.success('API-ключ создан');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => {
      message.success('API-ключ удалён');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const columns = [
    { title: 'Префикс', dataIndex: 'key_prefix', key: 'prefix', render: (v: string) => <code>{v}...</code> },
    { title: 'Имя', dataIndex: 'name', key: 'name', render: (v: string) => v || '—' },
    { title: 'Последнее использование', dataIndex: 'last_used_at', key: 'last_used', render: (v: string) => v ? new Date(v).toLocaleString('ru') : 'Никогда' },
    { title: 'Статус', dataIndex: 'is_active', key: 'status', render: (v: boolean) => v ? <Tag color="green">Активен</Tag> : <Tag color="red">Удалён</Tag> },
    {
      title: '', key: 'actions',
      render: (_: any, record: ApiKey) => record.is_active ? (
        <Popconfirm title="Удалить ключ?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<KeyOutlined />} onClick={() => createMutation.mutate('web-app')}>
          Создать ключ
        </Button>
      </Space>

      {newKey && (
        <Alert
          type="success"
          message="Новый API-ключ"
          description={
            <Space direction="vertical">
              <Text copyable>{newKey}</Text>
              <Text type="warning" style={{ fontSize: 12 }}>
                Сохраните ключ — он показывается только один раз!
              </Text>
            </Space>
          }
          closable
          onClose={() => setNewKey(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table columns={columns} dataSource={keys || []} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
}

// ── API Tester Panel ──────────────────────────────────

function ApiTesterPanel() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/book/health');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const endpoints = [
    { value: '/book/health', label: 'GET /book/health — Статус сервиса' },
    { value: '/book/genome', label: 'GET /book/genome — Геном книги' },
    { value: '/book/layers', label: 'GET /book/layers — Слои сознания' },
    { value: '/book/ask', label: 'POST /book/ask — Задать вопрос' },
    { value: '/book/reader/profile', label: 'GET /book/reader/profile — Профиль' },
    { value: '/book/reader/history', label: 'GET /book/reader/history — История' },
    { value: '/book/reader/history/stats', label: 'GET /book/reader/history/stats — Статистика' },
    { value: '/auth/me', label: 'GET /auth/me — Пользователь' },
    { value: '/auth/api-keys', label: 'GET /auth/api-keys — Ключи' },
    { value: '/xray/stats', label: 'GET /xray/stats — X-Ray' },
    { value: '/analytics', label: 'GET /analytics — Аналитика' },
  ];

  const runTest = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const opts: RequestInit = { method };
      if (method !== 'GET' && body) {
        opts.body = body;
      }
      let data: any;
      if (method === 'GET') {
        data = await api.get(endpoint);
      } else if (method === 'POST') {
        data = await api.post(endpoint, body ? JSON.parse(body) : undefined);
      } else if (method === 'DELETE') {
        data = await api.delete(endpoint);
      } else {
        data = await api.get(endpoint);
      }
      const testResult: TestResult = { endpoint, method, status: 200, data, time: Date.now() - start, timestamp: new Date() };
      setResult(testResult);
      setHistory(prev => [testResult, ...prev].slice(0, 20));
    } catch (err: any) {
      const testResult: TestResult = { endpoint, method, status: err.status || 500, data: err.data || { error: err.message }, time: Date.now() - start, timestamp: new Date() };
      setResult(testResult);
      setHistory(prev => [testResult, ...prev].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, [method, endpoint, body]);

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap>
          <Select value={method} onChange={setMethod} style={{ width: 100 }}>
            <Select.Option value="GET">GET</Select.Option>
            <Select.Option value="POST">POST</Select.Option>
            <Select.Option value="DELETE">DELETE</Select.Option>
          </Select>
          <Select
            showSearch
            style={{ width: 400 }}
            placeholder="Выберите эндпоинт"
            value={endpoint}
            onChange={setEndpoint}
            options={endpoints}
          />
          <Button type="primary" icon={<CaretRightOutlined />} onClick={runTest} loading={loading}>
            Выполнить
          </Button>
        </Space>

        {method !== 'GET' && (
          <TextArea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder='{"question": "Кто такой Велик?"}'
            rows={3}
          />
        )}

        {result && (
          <Card size="small" title="Результат">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Tag color={result.status < 400 ? 'green' : 'red'}>{result.status}</Tag>
                <Text type="secondary">{result.time}ms</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{result.timestamp.toLocaleTimeString('ru')}</Text>
              </Space>
              <pre style={{
                background: '#f8fafc',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 300,
                margin: 0,
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </Space>
          </Card>
        )}

        {history.length > 0 && (
          <Card size="small" title={<><HistoryOutlined /> История запросов</>}>
            <List
              size="small"
              dataSource={history}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setMethod(item.method); setEndpoint(item.endpoint); }}
                >
                  <Space>
                    <Tag color={item.status < 400 ? 'green' : 'red'} style={{ minWidth: 45 }}>{item.status}</Tag>
                    <Text code>{item.method}</Text>
                    <Text>{item.endpoint}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.time}ms</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    </div>
  );
}

// ── API Examples Panel ──────────────────────────────────

function ApiExamplesPanel() {
  const examples = [
    {
      title: 'Задать вопрос книге',
      method: 'POST',
      endpoint: '/book/ask',
      curl: `curl -X POST http://localhost:8642/book/ask \\
  -H "Content-Type: application/json" \\
  -d '{"question": "Кто такой Велик?"}'`,
      python: `import requests

resp = requests.post("http://localhost:8642/book/ask",
    json={"question": "Кто такой Велик?"})
print(resp.json())`,
    },
    {
      title: 'Получить геном книги',
      method: 'GET',
      endpoint: '/book/genome',
      curl: `curl http://localhost:8642/book/genome`,
      python: `import requests

resp = requests.get("http://localhost:8642/book/genome")
print(resp.json())`,
    },
    {
      title: 'Профиль читателя',
      method: 'GET',
      endpoint: '/book/reader/profile',
      curl: `curl http://localhost:8642/book/reader/profile \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      python: `import requests

resp = requests.get("http://localhost:8642/book/reader/profile",
    headers={"Authorization": "Bearer YOUR_API_KEY"})
print(resp.json())`,
    },
    {
      title: 'История вопросов',
      method: 'GET',
      endpoint: '/book/reader/history?limit=10',
      curl: `curl "http://localhost:8642/book/reader/history?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      python: `import requests

resp = requests.get("http://localhost:8642/book/reader/history",
    params={"limit": 10},
    headers={"Authorization": "Bearer YOUR_API_KEY"})
print(resp.json())`,
    },
    {
      title: 'Создать API-ключ',
      method: 'POST',
      endpoint: '/auth/api-key',
      curl: `curl -X POST http://localhost:8642/auth/api-key \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      python: `import requests

resp = requests.post("http://localhost:8642/auth/api-key",
    headers={"Authorization": "Bearer YOUR_JWT_TOKEN"})
print(resp.json())`,
    },
  ];

  const [selected, setSelected] = useState(0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 250, flexShrink: 0 }}>
          <List
            size="small"
            dataSource={examples}
            renderItem={(item, index) => (
              <List.Item
                style={{ cursor: 'pointer', background: selected === index ? '#f1f5f9' : undefined, borderRadius: 6, padding: '8px 12px' }}
                onClick={() => setSelected(index)}
              >
                <Space>
                  <Tag color={item.method === 'GET' ? 'blue' : 'green'}>{item.method}</Tag>
                  <Text style={{ fontSize: 13 }}>{item.title}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
        <div style={{ flex: 1 }}>
          {examples[selected] && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Title level={4}>{examples[selected].title}</Title>
              <Text code>{examples[selected].method} {examples[selected].endpoint}</Text>

              <Card size="small" title="cURL">
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 6, fontSize: 12, margin: 0, overflow: 'auto' }}>
                  {examples[selected].curl}
                </pre>
              </Card>

              <Card size="small" title="Python">
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 6, fontSize: 12, margin: 0, overflow: 'auto' }}>
                  {examples[selected].python}
                </pre>
              </Card>
            </Space>
          )}
        </div>
      </div>
    </div>
  );
}

// ── API Docs Panel ──────────────────────────────────

function ApiDocsPanel() {
  const sections = [
    {
      title: 'Book Intelligence',
      endpoints: [
        { method: 'GET', path: '/book/health', desc: 'Статус сервиса' },
        { method: 'GET', path: '/book/genome', desc: 'Геном книги (темы, персонажи, ценности)' },
        { method: 'GET', path: '/book/layers', desc: 'Слои сознания (knowledge, meaning, identity, mission)' },
        { method: 'POST', path: '/book/ask', desc: 'Задать вопрос книге', body: '{"question": "...", "context": "..."}' },
        { method: 'GET', path: '/book/reader/profile', desc: 'Профиль читателя' },
        { method: 'GET', path: '/book/reader/history', desc: 'История вопросов' },
        { method: 'GET', path: '/book/reader/history/full', desc: 'Полная история (user + assistant)' },
        { method: 'GET', path: '/book/reader/history/sessions', desc: 'Список сессий' },
        { method: 'GET', path: '/book/reader/history/stats', desc: 'Статистика истории' },
      ],
    },
    {
      title: 'Visual Genome',
      endpoints: [
        { method: 'POST', path: '/book/visualize', desc: 'Визуализация сцены', body: '{"chapter": 1, "scene_id": "..."}' },
        { method: 'POST', path: '/book/visual-genome/scene', desc: 'Создать сцену' },
        { method: 'POST', path: '/book/visual-genome/character', desc: 'Создать визуал персонажа' },
        { method: 'POST', path: '/book/visual-genome/location', desc: 'Создать визуал локации' },
        { method: 'POST', path: '/book/visual-genome/from-speech', desc: 'Голосовое описание в визуал', body: '{"text": "..."}' },
      ],
    },
    {
      title: 'Auth',
      endpoints: [
        { method: 'GET', path: '/auth/me', desc: 'Текущий пользователь' },
        { method: 'POST', path: '/auth/api-key', desc: 'Создать API-ключ' },
        { method: 'GET', path: '/auth/api-keys', desc: 'Мои API-ключи' },
        { method: 'GET', path: '/auth/admin/users', desc: 'Все пользователи (admin)' },
        { method: 'POST', path: '/auth/admin/invites', desc: 'Создать инвайт (admin)' },
      ],
    },
    {
      title: 'Observability',
      endpoints: [
        { method: 'GET', path: '/xray/stats', desc: 'Статистика трейсов' },
        { method: 'GET', path: '/xray/traces', desc: 'Список трейсов' },
        { method: 'GET', path: '/analytics', desc: 'Анонимная аналитика' },
        { method: 'GET', path: '/metrics', desc: 'Метрики системы' },
      ],
    },
    {
      title: 'WebSocket',
      endpoints: [
        { method: 'WS', path: '/ws', desc: 'Real-time уведомления (pulse_beat, new_question, chat_response)' },
      ],
    },
  ];

  return (
    <div>
      {sections.map(section => (
        <Card key={section.title} title={section.title} style={{ marginBottom: 16 }}>
          <Table
            dataSource={section.endpoints}
            rowKey="path"
            size="small"
            pagination={false}
            columns={[
              {
                title: 'Метод', dataIndex: 'method', key: 'method', width: 80,
                render: (v: string) => (
                  <Tag color={v === 'GET' ? 'blue' : v === 'POST' ? 'green' : v === 'DELETE' ? 'red' : 'orange'}>
                    {v}
                  </Tag>
                ),
              },
              { title: 'Путь', dataIndex: 'path', key: 'path', render: (v: string) => <code>{v}</code> },
              { title: 'Описание', dataIndex: 'desc', key: 'desc' },
              { title: 'Тело', dataIndex: 'body', key: 'body', render: (v: string) => v ? <code style={{ fontSize: 11 }}>{v}</code> : '—' },
            ]}
          />
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function ApiContent() {
  const items = [
    { key: 'keys', label: <><KeyOutlined /> API-ключи</>, children: <ApiKeysPanel /> },
    { key: 'tester', label: <><CaretRightOutlined /> Тестер</>, children: <ApiTesterPanel /> },
    { key: 'examples', label: <><BookOutlined /> Примеры</>, children: <ApiExamplesPanel /> },
    { key: 'docs', label: <><CodeOutlined /> Документация</>, children: <ApiDocsPanel /> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}><CodeOutlined /> API</Title>
      <Paragraph type="secondary">
        Управление API-ключами, тестирование эндпоинтов, примеры кода, документация API.
      </Paragraph>
      <Tabs items={items} />
    </div>
  );
}

export default function ApiPage() {
  return (
    <ProtectedRoute>
      <ApiContent />
    </ProtectedRoute>
  );
}
