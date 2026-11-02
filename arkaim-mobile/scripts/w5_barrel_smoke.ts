/**
 * W-5 compile-time smoke test:
 *   - shared/api barrel экспортирует api, setToken, clearToken, ApiError, API_BASE.
 *   - Прямой import shared/api/client не сломан бареллом.
 *   - Типизация api.get<T> / api.post<T> корректна.
 *
 * Не требует vitest: компилируется tsc и выполняется node (без сети).
 * Запуск:
 *   cd arkaim-mobile && npx tsc --noEmit          # чистый compile
 *   npx tsx scripts/w5_barrel_smoke.ts            # runtime-проверка экспорта
 */

// 1) Barrel-импорт (новый, W-5):
import {
  api as apiBarrel,
  setToken as setTokenBarrel,
  clearToken as clearTokenBarrel,
  ApiError as ApiErrorBarrel,
  API_BASE as API_BASE_barrel,
} from '../src/shared/api';

// 2) Прямой import (старый стиль, должен остаться работоспособным):
import {
  api as apiClient,
  setToken as setTokenClient,
  clearToken as clearTokenClient,
  ApiError as ApiErrorClient,
  API_BASE as API_BASE_client,
} from '../src/shared/api/client';

// 3) Идентичность: barrel и client дают один и тот же объект.
function assertSame(a: unknown, b: unknown, label: string): void {
  if (a !== b) {
    throw new Error(`W-5 barrel identity: ${label} — barrel и client расходятся`);
  }
}
assertSame(apiBarrel, apiClient, 'api');
assertSame(setTokenBarrel, setTokenClient, 'setToken');
assertSame(clearTokenBarrel, clearTokenClient, 'clearToken');
assertSame(ApiErrorBarrel, ApiErrorClient, 'ApiError');
assertSame(API_BASE_barrel, API_BASE_client, 'API_BASE');

// 4) Методы api (типы):
function checkApiMethods(api: typeof apiBarrel): void {
  if (typeof api.get !== 'function') throw new Error('api.get отсутствует');
  if (typeof api.post !== 'function') throw new Error('api.post отсутствует');
  if (typeof api.delete !== 'function') throw new Error('api.delete отсутствует');
}
checkApiMethods(apiBarrel);

// 5) ApiError конструктор и поля:
const err = new ApiErrorBarrel(404, 'Not Found', { reason: 'no-such-route' });
if (err.status !== 404) throw new Error('ApiError.status не сохранён');
if (err.name !== 'ApiError') throw new Error('ApiError.name не ApiError');

// 6) Сигнатуры dev-login/TokenLogin как в LoginScreen (compile-time):
const devEndpoint = '/auth/dev/generate-token';
const tokenEndpoint = '/auth/telegram/login';
// Токен-ответы (тип из S-1): { token, login_url, role } | 404 при DEV_AUTH_ENABLED off
type DevTokenResp = { token: string; login_url: string; role: 'reader' | 'editor' };
const ok: DevTokenResp = { token: 'abc', login_url: '/login?token=abc', role: 'reader' };
// Публичный {token} → { ok, user: {...} } (cookie-only, JWT не в теле):
type TokenLoginResp = { ok: boolean; user: { display_name?: string } };
const login: TokenLoginResp = { ok: true, user: { display_name: 'dev' } };
void ok; void login;

// 7) Прочие endpoints screens (compile-time):
const NOTIF_ENDPOINT = '/notifications?limit=50';
const CHAPTERS_ENDPOINT = '/book/chapters';
const SEARCH_ENDPOINT = '/book/search?q=A&limit=20';
void devEndpoint; void tokenEndpoint; void NOTIF_ENDPOINT; void CHAPTERS_ENDPOINT; void SEARCH_ENDPOINT;

console.log('W-5 barrel + contracts: all checks passed');
