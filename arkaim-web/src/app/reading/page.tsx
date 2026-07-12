'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, Empty, Spin, Space, Button, List, Tooltip, Progress, Divider, Segmented } from 'antd';
import { BookOutlined, LeftOutlined, RightOutlined, FontSizeOutlined, BulbOutlined, TeamOutlined, EnvironmentOutlined, StarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

type ChapterMeta = {
  id: string;
  title: string;
  char_count: number;
  index: number;
};

type ChapterFull = ChapterMeta & {
  content: string;
};

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
  author_intent: Record<string, unknown>;
};

const FONT_SIZES = [
  { label: 'Маленький', value: 14 },
  { label: 'Средний', value: 16 },
  { label: 'Большой', value: 18 },
  { label: 'Очень большой', value: 20 },
];

// ── Reading Content ──────────────────────────────

function ReadingView({ chapter, fontSize }: { chapter: ChapterFull; fontSize: number }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24, textAlign: 'center', lineHeight: 1.4 }}>{chapter.title}</Title>

      <Divider />

      {/* Content */}
      <div style={{ fontSize, lineHeight: 1.8, color: '#374151' }}>
        {chapter.content.split('\n\n').map((paragraph, i) => (
          <Paragraph key={i} style={{ fontSize, lineHeight: 1.8, marginBottom: '1.2em', textIndent: '2em' }}>
            {paragraph}
          </Paragraph>
        ))}
      </div>

      <Divider />

      {/* Navigation */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Конец раздела</Text>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────

function ReadingContent() {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [showToc, setShowToc] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Загрузка списка глав
  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => api.get<{ ok: boolean; data: ChapterMeta[]; total: number }>('/book/chapters'),
  });

  const chapters: ChapterMeta[] = chaptersData?.data || [];
  const currentChapter = chapters[chapterIndex];

  // Загрузка контента текущей главы
  const { data: chapterData, isLoading: chapterLoading } = useQuery({
    queryKey: ['chapter', currentChapter?.id],
    queryFn: () => api.get<{ ok: boolean; data: ChapterFull }>(`/book/chapters/${currentChapter?.id}`),
    enabled: !!currentChapter?.id,
  });

  const chapterContent: ChapterFull | undefined = chapterData?.data;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterIndex]);

  const prevChapter = () => { if (chapterIndex > 0) setChapterIndex(chapterIndex - 1); };
  const nextChapter = () => { if (chapterIndex < chapters.length - 1) setChapterIndex(chapterIndex + 1); };

  if (chaptersLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spin size="large" tip="Загрузка содержания..." />
      </div>
    );
  }

  if (chapters.length === 0) {
    return <Empty description="Содержание книги не найдено" />;
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 100px)' }}>
      {/* Table of Contents */}
      {showToc && (
        <div style={{ width: 260, flexShrink: 0, overflow: 'auto' }}>
          <Card size="small" title={<><BookOutlined /> Содержание</>} extra={<Tag>{chapters.length}</Tag>} style={{ marginBottom: 8 }}>
            <List
              size="small"
              dataSource={chapters}
              renderItem={(item, i) => (
                <List.Item
                  style={{ cursor: 'pointer', background: i === chapterIndex ? '#eff6ff' : undefined, borderRadius: 4, padding: '6px 8px' }}
                  onClick={() => setChapterIndex(i)}
                >
                  <Text style={{ fontSize: 12, color: i === chapterIndex ? '#2563eb' : undefined }}>
                    {i + 1}. {item.title}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {Math.round(item.char_count / 1000)}k
                  </Text>
                </List.Item>
              )}
            />
          </Card>

          {/* Quick links */}
          <Card size="small" title="Навигация">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <a href="/library" style={{ fontSize: 12 }}>📖 Библиотека</a>
              <a href="/book" style={{ fontSize: 12 }}>💬 Задать вопрос</a>
              <a href="/genres" style={{ fontSize: 12 }}>🏷 Жанры</a>
            </Space>
          </Card>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Space>
            <Button size="small" onClick={() => setShowToc(!showToc)}>
              {showToc ? 'Скрыть оглавление' : 'Показать оглавление'}
            </Button>
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>Размер:</Text>
            <Segmented
              size="small"
              options={FONT_SIZES.map(f => ({ label: f.label, value: f.value }))}
              value={fontSize}
              onChange={(v) => setFontSize(v as number)}
            />
          </Space>
        </div>

        {/* Content area */}
        <Card size="small" ref={contentRef} style={{ flex: 1, overflow: 'auto' }} bodyStyle={{ padding: '24px 32px' }}>
          {chapterLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
          ) : chapterContent ? (
            <ReadingView chapter={chapterContent} fontSize={fontSize} />
          ) : (
            <Empty description="Глава не найдена" />
          )}
        </Card>

        {/* Chapter navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button icon={<LeftOutlined />} onClick={prevChapter} disabled={chapterIndex === 0}>
            Предыдущая
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {chapterIndex + 1} / {chapters.length}
          </Text>
          <Button onClick={nextChapter} disabled={chapterIndex === chapters.length - 1}>
            Следующая <RightOutlined />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReadingPage() {
  return (
    <ProtectedRoute>
      <ReadingContent />
    </ProtectedRoute>
  );
}
