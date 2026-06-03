import { describe, expect, it, vi } from 'vitest';
import { buildAlertInhibitEvidenceContext, buildAlertInhibitFacts, buildAlertInhibitMetrics, buildAlertInhibitNoteRows, buildAlertInhibitRows, buildAlertInhibitSelectedRows, validateAlertInhibitForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert inhibit view model', () => {
  it('builds facts from inhibit list', () => {
    expect(buildAlertInhibitFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: t('alert.setting.fact.workspace'), value: 'alert/inhibit' },
      { label: t('common.total'), value: '8' },
      { label: t('common.current-page-count'), value: '3' }
    ]);
  });

  it('builds metrics from inhibit data', () => {
    expect(
      buildAlertInhibitMetrics(
        [
          { enable: true, equalLabels: ['service'], name: 'rule-a' },
          { enable: false, equalLabels: ['cluster', 'namespace'], name: 'rule-b' }
        ] as any,
        t
    )
    ).toEqual([
      { label: t('alert.rule.metric.current-page-enabled'), value: '1', tone: 'success' },
      { label: t('alert.inhibit.equal'), value: '3' },
      { label: t('alert.rule.metric.sample-rule'), value: 'rule-a' }
    ]);
  });

  it('builds inhibit rows', () => {
    expect(
      buildAlertInhibitRows(
        [
          { id: 7, name: 'rule-a', enable: true, sourceLabels: { service: 'checkout' }, targetLabels: { severity: 'warning' }, equalLabels: ['cluster'], gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '7',
        title: 'rule-a',
        copy: `${t('common.enabled')} · ${t('alert.inhibit.source')} 1 · ${t('alert.inhibit.target')} 1`,
        meta: `${t('alert.inhibit.equal')} cluster · ${t('common.updated')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('builds selected rows', () => {
    expect(
      buildAlertInhibitSelectedRows(
        { id: 7, name: 'rule-a', enable: true, sourceLabels: { service: 'checkout' }, targetLabels: { severity: 'warning' }, equalLabels: ['cluster'] } as any,
        t
    )
    ).toEqual([
      { title: 'rule-a', copy: t('common.enabled'), meta: t('alert.rule.selected.id-meta', { id: 7 }) },
      { title: t('alert.inhibit.selected.source-target'), copy: `1 ${t('alert.inhibit.source')} · 1 ${t('alert.inhibit.target')}`, meta: t('alert.inhibit.selected.label-selectors') },
      { title: t('alert.inhibit.selected.equal-labels'), copy: 'cluster', meta: `1 ${t('alert.inhibit.selected.shared-labels')}` }
    ]);
  });

  it('renders empty selected alert inhibit meta with the localized empty fallback', () => {
    expect(buildAlertInhibitSelectedRows(null, t)).toEqual([
      {
        title: t('alert.inhibit.selected.empty.title'),
        copy: t('alert.inhibit.selected.empty.copy'),
        meta: t('common.none')
      }
    ]);
  });

  it('renders missing alert inhibit equal labels with the localized empty fallback', () => {
    expect(
      buildAlertInhibitRows(
        [
          {
            id: 8,
            name: 'empty inhibit',
            enable: false,
            sourceLabels: { service: 'checkout' },
            targetLabels: { severity: 'warning' },
            equalLabels: [' ', ''],
            gmtUpdate: 1712730000000
          }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: '8',
      title: 'empty inhibit',
      meta: `${t('alert.inhibit.equal')} ${t('common.none')} · ${t('common.updated')} 2026-04-10 18:00:00`
    });

    expect(
      buildAlertInhibitSelectedRows(
        { id: 8, name: 'empty inhibit', enable: false, sourceLabels: {}, targetLabels: {}, equalLabels: [] } as any,
        t
      )[2]
    ).toMatchObject({
      title: t('alert.inhibit.selected.equal-labels'),
      copy: t('common.none'),
      meta: `0 ${t('alert.inhibit.selected.shared-labels')}`
    });
  });

  it('builds notes rows', () => {
    expect(buildAlertInhibitNoteRows(t)).toEqual([
      { title: t('common.sorting'), copy: t('alert.rule.notes.sort-desc-copy'), meta: t('alert.inhibit.notes.query') },
      { title: t('common.search'), copy: t('alert.rule.notes.search-copy'), meta: t('common.behavior-preserved') }
    ]);
  });

  it('builds three-signal inhibit evidence context with scoped source, target, and equal labels', () => {
    const context = buildAlertInhibitEvidenceContext(
      'traces',
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
        returnTo: `/trace/manage?traceId=trace-123&returnLabel=${encodeURIComponent(t('menu.trace.manage'))}`
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'traces',
      title: t('alert.rule.evidence.inhibit.title', { signal: t('alert.rule.signal.traces') }),
      returnHref: '/trace/manage?traceId=trace-123',
      draftPatch: {
        name: t('alert.rule.evidence.inhibit.draft-name', { signal: t('alert.rule.signal.traces'), target: 'checkout' }),
        sourceLabelsText: expect.stringContaining('trace_id:trace-123'),
        targetLabelsText: expect.stringContaining('trace_id:trace-123'),
        equalLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment'
      }
    });
    expect(context?.sourceLabelsText).toContain('hertzbeat.signal:traces');
    expect(context?.sourceLabelsText).toContain('hertzbeat.entity.id:service:commerce/checkout');
    expect(context?.sourceLabelsText).toContain('span_id:span-456');
    expect(context?.targetLabelsText).toBe(context?.sourceLabelsText);
    expect(context?.rows.map(row => row.label)).toContain(t('signal.context.trace.label'));
  });

  it('localizes inhibit evidence context and page facts outside zh-CN', () => {
    const context = buildAlertInhibitEvidenceContext(
      'traces',
      {
        entityId: 'service:commerce/checkout',
        serviceName: 'checkout',
        environment: 'prod',
        returnTo: '/trace/manage?returnLabel=Traces'
      },
      enT
    );

    expect(context).toMatchObject({
      title: 'Inhibit context from traces',
      copy: 'New inhibit rules use the current entity, service, environment, and trace labels as source and target matchers; equal labels keep the entity boundary intact.',
      draftPatch: {
        name: 'traces checkout inhibit'
      }
    });
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => row.label)).toContain('Current entity');
    expect(buildAlertInhibitFacts({ totalElements: 1, content: [] } as any, enT)[0]).toEqual({
      label: 'Workspace',
      value: 'alert/inhibit'
    });
    expect(buildAlertInhibitMetrics([{ enable: true, equalLabels: [], name: 'i-1' }] as any, enT)[0]).toEqual({
      label: 'Current page enabled',
      value: '1',
      tone: 'success'
    });
  });

  it('validates alert inhibit form drafts', () => {
    expect(
      validateAlertInhibitForm(
        { name: '', enable: true, sourceLabelsText: '', targetLabelsText: '', equalLabelsText: '' },
        t
      )
    ).toBe(t('alert.inhibit.validation.name'));
    expect(
      validateAlertInhibitForm(
        { name: 'db inhibit', enable: true, sourceLabelsText: 'service:checkout', targetLabelsText: '', equalLabelsText: '' },
        t
      )
    ).toBe(t('alert.inhibit.validation.target'));
    expect(
      validateAlertInhibitForm(
        { name: 'db inhibit', enable: true, sourceLabelsText: 'service:checkout', targetLabelsText: 'service:db', equalLabelsText: 'severity' },
        t
      )
    ).toBeNull();
  });
});
