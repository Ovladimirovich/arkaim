'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Spin, Space, Button, List, Divider, Segmented, Empty } from 'antd';
import { VideoCameraOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

type SceneMeta = {
  id: string;
  title: string;
  char_count: number;
  index: number;
};

type SceneFull = SceneMeta & {
  content: string;
};

const FONT_SIZES = [
  { label: 'Маленький', value: 14 },
  { label: 'Средний', value: 16 },
  { label: 'Большой', value: 18 },
];

function SceneView({ scene, fontSize }: { scene: SceneFull; fontSize: number }) {
  const lines = scene.content.split('\n');
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>
        <VideoCameraOutlined style={{ marginRight: 8, color: '#dc2626' }} />
        {scene.title}
      </Title>
      <Divider />
      <div style={{ fontSize, lineHeight: 1.8, color: '#374151' }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} style={{ height: '0.8em' }} />;
          // Ремарки камеры в скобках — курсив
          if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return (
              <Paragraph key={i} style={{ fontSize, fontStyle: 'italic', color: '#6b7280', marginBottom: '0.6em' }}>
                {trimmed}
              </Paragraph>
            );
          }
          // Имя персонажа (заглавными) — жирный
          if (/^[А-ЯЁ\s-]+$/.test(trimmed) && trimmed.length < 40) {
            return (
              <Paragraph key={i} style={{ fontSize, fontWeight: 700, textAlign: 'center', marginTop: '1em', marginBottom: '0.3em' }}>
                {trimmed}
              </Paragraph>
            );
          }
          // Реплика начинается с тире
          if (trimmed.startsWith('-')) {
            return (
              <Paragraph key={i} style={{ fontSize, marginLeft: '2em', marginBottom: '0.6em' }}>
                {trimmed}
              </Paragraph>
            );
          }
          return (
            <Paragraph key={i} style={{ fontSize, marginBottom: '0.6em' }}>
              {trimmed}
            </Paragraph>
          );
        })}
      </div>
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Конец сцены</Text>
      </div>
    </div>
  );
}

function ScreenplayContent() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [showToc, setShowToc] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: scenesData, isLoading: scenesLoading } = useQuery({
    queryKey: ['screenplay-scenes'],
    queryFn: () => api.get<{ ok: boolean; data: SceneMeta[]; total: number }>('/book/screenplay'),
  });

  const scenes: SceneMeta[] = scenesData?.data || [];
  const currentScene = scenes[sceneIndex];

  const { data: sceneData, isLoading: sceneLoading } = useQuery({
    queryKey: ['screenplay-scene', currentScene?.id],
    queryFn: () => api.get<{ ok: boolean; data: SceneFull }>(`/book/screenplay/${currentScene?.id}`),
    enabled: !!currentScene?.id,
  });

  const sceneContent: SceneFull | undefined = sceneData?.data;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sceneIndex]);

  const prevScene = () => { if (sceneIndex > 0) setSceneIndex(sceneIndex - 1); };
  const nextScene = () => { if (sceneIndex < scenes.length - 1) setSceneIndex(sceneIndex + 1); };

  if (scenesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spin size="large" tip="Загрузка сценария..." />
      </div>
    );
  }

  if (scenes.length === 0) {
    return <Empty description="Сценарий не найден" />;
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 100px)' }}>
      {showToc && (
        <div style={{ width: 280, flexShrink: 0, overflow: 'auto' }}>
          <Card size="small" title={<><VideoCameraOutlined /> Сцены</>} extra={<Text type="secondary">{scenes.length}</Text>} style={{ marginBottom: 8 }}>
            <List
              size="small"
              dataSource={scenes}
              renderItem={(item, i) => (
                <List.Item
                  style={{ cursor: 'pointer', background: i === sceneIndex ? '#fef2f2' : undefined, borderRadius: 4, padding: '6px 8px' }}
                  onClick={() => setSceneIndex(i)}
                >
                  <Text style={{ fontSize: 11, color: i === sceneIndex ? '#dc2626' : undefined }}>
                    {item.title}
                  </Text>
                </List.Item>
              )}
            />
          </Card>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Button size="small" onClick={() => setShowToc(!showToc)}>
              {showToc ? 'Скрыть' : 'Сцены'}
            </Button>
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>Шрифт:</Text>
            <Segmented
              size="small"
              options={FONT_SIZES.map(f => ({ label: f.label, value: f.value }))}
              value={fontSize}
              onChange={(v) => setFontSize(v as number)}
            />
          </Space>
        </div>

        <Card size="small" ref={contentRef} style={{ flex: 1, overflow: 'auto' }} bodyStyle={{ padding: '24px 32px' }}>
          {sceneLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
          ) : sceneContent ? (
            <SceneView scene={sceneContent} fontSize={fontSize} />
          ) : (
            <Empty description="Сцена не найдена" />
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button icon={<LeftOutlined />} onClick={prevScene} disabled={sceneIndex === 0}>
            Предыдущая
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {sceneIndex + 1} / {scenes.length}
          </Text>
          <Button onClick={nextScene} disabled={sceneIndex === scenes.length - 1}>
            Следующая <RightOutlined />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScreenplayPage() {
  return (
    <ProtectedRoute>
      <ScreenplayContent />
    </ProtectedRoute>
  );
}
