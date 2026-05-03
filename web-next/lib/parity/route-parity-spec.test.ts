import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_ROUTE_PARITY_REGION_KEYS,
  ROUTE_PARITY_SPECS,
  ROUTE_PARITY_VIEWPORTS,
  getRouteParityArchetypes,
  getRouteParitySpec,
  getRouteParitySpecForRoutePair
} from './route-parity-spec';

const repoRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

describe('route parity specs', () => {
  it('locks the four Angular-truth archetypes and their representative sample pages', () => {
    expect(getRouteParityArchetypes()).toEqual([
      'dashboard-home',
      'explorer-workbench',
      'list-detail',
      'settings-admin'
    ]);

    expect(ROUTE_PARITY_SPECS.map(spec => spec.nextRoute)).toEqual(
      expect.arrayContaining([
        '/overview',
        '/ingestion/otlp',
        '/trace/manage',
        '/alert/group',
        '/setting/settings/config',
        '/monitors/632051474676992?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors'
      ])
    );
  });

  it('records the same eight must-match regions for every representative parity spec', () => {
    for (const spec of ROUTE_PARITY_SPECS) {
      expect(spec.mustMatchRegions.map(region => region.key)).toEqual(REQUIRED_ROUTE_PARITY_REGION_KEYS);
    }
  });

  it('pins desktop/mobile viewports, fixture state, and drift policy for every representative page', () => {
    for (const spec of ROUTE_PARITY_SPECS) {
      expect(spec.viewports).toEqual(ROUTE_PARITY_VIEWPORTS);
      expect(spec.fixtureState.length).toBeGreaterThan(0);
      expect(spec.allowedDrift).toEqual({
        hierarchy: 'none',
        chrome: 'token-only',
        responsiveWrap: 'allowed',
        copy: 'fixture-only'
      });
    }
  });

  it('maps manifest-backed route pairs to parity specs and keeps deleted Angular pages on archive truth', () => {
    expect(getRouteParitySpecForRoutePair('three-signal-desk', 'overview-desk')).toMatchObject({
      key: 'overview-home',
      archetype: 'dashboard-home',
      referenceSource: {
        kind: 'angular-live'
      }
    });

    const traceSpec = getRouteParitySpecForRoutePair('three-signal-desk', 'trace-manage-desk');
    expect(traceSpec).toMatchObject({
      key: 'trace-manage',
      archetype: 'explorer-workbench',
      nextRoute: '/trace/manage',
      referenceSource: {
        kind: 'angular-archive',
        archiveRecordPath: 'web-next/docs/parity/trace-manage-archive.md',
        lastKnownTemplateCommit: '4ffc07adb'
      }
    });

    expect(path.join(repoRoot, traceSpec.referenceSource.archiveRecordPath ?? '')).toBe(
      path.join(repoRoot, 'web-next/docs/parity/trace-manage-archive.md')
    );
  });

  it('captures the settings/admin baseline through the bundled system-config route', () => {
    expect(getRouteParitySpec('setting-system-config')).toMatchObject({
      archetype: 'settings-admin',
      routePairKey: 'setting-system-config',
      referenceSource: {
        templatePaths: [
          'web-app/src/app/routes/setting/settings/settings.component.html',
          'web-app/src/app/routes/setting/settings/system-config/system-config.component.html'
        ]
      }
    });
  });

  it('captures the user-reported monitor detail baseline through the live Angular monitor route', () => {
    expect(getRouteParitySpec('monitor-detail-reported')).toMatchObject({
      archetype: 'list-detail',
      familyKey: 'monitor-family',
      routePairKey: 'monitor-detail-reported',
      referenceSource: {
        kind: 'angular-live',
        templatePaths: [
          'web-app/src/app/routes/monitor/monitor-detail/monitor-detail.component.html',
          'web-app/src/app/routes/monitor/monitor-data-table/monitor-data-table.component.html'
        ],
        sharedComponentPaths: expect.arrayContaining([
          'web-app/src/app/shared/components/page-shell/page-shell.component.html',
          'web-app/src/app/shared/components/platform-facts-strip/platform-facts-strip.component.html'
        ])
      }
    });

    expect(getRouteParitySpecForRoutePair('monitor-family', 'monitor-detail-reported').mustMatchRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'factsStrip', expectation: 'present' }),
        expect.objectContaining({ key: 'stageSection', expectation: 'present' }),
        expect.objectContaining({ key: 'tableListRow', expectation: 'present' })
      ])
    );
  });

  it('pins every representative parity spec to manifest-backed closeout verification commands', () => {
    for (const spec of ROUTE_PARITY_SPECS) {
      const routeTestPath = spec.routeTestPath?.replace('web-next/', '');

      expect(spec.routeTestPath).toMatch(/^web-next\/app\//);
      expect(spec.minimumVerificationCommand.length).toBeGreaterThan(0);
      expect(spec.familyVerificationCommand.length).toBeGreaterThan(0);

      if (routeTestPath) {
        expect(spec.minimumVerificationCommand).toContain(routeTestPath);
        expect(spec.familyVerificationCommand).toContain(routeTestPath);
      }
    }

    expect(getRouteParitySpec('overview-home')).toMatchObject({
      minimumVerificationCommand:
        'npm exec vitest run app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts'
    });

    expect(getRouteParitySpec('alert-group').familyVerificationCommand).toContain(
      'app/alert/group/page.test.tsx'
    );
  });
});
