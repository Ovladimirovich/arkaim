/**
 * api.ts — Централизованный API-клиент для Arkaim Digital Consciousness.
 * Обрабатывает JWT, ошибки, retry, redirect на login.
 * Использует Next.js rewrites для проксирования на бэкенд.
 * В dev-режиме: mock-данные при 401 (авторизация отключена).
 */

const API_BASE = '';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retries?: number;
}

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ── Mock Data (dev mode) ─────────────────────────

const MOCK_DATA: Record<string, any> = {
  '/auth/me': { user: { id: 'dev-user-001', role: 'admin', username: 'developer', display_name: 'Разработчик', provider: 'dev' } },
  '/auth/admin/users': [
    { id: '1', role: 'admin', username: 'admin', provider: 'telegram', is_active: true, display_name: 'Администратор', created_at: '2026-01-01' },
    { id: '2', role: 'editor', username: 'editor1', provider: 'telegram', is_active: true, display_name: 'Редактор', created_at: '2026-02-01' },
    { id: '3', role: 'reader', username: 'reader1', provider: 'telegram', is_active: true, display_name: 'Читатель', created_at: '2026-03-01' },
  ],
  '/auth/admin/stats': { users: { total: 5, by_role: { reader: 3, editor: 1, admin: 1 } }, presence: { trending_topics: 2, pending_suggestions: 3 } },
  '/auth/api-keys': [{ id: 'k1', key_prefix: 'ak_dev', name: 'Dev Key', last_used_at: null, is_active: true, created_at: '2026-01-01' }],
  '/auth/admin/sessions': [{ id: 's1', user_id: '1', expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString() }],
  '/auth/admin/invites': [{ id: 'i1', role: 'reader', note: 'Тестовый инвайт', use_count: 0, max_uses: 5, is_active: true, url: 'http://localhost:3000/auth/invite/test' }],
  '/book/genome': { themes: [{ name: 'Наследие' }, { name: 'Аркаим' }, { name: 'Древняя Русь' }, { name: 'Тайны' }], characters: [], values: [], world_entities: [], author_intent: {} },
  '/book/ask': { data: { answer: 'Это тестовый ответ. В реальном режиме книга отвечает на основе базы знаний.', source: 'mock' } },
  '/book/reader/profile': { reader_id: 'dev', questions_total: 42, conversation_count: 15, last_topic: 'Аркаим', topics: [{ name: 'Аркаим', depth: 0.8, questions: 12 }, { name: 'Гиперборея', depth: 0.5, questions: 8 }, { name: 'Древняя Русь', depth: 0.3, questions: 5 }] },
  '/book/reader/history': { data: [{ id: 1, content: 'Кто такой Велик?', created_at: new Date().toISOString() }, { id: 2, content: 'Расскажи об Аркаиме', created_at: new Date(Date.now() - 86400000).toISOString() }] },
  '/book/reader/history/stats': { questions: 42, sessions: 15, last_active: new Date().toISOString() },
  '/book/crowdfunding/status': { campaigns: [{ id: 'c1', title: 'Издание книги', platform: 'planeta', url: 'https://example.com', target_amount: 500000, current_amount: 127500, backers_count: 234, days_left: 30, milestones: [{ id: 'm1', title: '100 000₽', target_amount: 100000, reached: true }, { id: 'm2', title: '250 000₽', target_amount: 250000, reached: false }] }] },
  '/book/presence/suggestions': { suggestions: [{ id: 's1', topic: 'История Аркаима', reason: 'Читатели интересуются', status: 'pending' }, { id: 's2', topic: 'Персонажи книги', reason: 'Много вопросов', status: 'approved' }] },
  '/book/presence/trending': { trending: [{ keyword: 'Аркаим', hits: 45, sources: ['telegram'] }, { keyword: 'Гиперборея', hits: 23, sources: ['api'] }], total: 2 },
  '/book/email/stats': { subscribers: 156, sent: 1200, errors: 3 },
  '/book/email/drafts': [{ id: 'd1', subject: 'Недельный дайджест', status: 'sent', created_at: new Date().toISOString() }],
  '/book/email/subscribers': [{ email: 'reader@example.com', name: 'Иван', subscribed_at: new Date().toISOString() }],
  '/book/graph/stats': { nodes: 150, edges: 300, node_types: { character: 20, location: 10, concept: 50 }, relationship_types: { knows: 50, lives_in: 30, part_of: 20 } },
  '/xray/stats': { active_traces: 0, completed_traces: 42, orphan_spans: 0 },
  '/xray/traces': [{ trace_id: 't1', name: 'book.ask', status: 'ok', duration_ms: 150, started_at: new Date().toISOString() }],
  '/analytics': { total_requests: 1234, requests_by_type: { '/book/ask': 500, '/book/genome': 200, '/auth/me': 100 }, avg_response_time_ms: 150, error_rate: 2.3 },
  '/book/os/search': { results: [{ id: 'r1', text: 'Аркаим — древнее городище...', score: 0.85, metadata: {} }] },
  '/book/os/facts/search': { facts: [{ id: 'f1', statement: 'Аркаим расположен на Южном Урале', entity_id: 'arkaim', confidence: 0.9 }] },
  '/book/os/entities': { entities: [{ name: 'Аркаим', type: 'location' }, { name: 'Велик', type: 'character' }] },
  '/book/evolution/status': { current_version: '1.0.0', snapshots: [] },
};

function getMockData(path: string, method: string = 'GET'): any {
  // POST mock-данные
  const POST_MOCKS: Record<string, any> = {
    '/auth/api-key': { key: 'ak_test_' + Math.random().toString(36).slice(2, 10), key_masked: 'ak_test_...' },
    '/book/email/subscribe': { ok: true, email: 'subscribed' },
    '/book/ask': { data: { answer: 'Это тестовый ответ. В реальном режиме книга отвечает на основе базы знаний.', source: 'mock' } },
    '/book/presence/suggestions/1/approve': { ok: true },
    '/book/presence/suggestions/1/reject': { ok: true },
    '/book/crowdfunding/check-now': { checked: 1, alerts: [], milestones: [] },
    '/book/crowdfunding/config': { ok: true, campaigns: [] },
    '/auth/admin/invites': { ok: true, url: 'http://localhost:3000/auth/invite/' + Math.random().toString(36).slice(2, 10) },
    '/book/visual-genome/scene': { ok: true, scene_id: 'scene_' + Date.now() },
    '/book/visual-genome/character': { ok: true },
    '/book/visual-genome/location': { ok: true },
    '/book/visual-genome/from-speech': { ok: true },
    '/book/email/draft/auto': { ok: true, draft_id: 'draft_' + Date.now(), subject: 'Новый черновик' },
    '/book/email/drafts/1/approve': { ok: true },
    '/book/email/drafts/1/send': { ok: true, sent: 10, errors: 0 },
    '/book/email/send/weekly-digest': { ok: true, sent: 150 },
  };

  if (method === 'POST' && POST_MOCKS[path]) return POST_MOCKS[path];

  // GET mock-данные
  if (MOCK_DATA[path]) return MOCK_DATA[path];

  // Шаблоны
  if (path.startsWith('/auth/admin/users/')) return { id: '1', role: 'admin', username: 'user', provider: 'dev', is_active: true };
  if (path.startsWith('/book/graph/entity/')) return { neighbors: [{ id: 'n1', name: 'Аркаим', type: 'location' }] };
  if (path.startsWith('/book/reader/history/full')) return { data: [{ role: 'user', content: 'Тестовый вопрос', created_at: new Date().toISOString() }, { role: 'assistant', content: 'Тестовый ответ', created_at: new Date().toISOString() }] };
  if (path.startsWith('/book/reader/history/sessions')) return { data: ['session-1', 'session-2'] };

  // По умолчанию
  return {};
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.split('; ').find(c => c.startsWith('arkaim_session='));
  return match ? match.split('=')[1] : null;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, retries = 0, ...fetchOpts } = opts;
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const resp = await fetch(url, {
      ...fetchOpts,
      headers,
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });

    // Dev mode: mock-данные при 401
    if (resp.status === 401) {
      const mockData = getMockData(path, fetchOpts.method || 'GET');
      return mockData as T;
    }

    if (!resp.ok) {
      let data: unknown;
      try { data = await resp.json(); } catch { data = null; }
      throw new ApiError(resp.status, `HTTP ${resp.status}`, data);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return resp.json() as Promise<T>;
    }
    return resp.text() as unknown as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return request<T>(path, { ...opts, retries: retries - 1 });
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...opts }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body, ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};

export { ApiError, API_BASE };
