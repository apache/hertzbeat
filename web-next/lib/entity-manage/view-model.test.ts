import { describe, expect, it, vi } from 'vitest';
import {
  buildEntityMetrics,
  buildEntityRows,
  buildEntityTableRows,
  buildSelectedEntityRows,
  isEntityAbnormalStatus,
  isEntityHealthyStatus,
  isEntityPendingEvidenceStatus
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });
const formattedAt = '2026-04-10 18:00:00';
const zhServiceLabel = (type?: string | null) => (type === 'service' ? t('entities.list.type.service') : '-');
const zhLocalEnvironmentLabel = (env?: string | null) => (env === 'local' ? t('entities.list.environment.local') : '-');
const zhUnknownStatusLabel = (status?: string | null) => (status === 'unknown' ? t('entities.list.status.unknown') : '-');
const formatAt = () => formattedAt;

describe('entity view model', () => {
  it('builds entity metrics from current page data', () => {
    expect(
      buildEntityMetrics(
        [
          { activeAlertCount: 2, monitorCount: 4, relationCount: 1 },
          { activeAlertCount: 0, monitorCount: 3, relationCount: 2 }
        ] as any,
        t
      )
    ).toEqual([
      { label: t('entities.list.metric.alerts'), value: '2', tone: 'warning' },
      { label: t('entities.list.metric.monitors'), value: '7', tone: 'success' },
      { label: t('entities.list.metric.relations'), value: '3' }
    ]);
  });

  it('builds entity list rows', () => {
    const rows = buildEntityRows(
      [
        {
          entity: {
            id: 1,
            displayName: 'Checkout Service',
            type: 'service',
            owner: 'ops',
            environment: 'local'
          },
          monitorCount: 4,
          activeAlertCount: 2,
          lastEvidenceAt: 1712730000000
        }
      ] as any,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      formatAt
    );

    expect(rows).toEqual([
      {
        key: '1',
        title: 'Checkout Service',
        copy: `${t('entities.list.type.service')} · ops · ${t('entities.list.environment.local')}`,
        meta: t('entities.list.item.meta', { monitorCount: 4, alertCount: 2, time: formattedAt })
      }
    ]);
  });

  it('uses localized fallback for missing entity row owner', () => {
    const rows = buildEntityRows(
      [
        {
          entity: {
            id: 2,
            displayName: 'Unowned Service',
            type: 'service',
            owner: '',
            environment: 'local'
          },
          monitorCount: 0,
          activeAlertCount: 0,
          lastEvidenceAt: null
        }
      ] as any,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      () => t('common.none')
    );

    expect(rows[0].copy).toBe(`${t('entities.list.type.service')} · ${t('common.none')} · ${t('entities.list.environment.local')}`);
  });

  it('builds HertzBeat-native entity table rows with lightweight health affordances', () => {
    expect(
      buildEntityTableRows(
        [
          {
            entity: {
              id: 1,
              name: 'checkout-api',
              displayName: 'Checkout Service',
              type: 'service',
              status: 'healthy',
              owner: 'checkout-oncall',
              environment: 'local'
            },
            monitorCount: 4,
            activeAlertCount: 2,
            identityCount: 3,
            relationCount: 1,
            lastEvidenceAt: 1712730000000
          }
        ] as any,
        t,
        zhServiceLabel,
        zhLocalEnvironmentLabel,
        (status?: string | null) => status || '-',
        formatAt
      )
    ).toEqual([
      {
        key: '1',
        name: 'Checkout Service',
        identityName: 'checkout-api',
        owner: 'checkout-oncall',
        type: t('entities.list.type.service'),
        environment: t('entities.list.environment.local'),
        status: 'healthy',
        statusTone: 'success',
        health: {
          score: 84,
          scoreText: '84 / 100',
          label: t('entity.health.label', { score: 84 }),
          copy: t('entity.health.copy.collected', { healthy: 4, total: 4 }),
          meta: t('entity.health.meta', { alerts: 2, anomalies: 0 }),
          tone: 'warning'
        },
        monitorCount: '4',
        activeAlertCount: '2',
        identityCount: '3',
        relationCount: '1',
        updatedAt: formattedAt,
        href: '/entities/1',
        ownerHref: '/entities/1/edit',
        metricHref: '/ingestion/otlp/metrics?entityId=1&entityType=service&entityName=Checkout+Service&serviceName=checkout-api&environment=local',
        logHref: '/log/manage?entityId=1&entityType=service&entityName=Checkout+Service&serviceName=checkout-api&environment=local',
        traceHref: '/trace/manage?entityId=1&entityType=service&entityName=Checkout+Service&serviceName=checkout-api&environment=local',
        discoveryCandidateMode: false
      }
    ]);
  });

  it('keeps id-less duplicate entity rows uniquely keyed for large import or backend anomaly pages', () => {
    const duplicateItems = [
      {
        entity: {
          name: 'checkout-api',
          displayName: 'Checkout API',
          type: 'service',
          status: 'unknown',
          owner: 'platform',
          environment: 'local'
        },
        monitorCount: 1,
        activeAlertCount: 0,
        identityCount: 1,
        relationCount: 0,
        lastEvidenceAt: null
      },
      {
        entity: {
          name: 'checkout-api',
          displayName: 'Checkout API',
          type: 'service',
          status: 'unknown',
          owner: 'platform',
          environment: 'local'
        },
        monitorCount: 2,
        activeAlertCount: 1,
        identityCount: 2,
        relationCount: 1,
        lastEvidenceAt: null
      }
    ] as any;
    const compactRows = buildEntityRows(
      duplicateItems,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      formatAt
    );
    const tableRows = buildEntityTableRows(
      duplicateItems,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      zhUnknownStatusLabel,
      formatAt
    );

    expect(compactRows.map(row => row.key)).toEqual(['checkout-api-service-0', 'checkout-api-service-1']);
    expect(tableRows.map(row => row.key)).toEqual(['checkout-api-service-0', 'checkout-api-service-1']);
    expect(new Set(tableRows.map(row => row.key)).size).toBe(tableRows.length);
    expect(tableRows[0]?.href).toBe('/entities');
    expect(tableRows[1]?.ownerHref).toBe('/entities/new');
  });

  it('preserves entity list return context in row handoff links without changing default links', () => {
    const [row] = buildEntityTableRows(
      [
        {
          entity: {
            id: 42,
            name: 'checkout-api',
            displayName: 'Checkout Service',
            type: 'service',
            status: 'healthy',
            owner: '',
            environment: 'local'
          },
          monitorCount: 0,
          activeAlertCount: 0,
          identityCount: 0,
          relationCount: 0,
          lastEvidenceAt: null
        }
      ] as any,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      (status?: string | null) => status || '-',
      formatAt,
      {
        returnTo: '/entities?search=checkout&source=entity-create-return&pageSize=8',
        source: 'entity-create-return',
        timeRange: 'last-30m',
        live: 'false',
        probe: 'entity-row-handoff',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443'
      }
    );

    expect(row.href).toBe(
      '/entities/42?source=entity-create-return&returnTo=%2Fentities%3Fsearch%3Dcheckout%26source%3Dentity-create-return%26pageSize%3D8&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443'
    );
    expect(row.ownerHref).toBe(
      '/entities/42/edit?source=entity-create-return&returnTo=%2Fentities%3Fsearch%3Dcheckout%26source%3Dentity-create-return%26pageSize%3D8&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443'
    );
    expect(row.discoveryCandidateMode).toBe(false);
    expect(row.owner).toBe(t('common.none'));
    expect(row.identityName).toBe('checkout-api');
    expect(row.identityCount).toBe('0');
    expect(row.metricHref).toBe(
      '/ingestion/otlp/metrics?timeRange=last-30m&live=false&entityId=42&entityType=service&entityName=Checkout+Service&returnTo=%2Fentities%3Fsearch%3Dcheckout%26source%3Dentity-create-return%26pageSize%3D8&serviceName=checkout-api&environment=local&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443&source=entity-create-return&probe=entity-row-handoff'
    );
    expect(row.logHref).toBe(
      '/log/manage?timeRange=last-30m&live=false&entityId=42&entityType=service&entityName=Checkout+Service&returnTo=%2Fentities%3Fsearch%3Dcheckout%26source%3Dentity-create-return%26pageSize%3D8&serviceName=checkout-api&environment=local&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443&source=entity-create-return&probe=entity-row-handoff'
    );
    expect(row.traceHref).toBe(
      '/trace/manage?timeRange=last-30m&live=false&entityId=42&entityType=service&entityName=Checkout+Service&returnTo=%2Fentities%3Fsearch%3Dcheckout%26source%3Dentity-create-return%26pageSize%3D8&serviceName=checkout-api&environment=local&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443&source=entity-create-return&probe=entity-row-handoff'
    );
  });

  it('marks discovery candidate rows so novice users see binding-first actions', () => {
    const [row] = buildEntityTableRows(
      [
        {
          entity: {
            id: 42,
            name: 'checkout-api',
            displayName: 'Checkout Service',
            type: 'service',
            status: 'unknown',
            owner: '',
            environment: 'local'
          },
          monitorCount: 0,
          activeAlertCount: 0,
          identityCount: 1,
          relationCount: 0,
          lastEvidenceAt: null
        }
      ] as any,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      zhUnknownStatusLabel,
      formatAt,
      {
        returnTo: '/entities/discovery?search=checkout-http',
        source: 'discovery-candidate',
        monitorId: '632051474676992',
        monitorName: 'checkout-http',
        monitorApp: 'website',
        monitorInstance: 'example.com:443'
      }
    );

    expect(row.discoveryCandidateMode).toBe(true);
    expect(row.ownerHref).toBe(
      '/entities/42/edit?source=discovery-candidate&returnTo=%2Fentities%2Fdiscovery%3Fsearch%3Dcheckout-http&monitorId=632051474676992&monitorName=checkout-http&monitorApp=website&monitorInstance=example.com%3A443'
    );
  });

  it('detects healthy entity statuses from raw entity data before localization', () => {
    expect(isEntityHealthyStatus('healthy')).toBe(true);
    expect(isEntityHealthyStatus('Healthy')).toBe(true);
    expect(isEntityHealthyStatus('up')).toBe(true);
    expect(isEntityHealthyStatus('normal')).toBe(true);
    expect(isEntityHealthyStatus('unhealthy')).toBe(false);
    expect(isEntityHealthyStatus(t('entities.list.status.healthy'))).toBe(false);
  });

  it('keeps unknown and paused statuses out of abnormal counts', () => {
    expect(isEntityPendingEvidenceStatus('unknown')).toBe(true);
    expect(isEntityPendingEvidenceStatus('paused')).toBe(true);
    expect(isEntityPendingEvidenceStatus('')).toBe(true);
    expect(isEntityPendingEvidenceStatus('healthy')).toBe(false);
    expect(isEntityAbnormalStatus('degraded')).toBe(true);
    expect(isEntityAbnormalStatus('critical')).toBe(true);
    expect(isEntityAbnormalStatus('unknown')).toBe(false);
    expect(isEntityAbnormalStatus('paused')).toBe(false);
    expect(isEntityAbnormalStatus('healthy')).toBe(false);
  });

  it('explains unknown entity status when the backend says no live evidence is bound', () => {
    const [row] = buildEntityTableRows(
      [
        {
          entity: {
            id: 42,
            name: 'codex-pd-entity',
            displayName: 'Codex PD Entity',
            type: 'service',
            status: 'unknown',
            owner: 'platform',
            environment: 'local'
          },
          status: {
            status: 'unknown',
            reason: 'no live evidence bound yet'
          },
          monitorCount: 0,
          activeAlertCount: 0,
          identityCount: 1,
          relationCount: 0,
          lastEvidenceAt: null
        }
      ] as any,
      t,
      zhServiceLabel,
      zhLocalEnvironmentLabel,
      zhUnknownStatusLabel,
      formatAt
    );

    expect(row.status).toBe(t('entities.list.status.unknown'));
    expect(row.statusReason).toBe(t('entities.list.row.status.no-live-evidence'));
    expect(row.statusTone).toBe('neutral');
  });

  it('builds selected entity summary rows', () => {
    expect(
      buildSelectedEntityRows(
        {
          entity: { displayName: 'Checkout Service', type: 'service', status: 'unknown' },
          activeAlertCount: 2,
          identityCount: 3,
          monitorCount: 4,
          relationCount: 1,
          definitionActivitySummary: null
      } as any,
      t,
      zhServiceLabel,
      zhUnknownStatusLabel
    )
    ).toEqual([
      { title: 'Checkout Service', copy: `${t('entities.list.type.service')} · ${t('entities.list.status.unknown')}`, meta: t('entities.list.selected.alerts', { count: 2 }) },
      { title: t('entities.list.rail.identity-monitor-relation'), copy: '3 / 4 / 1', meta: t('entities.list.selected.definition-activity') }
    ]);
  });

  it('uses localized empty fallback for the unselected entity rail', () => {
    expect(
      buildSelectedEntityRows(
        null,
        t,
        zhServiceLabel,
        zhUnknownStatusLabel
      )
    ).toEqual([{ title: t('entities.list.unselected.title'), copy: t('entities.list.unselected.copy'), meta: t('common.none') }]);
  });

  it('builds English evidence summary copy without localized fallbacks', () => {
    const metrics = buildEntityMetrics(
      [
        { activeAlertCount: 2, monitorCount: 4, relationCount: 1 },
        { activeAlertCount: 0, monitorCount: 3, relationCount: 2 }
      ] as any,
      enT
    );
    const rows = buildEntityRows(
      [
        {
          entity: {
            id: 1,
            displayName: 'Checkout Service',
            type: 'service',
            owner: 'ops',
            environment: 'local'
          },
          monitorCount: 4,
          activeAlertCount: 2,
          lastEvidenceAt: 1712730000000
        }
      ] as any,
      enT,
      (type?: string | null) => (type === 'service' ? 'Service' : '-'),
      (env?: string | null) => (env === 'local' ? 'Local' : '-'),
      () => '2026-04-10 18:00:00'
    );
    const selectedRows = buildSelectedEntityRows(
      {
        entity: { displayName: 'Checkout Service', type: 'service', status: 'unknown' },
        activeAlertCount: 2,
        identityCount: 3,
        monitorCount: 4,
        relationCount: 1,
        definitionActivitySummary: null
      } as any,
      enT,
      (type?: string | null) => (type === 'service' ? 'Service' : '-'),
      (status?: string | null) => (status === 'unknown' ? 'Unknown' : '-')
    );

    expect(metrics).toEqual([
      { label: 'Current page alerts', value: '2', tone: 'warning' },
      { label: 'Current page monitors', value: '7', tone: 'success' },
      { label: 'Current page relations', value: '3' }
    ]);
    expect(rows[0]?.meta).toBe('Monitors 4 · alerts 2 · evidence 2026-04-10 18:00:00');
    expect(selectedRows).toEqual([
      { title: 'Checkout Service', copy: 'Service · Unknown', meta: 'Alerts 2' },
      { title: 'Identity / monitors / relations', copy: '3 / 4 / 1', meta: 'Definition activity -' }
    ]);
    expect(
      [
        ...metrics.map(metric => metric.label),
        rows[0]?.meta,
        ...selectedRows.flatMap(row => [row.title, row.copy, row.meta])
      ].join('\n')
    ).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
