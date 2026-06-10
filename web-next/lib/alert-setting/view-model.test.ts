import { describe, expect, it, vi } from 'vitest';
import { buildAlertSettingEvidenceContext, buildAlertSettingFacts, buildAlertSettingRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert setting view model', () => {
  it('builds facts from define-list totals and datasource state', () => {
    expect(
      buildAlertSettingFacts(
        {
          totalElements: 12,
          content: [{ id: 1 }, { id: 2 }]
        } as any,
        { code: 0, data: { promql: true, sql: true } },
        t
      )
    ).toEqual([
      { label: t('alert.setting.fact.workspace'), value: 'alert/setting' },
      { label: t('alert.setting.fact.total'), value: '12' },
      { label: t('common.current-page-count'), value: '2' },
      { label: t('alert.setting.fact.datasource'), value: t('common.ready') }
    ]);
  });

  it('builds alert-define table rows for the shared settings console', () => {
    expect(
      buildAlertSettingRows(
        [
          {
            id: 7,
            name: 'cpu threshold',
            type: 'realtime_metric',
            datasource: 'promql',
            expr: 'cpu_usage > 80',
            template: 'OpsTemplate',
            labels: { severity: 'warning', team: 'core' },
            enable: true,
            gmtUpdate: 1713200000000
          }
        ] as any,
        t,
        vi.fn().mockReturnValue('2026-04-20 00:20:00')
      )
    ).toEqual([
      {
        key: '7',
        name: 'cpu threshold',
        type: t('alert.setting.type.realtime.metric'),
        expr: 'cpu_usage > 80',
        template: 'OpsTemplate',
        labels: ['severity:warning', 'team:core'],
        enabledLabel: t('common.enabled'),
        updatedAt: '2026-04-20 00:20:00'
      }
    ]);
  });

  it('labels trace periodic alerts separately from metrics and logs', () => {
    expect(
      buildAlertSettingRows(
        [
          {
            id: 9,
            name: 'checkout apm error rate',
            type: 'periodic_trace',
            datasource: 'sql',
            expr: 'SELECT service_name, 0.2 AS __value__ FROM hertzbeat_apm_red_1m',
            template: 'TraceTemplate',
            labels: {},
            enable: false,
            gmtUpdate: 1713200000000
          }
        ] as any,
        t,
        vi.fn().mockReturnValue('2026-04-20 00:20:00')
      )[0].type
    ).toBe(t('alert.setting.type.periodic.trace'));
  });

  it('renders missing alert setting row facts with the localized empty fallback', () => {
    expect(
      buildAlertSettingRows(
        [
          {
            id: 8,
            name: 'empty threshold',
            type: 'realtime_metric',
            expr: ' ',
            template: '',
            labels: {},
            enable: false
          }
        ] as any,
        t,
        vi.fn().mockReturnValue('2026-04-20 00:20:00')
      )[0]
    ).toMatchObject({
      key: '8',
      name: 'empty threshold',
      expr: t('common.none'),
      template: t('common.none'),
      labels: [],
      enabledLabel: t('common.disabled')
    });
  });

  it('builds alert-rule evidence context from a three-signal handoff route', () => {
    const context = buildAlertSettingEvidenceContext(
      'traces',
      {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        operationName: 'POST /checkout',
        collector: 'collector-a',
        template: 'spring-boot',
        alertQuery: 'operationName=POST /checkout\nerrorOnly=true',
        alertQueryType: 'traces',
        alertDatasource: 'sql',
        alertTemplate: 'TraceTemplate',
        returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'traces',
      title: t('alert.rule.evidence.setting.title', { signal: t('alert.rule.signal.traces') }),
      returnHref: '/trace/manage?traceId=trace-123',
      sourceQuery: 'operationName=POST /checkout\nerrorOnly=true',
      sourceQueryType: 'traces',
      labelsText:
        'hertzbeat.signal:traces, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, operation.name:POST /checkout, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot, hertzbeat.alert.datasource:sql, hertzbeat.alert.query_type:traces, hertzbeat.alert.template:TraceTemplate'
    });
    expect(context?.rows.map(row => row.label)).toContain(t('signal.context.trace.label'));
    expect(context?.rows).toContainEqual({
      label: t('alert.rule.evidence.query.label'),
      value: 'operationName=POST /checkout\nerrorOnly=true',
      meta: 'traces'
    });
    expect(context?.workflowActions.map(action => action.key)).toEqual(['notice', 'group', 'silence', 'inhibit']);
    context?.workflowActions.forEach(action => {
      const url = new URL(action.href, 'http://localhost');
      expect(url.pathname).toBe(`/alert/${action.key}`);
      expect(url.searchParams.get('signal')).toBe('traces');
      expect(url.searchParams.get('traceId')).toBe('trace-123');
      expect(url.searchParams.get('spanId')).toBe('span-456');
      expect(url.searchParams.get('operationName')).toBe('POST /checkout');
      expect(url.searchParams.get('collector')).toBe('collector-a');
      expect(url.searchParams.get('alertQueryType')).toBe('traces');
      expect(url.searchParams.get('alertDatasource')).toBe('sql');
      expect(url.searchParams.get('alertTemplate')).toBe('TraceTemplate');
      expect(url.searchParams.get('returnTo')).toBe('/trace/manage?traceId=trace-123');
      expect(url.searchParams.get('returnLabel')).toBeNull();
    });
  });

  it('localizes threshold evidence context and inherited rows outside zh-CN', () => {
    const context = buildAlertSettingEvidenceContext(
      'traces',
      {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'collector-a',
        template: 'spring-boot',
        returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
      },
      enT
    );

    expect(context).toMatchObject({
      signal: 'traces',
      title: 'Threshold context from traces',
      copy: 'New threshold rules prefill the current entity, service, environment, and trace labels; validation returns to the original troubleshooting context.',
      returnHref: '/trace/manage?traceId=trace-123'
    });
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => row.label)).toContain('Trace context');
    expect(context?.workflowActions.map(action => action.label)).toEqual([
      'Configure notification policy',
      'Configure grouping',
      'Create silence',
      'Create inhibit'
    ]);
  });
});
