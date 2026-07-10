import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import manifest from '../../lib/parity/route-manifest.json';
import { describe, expect, it } from 'vitest';
import { buildParityRunPlan } from './harness-plan.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');

describe('milestone 2 parity owner contracts', () => {
  it('binds every manifest-owned route pair to a real page file and route test file', () => {
    const plan = buildParityRunPlan(manifest, { milestone: 2 });

    for (const target of plan) {
      expect(target.nextPagePath).toBeTruthy();
      expect(target.routeTestPath).toBeTruthy();
      expect(existsSync(path.join(repoRoot, target.nextPagePath))).toBe(true);
      expect(existsSync(path.join(repoRoot, target.routeTestPath))).toBe(true);
    }
  });

  it('keeps three-signal desks and log compatibility aliases on their declared shared owners', () => {
    const plan = buildParityRunPlan(manifest, { milestone: 2 });
    const threeSignalRouteOwners = {
      'overview-desk': 'OverviewPage',
      'log-manage-desk': 'LogManagePage',
      'trace-manage-desk': 'TraceManagePage',
      'otlp-center-desk': 'OtlpPage',
      'otlp-metrics-console': 'OtlpMetricsPage'
    } as const;

    for (const target of plan) {
      const pageSource = readFileSync(path.join(repoRoot, target.nextPagePath), 'utf8');
      const sharedOwnerPath = target.nextPagePath.endsWith('app/log/manage/page.tsx')
        ? path.join(repoRoot, path.dirname(target.nextPagePath), 'log-manage-page.tsx')
        : null;
      const ownerSource = sharedOwnerPath && existsSync(sharedOwnerPath)
        ? readFileSync(sharedOwnerPath, 'utf8')
        : pageSource;

      if (target.parityOwner === 'ThreeSignalDeskShell') {
        const routeOwner = threeSignalRouteOwners[target.routePairKey as keyof typeof threeSignalRouteOwners];
        expect(routeOwner).toBeTruthy();
        expect(pageSource).toContain(routeOwner);
      }

      if (target.parityOwner === 'LogManagePage') {
        expect(ownerSource).toContain('LogManagePage');
      }

      if (target.parityOwner === 'buildLogCompatRouteUrl') {
        expect(pageSource).toContain('buildLogCompatRouteUrl');
      }

      if (target.parityOwner === 'buildLogIntegrationIngestionHref') {
        expect(pageSource).toContain('buildLogIntegrationIngestionHref');
      }
    }
  });
});
