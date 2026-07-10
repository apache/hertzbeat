import { describe, expect, it, vi } from 'vitest';
import {
  buildAlertGroupEvidenceContext,
  buildAlertGroupFacts,
  buildAlertGroupFormDraft,
  buildAlertGroupMetrics,
  buildAlertGroupNoteRows,
  buildAlertGroupRows,
  buildAlertGroupSelectedRows,
  getAlertGroupValidationField,
  validateAlertGroupForm
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

function seconds(value: number) {
  return t('common.duration.seconds', { value });
}

function groupEvidenceTitle(signal: 'logs' | 'traces' | 'metrics') {
  return t('alert.rule.evidence.group.title', { signal: t(`alert.rule.signal.${signal}`) });
}

function groupEvidenceDraftName(signal: 'logs' | 'traces' | 'metrics', target: string) {
  return t('alert.rule.evidence.group.draft-name', { signal: t(`alert.rule.signal.${signal}`), target });
}

describe('alert group view model', () => {
  it('builds facts from group list', () => {
    expect(buildAlertGroupFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: t('alert.setting.fact.workspace'), value: 'alert/group' },
      { label: t('common.total'), value: '8' },
      { label: t('common.current-page-count'), value: '3' }
    ]);
  });

  it('builds metrics from enabled and disabled counts', () => {
    expect(
      buildAlertGroupMetrics(
        [
          { enable: true, name: 'g-1' },
          { enable: false, name: 'g-2' }
        ] as any,
        t
      )
    ).toEqual([
      { label: t('alert.rule.metric.current-page-enabled'), value: '1', tone: 'success' },
      { label: t('alert.rule.metric.current-page-disabled'), value: '1', tone: 'warning' },
      { label: t('alert.rule.metric.sample-rule'), value: 'g-1' }
    ]);
  });

  it('builds list rows', () => {
    expect(
      buildAlertGroupRows(
        [
          { id: 7, name: 'cpu', enable: true, groupLabels: ['service'], groupWait: 30, gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '7',
        title: 'cpu',
        copy: `${t('common.enabled')} · ${t('alert.group.labels')} service`,
        meta: `${t('alert.group.wait')} ${seconds(30)} · ${t('common.updated')} 2026-04-10 18:00:00`
      }
    ]);
  });

  it('builds selected rows', () => {
    expect(
      buildAlertGroupSelectedRows(
        { id: 7, name: 'cpu', enable: true, groupLabels: ['service'], groupWait: 30, groupInterval: 60, repeatInterval: 300 } as any,
        t
      )
    ).toEqual([
      { title: 'cpu', copy: t('common.enabled'), meta: t('alert.rule.selected.id-meta', { id: 7 }) },
      { title: t('alert.group.selected.labels'), copy: 'service', meta: `1 ${t('alert.group.labels')}` },
      {
        title: t('alert.group.selected.timers'),
        copy: `${t('alert.group.wait')} ${seconds(30)} · ${t('alert.group.interval')} ${seconds(60)}`,
        meta: `${t('alert.group.repeat')} ${seconds(300)}`
      }
    ]);
  });

  it('renders empty selected alert group meta with the localized empty fallback', () => {
    expect(buildAlertGroupSelectedRows(null, t)).toEqual([
      {
        title: t('alert.group.selected.empty.title'),
        copy: t('alert.group.selected.empty.copy'),
        meta: t('common.none')
      }
    ]);
  });

  it('renders missing alert group labels with the localized empty fallback', () => {
    expect(
      buildAlertGroupRows(
        [
          { id: 8, name: 'empty grouping', enable: false, groupLabels: [' ', ''], groupWait: 30, gmtUpdate: 1712730000000 }
        ] as any,
        t,
        () => '2026-04-10 18:00:00'
      )[0]
    ).toMatchObject({
      key: '8',
      title: 'empty grouping',
      copy: `${t('common.disabled')} · ${t('alert.group.labels')} ${t('common.none')}`
    });

    expect(
      buildAlertGroupSelectedRows(
        { id: 8, name: 'empty grouping', enable: false, groupLabels: [], groupWait: 30, groupInterval: 60, repeatInterval: 300 } as any,
        t
      )[1]
    ).toMatchObject({
      title: t('alert.group.selected.labels'),
      copy: t('common.none'),
      meta: `0 ${t('alert.group.labels')}`
    });
  });

  it('builds notes rows', () => {
    expect(buildAlertGroupNoteRows(t)).toEqual([
      { title: t('common.sorting'), copy: t('alert.rule.notes.sort-desc-copy'), meta: t('alert.group.notes.query') },
      { title: t('common.search'), copy: t('alert.rule.notes.search-copy'), meta: t('common.behavior-preserved') }
    ]);
  });

  it('builds three-signal group evidence context with stable grouping labels', () => {
    const context = buildAlertGroupEvidenceContext(
      'metrics',
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
        alertDatasource: 'sql',
        alertQueryType: 'metrics',
        returnTo: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout&returnLabel=%E6%8C%87%E6%A0%87%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'metrics',
      title: groupEvidenceTitle('metrics'),
      returnHref: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout',
      groupLabelsText: 'hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment, hertzbeat.source, hertzbeat.collector, hertzbeat.alert.datasource, hertzbeat.alert.query_type',
      draftPatch: {
        name: groupEvidenceDraftName('metrics', 'checkout'),
        groupLabelsText: 'hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment, hertzbeat.source, hertzbeat.collector, hertzbeat.alert.datasource, hertzbeat.alert.query_type'
      },
      groupPreview: {
        title: t('alert.group.preview.title'),
        copy: t('alert.group.preview.copy'),
        groupLabelsText: 'hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment, hertzbeat.source, hertzbeat.collector, hertzbeat.alert.datasource, hertzbeat.alert.query_type'
      }
    });
    expect(context?.rows.map(row => row.label)).toContain(t('signal.context.trace.label'));
  });

  it('localizes group evidence context and page facts outside zh-CN', () => {
    const context = buildAlertGroupEvidenceContext(
      'metrics',
      {
        entityId: 'service:commerce/checkout',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        returnTo: '/ingestion/otlp/metrics?returnLabel=Metrics'
      },
      enT
    );

    expect(context).toMatchObject({
      title: 'Grouping context from metrics',
      copy: 'New grouping rules converge by stable signal, service, environment, source, and alert-query labels; trace detail stays as evidence context only.',
      draftPatch: {
        name: 'metrics checkout group'
      }
    });
    expect(context?.groupLabelsText).toBe('hertzbeat.signal, hertzbeat.entity.id, service.name, service.namespace, deployment.environment');
    expect(context?.groupPreview).toMatchObject({
      title: 'Recommended group-by labels',
      copy: 'Use these stable label keys to group related signal alerts while keeping high-cardinality trace and span IDs out of notification grouping.'
    });
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[\u4e00-\u9fff]/);
    expect(context?.rows.map(row => row.label)).toContain('Current entity');
    expect(buildAlertGroupFacts({ totalElements: 1, content: [] } as any, enT)[0]).toEqual({
      label: 'Workspace',
      value: 'alert/group'
    });
    expect(buildAlertGroupMetrics([{ enable: true, name: 'g-1' }] as any, enT)[0]).toEqual({
      label: 'Current page enabled',
      value: '1',
      tone: 'success'
    });
  });

  it('builds and validates form drafts', () => {
    expect(buildAlertGroupFormDraft({ id: 7, name: 'cpu', enable: false, groupLabels: ['service'], groupWait: 10, groupInterval: 20, repeatInterval: 30 } as any)).toEqual({
      id: 7,
      name: 'cpu',
      enable: false,
      groupLabelsText: 'service',
      groupWait: '10',
      groupInterval: '20',
      repeatInterval: '30'
    });

    expect(validateAlertGroupForm(buildAlertGroupFormDraft(null), t)).toBe(t('alert.group.validation.name'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu' }, t)).toBe(t('alert.group.validation.labels'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '' }, t)).toBe(t('alert.group.validation.group-wait'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '' }, t)).toBe(t('alert.group.validation.group-interval'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: '' }, t)).toBe(t('alert.group.validation.repeat-interval'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '-1' }, t)).toBe(t('alert.group.validation.group-wait-non-negative'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '-300' }, t)).toBe(t('alert.group.validation.group-interval-non-negative'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: 'abc' }, t)).toBe(t('alert.group.validation.repeat-interval-non-negative'));
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service' }, t)).toBeNull();
  });

  it('returns the first invalid field so the editor can focus novice validation recovery', () => {
    expect(getAlertGroupValidationField(buildAlertGroupFormDraft(null))).toBe('name');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu' })).toBe('group-labels');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '' })).toBe('group-wait');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '' })).toBe('group-interval');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: '' })).toBe('repeat-interval');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '-1' })).toBe('group-wait');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '-300' })).toBe('group-interval');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: 'abc' })).toBe('repeat-interval');
    expect(getAlertGroupValidationField({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service' })).toBeNull();
  });

  it('applies new group fallback context without changing edit behavior', () => {
    expect(
      buildAlertGroupFormDraft(null, {
        name: groupEvidenceDraftName('metrics', 'checkout'),
        groupLabelsText: 'hertzbeat.entity.id, service.name'
      })
    ).toMatchObject({
      name: groupEvidenceDraftName('metrics', 'checkout'),
      enable: true,
      groupLabelsText: 'hertzbeat.entity.id, service.name',
      groupWait: '30',
      groupInterval: '300',
      repeatInterval: '14400'
    });

    expect(
      buildAlertGroupFormDraft(
        { id: 7, name: 'existing', enable: false, groupLabels: ['service'], groupWait: 10, groupInterval: 20, repeatInterval: 30 } as any,
        { name: 'fallback', groupLabelsText: 'fallback' }
      )
    ).toEqual({
      id: 7,
      name: 'existing',
      enable: false,
      groupLabelsText: 'service',
      groupWait: '10',
      groupInterval: '20',
      repeatInterval: '30'
    });
  });
});
