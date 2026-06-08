import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDashboardCompatRouteUrl,
  buildDashboardDeepLinkHref,
  buildDashboardReturnHref,
  buildDashboardTimeRangeDeepLinkHref,
  buildDashboardVariableDeepLinkHref,
  dashboardVariableParamName,
  readDashboardVariableUrlOverrides
} from './navigation';

describe('dashboard navigation', () => {
  it('maps the dashboard compatibility alias to overview while preserving query context', () => {
    expect(
      buildDashboardCompatRouteUrl({
        start: '10',
        end: '20',
        entityId: '7',
        entityName: 'checkout',
        returnTo: '/overview?returnLabel=Overview',
        returnLabel: 'Overview',
        serviceName: 'checkout',
        environment: ['prod', 'staging']
      })
    ).toBe(
      '/overview?start=10&end=20&entityId=7&entityName=checkout&returnTo=%2Foverview&serviceName=checkout&environment=prod'
    );
  });

  it('falls back to the overview route when no query context is present', () => {
    expect(buildDashboardCompatRouteUrl()).toBe('/overview');
  });

  it('builds shareable dashboard deep links while preserving route context', () => {
    expect(
      buildDashboardDeepLinkHref('/dashboard?timeRange=last-1h&dashboard=old-key&refresh=30#preview', 'Checkout Latency')
    ).toBe('/dashboard?timeRange=last-1h&dashboard=checkout-latency&refresh=30#preview');

    expect(buildDashboardDeepLinkHref(undefined, 'Signals Overview')).toBe('/dashboard?dashboard=signals-overview');
  });

  it('builds shareable dashboard variable deep links while preserving dashboard and time context', () => {
    expect(dashboardVariableParamName('service.name')).toBe('var-service.name');
    expect(
      buildDashboardVariableDeepLinkHref(
        '/dashboard?dashboard=signals-overview&timeRange=last-1h&var-service.name=checkout#preview',
        'service.name',
        'billing'
      )
    ).toBe('/dashboard?dashboard=signals-overview&timeRange=last-1h&var-service.name=billing#preview');

    expect(
      buildDashboardVariableDeepLinkHref('/dashboard?dashboard=signals-overview&var-service.name=billing', 'service.name', '')
    ).toBe('/dashboard?dashboard=signals-overview');
  });

  it('reads dashboard variable URL overrides from var-prefixed query parameters', () => {
    expect(
      readDashboardVariableUrlOverrides({
        dashboard: 'signals-overview',
        'var-service.name': 'checkout',
        'var-deployment.environment.name': ['prod', 'staging'],
        returnLabel: 'ignored'
      })
    ).toEqual({
      'service.name': 'checkout',
      'deployment.environment.name': 'prod'
    });
  });

  it('builds dashboard return hrefs with dashboard key, time range, and selected variables', () => {
    expect(
      buildDashboardReturnHref({
        currentHref: '/dashboard?dashboard=old&var-service.name=checkout&var-stale=value#preview',
        dashboardKey: 'Signals Overview',
        timeRange: { timeRange: 'last-1h', refresh: '30' },
        variables: [
          { name: 'service.name', type: 'textbox', value: 'billing' },
          { name: 'deployment.environment.name', type: 'textbox', value: 'prod' },
          { name: 'stale', type: 'textbox', value: '' }
        ]
      })
    ).toBe('/dashboard?dashboard=signals-overview&var-service.name=billing&var-deployment.environment.name=prod&timeRange=last-1h&refresh=30#preview');
  });

  it('syncs dashboard time range deep links while preserving dashboard and variable context', () => {
    expect(
      buildDashboardTimeRangeDeepLinkHref(
        '/dashboard?dashboard=signals-overview&var-service.name=billing&timeRange=last-1h#preview',
        { timeRange: 'last-30m', refresh: '60' }
      )
    ).toBe('/dashboard?dashboard=signals-overview&var-service.name=billing&timeRange=last-30m&refresh=60#preview');

    expect(
      buildDashboardTimeRangeDeepLinkHref(
        '/dashboard?dashboard=signals-overview&var-service.name=billing&timeRange=last-1h&refresh=60&live=true',
        {}
      )
    ).toBe('/dashboard?dashboard=signals-overview&var-service.name=billing');
  });

  it('delegates display-label and primitive cleanup to the shared compatibility redirect owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/dashboard/navigation.ts'), 'utf8');

    expect(source).not.toContain('sanitizeDashboardSearchParams');
    expect(source).not.toContain('delete next.returnLabel');
    expect(source).not.toContain('stripReturnLabelFromHref');
    expect(source).toContain("import { buildOverviewCompatRouteUrl, type SearchParamsRecord } from '../overview/navigation'");
    expect(source).toContain('applySignalDashboardTimeRange');
    expect(source).toContain("import {");
    expect(source).toContain('export type { SearchParamsRecord }');
    expect(source).toContain('return buildOverviewCompatRouteUrl(searchParams)');
    expect(source).toContain('url.searchParams.set(\'dashboard\', normalizedDashboardKey)');
    expect(source).toContain("const DASHBOARD_VARIABLE_PARAM_PREFIX = 'var-'");
    expect(source).toContain('readDashboardVariableUrlOverrides');
    expect(source).toContain('buildDashboardVariableDeepLinkHref');
    expect(source).toContain('buildDashboardReturnHref');
    expect(source).toContain('buildDashboardTimeRangeDeepLinkHref');
    expect(source).not.toContain("buildCompatRedirectTarget('/overview'");
    expect(source).not.toContain("'/overview'");
  });
});
