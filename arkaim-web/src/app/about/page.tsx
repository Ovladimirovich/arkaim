'use client';

import { Card, Typography, Row, Col, Tag, Spin, Tabs, Descriptions, Empty, Timeline } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

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

type EvolutionData = {
  current_version: string;
  snapshots: Array<{ version: string; created_at: string; description?: string }>;
};

const CARDS = [
  { key: 'characters', title: 'Персонажи', color: '#2563eb' },
  { key: 'themes', title: 'Темы', color: '#7c3aed' },
  { key: 'values', title: 'Ценности', color: '#059669' },
  { key: 'world_entities', title: 'Мир', color: '#d97706' },
  { key: 'author_intent', title: 'Замысел автора', color: '#dc2626' },
];

const LAYER_COLORS: Record<string, string> = {
  knowledge: '#2563eb',
  meaning: '#7c3aed',
  identity: '#059669',
  mission: '#d97706',
};

const LAYER_LABELS: Record<string, string> = {
  knowledge: 'Знание',
  meaning: 'Смысл',
  identity: 'Идентичность',
  mission: 'Миссия',
};

export default function AboutPage() {
  const { data: genome, isLoading } = useQuery({
    queryKey: ['genome-full'],
    queryFn: () => api.get<GenomeData>('/book/genome'),
  });

  const { data: layers } = useQuery({
    queryKey: ['book-layers'],
    queryFn: () => api.get<LayersData>('/book/layers'),
  });

  const { data: evolution } = useQuery({
    queryKey: ['evolution-status'],
    queryFn: () => api.get<EvolutionData>('/book/evolution/status'),
  });

  const genomeTab = (
    <>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (
        <Row gutter={[16, 16]}>
          {CARDS.map(card => {
            const items = genome?.[card.key as keyof GenomeData];
            const isArray = Array.isArray(items);
            const count = isArray ? items.length : items ? Object.keys(items).length : 0;

            return (
              <Col xs={24} sm={12} lg={8} key={card.key}>
                <Card
                  title={<span style={{ color: card.color }}>{card.title}</span>}
                  extra={<Tag>{count} шт.</Tag>}
                  style={{ height: '100%' }}
                >
                  {isArray ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {items.slice(0, 8).map((item: any, i: number) => (
                        <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                          <Text strong>{item.name || item.id}</Text>
                          {item.role && <Text type="secondary"> — {item.role}</Text>}
                        </li>
                      ))}
                    </ul>
                  ) : items && typeof items === 'object' ? (
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      {Object.entries(items).slice(0, 5).map(([k, v]) => (
                        <div key={k}><Text strong>{k}:</Text> {String(v)}</div>
                      ))}
                    </Text>
                  ) : (
                    <Text type="secondary">Нет данных</Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );

  const layersTab = (
    <Row gutter={[16, 16]}>
      {layers ? (
        Object.entries(layers).map(([key, value]) => {
          const layerKey = key.replace('_layer', '');
          return (
            <Col xs={24} sm={12} key={key}>
              <Card
                size="small"
                title={<span style={{ color: LAYER_COLORS[layerKey] || '#333' }}>{LAYER_LABELS[layerKey] || layerKey}</span>}
                style={{ height: '100%' }}
              >
                <Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                  {value || <Text type="secondary">Слой пока не определён</Text>}
                </Paragraph>
              </Card>
            </Col>
          );
        })
      ) : (
        <Col span={24}>
          <Card>
            <Empty description="Слои сознания ещё не сформированы. Задавайте вопросы книге — и слои начнут формироваться." />
          </Card>
        </Col>
      )}
    </Row>
  );

  const evolutionTab = (
    <Card>
      {evolution ? (
        <>
          <Descriptions bordered size="small" style={{ marginBottom: 24 }}>
            <Descriptions.Item label="Текущая версия">
              <Tag color="blue" style={{ fontSize: 14 }}>{evolution.current_version}</Tag>
            </Descriptions.Item>
          </Descriptions>
          {evolution.snapshots && evolution.snapshots.length > 0 ? (
            <Timeline
              items={evolution.snapshots.map((s) => ({
                color: 'green',
                children: (
                  <div>
                    <Text strong>{s.version}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(s.created_at).toLocaleString('ru')}
                    </Text>
                    {s.description && <div><Text style={{ fontSize: 13 }}>{s.description}</Text></div>}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Пока нет снапшотов эволюции" />
          )}
        </>
      ) : (
        <Empty description="Информация об эволюции недоступна" />
      )}
    </Card>
  );

  const items = [
    { key: 'genome', label: 'Геном книги', children: genomeTab },
    { key: 'layers', label: 'Слои сознания', children: layersTab },
    { key: 'evolution', label: 'Эволюция', children: evolutionTab },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>О книге «Наследие Аркаима»</Title>
        <Paragraph style={{ maxWidth: 720, fontSize: 16, lineHeight: 1.7 }}>
          Интерактивное исследование содержания книги. Изучайте персонажей, темы,
          ценности и мир, в котором происходит действие. Следите за эволюцией
          цифрового сознания книги.
        </Paragraph>
      </div>

      <Tabs items={items} />
    </div>
  );
}
