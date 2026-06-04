import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { TranslationParams } from '../../../lib/i18n';

const zhT = createTranslatorMock({ locale: 'zh-CN' });

function tZh(key: string, params?: TranslationParams) {
  return zhT(key, params);
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(
      'entityId=7&entityName=checkout&returnTo=%2Fentities%2F7&returnLabel=Checkout&serviceName=checkout&serviceNamespace=payments&environment=prod&traceId=trace-123&spanId=span-456'
    )
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'zh-CN',
    t: zhT
  })
}));

vi.mock('@/components/observability', () => ({
  ObservabilityPageHeader: ({ children, ...props }: any) => <div data-observability-header="true">{props.kicker}{props.title}{children}</div>,
  ObservabilityPanelShell: ({ title, children }: any) => <div data-observability-panel="true">{title}{children}</div>,
  ObservabilityStatGrid: ({ items }: any) => <div>{items.map((item: any) => item.label).join(',')}</div>,
  ObservabilityTimeline: ({ items, emptyText }: any) => <div>{items.length > 0 ? items.map((item: any) => item.title).join(',') : emptyText}</div>,
  ObservabilityControlButton: ({ children }: any) => <button>{children}</button>,
  FactsStrip: ({ items }: any) => <div data-facts-strip="true">{items.map((item: any) => item.label).join(',')}</div>,
  StageSection: ({ title, children }: any) => <section data-stage-section="true">{title}{children}</section>,
  SummaryMetricGrid: ({ items }: any) => <div data-summary-grid="true">{items.map((item: any) => item.label).join(',')}</div>,
  DrawerSection: ({ title, children }: any) => <aside data-drawer-section="true">{title}{children}</aside>,
  DrawerCodePreview: ({ children }: any) => <pre data-drawer-code-preview="true">{children}</pre>,
  SupportActionBar: ({ items }: any) => <div data-support-action-bar="true">{items.map((item: any) => item.label).join(',')}</div>
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/workbench/workbench-page', () => ({
  RowList: ({ rows }: any) => <div>{rows.map((row: any) => row.title).join(',')}</div>
}));

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiMessageGet: vi.fn()
}));

vi.mock('@/lib/format', () => ({
  formatTime: () => '2026-04-12 20:00:00'
}));

vi.mock('@/lib/otlp-center/controller', () => ({
  OTLP_BINDINGS_URL: '/ingestion/otlp/bindings',
  OTLP_GUIDE_URL: '/ingestion/otlp/guide',
  OTLP_OVERVIEW_URL: '/ingestion/otlp/overview',
  loadOtlpPageData: vi.fn()
}));

vi.mock('@/lib/otlp-center/view-model', () => ({
  buildBindingRows: (items: any[]) => items.map(item => ({ title: item.name || item.displayName, copy: item.primaryIdentityValue || '-', meta: 'binds 1' })),
  buildCollectionLoopLinks: () => [
    { key: 'otlp-intake', title: tZh('otlp.collection-loop.otlp-intake.title'), copy: tZh('otlp.collection-loop.otlp-intake.copy'), href: '/ingestion/otlp', meta: tZh('otlp.collection-loop.otlp-intake.meta') },
    { key: 'traditional-monitoring', title: tZh('otlp.collection-loop.traditional-monitoring.title'), copy: tZh('otlp.collection-loop.traditional-monitoring.copy'), href: '/monitors', meta: tZh('otlp.collection-loop.traditional-monitoring.meta') },
    { key: 'collector-cluster', title: tZh('otlp.collection-loop.collector-cluster.title'), copy: tZh('otlp.collection-loop.collector-cluster.copy'), href: '/setting/collector', meta: tZh('otlp.collection-loop.collector-cluster.meta') },
    { key: 'monitoring-template', title: tZh('otlp.collection-loop.monitoring-template.title'), copy: tZh('otlp.collection-loop.monitoring-template.copy'), href: '/setting/define', meta: tZh('otlp.collection-loop.monitoring-template.meta') },
    { key: 'service-discovery', title: tZh('otlp.collection-loop.service-discovery.title'), copy: tZh('otlp.collection-loop.service-discovery.copy'), href: '/entities/discovery', meta: tZh('otlp.collection-loop.service-discovery.meta') },
    { key: 'object-directory', title: tZh('otlp.collection-loop.object-directory.title'), copy: tZh('otlp.collection-loop.object-directory.copy'), href: '/entities', meta: tZh('otlp.collection-loop.object-directory.meta') }
  ],
  buildGuideAuthRows: () => [],
  buildReadinessRows: () => [
    { key: 'signals', title: tZh('otlp.readiness.signals.title'), copy: tZh('otlp.readiness.signals.copy', { active: 3, total: 3 }), meta: 'Metrics 12 · Logs 9 · Traces 4', tone: 'success' },
    { key: 'latest-report', title: tZh('otlp.readiness.latest.title'), copy: '2026-04-12 20:00:00', meta: tZh('otlp.readiness.latest.received'), tone: 'neutral' },
    { key: 'entity-binding', title: tZh('otlp.readiness.entity.title'), copy: tZh('otlp.readiness.entity.copy', { count: 1 }), meta: tZh('otlp.readiness.entity.meta'), tone: 'success' },
    { key: 'service-discovery', title: tZh('otlp.readiness.discovery.title'), copy: tZh('otlp.readiness.discovery.copy', { count: 2 }), meta: tZh('otlp.readiness.discovery.meta'), tone: 'success' }
  ],
  buildSelfCheckRows: (checks: any[]) => checks.map(check => ({
    key: check.key,
    title: check.title,
    copy: check.summary,
    meta: check.detail,
    tone: check.status
  })),
  buildUnboundCandidateRows: (items: any[] = []) => items.map(item => ({
    key: `${item.primaryIdentityKey}:${item.primaryIdentityValue}:${item.namespace}:${item.environment}`,
    title: item.suggestedName,
    copy: `${item.primaryIdentityKey} = ${item.primaryIdentityValue}`,
    meta: `${item.namespace} · ${item.environment} · ${item.signals.join(', ')}`,
    href: `/entities/discovery?identityKey=${item.primaryIdentityKey}&identityValue=${item.primaryIdentityValue}&serviceName=${item.suggestedName}&serviceNamespace=${item.namespace}&environment=${item.environment}`,
    signals: item.signals,
    canonicalIdentitySummary: Object.entries(item.canonicalIdentities).map(([key, value]) => `${key}=${value}`).join(';')
  })),
  buildProtocolOptions: () => [{ key: 'http', label: 'HTTP' }, { key: 'grpc', label: 'gRPC' }],
  buildSignalRows: (signals: any[]) => signals.map(signal => ({ title: signal.signal, copy: signal.summary || '-', meta: String(signal.totalCount || 0) })),
  filterGuideRowsByProtocol: (signals: any[]) => signals.map(item => ({ title: item.signal, copy: item.summary || '-', meta: item.endpoint || '-' })),
  filterGuideSnippetsByProtocol: (snippets: any[]) => snippets
}));

vi.mock('@/lib/setting-token/controller', () => ({
  generateTokenValue: vi.fn()
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, cacheKey }: { children: (data: any) => React.ReactNode; cacheKey?: string }) => (
    <div data-client-workbench-cache-key={cacheKey}>
      {children({
      overview: {
        activeSignalCount: 3,
        recentServiceCount: 2,
        boundEntityCount: 1,
        latestObservedAt: 1712730000000,
        metrics: { signal: 'metrics', totalCount: 12, summary: 'metrics ready', active: true },
        logs: { signal: 'logs', totalCount: 9, summary: 'logs ready', active: true },
        traces: { signal: 'traces', totalCount: 4, summary: 'traces ready', active: true },
        recentEvents: [{ signal: 'metrics', title: 'metrics event', detail: 'metric batch', observedAt: 1712730000000 }],
        readinessChecks: [
          { key: 'collector', title: 'Collector cluster', status: 'warning', summary: '2 / 3 online', detail: '1 collector node offline' },
          { key: 'storage', title: 'History storage', status: 'success', summary: '1 / 1 available', detail: 'HistoryDataReader available' },
          { key: 'query', title: 'Query service', status: 'success', summary: 'Metrics, logs, and traces query available', detail: 'PromQL and history query available' },
          { key: 'greptime', title: 'GreptimeDB', status: 'success', summary: 'SQL self-check passed', detail: 'SELECT 1 passed' }
        ]
      },
      guide: {
        httpProtocolLabel: 'HTTP',
        grpcProtocolLabel: 'gRPC',
        signals: [{ signal: 'metrics', protocol: 'http', summary: 'Send metrics', endpoint: '/otlp' }],
        snippets: [{ key: 'metrics-http', title: 'Metrics HTTP', protocol: 'http', content: 'curl example' }]
      },
      bindings: {
        recentBoundEntities: [{ entityId: 1, name: 'checkout', primaryIdentityKey: 'service.name', primaryIdentityValue: 'checkout', monitorBindCount: 1 }],
        recentUnboundCandidates: [{
          suggestedName: 'billing',
          suggestedType: 'service',
          namespace: 'commerce',
          environment: 'prod',
          primaryIdentityKey: 'service.name',
          primaryIdentityValue: 'billing',
          signals: ['logs', 'metrics'],
          canonicalIdentities: {
            'service.name': 'billing',
            'service.namespace': 'commerce',
            'deployment.environment.name': 'prod'
          },
          latestObservedAt: 1712730000000
        }],
        recentIdentitySamples: [{ signal: 'metrics', key: 'service.name', value: 'checkout' }]
      }
      })}
    </div>
  )
}));

describe('otlp page', () => {
  it('keeps OTLP source catalog and page chrome copy behind i18n keys', async () => {
    const source = await import('node:fs/promises')
      .then(fs => fs.readFile(new URL('./otlp-page.tsx', import.meta.url), 'utf8'));

    expect(source).not.toMatch(/[\u4e00-\u9fff]/);
    expect(source).toContain("t('otlp.source.section.quickstart')");
    expect(source).toContain("t('otlp.source.item.demo-data.label')");
    expect(source).toContain("t('otlp.hero.title')");
    expect(source).toContain("t('otlp.section.collection-loop.title')");
    expect(source).toContain("t('otlp.source.search.placeholder')");
  });

  it('filters source catalog by explicit names instead of generic OpenTelemetry description text', async () => {
    const { filterOtlpSourceSections } = await import('./otlp-page');
    const icon = (() => null) as any;
    const sections = [
      {
        key: 'migrate',
        label: 'Existing intake',
        items: [
          {
            key: 'open-telemetry',
            label: 'Existing OpenTelemetry',
            description: 'Reuse an existing OpenTelemetry Collector or SDK pipeline.',
            href: '/entities/discovery',
            icon
          }
        ]
      },
      {
        key: 'apm-traces',
        label: 'APM / traces',
        items: [
          {
            key: 'java',
            label: 'Java',
            description: 'Java OpenTelemetry SDK configuration.',
            href: '/trace/manage',
            icon
          }
        ]
      }
    ];

    const filteredKeys = filterOtlpSourceSections(sections, 'OPEN')
      .flatMap(section => section.items.map(item => item.key));

    expect(filteredKeys).toEqual(['open-telemetry']);
    expect(filteredKeys).not.toContain('java');
  }, 15000);

  it('keeps single-letter source search at card-token level instead of matching whole sections', async () => {
    const { filterOtlpSourceSections } = await import('./otlp-page');
    const icon = (() => null) as any;
    const sections = [
      {
        key: 'apm-traces',
        label: 'APM / traces',
        items: [
          { key: 'java', label: 'Java', description: 'Java OpenTelemetry SDK configuration.', href: '/trace/manage', icon },
          { key: 'python', label: 'Python', description: 'Python OpenTelemetry SDK configuration.', href: '/trace/manage', icon },
          { key: 'nodejs', label: 'JavaScript', description: 'Node.js and browser trace configuration.', href: '/trace/manage', icon },
          { key: 'golang', label: 'Golang', description: 'Go service trace configuration.', href: '/trace/manage', icon },
          { key: 'php', label: 'PHP', description: 'PHP application trace configuration.', href: '/trace/manage', icon }
        ]
      }
    ];

    const filteredKeys = filterOtlpSourceSections(sections, 'p')
      .flatMap(section => section.items.map(item => item.key));

    expect(filteredKeys).toEqual(['python', 'php']);
    expect(filteredKeys).not.toContain('java');
    expect(filteredKeys).not.toContain('nodejs');
    expect(filteredKeys).not.toContain('golang');
  });

  it('renders the HertzBeat-native intake cortex instead of a pixel-level external catalog copy', async () => {
    const { default: OtlpPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpPage />);

    expect(html).toContain('data-workspace-shell="true"');
    expect(html).toContain('data-client-workbench-cache-key="otlp-center:/ingestion/otlp/overview:/ingestion/otlp/guide:/ingestion/otlp/bindings"');
    expect(html).toContain('data-otlp-center-route="hertzbeat-intake-cortex"');
    expect(html).toContain('data-otlp-center-visual-system="hertzbeat-native-avant-garde"');
    expect(html).toContain('data-otlp-visual-contract="hertzbeat-ui-ops-catalog-v1"');
    expect(html).toContain('data-otlp-visual-radius="panel-4-control-3"');
    expect(html).toContain('data-otlp-visual-rail="340px"');
    expect(html).toContain('data-otlp-center-tone="hertzbeat-ui-ops-catalog"');
    expect(html).toContain('data-otlp-center-catalog-canvas="hertzbeat-ui-matte"');
    expect(html).toContain('data-otlp-center-hero="hertzbeat-intake-cortex"');
    expect(html).toContain('data-otlp-center-action-bar="standard-action-row"');
    expect(html).toContain('data-otlp-center-action-size="standard-sm-88"');
    expect((html.match(/class="min-w-\[88px\]"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('bg-[#182238]');
    expect(html).not.toContain('bg-[var(--ops-primary)] text-white');
    expect(html).toContain('data-otlp-center-signal-band="hertzbeat-signal-ribbons"');
    expect(html).toContain('data-otlp-center-signal-band-layout="single-layer"');
    expect(html).toContain('data-otlp-center-signal-value-scale="restrained-17"');
    expect(html).toContain('data-otlp-readiness-status="overview-backed"');
    expect(html).toContain('data-otlp-readiness-scope="signals-entity-latest"');
    expect(html).toContain('data-otlp-readiness-row="signals"');
    expect(html).toContain('data-otlp-readiness-row="latest-report"');
    expect(html).toContain('data-otlp-readiness-row="entity-binding"');
    expect(html).toContain('data-otlp-readiness-row="service-discovery"');
    expect(html).toContain(tZh('otlp.section.readiness.kicker'));
    expect(html).not.toContain('Collector Quality');
    expect(html).toContain(tZh('otlp.section.readiness.title'));
    expect(html).toContain(tZh('otlp.section.readiness.copy'));
    expect(html).toContain(tZh('otlp.readiness.signals.title'));
    expect(html).toContain(tZh('otlp.readiness.latest.title'));
    expect(html).toContain(tZh('otlp.readiness.entity.title'));
    expect(html).toContain(tZh('otlp.readiness.discovery.title'));
    expect(html).toContain('data-otlp-self-check-status="backend-backed"');
    expect(html).toContain('data-otlp-self-check-row="collector"');
    expect(html).toContain('data-otlp-self-check-row="storage"');
    expect(html).toContain('data-otlp-self-check-row="query"');
    expect(html).toContain('data-otlp-self-check-row="greptime"');
    expect(html).toContain('data-otlp-entity-candidates="telemetry-derived"');
    expect(html).toContain('data-otlp-entity-candidate-count="1"');
    expect(html).toContain('data-otlp-entity-candidate-row="service.name:billing:commerce:prod"');
    expect(html).toContain('data-otlp-entity-candidate-signals="logs,metrics"');
    expect(html).toContain('data-otlp-entity-candidate-identities="service.name=billing;service.namespace=commerce;deployment.environment.name=prod"');
    expect(html).toContain(tZh('otlp.section.candidates.title'));
    expect(html).toContain('billing');
    expect(html).toContain('service.name = billing');
    expect(html).toContain('commerce · prod · logs, metrics');
    expect(html).toContain('href="/entities/discovery?identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing&amp;serviceNamespace=commerce&amp;environment=prod"');
    expect(html).toContain(tZh('otlp.section.self-check.kicker'));
    expect(html).toContain('Collector cluster');
    expect(html).toContain('History storage');
    expect(html).toContain('Query service');
    expect(html).toContain('GreptimeDB');
    expect(html).toContain('SQL self-check passed');
    expect(html).toContain(tZh('otlp.section.self-check.copy'));
    expect(html).toContain('data-otlp-center-stepper="hertzbeat-intake-steps"');
    expect(html).toContain('data-otlp-center-stepper-phase="source-selection"');
    expect(html).toContain('data-otlp-center-stepper-align="centered-860-balanced"');
    expect(html).not.toContain('data-otlp-center-stepper-align="centered-980"');
    expect(html).toContain('data-otlp-center-search-row="hertzbeat-catalog-filter"');
    expect(html).toContain('data-otlp-center-search-owner="shared-search-row"');
    expect(html).toContain('data-otlp-center-search-mode="instant-results-inline"');
    expect(html).toContain('data-cold-search-row-owner="cold-search-row"');
    expect(html).toContain('data-cold-search-layout="compact-detached-button"');
    expect(html).toContain('data-cold-search-input="fixed-width-direct"');
    expect(html).toContain('data-cold-search-control="direct-input"');
    expect(html).toContain('data-cold-search-chrome="no-extra-input-shell"');
    expect(html).toContain('data-cold-search-action="submit"');
    expect(html).toContain('data-otlp-center-filtered-total="37"');
    expect(html).not.toContain('data-cold-search-input-shell');
    expect(html).not.toContain('data-otlp-center-search-input="live-source-filter"');
    expect(html).not.toContain('data-otlp-center-search-action-tone');
    expect(html).toContain('data-otlp-center-source-grid="hertzbeat-source-catalog"');
    expect(html).toContain('data-otlp-center-grid-density="hertzbeat-dense-catalog"');
    expect(html).toContain('data-otlp-center-grid-span="third-width-cards"');
    expect(html).toContain('data-otlp-center-source-card-density="nav-scale-compact"');
    expect(html).toContain('h-[36px]');
    expect(html).toContain('text-[12px]');
    expect(html).toContain('xl:grid-cols-3');
    expect(html).not.toContain('h-12 items-center overflow-hidden');
    expect(html).not.toContain('auto-fit');
    expect(html).toContain('data-otlp-center-filter-rail="hertzbeat-prism-filters"');
    expect(html).toContain('data-otlp-center-filter-total="37"');
    expect(html).toContain('data-otlp-center-filter-rail-stickiness="static-flow"');
    expect(html).toContain('data-otlp-center-filter-rail-mode="static-flow"');
    expect(html).not.toContain('data-otlp-center-filter-rail-pinned');
    expect(html).not.toContain('data-otlp-center-filter-rail-fixed-class');
    expect(html).not.toContain('data-otlp-center-filter-rail-anchor');
    expect(html).not.toContain('data-otlp-center-filter-rail-measure');
    expect(html).not.toContain('data-otlp-center-filter-rail-state');
    expect(html).not.toContain('data-otlp-center-filter-rail-track');
    expect(html).not.toContain('self-stretch');
    expect(html).not.toContain('fixed z-20');
    expect(html).toContain('data-otlp-center-filter-line-alignment="fixed-count-column"');
    expect(html).toContain('data-otlp-center-rail-grid="shared-340"');
    expect(html).not.toContain('pb-80');
    expect(html).not.toContain('border-b border-[#222832]');
    expect(html).not.toContain('shadow-[0_16px_60px');
    expect(html).toContain('relative bg-[#0b0c0e] px-8 py-6');
    expect(html).not.toContain('style="top:calc(50vh - 168px)"');
    expect(html).not.toContain('calc(50vh - 168px)');
    expect(html).toContain('grid-cols-[minmax(0,auto)_1fr_38px]');
    expect(html).toContain('w-[38px]');
    expect((html.match(/xl:grid-cols-\[minmax\(0,1fr\)_340px\]/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-otlp-center-catalog-canvas="hertzbeat-ui-matte"');
    expect(html).toContain('style="background-color:#0b0c0e"');
    expect(html).not.toContain('repeating-linear-gradient');
    expect(html).not.toContain('linear-gradient(135deg');
    expect(html).not.toContain('via-[#505866]');
    expect(html).toContain('data-otlp-center-source-section="migrate"');
    expect(html).toContain('data-otlp-center-source-section="apm-traces"');
    expect(html).toContain('data-otlp-center-source-section="logs"');
    expect(html).toContain('data-otlp-center-source-card="open-telemetry"');
    expect(html).toContain('data-otlp-center-source-card="commercial-observability"');
    expect(html).toContain('data-otlp-center-source-card="honeycomb"');
    expect(html).toContain('data-otlp-center-source-card="self-hosted-observability"');
    expect(html).toContain('data-otlp-center-source-card="java"');
    expect(html).toContain('data-otlp-center-source-card="dotnet"');
    expect(html).toContain('data-otlp-center-source-card="deno"');
    expect(html).toContain('data-otlp-center-source-card="kubernetes-pod-logs"');
    expect(html).toContain('data-otlp-center-source-card="cloudflare-logs"');
    expect(html).toContain('data-otlp-center-source-card="vercel-logs"');
    expect(html).toContain('data-otlp-center-brand-logo="commercial-observability"');
    expect(html).toContain('data-otlp-center-brand-logo="grafana"');
    expect(html).toContain('data-otlp-center-brand-logo="elk"');
    expect(html).toContain('data-otlp-center-brand-logo="java"');
    expect(html).toContain('data-otlp-center-brand-logo="kubernetes-pod-logs"');
    expect(html).toContain('data-otlp-center-brand-art="commercial-observability"');
    expect(html).toContain('data-otlp-center-brand-art="grafana"');
    expect(html).toContain('data-otlp-center-brand-art="elk"');
    expect(html).toContain('data-otlp-center-brand-art="new-relic"');
    expect(html).toContain('data-otlp-center-brand-art="honeycomb"');
    expect(html).toContain('data-otlp-center-brand-art="self-hosted-observability"');
    expect(html).toContain('data-otlp-center-brand-art="kubernetes-pod-logs"');
    expect(html).toContain('data-otlp-center-brand-art="docker-container-logs"');
    expect(html).toContain('/entities/7');
    expect(html).toContain('href="/setting/settings/token"');
    expect(html).toContain('href="/entities"');
    expect(html).toContain('href="/entities/discovery"');
    expect(html).toContain('/ingestion/otlp/metrics?');
    expect(html).toContain('traceId=trace-123');
    expect(html).toContain('spanId=span-456');
    expect(html).toContain(tZh('otlp.hero.title'));
    expect(html).toContain(tZh('otlp.stepper.source'));
    expect(html).toContain(tZh('otlp.stepper.protocol'));
    expect(html).toContain(tZh('otlp.stepper.workbench'));
    expect(html).toContain(tZh('otlp.source.item.open-telemetry.label'));
    expect(html).toContain(tZh('otlp.source.item.commercial-observability.label'));
    expect(html).toContain(tZh('otlp.source.item.commercial-observability.description'));
    expect(html).toContain('Honeycomb');
    expect(html).toContain(tZh('otlp.source.item.honeycomb.description'));
    expect(html).toContain(tZh('otlp.source.item.self-hosted-observability.label'));
    expect(html).toContain(tZh('otlp.source.item.self-hosted-observability.description'));
    expect(html).toContain(tZh('otlp.source.section.apm-traces'));
    expect(html).toContain('.NET');
    expect(html).toContain('Deno');
    expect(html).toContain(tZh('otlp.source.item.kubernetes-pod-logs.label'));
    expect(html).toContain(tZh('otlp.source.item.cloudflare-logs.label'));
    expect(html).toContain(tZh('otlp.source.search.label'));
    expect(html).toContain(tZh('otlp.source.filter.all'));
    expect(html).toContain('37');
    expect(html).toContain(`${tZh('otlp.source.section.quickstart')} (1)`);
    expect(html).toContain(`${tZh('otlp.source.section.migrate')} (7)`);
    expect(html).toContain(`${tZh('otlp.source.section.apm-traces')} (13)`);
    expect(html).toContain(`${tZh('otlp.source.section.logs')} (11)`);
    expect(html).toContain(`${tZh('otlp.source.section.metrics')} (5)`);
    expect(html).toContain(tZh('otlp.ribbon.intake.detail'));
    expect(html).toContain(tZh('otlp.ribbon.metrics.detail'));
    expect(html).toContain(tZh('otlp.ribbon.logs.detail'));
    expect(html).toContain(tZh('otlp.ribbon.traces.detail'));
    expect(html).toContain(tZh('otlp.source.search.placeholder'));
    expect(html).toContain(tZh('otlp.open-discovery'));
    expect(html).not.toContain('AWS');
    expect(html).not.toContain('AZURE');
    expect(html).not.toContain('GCP');
    expect(html).not.toContain('165');
    expect(html).not.toContain('HertzBeat Intake Cortex');
    expect(html).not.toContain('text-[20px]');
    expect(html).not.toContain('Intake Cortex');
    expect(html).not.toContain('Select a source');
    expect(html).not.toContain('Workspace keyed');
    expect(html).not.toContain('Prime a live telemetry route');
    expect(html).not.toContain('Compose a signal workbench');
    expect(html).not.toContain('live signal lanes');
    expect(html).not.toContain('metrics routes');
    expect(html).not.toContain('log routes');
    expect(html).not.toContain('trace routes');
    expect(html).not.toContain('Command search');
    expect(html).not.toContain('Start with Demo Data');
    expect(html).not.toContain('MIGRATE TO HERTZBEAT');
    expect(html).not.toContain('APM/TRACES');
    expect(html).not.toContain('FILTERS');
    expect(html).not.toContain('LLM MONITORING');
    expect(html).not.toContain('QUICKSTART');
    expect(html).not.toContain('From Existing');
    expect(html).not.toContain('From Datadog');
    expect(html).not.toContain('SigNoZ Self-Host');
    expect(html).not.toContain('Datadog');
    expect(html).not.toContain('SigNoZ');
    expect(html).not.toContain('radial-gradient');
    expect(html).not.toContain('#38f2ff');
    expect(html).not.toContain('#7df7ff');
    expect(html).not.toContain('#df43ff');
    expect(html).not.toContain('rgba(56,242,255');
    expect(html).not.toContain('data-otlp-center-route="signoz-data-source-catalog"');
    expect(html).not.toContain('data-otlp-center-catalog-canvas="signoz-dotted"');
    expect(html).not.toContain('data-otlp-center-search-row="signoz-source-search"');
    expect(html).not.toContain('data-otlp-center-source-grid="signoz-source-catalog"');
    expect(html).not.toContain('data-otlp-center-filter-rail="signoz-source-filters"');
    expect(html).not.toContain('data-otlp-center-route="angular-current-intake"');
    expect(html).not.toContain('data-otlp-center-waiting-panel="angular-intake-panel"');
    expect(html).not.toContain('curl example');
    expect(html).not.toContain('Observability Intake');
    expect(html).not.toContain('Guide');
    expect(html).not.toContain('Canonical identities');
  }, 15000);

  it('keeps the source catalog filtering as an instant inline result transform', async () => {
    const { filterOtlpSourceSections } = await import('./otlp-page');
    const filtered = filterOtlpSourceSections(
      [
        {
          key: 'quickstart',
          label: 'Quick start',
          items: [{ key: 'demo-data', label: 'Ingest demo data in 5 minutes', description: 'Write demo data', href: '/overview', icon: vi.fn() as any }]
        },
        {
          key: 'migrate',
          label: 'Existing intake',
          items: [
            { key: 'open-telemetry', label: 'Existing OpenTelemetry', description: 'Reuse OpenTelemetry Collector', href: '/entities/discovery', icon: vi.fn() as any },
            { key: 'grafana', label: 'Grafana', description: 'Ingest Grafana signals', href: '/ingestion/otlp/metrics', icon: vi.fn() as any }
          ]
        },
        {
          key: 'metrics',
          label: 'Metrics',
          items: [
            { key: 'otel-metrics', label: 'OpenTelemetry metrics', description: 'Inspect OTLP metric streams', href: '/ingestion/otlp/metrics', icon: vi.fn() as any }
          ]
        }
      ],
      'open'
    );

    expect(filtered.map(section => [section.key, section.items.length])).toEqual([
      ['migrate', 1],
      ['metrics', 1]
    ]);
  });

  it('renders the existing collection system loop without future-only app entries', async () => {
    const { default: OtlpPage } = await import('./page');
    const html = renderToStaticMarkup(<OtlpPage />);

    expect(html).toContain('data-otlp-collection-loop="existing-ingestion-system"');
    expect(html).toContain('data-otlp-collection-loop-link="otlp-intake"');
    expect(html).toContain('data-otlp-collection-loop-link="traditional-monitoring"');
    expect(html).toContain('data-otlp-collection-loop-link="collector-cluster"');
    expect(html).toContain('data-otlp-collection-loop-link="monitoring-template"');
    expect(html).toContain('data-otlp-collection-loop-link="service-discovery"');
    expect(html).toContain('data-otlp-collection-loop-link="object-directory"');
    expect(html).toContain('href="/ingestion/otlp"');
    expect(html).toContain('href="/monitors"');
    expect(html).toContain('href="/setting/collector"');
    expect(html).toContain('href="/setting/define"');
    expect(html).toContain('href="/entities/discovery"');
    expect(html).toContain('href="/entities"');
    expect(html).toContain(tZh('otlp.collection-loop.otlp-intake.title'));
    expect(html).toContain(tZh('otlp.collection-loop.traditional-monitoring.title'));
    expect(html).toContain(tZh('otlp.collection-loop.collector-cluster.title'));
    expect(html).toContain(tZh('otlp.collection-loop.monitoring-template.title'));
    expect(html).toContain(tZh('otlp.collection-loop.service-discovery.title'));
    expect(html).toContain(tZh('otlp.collection-loop.object-directory.title'));
    expect(html).not.toContain('href="/observability-pipelines"');
    expect(html).not.toContain('href="/pipelines"');
    expect(html).not.toContain('href="/fleet"');
    expect(html).not.toContain('href="/private-log-pipelines"');
  });

  it('renders OTLP readiness from real overview fields instead of fake quality counters', async () => {
    const source = await import('node:fs/promises')
      .then(fs => fs.readFile(new URL('./otlp-page.tsx', import.meta.url), 'utf8'));

    expect(source).toContain('buildReadinessRows');
    expect(source).toContain('buildSelfCheckRows');
    expect(source).not.toContain('buildIntakeQualityRows');
    expect(source).not.toContain('?? 25');
    expect(source).not.toContain('?? 19');
    expect(source).not.toContain('?? 18');
    expect(source).not.toContain('data-otlp-intake-quality');
    expect(source).toContain('data-otlp-self-check-status="backend-backed"');
  });
});
