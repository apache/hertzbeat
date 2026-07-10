import { describe, expect, it, vi } from 'vitest';
import type { AlertSummary, PageResult, SingleAlert } from '@/lib/types';
import {
  buildAlertEntityContextSummary,
  buildAlertEvidenceContextRows,
  buildAlertClosureOperationFailureFeedback,
  buildAlertClosureOperationFeedback,
  buildAlertEvidenceClosureRows,
  buildAlertClosureOperationRows,
  buildAlertGroupActionLabels,
  buildAlertGroupCards,
  buildAlertMetrics,
  buildAlertEventClosureReview,
  buildAlertRuleQuickDialogModel,
  buildAlertRuleWorkspaceHref,
  buildAlertNoiseControlManageHref,
  buildAlertNoiseControlSummary,
  clearAlertInhibitEqualLabels,
  clearAlertInhibitTarget,
  copyAlertInhibitSourceToTarget,
  dropSeverityFromAlertInhibitTarget,
  buildSelectedAlertRows,
  buildAlertRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const han = (...codes: number[]) => String.fromCodePoint(...codes);
const defaultAlertTitle = t('alert.center.default-title');
const severityLabel = (alert: SingleAlert) => (alert.labels?.severity || '').toUpperCase() || defaultAlertTitle;
const statusLabel = (status: string | null | undefined) => (status === 'firing' ? t('alert.status.firing') : '-');

describe('alert view model', () => {
  it('builds alert metric cards from summary counts', () => {
    const summary: AlertSummary = {
      total: 9,
      dealNum: 5,
      rate: 55,
      priorityWarningNum: 4,
      priorityCriticalNum: 3,
      priorityEmergencyNum: 1
    };

    expect(buildAlertMetrics(summary, t)).toEqual([
      { label: t('alert.center.metrics.warning'), value: '4', tone: 'warning' },
      { label: t('alert.center.metrics.critical'), value: '3', tone: 'danger' },
      { label: t('alert.center.metrics.emergency'), value: '1', tone: 'danger' }
    ]);
  });

  it('builds evidence list rows from alert page content', () => {
    const rows = buildAlertRows(
      {
        content: [
          {
            id: 7,
            content: 'CPU high',
            labels: { service: 'checkout', severity: 'critical' },
            status: 'firing',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      } as unknown as PageResult<SingleAlert>,
      t,
      severityLabel,
      statusLabel,
      () => '2026-04-10 18:00:00',
      defaultAlertTitle
    );

    expect(rows).toEqual([
      {
        key: '7',
        title: 'CPU high',
        copy: `checkout · ${t('alert.status.firing')}`,
        meta: 'CRITICAL · 2026-04-10 18:00:00'
      }
    ]);
  });

  it('renders missing alert row identity facts with the localized empty fallback', () => {
    const rows = buildAlertRows(
      {
        content: [
          {
            id: 8,
            content: 'Disk high',
            labels: {},
            status: 'firing',
            gmtUpdate: 1712730000000
          }
        ],
        totalElements: 1,
        pageIndex: 0,
        pageSize: 8
      } as unknown as PageResult<SingleAlert>,
      t,
      severityLabel,
      statusLabel,
      () => '2026-04-10 18:00:00',
      defaultAlertTitle
    );

    expect(rows).toEqual([
      {
        key: '8',
        title: 'Disk high',
        copy: `${t('common.none')} · ${t('alert.status.firing')}`,
        meta: `${defaultAlertTitle} · 2026-04-10 18:00:00`
      }
    ]);
  });

  it('builds selected alert summary rows', () => {
    expect(
      buildSelectedAlertRows(
        {
          id: 7,
          content: 'CPU high',
          fingerprint: 'fp-1',
          creator: 'ops',
          labels: { service: 'checkout', severity: 'critical' },
          status: 'firing',
          triggerTimes: 3,
          startAt: 1712730000000,
          gmtUpdate: 1712730300000
        } as SingleAlert,
        t,
        severityLabel,
        statusLabel,
        () => '2026-04-10 18:00:00',
        defaultAlertTitle
      )
    ).toEqual([
      {
        title: 'CPU high',
        copy: `checkout · ${t('alert.status.firing')}`,
        meta: 'CRITICAL'
      },
      {
        title: t('alert.center.selected.fingerprint'),
        copy: 'fp-1 · ops',
        meta: `${t('common.updated')} 2026-04-10 18:00:00`
      },
      {
        title: t('alert.center.selected.trigger-window'),
        copy: `${t('alert.center.selected.trigger-count', { count: 3 })} · 2026-04-10 18:00:00`,
        meta: `${t('common.end')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('renders missing selected alert fingerprint facts with the localized empty fallback', () => {
    expect(
      buildSelectedAlertRows(
        {
          id: 8,
          content: 'Disk high',
          fingerprint: ' ',
          creator: '',
          labels: {},
          status: 'firing',
          triggerTimes: 1,
          startAt: 1712730000000,
          gmtUpdate: 1712730300000
        } as SingleAlert,
        t,
        severityLabel,
        statusLabel,
        () => '2026-04-10 18:00:00',
        defaultAlertTitle
      )
    ).toEqual([
      {
        title: 'Disk high',
        copy: `${t('common.none')} · ${t('alert.status.firing')}`,
        meta: defaultAlertTitle
      },
      {
        title: t('alert.center.selected.fingerprint'),
        copy: `${t('common.none')} · ${t('common.none')}`,
        meta: `${t('common.updated')} 2026-04-10 18:00:00`
      },
      {
        title: t('alert.center.selected.trigger-window'),
        copy: `${t('alert.center.selected.trigger-count', { count: 1 })} · 2026-04-10 18:00:00`,
        meta: `${t('common.end')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('builds empty selected rows when nothing is selected', () => {
    expect(buildSelectedAlertRows(null, t, () => defaultAlertTitle, () => t('alert.status.firing'), () => '-', defaultAlertTitle)).toEqual([
      {
        title: t('alert.center.selected.empty.title'),
        copy: t('alert.center.selected.empty.copy'),
        meta: t('common.none')
      }
    ]);
  });

  it('renders empty selected alert meta with the localized empty fallback', () => {
    expect(buildSelectedAlertRows(null, t, () => defaultAlertTitle, () => t('alert.status.firing'), () => '-', defaultAlertTitle)[0]?.meta).toBe(t('common.none'));
  });

  it('builds the entity-context summary strip for the alert workbench', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'critical',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe(`${t('entity.response.context.status')}: ${t('alert.status.firing')} · ${t('entity.response.context.severity')}: ${t('alert.center.metrics.critical')} · ${t('entity.response.context.search')}: checkout`);
  });

  it('renders unknown alert entity-context statuses with a localized fallback', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'triaging',
          severity: 'warning',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe(`${t('entity.response.context.status')}: ${t('alert.center.context.status.unknown', { status: 'triaging' })} · ${t('entity.response.context.severity')}: ${t('alert.center.metrics.warning')} · ${t('entity.response.context.search')}: checkout`);
  });

  it('renders unknown alert entity-context severities with a localized fallback', () => {
    expect(
      buildAlertEntityContextSummary(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'degraded',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42'
        },
        t
      )
    ).toBe(`${t('entity.response.context.status')}: ${t('alert.status.firing')} · ${t('entity.response.context.severity')}: ${t('alert.center.context.severity.unknown', { severity: 'degraded' })} · ${t('entity.response.context.search')}: checkout`);
  });

  it('builds compact inherited evidence context rows without fake health or zero states', () => {
    expect(
      buildAlertEvidenceContextRows(
        {
          search: 'checkout',
          status: 'firing',
          severity: 'critical',
          entityId: '42',
          entityName: 'Checkout API',
          serviceName: 'checkout',
          environment: 'prod',
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          source: 'monitor',
          signal: 'metrics',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443',
          traceId: 'trace-123',
          spanId: 'span-456',
          returnTo: '/monitors/632051474676992'
        },
        t
      )
    ).toEqual([
      {
        key: 'time',
        title: t('alert.center.context.time.title'),
        copy: 'last-45m',
        meta: `2024/04/16 00:53:20 → 2024/04/16 01:38:20 · ${t('alert.center.context.time.paused')} · Asia/Shanghai`
      },
      {
        key: 'monitor',
        title: t('alert.center.context.monitor.title'),
        copy: 'checkout-http',
        meta: `website · example.com:443 · ${t('alert.center.context.monitor.id-meta', { monitorId: '632051474676992' })}`
      },
      {
        key: 'source',
        title: t('alert.center.context.source.title'),
        copy: t('alert.center.context.source.monitor.copy'),
        meta: t('alert.center.context.source.monitor.meta')
      },
      {
        key: 'trace',
        title: t('alert.center.context.trace.title'),
        copy: 'trace-123',
        meta: 'Span ID span-456'
      }
    ]);
  });

  it('renders unknown alert evidence sources with a localized fallback', () => {
    expect(buildAlertEvidenceContextRows({ source: 'external-prometheus' }, t)).toEqual([
      {
        key: 'source',
        title: t('alert.center.context.source.title'),
        copy: t('alert.center.context.source.unknown.copy', { source: 'external-prometheus' }),
        meta: t('alert.center.context.source.default.meta')
      }
    ]);
  });

  it('localizes alert evidence refresh meta in English without leaking raw implementation labels', () => {
    expect(
      buildAlertEvidenceContextRows(
        {
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'UTC',
          source: 'alert'
        },
        createTranslatorMock({ locale: 'en-US' })
      )[0]
    ).toMatchObject({
      key: 'time',
      title: 'Time range',
      copy: 'last-45m',
      meta: '04/15/2024, 16:53:20 → 04/15/2024, 17:38:20 · paused · UTC'
    });
  });

  it('uses locale code instead of visible alert labels for evidence date formatting', () => {
    const englishWithChineseVisibleLabels = createTranslatorMock({
      locale: 'en-US',
      overrides: {
        'common.refresh': han(0x5237, 0x65b0),
        'alert.workbench.kicker': han(0x544a, 0x8b66, 0x4e2d, 0x5fc3)
      }
    });

    expect(
      buildAlertEvidenceContextRows(
        {
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          tz: 'UTC'
        },
        englishWithChineseVisibleLabels
      )[0].meta
    ).toContain('04/15/2024');
  });

  it('builds the noise-control summary card for suppressed alert posture', () => {
    expect(
      buildAlertNoiseControlSummary(
        {
          activeSilenceCount: 1,
          matchingInhibitCount: 2,
          possibleAlertSuppression: true,
          activeSilences: [],
          matchingInhibits: []
        },
        0,
        t
      )
    ).toEqual({
      title: t('entity.detail.noise-controls.title.suppressed'),
      copy: t('entity.detail.noise-controls.copy.suppressed', { silenceCount: 1, inhibitCount: 2 }),
      silenceActionLabel: t('entity.detail.noise-controls.manage-silence'),
      inhibitActionLabel: t('entity.detail.noise-controls.manage-inhibit')
    });
  });

  it('keeps Angular create-capable noise-control labels when suppression is possible and no matching rules exist', () => {
    expect(
      buildAlertNoiseControlSummary(
        {
          activeSilenceCount: 0,
          matchingInhibitCount: 0,
          possibleAlertSuppression: true,
          activeSilences: [],
          matchingInhibits: []
        },
        3,
        t
      )
    ).toEqual({
      title: t('entity.detail.noise-controls.title.active'),
      copy: t('entity.detail.noise-controls.copy.active', { silenceCount: 0, inhibitCount: 0 }),
      silenceActionLabel: t('entity.detail.noise-controls.manage-silence-create'),
      inhibitActionLabel: t('entity.detail.noise-controls.manage-inhibit-create')
    });
  });

  it('builds noise-control management hrefs with machine context and no display return label', () => {
    expect(
      buildAlertNoiseControlManageHref(
        'silence',
        {
          search: '',
          status: 'firing',
          severity: '',
          entityId: '42',
          entityName: 'Checkout API',
          returnTo: '/entities/42?returnLabel=Checkout'
        },
        {
          activeSilenceCount: 1,
          matchingInhibitCount: 0,
          possibleAlertSuppression: false,
          activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
          matchingInhibits: []
        }
      )
    ).toBe('/alert/silence?entityId=42&entityName=Checkout+API&returnTo=%2Fentities%2F42&matchMode=entity-noise-controls&matchingRuleType=silence&matchingRuleIds=11');
  });

  it('keeps topology edge context when opening silence and inhibit closure actions', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    const query = {
      search: 'checkout-api',
      status: 'firing',
      severity: '',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'topology',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo: `${returnTo}&returnLabel=HertzBeat%20%E4%BC%81%E4%B8%9A%E8%BF%90%E7%BB%B4%E6%8B%93%E6%89%91`
    } as const;

    const silenceHref = buildAlertNoiseControlManageHref('silence', query, {
      activeSilenceCount: 1,
      matchingInhibitCount: 0,
      possibleAlertSuppression: false,
      activeSilences: [{ id: 11, name: 'silence-1', type: 'silence' }],
      matchingInhibits: []
    });
    const inhibitHref = buildAlertRuleWorkspaceHref('inhibit', query);
    const silenceParams = new URL(silenceHref, 'http://localhost').searchParams;
    const inhibitParams = new URL(inhibitHref, 'http://localhost').searchParams;

    expect(silenceHref).toMatch(/^\/alert\/silence\?/);
    expect(silenceParams.get('matchMode')).toBe('entity-noise-controls');
    expect(silenceParams.get('matchingRuleIds')).toBe('11');
    expect(inhibitHref).toMatch(/^\/alert\/inhibit\?/);
    [silenceParams, inhibitParams].forEach(params => {
      expect(params.get('entityId')).toBe('service:commerce/checkout');
      expect(params.get('entityName')).toBe('checkout-api');
      expect(params.get('returnTo')).toBe(returnTo);
      expect(params.get('returnLabel')).toBeNull();
      expect(params.get('serviceName')).toBe('checkout-api');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('prod');
      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('source')).toBe('topology');
      expect(params.get('viewMode')).toBe('resource-dependency');
      expect(params.get('sourceKind')).toBe('database-middleware-connection');
      expect(params.get('edgeId')).toBe('svc-checkout--res-orders-db');
    });
  });

  it('builds current group action posture for entity-context firing alerts', () => {
    expect(buildAlertGroupActionLabels({ status: 'firing' } as any, true, t)).toEqual([
      t('entity.alert.workbench.action.acknowledge'),
      t('entity.alert.workbench.action.resolve'),
      t('entity.alert.workbench.action.silence'),
      t('entity.alert.workbench.action.inhibit')
    ]);
  });

  it('builds OTLP alert evidence closure rows across entity, metrics, logs, traces, and topology', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      returnTo: '/topology?viewMode=resource-dependency&edgeId=svc-checkout--orders-db'
    } as const;
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
          status: 'firing'
        },
        {
          id: 702,
          content: 'Memory high',
          labels: { alertname: 'HighMemory', service: 'checkout', severity: 'critical' },
          status: 'firing'
        }
      ]
    } as any;

    const evidenceRows = buildAlertEvidenceClosureRows(query, group, t);
    const operationRows = buildAlertClosureOperationRows(query, group, t);

    expect(evidenceRows.map(row => row.key)).toEqual(['entity', 'metrics', 'logs', 'traces', 'topology']);
    expect(evidenceRows.map(row => row.title)).toEqual([
      t('alert.center.evidence.entity.title'),
      t('alert.center.evidence.metrics.title'),
      t('alert.center.evidence.logs.title'),
      t('alert.center.evidence.traces.title'),
      t('alert.center.evidence.topology.title')
    ]);
    expect(evidenceRows.find(row => row.key === 'entity')?.href).toContain('/entities/42?');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('/ingestion/otlp/metrics?');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('serviceName=checkout');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('entityId=42');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('spanId=span-456');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('collector=collector-a');
    expect(evidenceRows.find(row => row.key === 'metrics')?.href).toContain('template=spring-boot');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('/log/manage?');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('view=list');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('search=service.name+%3D+%22checkout%22');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'logs')?.meta).toBe(t('alert.center.evidence.logs.meta.trace'));
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('/trace/manage?');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('serviceName=checkout');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('traceId=trace-123');
    expect(evidenceRows.find(row => row.key === 'traces')?.href).toContain('spanId=span-456');
    expect(evidenceRows.find(row => row.key === 'traces')?.meta).toBe(t('alert.center.evidence.traces.meta.trace'));
    expect(evidenceRows.find(row => row.key === 'topology')?.href).toContain('/topology?');
    expect(operationRows.map(row => row.key)).toEqual(['acknowledge', 'recover', 'threshold', 'notice', 'group', 'silence', 'inhibit', 'automation', 'close']);
    expect(operationRows.map(row => row.label)).toEqual([
      t('alert.center.operation.acknowledge.label'),
      t('alert.center.operation.recover.label'),
      t('alert.center.operation.threshold.label'),
      t('alert.center.operation.notice.label'),
      t('alert.center.operation.group.label'),
      t('alert.center.operation.silence.label'),
      t('alert.center.operation.inhibit.label'),
      t('alert.center.operation.automation.label'),
      t('alert.center.operation.close.label')
    ]);
    expect(operationRows.find(row => row.key === 'threshold')?.href).toContain('/alert/setting?');
    expect(operationRows.find(row => row.key === 'notice')?.href).toContain('/alert/notice?');
    expect(operationRows.find(row => row.key === 'group')?.href).toContain('/alert/group?');
    expect(operationRows.find(row => row.key === 'silence')?.href).toContain('/alert/silence?');
    expect(operationRows.find(row => row.key === 'inhibit')?.href).toContain('/alert/inhibit?');
    const automationHref = operationRows.find(row => row.key === 'automation')?.href;
    expect(automationHref).toContain('/actions?');
    expect(automationHref).toContain('source=alert');
    expect(automationHref).toContain('entityId=42');
    expect(automationHref).toContain('serviceName=checkout');
    expect(automationHref).toContain('traceId=trace-123');
    expect(automationHref).toContain('spanId=span-456');
    expect(automationHref).toContain('alertGroupId=7');
  });

  it('uses disabled copy for direct closure operations when no alert group is visible', () => {
    const operationRows = buildAlertClosureOperationRows(
      {
        search: 'codex-pd-empty',
        status: 'firing',
        severity: '',
        source: 'product-design-1529'
      } as const,
      null,
      t
    );

    const disabledCopy = t('alert.center.closure-action.disabled.no-group');

    expect(operationRows.find(row => row.key === 'acknowledge')).toMatchObject({ copy: disabledCopy });
    expect(operationRows.find(row => row.key === 'recover')).toMatchObject({ copy: disabledCopy });
    expect(operationRows.find(row => row.key === 'close')).toMatchObject({ copy: disabledCopy });
    expect(operationRows.find(row => row.key === 'acknowledge')?.copy).not.toBe(
      t('alert.center.operation.acknowledge.copy', {
        target: t('alert.center.operation.target.current-alert'),
        count: 1
      })
    );
    expect(operationRows.find(row => row.key === 'threshold')?.href).toContain('/alert/setting?');
    expect(operationRows.find(row => row.key === 'silence')?.href).toContain('/alert/silence?');
    expect(operationRows.find(row => row.key === 'inhibit')?.href).toContain('/alert/inhibit?');
  });

  it('preserves full fault evidence context when opening topology from alert evidence', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo:
        '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&returnLabel=Topology'
    } as const;

    const topologyHref = buildAlertEvidenceClosureRows(query, null, t).find(row => row.key === 'topology')?.href || '';
    const topologyUrl = new URL(topologyHref, 'http://localhost');
    const params = topologyUrl.searchParams;

    expect(topologyUrl.pathname).toBe('/topology');
    expect(params.get('viewMode')).toBe('resource-dependency');
    expect(params.get('sourceKind')).toBe('database-middleware-connection');
    expect(params.get('edgeId')).toBe('svc-checkout--res-orders-db');
    expect(params.get('entityId')).toBe('service:commerce/checkout');
    expect(params.get('entityName')).toBe('checkout-api');
    expect(params.get('serviceName')).toBe('checkout-api');
    expect(params.get('serviceNamespace')).toBe('commerce');
    expect(params.get('environment')).toBe('prod');
    expect(params.get('timeRange')).toBe('last-1h');
    expect(params.get('source')).toBe('otlp');
    expect(params.get('signal')).toBe('traces');
    expect(params.get('traceId')).toBe('trace-123');
    expect(params.get('spanId')).toBe('span-456');
    expect(params.get('collector')).toBe('edge-collector-a');
    expect(params.get('template')).toBe('java-service');
    expect(params.get('returnLabel')).toBeNull();
    expect(params.get('returnTo')).toBeNull();
  });

  it('hydrates alert evidence handoffs from OTLP entity labels when route query has no entity context', () => {
    const query = {
      search: '',
      status: 'firing',
      severity: 'critical',
      returnTo: '/alert'
    } as const;
    const group = {
      id: 7,
      status: 'firing',
      commonLabels: {
        'hertzbeat.entity_id': '4200',
        'hertzbeat.entity_name': 'Checkout API',
        'service.name': 'checkout',
        'service.namespace': 'hertzbeat-demo',
        'deployment.environment.name': 'demo',
        'hertzbeat.source': 'otlp'
      },
      groupLabels: { severity: 'critical' },
      alerts: [
        {
          id: 701,
          status: 'firing',
          labels: {
            'hertzbeat.entity_id': '4200',
            'service.name': 'checkout'
          }
        }
      ]
    } as any;

    const evidenceRows = buildAlertEvidenceClosureRows(query, group, t);
    const operationRows = buildAlertClosureOperationRows(query, group, t);
    const hrefs = [
      ...evidenceRows.map(row => row.href),
      ...operationRows
        .filter(row => row.key !== 'automation')
        .map(row => row.href)
        .filter((href): href is string => Boolean(href))
    ];
    const automationHref = operationRows.find(row => row.key === 'automation')?.href || '';

    expect(evidenceRows.find(row => row.key === 'entity')?.href).toMatch(/^\/entities\/4200\?/);
    expect(evidenceRows.find(row => row.key === 'entity')?.copy).toBe('Checkout API');
    expect(evidenceRows.find(row => row.key === 'logs')?.href).toContain('search=service.name+%3D+%22checkout%22');
    expect(evidenceRows.find(row => row.key === 'topology')?.href).toContain('/topology?');

    hrefs.forEach(href => {
      const params = new URL(href, 'http://localhost').searchParams;

      expect(params.get('entityId')).toBe('4200');
      expect(params.get('entityName')).toBe('Checkout API');
      expect(params.get('serviceName')).toBe('checkout');
      expect(params.get('serviceNamespace')).toBe('hertzbeat-demo');
      expect(params.get('environment')).toBe('demo');
      expect(params.get('source')).toBe('otlp');
      expect(params.get('returnLabel')).toBeNull();
    });

    const automationParams = new URL(automationHref, 'http://localhost').searchParams;
    expect(automationParams.get('entityId')).toBe('4200');
    expect(automationParams.get('entityName')).toBe('Checkout API');
    expect(automationParams.get('serviceName')).toBe('checkout');
    expect(automationParams.get('serviceNamespace')).toBe('hertzbeat-demo');
    expect(automationParams.get('environment')).toBe('demo');
    expect(automationParams.get('source')).toBe('alert');
  });

  it('preserves three-signal alert context when opening rule workspaces from alert closure', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'traces',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
    } as const;

    (['setting', 'notice', 'group', 'silence', 'inhibit'] as const).forEach(mode => {
      const href = buildAlertRuleWorkspaceHref(mode, query);
      const params = new URL(href, 'http://localhost').searchParams;

      expect(href).toMatch(new RegExp(`^/alert/${mode === 'setting' ? 'setting' : mode}\\?`));
      expect(params.get('entityId')).toBe('service:commerce/checkout');
      expect(params.get('entityName')).toBe('checkout-api');
      expect(params.get('serviceName')).toBe('checkout');
      expect(params.get('serviceNamespace')).toBe('commerce');
      expect(params.get('environment')).toBe('prod');
      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('source')).toBe('otlp');
      expect(params.get('signal')).toBe('traces');
      expect(params.get('traceId')).toBe('trace-123');
      expect(params.get('spanId')).toBe('span-456');
      expect(params.get('collector')).toBe('edge-collector-a');
      expect(params.get('template')).toBe('java-service');
      expect(params.get('returnTo')).toBe('/trace/manage?traceId=trace-123');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('preserves unified time and monitor context across alert evidence and closure workspaces', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      signal: 'metrics',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443',
      returnTo: '/monitors/632051474676992?returnLabel=Monitor'
    } as const;

    const evidenceHrefs = buildAlertEvidenceClosureRows(query, null, t).map(row => row.href);
    const operationHrefs = buildAlertClosureOperationRows(query, null, t)
      .map(row => row.href)
      .filter((href): href is string => Boolean(href));

    [...evidenceHrefs, ...operationHrefs].forEach(href => {
      const params = new URL(href, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-45m');
      expect(params.get('start')).toBe('1713200000000');
      expect(params.get('end')).toBe('1713202700000');
      expect([null, '30']).toContain(params.get('refresh'));
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('monitorId')).toBe('632051474676992');
      expect(params.get('monitorName')).toBe('checkout-http');
      expect(params.get('monitorApp')).toBe('website');
      expect(params.get('monitorInstance')).toBe('example.com:443');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('derives one buffered event window for alert evidence when the route has no explicit absolute range', () => {
    const query = {
      search: 'checkout',
      status: 'firing',
      severity: 'critical',
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      environment: 'prod',
      timeRange: 'last-1h',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'otlp',
      signal: 'metrics',
      returnTo: '/alert'
    } as const;
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { service: 'checkout', severity: 'critical' },
          status: 'firing',
          startAt: 1713200000000,
          endAt: 1713201800000
        }
      ]
    } as any;

    const evidenceRows = buildAlertEvidenceClosureRows(query, group, t);
    const operationHrefs = buildAlertClosureOperationRows(query, group, t)
      .map(row => row.href)
      .filter((href): href is string => Boolean(href));
    const contextRows = buildAlertEvidenceContextRows(query, t, group);

    expect(contextRows).toContainEqual({
      key: 'time',
      title: t('alert.center.context.time.title'),
      copy: 'last-1h',
      meta: `2024/04/16 00:38:20 → 2024/04/16 01:38:20 · ${t('alert.center.context.time.paused')} · Asia/Shanghai`
    });
    [...evidenceRows.map(row => row.href), ...operationHrefs].forEach(href => {
      const params = new URL(href, 'http://localhost').searchParams;

      expect(params.get('timeRange')).toBe('last-1h');
      expect(params.get('start')).toBe('1713199100000');
      expect(params.get('end')).toBe('1713202700000');
      expect([null, '30']).toContain(params.get('refresh'));
      expect(params.get('live')).toBe('false');
      expect(params.get('tz')).toBe('Asia/Shanghai');
      expect(params.get('returnLabel')).toBeNull();
    });
  });

  it('summarizes milestone 6 closure without promoting roadmap-only incident domains', () => {
    const review = buildAlertEventClosureReview();

    expect(review.milestone).toBe(6);
    expect(review.status).toBe('ready-for-topology-fault-analysis');
    expect(review.evidenceKeys).toEqual(['entity', 'metrics', 'logs', 'traces', 'topology']);
    expect(review.operationKeys).toEqual(['acknowledge', 'recover', 'threshold', 'notice', 'group', 'silence', 'inhibit', 'automation', 'close']);
    expect(review.directMutationKeys).toEqual(['acknowledge', 'recover', 'close']);
    expect(review.ruleWorkspaceModes).toEqual(['setting', 'notice', 'group', 'silence', 'inhibit']);
    expect(review.implementedCapabilities).toEqual([
      'alert-evidence-entity',
      'alert-evidence-metrics',
      'alert-evidence-logs',
      'alert-evidence-traces',
      'alert-evidence-topology',
      'alert-acknowledge',
      'alert-recover',
      'alert-close',
      'threshold-rules',
      'notification-policies',
      'grouping-rules',
      'silence-rules',
      'inhibit-rules'
    ]);
    expect(review.futureRoadmapOnly).toEqual([
      'incident-management',
      'on-call',
      'status-pages',
      'case-management',
      'slo',
      'event-management'
    ]);
    expect(review.nextMilestone).toBe('topology-dependency-change-fault-analysis');
  });

  it('builds explicit post-operation feedback for alert evidence closure actions', () => {
    expect(buildAlertClosureOperationFeedback('acknowledge', t)).toBe(t('common.notify.mark-success'));
    expect(buildAlertClosureOperationFeedback('recover', t)).toBe(t('common.notify.mark-success'));
    expect(buildAlertClosureOperationFeedback('reopen', t)).toBe(t('common.notify.mark-success'));
    expect(buildAlertClosureOperationFeedback('close', t)).toBe(t('common.notify.delete-success'));
    expect(buildAlertClosureOperationFeedback('delete', t)).toBe(t('common.notify.delete-success'));
    expect(buildAlertClosureOperationFailureFeedback('acknowledge', t)).toBe(t('common.notify.mark-fail'));
    expect(buildAlertClosureOperationFailureFeedback('recover', t)).toBe(t('common.notify.mark-fail'));
    expect(buildAlertClosureOperationFailureFeedback('reopen', t)).toBe(t('common.notify.mark-fail'));
    expect(buildAlertClosureOperationFailureFeedback('close', t)).toBe(t('common.notify.delete-fail'));
    expect(buildAlertClosureOperationFailureFeedback('delete', t)).toBe(t('common.notify.delete-fail'));
  });

  it('builds alert group cards with labels, triage reason, and action posture', () => {
    expect(
      buildAlertGroupCards(
        {
          content: [
            {
              id: 7,
              status: 'firing',
              groupLabels: { service: 'checkout', severity: 'critical' },
              alerts: [
                {
                  id: 701,
                  content: 'CPU high',
                  labels: { alertname: 'HighCPU', severity: 'critical' },
                  annotations: { summary: 'CPU has been high for two intervals' },
                  status: 'firing',
                  triggerTimes: 2,
                  startAt: 1713190000000,
                  activeAt: 1713200000000
                }
              ],
              gmtUpdate: 1713200000000
            }
          ],
          totalElements: 1,
          pageIndex: 0,
          pageSize: 8
        } as any,
        true,
        t,
        () => '2026-04-19 20:00:00'
      )
    ).toEqual([
      expect.objectContaining({
        key: '7',
        triageReason: t('entity.alert.workbench.reason.single'),
        responseStage: t('alert.center.group.response.stage.firing'),
        evidenceSummary: t('alert.center.group.evidence.summary', {
          alertCount: 1,
          alertUnit: t('alert.center.group.evidence.alert.singular'),
          labelCount: 2,
          labelUnit: t('alert.center.group.evidence.label.plural')
        }),
        closureSummary: t('alert.center.group.closure.next', {
          actions: [
            t('entity.alert.workbench.action.acknowledge'),
            t('entity.alert.workbench.action.resolve'),
            t('entity.alert.workbench.action.silence'),
            t('entity.alert.workbench.action.inhibit')
          ].join(' / ')
        }),
        actionLabels: [
          t('entity.alert.workbench.action.acknowledge'),
          t('entity.alert.workbench.action.resolve'),
          t('entity.alert.workbench.action.silence'),
          t('entity.alert.workbench.action.inhibit')
        ],
        labels: ['service:checkout', 'severity:critical'],
        alerts: [
          expect.objectContaining({
            title: 'CPU high',
            status: t('alert.status.firing'),
            statusTone: 'critical',
            annotations: [{ key: 'summary', value: 'CPU has been high for two intervals' }],
            timeRows: [
              { key: 'first', label: t('alert.center.first-time'), value: '2026-04-19 20:00:00' },
              { key: 'last', label: t('alert.center.last-time'), value: '2026-04-19 20:00:00' }
            ]
          })
        ]
      })
    ]);
  });

  it('keeps the Angular acknowledged-card resolve action beside unacknowledge', () => {
    expect(
      buildAlertGroupCards(
        {
          content: [
            {
              id: 8,
              status: 'acknowledged',
              groupLabels: { service: 'checkout' },
              alerts: [
                {
                  id: 801,
                  content: 'CPU high acknowledged',
                  labels: { alertname: 'HighCPU', severity: 'warning' },
                  status: 'acknowledged',
                  activeAt: 1713200000000
                }
              ],
              gmtUpdate: 1713200000000
            }
          ],
          totalElements: 1,
          pageIndex: 0,
          pageSize: 8
        } as any,
        true,
        t,
        () => '2026-04-19 20:00:00'
      )[0]
    ).toEqual(expect.objectContaining({
      responseStage: t('alert.center.group.response.stage.acknowledged'),
      closureSummary: t('alert.center.group.closure.next', {
        actions: [
          t('entity.alert.workbench.action.unacknowledge'),
          t('entity.alert.workbench.action.resolve'),
          t('entity.alert.workbench.action.silence'),
          t('entity.alert.workbench.action.inhibit')
        ].join(' / ')
      }),
      actionLabels: [
        t('entity.alert.workbench.action.unacknowledge'),
        t('entity.alert.workbench.action.resolve'),
        t('entity.alert.workbench.action.silence'),
        t('entity.alert.workbench.action.inhibit')
      ]
    }));
  });

  it('keeps alert center cards actionable outside entity context instead of exposing delete only', () => {
    expect(buildAlertGroupActionLabels({ status: 'firing' }, false, t)).toEqual([
      t('entity.alert.workbench.action.acknowledge'),
      t('entity.alert.workbench.action.resolve'),
      t('entity.alert.workbench.action.silence'),
      t('entity.alert.workbench.action.inhibit'),
      t('alert.center.delete')
    ]);

    expect(buildAlertGroupActionLabels({ status: 'acknowledged' }, false, t)).toEqual([
      t('entity.alert.workbench.action.unacknowledge'),
      t('entity.alert.workbench.action.resolve'),
      t('entity.alert.workbench.action.silence'),
      t('entity.alert.workbench.action.inhibit'),
      t('alert.center.delete')
    ]);

    expect(buildAlertGroupActionLabels({ status: 'resolved' }, false, t)).toEqual([
      t('entity.alert.workbench.action.reopen'),
      t('entity.alert.workbench.action.silence'),
      t('entity.alert.workbench.action.inhibit'),
      t('alert.center.delete')
    ]);
  });

  it('builds current silence and inhibit quick-dialog models from a grouped alert', () => {
    const group = {
      id: 7,
      status: 'firing',
      groupLabels: { service: 'checkout', severity: 'critical' },
      commonLabels: { service: 'checkout', severity: 'critical' },
      alerts: [
        {
          id: 701,
          content: 'CPU high',
          labels: { alertname: 'HighCPU', service: 'checkout', severity: 'critical' },
          status: 'firing'
        }
      ]
    } as any;
    const query = {
      search: '',
      status: 'firing',
      severity: '',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    } as const;

    expect(buildAlertRuleQuickDialogModel(group, 'silence', query, t)).toMatchObject({
      title: t('entity.alert.workbench.silence.title'),
      entityTitle: 'Checkout API',
      summary: t('entity.alert.workbench.silence.selection', { count: 1 }),
      previewLabels: [
        { key: 'service', value: 'checkout' },
        { key: 'severity', value: 'critical' }
      ],
      silenceDraft: expect.objectContaining({
        name: 'Checkout API silence',
        matchAll: false,
        labelsText: 'service:checkout, severity:critical',
        type: '0'
      })
    });

    expect(buildAlertRuleQuickDialogModel(group, 'inhibit', query, t)).toMatchObject({
      title: t('entity.alert.workbench.inhibit.title'),
      entityTitle: 'Checkout API',
      summary: t('entity.alert.workbench.inhibit.selection', { count: 1 }),
      previewLabels: [
        { key: 'service', value: 'checkout' },
        { key: 'severity', value: 'critical' }
      ],
      targetPreviewLabels: [
        { key: 'service', value: 'checkout' }
      ],
      inhibitDraft: expect.objectContaining({
        name: 'Checkout API inhibit',
        sourceLabelsText: 'service:checkout, severity:critical',
        targetLabelsText: 'service:checkout',
        equalLabelsText: 'service'
      })
    });

    const selectedBatchGroup = {
      ...group,
      id: 0,
      groupKey: '__selected_batch__',
      alerts: [
        { id: 701, labels: { service: 'checkout', severity: 'critical' }, status: 'firing' },
        { id: 801, labels: { service: 'checkout', severity: 'critical' }, status: 'firing' }
      ]
    } as any;

    expect(buildAlertRuleQuickDialogModel(selectedBatchGroup, 'silence', query, t)).toMatchObject({
      summary: t('entity.alert.workbench.silence.selection', { count: 2 })
    });

    const globalQuery = {
      search: 'checkout',
      status: 'firing',
      severity: '',
      entityId: '',
      entityName: '',
      returnTo: ''
    } as const;

    expect(buildAlertRuleQuickDialogModel(group, 'silence', globalQuery, t)).toMatchObject({
      entityTitle: 'checkout',
      warning: null,
      silenceDraft: expect.objectContaining({
        name: 'checkout silence'
      })
    });
    expect(buildAlertRuleQuickDialogModel(group, 'inhibit', globalQuery, t)).toMatchObject({
      entityTitle: 'checkout',
      warning: null,
      inhibitDraft: expect.objectContaining({
        name: 'checkout inhibit'
      })
    });

    const globalPriorityGroup = {
      ...group,
      groupLabels: {
        instance: 'checkout-a',
        service: 'checkout',
        alertname: 'HighCPU',
        severity: 'critical'
      },
      commonLabels: {
        instance: 'checkout-a',
        service: 'checkout',
        alertname: 'HighCPU',
        severity: 'critical'
      }
    } as any;

    expect(buildAlertRuleQuickDialogModel(globalPriorityGroup, 'silence', globalQuery, t)).toMatchObject({
      entityTitle: 'checkout',
      silenceDraft: expect.objectContaining({
        name: 'checkout silence'
      })
    });

    const severityOnlyGroup = {
      ...group,
      groupLabels: { severity: 'critical' },
      commonLabels: { severity: 'critical' }
    } as any;

    expect(buildAlertRuleQuickDialogModel(severityOnlyGroup, 'inhibit', query, t)).toMatchObject({
      warning: t('entity.alert.workbench.inhibit.warning.empty-labels'),
      targetPreviewLabels: [],
      inhibitDraft: expect.objectContaining({
        sourceLabelsText: 'severity:critical',
        targetLabelsText: '',
        equalLabelsText: ''
      })
    });
  });

  it('applies the shared inhibit quick-dialog shortcuts to the draft', () => {
    const draft = {
      name: '',
      enable: true,
      sourceLabelsText: 'service:checkout, severity:critical',
      targetLabelsText: 'service:checkout, severity:critical',
      equalLabelsText: 'service, severity'
    };

    expect(copyAlertInhibitSourceToTarget({ ...draft, targetLabelsText: '' })).toMatchObject({
      targetLabelsText: 'service:checkout, severity:critical'
    });
    expect(dropSeverityFromAlertInhibitTarget(draft)).toMatchObject({
      targetLabelsText: 'service:checkout'
    });
    expect(clearAlertInhibitTarget(draft)).toMatchObject({
      targetLabelsText: ''
    });
    expect(clearAlertInhibitEqualLabels(draft)).toMatchObject({
      equalLabelsText: ''
    });
  });
});
