import { describe, expect, it } from 'vitest';
import {
  buildCollectionSourceRows,
  buildCurrentAlertRows,
  buildDetailFacts,
  buildDrilldownRows,
  buildEntityAttributionRows,
  buildEntityContextHandoffLinks,
  buildEntityEvidenceHandoffRows,
  buildEntityHealthModel,
  buildEntityIncomingContextRows,
  buildUnifiedEvidenceRows,
  buildNextActionRows,
  buildOverviewRows,
  buildRelationshipRows,
  buildSummaryRows
} from './view-model';

describe('entity detail view model', () => {
  it('builds detail facts from entity', () => {
    expect(
      buildDetailFacts({ id: 123, type: 'service', status: 'unknown', owner: 'ops' } as any)
    ).toEqual([
      { label: 'Entity ID', value: '123' },
      { label: 'Type', value: 'service' },
      { label: 'Status', value: 'Unknown' },
      { label: 'Owner', value: 'ops' }
    ]);
  });

  it('builds overview rows', () => {
    expect(
      buildOverviewRows(
        {
          description: 'checkout service',
          system: 'payments',
          owner: 'platform',
          environment: 'prod',
          status: 'healthy',
          type: 'service'
        } as any,
        {} as any
      )
    ).toEqual([
      { title: 'Status', copy: 'Healthy', meta: 'service', tone: 'success' },
      { title: 'Owner', copy: 'platform', meta: 'payments' },
      { title: 'Environment', copy: 'prod', meta: '-' },
      { title: 'Description', copy: 'checkout service', meta: '-' }
    ]);
  });

  it('builds related signal summary rows', () => {
    expect(
      buildSummaryRows({
        evidenceSummary: { downMonitorCount: 1 },
        monitorSummary: { totalBoundMonitors: 2 },
        logSummary: { hintCount: 3, preferredQueryTitle: 'checkout errors' },
        traceSummary: { recentTraceCount: 4, recentErrorTraceCount: 1 }
      } as any)
    ).toEqual([
      { title: 'Related metrics', copy: '2 bound monitors', meta: '1 abnormal monitors', tone: 'danger' },
      { title: 'Related logs', copy: '3 query hints available', meta: 'checkout errors', tone: 'warning' },
      { title: 'Related traces', copy: '4 recent traces', meta: '1 error traces', tone: 'danger' }
    ]);
  });

  it('prefers the shared signal evidence bundle over scattered signal fields', () => {
    const detail = {
      evidenceSummary: { downMonitorCount: 0 },
      monitorSummary: { totalBoundMonitors: 1 },
      logSummary: { hintCount: 1, preferredQueryTitle: 'stale log context' },
      traceSummary: { recentTraceCount: 1, recentErrorTraceCount: 0, latestTraceId: 'stale-trace' },
      unifiedEvidenceSummary: {
        activeSignalCount: 1,
        metricsActive: true,
        logsActive: false,
        tracesActive: false,
        metricEvidenceCount: 1,
        logEvidenceCount: 0,
        traceEvidenceCount: 0
      },
      signalEvidence: {
        logSummary: { hintCount: 5, preferredQueryTitle: 'shared log context' },
        traceSummary: { recentTraceCount: 8, recentErrorTraceCount: 2, latestTraceId: 'shared-trace' },
        unifiedEvidenceSummary: {
          activeSignalCount: 3,
          metricsActive: true,
          logsActive: true,
          tracesActive: true,
          metricEvidenceCount: 2,
          logEvidenceCount: 5,
          traceEvidenceCount: 8
        }
      }
    } as any;

    expect(buildSummaryRows(detail)).toEqual([
      { title: 'Related metrics', copy: '1 bound monitors', meta: 'No abnormal monitors', tone: 'success' },
      { title: 'Related logs', copy: '5 query hints available', meta: 'shared log context', tone: 'warning' },
      { title: 'Related traces', copy: '8 recent traces', meta: '2 error traces', tone: 'danger' }
    ]);
    expect(buildUnifiedEvidenceRows(detail)[3]).toEqual({
      title: 'Traces / RED',
      copy: '8 recent traces',
      meta: '2 error traces',
      tone: 'danger'
    });
    expect(buildEntityContextHandoffLinks(detail, 'last-1h')[1].copy).toContain('traceId=shared-trace');
  });

  it('builds the lightweight HertzBeat service health model without heavy SLO authoring', () => {
    expect(
      buildEntityHealthModel({
        entity: {
          entity: {
            id: 42,
            name: 'checkout-api',
            environment: 'prod'
          }
        },
        evidenceSummary: {
          collectorOfflineCount: 1,
          collectorOnlineCount: 1,
          collectorTaskCount: 11,
          collectorTotalCount: 2,
          collectorLastSeenAt: '2026-04-10 18:05:00',
          downMonitorCount: 1,
          healthyMonitorCount: 1,
          logHintCount: 3
        },
        alertSummary: {
          totalActiveAlerts: 1
        },
        monitorSummary: {
          totalBoundMonitors: 2
        },
        logSummary: {
          hintCount: 3
        },
        traceSummary: {
          recentTraceCount: 4,
          recentErrorTraceCount: 1
        }
      } as any)
    ).toEqual([
      { title: 'Health score', copy: '66 / 100', meta: 'Lightweight health model', tone: 'warning' },
      { title: 'Availability', copy: '50%', meta: '1 / 2 monitors healthy', tone: 'danger' },
      { title: 'Error rate', copy: '25%', meta: '1 / 4 error traces', tone: 'danger' },
      { title: 'Latency', copy: 'No trace latency', meta: 'Waiting for OTLP span', tone: 'neutral' },
      { title: 'Current alerts', copy: '1 active alerts', meta: 'Alert closure', tone: 'danger' },
      { title: 'Recent anomalies', copy: '5 anomaly signals', meta: 'Monitors 1 · Traces 1 · Logs 3', tone: 'warning' },
      {
        title: 'Collection health',
        copy: 'Collectors 1 / 2 online',
        meta: 'Tasks 11 · offline 1',
        freshness: 'Last report 2026-04-10 18:05:00',
        href: '/setting/collector?entityId=42&serviceName=checkout-api&environment=prod&timeRange=last-1h',
        tone: 'warning'
      }
    ]);
  });

  it('builds entity-level RED/USE read-model evidence rows from unified backend evidence', () => {
    expect(
      buildUnifiedEvidenceRows({
        unifiedEvidenceSummary: {
          activeSignalCount: 3,
          metricsActive: true,
          logsActive: true,
          tracesActive: true,
          metricEvidenceCount: 5,
          logEvidenceCount: 7,
          traceEvidenceCount: 11,
          latestObservedAt: '2026-05-13 14:55:00',
          activeSignals: ['metrics', 'logs', 'traces']
        },
        traceSummary: {
          recentErrorTraceCount: 2
        }
      } as any)
    ).toEqual([
      { title: 'Evidence coverage', copy: '3 active signals', meta: 'metrics · logs · traces', tone: 'success' },
      { title: 'Metrics / USE', copy: '5 metric evidence', meta: 'Monitor and metric read model', tone: 'success' },
      { title: 'Logs / RED', copy: '7 log hints', meta: 'Log read model', tone: 'warning' },
      { title: 'Traces / RED', copy: '11 recent traces', meta: '2 error traces', tone: 'danger' },
      { title: 'Latest observation', copy: '2026-05-13 14:55:00', meta: 'Backend read model', tone: 'neutral' }
    ]);
  });

  it('does not fabricate zero RED/USE evidence when the backend read model is absent', () => {
    expect(buildUnifiedEvidenceRows({} as any)).toEqual([
      {
        title: 'Evidence coverage',
        copy: 'Waiting for backend evidence',
        meta: 'No unified read model',
        tone: 'neutral'
      }
    ]);
  });

  it('builds next action rows from server guidance when available', () => {
    expect(
      buildNextActionRows(
        {
          nextActions: [
            {
              title: 'Open monitors',
              summary: 'Inspect the abnormal monitors first.',
              actionLabel: 'Open monitors'
            },
            {
              title: 'Open discovery',
              summary: 'Add more evidence before triage.',
              actionLabel: 'Open discovery'
            }
          ]
        } as any,
        '123'
      )
    ).toEqual([
      { title: 'Open monitors', copy: 'Inspect abnormal monitors first.', meta: 'Open monitors' },
      { title: 'Open discovery', copy: 'Add more evidence before triage.', meta: 'Open discovery' }
    ]);
  });

  it('builds drilldown rows', () => {
    expect(buildDrilldownRows('123')).toEqual([
      { title: 'Definition workspace', copy: '/entities/123/definition', meta: 'Next route' },
      { title: 'Edit entity', copy: '/entities/123/edit', meta: 'Next route' },
      { title: 'Telemetry discovery', copy: '/entities/discovery', meta: 'Shared route' }
    ]);
  });

  it('builds entity context handoff links with unified entity, service, environment, time, trace, and span context', () => {
    expect(
      buildEntityContextHandoffLinks(
        {
          entity: {
            entity: {
              id: 42,
              name: 'checkout',
              displayName: 'Checkout',
              environment: 'prod'
            }
          },
          traceSummary: {
            latestTraceId: 'trace-123',
            latestSpanId: 'span-456'
          }
        } as any,
        'last-30m'
      )
    ).toEqual([
      {
        key: 'metrics',
        title: 'Related metrics',
        copy: '/ingestion/otlp/metrics?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: 'Metrics workbench'
      },
      {
        key: 'logs',
        title: 'Related logs',
        copy: '/log/manage?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m&traceId=trace-123&spanId=span-456',
        meta: 'Logs workbench'
      },
      {
        key: 'traces',
        title: 'Related traces',
        copy: '/trace/manage?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m&traceId=trace-123&spanId=span-456',
        meta: 'Traces workbench'
      },
      {
        key: 'alerts',
        title: 'Alert rules',
        copy: '/alert/setting?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: 'Threshold rules'
      },
      {
        key: 'monitors',
        title: 'Bound monitors',
        copy: '/monitors?entityId=42&entityName=Checkout&serviceName=checkout&environment=prod&timeRange=last-30m&returnTo=%2Fentities%2F42',
        meta: 'Monitored resources'
      },
      {
        key: 'topology',
        title: 'Upstream topology',
        copy: '/topology?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: 'Topology graph'
      },
      {
        key: 'template',
        title: 'Template binding',
        copy: '/entities/42/definition?entityId=42&serviceName=checkout&environment=prod&timeRange=last-30m',
        meta: 'Monitoring template'
      }
    ]);
  });

  it('builds alert, topology, and runbook handoffs only from real entity evidence', () => {
    const rows = buildEntityEvidenceHandoffRows(
      {
        entity: {
          entity: {
            id: 42,
            name: 'checkout',
            displayName: 'Checkout',
            environment: 'prod',
            runbook: 'https://runbooks.local/checkout'
          },
          relations: [{ relationType: 'calls', targetEntityId: 'mysql-1', targetEntityName: 'mysql-prod' }]
        },
        alertSummary: {
          totalActiveAlerts: 2
        },
        activeAlerts: [
          { id: 11, status: 'firing', content: 'latency high' },
          { id: 12, status: 'firing', content: 'error rate high' }
        ]
      } as any,
      {
        timeRange: 'last-45m',
        serviceName: 'checkout-route',
        environment: 'staging',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        source: 'monitor',
        monitorId: '632051474676992',
        monitorName: 'checkout-http'
      }
    );

    expect(rows.map(row => row.key)).toEqual(['alerts', 'topology', 'runbook']);
    expect(rows.map(row => row.evidence)).toEqual(['active-alerts', 'topology-relation', 'runbook']);
    expect(rows[0]).toMatchObject({
      key: 'alerts',
      count: 2,
      title: 'Active alert evidence',
      copy: '2 active alerts',
      meta: 'Open alert handling',
      href: expect.stringContaining('/alert?status=firing')
    });
    expect(rows[1]).toMatchObject({
      key: 'topology',
      count: 1,
      title: 'Topology context',
      copy: 'mysql-prod',
      meta: 'calls · mysql-1',
      href: expect.stringContaining('/topology?')
    });
    expect(rows[2]).toMatchObject({
      key: 'runbook',
      count: 1,
      title: 'Runbook',
      copy: 'https://runbooks.local/checkout',
      meta: 'Response guidance',
      href: 'https://runbooks.local/checkout'
    });

    const alertHref = new URL(rows[0]?.href || '/', 'http://localhost');
    expect(alertHref.searchParams.get('entityId')).toBe('42');
    expect(alertHref.searchParams.get('entityName')).toBe('Checkout');
    expect(alertHref.searchParams.get('serviceName')).toBe('checkout-route');
    expect(alertHref.searchParams.get('environment')).toBe('staging');
    expect(alertHref.searchParams.get('timeRange')).toBe('last-45m');
    expect(alertHref.searchParams.get('start')).toBe('1713200000000');
    expect(alertHref.searchParams.get('returnTo')).toBe('/entities/42');

    const topologyHref = new URL(rows[1]?.href || '/', 'http://localhost');
    expect(topologyHref.searchParams.get('topologyTargetId')).toBe('mysql-1');
    expect(topologyHref.searchParams.get('topologyTargetName')).toBe('mysql-prod');

    expect(buildEntityEvidenceHandoffRows({ entity: { entity: { id: 99, name: 'empty' }, relations: [] }, activeAlerts: [] } as any)).toEqual([]);
  });

  it('preserves inherited absolute time, refresh, pause, timezone, and monitor context from entity handoffs', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 42,
            name: 'checkout',
            displayName: 'Checkout',
            environment: 'prod'
          }
        },
        traceSummary: {
          latestTraceId: 'trace-summary',
          latestSpanId: 'span-summary'
        }
      } as any,
      {
        timeRange: 'last-45m',
        serviceName: 'checkout-route',
        serviceNamespace: 'commerce',
        environment: 'staging',
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
        traceId: 'trace-123',
        spanId: 'span-456'
      }
    );

    links.forEach(link => {
      const params = new URL(link.copy, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-45m');
      expect(params.get('serviceName')).toBe('checkout-route');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('staging');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713202700000');
      expect(params.get('refresh')).toBe('30');
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('source')).toBe('monitor');
      expect(params.get('monitorId')).toBe('632051474676992');
      expect(params.get('monitorName')).toBe('checkout-http');
      expect(params.get('monitorApp')).toBe('website');
      expect(params.get('monitorInstance')).toBe('example.com:443');
    });

    expect(new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost').searchParams.get('traceId')).toBe('trace-123');
    expect(new URL(links.find(link => link.key === 'traces')?.copy || '/', 'http://localhost').searchParams.get('spanId')).toBe('span-456');
  });

  it('builds compact visible inherited context rows for entity detail evidence entry', () => {
    expect(
      buildEntityIncomingContextRows({
        timeRange: 'last-45m',
        start: '1713200000000',
        end: '1713202700000',
        refresh: '30',
        live: 'false',
        tz: 'Asia/Shanghai',
        serviceName: 'checkout-api',
        environment: 'prod',
        source: 'monitor',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443'
      })
    ).toEqual([
      { label: 'Monitor instance', value: 'checkout-http', meta: 'website · example.com:443 · monitorId 632051474676992' },
      { label: 'Current service', value: 'checkout-api', meta: 'Service context' },
      { label: 'Current environment', value: 'prod', meta: 'Environment' },
      {
        label: 'Time range',
        value: 'last-45m',
        meta: '2024/04/16 00:53:20 → 2024/04/16 01:38:20 · Refresh 30s · Paused · Asia/Shanghai'
      },
      { label: 'Source', value: 'Traditional monitoring', meta: 'Monitor center context' }
    ]);
    expect(buildEntityIncomingContextRows({})).toEqual([]);
  });

  it('builds current alerts, relationships, and source/template rows for the context center', () => {
    const detail = {
      entity: {
        entity: {
          source: 'otlp',
          labels: { 'k8s.namespace.name': 'prod' }
        },
        identities: [{ key: 'service.name', value: 'checkout' }],
        monitorBinds: [{ templateName: 'spring-boot', monitorId: 7 }],
        relations: [
          { type: 'calls', targetEntityId: 'mysql-1', targetEntityName: 'mysql-prod' },
          { relationType: 'owned-by', targetEntityName: 'payment-app' }
        ]
      },
      activeAlerts: [
        { id: 1, status: 'firing', content: 'error rate high', labels: { severity: 'critical' } }
      ],
      alertSummary: {
        totalActiveAlerts: 1
      }
    } as any;

    expect(buildCurrentAlertRows(detail)).toEqual([
      { title: 'Current alert #1', copy: 'error rate high', meta: 'firing · severity=critical', tone: 'danger' }
    ]);
    expect(buildRelationshipRows(detail)).toEqual([
      { title: 'calls', copy: 'mysql-prod', meta: 'mysql-1' },
      { title: 'owned-by', copy: 'payment-app', meta: 'Upstream/downstream relationship' }
    ]);
    expect(buildCollectionSourceRows(detail)).toEqual([
      { title: 'Collection source', copy: 'otlp', meta: 'Entity source' },
      { title: 'Identities', copy: '1 identities', meta: 'service.name=checkout' },
      { title: 'Template binding', copy: '1 bindings', meta: 'spring-boot' },
      { title: 'Labels', copy: '1 labels', meta: 'k8s.namespace.name=prod' }
    ]);
  });

  it('builds entity attribution rows across traditional monitoring and OTLP evidence', () => {
    const detail = {
      entity: {
        entity: {
          id: 42,
          name: 'checkout-api',
          displayName: 'Checkout API',
          source: 'otlp'
        },
        identities: [
          { key: 'service.name', value: 'checkout' },
          { key: 'hertzbeat.entity_id', value: '42' }
        ],
        monitorBinds: [{ templateName: 'spring-boot', monitorId: 7 }],
        relations: [{ type: 'calls', targetEntityName: 'mysql-prod' }]
      }
    } as any;

    expect(buildEntityAttributionRows(detail)).toEqual([
      { key: 'traditional-monitor', state: 'ready', title: 'Traditional monitor binding', copy: '1 bindings', meta: 'spring-boot' },
      { key: 'otlp-attribution', state: 'ready', title: 'OTLP attribution', copy: '2 identities', meta: 'service.name=checkout' },
      { key: 'candidate-confirmation', state: 'ready', title: 'Candidate confirmation', copy: 'Merged into entity', meta: 'Checkout API' },
      { key: 'missing-diagnostics', state: 'ready', title: 'Attribution diagnostics', copy: 'Attribution evidence complete', meta: 'Ready for entity detail' }
    ]);
  });

  it('builds missing attribution diagnostics before an entity can become a clean resource catalog entry', () => {
    expect(
      buildEntityAttributionRows({
        entity: {
          entity: {
            id: 99,
            name: 'unknown-service',
            source: 'otlp'
          },
          identities: [],
          monitorBinds: [],
          relations: []
        }
      } as any)
    ).toEqual([
      { key: 'traditional-monitor', state: 'missing', title: 'Traditional monitor binding', copy: '0 bindings', meta: 'Waiting for monitor template' },
      { key: 'otlp-attribution', state: 'missing', title: 'OTLP attribution', copy: 'Missing identity', meta: 'Waiting for hertzbeat.entity_id or service.name' },
      { key: 'candidate-confirmation', state: 'review', title: 'Candidate confirmation', copy: 'Pending confirmation', meta: 'Open telemetry discovery to confirm candidate' },
      { key: 'missing-diagnostics', state: 'missing', title: 'Attribution diagnostics', copy: 'Attribution evidence needed', meta: 'Missing identity、monitor binding' }
    ]);
  });
});
