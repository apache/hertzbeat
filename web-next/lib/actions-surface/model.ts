import { appendSignalRouteContext, stripReturnLabelFromHref, type SignalRouteContext } from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ActionRisk = 'low' | 'medium' | 'high';
export type ActionRunStatus = 'completed' | 'running' | 'awaiting-approval';
export type ApprovalStatus = 'pending' | 'approved';
export type ActionConfirmationMode = 'manual-required';
export type ActionSnapshotState = 'roadmap-demo';
export type ActionAdapterBoundaryState = 'adapter-pending';
export type ActionLiveHandoff = 'alert-context-suggestions';
export type ActionApprovalDraftState = 'awaiting-context' | 'ready';
export type ActionApprovalDraftExecutionMode = 'manual-approval-draft-only';
export type ActionApprovalDecisionValue = 'approved' | 'rejected';

export type ActionCatalogItem = {
  id: string;
  name: string;
  category: string;
  scope: string;
  owner: string;
  risk: ActionRisk;
  lastRun: string;
  posture: string;
  snapshotState: ActionSnapshotState;
};

export type ActionRunItem = {
  id: string;
  name: string;
  target: string;
  actor: string;
  status: ActionRunStatus;
  startedAt: string;
  duration: string;
  snapshotState: ActionSnapshotState;
};

export type ActionApprovalItem = {
  id: string;
  summary: string;
  owner: string;
  evidence: string;
  status: ApprovalStatus;
  snapshotState: ActionSnapshotState;
};

export type ActionSuggestionContext = SignalRouteContext & {
  search?: string;
  signal?: string;
  severity?: string;
  status?: string;
  alertGroupId?: string;
  viewMode?: string;
  sourceKind?: string;
  edgeId?: string;
};

export type SuggestedRemediationAction = {
  id: string;
  catalogId: string;
  catalogLabel: string;
  displayMeta: string;
  source: 'alert-context-handoff';
  title: string;
  copy: string;
  evidence: string;
  evidenceHref: string;
  risk: ActionRisk;
  confirmation: ActionConfirmationMode;
  posture: string;
};

export type ActionApprovalDraftRequest = {
  actionId: string;
  catalogId: string;
  risk: ActionRisk;
  confirmation: ActionConfirmationMode;
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
  context: ActionSuggestionContext;
  evidenceHref: string;
};

export type ActionApprovalDraft = {
  state: ActionApprovalDraftState;
  adapterOwner: 'next-actions-approval-draft-bff';
  endpoint: '/api/actions/approval-drafts';
  method: 'POST';
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
  title: string;
  copy: string;
  createLabel: string;
  pendingLabel: string;
  successLabel: string;
  failedLabel: string;
  disabledReason: string;
  request?: ActionApprovalDraftRequest;
  requestPreview: string;
};

export type ActionApprovalDecisionRequest = {
  decision: ActionApprovalDecisionValue;
  reviewer: string;
  reason: string;
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
};

export type ActionApprovalDecision = {
  state: 'awaiting-draft';
  adapterOwner: 'next-actions-approval-decision-bff';
  endpointTemplate: '/api/actions/approval-drafts/:draftId/decision';
  method: 'POST';
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
  title: string;
  copy: string;
  approveLabel: string;
  rejectLabel: string;
  pendingLabel: string;
  successLabel: string;
  failedLabel: string;
  disabledReason: string;
  requestPreview: string;
};

export type ActionApprovalDraftQueueItem = {
  draftId: string;
  state: string;
  actionId?: string;
  catalogId?: string;
  executionState?: string;
  adapterOwner?: string;
};

export type ActionApprovalDraftQueue = {
  state: 'loading';
  adapterOwner: 'next-actions-approval-draft-bff';
  endpoint: '/api/actions/approval-drafts?limit=8';
  method: 'GET';
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
  managerBacked: false;
  title: string;
  copy: string;
  loadingLabel: string;
  emptyLabel: string;
  drafts: [];
};

export type ActionCatalogReadAdapter = {
  state: 'loading';
  adapterOwner: 'next-actions-catalog-bff';
  endpoint: '/api/actions/catalog?limit=8';
  method: 'GET';
  executionMode: ActionApprovalDraftExecutionMode;
  executionAllowed: false;
  managerBacked: false;
  title: string;
  copy: string;
  loadingLabel: string;
  emptyLabel: string;
  items: [];
};

export type ActionAdapterBoundary = {
  state: ActionAdapterBoundaryState;
  label: string;
  copy: string;
  liveHandoff: ActionLiveHandoff;
  roadmapOnly: string[];
  roadmapOnlyLabels: string[];
};

export type AutomationActionCatalogReview = {
  milestone: 8;
  status: 'ready-for-platform-governance';
  implementedCapabilities: string[];
  liveHandoffs: ActionLiveHandoff[];
  confirmationModes: ActionConfirmationMode[];
  snapshotStates: ActionSnapshotState[];
  executionBoundary: ActionAdapterBoundaryState;
  futureRoadmapOnly: string[];
  nextMilestone: 'platform-governance-extension-future-domains';
};

export type ActionsDomainModel = {
  title: string;
  subtitle: string;
  focus: string;
  summary: string;
  tags: string[];
  metrics: Array<{ label: string; value: string }>;
  catalog: ActionCatalogItem[];
  runs: ActionRunItem[];
  approvals: ActionApprovalItem[];
  adapterBoundary: ActionAdapterBoundary;
  suggestedActions: SuggestedRemediationAction[];
  checklist: Array<{ title: string; copy: string; meta: string }>;
  nextHops: Array<{ label: string; href: string; variant: 'subtle' | 'default' | 'primary' }>;
};

const catalogReviewTranslator: Translator = key => key;

const actionAdapterBoundaryRoadmapIds = [
  'workflow-automation',
  'action-catalog',
  'app-builder',
  'self-service-actions',
  'approvals',
  'scripts',
  'runbook-orchestration'
];

function actionAdapterBoundaryRoadmapLabels(t: Translator) {
  return [
    t('actions.adapter-boundary.roadmap.workflow-automation'),
    t('actions.adapter-boundary.roadmap.action-catalog'),
    t('actions.adapter-boundary.roadmap.app-builder'),
    t('actions.adapter-boundary.roadmap.self-service-actions'),
    t('actions.adapter-boundary.roadmap.approvals'),
    t('actions.adapter-boundary.roadmap.scripts'),
    t('actions.adapter-boundary.roadmap.runbook-orchestration')
  ];
}

export function buildActionsAdapterBoundary(t: Translator = catalogReviewTranslator): ActionAdapterBoundary {
  return {
    state: 'adapter-pending',
    label: t('actions.adapter-boundary.label'),
    copy: t('actions.adapter-boundary.copy'),
    liveHandoff: 'alert-context-suggestions',
    roadmapOnly: actionAdapterBoundaryRoadmapIds,
    roadmapOnlyLabels: actionAdapterBoundaryRoadmapLabels(t)
  };
}

export function buildAutomationActionCatalogReview(): AutomationActionCatalogReview {
  const adapterBoundary = buildActionsAdapterBoundary(catalogReviewTranslator);

  return {
    milestone: 8,
    status: 'ready-for-platform-governance',
    implementedCapabilities: [
      'alert-evidence-automation-handoff',
      'contextual-suggested-actions',
      'manual-required-confirmation',
      'suggestion-evidence-links',
      'adapter-boundary-panel',
      'roadmap-demo-snapshot-guard',
      'no-auto-execute-endpoint'
    ],
    liveHandoffs: [adapterBoundary.liveHandoff],
    confirmationModes: ['manual-required'],
    snapshotStates: ['roadmap-demo'],
    executionBoundary: adapterBoundary.state,
    futureRoadmapOnly: adapterBoundary.roadmapOnly,
    nextMilestone: 'platform-governance-extension-future-domains'
  };
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function hasSuggestionContext(context: ActionSuggestionContext = {}) {
  return Boolean(
    normalizeText(context.source) ||
      normalizeText(context.entityId) ||
      normalizeText(context.entityName) ||
      normalizeText(context.serviceName) ||
      normalizeText(context.traceId) ||
      normalizeText(context.alertGroupId)
  );
}

function appendActionSuggestionParams(params: URLSearchParams, context: ActionSuggestionContext) {
  appendSignalRouteContext(params, {
    ...context,
    returnTo: stripReturnLabelFromHref(context.returnTo)
  });
  (['search', 'signal', 'severity', 'status', 'alertGroupId', 'viewMode', 'sourceKind', 'edgeId'] as const).forEach(key => {
    const value = normalizeText(context[key]);
    if (value) params.set(key, value);
  });
}

function withQuery(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildSuggestionEvidenceHref(context: ActionSuggestionContext) {
  const params = new URLSearchParams();
  params.set('status', normalizeText(context.status) || 'firing');
  appendActionSuggestionParams(params, context);
  return withQuery('/alert', params);
}

function actionTarget(context: ActionSuggestionContext, t: Translator) {
  const serviceName = normalizeText(context.serviceName);
  if (serviceName) return serviceName;
  const entityName = normalizeText(context.entityName);
  if (entityName) return entityName;
  const entityId = normalizeText(context.entityId);
  if (entityId) return t('actions.suggestion.target.entity-id', { entityId });
  return t('actions.suggestion.target.current-alert');
}

function suggestedActionSourceLabel(source: string | null | undefined, t: Translator) {
  const normalized = normalizeText(source);
  if (normalized === 'alert') return t('actions.suggestion.source.alert');
  if (normalized === 'entity') return t('actions.suggestion.source.entity');
  if (normalized === 'topology') return t('actions.suggestion.source.topology');
  if (normalized === 'monitor') return t('actions.suggestion.source.monitor');
  return t('actions.suggestion.source.unknown', { source: normalized ?? '' });
}

function suggestedActionSignalLabel(signal: string | null | undefined, t: Translator) {
  const normalized = normalizeText(signal);
  if (normalized === 'metrics') return t('actions.suggestion.signal.metrics');
  if (normalized === 'logs') return t('actions.suggestion.signal.logs');
  if (normalized === 'traces') return t('actions.suggestion.signal.traces');
  if (normalized === 'alerts') return t('actions.suggestion.signal.alerts');
  return t('actions.suggestion.signal.unknown', { signal: normalized ?? '' });
}

function suggestedActionRiskLabel(risk: ActionRisk, t: Translator) {
  if (risk === 'high') return t('actions.risk.high');
  if (risk === 'medium') return t('actions.risk.medium');
  return t('actions.risk.low');
}

function suggestedActionCatalogLabel(catalogId: string, t: Translator) {
  if (catalogId === 'restart-checkout') return t('actions.catalog.restart.name');
  if (catalogId === 'mute-edge-alerts') return t('actions.catalog.mute.name');
  return catalogId;
}

function suggestedActionDisplayMeta(risk: ActionRisk, catalogLabel: string, t: Translator) {
  return `${suggestedActionRiskLabel(risk, t)} · ${catalogLabel}`;
}

function suggestedActionMeta(catalogId: string, risk: ActionRisk, t: Translator) {
  const catalogLabel = suggestedActionCatalogLabel(catalogId, t);
  return {
    catalogLabel,
    displayMeta: suggestedActionDisplayMeta(risk, catalogLabel, t)
  };
}

export function buildSuggestedRemediationActions(context: ActionSuggestionContext = {}, t: Translator = catalogReviewTranslator): SuggestedRemediationAction[] {
  if (!hasSuggestionContext(context)) return [];

  const target = actionTarget(context, t);
  const evidenceHref = buildSuggestionEvidenceHref(context);
  const restartMeta = suggestedActionMeta('restart-checkout', 'high', t);
  const silenceMeta = suggestedActionMeta('mute-edge-alerts', 'medium', t);
  const runbookMeta = suggestedActionMeta('restart-checkout', 'low', t);
  const evidence = [
    normalizeText(context.source) ? t('actions.suggestion.evidence.source', { value: suggestedActionSourceLabel(context.source, t) }) : undefined,
    normalizeText(context.signal) ? t('actions.suggestion.evidence.signal', { value: suggestedActionSignalLabel(context.signal, t) }) : undefined,
    normalizeText(context.traceId) ? t('actions.suggestion.evidence.trace', { value: context.traceId }) : undefined,
    normalizeText(context.alertGroupId) ? t('actions.suggestion.evidence.alert-group', { value: context.alertGroupId }) : undefined
  ].filter(Boolean).join(' · ') || t('actions.suggestion.evidence.current-alert');

  return [
    {
      id: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      catalogLabel: restartMeta.catalogLabel,
      displayMeta: restartMeta.displayMeta,
      title: t('actions.suggestion.restart.title', { target }),
      copy: t('actions.suggestion.restart.copy'),
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'high',
      confirmation: 'manual-required',
      posture: t('actions.suggestion.manual-required')
    },
    {
      id: 'suggest-create-silence',
      catalogId: 'mute-edge-alerts',
      catalogLabel: silenceMeta.catalogLabel,
      displayMeta: silenceMeta.displayMeta,
      title: t('actions.suggestion.silence.title', { target }),
      copy: t('actions.suggestion.silence.copy'),
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'medium',
      confirmation: 'manual-required',
      posture: t('actions.suggestion.manual-required')
    },
    {
      id: 'suggest-review-runbook',
      catalogId: 'restart-checkout',
      catalogLabel: runbookMeta.catalogLabel,
      displayMeta: runbookMeta.displayMeta,
      title: t('actions.suggestion.runbook.title', { target }),
      copy: t('actions.suggestion.runbook.copy'),
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'low',
      confirmation: 'manual-required',
      posture: t('actions.suggestion.manual-required')
    }
  ];
}

function buildApprovalDraftRequest(
  context: ActionSuggestionContext,
  action: SuggestedRemediationAction
): ActionApprovalDraftRequest {
  return {
    actionId: action.id,
    catalogId: action.catalogId,
    risk: action.risk,
    confirmation: action.confirmation,
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    context: {
      ...context,
      returnTo: stripReturnLabelFromHref(context.returnTo)
    },
    evidenceHref: action.evidenceHref
  };
}

function previewApprovalDraftRequest(request: ActionApprovalDraftRequest | undefined) {
  if (!request) return '{}';
  return JSON.stringify({
    actionId: request.actionId,
    catalogId: request.catalogId,
    risk: request.risk,
    confirmation: request.confirmation,
    executionMode: request.executionMode,
    executionAllowed: request.executionAllowed,
    entityId: request.context.entityId,
    serviceName: request.context.serviceName,
    traceId: request.context.traceId
  });
}

export function buildActionApprovalDecision(t: Translator = catalogReviewTranslator): ActionApprovalDecision {
  return {
    state: 'awaiting-draft',
    adapterOwner: 'next-actions-approval-decision-bff',
    endpointTemplate: '/api/actions/approval-drafts/:draftId/decision',
    method: 'POST',
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    title: t('actions.approval-decision.title'),
    copy: t('actions.approval-decision.copy'),
    approveLabel: t('actions.approval-decision.approve'),
    rejectLabel: t('actions.approval-decision.reject'),
    pendingLabel: t('actions.approval-decision.pending'),
    successLabel: t('actions.approval-decision.success'),
    failedLabel: t('actions.approval-decision.failed'),
    disabledReason: t('actions.approval-decision.disabled'),
    requestPreview: JSON.stringify({
      decision: 'approved',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    })
  };
}

export function buildActionApprovalDraftQueue(t: Translator = catalogReviewTranslator): ActionApprovalDraftQueue {
  return {
    state: 'loading',
    adapterOwner: 'next-actions-approval-draft-bff',
    endpoint: '/api/actions/approval-drafts?limit=8',
    method: 'GET',
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    managerBacked: false,
    title: t('actions.approval-draft-queue.title'),
    copy: t('actions.approval-draft-queue.copy'),
    loadingLabel: t('actions.approval-draft-queue.loading'),
    emptyLabel: t('actions.approval-draft-queue.empty'),
    drafts: []
  };
}

export function buildActionApprovalDraft(
  context: ActionSuggestionContext = {},
  t: Translator = catalogReviewTranslator
): ActionApprovalDraft {
  const [firstSuggestion] = buildSuggestedRemediationActions(context, t);
  const request = firstSuggestion ? buildApprovalDraftRequest(context, firstSuggestion) : undefined;

  return {
    state: request ? 'ready' : 'awaiting-context',
    adapterOwner: 'next-actions-approval-draft-bff',
    endpoint: '/api/actions/approval-drafts',
    method: 'POST',
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    title: t('actions.approval-draft.title'),
    copy: t('actions.approval-draft.copy'),
    createLabel: t('actions.approval-draft.create'),
    pendingLabel: t('actions.approval-draft.pending'),
    successLabel: t('actions.approval-draft.success'),
    failedLabel: t('actions.approval-draft.failed'),
    disabledReason: t('actions.approval-draft.disabled'),
    request,
    requestPreview: previewApprovalDraftRequest(request)
  };
}

export function buildActionCatalogReadAdapter(t: Translator = catalogReviewTranslator): ActionCatalogReadAdapter {
  return {
    state: 'loading',
    adapterOwner: 'next-actions-catalog-bff',
    endpoint: '/api/actions/catalog?limit=8',
    method: 'GET',
    executionMode: 'manual-approval-draft-only',
    executionAllowed: false,
    managerBacked: false,
    title: t('actions.catalog-adapter.title'),
    copy: t('actions.catalog-adapter.copy'),
    loadingLabel: t('actions.catalog-adapter.loading'),
    emptyLabel: t('actions.catalog-adapter.empty'),
    items: []
  };
}

export function buildActionsDomainModel(t: Translator, context: ActionSuggestionContext = {}): ActionsDomainModel {
  const catalog: ActionCatalogItem[] = [
    {
      id: 'restart-checkout',
      name: t('actions.catalog.restart.name'),
      category: t('actions.catalog.restart.category'),
      scope: t('actions.catalog.restart.scope'),
      owner: t('actions.catalog.restart.owner'),
      risk: 'high',
      lastRun: t('actions.catalog.restart.last-run'),
      posture: t('actions.catalog.restart.posture'),
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'replay-metrics',
      name: t('actions.catalog.replay.name'),
      category: t('actions.catalog.replay.category'),
      scope: t('actions.catalog.replay.scope'),
      owner: t('actions.catalog.replay.owner'),
      risk: 'medium',
      lastRun: t('actions.catalog.replay.last-run'),
      posture: t('actions.catalog.replay.posture'),
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'mute-edge-alerts',
      name: t('actions.catalog.mute.name'),
      category: t('actions.catalog.mute.category'),
      scope: t('actions.catalog.mute.scope'),
      owner: t('actions.catalog.mute.owner'),
      risk: 'low',
      lastRun: t('actions.catalog.mute.last-run'),
      posture: t('actions.catalog.mute.posture'),
      snapshotState: 'roadmap-demo'
    }
  ];

  const runs: ActionRunItem[] = [
    {
      id: 'run-2144',
      name: t('actions.run.restart.name'),
      target: t('actions.run.restart.target'),
      actor: t('actions.run.restart.actor'),
      status: 'awaiting-approval',
      startedAt: '2026-04-16 09:14',
      duration: t('actions.run.restart.duration'),
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'run-2141',
      name: t('actions.run.replay.name'),
      target: t('actions.run.replay.target'),
      actor: t('actions.run.replay.actor'),
      status: 'running',
      startedAt: '2026-04-16 08:56',
      duration: t('actions.run.replay.duration'),
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'run-2138',
      name: t('actions.run.mute.name'),
      target: t('actions.run.mute.target'),
      actor: t('actions.run.mute.actor'),
      status: 'completed',
      startedAt: '2026-04-16 08:03',
      duration: t('actions.run.mute.duration'),
      snapshotState: 'roadmap-demo'
    }
  ];

  const approvals: ActionApprovalItem[] = [
    {
      id: 'apr-71',
      summary: t('actions.approval.restart.summary'),
      owner: t('actions.approval.restart.owner'),
      evidence: t('actions.approval.restart.evidence'),
      status: 'pending',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'apr-69',
      summary: t('actions.approval.replay.summary'),
      owner: t('actions.approval.replay.owner'),
      evidence: t('actions.approval.replay.evidence'),
      status: 'approved',
      snapshotState: 'roadmap-demo'
    }
  ];

  return {
    title: t('actions.entry.title'),
    subtitle: t('actions.subtitle'),
    focus: t('actions.focus'),
    summary: t('actions.summary'),
    tags: [
      t('actions.tag.catalog'),
      t('actions.tag.risk-aware'),
      t('actions.tag.approval-flow')
    ],
    metrics: [
      { label: t('actions.metric.catalog-entries'), value: String(catalog.length) },
      { label: t('actions.metric.pending-approvals'), value: String(approvals.filter(item => item.status === 'pending').length) },
      { label: t('actions.metric.recent-runs'), value: String(runs.length) },
      { label: t('actions.metric.high-risk-actions'), value: String(catalog.filter(item => item.risk === 'high').length) }
    ],
    catalog,
    runs,
    approvals,
    adapterBoundary: buildActionsAdapterBoundary(t),
    suggestedActions: buildSuggestedRemediationActions(context, t),
    checklist: [
      { title: t('actions.checklist.entry.title'), copy: t('actions.checklist.entry.copy'), meta: t('actions.checklist.entry.meta') },
      { title: t('actions.checklist.adapters.title'), copy: t('actions.checklist.adapters.copy'), meta: t('actions.checklist.adapters.meta') },
      { title: t('actions.checklist.context.title'), copy: t('actions.checklist.context.copy'), meta: t('actions.checklist.context.meta') }
    ],
    nextHops: [
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' },
      { label: t('menu.entity.center'), href: '/entities', variant: 'default' },
      { label: t('menu.monitor.center'), href: '/monitors', variant: 'primary' }
    ]
  };
}
