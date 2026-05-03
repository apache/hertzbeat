import { describe, expect, it } from 'vitest';
import { buildActionsPlaceholderState, buildActionsSurfaceViewModel } from './view-model';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'actions.subtitle': 'Automation catalog, execution history, and approval-aware operations all stay in one context.',
    'actions.focus': 'Automation inventory and execution guardrails',
    'actions.summary': 'The actions entry page carries automation catalog, execution history, and approval semantics without requiring a page redesign for future data.',
    'actions.checklist.entry.title': 'Entry shell ready',
    'actions.checklist.entry.copy': 'The action catalog already uses the shared workbench language.',
    'actions.checklist.adapters.title': 'Execution adapters',
    'actions.checklist.adapters.copy': 'Action list, run result, and approval flow keep the current integration boundary.',
    'actions.checklist.context.title': 'Context continuity',
    'actions.checklist.context.copy': 'Jump to the actions page directly from entity, alert, or topology context.',
    'common.workspace': 'Workspace',
    'common.focus': 'Focus',
    'common.mode': 'Mode',
    'common.signals': 'Signals',
    'ops.surface.mode.entry': 'entry surface',
    'menu.dashboard.back': 'Open overview',
    'menu.entity.center': 'Entity center',
    'menu.monitor.center': 'Monitor center'
  };
  return messages[key] ?? key;
};

describe('actions surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildActionsPlaceholderState();

    expect(state).toMatchObject({
      kicker: '自动化入口',
      title: '自动化处置',
      subtitle: '按 OTLP 工作台的冷色基线统一入口、上下文和审批语义。',
      adapterBoundary: {
        state: 'adapter-pending',
        label: '执行边界'
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

    expect(viewModel.kicker).toBe('Action control plane');
    expect(viewModel.catalogCards).toHaveLength(3);
    expect(viewModel.catalogCards[0]).toMatchObject({
      title: 'Restart checkout deployment',
      eyebrow: 'runtime recovery'
    });
    expect(viewModel.runRows[0]?.meta).toContain('awaiting approval');
    expect(viewModel.approvalRows[0]?.meta).toContain('pending owner decision');
    expect(viewModel.handoffRows).toHaveLength(3);
  });

  it('keeps alert-context suggested actions in a human-confirmed posture', () => {
    const state = buildActionsPlaceholderState({
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
      source: 'alert-context-handoff',
      confirmation: 'manual-required'
    });
    expect(state.suggestedActions.every(action => action.posture.includes('人工确认'))).toBe(true);
  });
});
