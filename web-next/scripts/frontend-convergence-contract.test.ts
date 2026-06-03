import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SUPPLEMENTAL_MESSAGES } from '../lib/i18n-runtime-messages';
import { buildLegacyFrontendParityAudit, validateLegacyFrontendParityGate } from '../lib/legacy-frontend-parity';
import { cutoverHoldRoutes, placeholderRoutes, routeMatrixPaths } from '../lib/nav';

const webNextRoot = resolve(__dirname, '..');

function readWebNext(path: string): string {
  return readFileSync(resolve(webNextRoot, path), 'utf8');
}

describe('M10 frontend convergence contract', () => {
  it('keeps the final route cutover free of primary hold or placeholder blockers', () => {
    const audit = buildLegacyFrontendParityAudit();
    const gate = validateLegacyFrontendParityGate(audit);

    expect(cutoverHoldRoutes.map(route => route.href)).toEqual([]);
    expect(placeholderRoutes.map(route => route.href)).toEqual([]);
    expect(audit.releaseBlocked).toBe(false);
    expect(gate).toEqual({ valid: true, issues: [] });
  });

  it('keeps the release route matrix covering the M10 action and incident workbenches', () => {
    const routeMatrixScript = readWebNext('scripts/route-matrix.mjs');

    expect(routeMatrixPaths).toEqual(expect.arrayContaining(['/actions', '/incidents', '/log/manage', '/trace/manage']));
    expect(routeMatrixScript).toContain("'/actions'");
    expect(routeMatrixScript).toContain("'/incidents'");
    expect(routeMatrixScript).toContain("'/passport/login'");
  });

  it('keeps core workbench loading and first-screen cache behavior centralized', () => {
    const appFrameSource = readWebNext('components/shell/app-frame.tsx');
    const clientWorkbenchSource = readWebNext('components/workbench/client-workbench.tsx');
    const cacheSource = readWebNext('lib/workbench-load-cache.ts');

    expect(cacheSource).toContain('settledTtlMs');
    expect(appFrameSource).toContain("import { consumeWorkbenchLoad } from '@/lib/workbench-load-cache'");
    expect(appFrameSource).toContain('APP_FRAME_HEADER_STATE_CACHE_TTL_MS = 60_000');
    expect(appFrameSource).toContain('app-frame:header-state:${locale}');
    expect(appFrameSource).not.toContain('app-frame:header-state:${locale}:${pathname}');
    expect(clientWorkbenchSource).toContain('cacheSettledTtlMs?: number');
    expect(clientWorkbenchSource).toContain('consumeWorkbenchLoad(cacheKey, load, { settledTtlMs: cacheSettledTtlMs })');
  });

  it('keeps the migrated M10 workbenches on UI Lab backed shared components', () => {
    const uiSource = readWebNext('packages/hertzbeat-ui/src/index.tsx');
    const uiLabSource = readWebNext('app/ui-lab/page.tsx');
    const checks = [
      {
        route: readWebNext('app/actions/actions-page.tsx'),
        sharedComponent: 'HzActionWorkbench',
        uiLabMarker: 'data-hz-ui-lab-action-workbench="shared"',
        routeMarker: 'data-actions-shared-workbench="hertzbeat-ui"',
        forbidden: ['OpsSurfacePage', 'angular-dark-ops-placeholder']
      },
      {
        route: readWebNext('app/incidents/incidents-page.tsx'),
        sharedComponent: 'HzIncidentWorkbench',
        uiLabMarker: 'data-hz-ui-lab-incident-workbench="shared"',
        routeMarker: 'data-incidents-shared-workbench="hertzbeat-ui"',
        forbidden: ['OpsSurfacePage', 'angular-dark-ops-placeholder']
      },
      {
        route: readWebNext('app/explorer/explorer-page.tsx'),
        sharedComponent: 'HzExplorerFrame',
        uiLabMarker: '@hertzbeat/ui explorer',
        routeMarker: 'data-explorer-shared-frame="hertzbeat-ui"',
        forbidden: ['OpsSurfacePage', 'buildExplorerSurfaceConfig']
      },
      {
        route: readWebNext('app/topology/topology-page.tsx'),
        sharedComponent: 'HzTopologyWorkbenchFrame',
        uiLabMarker: 'data-hz-ui-lab-topology-workbench-frame="shared"',
        routeMarker: 'data-topology-workbench-frame-owner="hertzbeat-ui-workbench-frame"',
        forbidden: ['data-topology-static-seed', 'checkout-api/orders-db/redis']
      }
    ];

    checks.forEach(check => {
      expect(uiSource).toContain(`export function ${check.sharedComponent}`);
      expect(uiLabSource).toContain(check.uiLabMarker);
      expect(check.route).toContain(check.sharedComponent);
      expect(check.route).toContain(check.routeMarker);
      check.forbidden.forEach(forbidden => {
        expect(check.route).not.toContain(forbidden);
      });
    });
  });

  it('keeps shared time-range and monitor operator copy available in Next runtime catalogs', () => {
    const enMessages = SUPPLEMENTAL_MESSAGES['en-US'] ?? {};
    const zhMessages = SUPPLEMENTAL_MESSAGES['zh-CN'] ?? {};

    [
      'time.range.preset',
      'time.range.apply',
      'time.range.refresh-action',
      'monitors.app-picker.catalog-title',
      'monitors.app-picker.search-placeholder',
      'monitors.controls.more-actions',
      'common.select-page',
      'common.select-all-results'
    ].forEach(key => {
      expect(enMessages[key], `${key} en-US`).toBeTruthy();
      expect(zhMessages[key], `${key} zh-CN`).toBeTruthy();
    });
  });

  it('keeps frontend DTOs aligned with the final M10 entity, OTLP, monitor, and status evidence surfaces', () => {
    const typesSource = readWebNext('lib/types.ts');

    expect(typesSource).toContain("_displayStatus?: 'ACTIVE' | 'DISAPPEARED'");
    expect(typesSource).toContain('_disappearTime?: number');
    expect(typesSource).toContain('export interface OtlpUnboundEntityCandidate');
    expect(typesSource).toContain('recentUnboundCandidates?: OtlpUnboundEntityCandidate[]');
    expect(typesSource).toContain('unifiedEvidenceSummary?: EntityUnifiedEvidenceSummary');
    expect(typesSource).toContain('export interface EntityUnifiedEvidenceSummary');
    expect(typesSource).toContain('incidentId?: number');
  });
});
