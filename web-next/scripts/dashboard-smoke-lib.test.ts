import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_SMOKE_QUERY,
  DASHBOARD_SMOKE_ROUTE,
  OVERVIEW_SMOKE_ROUTE,
  buildDashboardProtectedRoute,
  runDashboardSmoke
} from './dashboard-smoke-lib.mjs';

describe('dashboard smoke helpers', () => {
  it('keeps the absorbed dashboard alias contract explicit', () => {
    expect(DASHBOARD_SMOKE_ROUTE).toBe('/dashboard');
    expect(OVERVIEW_SMOKE_ROUTE).toBe('/overview');
    expect(DASHBOARD_SMOKE_QUERY).toEqual({
      start: '10',
      end: '20',
      entityId: '7',
      entityName: 'checkout',
      returnTo: '/monitors',
      serviceName: 'checkout',
      environment: 'prod'
    });
    expect(buildDashboardProtectedRoute()).toBe(
      '/dashboard?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Fmonitors&serviceName=checkout&environment=prod'
    );
    expect(buildDashboardProtectedRoute()).not.toContain('returnLabel=');
    expect(DASHBOARD_SMOKE_QUERY).not.toHaveProperty('returnLabel');
  });

  it('checks the dashboard compatibility alias against the same overview redirect contract', async () => {
    const calls: Array<{
      baseUrl: string;
      routePath: string;
      expectedPath: string | null;
      expectedQuery: Record<string, string> | null;
    }> = [];

    const result = await runDashboardSmoke({
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
          '/dashboard?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Fmonitors&serviceName=checkout&environment=prod',
        expectedPath: '/overview',
        expectedQuery: DASHBOARD_SMOKE_QUERY
      }
    ]);
    expect(result.baseUrl).toBe('http://127.0.0.1:4200');
    expect(result.dashboardAlias.status).toBe(200);
  });
});
