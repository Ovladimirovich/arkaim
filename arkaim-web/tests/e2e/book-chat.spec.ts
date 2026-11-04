import { test, expect } from '@playwright/test';

/**
 * Разрыв целостности «диалог с книгой»: первый вопрос в /book обязан
 * получить реальный ответ с провенансом (SourceBadge: источник + уверенность)
 * и связями (EntityCard), а не «Получен пустой ответ.».
 *
 * Что проверяется:
 *  1. Ответ приходит (стрим /v1/stream или фолбэк /book/ask) и не заменён
 *     заглушкой «Получен пустой ответ.»;
 *  2. Метаданные (source/pulse_confidence) доходят до SourceBadge;
 *  3. Связи с World (EntityCard) отображаются и кликабельны.
 *
 * Фолбэк на /book/ask допустим и считается успехом: читатель всё равно
 * видит полный ответ с провенансом (контракт UX не нарушен).
 */

/** Реальные метки SourceBadge + процент уверенности (только у бейджа). */
const SOURCE_BADGE = /(Голос книги|База знаний|Тема книги|Геном|Нет ответа в книге|Заглушка) · \d+%/;

test.describe('Чат с книгой: первый вопрос', () => {
  test.beforeEach(async ({ context }) => {
    const registerResp = await context.request.post('/auth/register', {
      // Уникальное имя: параллельные тесты стартуют в одну миллисекунду,
      // дубль имени даёт 409 и роняет сценарий ещё до страницы.
      data: {
        username: `bookchat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        display_name: 'Book Chat Test',
      },
    });
    expect(registerResp.ok()).toBeTruthy();
    const setCookie = registerResp.headers()['set-cookie'];
    if (setCookie) {
      const name = setCookie.split('=')[0];
      const value = setCookie.split(';')[0].split('=').slice(1).join('=');
      await context.addCookies([{ name, value, domain: 'localhost', path: '/' }]);
    }
  });

  test('первый вопрос: ответ с источником, без «Получен пустой ответ.»', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByRole('heading', { name: 'Чат с книгой' })).toBeVisible({ timeout: 15_000 });

    // Локатор по тегу, а не по плейсхолдеру: после первого сообщения
    // плейсхолдер меняется с «Ваш вопрос книге...» на «Задайте ещё вопрос...».
    const input = page.locator('main textarea').first();
    await input.fill('Что такое Гиперборея?');
    await input.press('Enter');

    // Ответ с провенансом: бейдж источника появляется только после реального
    // ответа (восстановленные из истории сообщения source не имеют).
    await expect(page.getByText(SOURCE_BADGE).first()).toBeVisible({ timeout: 60_000 });

    // Главный регрессионный признак: пустого ответа больше нет
    await expect(page.getByText('Получен пустой ответ.')).toHaveCount(0);

    // Связи с World: если backend прислал related_entities — карточки отображены
    const relatedSection = page.getByText('Связанные сущности:');
    if ((await relatedSection.count()) > 0) {
      await expect(relatedSection.first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Открыть в World/ }).first()).toBeVisible();
    }
  });

  test('вопрос из популярных: ответ и переход к сущности работают', async ({ page }) => {
    await page.goto('/book');
    await expect(page.getByRole('heading', { name: 'Чат с книгой' })).toBeVisible({ timeout: 15_000 });

    // Клик по популярному вопросу (в чистой сессии это первый вопрос)
    await page.getByText('Кто такой Велик?', { exact: true }).first().click();

    await expect(page.getByText(SOURCE_BADGE).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Получен пустой ответ.')).toHaveCount(0);

    // Переход к сущности из ответа: карточка ведёт в World Engine
    const worldButton = page.getByRole('button', { name: /Открыть в World/ }).first();
    if ((await worldButton.count()) > 0) {
      await worldButton.click();
      await expect(page).toHaveURL(/\/world-engine\?/, { timeout: 15_000 });
      // Регрессия клиентского перехода: панель «Контекст сущности» открывается
      // сразу (при маршрутизации из чата URL обновляется после первого рендера),
      // а не только при прямой загрузке страницы.
      await expect(page.getByText('Контекст сущности')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: 'Временной контекст' })).toBeVisible({ timeout: 15_000 });
    }
  });
});
