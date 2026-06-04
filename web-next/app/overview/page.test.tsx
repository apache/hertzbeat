import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

function createClientData() {
  return {
    summary: {
      apps: [
        { app: 'checkout', size: 4, availableSize: 3, unAvailableSize: 1, unManageSize: 0 },
        { app: 'payments', size: 2, availableSize: 2, unAvailableSize: 0, unManageSize: 0 }
      ]
    },
    alerts: {
      content: [
        {
          content: 'checkout latency spike',
          status: 'firing',
          creator: 'system',
          fingerprint: 'fp-1',
          triggerTimes: 3,
          gmtUpdate: 1713201000000,
          gmtCreate: 1713200000000,
          labels: {
            severity: 'critical',
            service: 'checkout',
            traceId: 'trace-123',
            namespace: 'payments',
            app: 'checkout',
            cluster: 'prod'
          },
          annotations: { summary: 'Latency high' }
        }
      ]
    },
    alertSummary: {
      total: 5,
      criticalNum: 2,
      warningNum: 3
    }
  };
}

function createOverviewViewModel() {
  return {
    showSetupGuide: false,
    summaryCards: [
      { key: 'critical', label: 'High-priority alerts', value: '1', hint: 'Needs attention', delta: 'Critical pressure is still active', tone: 'danger' },
      { key: 'unassigned', label: 'Unassigned Issues', value: '0', hint: 'Every issue has an owner', delta: 'Every issue has an owner right now', tone: 'success' },
      { key: 'degraded', label: 'Affected items', value: '1', hint: 'Start with collection issues', delta: '1 items still need attention', tone: 'warning' }
    ],
    problemFocus: {
      title: 'checkout latency spike',
      severity: 'critical',
      severityLabel: 'Critical',
      severityTone: 'danger',
      entity: 'checkout',
      owner: 'Platform',
      summary: 'Latency high'
    },
    trendCards: [
      { label: 'Alert Trend', value: '1', insight: 'Check alert pressure.', tone: 'danger' }
    ],
    impactedEntities: [
      { name: 'checkout', type: 'service', severity: 'critical', severityLabel: 'Critical', severityTone: 'danger', owner: 'Platform', status: 'impacted', statusLabel: 'Impacted', lastIssue: 'Latency high' }
    ],
    activityItems: [
      { title: 'checkout latency spike', detail: 'Platform · checkout', timestamp: '2026-04-16 22:00:00', tone: 'danger', tag: 'Firing' }
    ],
    coverageItems: [
      { label: 'service', total: '6 total', healthy: '5 healthy', abnormal: '1 abnormal' }
    ],
    workspaceReadyFacts: [
      { label: 'Entities in scope', value: '6' },
      { label: 'Current alerts', value: '1' },
      { label: 'Unassigned issues', value: '0' }
    ],
    workspaceStatusItems: [
      { key: 'workspace', label: 'Workspace', value: 'Ready', ready: true }
    ],
    checklistItems: [
      { key: 'logs', label: 'Review logs', ready: true }
    ],
    quickEntryItems: [
      { label: 'Open Object Directory', copy: 'Start from objects before deciding which signal workbench to dive into.', route: '/entities' },
      { label: 'Logs', copy: 'Keep the current time range and continue in logs.', route: '/log/manage' },
      { label: 'Traces', copy: 'Continue in traces with the current incident focus.', route: '/trace/manage' },
      { label: 'Open Metrics Workbench', copy: 'Inspect metrics with the same current scope.', route: '/ingestion/otlp/metrics' },
      { label: 'Open Dashboards', copy: 'Switch back to the global overview and compare this object with the wider workspace.', route: '/dashboard' }
    ],
    guidanceHeadline: 'Next: work the most important issue first',
    guidanceDescription: 'Start with the current issue and review related entities and signals.',
    guidanceReasons: [
      { label: 'Entities in scope', value: '6' }
    ],
    guidanceNextLinks: [
      { label: 'Open Object Directory', description: 'Start from objects before deciding which signal workbench to dive into.', route: '/entities' },
      { label: 'Logs', description: 'Keep the current time range and continue in logs.', route: '/log/manage' },
      { label: 'Traces', description: 'Continue in traces with the current incident focus.', route: '/trace/manage' }
    ]
  };
}

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  clientData: createClientData(),
  viewModel: createOverviewViewModel(),
  queryClient: {
    fetchQuery: vi.fn(async ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn())
  }
}));

const apiMessageGet = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy}>
        {children(mockState.clientData)}
      </div>
    );
  }
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockState.queryClient
}));

vi.mock('../../components/workbench/primitives', () => ({
  WorkbenchPanel: ({ as: Component = 'div', children, ...props }: any) => <Component {...props}>{children}</Component>
}));

vi.mock('@/components/observability', () => ({
  ObservabilityStatusState: ({ title, copy }: any) => <div data-status-state="true">{title}{copy}</div>,
  StageSection: ({ title, description, actions, children }: any) => (
    <section data-stage-section="true">
      <h2>{title}</h2>
      <p>{description}</p>
      <div data-stage-actions="true">{actions}</div>
      {children}
    </section>
  ),
  SupportPanel: ({ title, subtitle, children, chrome = 'default', tone = 'operator' }: any) => (
    <section data-support-panel="true" data-support-panel-chrome={chrome} data-support-panel-tone={tone}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {children}
    </section>
  )
}));

vi.mock('@/components/overview/overview-console', () => ({
  OverviewActivityTimeline: ({ title, items }: any) => <section data-overview-activity="true">{title}|{items.map((item: any) => item.title).join('|')}</section>,
  OverviewChecklist: ({ title, items, density = 'default' }: any) => (
    <section data-overview-checklist="true" data-overview-checklist-density={density}>
      {title}|{items.map((item: any) => `${item.label}:${item.ready ? 'Ready' : 'Pending'}`).join('|')}
    </section>
  ),
  OverviewCoverageList: ({ title, items }: any) => <section data-overview-coverage="true">{title}|{items.map((item: any) => item.label).join('|')}</section>,
  OverviewGuidancePanel: ({
    headline,
    description,
    reasons = [],
    nextLinks,
    primaryAction,
    secondaryAction,
    compactReasons = false,
    reasonDensity = 'default',
    density = 'default'
  }: any) => (
    <section
      data-overview-guidance="true"
      data-overview-guidance-density={density}
      data-overview-guidance-reasons-layout={compactReasons ? 'pill-row' : 'grid'}
      data-overview-guidance-reasons-density={reasonDensity}
    >
      <span data-overview-guidance-prefix="true">
        {headline}|{description}|{nextLinks.map((item: any) => `${item.label}:${item.href}`).join('|')}
      </span>
      <span data-overview-guidance-reasons="true">
        {reasons.map((item: any) => `${item.label}:${item.value}`).join('|')}
      </span>
      <div data-overview-guidance-actions="true">
        {primaryAction}
        {secondaryAction}
      </div>
    </section>
  ),
  OverviewImpactedList: ({ title, items, onOpenItem, baseHref = '/entities' }: any) => (
    <section data-overview-impacted="true">
      {title}|
      {items.map((item: any) =>
        onOpenItem ? (
          <button key={item.name} type="button">
            {item.name}
          </button>
        ) : (
          <a key={item.name} href={`${baseHref}?app=${encodeURIComponent(item.name)}`}>
            {item.name}
          </a>
        )
      )}
    </section>
  ),
  OverviewQuickEntryGrid: ({ title, items }: any) => (
    <section data-overview-quick-links="true">{title}|{items.map((item: any) => `${item.label}:${item.route}`).join('|')}</section>
  ),
  OverviewSectionAction: ({ label, href, onClick }: any) =>
    onClick ? <button type="button" onClick={onClick}>{label}</button> : <a href={href}>{label}</a>,
  OverviewStatusGrid: ({ items, action, density = 'default' }: any) => (
    <section data-overview-status-grid="true" data-overview-status-density={density}>
      {items.map((item: any) => `${item.label}:${item.value}`).join('|')}
      {action}
    </section>
  ),
  OverviewSummaryGrid: ({ items, onSelect }: any) => (
    <section data-overview-summary-grid="true">
      {items.map((item: any) =>
        onSelect ? (
          <button key={item.key} type="button">
            {item.label}
          </button>
        ) : (
          item.label
        )
      )}
    </section>
  ),
  OverviewTrendList: ({ items }: any) => <section data-overview-trends="true">{items.map((item: any) => item.label).join('|')}</section>,
  OverviewWorkspaceFacts: ({ items }: any) => <section data-overview-facts="true">{items.map((item: any) => item.label).join('|')}</section>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'button'
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-16 22:00:00'
}));

vi.mock('@/lib/overview/view-model', () => ({
  buildOverviewConsoleViewModel: () => mockState.viewModel,
  buildOverviewMetrics: () => ({
    totalEntities: 6,
    healthyEntities: 5,
    degradedEntities: 1,
    healthRatio: 83,
    activeAlerts: 1,
    criticalAlerts: 1,
    warningAlerts: 0
  }),
  buildInvestigationLanes: () => []
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
}));

beforeEach(() => {
  mockState.lastLoad = null;
  mockState.clientData = createClientData();
  mockState.viewModel = createOverviewViewModel();
  mockState.queryClient.fetchQuery.mockReset();
  mockState.queryClient.fetchQuery.mockImplementation(async ({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn());
  apiMessageGet.mockReset();
});

describe('overview page', () => {
  it('keeps overview remounts on a short settled cache window without bypassing refresh keys', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/overview/overview-page.tsx'), 'utf8');

    expect(source).toContain('OVERVIEW_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain('cacheSettledTtlMs={OVERVIEW_SETTLED_CACHE_TTL_MS}');
    expect(source).toContain('key={refreshNonce}');
    expect(source).toContain('cacheKey={overviewCacheKey}');
    expect(source).toContain('queryKeys.overview.console');
    expect(source).toContain('api.overview.summary()');
    expect(source).toContain('api.overview.alerts(OVERVIEW_ALERT_LIST_QUERY)');
    expect(source).toContain('resolveOverviewRenderData(data, lastReadyOverviewDataRef.current)');
    expect(source).toContain('data-overview-stale-ready-retained');
    expect(source).not.toContain("import { apiMessageGet } from '@/lib/api-client'");
  });

  it('renders the HertzBeat overview shell and keeps the expected data loader contract', async () => {
    apiMessageGet
      .mockResolvedValueOnce({ apps: [] })
      .mockResolvedValueOnce({ content: [] });

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);
    await mockState.lastLoad?.();

    expect(html).toContain('data-workspace-shell="true"');
    expect(html).toContain('data-workspace-shell-rail-width="wide"');
    expect(html).toContain('data-loading-copy="Loading overview console"');
    expect(html).toContain('checkout latency spike');
    expect(html).toContain('Refresh');
    expect(html).toContain('Review alerts');
    expect(html).toContain('data-overview-quick-links="true"');
    expect(html).toContain('<button type="button">High-priority alerts</button>');
    expect(html).toContain('data-overview-shell-chrome="plain-dark-workbench"');
    expect(html).toContain('rounded-none');
    expect(html).toContain('border-x-0');
    expect(html).toContain('border-b-0');
    expect(html).toContain('shadow-none');
    expect(html).toContain('data-overview-shell-main-owner="plain-dark-workbench"');
    expect(html).toContain('data-overview-shell-rail-owner="plain-dark-workbench"');
    expect(html).not.toContain('rounded-[10px]');
    expect(html).not.toContain('shadow-[var(--ops-panel-shadow)]');
    expect(html).toContain('<button type="button">checkout</button>');
    expect(html).not.toContain('/entities?app=checkout');
    expect(html).toContain('Open Metrics Workbench:/ingestion/otlp/metrics');
    expect(html).toContain('Open Dashboards:/dashboard');
    const quickLinkSectionMatch = html.match(/<section data-overview-quick-links="true">([^<]*)<\/section>/);
    const guidanceSectionMatch = html.match(/<span data-overview-guidance-prefix="true">([^<]*)<\/span>/);

    expect(quickLinkSectionMatch?.[1]).not.toContain('Open Object Directory:/entities');
    expect(quickLinkSectionMatch?.[1]).not.toContain('Logs:/log/manage');
    expect(quickLinkSectionMatch?.[1]).not.toContain('Traces:/trace/manage');
    expect(quickLinkSectionMatch?.[1]).toContain('Open Metrics Workbench:/ingestion/otlp/metrics');
    expect(quickLinkSectionMatch?.[1]).toContain('Open Dashboards:/dashboard');
    expect(quickLinkSectionMatch?.[1].match(/:\/(ingestion\/otlp\/metrics|dashboard)/g)).toHaveLength(2);
    expect(guidanceSectionMatch?.[1]).toContain('Open Object Directory:/entities');
    expect(guidanceSectionMatch?.[1]).toContain('Logs:/log/manage');
    expect(guidanceSectionMatch?.[1]).toContain('Traces:/trace/manage');
    expect(guidanceSectionMatch?.[1]).not.toContain('/ingestion/otlp/metrics');
    expect(guidanceSectionMatch?.[1]).not.toContain('/dashboard');
    expect(html).toContain('data-overview-activity="true"');
    expect(apiMessageGet.mock.calls).toEqual([
      ['/summary'],
      ['/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc']
    ]);
    expect(mockState.queryClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['overview', 'console', {
          summary: '/summary',
          alerts: '/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc',
          refreshNonce: 0
        }],
        staleTime: 5000
      })
    );
  }, 60000);

  it('keeps Angular forkJoin-style summary fallback when alerts still load', async () => {
    apiMessageGet
      .mockRejectedValueOnce(new Error('summary unavailable'))
      .mockResolvedValueOnce({
        content: [
          {
            id: 7,
            fingerprint: 'alert-7',
            content: 'collector timeout',
            status: 'firing',
            labels: { severity: 'warning', service: 'collector' }
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 6
      });

    const { default: OverviewPage } = await import('./page');
    renderToStaticMarkup(<OverviewPage />);

    await expect(mockState.lastLoad?.()).resolves.toMatchObject({
      summary: { apps: [] },
      alerts: { content: [{ fingerprint: 'alert-7' }] },
      summaryFailed: true,
      alertsFailed: false
    });
    expect(apiMessageGet.mock.calls).toEqual([
      ['/summary'],
      ['/alerts?pageIndex=0&pageSize=6&sort=gmtUpdate&order=desc']
    ]);
  }, 60000);

  it('keeps Angular forkJoin-style alert fallback when summary still loads', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        apps: [
          { app: 'api', category: 'service', size: 2, availableSize: 2, unAvailableSize: 0, unManageSize: 0 }
        ]
      })
      .mockRejectedValueOnce(new Error('alerts unavailable'));

    const { default: OverviewPage } = await import('./page');
    renderToStaticMarkup(<OverviewPage />);

    await expect(mockState.lastLoad?.()).resolves.toMatchObject({
      summary: { apps: [{ app: 'api' }] },
      alerts: { content: [], totalElements: 0, pageIndex: 0, pageSize: 6 },
      summaryFailed: false,
      alertsFailed: true
    });
  }, 60000);

  it('marks partial overview read fallback without changing the route shell', async () => {
    mockState.clientData = {
      ...createClientData(),
      summaryFailed: true
    };

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).toContain('data-overview-request-fallback="angular-partial-request-fallback"');
    expect(html).toContain('data-workspace-shell="true"');
  }, 60000);

  it('retains the previous ready overview data when a later refresh returns empty fallback data', async () => {
    const { hasOverviewReadyContext, resolveOverviewRenderData } = await import('./overview-page');
    const readyData = {
      summary: {
        apps: [
          { app: 'checkout', category: 'service', size: 4, availableSize: 3, unAvailableSize: 1, unManageSize: 0 }
        ]
      },
      alerts: {
        content: [
          {
            id: 7,
            fingerprint: 'alert-7',
            content: 'collector timeout',
            status: 'firing',
            labels: { severity: 'warning', service: 'collector' }
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 6
      }
    };
    const emptyFallbackData = {
      summary: { apps: [] },
      alerts: { content: [], totalElements: 0, pageIndex: 0, pageSize: 6 },
      summaryFailed: true,
      alertsFailed: true
    };

    expect(hasOverviewReadyContext(readyData)).toBe(true);
    expect(hasOverviewReadyContext(emptyFallbackData)).toBe(false);
    expect(resolveOverviewRenderData(readyData, null)).toEqual({
      renderData: readyData,
      nextReadyData: readyData,
      retainedReadyData: false
    });
    expect(resolveOverviewRenderData(emptyFallbackData, readyData)).toEqual({
      renderData: readyData,
      nextReadyData: readyData,
      retainedReadyData: true
    });
    expect(resolveOverviewRenderData(emptyFallbackData, null)).toEqual({
      renderData: emptyFallbackData,
      nextReadyData: null,
      retainedReadyData: false
    });
  }, 60000);

  it('keeps the populated overview rail focused on next-step guidance instead of rendering the duplicated workbench recap panel', async () => {
    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).toContain('data-overview-guidance="true"');
    expect(html).toContain('data-overview-checklist="true"');
    expect(html).not.toContain('data-support-panel="true"');
    expect(html).not.toContain('data-overview-facts="true"');
    expect(html).not.toContain('data-overview-trends="true"');
    expect(html).not.toContain('data-overview-coverage="true"');
  }, 60000);

  it('carries top-alert route context into the next signal desks from overview actions', async () => {
    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).toContain('/trace/manage?');
    expect(html).toContain('traceId=trace-123');
    expect(html).toContain('serviceName=checkout');
    expect(html).toContain('serviceNamespace=payments');
    expect(html).toContain('environment=prod');
    expect(html).toContain('returnTo=%2Foverview');
    expect(html).not.toContain('returnLabel=Overview');
    expect(html).toContain('/log/manage?');
    expect(html).toContain('/ingestion/otlp/metrics?');
  }, 60000);

  it('keeps the empty-state setup guide aligned to the overview -> OTLP handoff posture', async () => {
    mockState.clientData = {
      summary: { apps: [] },
      alerts: { content: [] },
      alertSummary: { total: 0, criticalNum: 0, warningNum: 0 }
    };
    mockState.viewModel = {
      ...createOverviewViewModel(),
      showSetupGuide: true,
      summaryCards: [],
      impactedEntities: [],
      activityItems: [],
      coverageItems: [],
      workspaceReadyFacts: [
        { label: 'Entities in scope', value: '0' },
        { label: 'Current alerts', value: '0' },
        { label: 'Unassigned issues', value: '0' }
      ],
      workspaceStatusItems: [
        { key: 'workspace', label: 'Workspace', value: 'Set up ingestion', ready: false }
      ],
      checklistItems: [
        { key: 'setup', label: 'Connect telemetry', ready: false }
      ],
      guidanceHeadline: 'Start by wiring telemetry into the workspace',
      guidanceDescription: 'Open OTLP intake first, then return here after setup.',
      guidanceNextLinks: []
    };

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);
    const setupRoute = '/ingestion/otlp?signal=logs&amp;returnTo=%2Foverview';
    const setupRouteMatchCount = html.split(setupRoute).length - 1;

    expect(html).toContain('/ingestion/otlp?signal=logs');
    expect(html).toContain('returnTo=%2Foverview');
    expect(html).not.toContain('returnLabel=Overview');
    expect(html).toContain('Connect telemetry to start investigation');
    expect(html).toContain('Connect logs, traces, metrics, and entities so the overview can recommend the next hop.');
    expect(html).toContain('Connect OTLP');
    expect(html).toContain('Refresh');
    expect(html).not.toContain('Review alerts');
    expect(html).not.toContain('Connect the First Data Source');
    expect(html).toContain('data-support-panel-chrome="plain"');
    expect(setupRouteMatchCount).toBe(1);
  }, 60000);

  it('renders the live details actions as buttons so the shared problem-focus dialog owns the current issue context', async () => {
    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html.split('<button type="button">Open context</button>').length - 1).toBe(2);
    expect(html).not.toContain('>Open context</a>');
  }, 60000);

  it('collapses the lower affected-items block when every impacted entity is already healthy', async () => {
    mockState.viewModel = {
      ...createOverviewViewModel(),
      impactedEntities: [
        {
          name: 'website',
          type: 'service',
          severity: 'healthy',
          severityLabel: 'Healthy',
          severityTone: 'success',
          owner: 'Platform',
          status: 'healthy',
          statusLabel: 'Stable',
          lastIssue: 'Healthy 25/25'
        }
      ]
    };

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).not.toContain('data-overview-impacted="true"');
    expect(html).not.toContain('website');
    expect(html).not.toContain('Browse all');
  }, 60000);

  it('collapses the upper current-issue stage and summary strip when overview is already in a no-issue healthy state', async () => {
    mockState.viewModel = {
      ...createOverviewViewModel(),
      problemFocus: {
        title: 'No issue needs attention right now',
        severity: 'healthy',
        severityLabel: 'Healthy',
        severityTone: 'success',
        entity: 'Overall environment',
        owner: 'Platform on call',
        summary: 'There is no issue requiring immediate escalation right now. Start with the trend and affected items.'
      },
      summaryCards: [
        { key: 'critical', label: 'High-priority alerts', value: '0', hint: 'Check whether these signals already give enough detail to act.', delta: 'No critical alerts right now', tone: 'success' },
        { key: 'unassigned', label: 'Unassigned Issues', value: '0', hint: 'Issues without a clear owner slow response.', delta: 'Every issue has an owner right now', tone: 'success' },
        { key: 'degraded', label: 'Affected items', value: '0', hint: 'Start with collection issues, state changes, and unmanaged items.', delta: 'No newly affected items', tone: 'success' }
      ],
      impactedEntities: []
    };

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);

    expect(html).not.toContain('data-stage-section="true"');
    expect(html).not.toContain('data-overview-summary-grid="true"');
    expect(html).not.toContain('data-overview-quick-links="true"');
    expect(html).not.toContain('Open Metrics Workbench:/ingestion/otlp/metrics');
    expect(html).toContain('data-support-panel="true"');
    expect(html).toContain('No evidence yet');
    expect(html).toContain('Connect telemetry or create monitored entities to make the overview actionable.');
    expect(html).toContain('data-overview-guidance="true"');
    expect(html).toContain('Connect telemetry to start investigation');
    expect(html).toContain('Connect OTLP');
    expect(html).not.toContain('Open Object Directory:/entities');
  }, 60000);

  it('replaces the populated lower main-stage stack with the placeholder when the current focus is healthy', async () => {
    mockState.viewModel = {
      ...createOverviewViewModel(),
      problemFocus: {
        title: 'No issue needs attention right now',
        severity: 'healthy',
        severityLabel: 'Healthy',
        severityTone: 'success',
        entity: 'Overall environment',
        owner: 'Platform on call',
        summary: 'There is no issue requiring immediate escalation right now. Start with the trend and affected items.'
      },
      summaryCards: [
        { key: 'critical', label: 'High-priority alerts', value: '0', hint: 'Check whether these signals already give enough detail to act.', delta: 'No critical alerts right now', tone: 'success' },
        { key: 'unassigned', label: 'Unassigned Issues', value: '0', hint: 'Issues without a clear owner slow response.', delta: 'Every issue has an owner right now', tone: 'success' },
        { key: 'degraded', label: 'Affected items', value: '23', hint: 'Start with collection issues, state changes, and unmanaged items.', delta: '23 items still need attention', tone: 'warning' }
      ],
      impactedEntities: [
        {
          name: 'website',
          type: 'service',
          severity: 'warning',
          severityLabel: 'Warning',
          severityTone: 'warning',
          owner: 'Platform',
          status: 'impacted',
          statusLabel: 'Impacted',
          lastIssue: '23 abnormal'
        }
      ],
      workspaceStatusItems: [
        { key: 'workspace', label: 'Workspace', value: 'Ready', ready: true },
        { key: 'ingestion', label: 'Telemetry Ingestion', value: 'Ready', ready: true },
        { key: 'entities', label: 'Object Context', value: 'Ready', ready: true },
        { key: 'alerts', label: 'Alert Rules', value: 'Pending', ready: false }
      ],
      checklistItems: [
        { key: 'data-source', label: 'Connect the first data source', ready: true },
        { key: 'entities', label: 'Create the first object', ready: true },
        { key: 'logs', label: 'Review logs', ready: true },
        { key: 'traces', label: 'Review traces', ready: true },
        { key: 'metrics', label: 'Review metrics', ready: true },
        { key: 'alerts', label: 'Create an alert', ready: false },
        { key: 'dashboards', label: 'Create a dashboard', ready: false }
      ]
    };

    const { default: OverviewPage } = await import('./page');
    const html = renderToStaticMarkup(<OverviewPage />);
    const guidanceSectionMatch = html.match(/<span data-overview-guidance-prefix="true">([^<]*)<\/span>/);
    const guidanceReasonsMatch = html.match(/<span data-overview-guidance-reasons="true">([^<]*)<\/span>/);

    expect(html).not.toContain('data-stage-section="true"');
    expect(html).not.toContain('data-overview-summary-grid="true"');
    expect(html).not.toContain('data-overview-quick-links="true"');
    expect(html).not.toContain('data-overview-impacted="true"');
    expect(html).not.toContain('>Open Object Directory</a>');
    expect(html).not.toContain('<a href="/alerts" class="button">Alerts</a>');
    expect(html).toContain('data-support-panel="true"');
    expect(html).toContain('data-support-panel-chrome="default"');
    expect(html).toContain('data-support-panel-tone="default"');
    expect(html).toContain('data-overview-status-density="compact"');
    expect(html).toContain('Workspace:Ready');
    expect(html).toContain('Ingestion:Pending');
    expect(html).toContain('Entities:Pending');
    expect(html).toContain('Alerts:Pending');
    expect(html).not.toContain('Ingestion:Ready');
    expect(html).not.toContain('Entities:Ready');
    expect(html).toContain('No evidence yet');
    expect(html).toContain('Connect telemetry or create monitored entities to make the overview actionable.');
    expect(html).toContain('min-h-[48px]');
    expect(html).not.toContain('min-h-[132px]');
    expect(html).not.toContain('min-h-[72px]');
    expect(html).toContain('Connect OTLP');
    expect(html).toContain('/ingestion/otlp?signal=logs');
    expect(html).not.toContain('>Details</button>');
    expect(guidanceSectionMatch?.[1]).toContain('Connect telemetry to start investigation');
    expect(guidanceSectionMatch?.[1]).toContain('Connect logs, traces, metrics, and entities so the overview can recommend the next hop.');
    expect(guidanceSectionMatch?.[1]).not.toContain('Open Object Directory:/entities');
    expect(guidanceSectionMatch?.[1]).not.toContain('Logs:/log/manage');
    expect(guidanceSectionMatch?.[1]).not.toContain('Traces:/trace/manage');
    expect(html).toContain('data-overview-guidance-reasons-layout="pill-row"');
    expect(html).toContain('data-overview-guidance-reasons-density="compact"');
    expect(html).toContain('data-overview-guidance-density="compact"');
    expect(guidanceReasonsMatch?.[1]).toContain('Logs:Pending');
    expect(guidanceReasonsMatch?.[1]).toContain('Traces:Pending');
    expect(guidanceReasonsMatch?.[1]).toContain('Metrics:Pending');
    expect(html).toContain('data-overview-checklist-density="compact"');
    expect(html).toContain('Connect the first data source:Pending');
    expect(html).toContain('Create the first object:Pending');
    expect(html).toContain('Review logs:Pending');
    expect(html).toContain('Review traces:Pending');
    expect(html).toContain('Review metrics:Pending');
    expect(html).toContain('Create an alert:Pending');
    expect(html).toContain('Create a dashboard:Pending');
    expect(html).not.toContain('Connect the first data source:Ready');
    expect(html).not.toContain('Create the first object:Ready');
    expect(html).not.toContain('Review logs:Ready');
    expect(html).not.toContain('Review traces:Ready');
    expect(html).not.toContain('Review metrics:Ready');
  }, 60000);
});
