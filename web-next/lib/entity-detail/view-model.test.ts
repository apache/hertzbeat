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
  formatEntityDetailTimestamp,
  buildUnifiedEvidenceRows,
  buildNextActionRows,
  buildOverviewRows,
  buildRelationshipRows,
  buildSummaryRows
} from './view-model';

describe('entity detail view model', () => {
  it('formats numeric evidence timestamps for novice-readable detail rows', () => {
    const localTimestamp = new Date(2026, 6, 3, 18, 56, 24).getTime();

    expect(formatEntityDetailTimestamp(localTimestamp)).toBe('2026/07/03 18:56:24');
    expect(formatEntityDetailTimestamp(String(localTimestamp))).toBe('2026/07/03 18:56:24');
    expect(formatEntityDetailTimestamp('2026-07-03 18:56:24')).toBe('2026-07-03 18:56:24');
    expect(formatEntityDetailTimestamp(null)).toBeNull();
  });

  it('builds detail facts from entity', () => {
    expect(
      buildDetailFacts({ id: 123, name: 'checkout-api', displayName: 'Checkout Service', type: 'service', subtype: 'http', status: 'unknown', owner: 'ops' } as any)
    ).toEqual([
      { label: 'Entity ID', value: '123' },
      { label: 'Unique name', value: 'checkout-api' },
      { label: 'Type', value: 'service' },
      { label: 'Subtype', value: 'http' },
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

  it('keeps unavailable entity detail separate from empty or healthy signal states', () => {
    const detail = {
      detailState: {
        state: 'unavailable',
        message: 'Detail unavailable',
        reason: 'recoverable-detail-load-failed'
      },
      entity: {
        entity: {
          id: 123,
          status: 'unavailable'
        }
      },
      evidenceSummary: {
        activeAlertCount: 0,
        downMonitorCount: 0,
        healthyMonitorCount: 0,
        identityCount: 0,
        logHintCount: 0
      },
      alertSummary: {
        totalActiveAlerts: 0
      },
      monitorSummary: {
        totalBoundMonitors: 0
      },
      traceSummary: {
        recentTraceCount: 0,
        recentErrorTraceCount: 0
      }
    } as any;

    expect(buildDetailFacts({ id: 123, type: 'service', status: 'unavailable', owner: 'platform' } as any)).toEqual([
      { label: 'Entity ID', value: '123' },
      { label: 'Unique name', value: '-' },
      { label: 'Type', value: 'service' },
      { label: 'Subtype', value: '-' },
      { label: 'Status', value: 'Unavailable' },
      { label: 'Owner', value: 'platform' }
    ]);
    expect(buildSummaryRows(detail)).toEqual([
      {
        title: 'Related metrics',
        copy: 'Detail unavailable',
        meta: 'Monitor and metric state unavailable.',
        tone: 'warning'
      },
      {
        title: 'Related logs',
        copy: 'Detail unavailable',
        meta: 'Log evidence unavailable.',
        tone: 'warning'
      },
      {
        title: 'Related traces',
        copy: 'Detail unavailable',
        meta: 'Trace evidence unavailable.',
        tone: 'warning'
      }
    ]);
    expect(buildUnifiedEvidenceRows(detail)).toEqual([
      {
        title: 'Evidence coverage',
        copy: 'Detail unavailable',
        meta: 'Backend evidence unavailable; not an empty read model.',
        tone: 'warning'
      }
    ]);
    expect(buildEntityHealthModel(detail).map(row => ({ title: row.title, copy: row.copy, tone: row.tone }))).toEqual([
      { title: 'Health score', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Availability', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Error rate', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Latency', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Current alerts', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Recent anomalies', copy: 'Detail unavailable', tone: 'warning' },
      { title: 'Collection health', copy: 'Detail unavailable', tone: 'warning' }
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
        signalEvidence: {
          logEvidence: [{}, {}, {}]
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

  it('keeps log query hints out of recent anomaly and health evidence counts', () => {
    expect(
      buildEntityHealthModel({
        entity: {
          entity: {
            id: 42,
            name: 'manual-service',
            environment: 'prod'
          }
        },
        evidenceSummary: {
          downMonitorCount: 0,
          healthyMonitorCount: 0,
          logHintCount: 1
        },
        monitorSummary: {
          totalBoundMonitors: 0
        },
        logSummary: {
          hintCount: 1,
          preferredQueryTitle: 'otel-resource'
        },
        signalEvidence: {
          logEvidence: [],
          unifiedEvidenceSummary: {
            activeSignalCount: 0,
            logsActive: false,
            logEvidenceCount: 0
          }
        },
        traceSummary: {
          recentTraceCount: 0,
          recentErrorTraceCount: 0
        }
      } as any)
    ).toEqual([
      { title: 'Health score', copy: 'Waiting for live evidence', meta: 'Bind a monitor or ingest OTLP data before scoring health.', tone: 'neutral' },
      { title: 'Availability', copy: 'Waiting for monitor template', meta: 'No bound monitors', tone: 'neutral' },
      { title: 'Error rate', copy: 'No trace samples', meta: 'Waiting for trace reports', tone: 'neutral' },
      { title: 'Latency', copy: 'No trace latency', meta: 'Waiting for OTLP span', tone: 'neutral' },
      { title: 'Current alerts', copy: '0 active alerts', meta: 'Alert closure', tone: 'success' },
      { title: 'Recent anomalies', copy: '0 anomaly signals', meta: 'Monitors 0 · Traces 0 · Logs 0', tone: 'neutral' },
      {
        title: 'Collection health',
        copy: 'No bound monitors',
        meta: 'Waiting for template binding',
        freshness: 'Latest evidence -',
        href: '/setting/collector?entityId=42&serviceName=manual-service&environment=prod&timeRange=last-1h',
        tone: 'neutral'
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
      { title: 'Evidence coverage', copy: '3 active signals', meta: 'metrics · logs · traces', tone: 'neutral' },
      { title: 'Metrics / USE', copy: '5 metric evidence', meta: 'Monitor and metric read model', tone: 'neutral' },
      { title: 'Logs / RED', copy: '7 log hints', meta: 'Log read model', tone: 'neutral' },
      { title: 'Traces / RED', copy: '11 recent traces', meta: '2 error traces', tone: 'danger' },
      { title: 'Latest observation', copy: '2026-05-13 14:55:00', meta: 'Backend read model', tone: 'neutral' }
    ]);
  });

  it('keeps active unified evidence neutral so data arrival is not mistaken for healthy status', () => {
    expect(
      buildUnifiedEvidenceRows({
        unifiedEvidenceSummary: {
          activeSignalCount: 2,
          metricsActive: true,
          logsActive: false,
          tracesActive: true,
          metricEvidenceCount: 10000,
          logEvidenceCount: 0,
          traceEvidenceCount: 9000,
          activeSignals: ['metrics', 'traces']
        },
        traceSummary: {
          recentErrorTraceCount: 0
        }
      } as any).map(row => ({ title: row.title, tone: row.tone }))
    ).toEqual([
      { title: 'Evidence coverage', tone: 'neutral' },
      { title: 'Metrics / USE', tone: 'neutral' },
      { title: 'Logs / RED', tone: 'neutral' },
      { title: 'Traces / RED', tone: 'neutral' },
      { title: 'Latest observation', tone: 'neutral' }
    ]);
  });

  it('summarizes high-alert and high-relation detail rows so dense entity pages stay scannable', () => {
    const alerts = Array.from({ length: 24 }, (_, index) => ({
      id: `alert-${index + 1}`,
      status: 'firing',
      labels: {
        service: 'checkout',
        severity: index % 2 === 0 ? 'critical' : 'warning'
      },
      summary: `Checkout alert ${index + 1}`
    }));
    const topologyNeighbors = Array.from({ length: 31 }, (_, index) => ({
      entityId: `neighbor-${index + 1}`,
      entityName: `Neighbor ${index + 1}`,
      relationType: index % 2 === 0 ? 'calls' : 'depends_on'
    }));

    const alertRows = buildCurrentAlertRows({
      activeAlerts: alerts,
      alertSummary: {
        totalActiveAlerts: 24
      }
    } as any);
    const relationshipRows = buildRelationshipRows({
      entity: {
        entity: {
          id: 42,
          name: 'checkout-api',
          environment: 'prod'
        }
      },
      topologyNeighbors,
      opsSummary: {
        relationCount: 120
      }
    } as any);

    expect(alertRows).toHaveLength(9);
    expect(alertRows[0]).toMatchObject({
      title: 'Current alert #alert-1',
      copy: 'Checkout alert 1',
      meta: 'firing · service=checkout, severity=critical',
      tone: 'danger'
    });
    expect(alertRows.at(-1)).toEqual({
      title: 'More active alerts',
      copy: '16 more alerts are summarized to keep detail scanning fast.',
      meta: '24 total',
      tone: 'warning'
    });
    expect(alertRows.map(row => row.title)).not.toContain('Current alert #alert-24');

    expect(relationshipRows).toHaveLength(9);
    expect(relationshipRows[0]).toMatchObject({
      title: 'calls',
      copy: 'Neighbor 1',
      meta: 'neighbor-1',
      href: '/entities/neighbor-1?entityId=neighbor-1&entityName=Neighbor+1&timeRange=last-1h&returnTo=%2Fentities%2F42'
    });
    expect(relationshipRows.at(-1)).toEqual({
      title: 'More relationships',
      copy: '112 more relationships are summarized to avoid a long detail page.',
      meta: '120 total',
      tone: 'warning'
    });
    expect(relationshipRows.map(row => row.copy)).not.toContain('Neighbor 31');
  });

  it('formats numeric collector and unified evidence timestamps in rendered row copy', () => {
    const lastEvidenceAt = new Date(2026, 6, 3, 18, 56, 24).getTime();
    const latestObservedAt = new Date(2026, 6, 4, 1, 29, 33).getTime();

    expect(
      buildEntityHealthModel({
        entity: { entity: { id: 42, name: 'checkout-api', environment: 'prod' } },
        evidenceSummary: {
          healthyMonitorCount: 1,
          lastEvidenceAt,
          totalBoundMonitors: 1
        },
        monitorSummary: { totalBoundMonitors: 1 },
        traceSummary: { recentTraceCount: 0, recentErrorTraceCount: 0 },
        logSummary: { hintCount: 0 }
      } as any).find(row => row.title === 'Collection health')?.freshness
    ).toBe('Latest evidence 2026/07/03 18:56:24');

    expect(
      buildUnifiedEvidenceRows({
        unifiedEvidenceSummary: {
          activeSignalCount: 1,
          logsActive: true,
          logEvidenceCount: 1,
          latestObservedAt,
          activeSignals: ['logs']
        }
      } as any).find(row => row.title === 'Latest observation')?.copy
    ).toBe('2026/07/04 01:29:33');
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
              actionLabel: 'Open monitors',
              actionType: 'bind_monitor'
            },
            {
              title: 'Open discovery',
              summary: 'Add more evidence before triage.',
              actionLabel: 'Open discovery',
              actionType: 'open_discovery'
            }
          ]
        } as any,
        '123',
        undefined,
        { source: 'entity-detail-next-action', timeRange: 'last-30m' }
      )
    ).toEqual([
      {
        title: 'Open monitors',
        copy: 'Inspect abnormal monitors first.',
        meta: 'Open monitors',
        href: '/entities/123/edit?stage=signals&entityId=123&timeRange=last-30m&source=entity-detail-next-action'
      },
      {
        title: 'Open discovery',
        copy: 'Add more evidence before triage.',
        meta: 'Open discovery',
        href: '/entities/discovery?entityId=123&timeRange=last-30m&source=entity-detail-next-action'
      }
    ]);
  });

  it('keeps unsafe next action urls inert instead of sending operators out of HertzBeat', () => {
    expect(
      buildNextActionRows(
        {
          nextActions: [
            {
              title: 'Open unsafe',
              summary: 'Should remain text only.',
              actionLabel: 'Open',
              actionType: 'external',
              url: 'https://example.invalid/phish'
            },
            {
              title: 'Open script',
              summary: 'Should remain text only.',
              actionLabel: 'Open',
              actionType: 'external',
              href: 'javascript:alert(1)'
            }
          ]
        } as any,
        '123'
      )
    ).toEqual([
      { title: 'Open unsafe', copy: 'Should remain text only.', meta: 'Open', href: undefined },
      { title: 'Open script', copy: 'Should remain text only.', meta: 'Open', href: undefined }
    ]);
  });

  it('builds drilldown rows', () => {
    expect(buildDrilldownRows('123')).toEqual([
      { title: 'Definition workspace', copy: '/entities/123/definition', meta: 'Next route' },
      { title: 'Edit entity', copy: '/entities/123/edit', meta: 'Next route' },
      { title: 'Telemetry discovery', copy: '/entities/discovery', meta: 'Shared route' }
    ]);
  });

  it('keeps advanced drilldown routes connected to the originating entity list context', () => {
    expect(
      buildDrilldownRows('123', undefined, {
        returnTo: '/entities?search=codex-pd-1506&source=product-design-1506&pageSize=50',
        source: 'product-design-1506',
        timeRange: 'last-1h'
      })
    ).toEqual([
      {
        title: 'Definition workspace',
        copy: '/entities/123/definition?timeRange=last-1h&returnTo=%2Fentities%3Fsearch%3Dcodex-pd-1506%26source%3Dproduct-design-1506%26pageSize%3D50&source=product-design-1506',
        meta: 'Next route'
      },
      {
        title: 'Edit entity',
        copy: '/entities/123/edit?timeRange=last-1h&returnTo=%2Fentities%3Fsearch%3Dcodex-pd-1506%26source%3Dproduct-design-1506%26pageSize%3D50&source=product-design-1506',
        meta: 'Next route'
      },
      {
        title: 'Telemetry discovery',
        copy: '/entities/discovery?timeRange=last-1h&returnTo=%2Fentities%3Fsearch%3Dcodex-pd-1506%26source%3Dproduct-design-1506%26pageSize%3D50&source=product-design-1506',
        meta: 'Shared route'
      }
    ]);
  });

  it('builds entity context handoff links with unified entity, service, environment, time, trace, and span context', () => {
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
          latestTraceId: 'trace-123',
          latestSpanId: 'span-456'
        }
      } as any,
      'last-30m'
    );

    expect(links.map(({ key, title, freshness, meta }) => ({ key, title, freshness, meta }))).toEqual([
      { key: 'metrics', title: 'Related metrics', freshness: 'Service checkout', meta: 'Metrics workbench' },
      { key: 'logs', title: 'Related logs', freshness: 'Service checkout', meta: 'Logs workbench' },
      { key: 'traces', title: 'Related traces', freshness: 'Service checkout', meta: 'Traces workbench' },
      { key: 'alerts', title: 'Alert rules', freshness: 'Service checkout', meta: 'Threshold rules' },
      { key: 'monitors', title: 'Monitor coverage', freshness: 'Entity Checkout · Service checkout', meta: 'Monitor center review' },
      { key: 'topology', title: 'Upstream topology', freshness: 'Service checkout', meta: 'Topology graph' },
      { key: 'template', title: 'Template binding', freshness: 'Service checkout', meta: 'Monitoring template' }
    ]);

    const logs = new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost');
    expect(logs.pathname).toBe('/log/manage');
    expect(logs.searchParams.get('entityId')).toBe('42');
    expect(logs.searchParams.get('serviceName')).toBe('checkout');
    expect(logs.searchParams.get('environment')).toBe('prod');
    expect(logs.searchParams.get('timeRange')).toBe('last-30m');
    expect(logs.searchParams.get('traceId')).toBe('trace-123');
    expect(logs.searchParams.get('spanId')).toBe('span-456');

    const logsReturn = new URL(logs.searchParams.get('returnTo') || '/', 'http://localhost');
    expect(logsReturn.pathname).toBe('/entities/42');
    expect(logsReturn.searchParams.get('entityId')).toBe('42');
    expect(logsReturn.searchParams.get('serviceName')).toBe('checkout');
    expect(logsReturn.searchParams.get('environment')).toBe('prod');
    expect(logsReturn.searchParams.get('timeRange')).toBe('last-30m');
    expect(logsReturn.searchParams.get('traceId')).toBe('trace-123');
    expect(logsReturn.searchParams.get('spanId')).toBe('span-456');

    const metricsReturn = new URL(
      new URL(links.find(link => link.key === 'metrics')?.copy || '/', 'http://localhost').searchParams.get('returnTo') || '/',
      'http://localhost'
    );
    expect(metricsReturn.searchParams.get('entityId')).toBe('42');
    expect(metricsReturn.searchParams.get('timeRange')).toBe('last-30m');

    const monitorsReturn = new URL(
      new URL(links.find(link => link.key === 'monitors')?.copy || '/', 'http://localhost').searchParams.get('returnTo') || '/',
      'http://localhost'
    );
    expect(monitorsReturn.searchParams.get('entityName')).toBe('Checkout');

    const template = new URL(links.find(link => link.key === 'template')?.copy || '/', 'http://localhost');
    expect(template.pathname).toBe('/entities/42/definition');
    const templateReturn = new URL(template.searchParams.get('returnTo') || '/', 'http://localhost');
    expect(templateReturn.pathname).toBe('/entities/42');
    expect(templateReturn.searchParams.get('serviceName')).toBe('checkout');
    expect(templateReturn.searchParams.get('environment')).toBe('prod');
    expect(templateReturn.searchParams.get('timeRange')).toBe('last-30m');
  });

  it('lets backend response handoffs seed signal routes without overriding inherited route context', () => {
    const detail = {
      entity: {
        entity: {
          id: 42,
          type: 'service',
          name: 'checkout',
          displayName: 'Checkout',
          environment: 'prod'
        }
      },
      responseHandoffs: {
        monitors: {
          entityId: 42,
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout-metric',
          serviceNamespace: 'commerce',
          environment: 'prod',
          start: 1713200000000,
          end: 1713202700000,
          source: 'monitor'
        },
        logs: {
          entityId: 42,
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout-log',
          serviceNamespace: 'commerce',
          environment: 'prod',
          traceId: 'trace-log',
          spanId: 'span-log',
          start: 1713200000000,
          end: 1713202700000,
          source: 'otlp'
        },
        traces: {
          entityId: 42,
          entityType: 'service',
          entityName: 'Checkout API',
          serviceName: 'checkout-trace',
          serviceNamespace: 'commerce',
          environment: 'prod',
          traceId: 'trace-trace',
          spanId: 'span-trace',
          start: 1713200000000,
          end: 1713202700000,
          source: 'otlp'
        }
      }
    } as any;

    const links = buildEntityContextHandoffLinks(detail, 'last-1h');
    const metrics = new URL(links.find(link => link.key === 'metrics')?.copy || '/', 'http://localhost').searchParams;
    expect(metrics.get('entityType')).toBe('service');
    expect(metrics.get('entityName')).toBe('Checkout API');
    expect(metrics.get('serviceName')).toBe('checkout-metric');
    expect(metrics.get('serviceNamespace')).toBe('commerce');
    expect(metrics.get('start')).toBe('1713200000000');
    expect(metrics.get('end')).toBe('1713202700000');
    expect(metrics.get('source')).toBe('monitor');

    const logs = new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost').searchParams;
    expect(logs.get('serviceName')).toBe('checkout-log');
    expect(logs.get('traceId')).toBe('trace-log');
    expect(logs.get('spanId')).toBe('span-log');
    expect(logs.get('source')).toBe('otlp');

    const traces = new URL(links.find(link => link.key === 'traces')?.copy || '/', 'http://localhost').searchParams;
    expect(traces.get('serviceName')).toBe('checkout-trace');
    expect(traces.get('traceId')).toBe('trace-trace');
    expect(traces.get('spanId')).toBe('span-trace');

    const inheritedLinks = buildEntityContextHandoffLinks(detail, {
      entityName: 'Route Checkout',
      serviceName: 'route-service',
      serviceNamespace: 'route-namespace',
      environment: 'route-env',
      traceId: 'route-trace',
      spanId: 'route-span',
      start: '10',
      end: '20',
      source: 'route-source'
    });
    const inheritedLogs = new URL(inheritedLinks.find(link => link.key === 'logs')?.copy || '/', 'http://localhost').searchParams;
    expect(inheritedLogs.get('entityName')).toBe('Route Checkout');
    expect(inheritedLogs.get('serviceName')).toBe('route-service');
    expect(inheritedLogs.get('serviceNamespace')).toBe('route-namespace');
    expect(inheritedLogs.get('environment')).toBe('route-env');
    expect(inheritedLogs.get('traceId')).toBe('route-trace');
    expect(inheritedLogs.get('spanId')).toBe('route-span');
    expect(inheritedLogs.get('start')).toBe('10');
    expect(inheritedLogs.get('end')).toBe('20');
    expect(inheritedLogs.get('source')).toBe('route-source');
  });

  it('builds host entity handoff links with resource filters instead of inventing a service name', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 4201,
            name: 'checkout-node-a',
            displayName: 'Checkout Node A',
            type: 'host'
          },
          identities: [{ key: 'host.name', value: 'checkout-node-a' }]
        }
      } as any,
      'last-30m'
    );

    const metrics = new URL(links[0]?.copy || '/', 'http://localhost');
    expect(metrics.pathname).toBe('/ingestion/otlp/metrics');
    expect(metrics.searchParams.get('entityId')).toBe('4201');
    expect(metrics.searchParams.get('serviceName')).toBeNull();
    expect(metrics.searchParams.get('filter')).toBe('host.name="checkout-node-a"');

    const logs = new URL(links[1]?.copy || '/', 'http://localhost');
    expect(logs.pathname).toBe('/log/manage');
    expect(logs.searchParams.get('serviceName')).toBeNull();
    expect(logs.searchParams.get('resourceFilter')).toBe('host.name="checkout-node-a"');

    const traces = new URL(links[2]?.copy || '/', 'http://localhost');
    expect(traces.pathname).toBe('/trace/manage');
    expect(traces.searchParams.get('serviceName')).toBeNull();
    expect(traces.searchParams.get('resourceFilter')).toBe('host.name="checkout-node-a"');
  });

  it('builds k8s workload handoff links with inherited service context and pod resource filters', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 4202,
            name: 'checkout-v1-78dfd',
            displayName: 'Checkout Pod',
            type: 'k8s_workload',
            namespace: 'payments'
          },
          identities: [
            { key: 'k8s.namespace.name', value: 'payments' },
            { key: 'k8s.pod.name', value: 'checkout-v1-78dfd' },
            { key: 'container.name', value: 'checkout' }
          ]
        }
      } as any,
      {
        timeRange: 'last-45m',
        source: 'otlp',
        collector: 'collector-demo-a',
        template: 'spring-boot',
        serviceName: 'checkout',
        serviceNamespace: 'hertzbeat-demo',
        environment: 'demo',
        returnTo: '/entities/4200'
      }
    );
    const expectedFilter = 'k8s.namespace.name="payments" and k8s.pod.name="checkout-v1-78dfd" and container.name="checkout"';

    const metrics = new URL(links[0]?.copy || '/', 'http://localhost');
    expect(metrics.searchParams.get('entityId')).toBe('4202');
    expect(metrics.searchParams.get('serviceName')).toBe('checkout');
    expect(metrics.searchParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(metrics.searchParams.get('source')).toBe('otlp');
    expect(metrics.searchParams.get('filter')).toBe(expectedFilter);

    const logs = new URL(links[1]?.copy || '/', 'http://localhost');
    expect(logs.searchParams.get('resourceFilter')).toBe(expectedFilter);
    expect(logs.searchParams.get('collector')).toBe('collector-demo-a');

    const traces = new URL(links[2]?.copy || '/', 'http://localhost');
    expect(traces.searchParams.get('resourceFilter')).toBe(expectedFilter);
    expect(traces.searchParams.get('template')).toBe('spring-boot');
  });

  it('builds k8s workload handoff links from workload identities instead of inventing pod filters', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 4203,
            name: 'checkout-v1',
            displayName: 'Checkout Deployment',
            type: 'k8s_workload',
            namespace: 'payments'
          },
          identities: [
            { key: 'k8s.namespace.name', value: 'payments' },
            { key: 'k8s.workload.name', value: 'checkout-v1' }
          ]
        }
      } as any,
      {
        timeRange: 'last-45m',
        source: 'otlp',
        serviceName: 'checkout',
        environment: 'demo'
      }
    );
    const expectedFilter = 'k8s.namespace.name="payments" and k8s.workload.name="checkout-v1"';

    const metrics = new URL(links[0]?.copy || '/', 'http://localhost');
    expect(metrics.searchParams.get('filter')).toBe(expectedFilter);
    expect(metrics.searchParams.get('filter')).not.toContain('k8s.pod.name');

    const logs = new URL(links[1]?.copy || '/', 'http://localhost');
    expect(logs.searchParams.get('resourceFilter')).toBe(expectedFilter);
    expect(logs.searchParams.get('resourceFilter')).not.toContain('k8s.pod.name');
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
      href: 'https://runbooks.local/checkout',
      tone: 'neutral'
    });

    const alertHref = new URL(rows[0]?.href || '/', 'http://localhost');
    expect(alertHref.searchParams.get('entityId')).toBe('42');
    expect(alertHref.searchParams.get('entityName')).toBe('Checkout');
    expect(alertHref.searchParams.get('serviceName')).toBe('checkout-route');
    expect(alertHref.searchParams.get('environment')).toBe('staging');
    expect(alertHref.searchParams.get('timeRange')).toBe('last-45m');
    expect(alertHref.searchParams.get('start')).toBe('1713200000000');
    const alertReturn = new URL(alertHref.searchParams.get('returnTo') || '/', 'http://localhost');
    expect(alertReturn.pathname).toBe('/entities/42');
    expect(alertReturn.searchParams.get('entityId')).toBe('42');
    expect(alertReturn.searchParams.get('serviceName')).toBe('checkout-route');
    expect(alertReturn.searchParams.get('environment')).toBe('staging');
    expect(alertReturn.searchParams.get('timeRange')).toBe('last-45m');
    expect(alertReturn.searchParams.get('source')).toBe('monitor');
    expect(alertReturn.searchParams.get('monitorId')).toBe('632051474676992');

    const topologyHref = new URL(rows[1]?.href || '/', 'http://localhost');
    expect(topologyHref.searchParams.get('topologyTargetId')).toBe('mysql-1');
    expect(topologyHref.searchParams.get('topologyTargetName')).toBe('mysql-prod');

    expect(buildEntityEvidenceHandoffRows({ entity: { entity: { id: 99, name: 'empty' }, relations: [] }, activeAlerts: [] } as any)).toEqual([]);
  });

  it('uses backend resolved topology neighbors for topology evidence handoffs', () => {
    const rows = buildEntityEvidenceHandoffRows(
      {
        entity: {
          entity: {
            id: 4200,
            name: 'checkout',
            displayName: 'Checkout API'
          },
          relations: [{ relationType: 'runs_on', targetEntityId: 4201, targetRef: 'host:checkout-node-a' }]
        },
        topologyNeighbors: [
          {
            relationId: 1,
            entityId: 4201,
            entityName: 'Checkout Node A',
            entityType: 'host',
            direction: 'outgoing',
            relationType: 'runs_on',
            relationSource: 'otel_resource',
            status: 'confirmed',
            score: 95,
            targetRef: 'host:checkout-node-a'
          }
        ]
      } as any,
      { timeRange: 'last-1h', serviceName: 'checkout', environment: 'demo' }
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: 'topology',
      copy: 'Checkout Node A',
      meta: 'runs_on · 4201'
    });
    const topologyHref = new URL(rows[0]?.href || '/', 'http://localhost');
    expect(topologyHref.searchParams.get('topologyTargetId')).toBe('4201');
    expect(topologyHref.searchParams.get('topologyTargetName')).toBe('Checkout Node A');
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

  it('marks inherited absolute entity handoffs as custom and keeps return navigation for signal workbenches', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 42,
            name: 'checkout',
            displayName: 'Checkout API',
            environment: 'prod'
          }
        },
        traceSummary: {
          latestTraceId: 'trace-123',
          latestSpanId: 'span-456'
        }
      } as any,
      {
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        environment: 'prod',
        start: '1713200000000',
        end: '1713203600000'
      }
    );

    for (const key of ['metrics', 'logs', 'traces', 'template']) {
      const params = new URL(links.find(link => link.key === key)?.copy || '/', 'http://localhost').searchParams;
      expect(params.get('timeRange')).toBe('custom');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713203600000');
      const returnTo = new URL(params.get('returnTo') || '/', 'http://localhost');
      expect(returnTo.pathname).toBe('/entities/42');
      expect(returnTo.searchParams.get('entityId')).toBe('42');
      expect(returnTo.searchParams.get('entityName')).toBe('Checkout API');
      expect(returnTo.searchParams.get('serviceName')).toBe('checkout');
      expect(returnTo.searchParams.get('environment')).toBe('prod');
      expect(returnTo.searchParams.get('timeRange')).toBe('custom');
      expect(returnTo.searchParams.get('start')).toBe('1713200000000');
      expect(returnTo.searchParams.get('end')).toBe('1713203600000');
    }
  });

  it('anchors trace handoff links around stale evidence when no absolute route time is inherited', () => {
    const latestObservedAt = 1_783_187_845_636;
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
          recentTraceCount: 1,
          recentErrorTraceCount: 0,
          latestObservedAt,
          latestTraceId: 'trace-123'
        }
      } as any,
      'last-30m'
    );

    const traces = new URL(links.find(link => link.key === 'traces')?.copy || '/', 'http://localhost').searchParams;
    expect(traces.get('traceId')).toBe('trace-123');
    expect(traces.get('start')).toBe(String(latestObservedAt - 15 * 60 * 1000));
    expect(traces.get('end')).toBe(String(latestObservedAt + 15 * 60 * 1000));
    expect(new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost').searchParams.get('start')).toBeNull();

    const inherited = buildEntityContextHandoffLinks(
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
          latestObservedAt,
          latestTraceId: 'trace-123'
        }
      } as any,
      {
        timeRange: 'last-1h',
        start: '1713200000000',
        end: '1713203600000'
      }
    );
    const inheritedTraces = new URL(inherited.find(link => link.key === 'traces')?.copy || '/', 'http://localhost').searchParams;
    expect(inheritedTraces.get('start')).toBe('1713200000000');
    expect(inheritedTraces.get('end')).toBe('1713203600000');
  });

  it('keeps signal and template handoffs pointed back to the originating entity list when detail was opened from a filtered list', () => {
    const links = buildEntityContextHandoffLinks(
      {
        entity: {
          entity: {
            id: 42,
            name: 'checkout',
            displayName: 'Checkout API',
            environment: 'prod'
          }
        }
      } as any,
      {
        entityId: '42',
        serviceName: 'checkout',
        environment: 'prod',
        source: 'product-design-1505',
        returnTo: '/entities?search=checkout&pageIndex=1&pageSize=50&source=product-design-1505'
      }
    );

    const template = new URL(links.find(link => link.key === 'template')?.copy || '/', 'http://localhost');
    expect(template.pathname).toBe('/entities/42/definition');
    expect(template.searchParams.get('returnTo')).toBe(
      '/entities?search=checkout&pageIndex=1&pageSize=50&source=product-design-1505'
    );

    const logs = new URL(links.find(link => link.key === 'logs')?.copy || '/', 'http://localhost');
    const logsReturn = new URL(logs.searchParams.get('returnTo') || '/', 'http://localhost');
    expect(logsReturn.pathname).toBe('/entities/42');
    expect(logsReturn.searchParams.get('source')).toBe('product-design-1505');
    expect(logsReturn.searchParams.get('returnTo')).toBe(
      '/entities?search=checkout&pageIndex=1&pageSize=50&source=product-design-1505'
    );
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
      {
        title: 'calls',
        copy: 'mysql-prod',
        meta: 'mysql-1',
        href: '/entities/mysql-1?entityId=mysql-1&entityName=mysql-prod&timeRange=last-1h'
      },
      { title: 'owned-by', copy: 'payment-app', meta: 'Upstream/downstream relationship' }
    ]);
    expect(buildCollectionSourceRows(detail)).toEqual([
      { title: 'Collection source', copy: 'otlp', meta: 'Entity source' },
      { title: 'Identities', copy: '1 identities', meta: 'service.name=checkout' },
      { title: 'Template binding', copy: '1 bindings', meta: 'spring-boot' },
      { title: 'Labels', copy: '1 labels', meta: 'k8s.namespace.name=prod' }
    ]);
  });

  it('summarizes backend identityKey and identityValue fields instead of exposing the identity row id', () => {
    const detail = {
      entity: {
        entity: {
          source: 'otel_resource'
        },
        identities: [
          {
            id: 6633,
            identityKey: 'service.name',
            identityValue: 'Codex PD 1370 Import Export Source'
          }
        ],
        monitorBinds: [{ monitorId: 658280683773184 }]
      }
    } as any;

    expect(buildEntityAttributionRows(detail)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'otlp-attribution',
          meta: 'service.name=Codex PD 1370 Import Export Source'
        })
      ])
    );
    expect(buildCollectionSourceRows(detail)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Identities',
          meta: 'service.name=Codex PD 1370 Import Export Source'
        })
      ])
    );
  });

  it('keeps OTLP entity relation drilldowns linked to target entities with signal context', () => {
    const detail = {
      entity: {
        entity: {
          id: 4200,
          name: 'checkout',
          displayName: 'Checkout API',
          source: 'otlp'
        },
        relations: [
          {
            relationType: 'runs_on',
            targetEntityId: 4201,
            targetRef: 'host:checkout-node-a',
            relationSource: 'otel_resource',
            status: 'confirmed'
          },
          {
            relationType: 'deployed_on',
            targetEntityId: 4202,
            targetRef: 'k8s_workload:payments/checkout-v1-78dfd',
            relationSource: 'otel_resource',
            status: 'confirmed'
          }
        ]
      }
    } as any;

    expect(
      buildRelationshipRows(detail, {
        timeRange: 'last-45m',
        source: 'otlp',
        collector: 'collector-demo-a',
        template: 'spring-boot',
        serviceName: 'checkout',
        serviceNamespace: 'hertzbeat-demo',
        environment: 'demo'
      })
    ).toEqual([
      {
        title: 'runs_on',
        copy: 'host:checkout-node-a',
        meta: '4201',
        href: '/entities/4201?entityId=4201&entityName=host%3Acheckout-node-a&serviceName=checkout&environment=demo&timeRange=last-45m&source=otlp&collector=collector-demo-a&template=spring-boot&serviceNamespace=hertzbeat-demo&returnTo=%2Fentities%2F4200'
      },
      {
        title: 'deployed_on',
        copy: 'k8s_workload:payments/checkout-v1-78dfd',
        meta: '4202',
        href: '/entities/4202?entityId=4202&entityName=k8s_workload%3Apayments%2Fcheckout-v1-78dfd&serviceName=checkout&environment=demo&timeRange=last-45m&source=otlp&collector=collector-demo-a&template=spring-boot&serviceNamespace=hertzbeat-demo&returnTo=%2Fentities%2F4200'
      }
    ]);
  });

  it('prefers backend resolved topology neighbors over raw relation references', () => {
    const detail = {
      entity: {
        entity: {
          id: 4200,
          name: 'checkout',
          displayName: 'Checkout API'
        },
        relations: [
          {
            relationType: 'depends_on',
            targetEntityId: 4201,
            targetRef: 'database:orders/mysql'
          }
        ]
      },
      topologyNeighbors: [
        {
          relationId: 301,
          entityId: 4201,
          entityName: 'Orders MySQL',
          entityType: 'database',
          direction: 'outgoing',
          relationType: 'depends_on',
          relationSource: 'otel_resource',
          status: 'confirmed',
          score: 95,
          targetRef: 'database:orders/mysql'
        }
      ]
    } as any;

    expect(buildRelationshipRows(detail, { timeRange: 'last-30m', serviceName: 'checkout', environment: 'prod' })).toEqual([
      {
        title: 'depends_on',
        copy: 'Orders MySQL',
        meta: '4201',
        href: '/entities/4201?entityId=4201&entityName=Orders+MySQL&serviceName=checkout&environment=prod&timeRange=last-30m&returnTo=%2Fentities%2F4200'
      }
    ]);
  });

  it('summarizes monitor ownership as topology evidence when relation rows are not returned yet', () => {
    const detail = {
      entity: {
        entity: {
          id: 4200,
          name: 'checkout-api',
          displayName: 'Checkout API',
          environment: 'prod'
        },
        monitorBinds: [{ monitorId: 7001, templateName: 'spring-boot' }],
        relations: []
      },
      monitorSummary: {
        totalBoundMonitors: 12
      }
    } as any;

    const rows = buildRelationshipRows(detail, {
      timeRange: 'last-30m',
      source: 'entity-detail',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: '127.0.0.1:8080'
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: 'Monitor ownership',
      copy: 'spring-boot',
      meta: 'Monitor ownership · monitorId 7001',
      tone: 'warning'
    });
    expect(rows[1]).toEqual({
      title: 'More bound monitors',
      copy: '11 more bound monitors are available from Monitor coverage.',
      meta: '12 total',
      tone: 'warning'
    });

    const topologyHref = new URL(rows[0]?.href || '/', 'http://localhost');
    expect(topologyHref.pathname).toBe('/topology');
    expect(topologyHref.searchParams.get('entityId')).toBe('4200');
    expect(topologyHref.searchParams.get('entityName')).toBe('Checkout API');
    expect(topologyHref.searchParams.get('serviceName')).toBe('checkout-api');
    expect(topologyHref.searchParams.get('timeRange')).toBe('last-30m');
    expect(topologyHref.searchParams.get('sourceKind')).toBe('monitor-ownership');
    expect(topologyHref.searchParams.get('monitorId')).toBe('7001');
    expect(topologyHref.searchParams.get('topologyTargetId')).toBe('7001');
    expect(topologyHref.searchParams.get('topologyTargetName')).toBe('spring-boot');
    expect(topologyHref.searchParams.get('monitorApp')).toBe('website');
    expect(topologyHref.searchParams.get('monitorInstance')).toBe('127.0.0.1:8080');
  });

  it('uses incoming monitor context as the relationship summary when only the handoff knows the monitor name', () => {
    const rows = buildRelationshipRows(
      {
        entity: {
          entity: {
            id: 658094605438208,
            name: 'codex-pd-1315-existing-website',
            displayName: 'Codex PD 1315 Existing Website'
          },
          relations: []
        }
      } as any,
      {
        timeRange: 'last-1h',
        monitorId: '658094606003456',
        monitorName: 'Codex PD 1315 Website Clue',
        monitorApp: 'website',
        monitorInstance: '127.0.0.1:4223'
      }
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Monitor ownership',
      copy: 'Codex PD 1315 Website Clue',
      meta: 'Monitor ownership · monitorId 658094606003456'
    });
    expect(rows[0]?.href).toContain('/topology?');
    expect(rows[0]?.href).toContain('sourceKind=monitor-ownership');
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

  it('summarizes large identity, monitor binding, and label collections in entity source rows', () => {
    const detail = {
      entity: {
        entity: {
          id: 42,
          name: 'checkout-api',
          displayName: 'Checkout API',
          source: 'otlp',
          labels: {
            environment: 'prod',
            namespace: 'payments',
            team: 'checkout'
          }
        },
        identities: [
          { identityKey: 'service.name', identityValue: 'checkout-api' },
          { identityKey: 'service.namespace', identityValue: 'payments' },
          { identityKey: 'deployment.environment', identityValue: 'prod' },
          { identityKey: 'k8s.pod.name', identityValue: 'checkout-7d9f' }
        ],
        monitorBinds: [
          { templateName: 'spring-boot', monitorId: 7001 },
          { templateName: 'mysql', monitorId: 7002 },
          { templateName: 'redis', monitorId: 7003 }
        ]
      }
    } as any;

    expect(buildCollectionSourceRows(detail)).toEqual([
      { title: 'Collection source', copy: 'otlp', meta: 'Entity source' },
      {
        title: 'Identities',
        copy: '4 identities',
        meta: 'service.name=checkout-api, service.namespace=payments · 2 more identities summarized'
      },
      {
        title: 'Template binding',
        copy: '3 bindings',
        meta: 'spring-boot, mysql · 1 more bindings summarized'
      },
      {
        title: 'Labels',
        copy: '3 labels',
        meta: 'environment=prod, namespace=payments · 1 more labels summarized'
      }
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
      { key: 'missing-diagnostics', state: 'missing', title: 'Attribution diagnostics', copy: 'Attribution evidence needed', meta: 'Missing identity, monitor binding' }
    ]);
  });
});
