import manifest from '../../lib/parity/route-manifest.json';
import { describe, expect, it } from 'vitest';
import { buildParityRunPlan, buildParityVerificationPlan } from './harness-plan.mjs';

describe('parity harness plan', () => {
  it('builds a manifest-driven milestone 2 route plan without hardcoded route lists', () => {
    const plan = buildParityRunPlan(manifest, {
      milestone: 2,
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(plan).toHaveLength(8);
    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyKey: 'three-signal-desk',
          routePairKey: 'overview-desk',
          parityOwner: 'ThreeSignalDeskShell',
          nextPagePath: 'web-next/app/overview/page.tsx',
          routeTestPath: 'web-next/app/overview/page.test.tsx',
          nextUrl: 'http://127.0.0.1:4200/overview',
          referenceUrl: 'http://127.0.0.1:4301/overview'
        }),
        expect.objectContaining({
          familyKey: 'log-compatibility-family',
          routePairKey: 'log-integration-root-compat',
          parityOwner: 'buildLogIntegrationIngestionHref',
          nextPagePath: 'web-next/app/log/integration/page.tsx',
          routeTestPath: 'web-next/app/log/integration/page.test.tsx',
          nextUrl: 'http://127.0.0.1:4200/log/integration',
          referenceUrl: 'http://127.0.0.1:4301/log/integration'
        }),
        expect.objectContaining({
          familyKey: 'log-compatibility-family',
          routePairKey: 'log-stream-compat',
          parityOwner: 'LogManagePage',
          nextPagePath: 'web-next/app/log/stream/page.tsx',
          routeTestPath: 'web-next/app/log/stream/page.test.tsx',
          nextUrl: 'http://127.0.0.1:4200/log/stream',
          referenceUrl: 'http://127.0.0.1:4301/log/stream'
        })
      ])
    );
    expect(plan.map(target => target.routePairKey)).not.toContain('events-alias');
  });

  it('preserves auth state, seed state, and minimum verification commands in the printed plan', () => {
    const [target] = buildParityRunPlan(manifest, {
      familyKey: 'three-signal-desk',
      routeKey: 'log-manage-desk',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(target).toMatchObject({
      familyKey: 'three-signal-desk',
      routePairKey: 'log-manage-desk',
      parityOwner: 'ThreeSignalDeskShell',
      nextPagePath: 'web-next/app/log/manage/page.tsx',
      routeTestPath: 'web-next/app/log/manage/page.test.tsx',
      authState: 'session',
      seedState: 'none',
      minimumVerificationCommand: 'npm exec vitest run app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('wires the user-reported monitor detail route into the manifest-backed harness closeout plan', () => {
    const plan = buildParityVerificationPlan(manifest, {
      familyKey: 'monitor-family',
      routeKey: 'monitor-detail-reported',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(plan.targets).toEqual([
      expect.objectContaining({
        familyKey: 'monitor-family',
        routePairKey: 'monitor-detail-reported',
        nextUrl:
          'http://127.0.0.1:4200/monitors/632051474676992?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors',
        referenceUrl:
          'http://127.0.0.1:4301/monitors/632051474676992?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors',
        routeTestPath: 'web-next/app/monitors/[monitorId]/page.test.tsx',
        routeParitySpec: expect.objectContaining({
          key: 'monitor-detail-reported',
          archetype: 'list-detail'
        }),
        primarySelectors: expect.arrayContaining([
          '[data-monitor-console-layout="angular-workbench"]',
          '[data-monitor-detail-signal-list="true"]'
        ])
      })
    ]);
    expect(plan.verificationCommands).toEqual([
      "npm exec vitest run 'app/monitors/[monitorId]/page.test.tsx' components/monitor-detail/monitor-detail-sections.test.tsx components/monitor-detail/monitor-detail-console.test.tsx lib/parity/route-manifest.test.ts scripts/parity/harness-lib.test.ts && PARITY_FAMILY=monitor-family PARITY_ROUTE=monitor-detail-reported node ./scripts/parity/harness.mjs"
    ]);
    expect(plan.verificationSteps).toEqual([
      {
        command:
          "npm exec vitest run 'app/monitors/[monitorId]/page.test.tsx' components/monitor-detail/monitor-detail-sections.test.tsx components/monitor-detail/monitor-detail-console.test.tsx lib/parity/route-manifest.test.ts scripts/parity/harness-lib.test.ts && PARITY_FAMILY=monitor-family PARITY_ROUTE=monitor-detail-reported node ./scripts/parity/harness.mjs",
        routePairKeys: ['monitor-detail-reported'],
        routeTestPaths: ['web-next/app/monitors/[monitorId]/page.test.tsx']
      }
    ]);
  });

  it('builds a deduplicated verification command summary for a manifest-driven milestone plan', () => {
    const plan = buildParityVerificationPlan(manifest, {
      milestone: 2,
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(plan.targets).toHaveLength(8);
    expect(plan.parityOwners).toEqual([
      'ThreeSignalDeskShell',
      'LogManagePage',
      'buildLogIntegrationIngestionHref'
    ]);
    expect(plan.verificationCommands).toEqual([
      'npm exec vitest run app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts',
      'npm exec vitest run app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts',
      'npm exec vitest run app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts lib/parity/route-manifest.test.ts',
      'npm exec vitest run app/ingestion/otlp/page.test.tsx lib/otlp-center/view-model.test.ts lib/parity/route-manifest.test.ts',
      'npm exec vitest run app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts',
      'npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx',
      'npm exec vitest run app/log/integration/page.test.tsx lib/parity/route-manifest.test.ts',
      "npm exec vitest run 'app/log/integration/[source]/page.test.tsx' lib/parity/route-manifest.test.ts"
    ]);
    expect(plan.familyVerificationCommands).toEqual([
      'npm exec vitest run components/pages/three-signal-desk-shell.test.tsx lib/workspace-navigation.test.ts app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts app/ingestion/otlp/page.test.tsx lib/otlp-center/view-model.test.ts app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts',
      "npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx app/log/integration/page.test.tsx 'app/log/integration/[source]/page.test.tsx' components/pages/log-integration-redirect-shell.test.tsx lib/log-manage/query-state.test.ts"
    ]);
    expect(plan.verificationSteps).toEqual([
      {
        command: 'npm exec vitest run app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts',
        routePairKeys: ['overview-desk'],
        routeTestPaths: ['web-next/app/overview/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts',
        routePairKeys: ['log-manage-desk'],
        routeTestPaths: ['web-next/app/log/manage/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts lib/parity/route-manifest.test.ts',
        routePairKeys: ['trace-manage-desk'],
        routeTestPaths: ['web-next/app/trace/manage/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/ingestion/otlp/page.test.tsx lib/otlp-center/view-model.test.ts lib/parity/route-manifest.test.ts',
        routePairKeys: ['otlp-center-desk'],
        routeTestPaths: ['web-next/app/ingestion/otlp/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts',
        routePairKeys: ['otlp-metrics-console'],
        routeTestPaths: ['web-next/app/ingestion/otlp/metrics/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx',
        routePairKeys: ['log-stream-compat'],
        routeTestPaths: ['web-next/app/log/stream/page.test.tsx']
      },
      {
        command: 'npm exec vitest run app/log/integration/page.test.tsx lib/parity/route-manifest.test.ts',
        routePairKeys: ['log-integration-root-compat'],
        routeTestPaths: ['web-next/app/log/integration/page.test.tsx']
      },
      {
        command: "npm exec vitest run 'app/log/integration/[source]/page.test.tsx' lib/parity/route-manifest.test.ts",
        routePairKeys: ['log-integration-compat'],
        routeTestPaths: ['web-next/app/log/integration/[source]/page.test.tsx']
      }
    ]);
    expect(plan.familyVerificationSteps).toEqual([
      {
        familyKey: 'three-signal-desk',
        parityOwner: 'ThreeSignalDeskShell',
        command:
          'npm exec vitest run components/pages/three-signal-desk-shell.test.tsx lib/workspace-navigation.test.ts app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts app/ingestion/otlp/page.test.tsx lib/otlp-center/view-model.test.ts app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts',
        routePairKeys: ['overview-desk', 'log-manage-desk', 'trace-manage-desk', 'otlp-center-desk', 'otlp-metrics-console'],
        routeTestPaths: [
          'web-next/app/overview/page.test.tsx',
          'web-next/app/log/manage/page.test.tsx',
          'web-next/app/trace/manage/page.test.tsx',
          'web-next/app/ingestion/otlp/page.test.tsx',
          'web-next/app/ingestion/otlp/metrics/page.test.tsx'
        ]
      },
      {
        familyKey: 'log-compatibility-family',
        parityOwner: 'buildLogCompatRouteUrl',
        command:
          "npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx app/log/integration/page.test.tsx 'app/log/integration/[source]/page.test.tsx' components/pages/log-integration-redirect-shell.test.tsx lib/log-manage/query-state.test.ts",
        routePairKeys: ['log-stream-compat', 'log-integration-root-compat', 'log-integration-compat'],
        routeTestPaths: [
          'web-next/app/log/stream/page.test.tsx',
          'web-next/app/log/integration/page.test.tsx',
          'web-next/app/log/integration/[source]/page.test.tsx'
        ]
      }
    ]);
  });

  it('moves the events alias into the milestone 5 compatibility sweep', () => {
    const plan = buildParityRunPlan(manifest, {
      milestone: 5,
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          familyKey: 'compatibility-placeholder-family',
          routePairKey: 'events-alias',
          nextUrl: 'http://127.0.0.1:4200/events',
          referenceUrl: 'http://127.0.0.1:4301/log/manage'
        })
      ])
    );
  });

  it('surfaces representative RouteParitySpec baseline metadata in the printed run plan', () => {
    const [overviewTarget] = buildParityRunPlan(manifest, {
      familyKey: 'three-signal-desk',
      routeKey: 'overview-desk',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });
    const [alertGroupTarget] = buildParityRunPlan(manifest, {
      familyKey: 'alert-family',
      routeKey: 'alert-group',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });
    const [eventsAliasTarget] = buildParityRunPlan(manifest, {
      familyKey: 'compatibility-placeholder-family',
      routeKey: 'events-alias',
      nextBaseUrl: 'http://127.0.0.1:4200',
      referenceBaseUrl: 'http://127.0.0.1:4301'
    });

    expect(overviewTarget.routeParitySpec).toMatchObject({
      key: 'overview-home',
      archetype: 'dashboard-home',
      fixtureState: 'authenticated overview workspace with readiness, focus cards, quick entry, and active right rail',
      viewports: [
        { key: 'desktop', width: 1440, height: 960 },
        { key: 'mobile', width: 390, height: 844 }
      ],
      allowedDrift: {
        hierarchy: 'none',
        chrome: 'token-only',
        responsiveWrap: 'allowed',
        copy: 'fixture-only'
      }
    });
    expect(overviewTarget.routeParitySpec.mustMatchRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'header', expectation: 'present' }),
        expect.objectContaining({ key: 'drawerDetailPanel', expectation: 'absent' })
      ])
    );

    expect(alertGroupTarget.routeParitySpec).toMatchObject({
      key: 'alert-group',
      archetype: 'list-detail'
    });
    expect(alertGroupTarget.routeParitySpec.mustMatchRegions).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'tableListRow', expectation: 'present' })])
    );

    expect(eventsAliasTarget.routeParitySpec).toBeNull();
  });
});
