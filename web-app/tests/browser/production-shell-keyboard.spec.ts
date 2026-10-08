/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, test } from '@playwright/test';
import { installBackendContract } from './production-browser-support';

// Engineering fixture only; every API response is synthetic in a fresh context.
test.skip(({ baseURL }) => baseURL !== 'http://127.0.0.1:4289', 'Requires isolated synthetic preview');
for (const { width, route } of [
  { width: 320, route: '/explore?signal=logs&start=1000&end=2000' },
  { width: 390, route: '/explore?signal=logs&start=1000&end=2000' },
  { width: 700, route: '/explore?signal=logs&start=1000&end=2000' },
  { width: 320, route: '/monitors' }
]) {
  test(`narrow ${route} header actions remain reachable by Tab and Shift+Tab at ${width}px`, async ({
    page
  }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await installBackendContract(page, { setupComplete: true, authenticated: true });
    await page.goto(route);
    const status = page.getByRole('button', { name: /^Server: Available/u });
    await expect(status).toBeVisible();
    const statusWidth = (await status.boundingBox())!.width;
    const clip = (await page.locator('[class*="headerSpine"]').boundingBox())!;
    const actions = page.locator('[class*="headerActions"]');
    const controls = actions.locator('button:not([disabled]), a[href], [tabindex="0"]');
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(4);
    await controls.first().focus();
    const visited = [];
    for (let index = 0; index < count; index++) {
      const control = controls.nth(index);
      await expect(control).toBeFocused();
      await testInfo.attach(`focus-${index}`, {
        body: await page.evaluate<string>(
          `JSON.stringify({ label: document.activeElement?.getAttribute('aria-label'), rect: document.activeElement?.getBoundingClientRect().toJSON(), spine: [...document.querySelectorAll('[class*=headerSpine]')].map(e=>({ rect:e.getBoundingClientRect().toJSON(), width:e.clientWidth, full:e.scrollWidth, left:e.scrollLeft })), pageWidth:document.documentElement.scrollWidth })`
        ),
        contentType: 'application/json'
      });
      await expect
        .poll(async () => {
          const box = await control.boundingBox();
          return box != null && box.x >= clip.x - 1 && box.x + box.width <= clip.x + clip.width + 1;
        })
        .toBe(true);
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(clip.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(clip.x + clip.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(0);
      visited.push({ label: await control.getAttribute('aria-label'), box });
      if (index + 1 < count) await page.keyboard.press('Tab');
    }
    // Real keyboard activation also works once the last off-screen action is reached.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(controls.last()).toBeFocused();
    for (let index = count - 2; index >= 0; index--) {
      await page.keyboard.press('Shift+Tab');
      await expect(controls.nth(index)).toBeFocused();
      const box = (await controls.nth(index).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(clip.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(clip.x + clip.width + 1);
    }
    expect((await status.boundingBox())!.width).toBeCloseTo(statusWidth, 1);
    await testInfo.attach('keyboard-reachability', {
      body: JSON.stringify({ width, statusWidth, visited }, null, 2),
      contentType: 'application/json'
    });
  });
}
