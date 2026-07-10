// app.js — Arkaim Web UI

document.addEventListener('DOMContentLoaded', () => {
  loadUser();

  const page = document.body.className;
  if (page === 'page-book') loadBookMeta();
  if (page === 'page-about') loadAbout();
  if (page === 'page-profile') loadProfile();
  if (page === 'page-admin') connectWS();
});

// ── API helper ────────────────────────

async function api(path, opts = {}) {
  const resp = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  if (resp.status === 401) { window.location.href = '/auth/login'; return null; }
  return resp.json();
}

async function loadUser() {
  const data = await api('/auth/me');
  if (!data) return;
  const u = data.user;
  const nameEl = document.getElementById('navUserName');
  if (nameEl) nameEl.textContent = u.display_name || u.username || u.id;
  const uploadLink = document.getElementById('navUpload');
  if (uploadLink && (u.role === 'editor' || u.role === 'admin')) uploadLink.style.display = 'inline';
  const adminLink = document.getElementById('navAdmin');
  if (adminLink && u.role === 'admin') adminLink.style.display = 'inline';
  if (document.body.classList.contains('page-admin') && u.role === 'admin') loadAdmin();
}

// ── Book page ────────────────────────

async function loadBookMeta() {
  const [genome, profile] = await Promise.all([
    api('/book/genome').catch(() => null),
    api('/book/reader/profile').catch(() => null),
  ]);

  const themesEl = document.getElementById('bookThemes');
  if (themesEl && genome) {
    const themes = genome.themes || [];
    themesEl.textContent = themes.map(t => t.name || t).join(', ') || '—';
  }

  const topicList = document.getElementById('topicList');
  if (topicList && profile) {
    const topics = profile.topics || [];
    if (topics.length === 0) {
      topicList.innerHTML = '<div class="topic-item">Вы ещё не задавали вопросов</div>';
    } else {
      topicList.innerHTML = topics.map(t =>
        `<div class="topic-item">
          <span class="topic-name">${t.name}</span>
          <span class="topic-depth">${(t.depth * 100).toFixed(0)}%</span>
          <span class="topic-count">${t.questions} вопр.</span>
        </div>`
      ).join('');
    }
  }
}

// ── About page ───────────────────────

async function loadAbout() {
  const genome = await api('/book/genome').catch(() => null);
  if (!genome) return;

  setCard('aboutCharacters', 'list', genome.characters?.slice(0, 10).map(c =>
    `<li><strong>${c.name}</strong>${c.description ? ' — ' + c.description.slice(0, 100) : ''}</li>`
  ).join('') || 'Нет данных');

  setCard('aboutThemes', 'list', genome.themes?.slice(0, 10).map(t =>
    `<li><strong>${t.name}</strong>${t.description ? ' — ' + t.description.slice(0, 100) : ''}</li>`
  ).join('') || 'Нет данных');

  setCard('aboutSymbols', 'list', (genome.symbols || []).slice(0, 8).map(s =>
    `<li><strong>${s.name}</strong>${s.meaning ? ' — ' + s.meaning.slice(0, 100) : ''}</li>`
  ).join('') || 'Нет данных');

  setCard('aboutConflicts', 'list', (genome.conflicts || []).slice(0, 6).map(c =>
    `<li><strong>${c.name}</strong> (${c.type || ''})</li>`
  ).join('') || 'Нет данных');

  setCard('aboutEntities', 'list', (genome.world_entities || []).slice(0, 8).map(e =>
    `<li><strong>${e.name}</strong> — ${(e.description || '').slice(0, 80)}</li>`
  ).join('') || 'Нет данных');

  setCard('aboutValues', 'list', (genome.values || []).slice(0, 8).map(v =>
    `<li><strong>${v.name}</strong>${v.description ? ' — ' + v.description.slice(0, 100) : ''}</li>`
  ).join('') || 'Нет данных');
}

function setCard(id, tag, html) {
  const el = document.getElementById(id);
  if (!el) return;
  if (tag === 'list') el.querySelector('.about-loading')?.remove();
  el.innerHTML += `<ul>${html}</ul>`;
}

// ── Profile page ─────────────────────

async function loadProfile() {
  const profile = await api('/book/reader/profile').catch(() => null);
  if (!profile) return;

  const summary = document.getElementById('profileSummary');
  if (summary) summary.textContent = `Всего вопросов: ${profile.questions_total}, тем: ${(profile.topics || []).length}`;

  const topicsEl = document.getElementById('profileTopics');
  if (topicsEl) {
    const topics = profile.topics || [];
    const listEl = topicsEl.querySelector('.topics-loading') || topicsEl.querySelector('div');
    if (listEl) {
      if (topics.length === 0) {
        listEl.innerHTML = '<p>Вы ещё не задавали вопросов. Откройте <a href="/_ui/book">страницу книги</a>.</p>';
      } else {
        listEl.outerHTML = '<div class="topics-list">' +
          topics.map(t =>
            `<div class="topic-item">
              <span class="topic-name">${t.name}</span>
              <span class="topic-depth">глубина: ${(t.depth * 100).toFixed(0)}%</span>
              <span class="topic-count">${t.questions} вопросов</span>
            </div>`
          ).join('') + '</div>';
      }
    }
  }
}

// ── Admin ────────────────────────────

async function loadAdmin() {
  loadUsers();
  loadSuggestions();
  loadAdminStats();
}

async function loadUsers() {
  const data = await api('/auth/admin/users').catch(() => []);
  const tbody = document.getElementById('usersBody');
  const count = document.getElementById('userCount');
  if (count) count.textContent = data.length + ' чел.';
  if (!tbody) return;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="6">Нет пользователей</td></tr>'; return; }
  tbody.innerHTML = data.map(u => `<tr>
    <td class="cell-id">${u.id.slice(0, 8)}..</td>
    <td>${u.display_name || u.username || '—'}</td>
    <td>${u.provider}</td>
    <td><select class="role-select" data-id="${u.id}" onchange="changeRole('${u.id}', this.value)">
      ${['reader','editor','admin'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
    </select></td>
    <td>${u.is_active ? '✅' : '⛔'}</td>
    <td><button class="btn btn-sm ${u.is_active ? 'btn-outline' : 'btn-primary'}" onclick="toggleUser('${u.id}')">${u.is_active ? 'Деакт.' : 'Акт.'}</button></td>
  </tr>`).join('');
}

async function changeRole(userId, role) {
  await api(`/auth/admin/users/${userId}/role?role=${role}`, { method: 'POST' });
}

async function toggleUser(userId) {
  await api(`/auth/admin/users/${userId}/toggle`, { method: 'POST' });
  loadUsers();
}

async function loadSuggestions() {
  const el = document.getElementById('suggestionsList');
  const data = await api('/book/presence/suggestions').catch(() => ({ suggestions: [] }));
  if (!el) return;
  const list = data.suggestions || [];
  if (!list.length) { el.innerHTML = '<p class="text-muted">Нет предложений</p>'; return; }
  el.innerHTML = list.map(s => `<div class="suggestion-item">
    <div class="suggestion-main">
      <strong>${s.topic}</strong>
      <p class="suggestion-reason">${s.reason || ''}</p>
      <span class="badge badge-${s.status}">${s.status}</span>
      <span class="suggestion-action">${s.suggested_action}</span>
    </div>
    <div class="suggestion-actions">
      <button class="btn btn-sm btn-primary" onclick="approveSuggestion('${s.id}')">Одобрить</button>
      <button class="btn btn-sm btn-outline" onclick="rejectSuggestion('${s.id}')">Отклонить</button>
    </div>
  </div>`).join('');
}

async function approveSuggestion(id) {
  await api(`/book/presence/suggestions/${id}/approve`, { method: 'POST' });
  loadSuggestions();
}

async function rejectSuggestion(id) {
  await api(`/book/presence/suggestions/${id}/reject`, { method: 'POST' });
  loadSuggestions();
}

async function loadAdminStats() {
  const el = document.getElementById('statsGrid');
  const data = await api('/auth/admin/stats').catch(() => null);
  if (!el || !data) { if (el) el.innerHTML = '<p class="text-muted">Ошибка загрузки</p>'; return; }
  el.innerHTML = `
    <div class="stat-card"><div class="stat-value">${data.users?.total || 0}</div><div class="stat-label">Пользователей</div></div>
    <div class="stat-card"><div class="stat-value">${data.users?.by_role?.reader || 0}</div><div class="stat-label">Читателей</div></div>
    <div class="stat-card"><div class="stat-value">${data.users?.by_role?.editor || 0}</div><div class="stat-label">Редакторов</div></div>
    <div class="stat-card"><div class="stat-value">${data.presence?.pending_suggestions || 0}</div><div class="stat-label">Предложений</div></div>
    <div class="stat-card"><div class="stat-value">${data.email?.subscribers || 0}</div><div class="stat-label">Подписчиков</div></div>
  `;
}

function updateServiceStatus(data) {
  const el = document.getElementById('serviceStatus');
  if (!el) return;
  el.innerHTML = Object.entries(data).map(([k, v]) =>
    `<div class="d-flex justify-content-between mb-2"><span>${k}</span><span class="status-dot ${v ? 'status-success' : 'status-error'}"></span></div>`
  ).join('');
}

function onAdminSuggestion() {
  wsNotifCount++;
  const badge = document.getElementById('wsBadge');
  if (badge) { badge.textContent = wsNotifCount; badge.style.display = 'inline'; }
  if (document.getElementById('tab-suggestions')?.classList.contains('active')) loadSuggestions();
}

function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name)?.classList.add('active');
  document.querySelector(`.tab-btn[onclick*="'${name}'"]`)?.classList.add('active');
}

document.getElementById('subscribeForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = { email: form.email.value, name: form.name.value };
  const resultEl = document.getElementById('subscribeResult');
  try {
    const resp = await fetch('/book/email/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await resp.json();
    resultEl.style.display = 'block';
    if (json.ok) {
      resultEl.className = 'subscribe-result ok';
      resultEl.textContent = '✓ Подписка оформлена!';
      form.email.value = '';
      form.name.value = '';
    } else {
      resultEl.className = 'subscribe-result err';
      resultEl.textContent = '✗ ' + (json.detail || 'Ошибка подписки');
    }
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.className = 'subscribe-result err';
    resultEl.textContent = '✗ Ошибка соединения';
  }
});

async function generateApiKey() {
  const data = await api('/auth/api-key', { method: 'POST' });
  if (!data || !data.key) return;
  const reveal = document.getElementById('newKeyReveal');
  const field = document.getElementById('newKeyField');
  if (reveal && field) {
    field.value = data.key;
    reveal.style.display = 'block';
    field.select();
    try { await navigator.clipboard.writeText(data.key); } catch {}
  }
}

// ── WebSocket ─────────────────────────

let ws = null;
let wsNotifCount = 0;

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws`);
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === 'new_suggestion') {
        onAdminSuggestion();
        showToast('Новое предложение от Presence', 'info');
      }
      if (msg.event === 'service_status') {
        updateServiceStatus(msg.data);
      }
      if (msg.event === 'new_question') {
        onAdminSuggestion();
        showToast('Новый вопрос от читателя', 'info');
      }
      if (msg.event === 'pulse_beat') {
        showToast('Pulse: ядро книги активно', 'success');
      }
    } catch {}
  };
  ws.onclose = () => { setTimeout(connectWS, 5000); };
  ws.onerror = () => { ws?.close(); };
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}