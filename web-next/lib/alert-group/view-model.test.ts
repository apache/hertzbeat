import { describe, expect, it, vi } from 'vitest';
import { buildAlertGroupEvidenceContext, buildAlertGroupFacts, buildAlertGroupFormDraft, buildAlertGroupMetrics, buildAlertGroupNoteRows, buildAlertGroupRows, buildAlertGroupSelectedRows, validateAlertGroupForm } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });
const enT = createTranslatorMock({ locale: 'en-US' });

describe('alert group view model', () => {
  it('builds facts from group list', () => {
    expect(buildAlertGroupFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: '工作区', value: 'alert/group' },
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
      { label: '当前页启用', value: '1', tone: 'success' },
      { label: '当前页停用', value: '1', tone: 'warning' },
      { label: '规则样例', value: 'g-1' }
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
        copy: '已启用 · 分组标签 service',
        meta: `等待时间 30 秒 · ${t('common.updated')} 2026-04-10 18:00:00`
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
      { title: 'cpu', copy: '已启用', meta: '规则 ID 7' },
      { title: t('alert.group.selected.labels'), copy: 'service', meta: '1 分组标签' },
      { title: '时间窗口', copy: '等待时间 30 秒 · 间隔时间 60 秒', meta: '重复间隔 300 秒' }
    ]);
  });

  it('renders empty selected alert group meta with the localized empty fallback', () => {
    expect(buildAlertGroupSelectedRows(null, t)).toEqual([
      {
        title: t('alert.group.selected.empty.title'),
        copy: t('alert.group.selected.empty.copy'),
        meta: '无'
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
      copy: '已停用 · 分组标签 无'
    });

    expect(
      buildAlertGroupSelectedRows(
        { id: 8, name: 'empty grouping', enable: false, groupLabels: [], groupWait: 30, groupInterval: 60, repeatInterval: 300 } as any,
        t
      )[1]
    ).toMatchObject({
      title: t('alert.group.selected.labels'),
      copy: '无',
      meta: '0 分组标签'
    });
  });

  it('builds notes rows', () => {
    expect(buildAlertGroupNoteRows(t)).toEqual([
      { title: t('common.sorting'), copy: 'ID 倒序', meta: t('alert.group.notes.query') },
      { title: t('common.search'), copy: '支持搜索', meta: t('common.behavior-preserved') }
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
        returnTo: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout&returnLabel=%E6%8C%87%E6%A0%87%E5%B7%A5%E4%BD%9C%E5%8F%B0'
      },
      t
    );

    expect(context).toMatchObject({
      signal: 'metrics',
      title: '来自指标的分组上下文',
      returnHref: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout',
      groupLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment',
      draftPatch: {
        name: '指标 checkout 分组',
        groupLabelsText: 'hertzbeat.entity.id, service.name, service.namespace, deployment.environment'
      }
    });
    expect(context?.rows.map(row => row.label)).toContain('链路上下文');
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
      copy: 'New grouping rules converge by stable labels from the current entity, service, namespace, and environment; trace detail stays as evidence context only.',
      draftPatch: {
        name: 'metrics checkout group'
      }
    });
    expect(`${context?.title} ${context?.copy} ${context?.draftPatch.name}`).not.toMatch(/[来自指标日志链路三信号排障上下文]/);
    expect(context?.rows.map(row => [row.label, row.value, row.meta].join(' ')).join(' ')).not.toMatch(/[一-龥]/);
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

    expect(validateAlertGroupForm(buildAlertGroupFormDraft(null), t)).toBe('规则名称为必填项');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu' }, t)).toBe('分组标签为必填项');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '' }, t)).toBe('等待时间为必填项');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '' }, t)).toBe('间隔时间为必填项');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: '' }, t)).toBe('重复间隔为必填项');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupWait: '-1' }, t)).toBe('等待时间必须大于等于 0');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', groupInterval: '-300' }, t)).toBe('间隔时间必须大于等于 0');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service', repeatInterval: 'abc' }, t)).toBe('重复间隔必须大于等于 0');
    expect(validateAlertGroupForm({ ...buildAlertGroupFormDraft(null), name: 'cpu', groupLabelsText: 'service' }, t)).toBeNull();
  });

  it('applies new group fallback context without changing edit behavior', () => {
    expect(
      buildAlertGroupFormDraft(null, {
        name: '指标 checkout 分组',
        groupLabelsText: 'hertzbeat.entity.id, service.name'
      })
    ).toMatchObject({
      name: '指标 checkout 分组',
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
