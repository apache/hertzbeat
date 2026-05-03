import { describe, expect, it } from 'vitest';
import {
  HERTZBEAT_ENTITY_CONTRACT_FIELDS,
  HERTZBEAT_ENTITY_SOURCE_KINDS,
  HERTZBEAT_ENTITY_SIGNAL_KINDS,
  buildEntityContractFromDetail,
  buildEntityContractFromMonitor,
  buildEntityContractFromOtlpBinding,
  buildEntityContractFromSummary
} from './entity-contract';

describe('HertzBeat unified entity contract', () => {
  it('pins the canonical contract fields before route rewrites', () => {
    expect(HERTZBEAT_ENTITY_CONTRACT_FIELDS).toEqual([
      'entityId',
      'entityType',
      'entityName',
      'source',
      'labels',
      'attributes',
      'relationships',
      'signals',
      'health',
      'lastSeen'
    ]);
    expect(HERTZBEAT_ENTITY_SOURCE_KINDS).toEqual([
      'hertzbeat-monitor',
      'collector',
      'otlp-resource-attributes',
      'k8s-labels',
      'cmdb-import',
      'manual-labels'
    ]);
    expect(HERTZBEAT_ENTITY_SIGNAL_KINDS).toEqual(['metrics', 'logs', 'traces', 'events', 'alerts']);
  });

  it('normalizes entity summaries into the contract without losing HertzBeat ownership context', () => {
    expect(
      buildEntityContractFromSummary({
        entity: {
          id: 7,
          name: 'checkout',
          displayName: 'Checkout',
          type: 'service',
          status: 'healthy',
          owner: 'payments',
          environment: 'prod',
          system: 'order',
          labels: { team: 'payments' },
          source: 'manual'
        } as any,
        identityCount: 3,
        monitorCount: 2,
        relationCount: 4,
        activeAlertCount: 1,
        lastEvidenceAt: 1712730000000
      })
    ).toMatchObject({
      entityId: '7',
      entityType: 'service',
      entityName: 'Checkout',
      source: 'manual-labels',
      labels: { team: 'payments' },
      attributes: {
        owner: 'payments',
        environment: 'prod',
        system: 'order',
        identityCount: 3,
        monitorCount: 2,
        relationCount: 4
      },
      signals: {
        metrics: { present: true, count: 2 },
        alerts: { present: true, count: 1 }
      },
      health: { status: 'healthy', activeAlertCount: 1 },
      lastSeen: 1712730000000
    });
  });

  it('normalizes entity details with identities, monitor binds, relations, and three-signal summaries', () => {
    expect(
      buildEntityContractFromDetail({
        entity: {
          entity: {
            id: 7,
            name: 'checkout',
            type: 'service',
            status: 'unhealthy',
            source: 'otlp',
            environment: 'prod',
            namespace: 'payments',
            labels: { service: 'checkout' }
          },
          identities: [{ key: 'service.name', value: 'checkout' }],
          monitorBinds: [{ monitorId: 42 }],
          relations: [{ type: 'calls', targetEntityId: 'db-1' }]
        },
        evidenceSummary: {
          activeAlertCount: 2,
          downMonitorCount: 1,
          healthyMonitorCount: 3,
          identityCount: 1,
          logHintCount: 8,
          lastEvidenceAt: '2026-04-28T10:00:00.000Z'
        },
        monitorSummary: { totalBoundMonitors: 4 },
        logSummary: { hintCount: 8 },
        traceSummary: { recentTraceCount: 12, recentErrorTraceCount: 2, latestObservedAt: 1712730001000, active: true },
        activeAlerts: [{ id: 1 }, { id: 2 }]
      })
    ).toMatchObject({
      entityId: '7',
      entityType: 'service',
      entityName: 'checkout',
      source: 'otlp-resource-attributes',
      labels: { service: 'checkout' },
      attributes: {
        environment: 'prod',
        namespace: 'payments',
        identityCount: 1,
        monitorBindCount: 1
      },
      relationships: [{ type: 'calls', targetEntityId: 'db-1', source: 'entity-detail' }],
      signals: {
        metrics: { present: true, count: 4 },
        logs: { present: true, count: 8 },
        traces: { present: true, count: 12, errorCount: 2 },
        alerts: { present: true, count: 2 }
      },
      health: { status: 'unhealthy', activeAlertCount: 2, downMonitorCount: 1, healthyMonitorCount: 3 },
      lastSeen: 1712730001000
    });
  });

  it('normalizes OTLP bound entities and monitor objects as first-class entity sources', () => {
    expect(
      buildEntityContractFromOtlpBinding({
        entityId: 99,
        type: 'service',
        name: 'checkout',
        namespace: 'payments',
        primaryIdentityKey: 'service.name',
        primaryIdentityValue: 'checkout',
        monitorBindCount: 2
      })
    ).toMatchObject({
      entityId: '99',
      entityType: 'service',
      entityName: 'checkout',
      source: 'otlp-resource-attributes',
      attributes: {
        namespace: 'payments',
        primaryIdentityKey: 'service.name',
        primaryIdentityValue: 'checkout',
        monitorBindCount: 2
      },
      signals: {
        metrics: { present: true, count: 2 },
        logs: { present: true },
        traces: { present: true }
      }
    });

    expect(
      buildEntityContractFromMonitor({
        id: 42,
        name: 'mysql-prod',
        app: 'mysql',
        instance: '10.0.0.8:3306',
        status: 0,
        labels: { role: 'database' },
        gmtUpdate: 1712730000000
      })
    ).toMatchObject({
      entityId: 'monitor-42',
      entityType: 'database',
      entityName: 'mysql-prod',
      source: 'hertzbeat-monitor',
      labels: { role: 'database' },
      attributes: {
        monitorId: 42,
        app: 'mysql',
        instance: '10.0.0.8:3306'
      },
      signals: {
        metrics: { present: true, source: 'monitor' }
      },
      health: { status: 'healthy' },
      lastSeen: 1712730000000
    });
  });
});
