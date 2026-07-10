import { expect, test } from 'playwright/test';

const baseUrl = process.env.RELEASE_ROUTE_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const ROUTE_READY_TIMEOUT = 60000;

const releaseBlockingConsolePatterns = [
  /Maximum update depth exceeded/i,
  /hydration failed/i,
  /hydration mismatch/i,
  /text content does not match server-rendered html/i
];

const releaseRouteCases = [
  {
    name: 'overview',
    path: '/overview',
    selector: '[data-overview-shell-chrome="plain-dark-workbench"]'
  },
  {
    name: 'entities',
    path: '/entities',
    selector: '[data-entity-list-surface="otlp-hertzbeat-ui-entity-console"]'
  },
  {
    name: 'entity detail',
    path: '/entities/4200',
    selector: '[data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"]'
  },
  {
    name: 'metrics workbench',
    path: '/ingestion/otlp/metrics?entityId=4200&serviceName=checkout&environment=demo&traceId=0123456789abcdef0123456789abcdef',
    selector: '[data-otlp-metrics-route="otlp-hertzbeat-ui-metrics-workbench"]',
    expectedQuery: {
      entityId: '4200',
      serviceName: 'checkout',
      environment: 'demo',
      traceId: '0123456789abcdef0123456789abcdef'
    }
  },
  {
    name: 'logs workbench',
    path: '/log/manage?view=stream&entityId=4200&serviceName=checkout&environment=demo&traceId=0123456789abcdef0123456789abcdef',
    selector: '[data-log-manage-route="otlp-hertzbeat-ui-log-workbench"]',
    expectedQuery: {
      view: 'stream',
      entityId: '4200',
      serviceName: 'checkout',
      environment: 'demo',
      traceId: '0123456789abcdef0123456789abcdef'
    }
  },
  {
    name: 'trace workbench',
    path: '/trace/manage?entityId=4200&serviceName=checkout&environment=demo&traceId=0123456789abcdef0123456789abcdef',
    selector: '[data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"]',
    expectedQuery: {
      entityId: '4200',
      serviceName: 'checkout',
      environment: 'demo',
      traceId: '0123456789abcdef0123456789abcdef'
    }
  },
  {
    name: 'topology',
    path: '/topology?entityId=4200&sourceKind=otlp-trace-call&environment=demo',
    selector: '[data-topology-route="hertzbeat-entity-topology"]',
    expectedQuery: {
      entityId: '4200',
      sourceKind: 'otlp-trace-call',
      environment: 'demo'
    }
  },
  {
    name: 'alert center',
    path: '/alert',
    selector: '[data-alert-center-surface="otlp-hertzbeat-ui-center-console"]'
  },
  {
    name: 'ui lab',
    path: '/ui-lab',
    selector: '[data-hz-ui-lab-monitor-filter-bar="shared"]'
  }
];

function collectReleaseBlockingConsole(page: import('playwright/test').Page) {
  const messages: string[] = [];
  page.on('console', message => {
    const text = message.text();
    if (releaseBlockingConsolePatterns.some(pattern => pattern.test(text))) {
      messages.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', error => {
    const text = error.message || String(error);
    if (releaseBlockingConsolePatterns.some(pattern => pattern.test(text))) {
      messages.push(`pageerror: ${text}`);
    }
  });
  return messages;
}

async function installAuthenticatedSession(page: import('playwright/test').Page) {
  const origin = new URL(baseUrl);
  await page.context().addCookies([
    {
      name: 'hb_ui_access',
      value: 'release-route-smoke-access-token',
      domain: origin.hostname,
      path: '/'
    },
    {
      name: 'hb_ui_session',
      value: '1',
      domain: origin.hostname,
      path: '/'
    }
  ]);
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'HB_UI_SESSION_USER',
      JSON.stringify({ name: 'admin', avatar: './assets/img/avatar.svg', email: 'administrator', role: 'ADMIN' })
    );
  });
}

async function expectDarkChrome(page: import('playwright/test').Page) {
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark-ops');
  const bodyBackground = await page.locator('body').evaluate(element => window.getComputedStyle(element).backgroundColor);
  expect(bodyBackground).not.toBe('rgb(255, 255, 255)');
}

async function expectReleaseRouteReady(page: import('playwright/test').Page, selector: string) {
  const routeSurface = page.locator(selector).first();
  const routeLoadFailure = page.locator('main').getByText('Load failed', { exact: true }).first();
  await expect(routeSurface.or(routeLoadFailure)).toBeVisible({ timeout: ROUTE_READY_TIMEOUT });
}

test.describe('release route browser smoke', () => {
  for (const routeCase of releaseRouteCases) {
    test(`${routeCase.name} renders release chrome without blocking console`, async ({ page }) => {
      test.setTimeout(ROUTE_READY_TIMEOUT);
      const blockingConsole = collectReleaseBlockingConsole(page);
      await installAuthenticatedSession(page);

      await page.goto(`${baseUrl}${routeCase.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: ROUTE_READY_TIMEOUT
      });

      await expectReleaseRouteReady(page, routeCase.selector);
      await expectDarkChrome(page);

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).not.toBe('/passport/login');
      expect(currentUrl.pathname).not.toMatch(/\/exception\/(?:404|500)$/);
      for (const [key, value] of Object.entries(routeCase.expectedQuery || {})) {
        expect(currentUrl.searchParams.get(key)).toBe(value);
      }

      const bodyText = await page.locator('body').innerText({ timeout: ROUTE_READY_TIMEOUT });
      expect(bodyText.trim().length).toBeGreaterThan(0);
      expect(blockingConsole).toEqual([]);
    });
  }
});
