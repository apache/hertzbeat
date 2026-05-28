import { buildOpsFacts } from '../ops-surface/view-model';
import {
  buildActionsAdapterBoundary,
  buildActionApprovalDecision,
  buildActionApprovalDraftQueue,
  buildActionCatalogReadAdapter,
  buildActionsDomainModel,
  buildActionApprovalDraft,
  buildSuggestedRemediationActions,
  type ActionApprovalDraft,
  type ActionApprovalDecision,
  type ActionApprovalDraftQueue,
  type ActionCatalogReadAdapter,
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
  approvalDraft: ActionApprovalDraft;
  approvalDecision: ActionApprovalDecision;
  approvalDraftQueue: ActionApprovalDraftQueue;
  catalogAdapter: ActionCatalogReadAdapter;
  checklistTitle: string;
  checklist: Array<{ title: string; copy: string; tone: string }>;
  suggestedActions: SuggestedRemediationAction[];
  empty: {
    title: string;
    copy: string;
  };
};

export function buildActionsPlaceholderState(t: Translator, context: ActionSuggestionContext = {}): ActionsPlaceholderState {
  return {
    kicker: t('actions.entry.kicker'),
    title: t('actions.entry.title'),
    subtitle: t('actions.entry.subtitle'),
    actions: [
      { label: t('actions.entry.action.overview'), href: '/overview', variant: 'primary' },
      { label: t('actions.entry.action.entities'), href: '/entities', variant: 'subtle' }
    ],
    shell: {
      eyebrow: t('actions.entry.shell.eyebrow'),
      copy: t('actions.entry.shell.copy'),
      chips: [
        t('actions.entry.chip.catalog'),
        t('actions.entry.chip.risk'),
        t('actions.entry.chip.approval')
      ]
    },
    adapterBoundary: buildActionsAdapterBoundary(t),
    catalogAdapter: buildActionCatalogReadAdapter(t),
    approvalDraft: buildActionApprovalDraft(context, t),
    approvalDecision: buildActionApprovalDecision(t),
    approvalDraftQueue: buildActionApprovalDraftQueue(t),
    checklistTitle: t('actions.entry.checklist.title'),
    checklist: [
      {
        title: t('actions.entry.checklist.context.title'),
        copy: t('actions.entry.checklist.context.copy'),
        tone: 'bg-[#75ad86]'
      },
      {
        title: t('actions.entry.checklist.adapter.title'),
        copy: t('actions.entry.checklist.adapter.copy'),
        tone: 'bg-[#c2a86b]'
      },
      {
        title: t('actions.entry.checklist.evidence.title'),
        copy: t('actions.entry.checklist.evidence.copy'),
        tone: 'bg-[#9aa9cf]'
      }
    ],
    suggestedActions: buildSuggestedRemediationActions(context, t),
    empty: {
      title: t('actions.entry.empty.title'),
      copy: t('actions.entry.empty.copy')
    }
  };
}

function formatRiskTone(risk: ActionRisk, t: Translator) {
  if (risk === 'high') return t('actions.risk.high');
  if (risk === 'medium') return t('actions.risk.medium');
  return t('actions.risk.low');
}

function formatRunTone(status: ActionRunStatus, t: Translator) {
  if (status === 'awaiting-approval') return t('actions.run-status.awaiting-approval');
  if (status === 'running') return t('actions.run-status.running');
  return t('actions.run-status.completed');
}

function formatApprovalTone(status: ApprovalStatus, t: Translator) {
  return status === 'pending' ? t('actions.approval-status.pending') : t('actions.approval-status.approved');
}

export function buildActionsSurfaceViewModel(t: Translator) {
  const model = buildActionsDomainModel(t);

  return {
    ...model,
    kicker: t('actions.surface.kicker'),
    facts: buildOpsFacts(model.title, model.focus, model.tags, t),
    catalogCards: model.catalog.map(item => ({
      id: item.id,
      eyebrow: item.category,
      title: item.name,
      copy: `${item.scope} · ${item.owner}`,
      meta: `${formatRiskTone(item.risk, t)} · ${item.lastRun} · ${t('actions.snapshot.label')}`,
      posture: item.posture,
      badges: [item.risk, item.lastRun],
      snapshotState: item.snapshotState
    })),
    runRows: model.runs.map(item => ({
      title: item.name,
      copy: `${item.target} · ${item.actor} · ${item.duration}`,
      meta: `${formatRunTone(item.status, t)} · ${item.startedAt} · ${t('actions.snapshot.label')}`,
      snapshotState: item.snapshotState
    })),
    approvalRows: model.approvals.map(item => ({
      title: item.summary,
      copy: `${item.owner} · ${item.evidence}`,
      meta: `${formatApprovalTone(item.status, t)} · ${item.id} · ${t('actions.snapshot.label')}`,
      snapshotState: item.snapshotState
    })),
    handoffRows: [
      { title: t('actions.surface.handoff.entity.title'), copy: t('actions.surface.handoff.entity.copy'), meta: 'entities' },
      { title: t('actions.surface.handoff.monitor.title'), copy: t('actions.surface.handoff.monitor.copy'), meta: 'monitors' },
      { title: t('actions.surface.handoff.approval.title'), copy: t('actions.surface.handoff.approval.copy'), meta: 'approval' }
    ]
  };
}
