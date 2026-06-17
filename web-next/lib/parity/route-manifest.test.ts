import { describe, expect, it } from 'vitest';
import {
  buildParityNextUrls,
  buildParityReferenceUrl,
  getDefaultParityRoutePairForMilestone,
  getParityFamily,
  getParityFamiliesForMilestone,
  getParityRoutePair,
  PARITY_ROUTE_MANIFEST
} from './route-manifest';

describe('parity route manifest', () => {
  it('covers every milestone in the full parity wave', () => {
    expect([...new Set(PARITY_ROUTE_MANIFEST.map(family => family.milestone))]).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps route contract copy free of locale-specific Han script literals', () => {
    expect(JSON.stringify(PARITY_ROUTE_MANIFEST)).not.toMatch(/\p{Script=Han}/u);
  });

  it('maps the major Angular route families to explicit Next.js parity owners', () => {
    expect(PARITY_ROUTE_MANIFEST.map(family => family.key)).toEqual(
      expect.arrayContaining([
        'shared-parity-foundation',
        'three-signal-desk',
        'log-compatibility-family',
        'monitor-family',
        'entity-family',
        'alert-family',
        'setting-family',
        'auth-public-family',
        'compatibility-placeholder-family'
      ])
    );
  });

  it('builds canonical Next.js and Angular reference urls from one manifest pair', () => {
    const routePair = getParityRoutePair('shared-parity-foundation', 'passport-login-shell');

    expect(buildParityReferenceUrl(routePair)).toBe('http://127.0.0.1:4301/passport/login');
    expect(buildParityNextUrls(routePair)).toEqual(['http://127.0.0.1:4200/passport/login']);
    expect(routePair.primarySelectors).toEqual(
      expect.arrayContaining([
        '[data-passport-content-alignment="angular-centered"]',
        '[data-passport-intro-bullet-tone="angular-cyan"]',
        '[data-passport-hero-offset="angular-left-reference"]'
      ])
    );
  });

  it('lets automation resolve milestone families without hardcoded route lists', () => {
    expect(getParityFamiliesForMilestone(2).map(family => family.key)).toEqual(
      expect.arrayContaining(['three-signal-desk', 'log-compatibility-family'])
    );
  });

  it('tracks both root and source log-integration compatibility entrypoints in milestone 2', () => {
    const family = getParityRoutePair('log-compatibility-family', 'log-integration-compat');
    const rootRoute = getParityRoutePair('log-compatibility-family', 'log-integration-root-compat');

    expect(family.nextRoute).toBe('/log/integration/webhook');
    expect(rootRoute.nextRoute).toBe('/log/integration');
    expect(rootRoute.referenceRoute).toBe('/log/integration');
  });

  it('points milestone 2 routes at targeted route contracts instead of broad smoke-only commands', () => {
    expect(getParityRoutePair('three-signal-desk', 'overview-desk').minimumVerificationCommand).toBe(
      'npm exec vitest run app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts'
    );
    expect(getParityRoutePair('three-signal-desk', 'overview-desk').textSnippets).toEqual(
      expect.arrayContaining(['You have completed 83% of platform setup'])
    );
    expect(getParityRoutePair('log-compatibility-family', 'log-stream-compat').minimumVerificationCommand).toBe(
      'npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx'
    );
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-root-compat').minimumVerificationCommand).toBe(
      'npm exec vitest run app/log/integration/page.test.tsx lib/parity/route-manifest.test.ts'
    );
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-compat').minimumVerificationCommand).toBe(
      "npm exec vitest run 'app/log/integration/[source]/page.test.tsx' lib/parity/route-manifest.test.ts"
    );
  });

  it('defers the events compatibility route to the milestone 5 closeout family', () => {
    expect(getParityFamily('log-compatibility-family').routePairs.map(routePair => routePair.key)).not.toContain('events-alias');
  });

  it('tracks the events compatibility alias through the shared log-manage contracts instead of the old route-only fallback', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'events-alias')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-log-manage-route="otlp-cold-log-workbench"]',
        '[data-log-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-log-manage-query-bar="hertzbeat-ui-query-row"]',
        '[data-log-manage-chart-band="hertzbeat-ui-chart-band"]',
        '[data-log-manage-log-list="cold-dense-log-list"]',
        '[data-log-manage-detail-panel="hertzbeat-ui-detail-panel"]',
        'main',
        'input',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Log workbench', 'Severity', 'Log volume time series', 'Run query']),
      actionLabels: ['Run query', 'Save view', 'Create alert', 'Add to dashboard'],
      minimumVerificationCommand:
        'npm exec vitest run app/events/page.test.ts app/log/manage/page.test.tsx app/compatibility-entrypoints.chrome.test.ts lib/log-manage/query-state.test.ts lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the dashboard compatibility alias through the overview route contracts instead of the old route-matrix fallback', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'dashboard-alias')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-workspace-shell="true"]',
        '[data-overview-status-grid="true"]',
        '[data-overview-guidance="true"]',
        '[data-overview-checklist="true"]',
        'main',
        'aside'
      ]),
      textSnippets: expect.arrayContaining(['Overview', 'Workspace status', 'Next step: connect one usable signal path first', 'You have completed 83% of platform setup']),
      actionLabels: ['Refresh'],
      minimumVerificationCommand:
        'npm exec vitest run app/dashboard/page.test.ts app/overview/page.test.tsx app/compatibility-entrypoints.chrome.test.ts lib/overview/navigation.test.ts lib/overview/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the alerts compatibility alias through the shared alert-center contracts instead of the old route-matrix fallback', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-center-surface="otlp-cold-center-console"]',
        '[data-alert-center-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-center-header="hertzbeat-ui-compact-header"]',
        '[data-alert-center-command-row="standard-equal-buttons"]',
        '[data-alert-center-admin-layout="full-width-admin-list"]',
        '[data-alert-center-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-center-list-shell="cold-alert-list"]',
        '[data-alert-center-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-center-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'input',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Alert center', 'Review and handle current alerts in one place', 'Search alerts']),
      actionLabels: ['Refresh'],
      minimumVerificationCommand:
        'npm exec vitest run app/alerts/page.test.ts app/alert/page.test.tsx components/pages/alert-center-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-manage/query-state.test.ts lib/alert-manage/controller.test.ts lib/alert-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors).not.toContain(
      '[data-alert-center-workbench-panel="angular-single-panel"]'
    );
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors).not.toContain(
      '[data-alert-center-toolbar="angular-density"]'
    );
  });

  it('tracks the incidents OTLP cold-matte entry through targeted route and surface-model contracts', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'incidents-placeholder')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-incidents-route="otlp-cold-ops-entry"]',
        '[data-incidents-style-baseline="hertzbeat-ui-matte"]',
        '[data-incidents-shell-panel="cold-ops-shell-panel"]',
        '[data-incidents-launch-checklist="cold-ops-static-rail"]',
        '[data-incidents-empty-state="cold-ops-domain-adapter"]',
        'main',
        'section',
        'aside',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Incident events', 'cold baseline from the OTLP workbench', 'Cold entrypoint connected', 'Waiting for event adapter onboarding', 'You have completed 83% of platform setup']),
      actionLabels: ['Open overview', 'View entity'],
      minimumVerificationCommand:
        'npm exec vitest run app/incidents/page.test.tsx lib/incidents-surface/view-model.test.ts lib/incidents-surface/model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the actions OTLP cold-matte entry through targeted route and surface-model contracts', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'actions-placeholder')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-actions-route="otlp-cold-ops-entry"]',
        '[data-actions-style-baseline="hertzbeat-ui-matte"]',
        '[data-actions-shared-workbench="hertzbeat-ui"]',
        '[data-hz-action-workbench-owner="hertzbeat-ui-action-workbench"]',
        '[data-actions-shell-panel="cold-ops-shell-panel"]',
        '[data-actions-launch-checklist="cold-ops-static-rail"]',
        '[data-actions-catalog="manual-action-catalog-api"]',
        '[data-actions-catalog-owner="next-actions-catalog-bff"]',
        '[data-actions-catalog-execution-allowed="false"]',
        '[data-actions-approval-draft="manual-approval-draft-api"]',
        '[data-actions-approval-draft-owner="next-actions-approval-draft-bff"]',
        '[data-actions-approval-draft-execution-allowed="false"]',
        '[data-actions-approval-draft-queue="manual-approval-draft-read-api"]',
        '[data-actions-approval-draft-queue-owner="next-actions-approval-draft-bff"]',
        '[data-actions-approval-draft-queue-execution-allowed="false"]',
        '[data-actions-approval-decision="manual-approval-decision-api"]',
        '[data-actions-approval-decision-owner="next-actions-approval-decision-bff"]',
        '[data-actions-approval-decision-execution-allowed="false"]',
        '[data-actions-empty-state="cold-ops-domain-adapter"]',
        'main',
        'section',
        'aside',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Automation actions', 'cold baseline from the OTLP workbench', 'Cold entrypoint connected', 'Waiting for action adapter onboarding', 'You have completed 83% of platform setup']),
      actionLabels: ['Open overview', 'View entity'],
      minimumVerificationCommand:
        'npm exec vitest run app/actions/page.test.tsx app/api/actions/approval-drafts/route.test.ts app/api/actions/approval-drafts/[draftId]/decision/route.test.ts app/api/actions/catalog/route.test.ts lib/actions-surface/view-model.test.ts lib/actions-surface/model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the HertzBeat-native topology relationship graph instead of copied service-map chrome', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'topology-placeholder')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-topology-route="hertzbeat-entity-topology"]',
        '[data-topology-controls="hertzbeat-topology-controls"]',
        '[data-topology-source-strip="relationship-source-contract"]',
        '[data-topology-canvas="hertzbeat-topology-canvas"]',
        '[data-topology-node="service-node"]',
        '[data-topology-edge="service-edge"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['HertzBeat enterprise operations topology', 'OTLP call relationships', 'Monitor entity ownership', 'checkout-api']),
      actionLabels: ['Fit view', 'Refresh topology'],
      minimumVerificationCommand:
        'npm exec vitest run app/topology/page.test.tsx lib/topology-surface/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the OTLP cold unified explorer as an API/query-backed workbench instead of the old external-product-first surface', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'explorer-workbench')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-explorer-route="otlp-hertzbeat-ui-workbench"]',
        '[data-explorer-style-baseline="hertzbeat-ui-matte"]',
        '[data-explorer-api-owner="trace-log-bff-query-api"]',
        '[data-explorer-query-state]',
        '[data-explorer-signal-filter]',
        '[data-explorer-api-source]',
        '[data-explorer-shared-frame="hertzbeat-ui"]',
        '[data-hz-ui="explorer-frame"]',
        '[data-explorer-query-bar="hertzbeat-ui-query-row"]',
        '[data-explorer-chart-band="hertzbeat-ui-chart-band"]',
        '[data-explorer-result-table="hertzbeat-ui-dense-table"]',
        '[data-explorer-result-table-owner="hertzbeat-ui-data-table"]',
        '[data-explorer-detail-panel="hertzbeat-ui-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Query workbench', 'Signal type', 'Run query', 'checkout']),
      actionLabels: ['Run query', 'Save view', 'Create alert', 'Add to dashboard'],
      minimumVerificationCommand:
        'npm exec vitest run app/explorer/page.test.tsx lib/explorer-surface/controller.test.ts lib/explorer-surface/view-model.test.ts lib/otlp-metrics/controller.test.ts lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('compatibility-placeholder-family', 'explorer-workbench').primarySelectors.join(' ')).not.toContain('signoz-');
  });

  it('declares explicit parity owners for the milestone 2 families', () => {
    expect(getParityFamily('three-signal-desk').parityOwner).toBe('ThreeSignalDeskShell');
    expect(getParityFamily('log-compatibility-family').parityOwner).toBe('buildLogCompatRouteUrl');
  });

  it('declares a family-closeout verification command for the shared three-signal desks', () => {
    expect((getParityFamily('three-signal-desk') as Record<string, unknown>).familyVerificationCommand).toBe(
      'npm exec vitest run components/pages/three-signal-desk-shell.test.tsx lib/workspace-navigation.test.ts app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts app/ingestion/otlp/page.test.tsx lib/otlp-center/view-model.test.ts app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts'
    );
  });

  it('declares a family-closeout verification command for the log compatibility aliases', () => {
    expect((getParityFamily('log-compatibility-family') as Record<string, unknown>).familyVerificationCommand).toBe(
      "npm exec vitest run app/log/stream/page.test.tsx app/log/manage/page.test.tsx app/log/integration/page.test.tsx 'app/log/integration/[source]/page.test.tsx' components/pages/log-integration-redirect-shell.test.tsx lib/log-manage/query-state.test.ts"
    );
  });

  it('declares a family-closeout verification command for the monitor surfaces', () => {
    expect((getParityFamily('monitor-family') as Record<string, unknown>).familyVerificationCommand).toBe(
      "npm exec vitest run app/monitors/page.test.tsx 'app/monitors/[monitorId]/page.test.tsx' components/monitor-detail/monitor-detail-console.test.tsx components/monitor-detail/monitor-detail-sections.test.tsx components/monitor-detail/monitor-summary-card.test.tsx components/monitor-detail/monitor-realtime-panel.test.tsx lib/monitor-detail/view-model.test.ts app/monitors/new/page.test.tsx app/monitors/[monitorId]/edit/page.test.tsx components/pages/monitor-editor-surface.test.tsx lib/parity/route-manifest.test.ts"
    );
  });

  it('declares a family-closeout verification command for the auth/public surfaces', () => {
    expect((getParityFamily('auth-public-family') as Record<string, unknown>).familyVerificationCommand).toBe(
      "npm exec vitest run app/login/page.test.ts app/passport/login/page.test.tsx components/pages/login-form.test.tsx lib/passport-login/controller.test.ts lib/passport-login/view-model.test.ts app/passport/lock/page.test.tsx lib/passport-lock/view-model.test.ts app/status/public/page.test.ts app/status/page.test.tsx lib/status-center/controller.test.ts lib/status-center/view-model.test.ts app/bulletin/page.test.tsx components/pages/bulletin-center-surface.test.tsx lib/bulletin-center/controller.test.ts lib/bulletin-center/view-model.test.ts 'app/exception/[type]/page.test.tsx' components/pages/exception-center-surface.test.tsx lib/exception-center/view-model.test.ts lib/parity/route-manifest.test.ts"
    );
  });

  it('declares a family-closeout verification command for the alert surfaces', () => {
    const familyVerificationCommand = (getParityFamily('alert-family') as Record<string, unknown>).familyVerificationCommand;

    expect(familyVerificationCommand).toContain("'app/alert/integration/[source]/page.test.tsx'");
    expect(familyVerificationCommand).toBe(
      "npm exec vitest run app/alert/page.test.tsx components/pages/alert-center-surface.test.tsx lib/alert-manage/query-state.test.ts lib/alert-manage/controller.test.ts lib/alert-manage/view-model.test.ts app/alert/group/page.test.tsx components/pages/alert-group-surface.test.tsx components/pages/alert-group-authoring-fields.test.tsx lib/alert-group/controller.test.ts lib/alert-group/query-state.test.ts lib/alert-group/view-model.test.ts app/alert/silence/page.test.tsx components/pages/alert-silence-surface.test.tsx components/pages/alert-silence-authoring-fields.test.tsx lib/alert-silence/controller.test.ts lib/alert-silence/query-state.test.ts lib/alert-silence/view-model.test.ts app/alert/inhibit/page.test.tsx components/pages/alert-inhibit-surface.test.tsx components/pages/alert-inhibit-authoring-fields.test.tsx lib/alert-inhibit/controller.test.ts lib/alert-inhibit/query-state.test.ts lib/alert-inhibit/view-model.test.ts app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-receiver-fields.test.tsx components/pages/alert-notice-rule-fields.test.tsx components/pages/alert-notice-template-fields.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts app/alert/setting/page.test.tsx components/pages/alert-setting-surface.test.tsx lib/alert-setting/controller.test.ts lib/alert-setting/view-model.test.ts 'app/alert/integration/[source]/page.test.tsx' lib/alert-integration/controller.test.ts lib/alert-integration/view-model.test.ts lib/parity/route-manifest.test.ts"
    );
  });

  it('declares a family-closeout verification command for the settings surfaces', () => {
    expect((getParityFamily('setting-family') as Record<string, unknown>).familyVerificationCommand).toBe(
      'npm exec vitest run app/setting/page.test.ts app/setting/settings/page.test.ts components/settings/settings-console-shell.test.tsx lib/setting-settings-layout/view-model.test.ts app/setting/settings/config/page.test.tsx lib/setting-config/controller.test.ts lib/setting-config/view-model.test.ts app/setting/settings/object-store/page.test.tsx lib/object-store/controller.test.ts lib/object-store/view-model.test.ts app/setting/settings/server/page.test.tsx lib/setting-server/controller.test.ts lib/setting-server/view-model.test.ts app/setting/settings/token/page.test.tsx lib/setting-token/controller.test.ts lib/setting-token/view-model.test.ts app/setting/collector/page.test.tsx components/pages/collector-manage-surface.test.tsx lib/collector-manage/controller.test.ts lib/collector-manage/query-state.test.ts lib/collector-manage/view-model.test.ts app/setting/define/page.test.tsx components/pages/setting-define-surface.test.tsx lib/setting-define/controller.test.ts lib/setting-define/query-state.test.ts lib/setting-define/view-model.test.ts app/setting/labels/page.test.tsx components/pages/label-manage-surface.test.tsx lib/label-manage/controller.test.ts lib/label-manage/query-state.test.ts lib/label-manage/view-model.test.ts app/setting/plugins/page.test.tsx components/pages/plugin-manage-surface.test.tsx lib/plugin-manage/controller.test.ts lib/plugin-manage/query-state.test.ts lib/plugin-manage/view-model.test.ts app/setting/status/page.test.tsx components/pages/status-setting-surface.test.tsx lib/setting-status/controller.test.ts lib/setting-status/view-model.test.ts lib/parity/route-manifest.test.ts'
    );
  });

  it('declares a family-closeout verification command for compatibility aliases, placeholder twins, and Explorer', () => {
    expect((getParityFamily('compatibility-placeholder-family') as Record<string, unknown>).familyVerificationCommand).toBe(
      'npm exec vitest run app/dashboard/page.test.ts app/overview/page.test.tsx lib/overview/navigation.test.ts lib/overview/view-model.test.ts app/events/page.test.ts app/log/manage/page.test.tsx lib/log-manage/query-state.test.ts lib/log-manage/view-model.test.ts app/alerts/page.test.ts app/alert/page.test.tsx components/pages/alert-center-surface.test.tsx lib/alert-manage/query-state.test.ts lib/alert-manage/controller.test.ts lib/alert-manage/view-model.test.ts app/incidents/page.test.tsx lib/incidents-surface/view-model.test.ts lib/incidents-surface/model.test.ts app/actions/page.test.tsx app/api/actions/approval-drafts/route.test.ts app/api/actions/approval-drafts/[draftId]/decision/route.test.ts app/api/actions/catalog/route.test.ts lib/actions-surface/view-model.test.ts lib/actions-surface/model.test.ts app/topology/page.test.tsx lib/topology-surface/view-model.test.ts app/explorer/page.test.tsx lib/explorer-surface/controller.test.ts lib/explorer-surface/view-model.test.ts lib/otlp-metrics/controller.test.ts lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts'
    );
  });

  it('keeps every ThreeSignalDeskShell route on the shared workspace-shell selector contract', () => {
    const threeSignalFamily = getParityFamily('three-signal-desk');

    for (const routePair of threeSignalFamily.routePairs.filter(routePair => !['log-manage-desk', 'otlp-metrics-console', 'trace-manage-desk'].includes(routePair.key))) {
      expect(routePair.primarySelectors).toEqual(
        expect.arrayContaining(['[data-workspace-shell="true"]', 'main', 'aside'])
      );
    }
  });

  it('keeps the OTLP transition actions while the visual shell follows the HertzBeat intake cortex', () => {
    expect(getParityRoutePair('three-signal-desk', 'otlp-center-desk').actionLabels).toEqual([
      'Manage tokens',
      'View entities',
      'Open telemetry discovery'
    ]);
  });

  it('pins hydrated live-capture selectors for the representative explorer workbench routes', () => {
    expect(getParityRoutePair('three-signal-desk', 'trace-manage-desk')).toMatchObject({
      seedState: 'trace-rich-demo',
      nextApiStubKey: 'trace-rich-demo',
      referenceApiStubKey: 'trace-rich-demo',
      referenceCaptureStrategy: 'stable-list-state',
      referenceRouteMode: 'drop-trace-selection',
      nextReadySelectors: ['[data-trace-manage-route="otlp-cold-trace-workbench"]'],
      referenceReadySelectors: ['text=checkout-service', 'button:has-text("Search")']
    });
    expect(getParityRoutePair('three-signal-desk', 'trace-manage-desk').referencePostLoadActions ?? []).toEqual([]);
    expect(getParityRoutePair('three-signal-desk', 'otlp-center-desk')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-otlp-center-route="hertzbeat-intake-cortex"]',
        '[data-otlp-center-visual-system="hertzbeat-native-avant-garde"]',
        '[data-otlp-center-tone="hertzbeat-ui-ops-catalog"]',
        '[data-otlp-center-catalog-canvas="hertzbeat-circuit-mesh"]',
        '[data-otlp-center-hero="hertzbeat-intake-cortex"]',
        '[data-otlp-center-signal-band="hertzbeat-signal-ribbons"]',
        '[data-otlp-center-signal-band-layout="single-layer"]',
        '[data-otlp-center-stepper="hertzbeat-intake-steps"]',
        '[data-otlp-center-stepper-phase="source-selection"]',
        '[data-otlp-center-search-row="hertzbeat-catalog-filter"]',
        '[data-otlp-center-search-owner="shared-search-row"]',
        '[data-otlp-center-source-grid="hertzbeat-source-catalog"]',
        '[data-otlp-center-grid-density="hertzbeat-dense-catalog"]',
        '[data-otlp-center-filter-rail="hertzbeat-prism-filters"]',
        '[data-otlp-center-source-card="open-telemetry"]',
        '[data-otlp-center-source-card="commercial-observability"]',
        '[data-otlp-center-source-card="honeycomb"]',
        '[data-otlp-center-source-card="self-hosted-observability"]',
        '[data-otlp-center-source-card="java"]',
        '[data-otlp-center-source-card="dotnet"]',
        '[data-otlp-center-source-card="kubernetes-pod-logs"]',
        '[data-otlp-center-brand-logo="commercial-observability"]',
        '[data-otlp-center-brand-logo="grafana"]',
        '[data-otlp-center-brand-logo="elk"]',
        '[data-otlp-center-brand-logo="java"]',
        '[data-otlp-center-brand-logo="kubernetes-pod-logs"]',
        '[data-otlp-center-brand-art="commercial-observability"]',
        '[data-otlp-center-brand-art="grafana"]',
        '[data-otlp-center-brand-art="elk"]',
        '[data-otlp-center-brand-art="new-relic"]',
        '[data-otlp-center-brand-art="honeycomb"]',
        '[data-otlp-center-brand-art="self-hosted-observability"]',
        '[data-otlp-center-brand-art="kubernetes-pod-logs"]',
        '[data-otlp-center-brand-art="docker-container-logs"]'
      ]),
      textSnippets: expect.arrayContaining(['OTLP intake', 'Metric workbench', 'Log workbench', 'Trace workbench', 'OTLP protocol intake', 'You have completed 83% of platform setup']),
      nextReadySelectors: ['[data-otlp-center-route="hertzbeat-intake-cortex"]'],
      nextApiStubKey: 'otlp-center'
    });
  });

  it('tracks the OTLP cold metrics Workbench surface instead of the old external-product explorer shell', () => {
    const routePair = getParityRoutePair('three-signal-desk', 'otlp-metrics-console');

    expect(routePair).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-otlp-metrics-route="otlp-cold-metrics-workbench"]',
        '[data-otlp-metrics-style-baseline="hertzbeat-ui-matte"]',
        '[data-otlp-metrics-query-bar="hertzbeat-ui-query-row"]',
        '[data-otlp-metrics-chart-band="hertzbeat-ui-chart-band"]',
        '[data-otlp-metrics-series-table="cold-dense-metric-list"]',
        '[data-otlp-metrics-detail-panel="hertzbeat-ui-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Metric workbench', 'Metric query', 'Metric time series', 'Recent series', 'Detail panel', 'Run query']),
      actionLabels: ['Run query', 'Collector cluster', 'Monitor templates', 'Threshold rules'],
      minimumVerificationCommand:
        'npm exec vitest run app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(routePair.primarySelectors.join(' ')).not.toContain('data-otlp-metrics-hertzbeat-loop');
    expect(routePair.textSnippets.join(' ')).not.toContain('HertzBeat collection loop');
    const serialized = JSON.stringify(routePair);
    expect(serialized).not.toContain('signoz-metrics-explorer');
    expect(serialized).not.toContain('signoz-query-builder');
    expect(serialized).not.toContain('signoz-metrics-empty');
    expect(serialized).not.toContain('signoz-bottom-actions');
    expect(routePair.textSnippets.join(' ')).not.toContain('Run Query');
    expect(routePair.textSnippets.join(' ')).not.toContain('Select a metric and run a query');
    expect(routePair.actionLabels.join(' ')).not.toContain('Save this view');
    expect(routePair.actionLabels.join(' ')).not.toContain('Save view');
  });

  it('tracks the OTLP cold trace Workbench surface instead of the old external-product waterfall shell', () => {
    const routePair = getParityRoutePair('three-signal-desk', 'trace-manage-desk');

    expect(routePair).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-trace-manage-route="otlp-cold-trace-workbench"]',
        '[data-trace-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-trace-manage-query-bar="hertzbeat-ui-query-row"]',
        '[data-trace-manage-chart-band="hertzbeat-ui-chart-band"]',
        '[data-trace-manage-trace-table="cold-dense-trace-list"]',
        '[data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Trace workbench', 'Service name', 'Error traces', 'Recent traces', 'Run query']),
      actionLabels: ['Run query', 'Save view', 'Create alert', 'Add to dashboard'],
      minimumVerificationCommand:
        'npm exec vitest run app/trace/manage/page.test.tsx lib/trace-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });

    expect(routePair.primarySelectors.join(' ')).not.toContain('signoz-');
    expect(routePair.textSnippets.join(' ')).not.toContain('Run Query');
  });

  it('tracks the OTLP cold log Workbench surface instead of the old external-product stream shell', () => {
    expect(getParityRoutePair('three-signal-desk', 'log-manage-desk')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-log-manage-route="otlp-cold-log-workbench"]',
        '[data-log-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-log-manage-query-bar="hertzbeat-ui-query-row"]',
        '[data-log-manage-chart-band="hertzbeat-ui-chart-band"]',
        '[data-log-manage-log-list="cold-dense-log-list"]',
        '[data-log-manage-detail-panel="hertzbeat-ui-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Log workbench', 'Severity', 'Log volume time series', 'Recent logs', 'Run query']),
      actionLabels: ['Run query', 'Save view', 'Create alert', 'Add to dashboard'],
      minimumVerificationCommand:
        'npm exec vitest run app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('three-signal-desk', 'log-manage-desk').actionLabels).not.toContain('Clear');
    expect(getParityRoutePair('three-signal-desk', 'log-manage-desk').primarySelectors.join(' ')).not.toContain('signoz-');
  });

  it('tracks the Angular en-US overview contract through explicit English route copy', () => {
    const routePair = getParityRoutePair('three-signal-desk', 'overview-desk');

    expect(routePair).toMatchObject({
      locale: 'en-US',
      textSnippets: expect.arrayContaining(['Overview', 'Workspace status', 'Next step: connect one usable signal path first'])
    });
    expect(routePair.actionLabels).toEqual(['Refresh', 'View alerts']);
  });

  it('pins overview live screenshots to viewport capture so Angular reference full-page capture cannot stall closeout', () => {
    expect(getParityRoutePair('three-signal-desk', 'overview-desk')).toMatchObject({
      screenshotMode: 'viewport'
    });
  });

  it('keeps log-stream on the redirect-helper owner now that the compatibility route is canonical', () => {
    expect(getParityRoutePair('log-compatibility-family', 'log-stream-compat')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-log-stream-surface="angular-log-stream"]',
        '[data-log-stream-layout="angular-dense-inset"]',
        '[data-log-stream-card="angular-panel"]',
        '[data-log-stream-card-height="angular-viewport"]',
        '[data-log-stream-toolbar="angular-actions"]',
        '[data-log-stream-filters="angular-grid"]',
        'main',
        'input',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Log stream', 'Connected', 'Connecting...', '0 logs', 'Log level number', 'You have completed 83% of platform setup']),
      actionLabels: ['Hide filters', 'Pause', 'Clear', 'Apply filters', 'Clear filters']
    });
  });

  it('keeps the log-integration compatibility entrypoints on the HertzBeat Intake Cortex contract', () => {
    const rootRoute = getParityRoutePair('log-compatibility-family', 'log-integration-root-compat');
    const sourceRoute = getParityRoutePair('log-compatibility-family', 'log-integration-compat');

    expect(rootRoute.primarySelectors).toEqual(
      expect.arrayContaining([
        '[data-otlp-center-route="hertzbeat-intake-cortex"]',
        '[data-otlp-center-visual-system="hertzbeat-native-avant-garde"]',
        '[data-otlp-center-tone="hertzbeat-ui-ops-catalog"]',
        '[data-otlp-center-catalog-canvas="hertzbeat-circuit-mesh"]',
        '[data-otlp-center-signal-band-layout="single-layer"]',
        '[data-otlp-center-stepper="hertzbeat-intake-steps"]',
        '[data-otlp-center-stepper-phase="source-selection"]',
        '[data-otlp-center-search-row="hertzbeat-catalog-filter"]',
        '[data-otlp-center-search-owner="shared-search-row"]',
        '[data-otlp-center-source-grid="hertzbeat-source-catalog"]',
        '[data-otlp-center-grid-density="hertzbeat-dense-catalog"]',
        '[data-otlp-center-filter-rail="hertzbeat-prism-filters"]',
        'main',
        'button'
      ])
    );
    expect(sourceRoute.primarySelectors).toEqual(
      expect.arrayContaining([
        '[data-otlp-center-route="hertzbeat-intake-cortex"]',
        '[data-otlp-center-visual-system="hertzbeat-native-avant-garde"]',
        '[data-otlp-center-tone="hertzbeat-ui-ops-catalog"]',
        '[data-otlp-center-catalog-canvas="hertzbeat-circuit-mesh"]',
        '[data-otlp-center-signal-band-layout="single-layer"]',
        '[data-otlp-center-stepper="hertzbeat-intake-steps"]',
        '[data-otlp-center-stepper-phase="source-selection"]',
        '[data-otlp-center-search-row="hertzbeat-catalog-filter"]',
        '[data-otlp-center-search-owner="shared-search-row"]',
        '[data-otlp-center-source-grid="hertzbeat-source-catalog"]',
        '[data-otlp-center-grid-density="hertzbeat-dense-catalog"]',
        '[data-otlp-center-filter-rail="hertzbeat-prism-filters"]',
        'main',
        'button'
      ])
    );
    expect(rootRoute.textSnippets).toEqual(expect.arrayContaining(['You have completed 83% of platform setup']));
    expect(sourceRoute.textSnippets).toEqual(expect.arrayContaining(['You have completed 83% of platform setup']));
  });

  it('tracks the HertzBeat OTLP log-integration redirect actions instead of a generic refresh fallback', () => {
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-root-compat').actionLabels).toEqual([
      'Manage tokens',
      'View entities',
      'Open telemetry discovery'
    ]);
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-compat').actionLabels).toEqual([
      'Manage tokens',
      'View entities',
      'Open telemetry discovery'
    ]);
  });

  it('tracks the Angular monitor editor contracts with a real form and the OK submit label', () => {
    expect(getParityRoutePair('monitor-family', 'monitor-new')).toMatchObject({
      primarySelectors: expect.arrayContaining(['form', 'button']),
      actionLabels: ['OK']
    });
    expect(getParityRoutePair('monitor-family', 'monitor-edit')).toMatchObject({
      primarySelectors: expect.arrayContaining(['form', 'button']),
      actionLabels: ['OK']
    });
  });

  it('pins the user-reported monitor detail query route to live structure guards', () => {
    const routePair = getParityRoutePair('monitor-family', 'monitor-detail-reported');

    expect(routePair).toMatchObject({
      nextRoute:
        '/monitors/632051474676992?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors',
      referenceRoute:
        '/monitors/632051474676992?app=website&pageIndex=0&pageSize=8&returnTo=%2Fmonitors',
      locale: 'en-US',
      routeTestPath: 'web-next/app/monitors/[monitorId]/page.test.tsx',
      seedState: 'monitor-fixture',
      nextReadySelectors: ['[data-monitor-detail-signal-list="true"]'],
      referenceReadySelectors: ['.cards.lists'],
      routeParitySpec: {
        key: 'monitor-detail-reported',
        archetype: 'list-detail',
        fixtureState:
          'authenticated website monitor detail workbench with reported seeded monitor, realtime tab, compact metric surface, and signal rows'
      },
      primarySelectors: expect.arrayContaining([
        '.monitor-detail-page-frame',
        '.monitor-detail-workbench-breadcrumb',
        '.monitor-detail-workbench-layout',
        '.monitor-detail-workbench-tabs',
        '[data-monitor-detail-header-mode="breadcrumb-only"]',
        '[data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"]',
        '[data-monitor-detail-app-chip="breadcrumb"]',
        '[data-monitor-workbench-stage="angular-layout"]',
        '[data-monitor-workbench-stage-chrome="angular-tabset-direct"]',
        '[data-monitor-workbench-stage-rhythm="direct-tab-body"]',
        '[data-monitor-tab-body-surface="angular-tab-content-direct"]',
        '[data-monitor-detail-tabset-type="angular-card"]',
        '[data-observability-tabstrip-variant="card"]',
        '[data-observability-tabstrip-card="angular-nz-card"]',
        '[data-observability-tab-card="true"]',
        '[data-monitor-detail-tab-label-source="angular-title"]',
        '[data-monitor-detail-tab-label="realtime"]',
        '[data-monitor-detail-tab-label="history"]',
        '[data-monitor-detail-tab-label="favorites"]',
        '[data-monitor-detail-tab-icon="realtime"]',
        '[data-monitor-detail-tab-icon="history"]',
        '[data-monitor-detail-tab-icon="favorites"]',
        '.monitor-detail-stage',
        '.monitor-detail-stage--signals',
        '.monitor-detail-card--overview',
        '.monitor-detail-card--overview-flat',
        '.monitor-workbench-surface',
        '.monitor-workbench-surface--plain',
        '.monitor-workbench-surface__header',
        '.monitor-workbench-card-title__title',
        '.monitor-basic-info',
        '.monitor-info-header',
        '.monitor-name',
        '.monitor-basic-facts',
        '.monitor-basic-meta',
        '.monitor-basic-meta__row',
        '[data-monitor-basic-density="angular-cardless"]',
        '[data-monitor-console-layout="angular-workbench"]',
        '[data-monitor-detail-completion-guard="reported-angular-no-card-stack"]',
        '[data-monitor-detail-body-stack-state="single-workbench-table-rows"]',
        '[data-monitor-detail-completion-header="breadcrumb-only"]',
        '[data-monitor-first-viewport-rhythm="angular-tight"]',
        '[data-monitor-console-tab-panel-rhythm="angular-tight"]',
        '[data-monitor-refresh-toolbar-variant="angular-tab-extra"]',
        '[data-monitor-refresh-toolbar-position="tabbar-extra"]',
        '[data-monitor-refresh-toolbar-density="angular-bordered-controls"]',
        '[data-monitor-refresh-badge-variant="bordered"]',
        '[data-monitor-refresh-select-density="bordered"]',
        '[data-monitor-refresh-action-density="bordered"]',
        '[data-monitor-detail-stage-header="hidden"]',
        '[data-monitor-detail-flat-stage="true"]',
        '[data-monitor-detail-tab-sequence="angular-tight"]',
        '[data-monitor-detail-stage-rhythm="angular-tight"]',
        '[data-monitor-detail-realtime-card-flow="angular-cards-list"]',
        '[data-monitor-detail-realtime-card-grid="basic-and-metrics"]',
        '[data-monitor-detail-realtime-reference="apache-hertzbeat-master-cards-lists"]',
        '[data-monitor-detail-realtime-card-height="angular-400px"]',
        '[data-monitor-detail-realtime-card-chrome="angular-card-box"]',
        '[data-monitor-basic-stage-surface="monitor-data-table"]',
        '[data-monitor-basic-grid-item="angular-first-card"]',
        '[data-monitor-basic-card-chrome="angular-card-box"]',
        '[data-monitor-basic-edit-action="monitor-data-table"]',
        '[data-monitor-basic-edit-action-density="plain-icon"]',
        '[data-monitor-detail-signal-list="true"]',
        '[data-monitor-detail-signal-list-rhythm="angular-tight"]',
        '[data-monitor-detail-signal-list-geometry="angular-two-column-metric-cards"]',
        '.monitor-detail-card-grid',
        '.monitor-detail-card-grid--realtime',
        '[data-monitor-detail-card-grid-rhythm="angular-tight"]',
        '.monitor-detail-signal-card-grid',
        '.monitor-detail-card',
        '.monitor-detail-card--signal-flat',
        '.monitor-detail-card--signal-metric',
        '[data-monitor-detail-signal-grid="monitor-data-table"]',
        '[data-monitor-detail-signal-card="true"]',
        '[data-monitor-detail-signal-row-density="angular-metric-card"]',
        '[data-monitor-detail-signal-card-chrome="angular-card-box"]',
        '[data-monitor-detail-signal-card-table="true"]',
        '[data-monitor-detail-signal-card-body-density="angular-card-table"]',
        '[data-monitor-detail-signal-selected-style="angular-neutral"]',
        '[data-monitor-detail-signal-row-title="true"]',
        '[data-monitor-detail-signal-card-table-row="metric-fields"]',
        '[data-monitor-detail-history-layout="angular-chart-cards-only"]',
        '[data-monitor-detail-history-reference="apache-hertzbeat-master-cards"]',
        '[data-monitor-history-chart-grid="angular-chart-cards"]',
        '[data-monitor-history-chart-visual="shared-timeseries"]',
        '[data-monitor-history-axis-policy="sparse-readable"]',
        '[data-monitor-history-navigator="echarts-native-slider"]',
        '[data-monitor-history-datazoom-state="preserved"]',
        '[data-monitor-history-card-chrome="angular-card-box"]',
        '[data-monitor-history-card-height="angular-460px"]',
        '[data-monitor-detail-favorite-layout="angular-favorite-content"]',
        '[data-monitor-detail-favorite-selector="angular-select-200"]',
        '[data-monitor-detail-favorite-realtime="cards-lists"]',
      ])
    });
    expect(routePair.primarySelectors).not.toContain('[data-monitor-workbench-stage-chrome="single-sheet"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-tab-body-surface="unified-stage"]');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-stage--overview');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-signal-card-stack');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-card--signal-card-row');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-signal-selected-style="left-rail"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-workbench-summary-facts="angular-workbench"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-signal-summary-strip="monitor-data-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-basic-source-badge-density="plain-meta"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-signal-source-badge="true"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-signal-row-action="favorite"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-signal-card-table-row="source"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-surface-compact-layout="cardless-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-realtime-wrapper="monitor-data-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-realtime-action-band="monitor-data-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-realtime-action-group="metrics-card-extra"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-realtime-collect-time="true"]');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-workbench-header');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-workbench-header__main');
    expect(routePair.primarySelectors).not.toContain('.monitor-detail-workbench-header__chips');
    expect(routePair.primarySelectors).not.toContain('.app-page-shell-kicker');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-completion-header="angular-reference-proportion"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-layout="angular-context-rail"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-proportion="angular-reference"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-context-rail="true"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-context-rail-density="angular-stacked"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-rail-align="title-block"]');
    expect(routePair.primarySelectors).not.toContain('[data-monitor-header-kicker="angular-workbench"]');
    expect(routePair.primarySelectors).not.toContain('[data-observability-context-chip-variant="header"]');
    expect(routePair.textSnippets).toEqual(expect.arrayContaining(['Monitor list', 'Monitor realtime data detail', 'Monitor historical chart detail']));
    expect(routePair.textSnippets).not.toContain('Monitors');
    expect(routePair.textSnippets).not.toContain('Monitor Real-Time Detail');
    expect(routePair.textSnippets).not.toContain('Monitor Historical Chart Detail');
    expect(routePair.actionLabels).toEqual(['Refresh']);
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-return-action="true"]');
    expect(routePair.textSnippets).not.toContain('Metric catalog');
    expect(routePair.textSnippets).not.toContain('Metric catalog');
    expect(routePair.minimumVerificationCommand).toContain("app/monitors/[monitorId]/page.test.tsx");
    expect(routePair.minimumVerificationCommand).toContain('components/monitor-detail/monitor-detail-sections.test.tsx');
    expect(routePair.minimumVerificationCommand).toContain('lib/parity/route-manifest.test.ts');
    expect(routePair.minimumVerificationCommand).toContain('scripts/parity/harness-lib.test.ts');
    expect(routePair.minimumVerificationCommand).toContain(
      'PARITY_FAMILY=monitor-family PARITY_ROUTE=monitor-detail-reported node ./scripts/parity/harness.mjs'
    );
    expect(routePair.minimumVerificationCommand).not.toContain('--print-targets');
  });

  it('pins entity-list to the OTLP cold-matte full-width admin/list contract', () => {
    const routePair = getParityRoutePair('entity-family', 'entity-list');

    expect(routePair).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-list-surface="otlp-cold-entity-console"]',
        '[data-entity-list-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-list-header="hertzbeat-ui-compact-header"]',
        '[data-entity-list-command-row="standard-equal-buttons"]',
        '[data-entity-list-admin-layout="full-width-admin-list"]',
        '[data-entity-list-count-strip="hertzbeat-ui-inline-counts"]',
        '[data-entity-list-toolbar="hertzbeat-ui-table-toolbar"]',
        '[data-entity-list-table-shell="hertzbeat-ui-dense-table"]',
        '[data-entity-list-table="cold-entity-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Entity catalog', 'Entity-first investigation', 'Locate issues around services, resources, and entities, then start investigation', 'Total entities', 'Entities', 'Alerts']),
      actionLabels: ['Search', 'Refresh', 'Create entity'],
      minimumVerificationCommand:
        'npm exec vitest run app/entities/page.test.tsx components/pages/entity-list-surface.test.tsx lib/entity-manage/controller.test.ts lib/entity-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-route="signoz-services-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-workspace-offset="angular-sidebar-flush"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-workspace-stretch="angular-right-edge"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-rail="signoz-services-rail"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-action-panel="signoz-actions"]');
    expect(routePair.textSnippets).not.toContain('Entity');
    expect(routePair.textSnippets).not.toContain('Common entrypoints');
    expect(routePair.actionLabels).not.toContain('Add');
  });

  it('points entity editor routes at targeted route and shared-surface contracts instead of raw source files', () => {
    expect(getParityRoutePair('entity-family', 'entity-editor-new')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-editor-shell="otlp-cold-entity-composer"]',
        '[data-entity-editor-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-editor-layout="full-width-workbench"]',
        '[data-entity-editor-header="hertzbeat-ui-compact-header"]',
        '[data-entity-editor-header-rhythm="cold-compact"]',
        '[data-entity-editor-frame="cold-editor-frame"]',
        '[data-entity-editor-frame-spacing="cold-tight"]',
        '[data-entity-editor-route-tabs="hertzbeat-ui-segmented-tabs"]',
        '[data-entity-editor-summary-card="cold-editor-panel"]',
        '[data-entity-editor-type-strip="cold-catalog-grid"]',
        '[data-entity-editor-type-strip-layout="cold-compact-grid"]',
        '[data-entity-editor-type-card-density="cold-compact-card"]',
        '[data-entity-editor-entry-strip="hertzbeat-ui-segmented-pills"]',
        '[data-entity-editor-stage-strip="cold-stage-grid"]',
        '[data-entity-editor-preview-rail-density="cold-inline-preview"]',
        '[data-entity-editor-body-placement="cold-deferred-body"]',
        '[data-entity-editor-definition-tabs="cold-bottom-tabs"]',
        '[data-entity-type-icon="service"]',
        '[data-entity-type-icon="database"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]'
      ]),
      textSnippets: expect.arrayContaining(['New entity', 'All entities', 'Entity metadata', 'Page entry', 'Basic information', 'You have completed 83% of platform setup']),
      actionLabels: ['Create entity']
    });
    expect(getParityRoutePair('entity-family', 'entity-editor-new').minimumVerificationCommand).toBe(
      "npm exec vitest run app/entities/new/page.test.tsx components/pages/entity-editor-surface.test.tsx lib/entity-editor/controller.test.ts lib/entity-editor/view-model.test.ts"
    );
    expect(getParityRoutePair('entity-family', 'entity-editor-new').primarySelectors).not.toContain('[data-entity-editor-shell="angular-composer"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-new').primarySelectors).not.toContain('[data-entity-editor-frame="angular-flush"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-edit')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      nextApiStubKey: 'entity-fixture',
      referenceApiStubKey: 'entity-fixture',
      primarySelectors: expect.arrayContaining([
        '[data-entity-editor-shell="otlp-cold-entity-composer"]',
        '[data-entity-editor-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-editor-layout="full-width-workbench"]',
        '[data-entity-editor-header="hertzbeat-ui-compact-header"]',
        '[data-entity-editor-header-rhythm="cold-compact"]',
        '[data-entity-editor-frame="cold-editor-frame"]',
        '[data-entity-editor-frame-spacing="cold-tight"]',
        '[data-entity-editor-route-tabs="hertzbeat-ui-segmented-tabs"]',
        '[data-entity-editor-summary-card="cold-editor-panel"]',
        '[data-entity-editor-type-strip="cold-catalog-grid"]',
        '[data-entity-editor-type-strip-layout="cold-compact-grid"]',
        '[data-entity-editor-type-card-density="cold-compact-card"]',
        '[data-entity-editor-entry-strip="hertzbeat-ui-segmented-pills"]',
        '[data-entity-editor-stage-strip="cold-stage-grid"]',
        '[data-entity-editor-edit-stage-posture="cold-complete-context"]',
        '[data-entity-editor-stage-status="relations-ready"]',
        '[data-entity-editor-preview-rail-density="cold-inline-preview"]',
        '[data-entity-editor-body-placement="cold-deferred-body"]',
        '[data-entity-editor-definition-tabs="cold-bottom-tabs"]',
        '[data-entity-type-icon="service"]',
        '[data-entity-type-icon="database"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]'
      ]),
      textSnippets: expect.arrayContaining(['Edit entity', 'All entities', 'Entity metadata', 'Basic information', 'You have completed 0% of platform setup']),
      actionLabels: ['Save']
    });
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').minimumVerificationCommand).toBe(
      "npm exec vitest run 'app/entities/[entityId]/edit/page.test.tsx' components/pages/entity-editor-surface.test.tsx lib/entity-editor/controller.test.ts lib/entity-editor/view-model.test.ts"
    );
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').primarySelectors).not.toContain('[data-entity-editor-shell="angular-composer"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').primarySelectors).not.toContain('[data-entity-editor-frame="angular-flush"]');
  });

  it('tracks the shared entity-import workspace shell with targeted route and controller contracts', () => {
    expect(getParityRoutePair('entity-family', 'entity-import')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-definition-workspace="import"]',
        '[data-entity-definition-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-definition-layout="full-width-workbench"]',
        '[data-entity-definition-editor-shell="otlp-cold-import-workbench"]',
        '[data-entity-definition-shell-spacing="cold-tight"]',
        '[data-entity-definition-shell-height="cold-content"]',
        '[data-entity-definition-import-action-row="cold-inline-actions"]',
        '[data-entity-definition-editor-column="true"]',
        '[data-entity-definition-format-select="cold-compact-select"]',
        '[data-entity-definition-starter-draft="cold-yaml"]',
        '[data-entity-definition-editor-width="cold-fluid"]',
        '[data-entity-definition-context-panel="cold-context-panel"]',
        '[data-entity-definition-metric-strip="hertzbeat-ui-inline-counts"]',
        '[data-entity-definition-template-panel="true"]',
        '[data-entity-definition-batch-panel="true"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'textarea',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Entity-first investigation', 'Import entity definitions', 'Ready to import', 'Templates and bulk editing', 'You have completed 83% of platform setup']),
      actionLabels: ['Clear draft', 'Preview definition', 'Import entities'],
      minimumVerificationCommand:
        'npm exec vitest run app/entities/import/page.test.tsx components/pages/entity-import-surface.test.tsx components/pages/entity-definition-workspace-surface.test.tsx lib/entity-import/controller.test.ts lib/entity-import/view-model.test.ts'
    });
    const selectors = getParityRoutePair('entity-family', 'entity-import').primarySelectors;
    expect(selectors).not.toContain('[data-entity-definition-editor-shell="angular-three-column"]');
    expect(selectors).not.toContain('[data-entity-definition-left-rail="true"]');
    expect(selectors).not.toContain('[data-entity-definition-format-select="angular-compact"]');
    expect(selectors).not.toContain('[data-entity-definition-import-action-bar="angular-shell-top-right"]');
  });

  it('tracks the shared entity-definition workspace shell with targeted route and controller contracts', () => {
    expect(getParityRoutePair('entity-family', 'entity-definition')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-definition-workspace="definition"]',
        '[data-entity-definition-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-definition-layout="full-width-workbench"]',
        '[data-entity-definition-editor-shell="otlp-cold-definition-workbench"]',
        '[data-entity-definition-shell-spacing="cold-tight"]',
        '[data-entity-definition-shell-height="cold-content"]',
        '[data-entity-definition-action-row="cold-inline-actions"]',
        '[data-entity-definition-editor-column="true"]',
        '[data-entity-definition-format-select="cold-compact-select"]',
        '[data-entity-definition-editor-width="cold-fluid"]',
        '[data-entity-definition-context-panel="cold-context-panel"]',
        '[data-entity-definition-metric-strip="hertzbeat-ui-inline-counts"]',
        '[data-entity-definition-template-panel="true"]',
        '[data-entity-definition-batch-panel="true"]',
        '[data-entity-definition-load-error="cold-inline"]',
        '[data-entity-definition-error-placement="cold-context-panel"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'textarea',
        'button',
        'aside'
      ]),
      textSnippets: expect.arrayContaining([
        'Entity definition',
        'Edit entity definition',
        'Import format',
        'Templates and bulk editing',
        'Paste YAML entity definition',
        'Entity does not exist.',
        'You have completed 83% of platform setup'
      ]),
      actionLabels: ['Clear draft', 'Preview definition', 'Save definition'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/entities/[entityId]/definition/page.test.tsx' components/pages/entity-definition-workspace-surface.test.tsx lib/entity-definition/controller.test.ts lib/parity/route-manifest.test.ts"
    });
    const selectors = getParityRoutePair('entity-family', 'entity-definition').primarySelectors;
    expect(selectors).not.toContain('[data-entity-definition-workspace-offset="angular-sidebar-flush"]');
    expect(selectors).not.toContain('[data-entity-definition-workspace-stretch="angular-right-edge"]');
    expect(selectors).not.toContain('[data-entity-definition-editor-shell="angular-three-column"]');
    expect(selectors).not.toContain('[data-entity-definition-grid="angular-right-rail"]');
    expect(selectors).not.toContain('[data-entity-definition-left-rail="true"]');
    expect(selectors).not.toContain('[data-entity-definition-format-select="angular-compact"]');
  });

  it('tracks the shared entity-discovery telemetry console with targeted route and controller contracts', () => {
    expect(getParityRoutePair('entity-family', 'entity-discovery')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-discovery-surface="otlp-cold-discovery-console"]',
        '[data-entity-discovery-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-discovery-layout="full-width-workbench"]',
        '[data-entity-discovery-header="hertzbeat-ui-compact-header"]',
        '[data-entity-discovery-command-row="standard-equal-buttons"]',
        '[data-entity-discovery-count-strip="hertzbeat-ui-inline-counts"]',
        '[data-entity-discovery-toolbar="cold-search-row"]',
        '[data-entity-discovery-policy-panel="cold-policy-strip"]',
        '[data-entity-discovery-source-chips="cold-inline-chips"]',
        '[data-entity-discovery-empty-state="cold-inline-empty"]',
        '[data-entity-discovery-table-shell="hertzbeat-ui-dense-table"]',
        '[data-entity-discovery-table="cold-discovery-table"]',
        '[data-entity-discovery-row-actions="cold-inline-actions"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Telemetry discovery', 'Search a set of monitor signals that need governance first', 'Governance filters and sharing policy', 'Signals', 'Status', 'You have completed 83% of platform setup']),
      actionLabels: ['Search', 'Clear all', 'Create from definition', 'Create entity'],
      minimumVerificationCommand:
        'npm exec vitest run app/entities/discovery/page.test.tsx components/pages/entity-discovery-surface.test.tsx lib/entity-discovery/controller.test.ts lib/entity-discovery/search-state.test.ts lib/entity-discovery/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    const selectors = getParityRoutePair('entity-family', 'entity-discovery').primarySelectors;
    expect(selectors).not.toContain('[data-entity-discovery-route="signoz-discovery-table"]');
    expect(selectors).not.toContain('[data-entity-discovery-rail="signoz-status-rail"]');
    expect(selectors).not.toContain('[data-entity-discovery-right-panel="angular-density"]');
    expect(selectors).not.toContain('[data-entity-discovery-table="signoz-discovery-table"]');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('Entity Discovery');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('Common entrypoints');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('Reason');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('Next actions');
  });

  it('tracks entity-detail through the cold full-width Workbench contract', () => {
    expect(getParityRoutePair('entity-family', 'entity-detail')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-detail-surface="otlp-cold-entity-detail"]',
        '[data-entity-detail-style-baseline="hertzbeat-ui-matte"]',
        '[data-entity-detail-layout="full-width-workbench"]',
        '[data-entity-detail-header="hertzbeat-ui-compact-header"]',
        '[data-entity-detail-command-row="standard-equal-buttons"]',
        '[data-entity-detail-count-strip="hertzbeat-ui-inline-counts"]',
        '[data-entity-detail-signal-grid="cold-detail-grid"]',
        '[data-entity-detail-overview-panel="cold-overview-panel"]',
        '[data-entity-detail-related-panel="cold-related-panel"]',
        '[data-entity-detail-next-panel="cold-next-panel"]',
        '[data-entity-detail-drilldown-panel="cold-drilldown-panel"]',
        '[data-entity-detail-error="cold-inline-error"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'a',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        'Entity detail',
        'Entity-first investigation',
        'Context',
        'Related signals',
        'Next step',
        'Advanced entries'
      ]),
      actionLabels: ['All entities', 'Refresh', 'Edit definition', 'Delete', 'Edit'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/entities/[entityId]/page.test.tsx' components/pages/entity-detail-surface.test.tsx app/entity-detail-family.chrome.test.ts lib/entity-detail/view-model.test.ts lib/parity/route-manifest.test.ts"
    });
    expect(getParityRoutePair('entity-family', 'entity-detail').primarySelectors).not.toContain('aside');
  });

  it('tracks the alert center through targeted route, shared-surface, and filter contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-center')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-center-surface="otlp-cold-center-console"]',
        '[data-alert-center-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-center-header="hertzbeat-ui-compact-header"]',
        '[data-alert-center-command-row="standard-equal-buttons"]',
        '[data-alert-center-admin-layout="full-width-admin-list"]',
        '[data-alert-center-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-center-list-shell="cold-alert-list"]',
        '[data-alert-center-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-center-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'input',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Alert center', 'Review and handle current alerts in one place', 'Search alerts']),
      actionLabels: ['Refresh'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/page.test.tsx components/pages/alert-center-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-manage/query-state.test.ts lib/alert-manage/controller.test.ts lib/alert-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-group-card-stack="true"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-workbench-panel="angular-single-panel"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-toolbar="angular-density"]');
    expect(getParityRoutePair('alert-family', 'alert-center').textSnippets).not.toContain('Alert');
  });

  it('tracks alert group through a targeted route test plus shared group surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-group')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-group-surface="otlp-cold-group-console"]',
        '[data-alert-group-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-group-header="hertzbeat-ui-compact-header"]',
        '[data-alert-group-command-row="standard-equal-buttons"]',
        '[data-alert-group-admin-layout="full-width-admin-list"]',
        '[data-alert-group-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-group-table-shell="hertzbeat-ui-dense-table"]',
        '[data-alert-group-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-group-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Group convergence', 'Manage Alertmanager group convergence rules', 'Policy name', 'Group labels']),
      actionLabels: ['Refresh', 'New group', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/group/page.test.tsx components/pages/alert-group-surface.test.tsx components/pages/alert-group-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-group/controller.test.ts lib/alert-group/query-state.test.ts lib/alert-group/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-card-stack="true"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-workbench-panel="angular-table-panel"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-toolbar="angular-table-toolbar"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-table-shell="angular-table"]');
    expect(getParityRoutePair('alert-family', 'alert-group').textSnippets).not.toContain('Group');
    expect(getParityRoutePair('alert-family', 'alert-group').actionLabels).not.toContain('New');
  });

  it('keeps alert-family toolbar selectors on the shared cold query-row owner', () => {
    const expectedQueryToolbarSelectors: Array<[string, string]> = [
      ['alert-center', '[data-alert-center-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-group', '[data-alert-group-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-silence', '[data-alert-silence-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-inhibit', '[data-alert-inhibit-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-notice', '[data-alert-notice-receiver-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-notice-rule', '[data-alert-notice-rule-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-notice-template', '[data-alert-notice-template-toolbar="hertzbeat-ui-query-toolbar"]'],
      ['alert-setting', '[data-alert-setting-toolbar="hertzbeat-ui-query-toolbar"]']
    ];

    for (const [routeKey, selector] of expectedQueryToolbarSelectors) {
      const selectors = getParityRoutePair('alert-family', routeKey).primarySelectors;

      expect(selectors).toContain(selector);
      expect(selectors.join(' ')).not.toContain('hertzbeat-ui-table-toolbar');
      expect(selectors.join(' ')).not.toContain('cold-filter-toolbar');
    }

    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors).toContain(
      '[data-alert-center-toolbar="hertzbeat-ui-query-toolbar"]'
    );
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors.join(' ')).not.toContain(
      'cold-filter-toolbar'
    );
  });

  it('tracks alert notice through the OTLP cold tab console plus the receiver/rule/template authoring owner contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-notice-admin-layout="full-width-admin-list"]',
        '[data-alert-notice-inline-metrics="hertzbeat-ui-inline-counts"]',
        '[data-alert-notice-console="true"]',
        '[data-alert-notice-workbench-panel="cold-tabbed-table-panel"]',
        '[data-alert-notice-tabs="hertzbeat-ui-segmented-tabs"]',
        '[data-alert-notice-receiver-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-notice-receiver-table-shell="hertzbeat-ui-dense-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        '[data-tab="receiver"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Notifications', 'Notification media', 'Notification policy', 'Notification template', 'Receivers', 'Notification method', 'Configure']),
      actionLabels: ['Refresh', 'New receiver', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-receiver-fields.test.tsx components/pages/alert-notice-rule-fields.test.tsx components/pages/alert-notice-template-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-notice').textSnippets).not.toContain('Notice');
    expect(getParityRoutePair('alert-family', 'alert-notice').actionLabels).not.toContain('New');
    expect(getParityRoutePair('alert-family', 'alert-notice').primarySelectors.join(' ')).not.toContain('summary-rail');
  });

  it('tracks alert notice rule tab through clicked-tab OTLP cold table parity', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice-rule')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      nextRoute: '/alert/notice',
      referenceRoute: '/alert/notice',
      nextPostLoadActions: [{ kind: 'click', selector: 'text=Notification policy', waitAfterMs: 250 }],
      referencePostLoadActions: [{ kind: 'click', selector: 'text=Notification policy', waitAfterMs: 250 }],
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-notice-console="true"]',
        '[data-panel-tab="rule"]',
        '[data-alert-notice-rule-panel="true"]',
        '[data-alert-notice-rule-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-notice-rule-table-shell="hertzbeat-ui-dense-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Notifications', 'Notification policy', 'Policy name', 'Receivers', 'Template name', 'Forward all', 'Enabled status']),
      actionLabels: ['Refresh', 'New notification policy', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-rule-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks alert notice template tab through clicked-tab OTLP cold table parity', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice-template')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      nextRoute: '/alert/notice',
      referenceRoute: '/alert/notice',
      nextPostLoadActions: [{ kind: 'click', selector: 'text=Notification template', waitAfterMs: 250 }],
      referencePostLoadActions: [{ kind: 'click', selector: 'text=Notification template', waitAfterMs: 250 }],
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-notice-console="true"]',
        '[data-panel-tab="template"]',
        '[data-alert-notice-template-panel="true"]',
        '[data-alert-notice-template-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-notice-template-preset-filter="cold-select"]',
        '[data-alert-notice-template-table-shell="hertzbeat-ui-dense-table"]',
        '[data-alert-notice-pagination="hertzbeat-ui-dense-pagination"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'select'
      ]),
      textSnippets: expect.arrayContaining([
        'Notifications',
        'Notification template',
        'Built-in system template',
        'Template name',
        'Notification method',
        'Template type',
        'Updated time',
        'Actions'
      ]),
      actionLabels: ['Refresh', 'New notification template', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-template-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks alert setting through a targeted route test plus the shared define-console surface contract', () => {
    expect(getParityRoutePair('alert-family', 'alert-setting')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-setting-surface="otlp-cold-setting-console"]',
        '[data-alert-setting-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-setting-header="hertzbeat-ui-compact-header"]',
        '[data-alert-setting-command-row="standard-equal-buttons"]',
        '[data-alert-setting-admin-layout="full-width-admin-list"]',
        '[data-alert-setting-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-setting-table-shell="hertzbeat-ui-dense-table"]',
        '[data-alert-setting-select-all="hertzbeat-ui-checkbox"]',
        '[data-alert-setting-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-setting-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Threshold rules', 'Threshold name', 'Threshold type', 'Threshold expression', 'Alert content']),
      actionLabels: ['Refresh', 'New threshold', 'Bulk delete', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/setting/page.test.tsx components/pages/alert-setting-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-setting/controller.test.ts lib/alert-setting/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-setting').textSnippets).not.toContain('Alert settings');
    expect(getParityRoutePair('alert-family', 'alert-setting').textSnippets).not.toContain('Current thresholds');
    expect(getParityRoutePair('alert-family', 'alert-setting').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks alert integration through the OTLP cold-matte source-rail document shell', () => {
    expect(getParityRoutePair('alert-family', 'alert-integration')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      nextRoute: '/alert/integration/webhook',
      referenceRoute: '/alert/integration/webhook',
      primarySelectors: expect.arrayContaining([
        '[data-alert-integration-surface="otlp-cold-source-doc"]',
        '[data-alert-integration-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-integration-header-actions="cold-source-doc-actions"]',
        '[data-alert-integration-container="cold-source-doc-shell"]',
        '[data-alert-integration-source-rail="cold-source-list"]',
        '[data-alert-integration-source-item="webhook"]',
        '[data-alert-integration-source-icon="webhook"]',
        '[data-alert-integration-doc-panel="cold-markdown-doc"]',
        '[data-alert-integration-markdown="rendered"]',
        '[data-alert-integration-code-block="json"]',
        '[data-alert-integration-mermaid]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Integration onboarding', 'Default webhook', 'Integrated alert source', 'Manage tokens', 'Endpoint', 'Request headers']),
      actionLabels: ['Manage tokens'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/alert/integration/[source]/page.test.tsx' lib/alert-integration/view-model.test.ts components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/parity/route-manifest.test.ts"
    });
    expect(getParityRoutePair('alert-family', 'alert-integration').textSnippets).not.toContain('Integration');
    expect(getParityRoutePair('alert-family', 'alert-integration').textSnippets).not.toContain('Manage API token');
    expect(getParityRoutePair('alert-family', 'alert-integration').actionLabels).not.toContain('Apply');
  });

  it('tracks alert silence through a targeted route test plus shared silence surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-silence')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-silence-surface="otlp-cold-silence-console"]',
        '[data-alert-silence-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-silence-header="hertzbeat-ui-compact-header"]',
        '[data-alert-silence-command-row="standard-equal-buttons"]',
        '[data-alert-silence-admin-layout="full-width-admin-list"]',
        '[data-alert-silence-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-silence-table-shell="hertzbeat-ui-dense-table"]',
        '[data-alert-silence-select-all="hertzbeat-ui-checkbox"]',
        '[data-alert-silence-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-silence-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Alert silence', 'Policy name', 'Silence type', 'Silenced alerts']),
      actionLabels: ['Refresh', 'New silence', 'Bulk delete', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/silence/page.test.tsx components/pages/alert-silence-surface.test.tsx components/pages/alert-silence-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-silence/controller.test.ts lib/alert-silence/query-state.test.ts lib/alert-silence/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-silence').textSnippets).not.toContain('Silence');
    expect(getParityRoutePair('alert-family', 'alert-silence').textSnippets).not.toContain('Current silences');
    expect(getParityRoutePair('alert-family', 'alert-silence').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks alert inhibit through a targeted route test plus shared inhibit surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-inhibit')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-inhibit-surface="otlp-cold-inhibit-console"]',
        '[data-alert-inhibit-style-baseline="hertzbeat-ui-matte"]',
        '[data-alert-inhibit-header="hertzbeat-ui-compact-header"]',
        '[data-alert-inhibit-command-row="standard-equal-buttons"]',
        '[data-alert-inhibit-admin-layout="full-width-admin-list"]',
        '[data-alert-inhibit-toolbar="hertzbeat-ui-query-toolbar"]',
        '[data-alert-inhibit-table-shell="hertzbeat-ui-dense-table"]',
        '[data-alert-inhibit-select-all="hertzbeat-ui-checkbox"]',
        '[data-alert-inhibit-empty-state="hertzbeat-ui-table-empty"]',
        '[data-alert-inhibit-empty-icon="hertzbeat-ui-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Alert inhibit', 'Inhibit rule name', 'Source labels', 'Target labels', 'Equal labels']),
      actionLabels: ['Refresh', 'New inhibit rule', 'Bulk delete', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/inhibit/page.test.tsx components/pages/alert-inhibit-surface.test.tsx components/pages/alert-inhibit-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-inhibit/controller.test.ts lib/alert-inhibit/query-state.test.ts lib/alert-inhibit/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-inhibit').textSnippets).not.toContain('Inhibit');
    expect(getParityRoutePair('alert-family', 'alert-inhibit').textSnippets).not.toContain('Current inhibits');
    expect(getParityRoutePair('alert-family', 'alert-inhibit').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks the setting root through the shared settings console shell contracts instead of a route-matrix smoke fallback', () => {
    expect(getParityRoutePair('setting-family', 'setting-root')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="hertzbeat-ui-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-console-header="hertzbeat-ui-compact-header"]',
        '[data-settings-console-main="hertzbeat-ui-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="hertzbeat-ui-settings-content"]',
        '[data-setting-config-surface="otlp-hertzbeat-ui-system-config"]',
        '[data-setting-config-style-baseline="hertzbeat-ui-matte"]',
        '[data-setting-config-form="hertzbeat-ui-settings-form"]',
        '[data-setting-config-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['Settings', 'System configuration', 'System language', 'System timezone', 'System theme', 'Confirm update']),
      actionLabels: ['Confirm update'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/page.test.ts app/setting/settings/page.test.ts app/setting/settings/config/page.test.tsx components/settings/settings-console-shell.test.tsx lib/setting-config/controller.test.ts lib/setting-config/view-model.test.ts lib/setting-settings-layout/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-root').textSnippets).not.toContain('Setting');
    expect(getParityRoutePair('setting-family', 'setting-root').actionLabels).not.toContain('Save');
    expect(getParityRoutePair('setting-family', 'setting-root').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-root').primarySelectors).not.toContain('[data-setting-config-form="angular-vertical-form"]');
  });

  it('tracks system config through targeted route, controller, and view-model contracts instead of the old smoke fallback', () => {
    expect(getParityRoutePair('setting-family', 'setting-system-config')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="hertzbeat-ui-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-console-header="hertzbeat-ui-compact-header"]',
        '[data-settings-console-main="hertzbeat-ui-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="hertzbeat-ui-settings-content"]',
        '[data-setting-config-surface="otlp-hertzbeat-ui-system-config"]',
        '[data-setting-config-style-baseline="hertzbeat-ui-matte"]',
        '[data-setting-config-form="hertzbeat-ui-settings-form"]',
        '[data-setting-config-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        'Settings',
        'Keep system config, messaging channels, and access credentials together',
        'System configuration',
        'System language',
        'System timezone',
        'System theme',
        'Confirm update'
      ]),
      actionLabels: ['Confirm update'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/settings/config/page.test.tsx components/settings/settings-console-shell.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/setting-config/controller.test.ts lib/setting-config/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-system-config').textSnippets).not.toContain('System');
    expect(getParityRoutePair('setting-family', 'setting-system-config').actionLabels).not.toContain('Save');
    expect(getParityRoutePair('setting-family', 'setting-system-config').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-system-config').primarySelectors).not.toContain('[data-setting-config-form="angular-vertical-form"]');
  });

  it('pins object store to the cold settings console form contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-object-store')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="hertzbeat-ui-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-console-main="hertzbeat-ui-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="hertzbeat-ui-settings-content"]',
        '[data-setting-object-store-page="otlp-hertzbeat-ui-object-store"]',
        '[data-setting-object-store-style-baseline="hertzbeat-ui-matte"]',
        '[data-setting-object-store-form="hertzbeat-ui-settings-form"]',
        '[data-setting-object-store-provider="hertzbeat-ui-provider-select"]',
        '[data-setting-object-store-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        'File service configuration',
        'File service provider',
        'Local database (default)',
        'Local file',
        'Huawei Cloud OBS',
        'Confirm update'
      ]),
      actionLabels: ['Confirm update'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/settings/object-store/page.test.tsx components/settings/settings-console-shell.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/object-store/controller.test.ts lib/object-store/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-object-store').textSnippets).not.toContain('OBS');
    expect(getParityRoutePair('setting-family', 'setting-object-store').actionLabels).not.toContain('Save');
    expect(getParityRoutePair('setting-family', 'setting-object-store').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-object-store').primarySelectors).not.toContain('[data-setting-object-store-page="angular-object-store"]');
    expect(getParityRoutePair('setting-family', 'setting-object-store').primarySelectors).not.toContain('[data-setting-object-store-form="angular-vertical-form"]');
    expect(getParityRoutePair('setting-family', 'setting-object-store').primarySelectors).not.toContain('[data-setting-object-store-provider="angular-provider-select"]');
  });

  it('pins message server to the cold settings console summary-list contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-server')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="hertzbeat-ui-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-console-main="hertzbeat-ui-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="hertzbeat-ui-settings-content"]',
        '[data-settings-server-page="otlp-hertzbeat-ui-message-server"]',
        '[data-settings-server-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-server-summary="hertzbeat-ui-summary-list"]',
        '[data-settings-summary-list="true"]',
        '[data-settings-summary-list-owner="cold-settings-summary-owner"]',
        '[data-settings-summary-list-style="cold-dense-summary-list"]',
        '[data-settings-summary-item="email"]',
        '[data-settings-summary-item="sms"]',
        '[data-settings-summary-action="email"]',
        '[data-settings-summary-action="sms"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        'Message service configuration',
        'Mail server',
        'SMS configuration',
        'Mail server address',
        'SSL enabled',
        'SMS type',
        'Tencent SMS',
        'Enabled status'
      ]),
      actionLabels: ['Configure'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/settings/server/page.test.tsx components/settings/settings-console-shell.test.tsx components/settings/settings-summary-list.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/setting-server/controller.test.ts lib/setting-server/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-server').textSnippets).not.toContain('Server');
    expect(getParityRoutePair('setting-family', 'setting-server').actionLabels).not.toContain('Setting');
    expect(getParityRoutePair('setting-family', 'setting-server').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-server').primarySelectors).not.toContain('[data-settings-server-page="angular-message-server"]');
    expect(getParityRoutePair('setting-family', 'setting-server').primarySelectors).not.toContain('[data-settings-summary-list-style="angular-nz-list"]');
  });

  it('pins token management to the cold settings console and dense table contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-token')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="hertzbeat-ui-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-ui-matte"]',
        '[data-settings-console-main="hertzbeat-ui-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="hertzbeat-ui-settings-content"]',
        '[data-setting-token-surface="otlp-hertzbeat-ui-token-console"]',
        '[data-setting-token-style-baseline="hertzbeat-ui-matte"]',
        '[data-setting-token-layout-contract="full-width-admin-no-rail"]',
        '[data-setting-token-header="hertzbeat-ui-compact-header"]',
        '[data-setting-token-command-row="standard-equal-buttons"]',
        '[data-setting-token-admin-layout="full-width-admin-list"]',
        '[data-setting-token-strip="hertzbeat-ui-token-strip"]',
        '[data-setting-token-strip-style="hertzbeat-ui-inline-counts"]',
        '[data-setting-token-table-panel="hertzbeat-ui-dense-table"]',
        '[data-setting-token-table="hertzbeat-ui-token-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'table'
      ]),
      textSnippets: expect.arrayContaining([
        'Token management',
        'API key',
        'Manage telemetry and automation tokens in one place',
        'Generate token',
        'Total tokens',
        'Available tokens',
        'Expired tokens',
        'Token name',
        'Token value',
        'Creator',
        'Actions'
      ]),
      actionLabels: ['Generate token'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/settings/token/page.test.tsx components/settings/settings-console-shell.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/setting-token/controller.test.ts lib/setting-token/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-token').textSnippets).not.toContain('API Keys');
    expect(getParityRoutePair('setting-family', 'setting-token').textSnippets).not.toContain('Token summary');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-surface="angular-token-console"]');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-table="angular-token-table"]');
  });

  it('tracks collector management through the cold-matte dense admin/list route contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-collector')).toMatchObject({
      locale: 'en-US',
      primarySelectors: expect.arrayContaining([
        '[data-collector-manage-surface="otlp-cold-collector-console"]',
        '[data-collector-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-collector-header="hertzbeat-ui-compact-header"]',
        '[data-collector-command-row="standard-equal-buttons"]',
        '[data-collector-admin-layout="full-width-admin-list"]',
        '[data-collector-toolbar="hertzbeat-ui-table-toolbar"]',
        '[data-collector-table-shell="hertzbeat-ui-dense-table"]',
        '[data-collector-manage-table="cold-collector-table"]',
        'main',
        'button',
        'input',
        'table'
      ]),
      textSnippets: expect.arrayContaining(['Collector cluster', 'Collector name', 'Run status', 'Run mode', 'Total tasks', 'Pinned tasks', 'Scheduled tasks', 'Actions']),
      actionLabels: ['Refresh', 'Deploy collector', 'Bring collector online', 'Take collector offline', 'Delete collector', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/collector/page.test.tsx components/pages/collector-manage-surface.test.tsx lib/collector-manage/controller.test.ts lib/collector-manage/query-state.test.ts lib/collector-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-collector').primarySelectors).not.toContain('[data-collector-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-collector').primarySelectors).not.toContain('[data-collector-manage-surface="true"]');
    expect(getParityRoutePair('setting-family', 'setting-collector').textSnippets).not.toContain('Collector');
    expect(getParityRoutePair('setting-family', 'setting-collector').actionLabels).not.toContain('Deploy');
  });

  it('tracks define management through targeted route, shared-surface, controller, and query-state contracts instead of the broken source-file smoke path', () => {
    expect(getParityRoutePair('setting-family', 'setting-define')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-setting-define-surface="otlp-cold-define-console"]',
        '[data-setting-define-style-baseline="hertzbeat-ui-matte"]',
        '[data-setting-define-header="hertzbeat-ui-compact-header"]',
        '[data-setting-define-command-row="standard-equal-buttons"]',
        '[data-setting-define-workspace="cold-define-workspace"]',
        '[data-setting-define-menu="cold-static-list"]',
        '[data-setting-define-toolbar="cold-search-row"]',
        '[data-setting-define-menu-shell="cold-dense-list"]',
        '[data-setting-define-editor="hertzbeat-ui-settings-form"]',
        '[data-setting-define-editor-shell="shared-yaml-workspace"]',
        '[data-setting-define-editor-field="hz-code-editor"]',
        '[data-setting-define-code-editor="monitor-template-yaml"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['Definitions', 'Manage monitor template YAML']),
      actionLabels: ['New type', 'Edit', 'Cancel', 'Save and apply', 'Search', 'Hide', 'Show'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/define/page.test.tsx components/pages/setting-define-surface.test.tsx lib/setting-define/controller.test.ts lib/setting-define/query-state.test.ts lib/setting-define/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-define').primarySelectors).not.toContain('[data-setting-define-surface="true"]');
    expect(getParityRoutePair('setting-family', 'setting-define').primarySelectors).not.toContain('[data-setting-define-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-define').textSnippets).not.toContain('Define');
    expect(getParityRoutePair('setting-family', 'setting-define').actionLabels).not.toContain('New Monitor Type');
    expect(getParityRoutePair('setting-family', 'setting-define').textSnippets).not.toContain('Data source status');
    expect(getParityRoutePair('setting-family', 'setting-define').actionLabels).not.toContain('Preview query');
  });

  it('pins label management to the OTLP cold-matte dense admin/list contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-labels')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-label-manage-surface="otlp-hertzbeat-ui-label-console"]',
        '[data-label-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-label-header="hertzbeat-ui-compact-header"]',
        '[data-label-command-row="standard-equal-buttons"]',
        '[data-label-admin-layout="full-width-admin-list"]',
        '[data-label-toolbar="hertzbeat-ui-table-toolbar"]',
        '[data-label-table-shell="hertzbeat-ui-dense-table"]',
        '[data-label-table="cold-label-table"]',
        '[data-label-empty-state="hertzbeat-ui-table-empty"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Label management', 'New', 'Search labels', 'Label name', 'Label type', 'Label description']),
      actionLabels: ['New', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/labels/page.test.tsx components/pages/label-manage-surface.test.tsx lib/label-manage/controller.test.ts lib/label-manage/query-state.test.ts lib/label-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-manage-route="angular-label-cards"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-card-shell="angular-card"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').textSnippets).not.toContain('Label');
  });

  it('pins plugin management to the OTLP cold-matte dense admin/list contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-plugins')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-plugin-manage-surface="otlp-hertzbeat-ui-plugin-console"]',
        '[data-plugin-manage-style-baseline="hertzbeat-ui-matte"]',
        '[data-plugin-header="hertzbeat-ui-compact-header"]',
        '[data-plugin-command-row="standard-equal-buttons"]',
        '[data-plugin-admin-layout="full-width-admin-list"]',
        '[data-plugin-manage-toolbar="hertzbeat-ui-table-toolbar"]',
        '[data-plugin-manage-table-shell="hertzbeat-ui-dense-table"]',
        '[data-plugin-manage-table="hertzbeat-ui-plugin-table"]',
        '[data-plugin-manage-empty-state="hertzbeat-ui-table-empty"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table'
      ]),
      textSnippets: expect.arrayContaining(['Plugin management', 'Plugin name', 'Plugin type', 'Enabled status', 'Actions', 'No data']),
      actionLabels: ['Upload plugin', 'Search'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/plugins/page.test.tsx components/pages/plugin-manage-surface.test.tsx lib/plugin-manage/controller.test.ts lib/plugin-manage/query-state.test.ts lib/plugin-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-plugins').primarySelectors).not.toContain('[data-plugin-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-plugins').primarySelectors).not.toContain('[data-plugin-manage-route="angular-plugin-table"]');
    expect(getParityRoutePair('setting-family', 'setting-plugins').primarySelectors).not.toContain('[data-plugin-manage-table="angular-nz-table"]');
    expect(getParityRoutePair('setting-family', 'setting-plugins').textSnippets).not.toContain('Plugin');
    expect(getParityRoutePair('setting-family', 'setting-plugins').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('setting-family', 'setting-plugins').actionLabels).not.toContain('Upload Plugin');
  });

  it('pins status settings to the cold-matte org form, tabs, and dense component table contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-status')).toMatchObject({
      locale: 'en-US',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-status-setting-surface="otlp-cold-status-console"]',
        '[data-status-setting-style-baseline="hertzbeat-ui-matte"]',
        '[data-status-header="hertzbeat-ui-compact-header"]',
        '[data-status-command-row="standard-equal-buttons"]',
        '[data-status-admin-layout="full-width-admin-list"]',
        '[data-status-org-form="hertzbeat-ui-settings-form"]',
        '[data-status-tabs="hertzbeat-ui-segmented-tabs"]',
        '[data-status-component-toolbar="hertzbeat-ui-table-toolbar"]',
        '[data-status-component-table-shell="hertzbeat-ui-dense-table"]',
        '[data-status-component-table="cold-component-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Status page', 'Organization name', 'Organization introduction', 'Service components', 'Maintenance events', 'Component status', 'Status aggregation method', 'Matching labels', 'Actions']),
      actionLabels: ['OK', 'New component'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/status/page.test.tsx components/pages/status-setting-surface.test.tsx lib/setting-status/controller.test.ts lib/setting-status/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-status').primarySelectors).not.toContain('[data-status-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-status').textSnippets).not.toContain('Status');
    expect(getParityRoutePair('setting-family', 'setting-status').actionLabels).not.toContain('Edit');
    expect(getParityRoutePair('setting-family', 'setting-status').actionLabels).not.toContain('Delete');
  });

  it('tracks the login compatibility alias through targeted route and shared auth-shell contracts instead of the old smoke-only command', () => {
    expect(getParityRoutePair('auth-public-family', 'login-alias')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-passport-shell="true"]',
        '[data-login-shell="passport"]',
        '[data-passport-brand-lockup="angular-lowered"]',
        '[data-passport-background-overlay="angular-light"]',
        '[data-passport-content-alignment="angular-centered"]',
        '[data-passport-content-gutter="angular-right-shift"]',
        '[data-passport-hero-offset="angular-left-reference"]',
        '[data-passport-locale-trigger="globe"]',
        '[data-passport-locale-tone="angular-magenta"]',
        '[data-passport-intro-list="angular-single-column"]',
        '[data-passport-intro-bullet-tone="angular-cyan"]',
        '[data-passport-login-panel="angular-gray-card"]',
        '[data-passport-login-panel-align="angular-top"]',
        '[data-passport-login-remember="true"]',
        'form',
        'button'
      ]),
      actionLabels: ['Login'],
      minimumVerificationCommand:
        'npm exec vitest run app/login/page.test.ts app/passport/login/page.test.tsx components/pages/login-form.test.tsx lib/passport-login/controller.test.ts lib/passport-login/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('auth-public-family', 'login-alias').textSnippets).toEqual(
      expect.arrayContaining(['HertzBeat', 'v1.8.0'])
    );
  });

  it('tracks the passport lock route through targeted route and shared auth-shell contracts instead of the old route-matrix fallback', () => {
    expect(getParityRoutePair('auth-public-family', 'passport-lock')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-passport-shell="true"]',
        '[data-passport-lock-panel="angular-wide"]',
        '[data-passport-lock="true"]',
        'form',
        'input',
        'button'
      ]),
      actionLabels: ['Unlock'],
      minimumVerificationCommand:
        'npm exec vitest run app/passport/lock/page.test.tsx lib/passport-lock/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the public status alias through targeted route and public-status contracts instead of the old smoke-only command', () => {
    expect(getParityRoutePair('auth-public-family', 'status-public-alias')).toMatchObject({
      primarySelectors: expect.arrayContaining(['[data-public-status-shell="true"]', 'main', 'button']),
      actionLabels: ['Refresh'],
      minimumVerificationCommand:
        'npm exec vitest run app/status/public/page.test.ts app/status/page.test.tsx lib/status-center/controller.test.ts lib/status-center/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the 403 exception route through a targeted route test plus the shared exception surface contract', () => {
    expect(getParityRoutePair('auth-public-family', 'exception-403')).toMatchObject({
      nextRoute: '/exception/403',
      referenceRoute: '/exception/403',
      primarySelectors: expect.arrayContaining(['[data-exception-center-surface="true"]', 'main', 'aside', 'a']),
      actionLabels: ['Back to overview', 'Log workbench', 'Trace workbench'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/exception/[type]/page.test.tsx' components/pages/exception-center-surface.test.tsx lib/exception-center/view-model.test.ts lib/parity/route-manifest.test.ts"
    });
  });

  it('tracks the 404 exception route through a targeted route test plus the shared exception surface contract', () => {
    expect(getParityRoutePair('auth-public-family', 'exception-404')).toMatchObject({
      nextRoute: '/exception/404',
      referenceRoute: '/exception/404',
      primarySelectors: expect.arrayContaining(['[data-exception-center-surface="true"]', 'main', 'aside', 'a']),
      actionLabels: ['Back to overview', 'Log workbench', 'Trace workbench'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/exception/[type]/page.test.tsx' components/pages/exception-center-surface.test.tsx lib/exception-center/view-model.test.ts lib/parity/route-manifest.test.ts"
    });
  });

  it('tracks the 500 exception route through the HertzBeat-native exceptions explorer contract', () => {
    expect(getParityRoutePair('auth-public-family', 'exception-500')).toMatchObject({
      nextRoute: '/exception/500',
      referenceRoute: '/exception/500',
      authState: 'session',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-exception-center-surface="hertzbeat-exceptions"]',
        '[data-exception-filter-sidebar="hertzbeat-exception-filters"]',
        '[data-exception-query-bar="hertzbeat-error-query"]',
        '[data-exception-table="hertzbeat-exception-list"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['Exception center', 'Filter', 'Run query', 'ECONNRESET', 'Apply']),
      actionLabels: ['Run query', 'Back to overview', 'Log workbench', 'Trace workbench'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/exception/[type]/page.test.tsx' components/pages/exception-center-surface.test.tsx lib/exception-center/view-model.test.ts lib/parity/route-manifest.test.ts"
    });
  });

  it('tracks bulletin through targeted route, shared-surface, controller, and view-model contracts instead of the old partial route-only fallback', () => {
    expect(getParityRoutePair('auth-public-family', 'bulletin-surface')).toMatchObject({
      primarySelectors: expect.arrayContaining([
        '[data-bulletin-center-surface="true"]',
        '[data-action-toolbar="true"]',
        '[data-bulletin-metrics-table="true"]',
        'button'
      ]),
      actionLabels: ['Refresh', 'New', 'Delete'],
      minimumVerificationCommand:
        'npm exec vitest run app/bulletin/page.test.tsx components/pages/bulletin-center-surface.test.tsx lib/bulletin-center/controller.test.ts lib/bulletin-center/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('exposes a manifest-driven default smoke target for each milestone', () => {
    expect(getDefaultParityRoutePairForMilestone(1)).toMatchObject({
      familyKey: 'shared-parity-foundation',
      key: 'passport-login-shell',
      milestone: 1
    });
  });
});
