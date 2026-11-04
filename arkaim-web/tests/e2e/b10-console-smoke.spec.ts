import { expect, test } from '@playwright/test';

const routes = [
  { path: '/ask', ready: 'Задайте вопрос книге' },
  { path: '/history', ready: 'История вопросов' },
  { path: '/world-engine', ready: 'World Engine' },
] as const;

test.describe('B10 console smoke', () => {
  test.beforeEach(async ({ context }) => {
    // Регистрируем пользователя (вместо устаревшего /api/auth/dev-login)
    const registerResp = await context.request.post('/auth/register', {
      data: { username: `b10_${Date.now()}`, display_name: 'B10 Test' },
    });
    expect(registerResp.ok()).toBeTruthy();
    const setCookie = registerResp.headers()['set-cookie'];
    if (setCookie) {
      const cookieName = setCookie.split('=')[0];
      const cookieValue = setCookie.split(';')[0].split('=').slice(1).join('=');
      await context.addCookies([{
        name: cookieName,
        value: cookieValue,
        domain: 'localhost',
        path: '/',
      }]);
    }
  });

  test('B10 smoke: основные data-heavy маршруты открываются без новых console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await expect(page.getByText(route.ready, { exact: true }).first()).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);
  });
});
