'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Row, Col, Tag, Tabs, Empty, Spin, Space, Button, List, Tooltip, Progress, Divider, Segmented } from 'antd';
import { BookOutlined, LeftOutlined, RightOutlined, FontSizeOutlined, BulbOutlined, TeamOutlined, EnvironmentOutlined, StarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

type GenomeData = {
  themes: Array<{ name: string; description?: string }>;
  characters: Array<{ id: string; name: string; role?: string; description?: string }>;
  values: Array<{ name: string; description?: string }>;
  world_entities: Array<{ id: string; name: string; type?: string }>;
  author_intent: Record<string, unknown>;
};

type LayersData = {
  knowledge_layer: string;
  meaning_layer: string;
  identity_layer: string;
  mission_layer: string;
};

type ChapterContent = {
  title: string;
  content: string;
  themes?: string[];
  characters?: string[];
  location?: string;
};

// Примеры контента глав (в реальном приложении загружаются из API)
const SAMPLE_CHAPTERS: ChapterContent[] = [
  {
    title: 'Пролог: Пробуждение',
    content: `Древние стены Аркаима хранят в себе память тысячелетий. Каждый камень, каждая трещина — это страница забытой истории, которая ждёт своего читателя.

Велик стоял на краю обрыва, глядя на равнину, раскинувшуюся внизу. Закатное солнце окрашивало горизонт в цвета, которые современный человек давно разучился видеть — не оранжевый и не красный, а нечто большее, нечто, что затрагивало самые глубокие струны души.

«Память — это не то, что мы храним», — произнёс он, обращаясь к невидимому слушателю. — «Память — это то, что хранит нас.»

Эти слова стали началом великого пути — пути, который приведёт читателя сквозь слои времени, через забытые цивилизации и потерянные знания, к самому сердцу того, что значит быть человеком.`,
    themes: ['Память предков', 'Духовная эволюция'],
    characters: ['Велик'],
    location: 'Аркаим',
  },
  {
    title: 'Глава I: Наследие Учения',
    content: `Каждая великая традиция начинается с одного вопроса — «Зачем?». Не «как», не «что», а именно «зачем». Этот вопрос — ключ, который открывает двери в мир, где прошлое и будущее переплетаются в единую ткань бытия.

Наследие — это не то, что оставляют после себя. Наследие — это то, что живёт внутри нас, передаётся из поколения в поколение, обогащаясь новыми смыслами и оттенками.

Велик понимал это лучше других. Его знания weren't just information — they were living wisdom, capable of transforming anyone, кто был готов её принять.`,
    themes: ['Наследие Учения', 'Мудрость'],
    characters: ['Велик'],
  },
  {
    title: 'Глава II: Кали Юга и Сати Юга',
    content: `Миф о четырёх югах — это не просто древняя космогония. Это зеркало, в котором каждая эпоха видит себя. Кали Юга — эпоха раздора и забвения — описана в текстах с такой точностью, что современный читатель невольно узнаёт в ней себя.

Но за тьмой всегда скрывается свет. Сати Юга — золотой век — ждёт своего пробуждения. И пробуждение это начинается не с глобальных перемен, а с маленького, почти незаметного шага внутри каждого из нас.`,
    themes: ['Кали Юга и Сати Юга', 'Духовная эволюция'],
    characters: [],
  },
  {
    title: 'Глава III: Память предков',
    content: `Мы носим в себе миллионы жизней. Каждый наш предок оставил свой след — в генах, в обычаях, в глубинных инстинктах, которые мы не всегда понимаем.

Память предков — это не метафора. Это реальность, доступная каждому, кто готов замедлиться и прислушаться. В тишине, между мыслями, можно услышать голоса тех, кто жил до нас — не как призраки, а как мудрые наставники, чей опыт продолжает жить в нашей крови.`,
    themes: ['Память предков', 'Традиции'],
    characters: [],
  },
  {
    title: 'Глава IV: Духовная эволюция',
    content: `Эволюция — не линейный процесс. Это спираль, которая виток за витком поднимается всё выше, охватывая новые горизонты понимания.

Духовная эволюция — это не отказ от мира, а углубление в него. Это способность видеть за видимым невидимое, за случайным — закономерное, за временным — вечное.

Каждый вопрос, который мы задаём книге, каждый ответ, который мы получаем — это шаг на пути эволюции нашего сознания.`,
    themes: ['Духовная эволюция', 'Сознание'],
    characters: [],
  },
];

const FONT_SIZES = [
  { label: 'Маленький', value: 14 },
  { label: 'Средний', value: 16 },
  { label: 'Большой', value: 18 },
  { label: 'Очень большой', value: 20 },
];

// ── Reading Content ──────────────────────────────

function ReadingView({ chapter, fontSize }: { chapter: ChapterContent; fontSize: number }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24, textAlign: 'center', lineHeight: 1.4 }}>{chapter.title}</Title>

      {/* Meta */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Space size={8} wrap>
          {chapter.themes?.map((t, i) => <Tag key={i} color="purple">{t}</Tag>)}
          {chapter.characters?.map((c, i) => <Tag key={i} color="blue">{c}</Tag>)}
          {chapter.location && <Tag color="orange">{chapter.location}</Tag>}
        </Space>
      </div>

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

  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const chapter = SAMPLE_CHAPTERS[chapterIndex];

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterIndex]);

  const prevChapter = () => { if (chapterIndex > 0) setChapterIndex(chapterIndex - 1); };
  const nextChapter = () => { if (chapterIndex < SAMPLE_CHAPTERS.length - 1) setChapterIndex(chapterIndex + 1); };

  return (
    <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 100px)' }}>
      {/* Table of Contents */}
      {showToc && (
        <div style={{ width: 260, flexShrink: 0, overflow: 'auto' }}>
          <Card size="small" title={<><BookOutlined /> Содержание</>} style={{ marginBottom: 8 }}>
            <List
              size="small"
              dataSource={SAMPLE_CHAPTERS}
              renderItem={(item, i) => (
                <List.Item
                  style={{ cursor: 'pointer', background: i === chapterIndex ? '#eff6ff' : undefined, borderRadius: 4, padding: '6px 8px' }}
                  onClick={() => setChapterIndex(i)}
                >
                  <Text style={{ fontSize: 12, color: i === chapterIndex ? '#2563eb' : undefined }}>
                    {i + 1}. {item.title}
                  </Text>
                </List.Item>
              )}
            />
          </Card>

          {/* Chapter themes */}
          {chapter.themes && chapter.themes.length > 0 && (
            <Card size="small" title="Темы главы" style={{ marginBottom: 8 }}>
              <Space wrap>
                {chapter.themes.map((t, i) => <Tag key={i} color="purple" style={{ fontSize: 11 }}>{t}</Tag>)}
              </Space>
            </Card>
          )}

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
          <ReadingView chapter={chapter} fontSize={fontSize} />
        </Card>

        {/* Chapter navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Button icon={<LeftOutlined />} onClick={prevChapter} disabled={chapterIndex === 0}>
            Предыдущая
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {chapterIndex + 1} / {SAMPLE_CHAPTERS.length}
          </Text>
          <Button onClick={nextChapter} disabled={chapterIndex === SAMPLE_CHAPTERS.length - 1}>
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
