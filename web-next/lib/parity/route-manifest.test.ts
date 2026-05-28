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
      expect.arrayContaining(['你已完成 83% 的平台配置'])
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
        '[data-log-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-log-manage-query-bar="cold-query-row"]',
        '[data-log-manage-chart-band="cold-chart-band"]',
        '[data-log-manage-log-list="cold-dense-log-list"]',
        '[data-log-manage-detail-panel="cold-detail-panel"]',
        'main',
        'input',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['日志工作台', '严重级别', '趋势带', '运行查询']),
      actionLabels: ['运行查询', '保存视图', '创建告警', '加入仪表盘'],
      minimumVerificationCommand:
        'npm exec vitest run app/events/page.test.ts app/log/manage/page.test.tsx app/compatibility-entrypoints.chrome.test.ts lib/log-manage/query-state.test.ts lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the dashboard compatibility alias through the overview route contracts instead of the old route-matrix fallback', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'dashboard-alias')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-workspace-shell="true"]',
        '[data-overview-status-grid="true"]',
        '[data-overview-guidance="true"]',
        '[data-overview-checklist="true"]',
        'main',
        'aside'
      ]),
      textSnippets: expect.arrayContaining(['总览', '工作区状态', '下一步：先接入一条可用信号链路', '你已完成 83% 的平台配置']),
      actionLabels: ['刷新'],
      minimumVerificationCommand:
        'npm exec vitest run app/dashboard/page.test.ts app/overview/page.test.tsx app/compatibility-entrypoints.chrome.test.ts lib/overview/navigation.test.ts lib/overview/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('compatibility-placeholder-family', 'dashboard-alias').textSnippets).not.toContain(
      'Overview'
    );
  });

  it('tracks the alerts compatibility alias through the shared alert-center contracts instead of the old route-matrix fallback', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-center-surface="otlp-cold-center-console"]',
        '[data-alert-center-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-center-header="cold-compact-header"]',
        '[data-alert-center-command-row="standard-equal-buttons"]',
        '[data-alert-center-admin-layout="full-width-admin-list"]',
        '[data-alert-center-toolbar="cold-query-toolbar"]',
        '[data-alert-center-list-shell="cold-alert-list"]',
        '[data-alert-center-empty-state="cold-table-empty"]',
        '[data-alert-center-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'input',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['告警中心', '集中查看并处理当前告警', '搜索告警']),
      actionLabels: ['刷新'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-incidents-route="otlp-cold-ops-entry"]',
        '[data-incidents-style-baseline="hertzbeat-cold-matte"]',
        '[data-incidents-shell-panel="cold-ops-shell-panel"]',
        '[data-incidents-launch-checklist="cold-ops-static-rail"]',
        '[data-incidents-empty-state="cold-ops-domain-adapter"]',
        'main',
        'section',
        'aside',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['故障事件', '按 OTLP 工作台的冷色基线', '冷色入口已接入', '等待接入事件适配器', '你已完成 83% 的平台配置']),
      actionLabels: ['打开概览', '查看对象'],
      minimumVerificationCommand:
        'npm exec vitest run app/incidents/page.test.tsx lib/incidents-surface/view-model.test.ts lib/incidents-surface/model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the actions OTLP cold-matte entry through targeted route and surface-model contracts', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'actions-placeholder')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-actions-route="otlp-cold-ops-entry"]',
        '[data-actions-style-baseline="hertzbeat-cold-matte"]',
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
      textSnippets: expect.arrayContaining(['自动化处置', '按 OTLP 工作台的冷色基线', '冷色入口已接入', '等待接入执行适配器', '你已完成 83% 的平台配置']),
      actionLabels: ['打开概览', '查看对象'],
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
      textSnippets: expect.arrayContaining(['HertzBeat 企业运维拓扑', 'OTLP 调用关系', '监控对象归属', 'checkout-api']),
      actionLabels: ['适配视图', '刷新拓扑'],
      minimumVerificationCommand:
        'npm exec vitest run app/topology/page.test.tsx lib/topology-surface/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks the OTLP cold unified explorer as an API/query-backed workbench instead of the old external-product-first surface', () => {
    expect(getParityRoutePair('compatibility-placeholder-family', 'explorer-workbench')).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-explorer-route="otlp-cold-workbench"]',
        '[data-explorer-style-baseline="hertzbeat-cold-matte"]',
        '[data-explorer-api-owner="trace-log-bff-query-api"]',
        '[data-explorer-query-state]',
        '[data-explorer-signal-filter]',
        '[data-explorer-api-source]',
        '[data-explorer-shared-frame="hertzbeat-ui"]',
        '[data-hz-ui="explorer-frame"]',
        '[data-explorer-query-bar="cold-query-row"]',
        '[data-explorer-chart-band="cold-chart-band"]',
        '[data-explorer-result-table="cold-dense-table"]',
        '[data-explorer-result-table-owner="hertzbeat-ui-data-table"]',
        '[data-explorer-detail-panel="cold-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['查询工作台', '信号类型', '运行查询', 'checkout']),
      actionLabels: ['运行查询', '保存视图', '创建告警', '加入仪表盘'],
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
      '管理令牌',
      '查看实体',
      '进入遥测发现'
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
      referenceReadySelectors: ['text=checkout-service', 'button:has-text("搜索")']
    });
    expect(getParityRoutePair('three-signal-desk', 'trace-manage-desk').referencePostLoadActions ?? []).toEqual([]);
    expect(getParityRoutePair('three-signal-desk', 'otlp-center-desk')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-otlp-center-route="hertzbeat-intake-cortex"]',
        '[data-otlp-center-visual-system="hertzbeat-native-avant-garde"]',
        '[data-otlp-center-tone="cold-ops-catalog"]',
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
      textSnippets: expect.arrayContaining(['OTLP 接入', '指标工作台', '日志工作台', '链路工作台', 'OTLP 协议接入', '你已完成 83% 的平台配置']),
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
        '[data-otlp-metrics-style-baseline="hertzbeat-cold-matte"]',
        '[data-otlp-metrics-query-bar="cold-query-row"]',
        '[data-otlp-metrics-chart-band="cold-chart-band"]',
        '[data-otlp-metrics-series-table="cold-dense-metric-list"]',
        '[data-otlp-metrics-detail-panel="cold-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['指标工作台', '指标查询', '趋势带', '最近序列', '详情面板', '运行查询']),
      actionLabels: ['运行查询', '采集集群', '监控模板', '阈值规则'],
      minimumVerificationCommand:
        'npm exec vitest run app/ingestion/otlp/metrics/page.test.tsx lib/otlp-metrics/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(routePair.primarySelectors.join(' ')).not.toContain('data-otlp-metrics-hertzbeat-loop');
    expect(routePair.textSnippets.join(' ')).not.toContain('HertzBeat 采集闭环');
    const serialized = JSON.stringify(routePair);
    expect(serialized).not.toContain('signoz-metrics-explorer');
    expect(serialized).not.toContain('signoz-query-builder');
    expect(serialized).not.toContain('signoz-metrics-empty');
    expect(serialized).not.toContain('signoz-bottom-actions');
    expect(routePair.textSnippets.join(' ')).not.toContain('Run Query');
    expect(routePair.textSnippets.join(' ')).not.toContain('Select a metric and run a query');
    expect(routePair.actionLabels.join(' ')).not.toContain('Save this view');
    expect(routePair.actionLabels.join(' ')).not.toContain('保存视图');
  });

  it('tracks the OTLP cold trace Workbench surface instead of the old external-product waterfall shell', () => {
    const routePair = getParityRoutePair('three-signal-desk', 'trace-manage-desk');

    expect(routePair).toMatchObject({
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-trace-manage-route="otlp-cold-trace-workbench"]',
        '[data-trace-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-trace-manage-query-bar="cold-query-row"]',
        '[data-trace-manage-chart-band="cold-chart-band"]',
        '[data-trace-manage-trace-table="cold-dense-trace-list"]',
        '[data-trace-manage-detail-panel="cold-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['链路工作台', '服务名称', '错误链路', '最近链路', '运行查询']),
      actionLabels: ['运行查询', '保存视图', '创建告警', '加入仪表盘'],
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
        '[data-log-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-log-manage-query-bar="cold-query-row"]',
        '[data-log-manage-chart-band="cold-chart-band"]',
        '[data-log-manage-log-list="cold-dense-log-list"]',
        '[data-log-manage-detail-panel="cold-detail-panel"]',
        'main',
        'button',
        'input',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['日志工作台', '严重级别', '趋势带', '最近日志', '运行查询']),
      actionLabels: ['运行查询', '保存视图', '创建告警', '加入仪表盘'],
      minimumVerificationCommand:
        'npm exec vitest run app/log/manage/page.test.tsx lib/log-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('three-signal-desk', 'log-manage-desk').actionLabels).not.toContain('Clear');
    expect(getParityRoutePair('three-signal-desk', 'log-manage-desk').primarySelectors.join(' ')).not.toContain('signoz-');
  });

  it('tracks the Angular zh-CN overview contract instead of passing on the English fallback copy', () => {
    const routePair = getParityRoutePair('three-signal-desk', 'overview-desk');

    expect(routePair).toMatchObject({
      locale: 'zh-CN',
      textSnippets: expect.arrayContaining(['总览', '工作区状态', '下一步：先接入一条可用信号链路'])
    });
    expect(routePair.actionLabels).toEqual(['刷新', '查看告警']);
    expect(routePair.textSnippets).not.toContain('Overview');
  });

  it('pins overview live screenshots to viewport capture so Angular reference full-page capture cannot stall closeout', () => {
    expect(getParityRoutePair('three-signal-desk', 'overview-desk')).toMatchObject({
      screenshotMode: 'viewport'
    });
  });

  it('keeps log-stream on the redirect-helper owner now that the compatibility route is canonical', () => {
    expect(getParityRoutePair('log-compatibility-family', 'log-stream-compat')).toMatchObject({
      locale: 'zh-CN',
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
      textSnippets: expect.arrayContaining(['日志流', '已连接', '连接中...', '0 条日志', '日志级别编号', '你已完成 83% 的平台配置']),
      actionLabels: ['隐藏过滤器', '暂停', '清除', '应用过滤器', '清除过滤器']
    });
  });

  it('keeps the log-integration compatibility entrypoints on the HertzBeat Intake Cortex contract', () => {
    const rootRoute = getParityRoutePair('log-compatibility-family', 'log-integration-root-compat');
    const sourceRoute = getParityRoutePair('log-compatibility-family', 'log-integration-compat');

    expect(rootRoute.primarySelectors).toEqual(
      expect.arrayContaining([
        '[data-otlp-center-route="hertzbeat-intake-cortex"]',
        '[data-otlp-center-visual-system="hertzbeat-native-avant-garde"]',
        '[data-otlp-center-tone="cold-ops-catalog"]',
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
        '[data-otlp-center-tone="cold-ops-catalog"]',
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
    expect(rootRoute.textSnippets).toEqual(expect.arrayContaining(['你已完成 83% 的平台配置']));
    expect(sourceRoute.textSnippets).toEqual(expect.arrayContaining(['你已完成 83% 的平台配置']));
  });

  it('tracks the HertzBeat OTLP log-integration redirect actions instead of a generic refresh fallback', () => {
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-root-compat').actionLabels).toEqual([
      '管理令牌',
      '查看实体',
      '进入遥测发现'
    ]);
    expect(getParityRoutePair('log-compatibility-family', 'log-integration-compat').actionLabels).toEqual([
      '管理令牌',
      '查看实体',
      '进入遥测发现'
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
      locale: 'zh-CN',
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
    expect(routePair.textSnippets).toEqual(expect.arrayContaining(['监控列表', '监控实时数据详情', '监控历史图表详情']));
    expect(routePair.textSnippets).not.toContain('Monitors');
    expect(routePair.textSnippets).not.toContain('Monitor Real-Time Detail');
    expect(routePair.textSnippets).not.toContain('Monitor Historical Chart Detail');
    expect(routePair.actionLabels).toEqual(['刷新']);
    expect(routePair.primarySelectors).not.toContain('[data-monitor-detail-return-action="true"]');
    expect(routePair.textSnippets).not.toContain('Metric catalog');
    expect(routePair.textSnippets).not.toContain('指标目录');
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-list-surface="otlp-cold-entity-console"]',
        '[data-entity-list-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-list-header="cold-compact-header"]',
        '[data-entity-list-command-row="standard-equal-buttons"]',
        '[data-entity-list-admin-layout="full-width-admin-list"]',
        '[data-entity-list-count-strip="cold-inline-counts"]',
        '[data-entity-list-toolbar="cold-table-toolbar"]',
        '[data-entity-list-table-shell="cold-dense-table"]',
        '[data-entity-list-table="cold-entity-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['对象目录', '对象优先调查', '围绕服务、资源与实体定位问题并进入调查', '实体总数', '对象', '告警']),
      actionLabels: ['搜索', '刷新', '创建实体'],
      minimumVerificationCommand:
        'npm exec vitest run app/entities/page.test.tsx components/pages/entity-list-surface.test.tsx lib/entity-manage/controller.test.ts lib/entity-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-route="signoz-services-table"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-workspace-offset="angular-sidebar-flush"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-workspace-stretch="angular-right-edge"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-rail="signoz-services-rail"]');
    expect(routePair.primarySelectors).not.toContain('[data-entity-list-action-panel="signoz-actions"]');
    expect(routePair.textSnippets).not.toContain('Entity');
    expect(routePair.textSnippets).not.toContain('常用入口');
    expect(routePair.actionLabels).not.toContain('Add');
  });

  it('points entity editor routes at targeted route and shared-surface contracts instead of raw source files', () => {
    expect(getParityRoutePair('entity-family', 'entity-editor-new')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-editor-shell="otlp-cold-entity-composer"]',
        '[data-entity-editor-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-editor-layout="full-width-workbench"]',
        '[data-entity-editor-header="cold-compact-header"]',
        '[data-entity-editor-header-rhythm="cold-compact"]',
        '[data-entity-editor-frame="cold-editor-frame"]',
        '[data-entity-editor-frame-spacing="cold-tight"]',
        '[data-entity-editor-route-tabs="cold-segmented-tabs"]',
        '[data-entity-editor-summary-card="cold-editor-panel"]',
        '[data-entity-editor-type-strip="cold-catalog-grid"]',
        '[data-entity-editor-type-strip-layout="cold-compact-grid"]',
        '[data-entity-editor-type-card-density="cold-compact-card"]',
        '[data-entity-editor-entry-strip="cold-segmented-pills"]',
        '[data-entity-editor-stage-strip="cold-stage-grid"]',
        '[data-entity-editor-preview-rail-density="cold-inline-preview"]',
        '[data-entity-editor-body-placement="cold-deferred-body"]',
        '[data-entity-editor-definition-tabs="cold-bottom-tabs"]',
        '[data-entity-type-icon="service"]',
        '[data-entity-type-icon="database"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]'
      ]),
      textSnippets: expect.arrayContaining(['新建实体', '全部实体', '实体元数据', '页面录入', '基本信息', '你已完成 83% 的平台配置']),
      actionLabels: ['创建实体']
    });
    expect(getParityRoutePair('entity-family', 'entity-editor-new').minimumVerificationCommand).toBe(
      "npm exec vitest run app/entities/new/page.test.tsx components/pages/entity-editor-surface.test.tsx lib/entity-editor/controller.test.ts lib/entity-editor/view-model.test.ts"
    );
    expect(getParityRoutePair('entity-family', 'entity-editor-new').primarySelectors).not.toContain('[data-entity-editor-shell="angular-composer"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-new').primarySelectors).not.toContain('[data-entity-editor-frame="angular-flush"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-edit')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      nextApiStubKey: 'entity-fixture',
      referenceApiStubKey: 'entity-fixture',
      primarySelectors: expect.arrayContaining([
        '[data-entity-editor-shell="otlp-cold-entity-composer"]',
        '[data-entity-editor-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-editor-layout="full-width-workbench"]',
        '[data-entity-editor-header="cold-compact-header"]',
        '[data-entity-editor-header-rhythm="cold-compact"]',
        '[data-entity-editor-frame="cold-editor-frame"]',
        '[data-entity-editor-frame-spacing="cold-tight"]',
        '[data-entity-editor-route-tabs="cold-segmented-tabs"]',
        '[data-entity-editor-summary-card="cold-editor-panel"]',
        '[data-entity-editor-type-strip="cold-catalog-grid"]',
        '[data-entity-editor-type-strip-layout="cold-compact-grid"]',
        '[data-entity-editor-type-card-density="cold-compact-card"]',
        '[data-entity-editor-entry-strip="cold-segmented-pills"]',
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
      textSnippets: expect.arrayContaining(['编辑实体', '全部实体', '实体元数据', '基本信息', '你已完成 0% 的平台配置']),
      actionLabels: ['保存']
    });
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').minimumVerificationCommand).toBe(
      "npm exec vitest run 'app/entities/[entityId]/edit/page.test.tsx' components/pages/entity-editor-surface.test.tsx lib/entity-editor/controller.test.ts lib/entity-editor/view-model.test.ts"
    );
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').primarySelectors).not.toContain('[data-entity-editor-shell="angular-composer"]');
    expect(getParityRoutePair('entity-family', 'entity-editor-edit').primarySelectors).not.toContain('[data-entity-editor-frame="angular-flush"]');
  });

  it('tracks the shared entity-import workspace shell with targeted route and controller contracts', () => {
    expect(getParityRoutePair('entity-family', 'entity-import')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-definition-workspace="import"]',
        '[data-entity-definition-style-baseline="hertzbeat-cold-matte"]',
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
        '[data-entity-definition-metric-strip="cold-inline-counts"]',
        '[data-entity-definition-template-panel="true"]',
        '[data-entity-definition-batch-panel="true"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'textarea',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['对象优先调查', '导入实体定义', '可直接导入', '模板与批量编辑', '你已完成 83% 的平台配置']),
      actionLabels: ['清空草稿', '预览定义', '导入实体'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-definition-workspace="definition"]',
        '[data-entity-definition-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-definition-layout="full-width-workbench"]',
        '[data-entity-definition-editor-shell="otlp-cold-definition-workbench"]',
        '[data-entity-definition-shell-spacing="cold-tight"]',
        '[data-entity-definition-shell-height="cold-content"]',
        '[data-entity-definition-action-row="cold-inline-actions"]',
        '[data-entity-definition-editor-column="true"]',
        '[data-entity-definition-format-select="cold-compact-select"]',
        '[data-entity-definition-editor-width="cold-fluid"]',
        '[data-entity-definition-context-panel="cold-context-panel"]',
        '[data-entity-definition-metric-strip="cold-inline-counts"]',
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
        '实体定义',
        '编辑实体定义',
        '导入格式',
        '模板与批量编辑',
        '粘贴 YAML 实体定义',
        '实体不存在。',
        '你已完成 83% 的平台配置'
      ]),
      actionLabels: ['清空草稿', '预览定义', '保存定义'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-discovery-surface="otlp-cold-discovery-console"]',
        '[data-entity-discovery-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-discovery-layout="full-width-workbench"]',
        '[data-entity-discovery-header="cold-compact-header"]',
        '[data-entity-discovery-command-row="standard-equal-buttons"]',
        '[data-entity-discovery-count-strip="cold-inline-counts"]',
        '[data-entity-discovery-toolbar="cold-search-row"]',
        '[data-entity-discovery-policy-panel="cold-policy-strip"]',
        '[data-entity-discovery-source-chips="cold-inline-chips"]',
        '[data-entity-discovery-empty-state="cold-inline-empty"]',
        '[data-entity-discovery-table-shell="cold-dense-table"]',
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
      textSnippets: expect.arrayContaining(['遥测发现', '先搜索一组需要治理的监控线索', '治理筛选与共享策略', '线索', '状态', '你已完成 83% 的平台配置']),
      actionLabels: ['搜索', '清空', '从定义创建', '创建实体'],
      minimumVerificationCommand:
        'npm exec vitest run app/entities/discovery/page.test.tsx components/pages/entity-discovery-surface.test.tsx lib/entity-discovery/controller.test.ts lib/entity-discovery/search-state.test.ts lib/entity-discovery/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    const selectors = getParityRoutePair('entity-family', 'entity-discovery').primarySelectors;
    expect(selectors).not.toContain('[data-entity-discovery-route="signoz-discovery-table"]');
    expect(selectors).not.toContain('[data-entity-discovery-rail="signoz-status-rail"]');
    expect(selectors).not.toContain('[data-entity-discovery-right-panel="angular-density"]');
    expect(selectors).not.toContain('[data-entity-discovery-table="signoz-discovery-table"]');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('Entity Discovery');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('常用入口');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('原因');
    expect(getParityRoutePair('entity-family', 'entity-discovery').textSnippets).not.toContain('接着可做');
    expect(getParityRoutePair('entity-family', 'entity-discovery').actionLabels).not.toContain('Search');
  });

  it('tracks entity-detail through the cold full-width Workbench contract', () => {
    expect(getParityRoutePair('entity-family', 'entity-detail')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-entity-detail-surface="otlp-cold-entity-detail"]',
        '[data-entity-detail-style-baseline="hertzbeat-cold-matte"]',
        '[data-entity-detail-layout="full-width-workbench"]',
        '[data-entity-detail-header="cold-compact-header"]',
        '[data-entity-detail-command-row="standard-equal-buttons"]',
        '[data-entity-detail-count-strip="cold-inline-counts"]',
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
    expect(getParityRoutePair('entity-family', 'entity-detail').textSnippets).not.toContain('实体详情');
    expect(getParityRoutePair('entity-family', 'entity-detail').textSnippets).not.toContain('对象优先调查');
    expect(getParityRoutePair('entity-family', 'entity-detail').actionLabels).not.toContain('刷新');
    expect(getParityRoutePair('entity-family', 'entity-detail').actionLabels).not.toContain('编辑定义');
  });

  it('tracks the alert center through targeted route, shared-surface, and filter contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-center')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-center-surface="otlp-cold-center-console"]',
        '[data-alert-center-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-center-header="cold-compact-header"]',
        '[data-alert-center-command-row="standard-equal-buttons"]',
        '[data-alert-center-admin-layout="full-width-admin-list"]',
        '[data-alert-center-toolbar="cold-query-toolbar"]',
        '[data-alert-center-list-shell="cold-alert-list"]',
        '[data-alert-center-empty-state="cold-table-empty"]',
        '[data-alert-center-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'input',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['告警中心', '集中查看并处理当前告警', '搜索告警']),
      actionLabels: ['刷新'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/page.test.tsx components/pages/alert-center-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-manage/query-state.test.ts lib/alert-manage/controller.test.ts lib/alert-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-group-card-stack="true"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-workbench-panel="angular-single-panel"]');
    expect(getParityRoutePair('alert-family', 'alert-center').primarySelectors).not.toContain('[data-alert-center-toolbar="angular-density"]');
    expect(getParityRoutePair('alert-family', 'alert-center').textSnippets).not.toContain('Alert');
    expect(getParityRoutePair('alert-family', 'alert-center').actionLabels).not.toContain('Refresh');
  });

  it('tracks alert group through a targeted route test plus shared group surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-group')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-group-surface="otlp-cold-group-console"]',
        '[data-alert-group-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-group-header="cold-compact-header"]',
        '[data-alert-group-command-row="standard-equal-buttons"]',
        '[data-alert-group-admin-layout="full-width-admin-list"]',
        '[data-alert-group-toolbar="cold-query-toolbar"]',
        '[data-alert-group-table-shell="cold-dense-table"]',
        '[data-alert-group-empty-state="cold-table-empty"]',
        '[data-alert-group-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['分组收敛', '管理 Alertmanager 分组收敛规则', '策略名称', '分组标签']),
      actionLabels: ['刷新', '新增分组', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/group/page.test.tsx components/pages/alert-group-surface.test.tsx components/pages/alert-group-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-group/controller.test.ts lib/alert-group/query-state.test.ts lib/alert-group/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-card-stack="true"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-workbench-panel="angular-table-panel"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-toolbar="angular-table-toolbar"]');
    expect(getParityRoutePair('alert-family', 'alert-group').primarySelectors).not.toContain('[data-alert-group-table-shell="angular-table"]');
    expect(getParityRoutePair('alert-family', 'alert-group').textSnippets).not.toContain('Group');
    expect(getParityRoutePair('alert-family', 'alert-group').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('alert-family', 'alert-group').actionLabels).not.toContain('新增');
  });

  it('keeps alert-family toolbar selectors on the shared cold query-row owner', () => {
    const expectedQueryToolbarSelectors: Array<[string, string]> = [
      ['alert-center', '[data-alert-center-toolbar="cold-query-toolbar"]'],
      ['alert-group', '[data-alert-group-toolbar="cold-query-toolbar"]'],
      ['alert-silence', '[data-alert-silence-toolbar="cold-query-toolbar"]'],
      ['alert-inhibit', '[data-alert-inhibit-toolbar="cold-query-toolbar"]'],
      ['alert-notice', '[data-alert-notice-receiver-toolbar="cold-query-toolbar"]'],
      ['alert-notice-rule', '[data-alert-notice-rule-toolbar="cold-query-toolbar"]'],
      ['alert-notice-template', '[data-alert-notice-template-toolbar="cold-query-toolbar"]'],
      ['alert-setting', '[data-alert-setting-toolbar="cold-query-toolbar"]']
    ];

    for (const [routeKey, selector] of expectedQueryToolbarSelectors) {
      const selectors = getParityRoutePair('alert-family', routeKey).primarySelectors;

      expect(selectors).toContain(selector);
      expect(selectors.join(' ')).not.toContain('cold-table-toolbar');
      expect(selectors.join(' ')).not.toContain('cold-filter-toolbar');
    }

    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors).toContain(
      '[data-alert-center-toolbar="cold-query-toolbar"]'
    );
    expect(getParityRoutePair('compatibility-placeholder-family', 'alerts-alias').primarySelectors.join(' ')).not.toContain(
      'cold-filter-toolbar'
    );
  });

  it('tracks alert notice through the OTLP cold tab console plus the receiver/rule/template authoring owner contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-notice-admin-layout="full-width-admin-list"]',
        '[data-alert-notice-inline-metrics="cold-inline-counts"]',
        '[data-alert-notice-console="true"]',
        '[data-alert-notice-workbench-panel="cold-tabbed-table-panel"]',
        '[data-alert-notice-tabs="cold-segmented-tabs"]',
        '[data-alert-notice-receiver-toolbar="cold-query-toolbar"]',
        '[data-alert-notice-receiver-table-shell="cold-dense-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        '[data-tab="receiver"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['消息通知', '通知媒介', '通知策略', '通知模板', '接收对象', '通知方式', '配置']),
      actionLabels: ['刷新', '新增接收对象', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-receiver-fields.test.tsx components/pages/alert-notice-rule-fields.test.tsx components/pages/alert-notice-template-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-notice').textSnippets).not.toContain('Notice');
    expect(getParityRoutePair('alert-family', 'alert-notice').actionLabels).not.toContain('New');
    expect(getParityRoutePair('alert-family', 'alert-notice').primarySelectors.join(' ')).not.toContain('summary-rail');
  });

  it('tracks alert notice rule tab through clicked-tab OTLP cold table parity', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice-rule')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      nextRoute: '/alert/notice',
      referenceRoute: '/alert/notice',
      nextPostLoadActions: [{ kind: 'click', selector: 'text=通知策略', waitAfterMs: 250 }],
      referencePostLoadActions: [{ kind: 'click', selector: 'text=通知策略', waitAfterMs: 250 }],
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-notice-console="true"]',
        '[data-panel-tab="rule"]',
        '[data-alert-notice-rule-panel="true"]',
        '[data-alert-notice-rule-toolbar="cold-query-toolbar"]',
        '[data-alert-notice-rule-table-shell="cold-dense-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['消息通知', '通知策略', '策略名称', '接收对象', '模板名称', '转发所有', '启用状态']),
      actionLabels: ['刷新', '新增通知策略', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-rule-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks alert notice template tab through clicked-tab OTLP cold table parity', () => {
    expect(getParityRoutePair('alert-family', 'alert-notice-template')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      nextRoute: '/alert/notice',
      referenceRoute: '/alert/notice',
      nextPostLoadActions: [{ kind: 'click', selector: 'text=通知模板', waitAfterMs: 250 }],
      referencePostLoadActions: [{ kind: 'click', selector: 'text=通知模板', waitAfterMs: 250 }],
      primarySelectors: expect.arrayContaining([
        '[data-alert-notice-surface="otlp-cold-notice-console"]',
        '[data-alert-notice-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-notice-console="true"]',
        '[data-panel-tab="template"]',
        '[data-alert-notice-template-panel="true"]',
        '[data-alert-notice-template-toolbar="cold-query-toolbar"]',
        '[data-alert-notice-template-preset-filter="cold-select"]',
        '[data-alert-notice-template-table-shell="cold-dense-table"]',
        '[data-alert-notice-pagination="cold-dense-pagination"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'select'
      ]),
      textSnippets: expect.arrayContaining([
        '消息通知',
        '通知模板',
        '系统内置模版',
        '模板名称',
        '通知方式',
        '模版类型',
        '更新时间',
        '操作'
      ]),
      actionLabels: ['刷新', '新增通知模板', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/notice/page.test.tsx components/pages/alert-notice-console-shell.test.tsx components/pages/alert-notice-template-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-notice/controller.test.ts lib/alert-notice/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
  });

  it('tracks alert setting through a targeted route test plus the shared define-console surface contract', () => {
    expect(getParityRoutePair('alert-family', 'alert-setting')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-setting-surface="otlp-cold-setting-console"]',
        '[data-alert-setting-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-setting-header="cold-compact-header"]',
        '[data-alert-setting-command-row="standard-equal-buttons"]',
        '[data-alert-setting-admin-layout="full-width-admin-list"]',
        '[data-alert-setting-toolbar="cold-query-toolbar"]',
        '[data-alert-setting-table-shell="cold-dense-table"]',
        '[data-alert-setting-select-all="cold-checkbox"]',
        '[data-alert-setting-empty-state="cold-table-empty"]',
        '[data-alert-setting-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['阈值规则', '阈值名称', '阈值类型', '阈值表达式', '告警内容']),
      actionLabels: ['刷新', '新增阈值', '批量删除', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/setting/page.test.tsx components/pages/alert-setting-surface.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-setting/controller.test.ts lib/alert-setting/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-setting').textSnippets).not.toContain('Alert settings');
    expect(getParityRoutePair('alert-family', 'alert-setting').textSnippets).not.toContain('当前阈值');
    expect(getParityRoutePair('alert-family', 'alert-setting').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('alert-family', 'alert-setting').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks alert integration through the OTLP cold-matte source-rail document shell', () => {
    expect(getParityRoutePair('alert-family', 'alert-integration')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      nextRoute: '/alert/integration/webhook',
      referenceRoute: '/alert/integration/webhook',
      primarySelectors: expect.arrayContaining([
        '[data-alert-integration-surface="otlp-cold-source-doc"]',
        '[data-alert-integration-style-baseline="hertzbeat-cold-matte"]',
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
      textSnippets: expect.arrayContaining(['集成接入', '默认Webhook', '集成告警源', '管理令牌', '接口端点', '请求头']),
      actionLabels: ['管理令牌'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/alert/integration/[source]/page.test.tsx' lib/alert-integration/view-model.test.ts components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/parity/route-manifest.test.ts"
    });
    expect(getParityRoutePair('alert-family', 'alert-integration').textSnippets).not.toContain('Integration');
    expect(getParityRoutePair('alert-family', 'alert-integration').textSnippets).not.toContain('管理 API Token');
    expect(getParityRoutePair('alert-family', 'alert-integration').actionLabels).not.toContain('Apply');
  });

  it('tracks alert silence through a targeted route test plus shared silence surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-silence')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-silence-surface="otlp-cold-silence-console"]',
        '[data-alert-silence-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-silence-header="cold-compact-header"]',
        '[data-alert-silence-command-row="standard-equal-buttons"]',
        '[data-alert-silence-admin-layout="full-width-admin-list"]',
        '[data-alert-silence-toolbar="cold-query-toolbar"]',
        '[data-alert-silence-table-shell="cold-dense-table"]',
        '[data-alert-silence-select-all="cold-checkbox"]',
        '[data-alert-silence-empty-state="cold-table-empty"]',
        '[data-alert-silence-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['告警静默', '策略名称', '静默类型', '已静默告警数']),
      actionLabels: ['刷新', '新增静默', '批量删除', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/silence/page.test.tsx components/pages/alert-silence-surface.test.tsx components/pages/alert-silence-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-silence/controller.test.ts lib/alert-silence/query-state.test.ts lib/alert-silence/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-silence').textSnippets).not.toContain('Silence');
    expect(getParityRoutePair('alert-family', 'alert-silence').textSnippets).not.toContain('当前静默');
    expect(getParityRoutePair('alert-family', 'alert-silence').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('alert-family', 'alert-silence').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks alert inhibit through a targeted route test plus shared inhibit surface and authoring contracts', () => {
    expect(getParityRoutePair('alert-family', 'alert-inhibit')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-alert-inhibit-surface="otlp-cold-inhibit-console"]',
        '[data-alert-inhibit-style-baseline="hertzbeat-cold-matte"]',
        '[data-alert-inhibit-header="cold-compact-header"]',
        '[data-alert-inhibit-command-row="standard-equal-buttons"]',
        '[data-alert-inhibit-admin-layout="full-width-admin-list"]',
        '[data-alert-inhibit-toolbar="cold-query-toolbar"]',
        '[data-alert-inhibit-table-shell="cold-dense-table"]',
        '[data-alert-inhibit-select-all="cold-checkbox"]',
        '[data-alert-inhibit-empty-state="cold-table-empty"]',
        '[data-alert-inhibit-empty-icon="cold-empty-box"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['告警抑制', '抑制规则名称', '源标签', '目标标签', '相等标签']),
      actionLabels: ['刷新', '新增抑制', '批量删除', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/alert/inhibit/page.test.tsx components/pages/alert-inhibit-surface.test.tsx components/pages/alert-inhibit-authoring-fields.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/alert-inhibit/controller.test.ts lib/alert-inhibit/query-state.test.ts lib/alert-inhibit/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('alert-family', 'alert-inhibit').textSnippets).not.toContain('Inhibit');
    expect(getParityRoutePair('alert-family', 'alert-inhibit').textSnippets).not.toContain('当前抑制');
    expect(getParityRoutePair('alert-family', 'alert-inhibit').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('alert-family', 'alert-inhibit').primarySelectors.join(' ')).not.toContain('angular-table');
  });

  it('tracks the setting root through the shared settings console shell contracts instead of a route-matrix smoke fallback', () => {
    expect(getParityRoutePair('setting-family', 'setting-root')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="otlp-cold-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-console-header="cold-compact-header"]',
        '[data-settings-console-main="cold-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="cold-settings-content"]',
        '[data-setting-config-surface="otlp-cold-system-config"]',
        '[data-setting-config-style-baseline="hertzbeat-cold-matte"]',
        '[data-setting-config-form="cold-settings-form"]',
        '[data-setting-config-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining(['设置', '系统配置', '系统语言', '系统时区', '系统主题', '确认更新']),
      actionLabels: ['确认更新'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="otlp-cold-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-console-header="cold-compact-header"]',
        '[data-settings-console-main="cold-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="cold-settings-content"]',
        '[data-setting-config-surface="otlp-cold-system-config"]',
        '[data-setting-config-style-baseline="hertzbeat-cold-matte"]',
        '[data-setting-config-form="cold-settings-form"]',
        '[data-setting-config-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        '设置',
        '把系统配置、消息通道和接入凭证放在一起',
        '系统配置',
        '系统语言',
        '系统时区',
        '系统主题',
        '确认更新'
      ]),
      actionLabels: ['确认更新'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="otlp-cold-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-console-main="cold-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="cold-settings-content"]',
        '[data-setting-object-store-page="otlp-cold-object-store"]',
        '[data-setting-object-store-style-baseline="hertzbeat-cold-matte"]',
        '[data-setting-object-store-form="cold-settings-form"]',
        '[data-setting-object-store-provider="cold-provider-select"]',
        '[data-setting-object-store-actions="standard-equal-buttons"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'form',
        'select',
        'button'
      ]),
      textSnippets: expect.arrayContaining([
        '文件服务配置',
        '文件服务提供商',
        '本地数据库（默认）',
        '本地文件',
        '华为云OBS',
        '确认更新'
      ]),
      actionLabels: ['确认更新'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="otlp-cold-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-console-main="cold-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="cold-settings-content"]',
        '[data-settings-server-page="otlp-cold-message-server"]',
        '[data-settings-server-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-server-summary="cold-summary-list"]',
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
        '消息服务配置',
        '邮件服务器',
        '短信配置',
        '邮箱服务器地址',
        '是否启用SSL',
        '短信类型',
        '腾讯短信',
        '启用状态'
      ]),
      actionLabels: ['配置'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-settings-console-surface="otlp-cold-settings-console"]',
        '[data-settings-console-style-baseline="hertzbeat-cold-matte"]',
        '[data-settings-console-main="cold-settings-workspace"]',
        '[data-settings-console-menu="cold-static-list"]',
        '[data-settings-console-content="cold-settings-content"]',
        '[data-setting-token-surface="otlp-cold-token-console"]',
        '[data-setting-token-style-baseline="hertzbeat-cold-matte"]',
        '[data-setting-token-layout-contract="full-width-admin-no-rail"]',
        '[data-setting-token-header="cold-compact-header"]',
        '[data-setting-token-command-row="standard-equal-buttons"]',
        '[data-setting-token-admin-layout="full-width-admin-list"]',
        '[data-setting-token-strip="cold-token-strip"]',
        '[data-setting-token-strip-style="cold-inline-counts"]',
        '[data-setting-token-table-panel="cold-dense-table"]',
        '[data-setting-token-table="cold-token-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'table'
      ]),
      textSnippets: expect.arrayContaining([
        '令牌管理',
        'API 密钥',
        '统一管理遥测和自动化令牌',
        '生成令牌',
        '令牌总数',
        '可用令牌',
        '过期令牌',
        'Token 名称',
        'Token 值',
        '创建者',
        '操作'
      ]),
      actionLabels: ['生成令牌'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/settings/token/page.test.tsx components/settings/settings-console-shell.test.tsx components/shell/app-frame.chrome.test.tsx components/shell/platform-copyright-footer.test.tsx lib/setting-token/controller.test.ts lib/setting-token/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-token').textSnippets).not.toContain('Token management');
    expect(getParityRoutePair('setting-family', 'setting-token').actionLabels).not.toContain('Generate token');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-settings-console-surface="angular-page-shell"]');
    expect(getParityRoutePair('setting-family', 'setting-token').textSnippets).not.toContain('API Keys');
    expect(getParityRoutePair('setting-family', 'setting-token').textSnippets).not.toContain('令牌摘要');
    expect(getParityRoutePair('setting-family', 'setting-token').actionLabels).not.toContain('生成 Token');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-surface="angular-token-console"]');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-token').primarySelectors).not.toContain('[data-setting-token-table="angular-token-table"]');
  });

  it('tracks collector management through the cold-matte dense admin/list route contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-collector')).toMatchObject({
      locale: 'zh-CN',
      primarySelectors: expect.arrayContaining([
        '[data-collector-manage-surface="otlp-cold-collector-console"]',
        '[data-collector-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-collector-header="cold-compact-header"]',
        '[data-collector-command-row="standard-equal-buttons"]',
        '[data-collector-admin-layout="full-width-admin-list"]',
        '[data-collector-toolbar="cold-table-toolbar"]',
        '[data-collector-table-shell="cold-dense-table"]',
        '[data-collector-manage-table="cold-collector-table"]',
        'main',
        'button',
        'input',
        'table'
      ]),
      textSnippets: expect.arrayContaining(['采集集群', '采集器名称', '运行状态', '运行模式', '总任务数量', '固定任务', '调度任务', '操作']),
      actionLabels: ['刷新', '部署采集器', '上线采集器', '下线采集器', '删除采集器', '搜索'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-setting-define-surface="otlp-cold-define-console"]',
        '[data-setting-define-style-baseline="hertzbeat-cold-matte"]',
        '[data-setting-define-header="cold-compact-header"]',
        '[data-setting-define-command-row="standard-equal-buttons"]',
        '[data-setting-define-workspace="cold-define-workspace"]',
        '[data-setting-define-menu="cold-static-list"]',
        '[data-setting-define-toolbar="cold-search-row"]',
        '[data-setting-define-menu-shell="cold-dense-list"]',
        '[data-setting-define-editor="cold-settings-form"]',
        '[data-setting-define-editor-shell="cold-yaml-editor"]',
        '[data-setting-define-editor-field="cold-code-editor"]',
        '[data-setting-define-code-editor="monitor-template-yaml"]',
        'main',
        'button',
        'input'
      ]),
      textSnippets: expect.arrayContaining(['定义', '管理监控模板 YAML']),
      actionLabels: ['新增类型', '编辑', '取消', '保存并应用', '搜索', '隐藏', '显示'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/define/page.test.tsx components/pages/setting-define-surface.test.tsx lib/setting-define/controller.test.ts lib/setting-define/query-state.test.ts lib/setting-define/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-define').primarySelectors).not.toContain('[data-setting-define-surface="true"]');
    expect(getParityRoutePair('setting-family', 'setting-define').primarySelectors).not.toContain('[data-setting-define-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-define').textSnippets).not.toContain('Define');
    expect(getParityRoutePair('setting-family', 'setting-define').actionLabels).not.toContain('New Monitor Type');
    expect(getParityRoutePair('setting-family', 'setting-define').textSnippets).not.toContain('数据源状态');
    expect(getParityRoutePair('setting-family', 'setting-define').actionLabels).not.toContain('预览查询');
  });

  it('pins label management to the OTLP cold-matte dense admin/list contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-labels')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-label-manage-surface="otlp-cold-label-console"]',
        '[data-label-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-label-header="cold-compact-header"]',
        '[data-label-command-row="standard-equal-buttons"]',
        '[data-label-admin-layout="full-width-admin-list"]',
        '[data-label-toolbar="cold-table-toolbar"]',
        '[data-label-table-shell="cold-dense-table"]',
        '[data-label-table="cold-label-table"]',
        '[data-label-empty-state="cold-table-empty"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['标签管理', '新增', '搜索标签', '标签名称', '标签类型', '标签描述']),
      actionLabels: ['新增', '搜索'],
      minimumVerificationCommand:
        'npm exec vitest run app/setting/labels/page.test.tsx components/pages/label-manage-surface.test.tsx lib/label-manage/controller.test.ts lib/label-manage/query-state.test.ts lib/label-manage/view-model.test.ts lib/parity/route-manifest.test.ts'
    });
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-summary-rail="cold-static-rail"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-manage-route="angular-label-cards"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').primarySelectors).not.toContain('[data-label-card-shell="angular-card"]');
    expect(getParityRoutePair('setting-family', 'setting-labels').textSnippets).not.toContain('Label');
    expect(getParityRoutePair('setting-family', 'setting-labels').actionLabels).not.toContain('Refresh');
    expect(getParityRoutePair('setting-family', 'setting-labels').actionLabels).not.toContain('New');
    expect(getParityRoutePair('setting-family', 'setting-labels').actionLabels).not.toContain('Search');
  });

  it('pins plugin management to the OTLP cold-matte dense admin/list contract', () => {
    expect(getParityRoutePair('setting-family', 'setting-plugins')).toMatchObject({
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-plugin-manage-surface="otlp-cold-plugin-console"]',
        '[data-plugin-manage-style-baseline="hertzbeat-cold-matte"]',
        '[data-plugin-header="cold-compact-header"]',
        '[data-plugin-command-row="standard-equal-buttons"]',
        '[data-plugin-admin-layout="full-width-admin-list"]',
        '[data-plugin-manage-toolbar="cold-table-toolbar"]',
        '[data-plugin-manage-table-shell="cold-dense-table"]',
        '[data-plugin-manage-table="cold-plugin-table"]',
        '[data-plugin-manage-empty-state="cold-table-empty"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table'
      ]),
      textSnippets: expect.arrayContaining(['插件管理', '插件名称', '插件类型', '启用状态', '操作', '暂无数据']),
      actionLabels: ['上传插件', '搜索'],
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
      locale: 'zh-CN',
      screenshotMode: 'viewport',
      primarySelectors: expect.arrayContaining([
        '[data-status-setting-surface="otlp-cold-status-console"]',
        '[data-status-setting-style-baseline="hertzbeat-cold-matte"]',
        '[data-status-header="cold-compact-header"]',
        '[data-status-command-row="standard-equal-buttons"]',
        '[data-status-admin-layout="full-width-admin-list"]',
        '[data-status-org-form="cold-settings-form"]',
        '[data-status-tabs="cold-segmented-tabs"]',
        '[data-status-component-toolbar="cold-table-toolbar"]',
        '[data-status-component-table-shell="cold-dense-table"]',
        '[data-status-component-table="cold-component-table"]',
        '[data-platform-footer="angular-footer"]',
        '[data-shell-ai-chat-launcher="angular-ai-chat"]',
        'main',
        'button',
        'input',
        'table',
        'a'
      ]),
      textSnippets: expect.arrayContaining(['状态页面', '组织名称', '组织介绍', '服务组件', '维护事件', '组件状态', '状态统计方式', '匹配标签', '操作']),
      actionLabels: ['确定', '新增组件'],
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
      actionLabels: ['返回概览', '日志工作台', '链路工作台'],
      minimumVerificationCommand:
        "npm exec vitest run 'app/exception/[type]/page.test.tsx' components/pages/exception-center-surface.test.tsx lib/exception-center/view-model.test.ts lib/parity/route-manifest.test.ts"
    });
  });

  it('tracks the 404 exception route through a targeted route test plus the shared exception surface contract', () => {
    expect(getParityRoutePair('auth-public-family', 'exception-404')).toMatchObject({
      nextRoute: '/exception/404',
      referenceRoute: '/exception/404',
      primarySelectors: expect.arrayContaining(['[data-exception-center-surface="true"]', 'main', 'aside', 'a']),
      actionLabels: ['返回概览', '日志工作台', '链路工作台'],
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
      textSnippets: expect.arrayContaining(['异常中心', '筛选', '运行查询', 'ECONNRESET', '应用']),
      actionLabels: ['运行查询', '返回概览', '日志工作台', '链路工作台'],
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
