'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Typography, Space, Tag, List, Timeline, Button, Tabs, Row, Col, Statistic, Empty, Spin } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';

const { Title, Text, Paragraph } = Typography;

// ── Types ───────────────────────────────────────────────────

type Region = {
  id: string;
  name: string;
  type: string;
  coordinates: { lat: number; lng: number };
  description: string;
  era: string;
  color: string;
  icon: string;
};

type Route = {
  id: string;
  name: string;
  type: string;
  points: { lat: number; lng: number }[];
  color: string;
  dash: boolean;
  description: string;
};

type EnergyLine = {
  name: string;
  points: { lat: number; lng: number }[];
  color: string;
  description: string;
};

type MapData = {
  regions: Region[];
  routes: Route[];
  energy_lines: EnergyLine[];
};

type TimelineEvent = {
  year: string;
  title: string;
  description: string;
  type: 'civilization' | 'city' | 'event' | 'migration';
  color: string;
};

// ── Timeline Data ───────────────────────────────────────────

const TIMELINE_EVENTS: TimelineEvent[] = [
  { year: '~7000 до н.э.', title: 'Гиперборея (расцвет)', description: 'Древняя северная цивилизация на Севере, источник знаний', type: 'civilization', color: '#FFD700' },
  { year: '~5000 до н.э.', title: 'Строительство городов', description: 'Создание городищ с круглой планировкой', type: 'city', color: '#8B4513' },
  { year: '~4000 до н.э.', title: 'Аркаим', description: 'Строительство Аркаима — круглого города на Южном Урале', type: 'city', color: '#D2691E' },
  { year: '~3000 до н.э.', title: 'Гардарика', description: 'Сеть городищ вокруг Аркаима — Страна Городов', type: 'city', color: '#A0522D' },
  { year: '~3000 до н.э.', title: 'Океания', description: 'Могущественная держава, утратившая духовность', type: 'civilization', color: '#1E3A5F' },
  { year: '~2500 до н.э.', title: 'Мехенджо-Даро', description: 'Древний город Индии — связь с миграцией', type: 'city', color: '#B0C4DE' },
  { year: '~2100 до н.э.', title: 'Синташта', description: 'Крепость с древнейшими колесницами', type: 'city', color: '#A0522D' },
  { year: '~2000 до н.э.', title: 'Миграция на юг', description: 'Гипербореи переселяются на юг из-за климатических изменений', type: 'migration', color: '#FF9800' },
  { year: '~1500 до н.э.', title: 'Эмиграция в Европу', description: 'Распространение знаний по Евразии', type: 'migration', color: '#4FC3F7' },
  { year: '~1000 до н.э.', title: 'Кали Юга', description: 'Наступление эпохи хаоса и утраты знаний', type: 'event', color: '#8B0000' },
  { year: 'Настоящее', title: 'Аркаим открыт', description: 'Археологическое открытие — подтверждение древней цивилизации', type: 'event', color: '#228B22' },
];

// ── Map Component (Leaflet) ─────────────────────────────────

function MapView({ data }: { data: MapData }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      // Динамическая загрузка Leaflet
      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);

          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Leaflet'));
          document.body.appendChild(script);
        });
      }

      const L = (window as any).L;

      const map = L.map(mapRef.current!, {
        center: [52, 50],
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      data.regions.forEach(region => {
        const icon = L.divIcon({
          html: `<div style="background:${region.color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
          className: '',
          iconSize: [12, 12],
        });

        L.marker([region.coordinates.lat, region.coordinates.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${region.name}</b><br><small>${region.era}</small><br>${region.description}`);
      });

      data.routes.forEach(route => {
        const latlngs = route.points.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latlngs, {
          color: route.color,
          weight: 2,
          opacity: 0.7,
          dashArray: route.dash ? '5, 10' : undefined,
        }).addTo(map).bindPopup(`<b>${route.name}</b><br>${route.description}`);
      });

      data.energy_lines.forEach(line => {
        const latlngs = line.points.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latlngs, {
          color: line.color,
          weight: 1,
          opacity: 0.4,
          dashArray: '3, 6',
        }).addTo(map).bindPopup(`<b>${line.name}</b><br>${line.description}`);
      });

      mapInstanceRef.current = map;
      setLoading(false);
    };

    initMap().catch(() => setLoading(false));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <>
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /> Загрузка карты...</div>}
      <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '8px' }} />
    </>
  );
}

// ── Timeline Component ──────────────────────────────────────

function TimelineView() {
  return (
    <Card title={<><ClockCircleOutlined /> Хронология</>}>
      <Timeline
        items={TIMELINE_EVENTS.map(event => ({
          color: event.color,
          children: (
            <div>
              <Text strong>{event.year}</Text>
              <br />
              <Text>{event.title}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>{event.description}</Text>
            </div>
          ),
        }))}
      />
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────

function MapContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['map-data'],
    queryFn: () => api.get<MapData>('/book/community/map-data'),
  });

  const mapData: MapData = data || { regions: [], routes: [], energy_lines: [] };

  return (
    <>
      <Title level={2}><EnvironmentOutlined /> Карта и Хронология мира книги</Title>
      <Paragraph type="secondary">
        Интерактивная карта маршрутов миграций, энергетических линий и хронология событий книги.
      </Paragraph>

      <Tabs
        defaultActiveKey="map"
        items={[
          {
            key: 'map',
            label: <><EnvironmentOutlined /> Карта</>,
            children: (
              <Card>
                {isLoading ? (
                  <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
                ) : (
                  <MapView data={mapData} />
                )}
              </Card>
            ),
          },
          {
            key: 'timeline',
            label: <><ClockCircleOutlined /> Хронология</>,
            children: <TimelineView />,
          },
          {
            key: 'regions',
            label: <><EnvironmentOutlined /> Локации</>,
            children: (
              <Card>
                <List
                  dataSource={mapData.regions}
                  renderItem={region => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <span style={{ color: region.color }}>●</span>
                            <Text strong>{region.name}</Text>
                            <Tag>{region.type}</Tag>
                          </Space>
                        }
                        description={
                          <>
                            <Text type="secondary">{region.era}</Text>
                            <br />
                            <Text>{region.description}</Text>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
          {
            key: 'routes',
            label: <><ApartmentOutlined /> Маршруты</>,
            children: (
              <Card>
                <List
                  dataSource={mapData.routes}
                  renderItem={route => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <span style={{ color: route.color }}>—</span>
                            <Text strong>{route.name}</Text>
                          </Space>
                        }
                        description={route.description}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}

export default function MapPage() {
  return (
    <ProtectedRoute>
      <MapContent />
    </ProtectedRoute>
  );
}
