import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import { SUPPLEMENTAL_MESSAGES } from '../../../lib/i18n-runtime-messages';

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
    t: createTranslatorMock({ overrides: SUPPLEMENTAL_MESSAGES['zh-CN'] })
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
    { key: 'otlp-intake', title: 'OTLP 三信号接入', copy: '接入 OpenTelemetry 指标、日志和链路，再进入对应工作台排查。', href: '/ingestion/otlp', meta: '三信号' },
    { key: 'traditional-monitoring', title: '传统监控资源', copy: '继续保留主机、数据库、中间件、网络设备等模板化监控。', href: '/monitors', meta: '已有资源' },
    { key: 'collector-cluster', title: '采集器集群', copy: '管理私有化部署中的采集节点、任务分发和接入状态。', href: '/setting/collector', meta: 'Collector' },
    { key: 'monitoring-template', title: '监控模板', copy: '维护多协议采集模板，让传统监控和 OTLP 实体归到同一对象。', href: '/setting/define', meta: '模板' },
    { key: 'service-discovery', title: '服务发现', copy: '把新发现的服务、资源和遥测身份确认到 HertzBeat 实体。', href: '/entities/discovery', meta: '发现' },
    { key: 'object-directory', title: '对象目录', copy: '围绕实体查看资源、三信号、拓扑和告警处理上下文。', href: '/entities', meta: '实体' }
  ],
  buildGuideAuthRows: () => [],
  buildReadinessRows: () => [
    { key: 'signals', title: '三信号接入', copy: '3 / 3 活跃', meta: 'Metrics 12 · Logs 9 · Traces 4', tone: 'success' },
    { key: 'latest-report', title: '最近上报', copy: '2026-04-12 20:00:00', meta: '已收到遥测', tone: 'neutral' },
    { key: 'entity-binding', title: '实体归因', copy: '1 个实体', meta: '对象目录', tone: 'success' },
    { key: 'service-discovery', title: '服务发现', copy: '2 个服务', meta: '最近 24 小时', tone: 'success' }
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
          { key: 'collector', title: 'Collector 集群', status: 'warning', summary: '2 / 3 在线', detail: '1 个采集节点离线' },
          { key: 'storage', title: '历史存储', status: 'success', summary: '1 / 1 可用', detail: 'HistoryDataReader 可用' },
          { key: 'query', title: '查询服务', status: 'success', summary: '指标、日志和链路查询可用', detail: 'PromQL 与历史查询可用' },
          { key: 'greptime', title: 'GreptimeDB', status: 'success', summary: 'SQL 自检通过', detail: 'SELECT 1 成功' }
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
        label: '现有接入',
        items: [
          {
            key: 'open-telemetry',
            label: '已有 OpenTelemetry',
            description: '复用现有 OpenTelemetry Collector 或 SDK 管道。',
            href: '/entities/discovery',
            icon
          }
        ]
      },
      {
        key: 'apm-traces',
        label: 'APM / 链路',
        items: [
          {
            key: 'java',
            label: 'Java',
            description: 'Java OpenTelemetry SDK 配置。',
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
        label: 'APM / 链路',
        items: [
          { key: 'java', label: 'Java', description: 'Java OpenTelemetry SDK 配置。', href: '/trace/manage', icon },
          { key: 'python', label: 'Python', description: 'Python OpenTelemetry SDK 配置。', href: '/trace/manage', icon },
          { key: 'nodejs', label: 'JavaScript', description: 'Node.js 与浏览器链路配置。', href: '/trace/manage', icon },
          { key: 'golang', label: 'Golang', description: 'Go 服务链路配置。', href: '/trace/manage', icon },
          { key: 'php', label: 'PHP', description: 'PHP 应用链路配置。', href: '/trace/manage', icon }
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
    expect(html).toContain('data-otlp-visual-contract="cold-ops-catalog-v1"');
    expect(html).toContain('data-otlp-visual-radius="panel-4-control-3"');
    expect(html).toContain('data-otlp-visual-rail="340px"');
    expect(html).toContain('data-otlp-center-tone="cold-ops-catalog"');
    expect(html).toContain('data-otlp-center-catalog-canvas="hertzbeat-cold-matte"');
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
    expect(html).toContain('接入自检');
    expect(html).not.toContain('Collector Quality');
    expect(html).toContain('真实状态');
    expect(html).toContain('展示已确认的三信号、实体归因和最近上报；未接入的健康项不显示为空指标。');
    expect(html).not.toContain('再决定进入指标、日志、链路还是告警规则。');
    expect(html).toContain('三信号接入');
    expect(html).toContain('最近上报');
    expect(html).toContain('实体归因');
    expect(html).toContain('服务发现');
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
    expect(html).toContain('候选实体');
    expect(html).toContain('billing');
    expect(html).toContain('service.name = billing');
    expect(html).toContain('commerce · prod · logs, metrics');
    expect(html).toContain('href="/entities/discovery?identityKey=service.name&amp;identityValue=billing&amp;serviceName=billing&amp;serviceNamespace=commerce&amp;environment=prod"');
    expect(html).toContain('运行自检');
    expect(html).toContain('Collector 集群');
    expect(html).toContain('历史存储');
    expect(html).toContain('查询服务');
    expect(html).toContain('GreptimeDB');
    expect(html).toContain('SQL 自检通过');
    expect(html).toContain('检查采集节点、历史存储、查询服务和 GreptimeDB 连接状态。');
    expect(html).not.toContain('来自当前后端');
    expect(html).not.toContain('只读检查');
    expect(html).not.toContain('查询执行器');
    expect(html).not.toContain('接收量');
    expect(html).not.toContain('丢弃量');
    expect(html).not.toContain('解析失败');
    expect(html).not.toContain('实体归并失败');
    expect(html).not.toContain('模板绑定');
    expect(html).not.toContain('Collector 节点');
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
    expect(html).toContain('data-otlp-center-catalog-canvas="hertzbeat-cold-matte"');
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
    expect(html).toContain('OTLP 协议接入');
    expect(html).toContain('选择 OTLP 数据源');
    expect(html).toContain('配置协议与令牌');
    expect(html).toContain('进入信号工作台');
    expect(html).toContain('已有 OpenTelemetry');
    expect(html).toContain('已有可观测平台');
    expect(html).toContain('接入服务、日志和指标后，在对象目录和排障工作台继续处理。');
    expect(html).not.toContain('商业可观测迁移');
    expect(html).not.toContain('把已有服务、日志和指标流接入 HertzBeat 采集闭环。');
    expect(html).toContain('Honeycomb');
    expect(html).toContain('把链路数据接入链路工作台，并关联服务与日志。');
    expect(html).toContain('自托管 OTLP 管道');
    expect(html).toContain('复用内网或离线环境中的 OTLP Collector 管道。');
    expect(html).not.toContain('自托管管道迁移');
    expect(html).not.toContain('把链路优先的可观测流程迁移到统一查询台。');
    expect(html).not.toContain('把自托管 OTLP 管道迁移到本页的采集接入流程。');
    expect(html).toContain('APM / 链路');
    expect(html).toContain('.NET');
    expect(html).toContain('Deno');
    expect(html).toContain('Kubernetes Pod 日志');
    expect(html).toContain('Cloudflare 日志');
    expect(html).toContain('筛选');
    expect(html).toContain('全部');
    expect(html).toContain('37');
    expect(html).toContain('快速开始 (1)');
    expect(html).toContain('现有接入 (7)');
    expect(html).not.toContain('迁移接入 (7)');
    expect(html).toContain('APM / 链路 (13)');
    expect(html).toContain('日志 (11)');
    expect(html).toContain('指标 (5)');
    expect(html).toContain('活跃信号');
    expect(html).toContain('指标通道');
    expect(html).toContain('日志通道');
    expect(html).toContain('链路通道');
    expect(html).toContain('搜索数据源、云服务、SDK 或运行时');
    expect(html).toContain('进入遥测发现');
    expect(html).not.toContain('APM / 链路 (18)');
    expect(html).not.toContain('日志 (25)');
    expect(html).not.toContain('指标 (19)');
    expect(html).not.toContain('LLM 监控');
    expect(html).not.toContain('AWS');
    expect(html).not.toContain('AZURE');
    expect(html).not.toContain('GCP');
    expect(html).not.toContain('接入中枢');
    expect(html).not.toContain('高密度控制台');
    expect(html).not.toContain('工作区已就绪');
    expect(html).not.toContain('接入首条遥测链路');
    expect(html).not.toContain('配置信号工作台');
    expect(html).not.toContain('当前接入');
    expect(html).not.toContain('从目录进入指标');
    expect(html).not.toContain('165');
    expect(html).not.toContain('HertzBeat Intake Cortex');
    expect(html).not.toContain('HertzBeat OTLP 接入');
    expect(html).not.toContain('HERTZBEAT OTLP 接入');
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
          label: '快速开始',
          items: [{ key: 'demo-data', label: '5 分钟内接入演示数据', description: '写入演示数据', href: '/overview', icon: vi.fn() as any }]
        },
        {
          key: 'migrate',
          label: '现有接入',
          items: [
            { key: 'open-telemetry', label: '已有 OpenTelemetry', description: '复用 OpenTelemetry Collector', href: '/entities/discovery', icon: vi.fn() as any },
            { key: 'grafana', label: 'Grafana', description: '接入 Grafana 信号', href: '/ingestion/otlp/metrics', icon: vi.fn() as any }
          ]
        },
        {
          key: 'metrics',
          label: '指标',
          items: [
            { key: 'otel-metrics', label: 'OpenTelemetry 指标', description: '检查 OTLP 指标数据流', href: '/ingestion/otlp/metrics', icon: vi.fn() as any }
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
    expect(html).toContain('OTLP 三信号接入');
    expect(html).toContain('传统监控资源');
    expect(html).toContain('采集器集群');
    expect(html).toContain('监控模板');
    expect(html).toContain('服务发现');
    expect(html).toContain('对象目录');
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
    expect(source).not.toContain('采集质量');
    expect(source).not.toContain('丢弃量');
    expect(source).not.toContain('解析失败');
    expect(source).not.toContain('实体归并失败');
    expect(source).not.toContain('Collector 节点');
    expect(source).toContain('data-otlp-self-check-status="backend-backed"');
  });
});
