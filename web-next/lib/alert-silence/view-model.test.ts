import { describe, expect, it, vi } from 'vitest';
import { buildAlertSilenceEvidenceContext, buildAlertSilenceFacts, buildAlertSilenceMetrics, buildAlertSilenceNoteRows, buildAlertSilenceRows, buildAlertSilenceSelectedRows, getAlertSilenceValidationField, validateAlertSilenceForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert silence view model', () => {
  it('builds facts from silence list', () => {
    expect(buildAlertSilenceFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: t('alert.setting.fact.workspace'), value: 'alert/silence' },
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
      { label: t('alert.rule.metric.current-page-enabled'), value: '1', tone: 'success' },
      { label: t('alert.silence.match-all'), value: '1', tone: 'warning' },
      { label: t('alert.rule.metric.sample-rule'), value: 'silence-a' }
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
        copy: `${t('common.enabled')} · ${t('alert.silence.match-all')} ${t('common.boolean.true')} · ${t('alert.silence.labels')} 1`,
        meta: `${t('alert.silence.times')} 2 · ${t('common.updated')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('renders disabled alert silence row match-all boolean with localized false copy', () => {
    expect(
      buildAlertSilenceRows(
        [
          { id: 8, name: 'silence-b', enable: false, matchAll: false, labels: {}, times: 0, gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: '8',
      title: 'silence-b',
      copy: `${t('common.disabled')} · ${t('alert.silence.match-all')} ${t('common.boolean.false')} · ${t('alert.silence.labels')} 0`
    });
  });

  it('builds selected rows', () => {
    expect(
      buildAlertSilenceSelectedRows(
        { id: 7, name: 'silence-a', enable: true, matchAll: true, type: 'label', labels: { service: 'checkout' }, days: ['MON'], times: 2 } as any,
        t
    )
    ).toEqual([
      { title: 'silence-a', copy: t('common.enabled'), meta: t('alert.rule.selected.id-meta', { id: 7 }) },
      { title: t('alert.silence.selected.strategy'), copy: t('alert.silence.selected.strategy.all'), meta: t('alert.silence.selected.type-meta', { type: 'label' }) },
      { title: t('alert.silence.selected.labels-days'), copy: `1 ${t('alert.silence.labels')}`, meta: `${t('alert.silence.days')} MON` }
    ]);
  });

  it('renders empty selected alert silence meta with the localized empty fallback', () => {
    expect(buildAlertSilenceSelectedRows(null, t)).toEqual([
      {
        title: t('alert.silence.selected.empty.title'),
        copy: t('alert.silence.selected.empty.copy'),
        meta: t('common.none')
      }
    ]);
  });

  it('renders selected alert silence type meta with the localized empty fallback', () => {
    expect(
      buildAlertSilenceSelectedRows(
        { id: 9, name: 'empty type silence', enable: true, matchAll: false, labels: {}, days: [] } as any,
        t
      )[1]
    ).toMatchObject({
      title: t('alert.silence.selected.strategy'),
      copy: t('alert.silence.selected.strategy.any'),
      meta: t('alert.silence.selected.type-meta', { type: t('common.none') })
    });
  });

  it('renders missing alert silence days with the localized empty fallback', () => {
    expect(
      buildAlertSilenceSelectedRows(
        {
          id: 8,
          name: 'empty silence',
          enable: false,
          matchAll: false,
          type: 'label',
          labels: { service: 'checkout' },
          days: [' ', ''],
          times: 0
        } as any,
        t
      )[2]
    ).toMatchObject({
      title: t('alert.silence.selected.labels-days'),
      copy: `1 ${t('alert.silence.labels')}`,
      meta: `${t('alert.silence.days')} ${t('common.none')}`
    });
  });

  it('builds notes rows', () => {
    expect(buildAlertSilenceNoteRows(t, 2)).toEqual([
      { title: t('alert.silence.notes.times.title'), copy: '2', meta: t('alert.silence.notes.times.meta') },
      { title: t('alert.silence.notes.query.title'), copy: t('alert.rule.notes.search-sort-copy'), meta: t('alert.silence.notes.query.meta') }
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
        returnTo: `/log/manage?view=list&traceId=trace-123&returnLabel=${encodeURIComponent(t('menu.log.manage'))}`
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'logs',
      title: t('alert.rule.evidence.silence.title', { signal: t('alert.rule.signal.logs') }),
      returnHref: '/log/manage?view=list&traceId=trace-123',
      draftPatch: {
        name: t('alert.rule.evidence.silence.draft-name', { signal: t('alert.rule.signal.logs'), target: 'checkout' }),
        matchAll: false
      }
    });
    expect(context?.labelsText).toBe(
      'hertzbeat.signal:logs, hertzbeat.entity.id:service:commerce/checkout, service.name:checkout, service.namespace:commerce, deployment.environment:prod, trace_id:trace-123, span_id:span-456, hertzbeat.source:otlp, hertzbeat.collector:edge-collector-a, hertzbeat.template:java-service'
    );
    expect(context?.draftPatch.labelsText).toBe(context?.labelsText);
    expect(context?.rows.map(row => row.label)).toContain(t('signal.context.trace.label'));
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
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
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
    ).toBe(t('alert.silence.validation.name'));

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
    ).toBe(t('alert.silence.validation.labels'));

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

    expect(
      validateAlertSilenceForm(
        {
          name: 'weekday',
          enable: true,
          matchAll: true,
          type: '1',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: '',
        },
        t
      )
    ).toBe(t('alert.silence.validation.days'));

    expect(
      validateAlertSilenceForm(
        {
          name: 'one-time',
          enable: true,
          matchAll: true,
          type: '0',
          labelsText: '',
          daysText: '',
          periodStart: '',
          periodEnd: '2026-04-10T18:00',
        },
        t
      )
    ).toBe(t('alert.silence.validation.time'));

    expect(
      validateAlertSilenceForm(
        {
          name: 'weekday',
          enable: true,
          matchAll: true,
          type: '1',
          labelsText: '',
          daysText: '8, nope',
          periodStart: '09:00',
          periodEnd: '18:00',
        },
        t
      )
    ).toBe(t('alert.silence.validation.days'));

    expect(
      validateAlertSilenceForm(
        {
          name: 'weekday',
          enable: true,
          matchAll: true,
          type: '1',
          labelsText: '',
          daysText: '1,2,3,4,5',
          periodStart: '25:00',
          periodEnd: '18:00',
        },
        t
      )
    ).toBe(t('alert.silence.validation.time'));

    expect(
      getAlertSilenceValidationField({
        name: 'weekday',
        enable: true,
        matchAll: true,
        type: '1',
        labelsText: '',
        daysText: '',
        periodStart: '09:00',
        periodEnd: '18:00',
      })
    ).toBe('days');

    expect(
      getAlertSilenceValidationField({
        name: 'weekday',
        enable: true,
        matchAll: true,
        type: '1',
        labelsText: '',
        daysText: '1,2,3,4,5',
        periodStart: '09:00',
        periodEnd: '',
      })
    ).toBe('time');
  });
});
