import { expect, test } from 'playwright/test';

const baseUrl = process.env.PASSPORT_LOGIN_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const protectedRoute = '/monitors?app=website';

async function acknowledgeDefaultPasswordWarning(page: import('playwright/test').Page) {
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(page.locator('a[href*="account-modify"]')).toBeVisible();
  await submitButton.click();
}

test.describe('passport login browser smoke', () => {
  test('restores the guarded alias redirect after a real browser login', async ({ page }) => {
    await page.goto(
      `${baseUrl}/login?redirect=${encodeURIComponent(protectedRoute)}&source=guard`
    );

    await expect(page).toHaveURL(
      new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/passport/login\\?`)
    );

    await acknowledgeDefaultPasswordWarning(page);
    await page.waitForURL(`${baseUrl}${protectedRoute}`);

    const tokens = await page.evaluate(() => ({
      authorization: window.localStorage.getItem('Authorization'),
      refreshToken: window.localStorage.getItem('refresh-token')
    }));

    expect(tokens.authorization).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  test('redirects expired sessions back to login and recovers the interrupted route', async ({ page }) => {
    await page.goto(`${baseUrl}/passport/login`);
    await page.evaluate(() => {
      window.localStorage.setItem('Authorization', 'expired-access-token');
      window.localStorage.setItem('refresh-token', 'expired-refresh-token');
    });

    await page.goto(`${baseUrl}${protectedRoute}`);
    await page.waitForURL(url => {
      return (
        url.pathname === '/passport/login' &&
        url.searchParams.get('redirect') === protectedRoute
      );
    });

    const clearedTokens = await page.evaluate(() => ({
      authorization: window.localStorage.getItem('Authorization'),
      refreshToken: window.localStorage.getItem('refresh-token')
    }));

    expect(clearedTokens.authorization).toBeNull();
    expect(clearedTokens.refreshToken).toBeNull();

    await acknowledgeDefaultPasswordWarning(page);
    await page.waitForURL(`${baseUrl}${protectedRoute}`);
  });
});
