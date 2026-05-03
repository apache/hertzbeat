import { expect, test } from 'playwright/test';

const baseUrl = process.env.BULLETIN_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const protectedRoute = '/bulletin';

async function acknowledgeDefaultPasswordWarning(page: import('playwright/test').Page) {
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(page.locator('a[href*="account-modify"]')).toBeVisible();
  await submitButton.click();
}

test.describe('bulletin browser smoke', () => {
  test('restores the guarded bulletin workspace inside the Next shell after login recovery', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${baseUrl}${protectedRoute}`, { waitUntil: 'commit' });
    await page.waitForURL(url => url.pathname === '/passport/login' && url.searchParams.get('redirect') === protectedRoute);

    await acknowledgeDefaultPasswordWarning(page);
    await page.waitForURL(url => url.pathname === protectedRoute);

    await expect(page.locator('[data-bulletin-center-surface="true"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-bulletin-workspace="true"]')).toBeVisible();
    await expect(page.locator('[data-bulletin-center-surface="true"] button').first()).toBeVisible();
  });
});
