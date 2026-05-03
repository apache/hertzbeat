import { describe, expect, it } from 'vitest';
import {
  LOG_MANAGE_SMOKE_BOOKMARK_QUERY,
  LOG_INTEGRATION_SMOKE_ALIAS_ROUTE,
  LOG_INTEGRATION_SOURCE_SMOKE_ALIAS_ROUTE,
  LOG_MANAGE_SMOKE_ROUTE,
  buildLogManageProtectedRoute,
  buildLogManageResetExpectedQuery,
  LOG_STREAM_SMOKE_ALIAS_ROUTE,
  runLogManageSmoke
} from './log-manage-smoke-lib.mjs';

describe('log-manage smoke helpers', () => {
  it('keeps the canonical route plus legacy aliases explicit', () => {
    expect(LOG_MANAGE_SMOKE_ROUTE).toBe('/log/manage');
    expect(LOG_STREAM_SMOKE_ALIAS_ROUTE).toBe('/log/stream');
    expect(LOG_INTEGRATION_SMOKE_ALIAS_ROUTE).toBe('/log/integration');
    expect(LOG_INTEGRATION_SOURCE_SMOKE_ALIAS_ROUTE).toBe('/log/integration/webhook');
    expect(buildLogManageProtectedRoute()).toBe(
      '/log/manage?search=checkout+timeout&traceId=trace-123&severityText=ERROR&start=10&end=20&returnTo=%2Foverview'
    );
    expect(LOG_MANAGE_SMOKE_BOOKMARK_QUERY).toEqual({
      search: 'checkout timeout',
      traceId: 'trace-123',
      severityText: 'ERROR',
      start: '10',
      end: '20',
      returnTo: '/overview'
    });
  });

  it('checks canonical log-manage deep links and the legacy alias redirects against the same query-state contract', async () => {
    const calls: Array<{
      baseUrl: string;
      routePath: string;
      expectedPath: string | null;
      expectedQuery: Record<string, string> | null;
    }> = [];

    const result = await runLogManageSmoke({
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
        routePath:
          '/log/manage?search=checkout+timeout&traceId=trace-123&severityText=ERROR&start=10&end=20&returnTo=%2Foverview',
        expectedPath: '/log/manage',
        expectedQuery: {
          search: 'checkout timeout',
          traceId: 'trace-123',
          severityText: 'ERROR',
          start: '10',
          end: '20',
          returnTo: '/overview'
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath:
          '/log/stream?content=checkout+timeout&severityText=ERROR&traceId=trace-123&spanId=span-456&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod',
        expectedPath: '/log/manage',
        expectedQuery: {
          search: 'checkout timeout',
          traceId: 'trace-123',
          spanId: 'span-456',
          severityText: 'ERROR',
          view: 'stream',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath:
          '/log/integration?content=webhook&traceId=trace-123&spanId=span-456&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod',
        expectedPath: '/log/manage',
        expectedQuery: {
          search: 'webhook',
          traceId: 'trace-123',
          spanId: 'span-456',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      },
      {
        baseUrl: 'http://127.0.0.1:4200',
        routePath:
          '/log/integration/webhook?traceId=trace-123&spanId=span-456&start=10&end=20&entityId=7&entityName=Checkout+API&returnTo=%2Foverview&serviceName=checkout&serviceNamespace=payments&environment=prod',
        expectedPath: '/log/manage',
        expectedQuery: {
          search: 'webhook',
          traceId: 'trace-123',
          spanId: 'span-456',
          start: '10',
          end: '20',
          entityId: '7',
          entityName: 'Checkout API',
          returnTo: '/overview',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          environment: 'prod'
        }
      }
    ]);
    expect(result.baseUrl).toBe('http://127.0.0.1:4200');
    expect(result.streamAlias.status).toBe(200);
    expect(result.integrationSourceAlias.status).toBe(200);
    expect(buildLogManageResetExpectedQuery()).toEqual({
      view: 'list',
      start: '10',
      end: '20',
      returnTo: '/overview'
    });
  });

  it('keeps log browser smoke URLs free of display return labels', () => {
    expect(buildLogManageProtectedRoute()).not.toContain('returnLabel=');
    expect(LOG_MANAGE_SMOKE_BOOKMARK_QUERY).not.toHaveProperty('returnLabel');
    expect(buildLogManageResetExpectedQuery()).not.toHaveProperty('returnLabel');
  });
});
