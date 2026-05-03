import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDashboardCompatRouteUrl } from './navigation';

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

  it('delegates display-label and primitive cleanup to the shared compatibility redirect owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/dashboard/navigation.ts'), 'utf8');

    expect(source).not.toContain('sanitizeDashboardSearchParams');
    expect(source).not.toContain('delete next.returnLabel');
    expect(source).not.toContain('stripReturnLabelFromHref');
    expect(source).toContain("buildCompatRedirectTarget('/overview', searchParams)");
  });
});
