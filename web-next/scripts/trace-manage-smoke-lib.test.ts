import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY,
  TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE,
  TRACE_MANAGE_SMOKE_ROUTE,
  TRACE_MANAGE_SMOKE_TRACE_ID,
  buildTraceManageSmokeQuery,
  buildTraceManageSmokeWindow,
  buildTraceManageResetExpectedQuery,
  runTraceManageSmoke
} from './trace-manage-smoke-lib.mjs';

describe('trace-manage smoke helpers', () => {
  it('keeps the canonical route and deep-link contract explicit', () => {
    const window = buildTraceManageSmokeWindow(1_776_751_800_000);
    const query = buildTraceManageSmokeQuery(1_776_751_800_000);

    expect(TRACE_MANAGE_SMOKE_ROUTE).toBe('/trace/manage');
    expect(TRACE_MANAGE_SMOKE_TRACE_ID).toMatch(/^trace-ui-rich-demo-/);
    expect(window).toEqual({
      start: '1776751200000',
      end: '1776751800000',
      traceStart: '1776751380000'
    });
    expect(query).toEqual({
      traceId: 'trace-ui-rich-demo-1776751800000',
      serviceName: 'checkout-service',
      errorOnly: 'true',
      start: '1776751200000',
      end: '1776751800000',
      returnTo: '/overview',
      serviceNamespace: 'storefront',
      environment: 'dev'
    });
    expect(TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.start).not.toBe('1775032200000');
    expect(TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.end).not.toBe('1775032800000');
    expect(TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE).toContain(`start=${TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.start}`);
    expect(TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE).toContain(`end=${TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.end}`);
  });

  it('checks both the canonical shell path and the bookmarked deep link against the same trace route contract', async () => {
    const calls: Array<{
      baseUrl: string;
      routePath: string;
      expectedPath: string | null;
      expectedQuery: Record<string, string> | null;
    }> = [];

    const result = await runTraceManageSmoke({
      baseUrl: 'http://127.0.0.1:4200',
      assertRouteLoads: async (baseUrl, routePath, options = {}) => {
        calls.push({
          baseUrl,
          routePath,
          expectedPath: options.expectedPath ?? null,
          expectedQuery: options.expectedQuery ?? null
        });
        return {
          status: 200,
          finalUrl: `${baseUrl}${options.expectedPath ?? routePath}`
        };
      }
    });

    expect(calls).toEqual([
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath: '/trace/manage',
        expectedPath: '/trace/manage',
        expectedQuery: null
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath:
          TRACE_MANAGE_SMOKE_DEEP_LINK_ROUTE,
        expectedPath: '/trace/manage',
        expectedQuery: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY
      }
    ]);

    expect(result.baseUrl).toBe('http://127.0.0.1:4200');
    expect(result.routeShell.status).toBe(200);
    expect(result.deepLink.status).toBe(200);
    expect(buildTraceManageResetExpectedQuery()).toEqual({
      start: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.start,
      end: TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.end,
      returnTo: '/overview',
      serviceName: 'checkout-service',
      serviceNamespace: 'storefront',
      environment: 'dev'
    });
  });

  it('keeps browser smoke URLs machine-readable and free of display return labels', () => {
    const smokeLibSource = readFileSync(resolve(process.cwd(), 'scripts/trace-manage-smoke-lib.mjs'), 'utf8');
    const browserSmokeSource = readFileSync(resolve(process.cwd(), 'scripts/trace-manage-browser-smoke.spec.ts'), 'utf8');

    expect(smokeLibSource).not.toContain('returnLabel');
    expect(browserSmokeSource).not.toContain("toBe('Traces Workbench')");
    expect(browserSmokeSource).not.toContain('TRACE_MANAGE_SMOKE_DEEP_LINK_QUERY.returnLabel');
    expect(browserSmokeSource).not.toContain('Traces Workbench');
  });
});
