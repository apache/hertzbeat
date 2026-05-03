import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildTopologyFaultAnalysisReview, buildTopologyServiceMap } from './view-model';

describe('topology surface config', () => {
  it('builds a HertzBeat-native topology model with enterprise relationship sources', () => {
    const model = buildTopologyServiceMap();

    expect(model.productIdentity).toBe('HertzBeat 企业运维拓扑');
    expect(model.viewModes.map(mode => mode.key)).toEqual(['application', 'service-call', 'resource-dependency', 'alert-impact']);
    expect(model.sources.map(source => source.kind)).toEqual(
      expect.arrayContaining([
        'otlp-trace-call',
        'monitor-ownership',
        'template-dependency',
        'k8s-workload',
        'database-middleware-connection',
        'cmdb-manual-label',
        'alert-impact'
      ])
    );
    expect(model.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['svc-checkout', 'res-redis', 'res-orders-db', 'k8s-checkout-workload'])
    );
    expect(model.nodes.find(node => node.id === 'svc-checkout')).toMatchObject({
      entityId: 'service:commerce/checkout',
      entityType: 'service',
      source: 'otlp-trace-call',
      health: 'warning',
      healthAffordance: {
        score: 62,
        scoreText: '62 / 100',
        label: '健康评分 62',
        copy: '采集 1 / 2 健康',
        meta: '告警 1 · 异常 5',
        tone: 'warning'
      },
      signals: expect.arrayContaining(['metrics', 'logs', 'traces', 'alerts']),
      routeContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology:otlp-trace-call',
        returnTo: '/topology'
      }
    });
    const checkout = model.nodes.find(node => node.id === 'svc-checkout');
    expect(checkout?.links.entityHref).toContain('/entities/service%3Acommerce%2Fcheckout?');
    expect(checkout?.links.metricsHref).toContain('/ingestion/otlp/metrics?');
    expect(checkout?.links.logsHref).toContain('/log/manage?');
    expect(checkout?.links.tracesHref).toContain('/trace/manage?');
    expect(checkout?.links.alertRulesHref).toContain('/alert/setting?signal=traces');
    [checkout?.links.metricsHref, checkout?.links.logsHref, checkout?.links.tracesHref].forEach(href => {
      const url = new URL(href || '/', 'http://localhost');
      expect(url.searchParams.get('entityId')).toBe('service:commerce/checkout');
      expect(url.searchParams.get('entityName')).toBe('checkout-api');
      expect(url.searchParams.get('serviceName')).toBe('checkout-api');
      expect(url.searchParams.get('serviceNamespace')).toBe('commerce');
      expect(url.searchParams.get('environment')).toBe('prod');
      expect(url.searchParams.get('timeRange')).toBe('last-1h');
      expect(url.searchParams.get('source')).toBe('topology:otlp-trace-call');
    });
    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'svc-frontend', to: 'svc-checkout', relationshipType: 'trace-call', source: 'otlp-trace-call' }),
        expect.objectContaining({ from: 'svc-checkout', to: 'res-orders-db', relationshipType: 'database-connection', source: 'database-middleware-connection' }),
        expect.objectContaining({ from: 'svc-checkout', to: 'res-redis', relationshipType: 'middleware-connection', source: 'template-dependency' }),
        expect.objectContaining({ from: 'monitor-checkout', to: 'svc-checkout', relationshipType: 'monitors', source: 'monitor-ownership' })
      ])
    );
    expect(model.edges.some(edge => edge.alertImpact === 'critical')).toBe(true);
  });

  it('consumes incoming entity context to focus the matching service and preserve the filter window', () => {
    const model = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-30m',
      source: 'topology:otlp-trace-call'
    });

    expect(model.activeNodeId).toBe('svc-checkout');
    expect(model.incomingContext).toMatchObject({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-30m'
    });
    expect(model.filterContext).toMatchObject({
      environment: 'prod',
      timeRange: 'last-30m',
      search: 'checkout-api',
      viewMode: 'service-call',
      hasIncomingContext: true
    });
    expect(model.viewModes.find(mode => mode.key === 'service-call')).toMatchObject({ active: true });

    const checkout = model.nodes.find(node => node.id === 'svc-checkout');
    const orders = model.nodes.find(node => node.id === 'res-orders-db');
    expect(checkout).toMatchObject({
      focus: 'active',
      routeContext: {
        timeRange: 'last-30m',
        environment: 'prod'
      }
    });
    expect(orders).toMatchObject({ focus: 'related' });
    expect(checkout?.links.metricsHref).toContain('timeRange=last-30m');
    expect(model.edges.find(edge => edge.from === 'svc-checkout' && edge.to === 'res-orders-db')).toMatchObject({
      focus: 'active-path'
    });
  });

  it('switches incoming resource context to the resource-dependency view mode', () => {
    const model = buildTopologyServiceMap({
      entityId: 'database:commerce/orders',
      entityName: 'orders-db',
      environment: 'prod',
      timeRange: 'last-15m'
    });

    expect(model.activeNodeId).toBe('res-orders-db');
    expect(model.filterContext).toMatchObject({
      search: 'orders-db',
      viewMode: 'resource-dependency',
      timeRange: 'last-15m'
    });
    expect(model.viewModes.find(mode => mode.key === 'resource-dependency')).toMatchObject({ active: true });
    expect(model.nodes.find(node => node.id === 'res-orders-db')).toMatchObject({ focus: 'active' });
  });

  it('narrows the graph by requested view mode and relationship source with an alert-impact entry point', () => {
    const model = buildTopologyServiceMap({
      viewMode: 'alert-impact',
      sourceKind: 'alert-impact',
      environment: 'prod',
      timeRange: 'last-1h'
    });

    expect(model.filterContext).toMatchObject({
      viewMode: 'alert-impact',
      sourceKind: 'alert-impact',
      hasNarrowing: true
    });
    expect(model.alertImpactHref).toContain('/alert/center?');
    expect(model.alertImpactHref).toContain('source=topology');
    expect(model.alertImpactHref).toContain('viewMode=alert-impact');
    expect(model.alertImpactHref).toContain('environment=prod');
    expect(model.viewModes.find(mode => mode.key === 'alert-impact')).toMatchObject({
      active: true,
      href: expect.stringContaining('viewMode=alert-impact')
    });
    expect(model.sources.find(source => source.kind === 'alert-impact')).toMatchObject({
      active: true,
      href: expect.stringContaining('sourceKind=alert-impact')
    });
    expect(model.sources.find(source => source.kind === 'otlp-trace-call')).toMatchObject({ active: false });

    const activeEdges = model.edges.filter(edge => edge.focus === 'active-path');
    expect(activeEdges.length).toBeGreaterThan(0);
    expect(activeEdges.every(edge => edge.alertImpact !== 'none')).toBe(true);
    expect(model.edges.find(edge => edge.from === 'app-commerce' && edge.to === 'svc-frontend')).toMatchObject({
      focus: 'context-muted'
    });
    expect(model.nodes.find(node => node.id === 'svc-checkout')).toMatchObject({ focus: 'related' });
    expect(model.nodes.find(node => node.id === 'svc-frontend')).toMatchObject({ focus: 'related' });
    expect(model.nodes.find(node => node.id === 'k8s-checkout-workload')).toMatchObject({ focus: 'dimmed' });
  });

  it('preserves the active topology view and relationship source when jumping to entity and signal worktables', () => {
    const model = buildTopologyServiceMap({
      viewMode: 'alert-impact',
      sourceKind: 'alert-impact',
      environment: 'prod',
      timeRange: 'last-1h'
    });
    const checkout = model.nodes.find(node => node.id === 'svc-checkout');

    expect(checkout?.links.entityHref).toContain('/entities/service%3Acommerce%2Fcheckout?');
    [
      checkout?.links.entityHref,
      checkout?.links.metricsHref,
      checkout?.links.logsHref,
      checkout?.links.tracesHref,
      checkout?.links.alertRulesHref
    ].forEach(href => {
      const url = new URL(href || '/', 'http://localhost');
      expect(url.searchParams.get('viewMode')).toBe('alert-impact');
      expect(url.searchParams.get('sourceKind')).toBe('alert-impact');

      const returnTo = url.searchParams.get('returnTo');
      expect(returnTo).toBeTruthy();
      const returnUrl = new URL(returnTo || '/', 'http://localhost');
      expect(returnUrl.pathname).toBe('/topology');
      expect(returnUrl.searchParams.get('entityId')).toBe('service:commerce/checkout');
      expect(returnUrl.searchParams.get('serviceName')).toBe('checkout-api');
      expect(returnUrl.searchParams.get('environment')).toBe('prod');
      expect(returnUrl.searchParams.get('timeRange')).toBe('last-1h');
      expect(returnUrl.searchParams.get('viewMode')).toBe('alert-impact');
      expect(returnUrl.searchParams.get('sourceKind')).toBe('alert-impact');
    });
  });

  it('delegates display-label cleanup to the shared signal route context owner', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/topology-surface/view-model.ts'), 'utf8');

    expect(source).not.toContain("params.delete('returnLabel')");
  });

  it('shows selected relationship evidence and keeps edge context in drilldown links', () => {
    const model = buildTopologyServiceMap({
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      environment: 'prod',
      timeRange: 'last-1h'
    });

    expect(model.selectedEdgeId).toBe('svc-checkout--res-orders-db');
    expect(model.selectedEdge).toMatchObject({
      id: 'svc-checkout--res-orders-db',
      selected: true,
      focus: 'active-path',
      evidence: {
        title: '订单库连接',
        sourceLabel: '数据库 / 中间件连接',
        confidence: 'high',
        boundary:
          '当前边仅基于已采集的关系证据；依赖自动发现、变更时间线和根因分析仍是 roadmap 能力。',
        alertImpactCopy: '带当前边、实体和三信号上下文进入告警影响面。',
        rows: expect.arrayContaining([
          expect.objectContaining({ label: '起点实体', value: 'checkout-api' }),
          expect.objectContaining({ label: '终点实体', value: 'orders-db' }),
          expect.objectContaining({ label: '采集证据', value: expect.stringContaining('连接') })
        ])
      }
    });

    const selected = model.selectedEdge;
    [
      selected?.drilldownHref,
      selected?.links.fromEntityHref,
      selected?.links.toEntityHref,
      selected?.links.metricsHref,
      selected?.links.logsHref,
      selected?.links.tracesHref,
      selected?.links.alertImpactHref
    ].forEach(href => {
      const url = new URL(href || '/', 'http://localhost');
      expect(url.searchParams.get('viewMode')).toBe('resource-dependency');
      expect(url.searchParams.get('sourceKind')).toBe('database-middleware-connection');
      expect(url.searchParams.get('edgeId')).toBe('svc-checkout--res-orders-db');

      if (url.pathname !== '/topology') {
        const returnUrl = new URL(url.searchParams.get('returnTo') || '/', 'http://localhost');
        expect(returnUrl.pathname).toBe('/topology');
        expect(returnUrl.searchParams.get('viewMode')).toBe('resource-dependency');
        expect(returnUrl.searchParams.get('sourceKind')).toBe('database-middleware-connection');
        expect(returnUrl.searchParams.get('edgeId')).toBe('svc-checkout--res-orders-db');
      }
    });
    expect(new URL(selected?.links.alertImpactHref || '/', 'http://localhost').pathname).toBe('/alert/center');
  });

  it('keeps incoming fault evidence context on selected topology edge links', () => {
    const model = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    });
    const selected = model.selectedEdge;

    expect(model.activeNodeId).toBe('svc-checkout');
    expect(selected?.id).toBe('svc-checkout--res-orders-db');
    expect(model.faultContextRows).toEqual([
      { label: '当前实体', value: 'checkout-api', meta: 'entityId service:commerce/checkout' },
      { label: '当前服务', value: 'checkout-api', meta: 'commerce' },
      { label: '链路上下文', value: 'trace-123', meta: 'spanId span-456' },
      { label: '当前环境', value: 'prod', meta: '环境' },
      { label: '时间范围', value: 'last-1h', meta: '查询窗口' },
      { label: '采集来源', value: 'OTLP', meta: '采集器 edge-collector-a · 模板 java-service' }
    ]);

    [
      selected?.links.metricsHref,
      selected?.links.logsHref,
      selected?.links.tracesHref,
      selected?.links.alertImpactHref
    ].forEach(href => {
      const url = new URL(href || '/', 'http://localhost');
      expect(url.searchParams.get('entityId')).toBe('service:commerce/checkout');
      expect(url.searchParams.get('entityName')).toBe('checkout-api');
      expect(url.searchParams.get('serviceName')).toBe('checkout-api');
      expect(url.searchParams.get('serviceNamespace')).toBe('commerce');
      expect(url.searchParams.get('environment')).toBe('prod');
      expect(url.searchParams.get('timeRange')).toBe('last-1h');
      expect(url.searchParams.get('source')).toBe(url.pathname === '/alert/center' ? 'topology' : 'otlp');
      expect(url.searchParams.get('traceId')).toBe('trace-123');
      expect(url.searchParams.get('spanId')).toBe('span-456');
      expect(url.searchParams.get('collector')).toBe('edge-collector-a');
      expect(url.searchParams.get('template')).toBe('java-service');
      expect(url.searchParams.get('viewMode')).toBe('resource-dependency');
      expect(url.searchParams.get('sourceKind')).toBe('database-middleware-connection');
      expect(url.searchParams.get('edgeId')).toBe('svc-checkout--res-orders-db');

      if (url.pathname !== '/topology' && url.pathname !== '/alert/center') {
        const returnUrl = new URL(url.searchParams.get('returnTo') || '/', 'http://localhost');
        expect(returnUrl.pathname).toBe('/topology');
        expect(returnUrl.searchParams.get('traceId')).toBe('trace-123');
        expect(returnUrl.searchParams.get('spanId')).toBe('span-456');
        expect(returnUrl.searchParams.get('collector')).toBe('edge-collector-a');
        expect(returnUrl.searchParams.get('template')).toBe('java-service');
        expect(returnUrl.searchParams.get('viewMode')).toBe('resource-dependency');
        expect(returnUrl.searchParams.get('edgeId')).toBe('svc-checkout--res-orders-db');
      }
    });
  });

  it('localizes topology model chrome and inherited context for the en-US closeout sweep', () => {
    const t = createTranslatorMock({ locale: 'en-US' });
    const buildLocalizedServiceMap = buildTopologyServiceMap as (
      context: Parameters<typeof buildTopologyServiceMap>[0],
      t: ReturnType<typeof createTranslatorMock>
    ) => ReturnType<typeof buildTopologyServiceMap>;
    const model = buildLocalizedServiceMap(
      {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db'
      },
      t
    );

    const visibleModelText = JSON.stringify({
      productIdentity: model.productIdentity,
      sources: model.sources.map(source => [source.label, source.copy]),
      viewModes: model.viewModes.map(mode => [mode.label, mode.copy]),
      health: model.nodes.map(node => node.healthAffordance),
      selectedEdge: model.selectedEdge?.evidence,
      faultContextRows: model.faultContextRows
    });

    expect(model.productIdentity).toBe('HertzBeat operations topology');
    expect(model.sources.find(source => source.kind === 'database-middleware-connection')).toMatchObject({
      label: 'Database / middleware connection'
    });
    expect(model.viewModes.find(mode => mode.key === 'resource-dependency')).toMatchObject({
      label: 'Resource dependency'
    });
    expect(model.selectedEdge?.evidence.boundary).toContain('roadmap');
    expect(model.faultContextRows.map(row => row.label)).toEqual(
      expect.arrayContaining(['Current entity', 'Current service', 'Trace context', 'Source'])
    );
    expect(visibleModelText).not.toMatch(/[一-龥]/);
    expect(visibleModelText).not.toContain('topology.');
    expect(visibleModelText).not.toContain('signal.context.');
  });

  it('keeps unified time and monitor context when topology fans out to evidence surfaces', () => {
    const model = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    });
    const selected = model.selectedEdge;

    expect(model.faultContextRows).toContainEqual({
      label: '监控实例',
      value: 'checkout-http',
      meta: 'website · example.com:443 · monitorId 632051474676992'
    });
    expect(model.faultContextRows).toContainEqual({
      label: '时间范围',
      value: 'last-45m',
      meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · 刷新 30s · 已暂停 · Asia/Shanghai'
    });
    expect(model.faultContextRows).toContainEqual({
      label: '采集来源',
      value: '传统监控',
      meta: '监控中心上下文'
    });

    [
      selected?.links.fromEntityHref,
      selected?.links.toEntityHref,
      selected?.links.metricsHref,
      selected?.links.logsHref,
      selected?.links.tracesHref,
      selected?.links.alertImpactHref,
      model.alertImpactHref
    ].forEach(href => {
      const params = new URL(href || '/', 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-45m');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713202700000');
      expect(params.get('refresh')).toBe('30');
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('monitorId')).toBe('632051474676992');
      expect(params.get('monitorName')).toBe('checkout-http');
      expect(params.get('monitorApp')).toBe('website');
      expect(params.get('monitorInstance')).toBe('example.com:443');
    });
  });

  it('drops stale selected edge context when source or view switches no longer match the collected relationship evidence', () => {
    const mismatched = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-1h',
      viewMode: 'service-call',
      sourceKind: 'otlp-trace-call',
      edgeId: 'svc-checkout--res-orders-db'
    });

    expect(mismatched.selectedEdgeId).toBeUndefined();
    expect(mismatched.selectedEdge).toBeUndefined();
    expect(mismatched.filterContext).toMatchObject({
      viewMode: 'service-call',
      sourceKind: 'otlp-trace-call',
      search: 'checkout-api'
    });

    const databaseSourceHref = mismatched.sources.find(source => source.kind === 'database-middleware-connection')?.href;
    const otlpSourceHref = mismatched.sources.find(source => source.kind === 'otlp-trace-call')?.href;
    const serviceCallHref = mismatched.viewModes.find(mode => mode.key === 'service-call')?.href;
    [databaseSourceHref, otlpSourceHref, serviceCallHref].forEach(href => {
      const url = new URL(href || '/', 'http://localhost');
      expect(url.searchParams.get('entityId')).toBe('service:commerce/checkout');
      expect(url.searchParams.get('serviceName')).toBe('checkout-api');
      expect(url.searchParams.get('timeRange')).toBe('last-1h');
      expect(url.searchParams.has('edgeId')).toBe(false);
    });

    const compatible = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-1h',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db'
    });

    expect(compatible.selectedEdgeId).toBe('svc-checkout--res-orders-db');
    expect(new URL(compatible.sources.find(source => source.kind === 'alert-impact')?.href || '/', 'http://localhost').searchParams.get('edgeId')).toBe(
      'svc-checkout--res-orders-db'
    );
    expect(new URL(compatible.viewModes.find(mode => mode.key === 'service-call')?.href || '/', 'http://localhost').searchParams.has('edgeId')).toBe(false);
  });

  it('summarizes milestone 7 closure without promoting roadmap-only dependency and RCA domains', () => {
    const review = buildTopologyFaultAnalysisReview();

    expect(review.milestone).toBe(7);
    expect(review.status).toBe('ready-for-automation-action-catalog');
    expect(review.implementedCapabilities).toEqual([
      'entity-topology-surface',
      'fault-context-entry',
      'relationship-source-controls',
      'selected-edge-evidence',
      'edge-evidence-boundary',
      'alert-impact-handoff',
      'stale-edge-sanitization',
      'three-signal-drilldowns'
    ]);
    expect(review.relationshipSources).toEqual([
      'otlp-trace-call',
      'monitor-ownership',
      'template-dependency',
      'k8s-workload',
      'database-middleware-connection',
      'cmdb-manual-label',
      'alert-impact'
    ]);
    expect(review.futureRoadmapOnly).toEqual([
      'dependency-auto-discovery',
      'change-timeline',
      'blast-radius-analysis',
      'root-cause-analysis',
      'resource-config-changes'
    ]);
    expect(review.nextMilestone).toBe('automation-action-catalog');
  });
});
