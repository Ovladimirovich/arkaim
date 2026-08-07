'use client';

import { useState } from 'react';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { ProtectedRoute } from '@/shared/lib/guards';
import { LCard } from '@/shared/ui/light/LCard';
import { LButton } from '@/shared/ui/light/LButton';
import { LSpin } from '@/shared/ui/light/LSpin';
import { LEmpty } from '@/shared/ui/light/LEmpty';
import { LStatistic } from '@/shared/ui/light/LStatistic';

type HistoryItem = {
  id: string;
  session_id?: string;
  question: string;
  answer: string;
  created_at: string;
};

type HistoryStats = {
  questions: number;
  sessions: number;
  last_active: string | null;
};

function HistoryContent() {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'conversation'>('list');

  const { data: stats } = useQuery({
    queryKey: ['history-stats'],
    queryFn: () => api.get<HistoryStats>('/book/reader/history/stats'),
  });

  const { data: sessions } = useQuery({
    queryKey: ['history-sessions'],
    queryFn: () => api.get<{ data: string[] }>('/book/reader/history/sessions'),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['history', selectedSession],
    queryFn: () => selectedSession
      ? api.get<{ data: HistoryItem[] }>(`/book/reader/history/full?session_id=${encodeURIComponent(selectedSession)}&limit=100`)
      : api.get<{ data: HistoryItem[] }>('/book/reader/history?limit=50'),
  });

  const items = history?.data || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        <HistoryOutlined /> История вопросов
      </h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <LCard><LStatistic title="Вопросов" value={stats?.questions ?? 0} /></LCard>
        <LCard><LStatistic title="Сессий" value={stats?.sessions ?? 0} /></LCard>
        <LCard><LStatistic title="Последняя активность" value={stats?.last_active ? new Date(stats.last_active).toLocaleDateString('ru') : '—'} /></LCard>
      </div>

      {/* Filters */}
      <LCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={selectedSession}
            onChange={e => { setSelectedSession(e.target.value); setViewMode(e.target.value ? 'conversation' : 'list'); }}
            style={{ flex: 1, maxWidth: 300, padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14 }}
          >
            <option value="">Все сессии</option>
            {(sessions?.data || []).map(s => (
              <option key={s} value={s}>{s.slice(0, 30)}...</option>
            ))}
          </select>
          <LButton icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            Обновить
          </LButton>
        </div>
      </LCard>

      {/* Content */}
      <LCard>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><LSpin /></div>
        ) : items.length === 0 ? (
          <LEmpty description="Нет истории вопросов" />
        ) : viewMode === 'list' ? (
          <div>
            {(items as HistoryItem[]).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.session_id) {
                    setSelectedSession(item.session_id);
                    setViewMode('conversation');
                  }
                }}
                style={{ padding: '12px 0', borderBottom: '1px solid var(--divider-color)', cursor: item.session_id ? 'pointer' : 'default' }}
              >
                <div style={{ fontWeight: 500 }}>{item.question}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#999' }}>{new Date(item.created_at).toLocaleString('ru')}</span>
                  {item.session_id && <span style={{ fontSize: 12, color: '#999' }}>Сессия: {item.session_id.slice(0, 16)}...</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {(items as HistoryItem[]).flatMap((item: HistoryItem) => [
              { role: 'user' as const, content: item.question, created_at: item.created_at },
              { role: 'assistant' as const, content: item.answer, created_at: item.created_at },
            ]).map((item, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--divider-color)' }}>
                <div style={{ fontWeight: 500, color: item.role === 'user' ? '#1677ff' : '#52c41a', marginBottom: 4 }}>
                  {item.role === 'user' ? 'Вы' : 'Книга'}
                </div>
                <div>{item.content}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {new Date(item.created_at).toLocaleString('ru')}
                </div>
              </div>
            ))}
          </div>
        )}
      </LCard>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
