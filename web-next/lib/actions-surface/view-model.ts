import { buildOpsFacts } from '../ops-surface/view-model';
import {
  buildActionsAdapterBoundary,
  buildActionsDomainModel,
  buildSuggestedRemediationActions,
  type ActionAdapterBoundary,
  type ActionRisk,
  type ActionRunStatus,
  type ActionSuggestionContext,
  type ApprovalStatus,
  type SuggestedRemediationAction
} from './model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ActionsPlaceholderState = {
  kicker: string;
  title: string;
  subtitle: string;
  actions: Array<{ label: string; href: string; variant: 'primary' | 'subtle' }>;
  shell: {
    eyebrow: string;
    copy: string;
    chips: string[];
  };
  adapterBoundary: ActionAdapterBoundary;
  checklistTitle: string;
  checklist: Array<{ title: string; copy: string; tone: string }>;
  suggestedActions: SuggestedRemediationAction[];
  empty: {
    title: string;
    copy: string;
  };
};

export function buildActionsPlaceholderState(context: ActionSuggestionContext = {}): ActionsPlaceholderState {
  return {
    kicker: '自动化入口',
    title: '自动化处置',
    subtitle: '按 OTLP 工作台的冷色基线统一入口、上下文和审批语义。',
    actions: [
      { label: '打开概览', href: '/overview', variant: 'primary' },
      { label: '查看对象', href: '/entities', variant: 'subtle' }
    ],
    shell: {
      eyebrow: '冷色入口已接入',
      copy:
        '此入口继承 OTLP 接入页的近黑画布、小按钮、硬边面板和静态右栏节奏，后续只需要接入执行适配器。',
      chips: ['自动化目录', '风险动作', '审批流']
    },
    adapterBoundary: buildActionsAdapterBoundary(),
    checklistTitle: '接入清单',
    checklist: [
      {
        title: '统一入口上下文',
        copy: '已和 OTLP 基线共用同一套页面节奏。',
        tone: 'bg-[#75ad86]'
      },
      {
        title: '接入执行适配器',
        copy: '等动作目录和审批流数据落地后直接挂载。',
        tone: 'bg-[#c2a86b]'
      },
      {
        title: '保留证据跳转',
        copy: '实体、告警和链路入口保持在同一操作上下文。',
        tone: 'bg-[#9aa9cf]'
      }
    ],
    suggestedActions: buildSuggestedRemediationActions(context),
    empty: {
      title: '等待接入执行适配器',
      copy: '视觉骨架已经统一到 OTLP 基线，后续数据接入可以增量完成。'
    }
  };
}

function formatRiskTone(risk: ActionRisk) {
  if (risk === 'high') return 'high risk';
  if (risk === 'medium') return 'medium risk';
  return 'low risk';
}

function formatRunTone(status: ActionRunStatus) {
  if (status === 'awaiting-approval') return 'awaiting approval';
  if (status === 'running') return 'running now';
  return 'completed';
}

function formatApprovalTone(status: ApprovalStatus) {
  return status === 'pending' ? 'pending owner decision' : 'approved';
}

export function buildActionsSurfaceViewModel(t: Translator) {
  const model = buildActionsDomainModel(t);

  return {
    ...model,
    kicker: 'Action control plane',
    facts: buildOpsFacts(model.title, model.focus, model.tags, t),
    catalogCards: model.catalog.map(item => ({
      id: item.id,
      eyebrow: item.category,
      title: item.name,
      copy: `${item.scope} · ${item.owner}`,
      meta: `${formatRiskTone(item.risk)} · ${item.lastRun} · 示例快照`,
      posture: item.posture,
      badges: [item.risk, item.lastRun],
      snapshotState: item.snapshotState
    })),
    runRows: model.runs.map(item => ({
      title: item.name,
      copy: `${item.target} · ${item.actor} · ${item.duration}`,
      meta: `${formatRunTone(item.status)} · ${item.startedAt} · 示例快照`,
      snapshotState: item.snapshotState
    })),
    approvalRows: model.approvals.map(item => ({
      title: item.summary,
      copy: `${item.owner} · ${item.evidence}`,
      meta: `${formatApprovalTone(item.status)} · ${item.id} · 示例快照`,
      snapshotState: item.snapshotState
    })),
    handoffRows: [
      { title: 'Entity context handoff', copy: 'Open entity inventory before expanding action target scope.', meta: 'entities' },
      { title: 'Monitor posture handoff', copy: 'Validate signal health before issuing recovery actions.', meta: 'monitors' },
      { title: 'Approval evidence handoff', copy: 'Keep alerts, traces, and rollback notes together in the same operator flow.', meta: 'approval' }
    ]
  };
}
