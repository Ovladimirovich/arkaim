'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Collapse, Spin, Empty, List, Alert, Badge } from 'antd';
import { ThunderboltOutlined, SendOutlined, GlobalOutlined, ExperimentOutlined, CheckCircleOutlined, WarningOutlined, BookOutlined, EnvironmentOutlined, TeamOutlined, ToolOutlined, SafetyCertificateOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import { Markdown } from '@/shared/lib/markdown';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type WorldModel = {
  epochs: Array<{ id: string; name: string; name_ru: string; description: string; order: number }>;
  locations: Array<{ id: string; name: string; name_ru: string; type: string; description: string }>;
  canonical_events: Array<{ id: string; title_ru: string; epoch: string }>;
  causal_rules: Array<{ id: string; description: string; rule_type: string }>;
};

type ConstraintModel = {
  story_request: { prompt: string; epoch?: string; location?: string; character_type?: string };
  resolved_context: {
    epoch?: { name_ru: string; description: string };
    location?: { name_ru: string; description: string };
    characters_alive: Array<{ character_name: string; status: string }>;
    technologies_available: Array<{ name_ru: string }>;
    applicable_rules: Array<{ description: string }>;
  };
  hard_constraints: string[];
  soft_constraints: string[];
  forbidden_elements: string[];
};

type StoryResult = {
  id: string;
  text: string;
  word_count: number;
  constraints: ConstraintModel;
  validation: { passed: boolean; violations: any[]; warnings: string[] };
};

const STORY_PRESETS = [
  { label: '30 лет до Велика', prompt: 'Я хочу историю о молодом гиперборейце за 30 лет до появления Велика.' },
  { label: 'День гиперборейца', prompt: 'Покажи один день из жизни гиперборейца в Сатья Юге.' },
  { label: 'Основание Аркаима', prompt: 'История о том, как был основан Аркаим.' },
  { label: 'Ритуал жреца', prompt: 'Расскажи о ритуале, который проводил жрец в храме огня.' },
  { label: 'Путешественник', prompt: 'История о страннике, пересекающем земли от Гипербореи до Индии.' },
  { label: 'Последний учитель', prompt: 'О последнем учителе, который уходил из умирающего города.' },
];

function ConstraintDisplay({ constraints }: { constraints: ConstraintModel }) {
  const ctx = constraints.resolved_context;
  const items = [
    {
      key: 'epoch',
      label: (
        <Space>
          <GlobalOutlined />
          <span>Эпоха</span>
          {ctx.epoch && <Tag color="blue">{ctx.epoch.name_ru}</Tag>}
        </Space>
      ),
      children: ctx.epoch ? (
        <div>
          <Paragraph>{ctx.epoch.description}</Paragraph>
          {ctx.characters_alive.length > 0 && (
            <div>
              <Text strong>Персонажи в эпохе:</Text>
              <Space wrap style={{ marginTop: 4 }}>
                {ctx.characters_alive.map((ch, i) => (
                  <Tag key={i} icon={<TeamOutlined />}>{ch.character_name} ({ch.status})</Tag>
                ))}
              </Space>
            </div>
          )}
          {ctx.technologies_available.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong>Технологии:</Text>
              <Space wrap style={{ marginTop: 4 }}>
                {ctx.technologies_available.map((t, i) => (
                  <Tag key={i} icon={<ToolOutlined />}>{t.name_ru}</Tag>
                ))}
              </Space>
            </div>
          )}
        </div>
      ) : <Text type="secondary">Не определена</Text>,
    },
    {
      key: 'location',
      label: (
        <Space>
          <EnvironmentOutlined />
          <span>Локация</span>
          {ctx.location && <Tag color="green">{ctx.location.name_ru}</Tag>}
        </Space>
      ),
      children: ctx.location ? <Paragraph>{ctx.location.description}</Paragraph> : <Text type="secondary">Не определена</Text>,
    },
    {
      key: 'rules',
      label: (
        <Space>
          <SafetyCertificateOutlined />
          <span>Ограничения</span>
          <Badge count={constraints.hard_constraints.length} style={{ backgroundColor: '#ff4d4f' }} />
        </Space>
      ),
      children: (
        <div>
          <Text strong>Жёсткие ограничения:</Text>
          <List
            size="small"
            dataSource={constraints.hard_constraints}
            renderItem={item => <List.Item><Tag color="red">MUST</Tag> {item}</List.Item>}
          />
          {constraints.forbidden_elements.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong type="danger">Запрещено:</Text>
              <List
                size="small"
                dataSource={constraints.forbidden_elements}
                renderItem={item => <List.Item><Tag color="volcano">NO</Tag> {item}</List.Item>}
              />
            </div>
          )}
        </div>
      ),
    },
  ];

  return <Collapse items={items} defaultActiveKey={['epoch', 'rules']} />;
}

function StoryOutput({ story, streamingText, isStreaming }: {
  story: StoryResult | null;
  streamingText: string;
  isStreaming: boolean;
}) {
  // Show streaming text while generating
  if (isStreaming && streamingText) {
    return (
      <Card
        title={
          <Space>
            <BookOutlined />
            <span>Генерация...</span>
            <LoadingOutlined />
          </Space>
        }
      >
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          <Markdown content={streamingText} />
          <span style={{ animation: 'blink 1s infinite' }}>|</span>
        </div>
      </Card>
    );
  }

  if (!story) return null;

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          <span>Сгенерированная история</span>
          <Tag>{story.word_count} слов</Tag>
        </Space>
      }
      extra={
        story.validation.passed ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Валидация пройдена</Tag>
        ) : (
          <Tag icon={<WarningOutlined />} color="error">Есть нарушения</Tag>
        )
      }
    >
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
        <Markdown content={story.text} />
      </div>
      {story.validation.warnings.length > 0 && (
        <Alert
          type="warning"
          message="Предупреждения"
          description={
            <ul style={{ margin: 0 }}>
              {story.validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          }
          style={{ marginTop: 16 }}
        />
      )}
      {story.validation.violations.length > 0 && (
        <Alert
          type="error"
          message="Нарушения ограничений"
          description={
            <ul style={{ margin: 0 }}>
              {story.validation.violations.map((v, i) => <li key={i}>{v.rule_text}</li>)}
            </ul>
          }
          style={{ marginTop: 8 }}
        />
      )}
    </Card>
  );
}

function WorldModelPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['world-model'],
    queryFn: () => api.get<{ data: WorldModel }>('/book/world-engine/model'),
  });

  if (isLoading) return <Spin size="small" />;
  const wm = data?.data;
  if (!wm) return <Empty description="Модель мира не загружена" />;

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title="Эпохи">
          <List
            size="small"
            dataSource={wm.epochs}
            renderItem={ep => (
              <List.Item>
                <Text>{ep.name_ru || ep.name}</Text>
              </List.Item>
            )}
          />
        </Card>
        <Card size="small" title="Локации">
          <List
            size="small"
            dataSource={wm.locations}
            renderItem={loc => (
              <List.Item>
                <Text>{loc.name_ru || loc.name}</Text>
                <Tag>{loc.type}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  );
}

function StoryPageContent() {
  const [prompt, setPrompt] = useState('');
  const [constraints, setConstraints] = useState<ConstraintModel | null>(null);
  const [story, setStory] = useState<StoryResult | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef('');

  const constraintsMutation = useMutation({
    mutationFn: (req: { prompt: string }) =>
      api.post<{ data: ConstraintModel }>('/book/story-engine/constraints', req),
    onSuccess: (data) => setConstraints(data.data),
  });

  const handleParse = useCallback(() => {
    if (!prompt.trim()) return;
    constraintsMutation.mutate({ prompt });
  }, [prompt, constraintsMutation]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamingText('');
    streamingTextRef.current = '';
    setStory(null);

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/book/story-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: 'literary' }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                streamingTextRef.current += parsed.text;
                setStreamingText(streamingTextRef.current);
              } else if (parsed.type === 'done') {
                // Build final story from accumulated streaming text
                setStory({
                  id: parsed.id,
                  text: streamingTextRef.current,
                  word_count: parsed.word_count,
                  constraints: constraints!,
                  validation: parsed.validation,
                });
                streamingTextRef.current = '';
              } else if (parsed.type === 'constraints') {
                setConstraints(parsed.data);
              } else if (parsed.type === 'error') {
                console.error('Story generation error:', parsed.message);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming error:', err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [prompt, isStreaming, constraints]);

  const handlePreset = useCallback((presetPrompt: string) => {
    setPrompt(presetPrompt);
    constraintsMutation.mutate({ prompt: presetPrompt });
  }, [constraintsMutation]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)' }}>
      {/* Sidebar */}
      <div style={{
        width: 280,
        borderRight: '1px solid #f0f0f0',
        padding: 16,
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          <ThunderboltOutlined /> Пресеты
        </Title>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {STORY_PRESETS.map((preset, i) => (
            <Button
              key={i}
              block
              onClick={() => handlePreset(preset.prompt)}
              style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
            >
              {preset.label}
            </Button>
          ))}
        </Space>

        <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
          <GlobalOutlined /> Мир
        </Title>
        <WorldModelPanel />
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        <Title level={2}>
          <ThunderboltOutlined /> Движок Повествования
        </Title>
        <Paragraph type="secondary">
          Создавайте истории внутри мира книги. Сначала система строит модель ограничений, затем LLM пишет внутри них.
        </Paragraph>

        {/* Input */}
        <Card style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <TextArea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={'Опишите историю, которую хотите создать...\nНапример: «Я хочу историю о молодом гиперборейце за 30 лет до появления Велика»'}
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
            <Space>
              <Button
                type="primary"
                icon={<ExperimentOutlined />}
                onClick={handleParse}
                loading={constraintsMutation.isPending}
              >
                Построить ограничения
              </Button>
              <Button
                icon={isStreaming ? <LoadingOutlined /> : <SendOutlined />}
                onClick={handleGenerate}
                loading={false}
                disabled={!constraints && !isStreaming}
              >
                {isStreaming ? 'Генерация...' : 'Сгенерировать историю'}
              </Button>
              {isStreaming && (
                <Button
                  danger
                  onClick={() => abortControllerRef.current?.abort()}
                >
                  Стоп
                </Button>
              )}
            </Space>
          </Space>
        </Card>

        {/* Constraints */}
        {constraints && (
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Модель ограничений</Title>
            <ConstraintDisplay constraints={constraints} />
          </div>
        )}

        {/* Story Output */}
        <StoryOutput story={story} streamingText={streamingText} isStreaming={isStreaming} />

        {/* Loading */}
        {constraintsMutation.isPending && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" tip="Анализ мира..." />
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function StoryPage() {
  return (
    <ProtectedRoute>
      <StoryPageContent />
    </ProtectedRoute>
  );
}
