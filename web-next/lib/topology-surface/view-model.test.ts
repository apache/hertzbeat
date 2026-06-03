import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildTopologyFaultAnalysisReview,
  buildTopologyServiceMap,
  buildTopologyServiceMapFromApiGraph
} from './view-model';

describe('topology surface config', () => {
  it('builds a HertzBeat-native topology model with enterprise relationship sources', () => {
    const model = buildTopologyServiceMap();

    expect(model.dataSource).toBe('static-fallback');
    expect(model.productIdentity).toBe('Operations topology');
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
        label: 'Health score 62',
        copy: 'Collected 1 / 2 healthy',
        meta: 'Alerts 1 · anomalies 5',
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

  it('maps API-backed topology graph data instead of falling back to the static service map', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: 501,
        depth: 2,
        sourceKinds: ['otlp-trace-call'],
        nodes: [
          {
            id: '501',
            entityId: 501,
            entityName: 'api-checkout',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'warning',
            focus: true,
            evidenceBadges: ['entity-relation', 'otlp'],
            redMetrics: {
              requestRatePerSecond: 12.34,
              errorRate: 0.042,
              latencyP95Ms: 180
            }
          },
          {
            id: '502',
            entityId: 502,
            entityName: 'api-orders',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'healthy',
            focus: false,
            evidenceBadges: ['entity-relation', 'otlp'],
            redMetrics: {
              requestRatePerSecond: '9.5',
              errorRate: '0.01',
              latencyP95Ms: '95'
            }
          }
        ],
        edges: [
          {
            id: '700',
            relationId: 700,
            sourceEntityId: 501,
            targetEntityId: 502,
            targetRef: undefined,
            relationType: 'trace-call',
            relationSource: 'otlp-trace-call',
            sampleTraceId: 'trace-700',
            sampleSpanId: 'span-700',
            firstSeen: '2026-05-20T03:01:00Z',
            lastSeen: '2026-05-20T03:08:00Z',
            status: 'active',
            score: 96,
            evidenceBadges: ['entity-relation', 'otlp-trace-call'],
            redMetrics: {
              requestRatePerSecond: 7.25,
              errorRate: 0.021,
              latencyP95Ms: 123
            }
          }
        ]
      },
      {
        entityId: '501',
        environment: 'prod',
        timeRange: 'last-30m',
        groupBy: 'source-kind'
      }
    );

    expect(model.dataSource).toBe('api');
    expect(model.apiDepth).toBe(2);
    expect(model.activeNodeId).toBe('entity-501');
    expect(model.filterContext.groupBy).toBe('source-kind');
    expect(model.nodes.map(node => node.label)).toEqual(['api-checkout', 'api-orders']);
    expect(model.nodes[0]).toMatchObject({
      health: 'warning',
      evidenceBadges: ['entity-relation', 'otlp', 'otlp-trace-call']
    });
    expect(model.nodes[0].redMetrics).toMatchObject({
      requestRatePerSecond: 12.34,
      errorRate: 0.042,
      latencyP95Ms: 180
    });
    expect(model.nodes[1].redMetrics).toMatchObject({
      requestRatePerSecond: 9.5,
      errorRate: 0.01,
      latencyP95Ms: 95
    });
    expect(model.nodes.map(node => node.id)).not.toContain('svc-checkout');
    expect(model.edges).toHaveLength(1);
    expect(model.edges[0]).toMatchObject({
      id: 'relation-700',
      from: 'entity-501',
      to: 'entity-502',
      relationshipType: 'trace-call',
      source: 'otlp-trace-call',
      evidenceBadges: ['entity-relation', 'otlp-trace-call'],
      redMetrics: {
        requestRatePerSecond: 7.25,
        errorRate: 0.021,
        latencyP95Ms: 123
      },
      focus: 'active-path'
    });
    expect(model.edges[0].evidence.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'api-checkout', meta: '501' }),
        expect.objectContaining({ value: 'api-orders', meta: '502' }),
        expect.objectContaining({ value: 'otlp-trace-call' }),
        expect.objectContaining({ value: 'trace-700', meta: 'span-700' }),
        expect.objectContaining({ value: '2026-05-20T03:01:00Z' })
      ])
    );
    expect(model.edges[0].evidence).toMatchObject({
      firstSeen: '2026-05-20T03:01:00Z',
      lastSeen: '2026-05-20T03:08:00Z',
      sampleTraceId: 'trace-700',
      sampleSpanId: 'span-700'
    });
    expect(model.nodes[0].links.metricsHref).toContain('entityId=501');
    expect(model.nodes[0].links.metricsHref).toContain('timeRange=last-30m');
  });

  it('uses trace-call edge sample context for signal drilldowns and return links', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: 501,
        depth: 2,
        sourceKinds: ['otlp-trace-call'],
        nodes: [
          {
            id: '501',
            entityId: 501,
            entityName: 'checkout-api',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'warning',
            focus: true
          },
          {
            id: '502',
            entityId: 502,
            entityName: 'payment-api',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'healthy'
          }
        ],
        edges: [
          {
            id: 'trace-call:501:502:trace-701',
            sourceEntityId: 501,
            targetEntityId: 502,
            relationType: 'trace-call',
            relationSource: 'otlp-trace-call',
            sampleTraceId: 'trace-701',
            sampleSpanId: 'span-701',
            status: 'warning',
            evidenceBadges: ['otlp-trace-call', 'service-graph']
          }
        ]
      },
      {
        entityId: '501',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-30m',
        traceId: 'incoming-trace',
        spanId: 'incoming-span',
        viewMode: 'service-call',
        sourceKind: 'otlp-trace-call'
      }
    );

    const selected = model.selectedEdge ?? model.edges[0];
    expect(selected.evidence.sampleTraceId).toBe('trace-701');
    expect(selected.evidence.sampleSpanId).toBe('span-701');

    [selected.links.logsHref, selected.links.tracesHref].forEach(href => {
      const url = new URL(href, 'http://localhost');
      expect(url.searchParams.get('traceId')).toBe('trace-701');
      expect(url.searchParams.get('spanId')).toBe('span-701');
      expect(url.searchParams.get('viewMode')).toBe('service-call');
      expect(url.searchParams.get('sourceKind')).toBe('otlp-trace-call');
      expect(url.searchParams.get('edgeId')).toBe('relation-trace-call:501:502:trace-701');

      const returnUrl = new URL(url.searchParams.get('returnTo') || '/', 'http://localhost');
      expect(returnUrl.pathname).toBe('/topology');
      expect(returnUrl.searchParams.get('traceId')).toBe('trace-701');
      expect(returnUrl.searchParams.get('spanId')).toBe('span-701');
      expect(returnUrl.searchParams.get('edgeId')).toBe('relation-trace-call:501:502:trace-701');
    });
  });

  it('normalizes fallback topology groupBy route scope for shared G6 controls', () => {
    const grouped = buildTopologyServiceMap({ groupBy: 'entity-type' });
    const invalid = buildTopologyServiceMap({ groupBy: 'cluster' });

    expect(grouped.filterContext.groupBy).toBe('entity-type');
    expect(invalid.filterContext.groupBy).toBe('none');
  });

  it('preserves active groupBy route scope across source and view mode controls', () => {
    const model = buildTopologyServiceMap({
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-1h',
      viewMode: 'service-call',
      sourceKind: 'otlp-trace-call',
      groupBy: 'source-kind'
    });

    const databaseSourceHref = model.sources.find(source => source.kind === 'database-middleware-connection')?.href;
    const serviceCallHref = model.viewModes.find(mode => mode.key === 'service-call')?.href;
    const resourceDependencyHref = model.viewModes.find(mode => mode.key === 'resource-dependency')?.href;

    [databaseSourceHref, serviceCallHref, resourceDependencyHref].forEach(href => {
      const params = new URL(href || '/', 'http://localhost').searchParams;
      expect(params.get('groupBy')).toBe('source-kind');
      expect(params.get('entityId')).toBe('service:commerce/checkout');
      expect(params.get('serviceName')).toBe('checkout-api');
      expect(params.get('timeRange')).toBe('last-1h');
    });
  });

  it('keeps API-backed empty topology graphs instead of falling back to seed data', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: null,
        depth: 2,
        sourceKinds: ['entity-relation'],
        nodes: [],
        edges: []
      },
      {
        environment: 'prod',
        timeRange: 'last-1h'
      }
    );

    expect(model.dataSource).toBe('api');
    expect(model.nodes).toEqual([]);
    expect(model.edges).toEqual([]);
    expect(model.activeNodeId).toBeUndefined();
    expect(model.filterContext).toMatchObject({
      environment: 'prod',
      timeRange: 'last-1h',
      search: '',
      hasIncomingContext: true
    });
  });

  it('treats backend entity-relation sourceKind as the manual relation source filter in the UI model', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: null,
        depth: 2,
        sourceKinds: ['entity-relation'],
        nodes: [
          {
            id: '501',
            entityId: 501,
            entityName: 'Checkout API',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'warning',
            evidenceBadges: ['entity-relation']
          },
          {
            id: '502',
            entityId: 502,
            entityName: 'Payment API',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'healthy',
            evidenceBadges: ['entity-relation']
          }
        ],
        edges: [
          {
            id: '101',
            relationId: 101,
            sourceEntityId: 501,
            targetEntityId: 502,
            relationType: 'depends_on',
            relationSource: 'manual',
            status: 'confirmed',
            score: 92,
            evidenceBadges: ['entity-relation', 'manual']
          }
        ]
      },
      {
        environment: 'prod',
        sourceKind: 'entity-relation',
        depth: '2'
      }
    );

    expect(model.filterContext.sourceKind).toBe('cmdb-manual-label');
    expect(model.sources.find(source => source.kind === 'cmdb-manual-label')).toMatchObject({
      active: true
    });
    expect(model.edges[0]).toMatchObject({
      source: 'cmdb-manual-label',
      focus: 'active-path'
    });
  });

  it('maps API-backed impact timeline events without treating change history as roadmap-only', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: 501,
        depth: 1,
        sourceKinds: ['entity-relation'],
        nodes: [
          {
            id: '501',
            entityId: 501,
            entityName: 'api-checkout',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'warning',
            focus: true,
            evidenceBadges: ['entity-relation']
          },
          {
            id: '502',
            entityId: 502,
            entityName: 'api-orders',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'healthy',
            evidenceBadges: ['entity-relation']
          }
        ],
        edges: [
          {
            id: '101',
            relationId: 101,
            sourceEntityId: 501,
            targetEntityId: 502,
            relationType: 'depends_on',
            relationSource: 'manual',
            status: 'confirmed',
            score: 92,
            evidenceBadges: ['entity-relation', 'manual']
          }
        ],
        impactTimeline: [
          {
            id: 'activity:901',
            entityId: 501,
            sourceKind: 'cmdb-manual-label',
            eventType: 'entity-definition',
            title: 'Definition updated',
            detail: 'owner changed',
            actor: 'alice',
            occurredAt: '2026-05-19T11:12:00'
          },
          {
            id: 'relation:101',
            edgeId: '101',
            sourceKind: 'cmdb-manual-label',
            eventType: 'relation-updated',
            title: 'depends_on updated',
            detail: 'manual',
            actor: 'system',
            occurredAt: '2026-05-19T11:10:00'
          }
        ]
      },
      {
        entityId: '501',
        environment: 'prod',
        timeRange: 'last-1h'
      }
    );

    expect(model.impactTimeline).toEqual([
      expect.objectContaining({
        id: 'activity:901',
        entityId: '501',
        sourceKind: 'cmdb-manual-label',
        eventType: 'entity-definition',
        title: 'Definition updated',
        detail: 'owner changed',
        actor: 'alice',
        occurredAt: '2026-05-19T11:12:00'
      }),
      expect.objectContaining({
        id: 'relation:101',
        edgeId: 'relation-101',
        sourceKind: 'cmdb-manual-label',
        eventType: 'relation-updated',
        title: 'depends_on updated',
        detail: 'manual',
        actor: 'system',
        occurredAt: '2026-05-19T11:10:00'
      })
    ]);
    expect(buildTopologyFaultAnalysisReview().futureRoadmapOnly).not.toContain('change-timeline');
    expect(buildTopologyFaultAnalysisReview().implementedCapabilities).toContain('impact-timeline');
  });

  it('maps API monitor-bind nodes and non-entity edge endpoints', () => {
    const model = buildTopologyServiceMapFromApiGraph(
      {
        apiBacked: true,
        focusEntityId: 501,
        depth: 1,
        sourceKinds: ['entity-relation', 'monitor-bind'],
        nodes: [
          {
            id: '501',
            entityId: 501,
            entityName: 'checkout-api',
            entityType: 'service',
            namespace: 'commerce',
            environment: 'prod',
            health: 'warning',
            focus: true,
            evidenceBadges: ['entity-relation']
          },
          {
            id: 'monitor:701',
            entityId: 701,
            entityName: 'checkout-http',
            entityType: 'monitor',
            namespace: 'website',
            environment: 'prod',
            health: 'healthy',
            evidenceBadges: ['monitor-bind', 'service.name']
          }
        ],
        edges: [
          {
            id: 'monitor-bind:901',
            relationId: 901,
            sourceNodeId: '501',
            targetNodeId: 'monitor:701',
            sourceEntityId: 501,
            targetEntityId: null,
            targetRef: 'monitor:701',
            relationType: 'monitors',
            relationSource: 'monitor-bind',
            status: 'active',
            score: 97,
            evidenceBadges: ['monitor-bind', 'service.name']
          }
        ]
      },
      {
        entityId: '501',
        environment: 'prod',
        timeRange: 'last-1h'
      }
    );

    expect(model.dataSource).toBe('api');
    expect(model.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['entity-501', 'monitor:701']));
    expect(model.edges).toHaveLength(1);
    expect(model.edges[0]).toMatchObject({
      id: 'relation-901',
      from: 'entity-501',
      to: 'monitor:701',
      relationshipType: 'monitors',
      source: 'monitor-ownership',
      label: 'monitors'
    });
    expect(model.edges[0].evidence.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'checkout-api', meta: '501' }),
        expect.objectContaining({ value: 'checkout-http', meta: '701' }),
        expect.objectContaining({ value: 'monitor-bind' })
      ])
    );
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
    expect(model.nodes.find(node => node.id === 'res-orders-db')).toMatchObject({ focus: 'related' });
    expect(model.nodes.find(node => node.id === 'svc-frontend')).toMatchObject({ focus: 'dimmed' });
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
        title: 'Orders database connection',
        sourceLabel: 'Database / middleware connection',
        confidence: 'high',
        boundary:
          'This edge only uses collected relationship evidence; dependency auto-discovery and root cause analysis remain roadmap capabilities.',
        alertImpactCopy: 'Open alert impact with the current edge, entity, and three-signal context.',
        rows: expect.arrayContaining([
          expect.objectContaining({ label: 'Source entity', value: 'checkout-api' }),
          expect.objectContaining({ label: 'Target entity', value: 'orders-db' }),
          expect.objectContaining({ label: 'Collection evidence', value: expect.stringContaining('connection') })
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
      { label: 'Current entity', value: 'checkout-api', meta: 'entityId service:commerce/checkout' },
      { label: 'Current service', value: 'checkout-api', meta: 'commerce' },
      { label: 'Trace context', value: 'trace-123', meta: 'spanId span-456' },
      { label: 'Current environment', value: 'prod', meta: 'Environment' },
      { label: 'Time range', value: 'last-1h', meta: 'Query window' },
      { label: 'Source', value: 'OTLP', meta: 'Collector edge-collector-a · Template java-service' }
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

    expect(model.productIdentity).toBe('Operations topology');
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
    expect(visibleModelText).not.toMatch(/[\u4e00-\u9fa5]/u);
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
      label: 'Monitor instance',
      value: 'checkout-http',
      meta: 'website · example.com:443 · monitorId 632051474676992'
    });
    expect(model.faultContextRows).toContainEqual({
      label: 'Time range',
      value: 'last-45m',
      meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · Refresh 30s · Paused · Asia/Shanghai'
    });
    expect(model.faultContextRows).toContainEqual({
      label: 'Source',
      value: 'Traditional monitoring',
      meta: 'Monitor center context'
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
  }, 15000);

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
      'impact-timeline',
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
      'blast-radius-analysis',
      'root-cause-analysis',
      'resource-config-changes'
    ]);
    expect(review.nextMilestone).toBe('automation-action-catalog');
  });
});
