import { getParityFamily, getParityRoutePair } from './route-manifest';

export const ROUTE_PARITY_VIEWPORTS = [
  {
    key: 'desktop',
    width: 1440,
    height: 960
  },
  {
    key: 'mobile',
    width: 390,
    height: 844
  }
] as const;

export const REQUIRED_ROUTE_PARITY_REGION_KEYS = [
  'header',
  'factsStrip',
  'toolbarQueryRow',
  'stageSection',
  'rail',
  'summaryMetrics',
  'tableListRow',
  'drawerDetailPanel'
] as const;

export type RouteParityArchetype =
  | 'dashboard-home'
  | 'explorer-workbench'
  | 'list-detail'
  | 'settings-admin';

export type RouteParityRegionKey = (typeof REQUIRED_ROUTE_PARITY_REGION_KEYS)[number];
export type RouteParityRegionExpectation = 'present' | 'conditional' | 'absent';
export type RouteParityViewport = (typeof ROUTE_PARITY_VIEWPORTS)[number];

export type RouteParityReferenceSource = {
  kind: 'angular-live' | 'angular-archive';
  templatePaths: string[];
  sharedComponentPaths: string[];
  sharedStylePaths: string[];
  screenshotPaths: string[];
  auditPaths: string[];
  archiveRecordPath?: string;
  lastKnownTemplateCommit?: string;
};

export type RouteParityMustMatchRegion = {
  key: RouteParityRegionKey;
  expectation: RouteParityRegionExpectation;
  referenceHint: string;
};

export type RouteParitySpec = {
  key: string;
  archetype: RouteParityArchetype;
  familyKey: string;
  routePairKey: string;
  nextRoute: string;
  referenceRoute: string;
  nextPagePath?: string;
  routeTestPath?: string;
  minimumVerificationCommand: string;
  familyVerificationCommand: string;
  referenceSource: RouteParityReferenceSource;
  viewports: readonly RouteParityViewport[];
  fixtureState: string;
  mustMatchRegions: RouteParityMustMatchRegion[];
  allowedDrift: {
    hierarchy: 'none';
    chrome: 'token-only';
    responsiveWrap: 'allowed';
    copy: 'fixture-only';
  };
};

const DEFAULT_ALLOWED_DRIFT = {
  hierarchy: 'none',
  chrome: 'token-only',
  responsiveWrap: 'allowed',
  copy: 'fixture-only'
} as const;

function buildMustMatchRegions(
  hints: Record<RouteParityRegionKey, { expectation: RouteParityRegionExpectation; referenceHint: string }>
) {
  return REQUIRED_ROUTE_PARITY_REGION_KEYS.map(key => ({
    key,
    expectation: hints[key].expectation,
    referenceHint: hints[key].referenceHint
  }));
}

function buildRouteParitySpec(
  spec: Omit<
    RouteParitySpec,
    'nextRoute' | 'referenceRoute' | 'nextPagePath' | 'routeTestPath' | 'minimumVerificationCommand' | 'familyVerificationCommand'
  >
): RouteParitySpec {
  const routePair = getParityRoutePair(spec.familyKey, spec.routePairKey);
  const family = getParityFamily(spec.familyKey);

  if (!family.familyVerificationCommand) {
    throw new Error(`Route parity spec ${spec.key} requires a family verification command for ${spec.familyKey}.`);
  }

  return {
    ...spec,
    nextRoute: routePair.nextRoute,
    referenceRoute: routePair.referenceRoute,
    nextPagePath: routePair.nextPagePath,
    routeTestPath: routePair.routeTestPath,
    minimumVerificationCommand: routePair.minimumVerificationCommand,
    familyVerificationCommand: family.familyVerificationCommand
  };
}

export const ROUTE_PARITY_SPECS: RouteParitySpec[] = [
  buildRouteParitySpec({
    key: 'overview-home',
    archetype: 'dashboard-home',
    familyKey: 'three-signal-desk',
    routePairKey: 'overview-desk',
    referenceSource: {
      kind: 'angular-live',
      templatePaths: ['web-app/src/app/routes/dashboard/dashboard.component.html'],
      sharedComponentPaths: [
        'web-app/src/app/shared/components/workspace-shell/workspace-shell.component.html',
        'web-app/src/app/shared/components/platform-facts-strip/platform-facts-strip.component.html',
        'web-app/src/app/shared/components/platform-stage-section/platform-stage-section.component.html',
        'web-app/src/app/shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component.html',
        'web-app/src/app/shared/components/platform-support-panel/platform-support-panel.component.html',
        'web-app/src/app/shared/components/platform-rail-nav/platform-rail-nav.component.html'
      ],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: [
        'docs/research/signoz-cloud-ux/screenshots/01-home-empty.png',
        'docs/research/signoz-cloud-ux/screenshots/38-home-still-empty-after-data.png'
      ],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/retirement-audits/dashboard-overview.md'
      ]
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState: 'authenticated overview workspace with readiness, focus cards, quick entry, and active right rail',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'workspace shell title, subtitle, and header actions stay attached to the overview shell'
      },
      factsStrip: {
        expectation: 'present',
        referenceHint: 'top readiness or status strip stays immediately under the header'
      },
      toolbarQueryRow: {
        expectation: 'absent',
        referenceHint: 'dashboard/home should not gain an explorer-style query toolbar between header and first stage'
      },
      stageSection: {
        expectation: 'present',
        referenceHint: 'problem focus and quick-entry sections stay grouped as the primary central stages'
      },
      rail: {
        expectation: 'present',
        referenceHint: 'right readiness or guidance rail remains attached to the shell instead of floating as a detached card'
      },
      summaryMetrics: {
        expectation: 'present',
        referenceHint: 'summary metrics remain grouped as a dedicated grid instead of ad hoc inline badges'
      },
      tableListRow: {
        expectation: 'conditional',
        referenceHint: 'list-like activity rows may appear in supporting sections but should not replace the dashboard stages'
      },
      drawerDetailPanel: {
        expectation: 'absent',
        referenceHint: 'overview should not introduce a trace-style detail drawer as part of its base layout'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  }),
  buildRouteParitySpec({
    key: 'otlp-center',
    archetype: 'explorer-workbench',
    familyKey: 'three-signal-desk',
    routePairKey: 'otlp-center-desk',
    referenceSource: {
      kind: 'angular-live',
      templatePaths: ['web-app/src/app/routes/ingestion/otlp-center/otlp-center.component.html'],
      sharedComponentPaths: [
        'web-app/src/app/shared/components/workspace-shell/workspace-shell.component.html',
        'web-app/src/app/shared/components/platform-facts-strip/platform-facts-strip.component.html',
        'web-app/src/app/shared/components/platform-stage-meta-header/platform-stage-meta-header.component.html',
        'web-app/src/app/shared/components/platform-stage-section/platform-stage-section.component.html',
        'web-app/src/app/shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component.html',
        'web-app/src/app/shared/components/platform-support-panel/platform-support-panel.component.html',
        'web-app/src/app/shared/components/platform-support-action-bar/platform-support-action-bar.component.html',
        'web-app/src/app/shared/components/platform-context-chip-bar/platform-context-chip-bar.component.html',
        'web-app/src/app/shared/components/platform-drawer-code-preview/platform-drawer-code-preview.component.html'
      ],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: [
        'docs/research/signoz-cloud-ux/screenshots/07-connect-data-source.png',
        'docs/research/signoz-cloud-ux/screenshots/08-demo-data-quickstart.png'
      ],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/retirement-audits/otlp-center.md'
      ]
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState: 'authenticated OTLP onboarding workspace with token guidance, bindings, and recent entities',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'workspace shell title and jump actions stay above onboarding content'
      },
      factsStrip: {
        expectation: 'present',
        referenceHint: 'intake readiness facts remain as the first compact strip under the header'
      },
      toolbarQueryRow: {
        expectation: 'absent',
        referenceHint: 'OTLP onboarding is stage-led and should not gain a log or trace query toolbar'
      },
      stageSection: {
        expectation: 'present',
        referenceHint: 'signals, overview, guide, snippet, and binding areas remain stage sections instead of unrelated cards'
      },
      rail: {
        expectation: 'present',
        referenceHint: 'support rail actions stay attached to the workspace shell'
      },
      summaryMetrics: {
        expectation: 'present',
        referenceHint: 'overview metrics remain a dedicated summary grid inside the onboarding stage'
      },
      tableListRow: {
        expectation: 'conditional',
        referenceHint: 'recent entities and samples may render as structured rows, but stay inside the shared stage grammar'
      },
      drawerDetailPanel: {
        expectation: 'conditional',
        referenceHint: 'code previews and snippet details can expand, but should still read as the same OTLP workbench family'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  }),
  buildRouteParitySpec({
    key: 'trace-manage',
    archetype: 'explorer-workbench',
    familyKey: 'three-signal-desk',
    routePairKey: 'trace-manage-desk',
    referenceSource: {
      kind: 'angular-archive',
      templatePaths: ['web-app/src/app/routes/trace/trace-center/trace-center.component.html'],
      sharedComponentPaths: [
        'web-app/src/app/shared/components/workspace-shell/workspace-shell.component.html',
        'web-app/src/app/shared/components/platform-context-chip-bar/platform-context-chip-bar.component.html',
        'web-app/src/app/shared/components/platform-facts-strip/platform-facts-strip.component.html',
        'web-app/src/app/shared/components/platform-stage-section/platform-stage-section.component.html',
        'web-app/src/app/shared/components/platform-stage-insight-list/platform-stage-insight-list.component.html',
        'web-app/src/app/shared/components/platform-support-panel/platform-support-panel.component.html',
        'web-app/src/app/shared/components/platform-drawer-shell/platform-drawer-shell.component.html',
        'web-app/src/app/shared/components/platform-drawer-facts/platform-drawer-facts.component.html',
        'web-app/src/app/shared/components/platform-drawer-action-links/platform-drawer-action-links.component.html',
        'web-app/src/app/shared/components/platform-drawer-code-preview/platform-drawer-code-preview.component.html'
      ],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: [
        'docs/research/signoz-cloud-ux/screenshots/05-traces-explorer-empty.png',
        'docs/research/signoz-cloud-ux/screenshots/22-traces-7d.png',
        'docs/research/signoz-cloud-ux/screenshots/25-trace-detail.png',
        'docs/research/signoz-cloud-ux/screenshots/26-trace-related-logs.png',
        'docs/research/signoz-cloud-ux/screenshots/27-trace-related-metrics.png',
        'docs/research/signoz-cloud-ux/screenshots/28-open-in-logs-explorer.png'
      ],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/parity/trace-manage-archive.md',
        'web-next/docs/retirement-audits/trace-manage.md'
      ],
      archiveRecordPath: 'web-next/docs/parity/trace-manage-archive.md',
      lastKnownTemplateCommit: '4ffc07adb'
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState: 'authenticated seeded trace workbench with selected trace, waterfall focus, and related-signal detail drawer',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'trace workspace shell preserves the title, return action, and header context'
      },
      factsStrip: {
        expectation: 'present',
        referenceHint: 'trace workbench facts stay above filters and detail stages'
      },
      toolbarQueryRow: {
        expectation: 'present',
        referenceHint: 'query controls remain a dedicated two-row toolbar before the chart and list stages'
      },
      stageSection: {
        expectation: 'present',
        referenceHint: 'overview chart stage and trace list stage stay stacked in the main investigation lane'
      },
      rail: {
        expectation: 'present',
        referenceHint: 'workspace rail and related guidance stay attached to the shell instead of drifting into local cards'
      },
      summaryMetrics: {
        expectation: 'present',
        referenceHint: 'selected-trace facts and overview insights remain grouped summaries, not scattered badges'
      },
      tableListRow: {
        expectation: 'present',
        referenceHint: 'trace rows keep the list-table rhythm that precedes detail loading'
      },
      drawerDetailPanel: {
        expectation: 'present',
        referenceHint: 'the fullscreen drawer remains the canonical detail panel for waterfall, related logs, and metrics'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  }),
  buildRouteParitySpec({
    key: 'alert-group',
    archetype: 'list-detail',
    familyKey: 'alert-family',
    routePairKey: 'alert-group',
    referenceSource: {
      kind: 'angular-live',
      templatePaths: ['web-app/src/app/routes/alert/alert-group/alert-group-converge.component.html'],
      sharedComponentPaths: [
        'web-app/src/app/shared/components/page-shell/page-shell.component.html',
        'web-app/src/app/shared/components/toolbar/toolbar.component.html',
        'web-app/src/app/shared/components/multi-func-input/multi-func-input.component.html'
      ],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: ['docs/research/signoz-cloud-ux/screenshots/02-alerts-empty.png'],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/retirement-audits/alert-group.md'
      ]
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState: 'authenticated alert-group management list with seeded rows and authoring modal available',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'page shell header holds the route title without inventing a dashboard hero'
      },
      factsStrip: {
        expectation: 'absent',
        referenceHint: 'alert-group stays task-driven and should not gain a synthetic observability facts strip'
      },
      toolbarQueryRow: {
        expectation: 'present',
        referenceHint: 'refresh, new, bulk actions, search input, and submit stay grouped in the toolbar row'
      },
      stageSection: {
        expectation: 'absent',
        referenceHint: 'list-detail management should not be restyled into trace or OTLP stage sections'
      },
      rail: {
        expectation: 'absent',
        referenceHint: 'the route stays single-lane unless a future detail affordance is explicitly introduced'
      },
      summaryMetrics: {
        expectation: 'absent',
        referenceHint: 'alert-group does not expose a summary-metric grid in the Angular truth'
      },
      tableListRow: {
        expectation: 'present',
        referenceHint: 'the table row remains the primary list grammar for management actions'
      },
      drawerDetailPanel: {
        expectation: 'conditional',
        referenceHint: 'authoring lives in a modal-style detail surface and should stay secondary to the table'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  }),
  buildRouteParitySpec({
    key: 'monitor-detail-reported',
    archetype: 'list-detail',
    familyKey: 'monitor-family',
    routePairKey: 'monitor-detail-reported',
    referenceSource: {
      kind: 'angular-live',
      templatePaths: [
        'web-app/src/app/routes/monitor/monitor-detail/monitor-detail.component.html',
        'web-app/src/app/routes/monitor/monitor-data-table/monitor-data-table.component.html'
      ],
      sharedComponentPaths: [
        'web-app/src/app/shared/components/page-shell/page-shell.component.html',
        'web-app/src/app/shared/components/platform-facts-strip/platform-facts-strip.component.html',
        'web-app/src/app/shared/components/platform-stage-section/platform-stage-section.component.html',
        'web-app/src/app/shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component.html',
        'web-app/src/app/shared/components/platform-context-chip-bar/platform-context-chip-bar.component.html'
      ],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: [],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/retirement-audits/monitor-detail.md'
      ]
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState:
      'authenticated website monitor detail workbench with reported seeded monitor, realtime tab, compact metric surface, and signal rows',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'monitor detail page shell preserves the return context, title, and edit/help actions'
      },
      factsStrip: {
        expectation: 'present',
        referenceHint: 'basic monitor facts remain the first compact strip under the header'
      },
      toolbarQueryRow: {
        expectation: 'present',
        referenceHint: 'realtime/history/favorite/grafana tabs and refresh controls stay grouped before the tab body'
      },
      stageSection: {
        expectation: 'present',
        referenceHint: 'basic information, realtime metric, and signal areas stay as flat Angular detail stages'
      },
      rail: {
        expectation: 'conditional',
        referenceHint: 'return context and definition/help links may attach as route context, but must not become nested cards'
      },
      summaryMetrics: {
        expectation: 'present',
        referenceHint: 'monitor identity, status, app, and scrape details remain grouped facts instead of scattered badges'
      },
      tableListRow: {
        expectation: 'present',
        referenceHint: 'metric signal rows keep the list rhythm from the Angular realtime summary'
      },
      drawerDetailPanel: {
        expectation: 'absent',
        referenceHint: 'the default realtime tab should not open with a drawer or deep inspector panel'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  }),
  buildRouteParitySpec({
    key: 'setting-system-config',
    archetype: 'settings-admin',
    familyKey: 'setting-family',
    routePairKey: 'setting-system-config',
    referenceSource: {
      kind: 'angular-live',
      templatePaths: [
        'web-app/src/app/routes/setting/settings/settings.component.html',
        'web-app/src/app/routes/setting/settings/system-config/system-config.component.html'
      ],
      sharedComponentPaths: ['web-app/src/app/shared/components/page-shell/page-shell.component.html'],
      sharedStylePaths: ['web-app/src/styles/observability-workbench.less'],
      screenshotPaths: ['docs/research/signoz-cloud-ux/screenshots/29-settings.png'],
      auditPaths: [
        'web-next/docs/parity/angular-truth-matrix.md',
        'web-next/docs/retirement-audits/system-config.md'
      ]
    },
    viewports: ROUTE_PARITY_VIEWPORTS,
    fixtureState: 'authenticated settings console with the left menu active and the system-config form loaded',
    mustMatchRegions: buildMustMatchRegions({
      header: {
        expectation: 'present',
        referenceHint: 'page shell kicker, title, and subtitle stay above the settings console layout'
      },
      factsStrip: {
        expectation: 'absent',
        referenceHint: 'system config should remain a form-led admin page instead of gaining operator facts chrome'
      },
      toolbarQueryRow: {
        expectation: 'absent',
        referenceHint: 'settings/admin keeps form actions local to the form rather than a global query toolbar'
      },
      stageSection: {
        expectation: 'absent',
        referenceHint: 'settings/admin stays menu plus form, not multi-stage investigation sections'
      },
      rail: {
        expectation: 'present',
        referenceHint: 'the left settings menu is the canonical rail for this archetype'
      },
      summaryMetrics: {
        expectation: 'absent',
        referenceHint: 'system config does not use a summary metric grid in the Angular truth'
      },
      tableListRow: {
        expectation: 'absent',
        referenceHint: 'the route is form-first and should not be normalized into list rows'
      },
      drawerDetailPanel: {
        expectation: 'absent',
        referenceHint: 'system config stays in-page; no drawer or detail overlay is part of the baseline shell'
      }
    }),
    allowedDrift: DEFAULT_ALLOWED_DRIFT
  })
];

export function getRouteParityArchetypes(): RouteParityArchetype[] {
  return [...new Set(ROUTE_PARITY_SPECS.map(spec => spec.archetype))];
}

export function getRouteParitySpec(key: string) {
  const spec = ROUTE_PARITY_SPECS.find(candidate => candidate.key === key);

  if (!spec) {
    throw new Error(`Unknown route parity spec: ${key}`);
  }

  return spec;
}

export function getRouteParitySpecForRoutePair(familyKey: string, routePairKey: string) {
  const spec = ROUTE_PARITY_SPECS.find(
    candidate => candidate.familyKey === familyKey && candidate.routePairKey === routePairKey
  );

  if (!spec) {
    throw new Error(`Unknown route parity spec for route pair: ${familyKey}/${routePairKey}`);
  }

  return spec;
}
