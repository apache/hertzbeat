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
      { label: '工作区', value: 'alert/setting' },
      { label: '阈值总数', value: '12' },
      { label: '当前页', value: '2' },
      { label: '数据源', value: '就绪' }
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
        enabledLabel: '已启用',
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
        collector: 'collector-a',
        template: 'spring-boot',
        returnTo: '/trace/manage?traceId=trace-123&returnLabel=Trace'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'traces',
      title: '来自链路的阈值上下文',
      returnHref: '/trace/manage?traceId=trace-123',
      labelsText:
        'hertzbeat.signal:traces, hertzbeat.entity.id:7, service.name:checkout, service.namespace:payments, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:collector-a, hertzbeat.template:spring-boot'
    });
    expect(context?.rows.map(row => row.label)).toContain('链路上下文');
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
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[一-龥]/);
    expect(context?.rows.map(row => row.label)).toContain('Trace context');
  });
});
