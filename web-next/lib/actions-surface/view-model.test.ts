import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildActionsPlaceholderState, buildActionsSurfaceViewModel } from './view-model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('actions surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildActionsPlaceholderState(t);

    expect(state).toMatchObject({
      kicker: '自动化入口',
      title: '自动化处置',
      subtitle: '按 OTLP 工作台的冷色基线统一入口、上下文和审批语义。',
      adapterBoundary: {
        state: 'adapter-pending',
        label: '执行边界',
        roadmapOnlyLabels: ['工作流自动化', '动作目录', '应用编排器', '自助动作', '审批流', '脚本执行', '处置手册编排']
      },
      approvalDraft: {
        state: 'awaiting-context',
        adapterOwner: 'next-actions-approval-draft-bff',
        endpoint: '/api/actions/approval-drafts',
        executionAllowed: false
      },
      approvalDecision: {
        state: 'awaiting-draft',
        adapterOwner: 'next-actions-approval-decision-bff',
        endpointTemplate: '/api/actions/approval-drafts/:draftId/decision',
        executionAllowed: false
      },
      approvalDraftQueue: {
        state: 'loading',
        adapterOwner: 'next-actions-approval-draft-bff',
        endpoint: '/api/actions/approval-drafts?limit=8',
        executionAllowed: false,
        managerBacked: false
      },
      catalogAdapter: {
        state: 'loading',
        adapterOwner: 'next-actions-catalog-bff',
        endpoint: '/api/actions/catalog?limit=8',
        executionAllowed: false,
        managerBacked: false
      },
      shell: {
        eyebrow: '冷色入口已接入',
        chips: ['自动化目录', '风险动作', '审批流']
      },
      empty: {
        title: '等待接入执行适配器'
      }
    });
    expect(state.actions).toEqual([
      { label: '打开概览', href: '/overview', variant: 'primary' },
      { label: '查看对象', href: '/entities', variant: 'subtle' }
    ]);
    expect(state.checklist.map(item => item.title)).toEqual([
      '统一入口上下文',
      '接入执行适配器',
      '保留证据跳转'
    ]);
  });

  it('keeps static action snapshots behind an explicit adapter boundary', () => {
    const viewModel = buildActionsSurfaceViewModel(t);

    expect(viewModel.adapterBoundary.copy).toContain('roadmap 示例快照');
    expect(viewModel.catalogCards.every(card => card.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.runRows.every(row => row.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.approvalRows.every(row => row.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.catalogCards[0]?.meta).toContain('示例快照');
    expect(viewModel.runRows[0]?.meta).toContain('示例快照');
    expect(viewModel.approvalRows[0]?.meta).toContain('示例快照');
  });

  it('derives catalog, run, and approval sections from the domain snapshot', () => {
    const viewModel = buildActionsSurfaceViewModel(t);

    expect(viewModel.kicker).toBe('自动化控制面');
    expect(viewModel.subtitle).toBe('自动化目录、执行历史和审批感知操作保持在同一上下文中。');
    expect(viewModel.tags).toEqual(['自动化目录', '风险感知动作', '审批流']);
    expect(viewModel.facts.find(fact => fact.label === '信号')?.value).toBe('3');
    expect(viewModel.catalogCards).toHaveLength(3);
    expect(viewModel.catalogCards[0]).toMatchObject({
      title: '重启 checkout 部署',
      eyebrow: '运行时恢复',
      copy: '服务 checkout / prod-ap · 平台运维',
      posture: '需要审批和回滚说明'
    });
    expect(viewModel.catalogCards[0]?.meta).toContain('12 分钟前');
    expect(viewModel.runRows[0]).toMatchObject({
      title: '重启 checkout 部署',
      copy: 'checkout / prod-ap · li.na · 待审批'
    });
    expect(viewModel.runRows[0]?.meta).toContain('等待审批');
    expect(viewModel.approvalRows[0]?.meta).toContain('等待负责人决策');
    expect(viewModel.approvalRows[0]).toMatchObject({
      title: '重启生产 checkout Pod 以处理饱和告警突增',
      copy: 'checkout-oncall · 已附加告警风暴和链路延迟回退证据。'
    });
    expect(viewModel.checklist[0]).toMatchObject({
      title: '入口壳层就绪',
      copy: '动作目录已经沿用共享工作台语言。',
      meta: '已完成'
    });
    expect(viewModel.checklist[1]).toMatchObject({
      title: '执行适配器',
      copy: '动作列表、执行结果和审批流保持当前集成边界。',
      meta: '下一步'
    });
    expect(viewModel.handoffRows[0]).toMatchObject({
      title: '实体上下文交接',
      copy: '扩大动作目标范围前，先打开实体目录核对。',
      meta: 'entities'
    });
    expect(viewModel.handoffRows[1]).toMatchObject({
      title: '监控姿态交接',
      copy: '下发恢复动作前先校验信号健康状态。',
      meta: 'monitors'
    });
    expect(viewModel.nextHops.map(item => item.label)).toEqual(['打开总览', '实体中心', '监控中心']);
    expect(viewModel.nextHops.map(item => item.href)).toEqual(['/overview', '/entities', '/monitors']);
  });

  it('keeps alert-context suggested actions in a human-confirmed posture', () => {
    const state = buildActionsPlaceholderState(t, {
      source: 'alert',
      signal: 'traces',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-1h',
      traceId: 'trace-123',
      spanId: 'span-456'
    });

    expect(state.suggestedActions).toHaveLength(3);
    expect(state.suggestedActions[0]).toMatchObject({
      id: 'suggest-restart-checkout',
      title: '建议重启 checkout-api',
      catalogLabel: '重启 checkout 部署',
      displayMeta: '高风险 · 重启 checkout 部署',
      source: 'alert-context-handoff',
      confirmation: 'manual-required'
    });
    expect(state.approvalDraft).toMatchObject({
      state: 'ready',
      endpoint: '/api/actions/approval-drafts',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    });
    expect(state.approvalDraft.request).toMatchObject({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      executionAllowed: false
    });
    expect(state.suggestedActions.every(action => action.posture.includes('人工确认'))).toBe(true);
    expect(state.suggestedActions[0]?.evidence).toContain('来源 告警中心');
    expect(state.suggestedActions[0]?.evidence).toContain('信号 链路');
    expect(state.suggestedActions[0]?.evidence).not.toContain('来源 alert');
    expect(state.suggestedActions[0]?.evidence).not.toContain('信号 traces');
  });

  it('keeps entity-id-only suggested action targets localized without changing handoff data', () => {
    const state = buildActionsPlaceholderState(t, {
      entityId: 'service:commerce/checkout',
      source: 'entity'
    });

    expect(state.suggestedActions[0]?.title).toBe('建议重启 实体 service:commerce/checkout');
    expect(state.suggestedActions[0]?.title).not.toBe('建议重启 service:commerce/checkout');

    const evidenceUrl = new URL(state.suggestedActions[0]?.evidenceHref || '/', 'http://localhost');
    expect(evidenceUrl.searchParams.get('entityId')).toBe('service:commerce/checkout');
  });
});
