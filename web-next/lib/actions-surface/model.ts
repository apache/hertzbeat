import { appendSignalRouteContext, stripReturnLabelFromHref, type SignalRouteContext } from '../signal-route-context';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type ActionRisk = 'low' | 'medium' | 'high';
export type ActionRunStatus = 'completed' | 'running' | 'awaiting-approval';
export type ApprovalStatus = 'pending' | 'approved';
export type ActionConfirmationMode = 'manual-required';
export type ActionSnapshotState = 'roadmap-demo';
export type ActionAdapterBoundaryState = 'adapter-pending';
export type ActionLiveHandoff = 'alert-context-suggestions';

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
  source: 'alert-context-handoff';
  title: string;
  copy: string;
  evidence: string;
  evidenceHref: string;
  risk: ActionRisk;
  confirmation: ActionConfirmationMode;
  posture: string;
};

export type ActionAdapterBoundary = {
  state: ActionAdapterBoundaryState;
  label: string;
  copy: string;
  liveHandoff: ActionLiveHandoff;
  roadmapOnly: string[];
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

export function buildActionsAdapterBoundary(): ActionAdapterBoundary {
  return {
    state: 'adapter-pending',
    label: '执行边界',
    copy:
      '动作目录、执行历史和审批流当前是 roadmap 示例快照，还未接入执行适配器，不代表实时运行状态；告警上下文建议是当前证据生成的人工交接，不会自动执行。',
    liveHandoff: 'alert-context-suggestions',
    roadmapOnly: [
      'workflow-automation',
      'action-catalog',
      'app-builder',
      'self-service-actions',
      'approvals',
      'scripts',
      'runbook-orchestration'
    ]
  };
}

export function buildAutomationActionCatalogReview(): AutomationActionCatalogReview {
  const adapterBoundary = buildActionsAdapterBoundary();

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

function actionTarget(context: ActionSuggestionContext) {
  return normalizeText(context.serviceName) || normalizeText(context.entityName) || normalizeText(context.entityId) || '当前告警';
}

export function buildSuggestedRemediationActions(context: ActionSuggestionContext = {}): SuggestedRemediationAction[] {
  if (!hasSuggestionContext(context)) return [];

  const target = actionTarget(context);
  const evidenceHref = buildSuggestionEvidenceHref(context);
  const evidence = [
    normalizeText(context.source) ? `来源 ${context.source}` : undefined,
    normalizeText(context.signal) ? `信号 ${context.signal}` : undefined,
    normalizeText(context.traceId) ? `trace ${context.traceId}` : undefined,
    normalizeText(context.alertGroupId) ? `告警组 ${context.alertGroupId}` : undefined
  ].filter(Boolean).join(' · ') || '当前告警证据';

  return [
    {
      id: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      title: `建议重启 ${target}`,
      copy: '仅作为高风险恢复建议，执行前需要确认影响范围、回滚窗口和负责人。',
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'high',
      confirmation: 'manual-required',
      posture: '只生成建议，人工确认后才能进入执行。'
    },
    {
      id: 'suggest-create-silence',
      catalogId: 'mute-edge-alerts',
      title: `建议为 ${target} 创建临时静默`,
      copy: '用于短时降噪，先确认告警已接手并设置自动过期。',
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'medium',
      confirmation: 'manual-required',
      posture: '只生成建议，人工确认后才能进入执行。'
    },
    {
      id: 'suggest-review-runbook',
      catalogId: 'restart-checkout',
      title: `建议查看 ${target} 处置手册`,
      copy: '先对齐实体、告警、链路和采集器证据，再决定是否执行动作。',
      evidence,
      evidenceHref,
      source: 'alert-context-handoff',
      risk: 'low',
      confirmation: 'manual-required',
      posture: '只生成建议，人工确认后才能进入执行。'
    }
  ];
}

export function buildActionsDomainModel(t: Translator, context: ActionSuggestionContext = {}): ActionsDomainModel {
  const catalog: ActionCatalogItem[] = [
    {
      id: 'restart-checkout',
      name: 'Restart checkout deployment',
      category: 'runtime recovery',
      scope: 'service checkout / prod-ap',
      owner: 'Platform operations',
      risk: 'high',
      lastRun: '12m ago',
      posture: 'Requires approval and rollback note',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'replay-metrics',
      name: 'Replay delayed OTLP metrics',
      category: 'signal remediation',
      scope: 'otlp gateway / metrics',
      owner: 'Observability',
      risk: 'medium',
      lastRun: '38m ago',
      posture: 'Safe within current replay window',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'mute-edge-alerts',
      name: 'Mute edge saturation alerts',
      category: 'alert hygiene',
      scope: 'entity edge-proxy',
      owner: 'SRE on-call',
      risk: 'low',
      lastRun: '2h ago',
      posture: 'Auto-expires after 30 minutes',
      snapshotState: 'roadmap-demo'
    }
  ];

  const runs: ActionRunItem[] = [
    {
      id: 'run-2144',
      name: 'Restart checkout deployment',
      target: 'checkout / prod-ap',
      actor: 'li.na',
      status: 'awaiting-approval',
      startedAt: '2026-04-16 09:14',
      duration: 'pending approval',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'run-2141',
      name: 'Replay delayed OTLP metrics',
      target: 'gateway metrics shard-3',
      actor: 'automation',
      status: 'running',
      startedAt: '2026-04-16 08:56',
      duration: '06m 12s',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'run-2138',
      name: 'Mute edge saturation alerts',
      target: 'edge-proxy / cn-hz',
      actor: 'lin.qi',
      status: 'completed',
      startedAt: '2026-04-16 08:03',
      duration: '01m 42s',
      snapshotState: 'roadmap-demo'
    }
  ];

  const approvals: ActionApprovalItem[] = [
    {
      id: 'apr-71',
      summary: 'Restart production checkout pods after saturation alert burst',
      owner: 'checkout-oncall',
      evidence: 'Alert storm and trace latency regression are attached.',
      status: 'pending',
      snapshotState: 'roadmap-demo'
    },
    {
      id: 'apr-69',
      summary: 'Replay OTLP metrics for delayed collector queue',
      owner: 'obs-admin',
      evidence: 'Collector backlog has stabilized and replay window is open.',
      status: 'approved',
      snapshotState: 'roadmap-demo'
    }
  ];

  return {
    title: 'Actions',
    subtitle: t('actions.subtitle'),
    focus: t('actions.focus'),
    summary: t('actions.summary'),
    tags: ['automation catalog', 'risk-aware actions', 'approval flow'],
    metrics: [
      { label: 'Catalog entries', value: String(catalog.length) },
      { label: 'Pending approvals', value: String(approvals.filter(item => item.status === 'pending').length) },
      { label: 'Recent runs', value: String(runs.length) },
      { label: 'High-risk actions', value: String(catalog.filter(item => item.risk === 'high').length) }
    ],
    catalog,
    runs,
    approvals,
    adapterBoundary: buildActionsAdapterBoundary(),
    suggestedActions: buildSuggestedRemediationActions(context),
    checklist: [
      { title: t('actions.checklist.entry.title'), copy: t('actions.checklist.entry.copy'), meta: 'done' },
      { title: t('actions.checklist.adapters.title'), copy: t('actions.checklist.adapters.copy'), meta: 'next' },
      { title: t('actions.checklist.context.title'), copy: t('actions.checklist.context.copy'), meta: 'reserved' }
    ],
    nextHops: [
      { label: t('menu.dashboard.back'), href: '/overview', variant: 'subtle' },
      { label: t('menu.entity.center'), href: '/entities', variant: 'default' },
      { label: t('menu.monitor.center'), href: '/monitors', variant: 'primary' }
    ]
  };
}
