import type { AlertSummary, AppCount, SingleAlert } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type OverviewMetrics = {
  totalEntities: number;
  healthyEntities: number;
  degradedEntities: number;
  healthRatio: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
};

type InvestigationLane = {
  href: string;
  title: string;
  eyebrow: string;
  copy: string;
  stat: string;
  action: string;
};

type OverviewSummaryCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  delta: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
};

type OverviewProblemFocus = {
  title: string;
  severity: string;
  severityLabel: string;
  entity: string;
  owner: string;
  summary: string;
};

type OverviewTrendCard = {
  label: string;
  value: string;
  insight: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
};

type OverviewImpactedEntity = {
  name: string;
  type: string;
  severity: string;
  severityLabel: string;
  owner: string;
  status: string;
  statusLabel: string;
  lastIssue: string;
};

type OverviewActivityItem = {
  title: string;
  detail: string;
  timestamp: string;
  tone: 'default' | 'success' | 'warning' | 'danger';
  tag: string;
};

type OverviewCoverageItem = {
  label: string;
  total: string;
  healthy: string;
  abnormal: string;
};

type OverviewWorkspaceFact = {
  label: string;
  value: string;
};

type OverviewWorkspaceStatusItem = {
  key: 'workspace' | 'ingestion' | 'entities' | 'alerts';
  label: string;
  value: string;
  ready: boolean;
};

type OverviewChecklistItem = {
  key: string;
  label: string;
  ready: boolean;
};

type OverviewQuickEntryItem = {
  label: string;
  copy: string;
  route: string;
};

type OverviewGuidanceReason = {
  label: string;
  value: string;
};

type OverviewGuidanceLink = {
  label: string;
  description: string;
  route: string;
};

export type OverviewConsoleViewModel = {
  showSetupGuide: boolean;
  summaryCards: OverviewSummaryCard[];
  problemFocus: OverviewProblemFocus;
  trendCards: OverviewTrendCard[];
  impactedEntities: OverviewImpactedEntity[];
  activityItems: OverviewActivityItem[];
  coverageItems: OverviewCoverageItem[];
  workspaceReadyFacts: OverviewWorkspaceFact[];
  workspaceStatusItems: OverviewWorkspaceStatusItem[];
  checklistItems: OverviewChecklistItem[];
  quickEntryItems: OverviewQuickEntryItem[];
  guidanceHeadline: string;
  guidanceDescription: string;
  guidanceReasons: OverviewGuidanceReason[];
  guidanceNextLinks: OverviewGuidanceLink[];
};

export function buildOverviewMetrics(apps: AppCount[], alertSummary: AlertSummary, t: Translator): OverviewMetrics {
  const totalEntities = apps.reduce((sum, item) => sum + (item.size || 0), 0);
  const healthyEntities = apps.reduce((sum, item) => sum + (item.availableSize || 0), 0);
  const degradedEntities = apps.reduce((sum, item) => sum + (item.unAvailableSize || 0) + (item.unManageSize || 0), 0);
  const healthRatio = totalEntities > 0 ? Math.round((healthyEntities / totalEntities) * 100) : 0;

  return {
    totalEntities,
    healthyEntities,
    degradedEntities,
    healthRatio,
    activeAlerts: alertSummary.total || 0,
    criticalAlerts: alertSummary.priorityCriticalNum || 0,
    warningAlerts: alertSummary.priorityWarningNum || 0
  };
}

export function buildInvestigationLanes(
  params: {
    totalEntities: number;
    appCount: number;
    topAlertHasTraceId: boolean;
  },
  t: Translator
): InvestigationLane[] {
  return [
    {
      href: '/entities',
      title: t('overview.lane.entities.title'),
      eyebrow: t('overview.lane.entities.eyebrow'),
      copy: t('overview.lane.entities.copy'),
      stat: t('overview.lane.entities.stat', { count: params.totalEntities }),
      action: t('overview.lane.entities.action')
    },
    {
      href: '/log/manage',
      title: t('overview.lane.logs.title'),
      eyebrow: t('overview.lane.logs.eyebrow'),
      copy: t('overview.lane.logs.copy'),
      stat: params.topAlertHasTraceId
        ? t('overview.lane.logs.stat.recommended')
        : t('overview.lane.logs.stat.available'),
      action: t('overview.lane.logs.action')
    },
    {
      href: '/trace/manage',
      title: t('overview.lane.trace.title'),
      eyebrow: t('overview.lane.trace.eyebrow'),
      copy: t('overview.lane.trace.copy'),
      stat: params.topAlertHasTraceId
        ? t('overview.lane.trace.stat.detected')
        : t('overview.lane.trace.stat.distributed'),
      action: t('overview.lane.trace.action')
    },
    {
      href: '/ingestion/otlp/metrics',
      title: t('overview.lane.otlp.title'),
      eyebrow: t('overview.lane.otlp.eyebrow'),
      copy: t('overview.lane.otlp.copy'),
      stat: t('overview.lane.otlp.stat', { count: params.appCount }),
      action: t('overview.lane.otlp.action')
    }
  ];
}

export function buildOverviewConsoleViewModel(
  appCounts: AppCount[],
  alerts: SingleAlert[],
  t: Translator
): OverviewConsoleViewModel {
  const showSetupGuide = appCounts.length === 0 && alerts.length === 0;
  const workspaceReadyFacts = buildWorkspaceReadyFacts(appCounts, alerts, t);
  const quickEntryItems = buildQuickEntryItems(t);

  return {
    showSetupGuide,
    summaryCards: buildSummaryCards(appCounts, alerts, t),
    problemFocus: buildProblemFocus(alerts, t),
    trendCards: buildTrendCards(appCounts, alerts, t),
    impactedEntities: buildImpactedEntities(appCounts, alerts, t),
    activityItems: buildActivityItems(alerts, t),
    coverageItems: buildCoverageItems(appCounts, t),
    workspaceReadyFacts,
    workspaceStatusItems: buildWorkspaceStatusItems(appCounts, alerts, t),
    checklistItems: buildChecklistItems(appCounts, alerts, t),
    quickEntryItems,
    guidanceHeadline: showSetupGuide ? t('dashboard.guidance.setup.headline') : t('dashboard.guidance.ready.headline'),
    guidanceDescription: showSetupGuide ? t('dashboard.guidance.setup.description') : t('dashboard.guidance.ready.description'),
    guidanceReasons: showSetupGuide
      ? [
          { label: t('dashboard.setup.status.logs'), value: t('dashboard.setup.status.pending') },
          { label: t('dashboard.setup.status.traces'), value: t('dashboard.setup.status.pending') },
          { label: t('dashboard.setup.status.metrics'), value: t('dashboard.setup.status.pending') }
        ]
      : workspaceReadyFacts.slice(0, 3).map(fact => ({ label: fact.label, value: fact.value })),
    guidanceNextLinks: showSetupGuide
      ? []
      : quickEntryItems.slice(0, 3).map(item => ({
          label: item.label,
          description: item.copy,
          route: item.route
        }))
  };
}

function buildWorkspaceReadyFacts(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewWorkspaceFact[] {
  const totalEntities = appCounts.reduce((sum, item) => sum + (item.size || 0), 0);
  const unassignedIssues = alerts.filter(alert => !hasAlertOwner(alert)).length;

  return [
    { label: t('dashboard.workbench.fact.entities'), value: String(totalEntities) },
    { label: t('dashboard.workbench.fact.alerts'), value: String(alerts.length) },
    { label: t('dashboard.workbench.fact.unassigned'), value: String(unassignedIssues) }
  ];
}

function buildSummaryCards(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewSummaryCard[] {
  const totalEntities = appCounts.reduce((sum, item) => sum + (item.size || 0), 0);
  const healthyEntities = appCounts.reduce((sum, item) => sum + (item.availableSize || 0), 0);
  const degradedEntities = appCounts.reduce((sum, item) => sum + (item.unAvailableSize || 0) + (item.unManageSize || 0), 0);
  const criticalAlerts = alerts.filter(alert => getAlertSeverity(alert) === 'critical').length;
  const unassignedIssues = alerts.filter(alert => !hasAlertOwner(alert)).length;

  return [
    {
      key: 'critical',
      label: t('dashboard.summary.critical.label'),
      value: String(criticalAlerts),
      hint: t('dashboard.summary.critical.hint'),
      delta: criticalAlerts > 0 ? t('dashboard.summary.critical.delta.active') : t('dashboard.summary.critical.delta.idle'),
      tone: criticalAlerts > 0 ? 'danger' : 'default'
    },
    {
      key: 'unassigned',
      label: t('dashboard.summary.unassigned.label'),
      value: String(unassignedIssues),
      hint: t('dashboard.summary.unassigned.hint'),
      delta: unassignedIssues > 0 ? t('dashboard.summary.unassigned.delta.active') : t('dashboard.summary.unassigned.delta.idle'),
      tone: unassignedIssues > 0 ? 'warning' : 'success'
    },
    {
      key: 'degraded',
      label: t('dashboard.summary.degraded.label'),
      value: String(degradedEntities),
      hint: t('dashboard.summary.degraded.hint'),
      delta: degradedEntities > 0
        ? t('dashboard.summary.degraded.delta.active', { count: degradedEntities })
        : t('dashboard.summary.degraded.delta.idle'),
      tone: degradedEntities > 0 ? 'warning' : healthyEntities > 0 || totalEntities > 0 ? 'success' : 'default'
    }
  ];
}

function buildWorkspaceStatusItems(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewWorkspaceStatusItem[] {
  const totalEntities = appCounts.reduce((sum, item) => sum + (item.size || 0), 0);
  const hasSignals = totalEntities > 0 || alerts.length > 0;

  return [
    {
      key: 'workspace',
      label: t('dashboard.home.status.workspace'),
      value: t('dashboard.home.status.ready'),
      ready: true
    },
    {
      key: 'ingestion',
      label: t('dashboard.home.status.ingestion'),
      value: hasSignals ? t('dashboard.home.status.ready') : t('dashboard.home.status.pending'),
      ready: hasSignals
    },
    {
      key: 'entities',
      label: t('dashboard.home.status.entities'),
      value: totalEntities > 0 ? t('dashboard.home.status.ready') : t('dashboard.home.status.pending'),
      ready: totalEntities > 0
    },
    {
      key: 'alerts',
      label: t('dashboard.home.status.alerts'),
      value: alerts.length > 0 ? t('dashboard.home.status.ready') : t('dashboard.home.status.pending'),
      ready: alerts.length > 0
    }
  ];
}

function buildChecklistItems(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewChecklistItem[] {
  const totalEntities = appCounts.reduce((sum, item) => sum + (item.size || 0), 0);
  const hasSignals = totalEntities > 0 || alerts.length > 0;

  return [
    { key: 'data-source', label: t('dashboard.setup.checklist.data-source'), ready: hasSignals },
    { key: 'entities', label: t('dashboard.setup.checklist.entities'), ready: totalEntities > 0 },
    { key: 'logs', label: t('dashboard.setup.checklist.logs'), ready: hasSignals },
    { key: 'traces', label: t('dashboard.setup.checklist.traces'), ready: hasSignals },
    { key: 'metrics', label: t('dashboard.setup.checklist.metrics'), ready: hasSignals },
    { key: 'alerts', label: t('dashboard.setup.checklist.alerts'), ready: alerts.length > 0 },
    { key: 'dashboards', label: t('dashboard.setup.checklist.dashboards'), ready: false }
  ];
}

function buildProblemFocus(alerts: SingleAlert[], t: Translator): OverviewProblemFocus {
  const focus = alerts[0];
  if (!focus) {
    return {
      title: t('dashboard.problem-focus.empty.title'),
      severity: 'healthy',
      severityLabel: resolveSeverityLabel('healthy', t),
      entity: t('dashboard.problem-focus.empty.entity'),
      owner: t('dashboard.problem-focus.empty.owner'),
      summary: t('dashboard.problem-focus.empty.summary')
    };
  }

  const severity = getAlertSeverity(focus);
  return {
    title: focus.content || focus.annotations?.summary || t('dashboard.problem-focus.default-title'),
    severity,
    severityLabel: resolveSeverityLabel(severity, t),
    entity: focus.labels?.service || focus.labels?.job || focus.labels?.instance || t('dashboard.problem-focus.default-entity'),
    owner: getAlertOwnerLabel(focus, t),
    summary: focus.annotations?.summary || focus.content || t('dashboard.problem-focus.default-summary')
  };
}

function buildTrendCards(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewTrendCard[] {
  const totalEntities = appCounts.reduce((sum, item) => sum + (item.size || 0), 0);
  const healthyEntities = appCounts.reduce((sum, item) => sum + (item.availableSize || 0), 0);
  const alertPressure = alerts.length;
  const errorPressure = alerts.filter(alert => getAlertSeverity(alert) !== 'warning').length;

  return [
    {
      label: t('dashboard.trend.alert.label'),
      value: String(alertPressure),
      insight: t('dashboard.trend.alert.insight'),
      tone: alertPressure > 3 ? 'danger' : 'warning'
    },
    {
      label: t('dashboard.trend.availability.label'),
      value: `${totalEntities === 0 ? 100 : Math.round((healthyEntities / totalEntities) * 100)}%`,
      insight: t('dashboard.trend.availability.insight'),
      tone: 'success'
    },
    {
      label: t('dashboard.trend.error.label'),
      value: String(Math.max(1, errorPressure)),
      insight: t('dashboard.trend.error.insight'),
      tone: errorPressure > 0 ? 'danger' : 'default'
    }
  ];
}

function buildImpactedEntities(appCounts: AppCount[], alerts: SingleAlert[], t: Translator): OverviewImpactedEntity[] {
  const alertByCategory = alerts.reduce<Record<string, SingleAlert | undefined>>((accumulator, alert) => {
    const key = `${alert.labels?.service || alert.labels?.job || alert.labels?.instance || ''}`.toLowerCase();
    if (key !== '' && !accumulator[key]) {
      accumulator[key] = alert;
    }
    return accumulator;
  }, {});

  return appCounts
    .slice()
    .sort((left, right) => (right.size || 0) - (left.size || 0))
    .slice(0, 5)
    .map(item => {
      const key = `${item.app || item.category}`.toLowerCase();
      const linkedAlert = alertByCategory[key];
      const degraded = (item.unAvailableSize || 0) + (item.unManageSize || 0);
      const severity = linkedAlert ? getAlertSeverity(linkedAlert) : degraded > 0 ? 'warning' : 'healthy';

      return {
        name: item.app || item.category,
        type: item.category || 'service',
        severity,
        severityLabel: resolveSeverityLabel(severity, t),
        owner: getAlertOwnerLabel(linkedAlert, t),
        status: degraded > 0 ? 'impacted' : 'healthy',
        statusLabel: degraded > 0
          ? t('dashboard.affected.status.impacted', { count: degraded })
          : t('dashboard.affected.status.healthy'),
        lastIssue: linkedAlert?.content || t('dashboard.affected.last-issue.healthy', { healthy: item.availableSize || 0, total: item.size || 0 })
      };
    });
}

function buildActivityItems(alerts: SingleAlert[], t: Translator): OverviewActivityItem[] {
  return alerts.slice(0, 6).map(alert => {
    const severity = getAlertSeverity(alert);

    return {
      title: alert.content || alert.annotations?.summary || t('dashboard.activity.default-title'),
      detail: `${getAlertOwnerLabel(alert, t)} · ${alert.labels?.service || alert.labels?.job || alert.labels?.instance || t('dashboard.activity.pending-entity')}`,
      timestamp: new Date((alert.gmtUpdate || alert.gmtCreate || Date.now()) as number).toLocaleString(),
      tone: severity === 'critical' || severity === 'error' ? 'danger' : severity === 'warning' ? 'warning' : 'default',
      tag: resolveStatusLabel(alert.status || 'firing', t)
    };
  });
}

function buildCoverageItems(appCounts: AppCount[], t: Translator): OverviewCoverageItem[] {
  return appCounts.slice(0, 6).map(item => {
    const abnormalCount = (item.unAvailableSize || 0) + (item.unManageSize || 0);
    return {
      label: item.category || item.app || t('dashboard.coverage.unknown'),
      total: t('dashboard.coverage.total', { count: item.size || 0 }),
      healthy: t('dashboard.coverage.healthy', { count: item.availableSize || 0 }),
      abnormal: abnormalCount > 0 ? t('dashboard.coverage.abnormal', { count: abnormalCount }) : t('dashboard.coverage.clean')
    };
  });
}

function buildQuickEntryItems(t: Translator): OverviewQuickEntryItem[] {
  return [
    { label: t('dashboard.quick-entry.entities'), copy: t('dashboard.quick-entry.entities.copy'), route: '/entities' },
    { label: t('dashboard.quick-entry.logs'), copy: t('dashboard.quick-entry.logs.copy'), route: '/log/manage' },
    { label: t('dashboard.quick-entry.traces'), copy: t('dashboard.quick-entry.traces.copy'), route: '/trace/manage' },
    { label: t('dashboard.quick-entry.metrics'), copy: t('dashboard.quick-entry.metrics.copy'), route: '/ingestion/otlp/metrics' },
    { label: t('dashboard.quick-entry.dashboards'), copy: t('dashboard.quick-entry.dashboards.copy'), route: '/dashboard' }
  ];
}

function getAlertSeverity(alert?: SingleAlert) {
  return `${alert?.labels?.severity || alert?.annotations?.severity || 'warning'}`.toLowerCase();
}

function getAlertOwnerLabel(alert: SingleAlert | undefined, t: Translator) {
  return alert?.labels?.owner || alert?.annotations?.owner || t('dashboard.owner.unassigned');
}

function hasAlertOwner(alert?: SingleAlert) {
  return Boolean(alert?.labels?.owner || alert?.annotations?.owner);
}

function resolveSeverityLabel(severity: string, t: Translator) {
  const key = `dashboard.severity.${severity}`;
  const value = t(key);
  return value === key ? severity : value;
}

function resolveStatusLabel(status: string, t: Translator) {
  const key = `alert.status.${status}`;
  const value = t(key);
  return value === key ? status : value;
}
