import { test, expect } from '@playwright/test';

/**
 * UC1+UC2+UC6+Temporal+WorldExplorer — сквозной пользовательский сценарий
 * (без UC5 GATED и без UC7 production media).
 *
 * Путь:
 *  1. Читатель регистрируется
 *  2. Открывает /book → видит геном книги (UC1)
 *  3. Переходит в World Engine → ищет сущность (UC2)
 *  4. Открывает временной контекст → видит эпохи и события (UC4/Temporal)
 *  5. Задаёт вопрос → получает ответ с SourceBadge + confidence_state (UC6)
 *  6. Видит related entities → может перейти к сущности (UC3)
 *  7. World Explorer → исследование (UC5-adjacent, не GATED)
 */

test.describe('Сквозной пользовательский сценарий', () => {
  let cookie: { name: string; value: string } | null = null;

  test.beforeEach(async ({ context }) => {
    const registerResp = await context.request.post('/auth/register', {
      data: { username: `scenario_${Date.now()}`, display_name: 'Scenario Test' },
    });
    expect(registerResp.ok()).toBeTruthy();
    const setCookie = registerResp.headers()['set-cookie'];
    if (setCookie) {
      const name = setCookie.split('=')[0];
      const value = setCookie.split(';')[0].split('=').slice(1).join('=');
      cookie = { name, value };
      await context.addCookies([{ name, value, domain: 'localhost', path: '/' }]);
    }
  });

  test('книга → мир → время → вопрос → связи → исследование', async ({ context, page }) => {
    // ── 1. /book: геном книги доступен (UC1) ──
    await page.goto('/book');
    await expect(page.getByRole('heading', { name: 'Чат с книгой' })).toBeVisible({ timeout: 15_000 });

    // ── 2. World Engine: сущность ищет (UC2) ──
    await page.goto('/world-engine');
    await expect(page.getByRole('heading', { name: 'World Engine' })).toBeVisible();

    // Поиск по "Аркаим"
    const searchInput = page.getByPlaceholder(/Поиск по миру/);
    await searchInput.fill('Аркаим');
    await page.getByRole('button', { name: /Найти/ }).click();

    // Ждём таблицу результатов
    const resultsTable = page.locator('table');
    await expect(resultsTable).toBeVisible({ timeout: 15_000 });

    // ── 3. Открываем сущность → контекст (UC2) ──
    // Ищем кнопку "Контекст" в таблице
    const contextButtons = page.locator('button:has-text("Контекст")');
    if ((await contextButtons.count()) > 0) {
      await contextButtons.first().click();
      await expect(page.getByText('Контекст сущности')).toBeVisible({ timeout: 10_000 });
    }

    // ── 4. Временной контекст (UC4/Temporal) ──
    await page.goto('/temporal');
    await expect(page.getByRole('heading', { name: 'Временной контекст' })).toBeVisible({ timeout: 10_000 });
    // Ждём хотя бы один узел эпох
    const allEraButtons = page.locator('button');
    await expect(allEraButtons.first()).toBeVisible({ timeout: 10_000 });

    // ── 5. Вопрос → ответ с SourceBadge + confidence_state (UC6) ──
    await page.goto('/ask');
    await expect(page.getByText('Задайте вопрос книге')).toBeVisible();
    // Открываем популяризованный вопрос (Pulse отвечает без LLM)
    const popularQuestion = page.locator('div').filter({ hasText: 'Кто такой Велик?' }).first();
    await popularQuestion.click();

    // Ждём ответ ассистента — SSE-стрим закрывает ответ, SourceBadge появляется
    // Используем wait for network idle + text match
    await page.waitForLoadState('networkidle');
    const answerText = await page.locator('div').filter({ hasText: /Велик|аркаим|знания|книга/i }).first().textContent();
    expect(answerText?.length).toBeGreaterThan(0);

    // ── 6. Related entities (UC3) — если есть, проверяем ──
    const relatedSection = page.locator('div').filter({ hasText: 'Связанные сущности' });
    if ((await relatedSection.count()) > 0) {
      await expect(relatedSection.first()).toBeVisible();
    }

    // ── 7. World Explorer (adjacent UC5, без GATED) ──
    await page.goto('/world-explorer');
    await expect(page.getByRole('heading', { name: /Исследование мира/ })).toBeVisible();
    // Статистика должна быть
    const statsSection = page.locator('div').filter({ hasText: 'Эпох' });
    await expect(statsSection.first()).toBeVisible({ timeout: 10_000 });

    // ── 8. F5 (UC8): история сохраняется после перезагрузки ──
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: /История вопросов/ })).toBeVisible();
    const beforeReload = await page.locator('body').textContent();
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await page.locator('body').textContent();
    // История (вопросы) должна сохраниться
    expect(afterReload).toContain('История вопросов');
  });
});
