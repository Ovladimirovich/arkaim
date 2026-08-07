'use client';

import { useState, useEffect, useRef } from 'react';
import { EnvironmentOutlined, ClockCircleOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import { LCard } from '@/shared/ui/light/LCard';
import { LTag } from '@/shared/ui/light/LTag';
import { LSpin } from '@/shared/ui/light/LSpin';

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

function MapView({ data }: { data: MapData }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <>
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><LSpin size="small" /> Загрузка карты...</div>}
      <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '8px' }} />
    </>
  );
}

function TimelineView() {
  return (
    <LCard title={<span><ClockCircleOutlined /> Хронология</span>}>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, background: 'var(--divider-color)' }} />
        {TIMELINE_EVENTS.map((event, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 16, paddingLeft: 16 }}>
            <div style={{ position: 'absolute', left: -17, top: 4, width: 10, height: 10, borderRadius: '50%', background: event.color, border: '2px solid #fff' }} />
            <div style={{ fontWeight: 500 }}>{event.year}</div>
            <div style={{ fontWeight: 500 }}>{event.title}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{event.description}</div>
          </div>
        ))}
      </div>
    </LCard>
  );
}

function MapContent() {
  const [activeTab, setActiveTab] = useState('map');
  const { data, isLoading } = useQuery({
    queryKey: ['map-data'],
    queryFn: () => api.get<MapData>('/book/community/map-data'),
  });

  const mapData: MapData = data || { regions: [], routes: [], energy_lines: [] };

  const tabs = [
    { key: 'map', label: 'Карта', icon: <EnvironmentOutlined /> },
    { key: 'timeline', label: 'Хронология', icon: <ClockCircleOutlined /> },
    { key: 'regions', label: 'Локации', icon: <EnvironmentOutlined /> },
    { key: 'routes', label: 'Маршруты', icon: <ApartmentOutlined /> },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}><EnvironmentOutlined /> Карта и Хронология мира книги</h2>
      <p style={{ color: '#999', marginBottom: 16 }}>
        Интерактивная карта маршрутов миграций, энергетических линий и хронология событий книги.
      </p>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--divider-color)', marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              color: activeTab === tab.key ? '#1677ff' : '#666',
              borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
              marginBottom: -1,
              fontWeight: activeTab === tab.key ? 500 : 400,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'map' && (
        <LCard>
          {isLoading ? (
            <div style={{ display: 'block', margin: '100px auto', textAlign: 'center' }}><LSpin size="large" /></div>
          ) : (
            <MapView data={mapData} />
          )}
        </LCard>
      )}

      {activeTab === 'timeline' && <TimelineView />}

      {activeTab === 'regions' && (
        <LCard>
          {mapData.regions.map(region => (
            <div key={region.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--divider-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: region.color }}>●</span>
                <strong>{region.name}</strong>
                <LTag>{region.type}</LTag>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{region.era}</div>
              <div style={{ marginTop: 4 }}>{region.description}</div>
            </div>
          ))}
        </LCard>
      )}

      {activeTab === 'routes' && (
        <LCard>
          {mapData.routes.map(route => (
            <div key={route.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--divider-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: route.color }}>—</span>
                <strong>{route.name}</strong>
              </div>
              <div style={{ marginTop: 4 }}>{route.description}</div>
            </div>
          ))}
        </LCard>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <ProtectedRoute>
      <MapContent />
    </ProtectedRoute>
  );
}
