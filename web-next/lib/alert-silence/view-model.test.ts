import { describe, expect, it, vi } from 'vitest';
import { buildAlertSilenceEvidenceContext, buildAlertSilenceFacts, buildAlertSilenceMetrics, buildAlertSilenceNoteRows, buildAlertSilenceRows, buildAlertSilenceSelectedRows, validateAlertSilenceForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert silence view model', () => {
  it('builds facts from silence list', () => {
    expect(buildAlertSilenceFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: '工作区', value: 'alert/silence' },
      { label: t('common.total'), value: '8' },
      { label: t('common.current-page-count'), value: '3' }
    ]);
  });

  it('builds metrics from silence data', () => {
    expect(
      buildAlertSilenceMetrics(
        [
          { enable: true, matchAll: true, name: 'silence-a' },
          { enable: false, matchAll: false, name: 'silence-b' }
        ] as any,
        t
    )
    ).toEqual([
      { label: '当前页启用', value: '1', tone: 'success' },
      { label: '匹配全部', value: '1', tone: 'warning' },
      { label: '规则样例', value: 'silence-a' }
    ]);
  });

  it('builds silence rows', () => {
    expect(
      buildAlertSilenceRows(
        [
          { id: 7, name: 'silence-a', enable: true, matchAll: true, labels: { service: 'checkout' }, times: 2, gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '7',
        title: 'silence-a',
        copy: '已启用 · 匹配全部 true · 匹配标签 1',
        meta: `${t('alert.silence.times')} 2 · ${t('common.updated')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('builds selected rows', () => {
    expect(
      buildAlertSilenceSelectedRows(
        { id: 7, name: 'silence-a', enable: true, matchAll: true, type: 'label', labels: { service: 'checkout' }, days: ['MON'], times: 2 } as any,
        t
      )
    ).toEqual([
      { title: 'silence-a', copy: '已启用', meta: 'id 7' },
      { title: t('alert.silence.selected.strategy'), copy: t('alert.silence.selected.strategy.all'), meta: 'type label' },
      { title: '标签 / 周期', copy: '1 匹配标签', meta: '静默周期 MON' }
    ]);
  });

  it('builds notes rows', () => {
    expect(buildAlertSilenceNoteRows(t, 2)).toEqual([
      { title: t('alert.silence.notes.times.title'), copy: '2', meta: '静默次数' },
      { title: t('alert.silence.notes.query.title'), copy: 'search · id desc', meta: t('alert.silence.notes.query.meta') }
    ]);
  });

  it('builds three-signal silence evidence context with scoped labels and return href', () => {
    const context = buildAlertSilenceEvidenceContext(
      'logs',
      {
        entityId: 'service:commerce/checkout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        traceId: 'trace-123',
        spanId: 'span-456',
        source: 'otlp',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/log/manage?view=list&traceId=trace-123&returnLabel=%E6%97%A5%E5%BF%97%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'logs',
      title: '来自日志的静默上下文',
      returnHref: '/log/manage?view=list&traceId=trace-123',
      draftPatch: {
        name: '日志 checkout 静默',
        matchAll: false
      }
    });
    expect(context?.labelsText).toBe(
      'hertzbeat.signal:logs, hertzbeat.entity.id:service:commerce/checkout, service.name:checkout, service.namespace:commerce, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:edge-collector-a, hertzbeat.template:java-service'
    );
    expect(context?.draftPatch.labelsText).toBe(context?.labelsText);
    expect(context?.rows.map(row => row.label)).toContain('链路上下文');
  });

  it('localizes silence evidence context and page facts outside zh-CN', () => {
    const context = buildAlertSilenceEvidenceContext(
      'logs',
      {
        entityId: 'service:commerce/checkout',
        serviceName: 'checkout',
        environment: 'prod',
        returnTo: '/log/manage?returnLabel=Logs'
      },
      enT
    );

    expect(context).toMatchObject({
      title: 'Silence context from logs',
      copy: 'New silence rules match the current entity, service, environment, and trace labels so unrelated alerts are not muted.',
      draftPatch: {
        name: 'logs checkout silence'
      }
    });
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[来自日志链路指标三信号排障上下文]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[一-龥]/);
    expect(context?.rows.map(row => row.label)).toContain('Current entity');
    expect(buildAlertSilenceFacts({ totalElements: 1, content: [] } as any, enT)[0]).toEqual({
      label: 'Workspace',
      value: 'alert/silence'
    });
    expect(buildAlertSilenceMetrics([{ enable: false, matchAll: false, name: 's-1' }] as any, enT)[0]).toEqual({
      label: 'Current page enabled',
      value: '0'
    });
  });

  it('validates alert silence form drafts', () => {
    expect(
      validateAlertSilenceForm(
        {
          name: '',
          enable: true,
          matchAll: true,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: '',
        },
        t
      )
    ).toBe('规则名称为必填项');

    expect(
      validateAlertSilenceForm(
        {
          name: 'night-shift',
          enable: true,
          matchAll: false,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '2026-04-10T08:30',
          periodEnd: '2026-04-10T18:00',
        },
        t
      )
    ).toBe('匹配标签为必填项');

    expect(
      validateAlertSilenceForm(
        {
          name: 'weekday',
          enable: true,
          matchAll: true,
          type: '1',
          labelsText: '',
          daysText: '1,2,3,4,5',
          periodStart: '09:00',
          periodEnd: '18:00',
        },
        t
      )
    ).toBeNull();
  });
});
