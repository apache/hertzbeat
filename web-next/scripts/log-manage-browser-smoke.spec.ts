import { expect, test } from 'playwright/test';
import {
  LOG_MANAGE_SMOKE_BOOKMARK_QUERY,
  LOG_MANAGE_SMOKE_ROUTE,
  buildLogManageProtectedRoute,
  buildLogManageResetExpectedQuery
} from './log-manage-smoke-lib.mjs';

const baseUrl = process.env.LOG_MANAGE_BROWSER_BASE_URL || 'http://127.0.0.1:4200';
const releaseBlockingConsolePatterns = [
  /Maximum update depth exceeded/i,
  /hydration failed/i,
  /hydration mismatch/i,
  /text content does not match server-rendered html/i
];

function hasExpectedQuery(url: URL, expectedQuery: Record<string, string>) {
  return Object.entries(expectedQuery).every(([key, value]) => url.searchParams.get(key) === value);
}

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
      value: 'browser-smoke-access-token',
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

test.describe('log manage browser smoke', () => {
  test('restores guarded log deep links and keeps hydrated list-query state stable across clear/apply', async ({ page }) => {
    test.setTimeout(60000);

    const blockingConsole = collectReleaseBlockingConsole(page);
    const protectedRoute = `${buildLogManageProtectedRoute()}&view=list`;

    await installAuthenticatedSession(page);
    await page.goto(`${baseUrl}${protectedRoute}`, { waitUntil: 'commit' });
    await page.waitForURL(url => url.pathname === LOG_MANAGE_SMOKE_ROUTE && url.searchParams.get('view') === 'list' && hasExpectedQuery(url, LOG_MANAGE_SMOKE_BOOKMARK_QUERY));

    const searchInput = page.locator('[data-log-manage-query-search-input="true"]');
    const traceIdInput = page.locator('[data-log-manage-query-token-input="trace-id"]');
    const severityFilter = page.locator('[data-log-manage-severity-filter="true"]');
    const searchAction = page.locator('[data-log-manage-run-query-action="true"]');
    const clearAction = page.locator('[data-log-manage-reset-action="true"]');
    const hasSeverityFilterControl = await severityFilter.count() > 0;

    await expect(searchInput).toBeVisible({ timeout: 20000 });
    await expect(searchInput).toHaveValue(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.search);
    await expect(traceIdInput).toHaveValue(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.traceId);
    if (hasSeverityFilterControl) {
      await expect(severityFilter).toHaveValue(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.severityText);
    }

    await clearAction.click();

    const resetQuery = buildLogManageResetExpectedQuery();
    await page.waitForURL(url => {
      if (url.pathname !== LOG_MANAGE_SMOKE_ROUTE) return false;
      if (url.searchParams.get('search') !== null) return false;
      if (url.searchParams.get('traceId') !== LOG_MANAGE_SMOKE_BOOKMARK_QUERY.traceId) return false;
      if (url.searchParams.get('severityText') !== null) return false;
      return hasExpectedQuery(url, resetQuery);
    });

    await searchInput.fill(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.search);
    await traceIdInput.fill(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.traceId);
    if (hasSeverityFilterControl) {
      await severityFilter.selectOption(LOG_MANAGE_SMOKE_BOOKMARK_QUERY.severityText);
    }
    await searchAction.click();

    await page.waitForURL(url => {
      if (url.pathname !== LOG_MANAGE_SMOKE_ROUTE) return false;
      const expectedQuery = {
        ...LOG_MANAGE_SMOKE_BOOKMARK_QUERY,
        view: 'list'
      };
      if (!hasSeverityFilterControl) {
        delete (expectedQuery as Partial<typeof expectedQuery>).severityText;
      }
      return hasExpectedQuery(url, expectedQuery);
    });

    expect(blockingConsole).toEqual([]);
  });

  test('records stream reconnect plus trace handoff return-path proof on the protected log workbench', async ({ page }) => {
    test.setTimeout(60000);

    const blockingConsole = collectReleaseBlockingConsole(page);
    await installAuthenticatedSession(page);
    await page.addInitScript(() => {
      const globalWindow = window as typeof window & {
        __hbEventSourceUrls?: string[];
        __hbEventSourceInstances?: number;
        __hbEmitLogEvent?: (payload: unknown) => void;
      };
      const mockSources: MockEventSource[] = [];

      globalWindow.__hbEventSourceUrls = [];
      globalWindow.__hbEventSourceInstances = 0;

      class MockEventSource implements EventSource {
        static readonly CONNECTING = 0;
        static readonly OPEN = 1;
        static readonly CLOSED = 2;

        readonly CONNECTING = MockEventSource.CONNECTING;
        readonly OPEN = MockEventSource.OPEN;
        readonly CLOSED = MockEventSource.CLOSED;

        url: string;
        withCredentials = false;
        readyState = MockEventSource.CONNECTING;
        onopen: ((this: EventSource, ev: Event) => any) | null = null;
        onmessage: ((this: EventSource, ev: MessageEvent<string>) => any) | null = null;
        onerror: ((this: EventSource, ev: Event) => any) | null = null;
        private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

        constructor(url: string | URL) {
          this.url = String(url);
          mockSources.push(this);
          globalWindow.__hbEventSourceUrls?.push(this.url);
          globalWindow.__hbEventSourceInstances = (globalWindow.__hbEventSourceInstances || 0) + 1;

          setTimeout(() => {
            this.readyState = MockEventSource.OPEN;
            this.onopen?.call(this, new Event('open'));
            this.emit('LOG_EVENT', JSON.stringify({
              traceId: 'trace-123',
              spanId: 'span-456',
              severityText: 'ERROR',
              severityNumber: 17,
              body: 'checkout timeout',
              timeUnixNano: 1713200000000000000,
              resource: {
                'service.name': 'checkout',
                'service.namespace': 'payments',
                'deployment.environment.name': 'prod'
              },
              attributes: {
                'service.name': 'checkout'
              }
            }));
          }, 0);
        }

        addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
          if (!listener) return;
          const current = this.listeners.get(type) || new Set<EventListenerOrEventListenerObject>();
          current.add(listener);
          this.listeners.set(type, current);
        }

        removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
          if (!listener) return;
          this.listeners.get(type)?.delete(listener);
        }

        dispatchEvent(_event: Event): boolean {
          return true;
        }

        close() {
          this.readyState = MockEventSource.CLOSED;
        }

        private emit(type: string, payload: string) {
          const event = new MessageEvent(type, { data: payload });
          const listeners = this.listeners.get(type);
          listeners?.forEach(listener => {
            if (typeof listener === 'function') {
              listener.call(this, event);
              return;
            }
            listener.handleEvent(event);
          });
          if (type === 'message') {
            this.onmessage?.call(this, event as MessageEvent<string>);
          }
        }
      }

      globalWindow.__hbEmitLogEvent = (payload: unknown) => {
        const body = JSON.stringify(payload);
        mockSources.forEach(source => source.emit('LOG_EVENT', body));
      };

      Object.defineProperty(window, 'EventSource', {
        configurable: true,
        writable: true,
        value: MockEventSource
      });
    });

    await page.route('**/api/logs/stats/overview**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            totalLogs: 8,
            errorLogs: 2,
            distinctTraceCount: 1,
            latestObservedAt: 1713200000000,
            hasActiveLog: true
          }
        })
      });
    });
    await page.route('**/api/logs/list**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            content: [
              {
                traceId: 'trace-123',
                spanId: 'span-456',
                severityText: 'ERROR',
                severityNumber: 17,
                body: 'checkout timeout',
                timeUnixNano: 1713200000000000000,
                resource: {
                  'service.name': 'checkout',
                  'service.namespace': 'payments',
                  'deployment.environment.name': 'prod'
                },
                attributes: {
                  'service.name': 'checkout'
                }
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        })
      });
    });
    await page.route('**/api/logs/stats/trend**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            hourlyStats: {
              '10:00': 4,
              '11:00': 8
            }
          }
        })
      });
    });
    await page.route('**/api/logs/stats/trace-coverage**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            traceCoverage: {
              withTrace: 4,
              withSpan: 3,
              withBothTraceAndSpan: 2,
              withoutTrace: 4
            }
          }
        })
      });
    });
    await page.route('**/api/traces/stats/overview**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            totalTraceCount: 1,
            errorTraceCount: 1,
            latestObservedAt: 1713200000000,
            hasActiveTrace: true
          }
        })
      });
    });
    await page.route('**/api/traces/list**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            content: [
              {
                traceId: 'trace-123',
                rootSpanName: 'POST /checkout',
                serviceName: 'checkout',
                serviceNamespace: 'payments',
                durationNanos: 420000000,
                status: 'ERROR',
                startTime: 1713200000000
              }
            ],
            totalElements: 1,
            pageIndex: 0,
            pageSize: 8
          }
        })
      });
    });
    await page.route('**/api/traces/trace-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            traceId: 'trace-123',
            rootSpanName: 'POST /checkout',
            serviceName: 'checkout',
            serviceNamespace: 'payments',
            durationNanos: 420000000,
            status: 'ERROR',
            startTime: 1713200000000,
            resourceAttributes: {},
            errorSpanCount: 1
          }
        })
      });
    });
    await page.route('**/api/traces/trace-123/spans', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: [
            {
              spanId: 'span-456',
              spanName: 'db.query',
              serviceName: 'checkout',
              durationNanos: 120000000,
              status: 'ERROR',
              depth: 0,
              leftPct: 0,
              widthPct: 100,
              resourceAttributes: {
                'service.namespace': 'payments',
                'deployment.environment.name': 'prod'
              },
              spanAttributes: {},
              events: [],
              links: []
            }
          ]
        })
      });
    });
    await page.route('**/api/logs/trace/trace-123**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: []
        })
      });
    });

    const legacyReturnLabelProtectedRoute =
      '/log/manage?view=stream&start=10&end=20&returnTo=%2Foverview&returnLabel=Overview&serviceName=checkout&serviceNamespace=payments&environment=prod';

    await page.goto(`${baseUrl}${legacyReturnLabelProtectedRoute}`, { waitUntil: 'commit' });
    await page.waitForURL(url => url.pathname === '/log/manage' && url.searchParams.get('view') === 'stream');

    await expect(page.locator('[data-log-manage-reconnect-action="true"]')).toBeVisible({ timeout: 20000 });
    const initialEventSourceCount = await page.evaluate(() => (window as typeof window & { __hbEventSourceInstances?: number }).__hbEventSourceInstances || 0);
    expect(initialEventSourceCount).toBeGreaterThan(0);
    await expect(page.locator('[data-log-stream-detail-dialog="true"]')).toBeHidden();

    await page.locator('[data-log-manage-reconnect-action="true"]').click();

    await page.waitForFunction(
      expectedCount => ((window as typeof window & { __hbEventSourceInstances?: number }).__hbEventSourceInstances || 0) > expectedCount,
      initialEventSourceCount
    );
    await page.waitForFunction(() => {
      const urls = (window as typeof window & { __hbEventSourceUrls?: string[] }).__hbEventSourceUrls || [];
      return urls.filter(url => url.includes('/api/logs/sse/subscribe')).length >= 2;
    });

    const eventSourceUrls = await page.evaluate(() => (window as typeof window & { __hbEventSourceUrls?: string[] }).__hbEventSourceUrls || []);
    const logEventSourceUrls = eventSourceUrls.filter(url => url.includes('/api/logs/sse/subscribe'));
    expect(logEventSourceUrls.at(-1)).toContain('serviceName=checkout');
    expect(logEventSourceUrls.at(-1)).toContain('serviceNamespace=payments');
    expect(logEventSourceUrls.at(-1)).toContain('environment=prod');

    const selectedStreamRow = page.locator('[data-log-manage-stream-trace-id="trace-123"]').first();
    await expect(selectedStreamRow).toBeVisible();
    await selectedStreamRow.click();
    await expect(selectedStreamRow).toHaveAttribute('data-log-manage-stream-selected', 'true');
    const streamDetailDialog = page.locator('[data-log-stream-detail-dialog="true"]');
    await expect(streamDetailDialog).toBeVisible();
    await expect(streamDetailDialog).toHaveAttribute('data-log-stream-detail-trace-id', 'trace-123');
    await expect(streamDetailDialog).toHaveAttribute('data-log-stream-detail-selection', 'attached');

    await page.evaluate(() => {
      (window as typeof window & { __hbEmitLogEvent?: (payload: unknown) => void }).__hbEmitLogEvent?.({
        traceId: 'trace-999',
        spanId: 'span-999',
        severityText: 'WARN',
        severityNumber: 13,
        body: 'inventory recovered',
        timeUnixNano: 1713200005000000000,
        resource: {
          'service.name': 'inventory',
          'service.namespace': 'payments',
          'deployment.environment.name': 'prod'
        },
        attributes: {
          'service.name': 'inventory'
        }
      });
    });

    await expect(page.locator('[data-log-manage-stream-trace-id="trace-999"]').first()).toBeVisible();
    await expect(selectedStreamRow).toHaveAttribute('data-log-manage-stream-selected', 'true');
    await expect(streamDetailDialog).toHaveAttribute('data-log-stream-detail-trace-id', 'trace-123');
    await expect(streamDetailDialog).toContainText('traceId · trace-123');
    await page.locator('[data-overlay-dialog="true"] [aria-label="Close dialog"]').click();
    await expect(streamDetailDialog).toBeHidden();

    const streamTraceAction = page.locator('[data-log-manage-stream-detail-action="view-trace"]');
    await expect(streamTraceAction).toBeEnabled();
    await streamTraceAction.click();
    await expect(page.locator('[data-log-manage-detail-dialog-action="trace"]')).toBeEnabled();

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe('/log/manage');
    expect(currentUrl.searchParams.get('view')).toBe('stream');
    expect(currentUrl.searchParams.get('returnTo')).toBe('/overview');
    expect(currentUrl.searchParams.get('returnLabel')).toBeNull();

    expect(blockingConsole).toEqual([]);
  });
});
