import { describe, expect, it, vi } from 'vitest';
import { buildAlertInhibitEvidenceContext, buildAlertInhibitFacts, buildAlertInhibitMetrics, buildAlertInhibitNoteRows, buildAlertInhibitRows, buildAlertInhibitSelectedRows, validateAlertInhibitForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert inhibit view model', () => {
  it('builds facts from inhibit list', () => {
    expect(buildAlertInhibitFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: '工作区', value: 'alert/inhibit' },
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
      { label: '当前页启用', value: '1', tone: 'success' },
      { label: '相等标签', value: '3' },
      { label: '规则样例', value: 'rule-a' }
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
        copy: '已启用 · 源标签 1 · 目标标签 1',
        meta: `相等标签 cluster · ${t('common.updated')} 2026-04-10 18:00:00`
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
      { title: 'rule-a', copy: '已启用', meta: '规则 ID 7' },
      { title: '源 / 目标', copy: '1 源标签 · 1 目标标签', meta: '标签选择器' },
      { title: '相等标签', copy: 'cluster', meta: '1 共享标签' }
    ]);
  });

  it('renders empty selected alert inhibit meta with the localized empty fallback', () => {
    expect(buildAlertInhibitSelectedRows(null, t)).toEqual([
      {
        title: t('alert.inhibit.selected.empty.title'),
        copy: t('alert.inhibit.selected.empty.copy'),
        meta: '无'
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
      meta: `相等标签 无 · ${t('common.updated')} 2026-04-10 18:00:00`
    });

    expect(
      buildAlertInhibitSelectedRows(
        { id: 8, name: 'empty inhibit', enable: false, sourceLabels: {}, targetLabels: {}, equalLabels: [] } as any,
        t
      )[2]
    ).toMatchObject({
      title: '相等标签',
      copy: '无',
      meta: '0 共享标签'
    });
  });

  it('builds notes rows', () => {
    expect(buildAlertInhibitNoteRows(t)).toEqual([
      { title: t('common.sorting'), copy: 'ID 倒序', meta: t('alert.inhibit.notes.query') },
      { title: t('common.search'), copy: '支持搜索', meta: t('common.behavior-preserved') }
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
        returnTo: '/trace/manage?traceId=trace-123&returnLabel=%E9%93%BE%E8%B7%AF%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'traces',
      title: '来自链路的抑制上下文',
      returnHref: '/trace/manage?traceId=trace-123',
      draftPatch: {
        name: '链路 checkout 抑制',
        sourceLabelsText: expect.stringContaining('trace_id:trace-123'),
        targetLabelsText: expect.stringContaining('trace_id:trace-123'),
        equalLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment'
      }
    });
    expect(context?.sourceLabelsText).toContain('hertzbeat.signal:traces');
    expect(context?.sourceLabelsText).toContain('hertzbeat.entity.id:service:commerce/checkout');
    expect(context?.sourceLabelsText).toContain('span_id:span-456');
    expect(context?.targetLabelsText).toBe(context?.sourceLabelsText);
    expect(context?.rows.map(row => row.label)).toContain('链路上下文');
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
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[来自日志链路指标三信号排障上下文]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[一-龥]/);
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
    ).toBe('规则名称为必填项');
    expect(
      validateAlertInhibitForm(
        { name: 'db inhibit', enable: true, sourceLabelsText: 'service:checkout', targetLabelsText: '', equalLabelsText: '' },
        t
      )
    ).toBe('目标标签为必填项');
    expect(
      validateAlertInhibitForm(
        { name: 'db inhibit', enable: true, sourceLabelsText: 'service:checkout', targetLabelsText: 'service:db', equalLabelsText: 'severity' },
        t
      )
    ).toBeNull();
  });
});
