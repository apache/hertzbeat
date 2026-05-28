'use client';

import React from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import { HzBatchToolbar, HzCheckbox, HzConfirmDialog, HzPaginationBar, HzStatCell, HzStatStrip, HzStatusBadge } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { SearchRow } from '../ui/search-row';
import { AlertRuleQuickDialog } from './alert-rule-quick-dialog';
import type { AlertClosureOperationAction, AlertPageData } from '../../lib/alert-manage/controller';
import {
  hasActiveAlertFilters,
  hasAlertEntityContext,
  hasAlertTopologyContext,
  resolveAlertInternalReturnHref,
  type AlertQueryState
} from '../../lib/alert-manage/query-state';
import {
  buildAlertEntityContextSummary,
  buildAlertClosureOperationRows,
  buildAlertEvidenceContextRows,
  buildAlertEvidenceClosureRows,
  buildAlertGroupCards,
  buildAlertNoiseControlManageHref,
  buildAlertNoiseControlSummary,
  type AlertRuleDialogMode
} from '../../lib/alert-manage/view-model';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { formatTime } from '../../lib/format';
import { buildEntitySignalRouteContext, buildEntityWorkspaceHref } from '../../lib/workspace-navigation';
import type { GroupAlert, SingleAlert } from '../../lib/types';
import type { AlertSilenceFormDraft } from '../../lib/alert-silence/controller';
import type { AlertInhibitFormDraft } from '../../lib/alert-inhibit/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertEntityResponseResult = {
  action: Exclude<AlertClosureOperationAction, 'recover'> | AlertRuleDialogMode;
  count: number;
} | null;

type AlertCenterSurfaceProps = {
  t: Translator;
  data: AlertPageData;
  draft: AlertQueryState;
  onDraftChange: (nextDraft: AlertQueryState) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  pageSizeOptions?: number[];
  onPageIndexChange?: (nextPageIndex: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  selectedGroupIds?: number[];
  onSelectedGroupIdsChange?: (nextIds: number[]) => void;
  onClosureAction?: (action: AlertClosureOperationAction, groupId: number | number[]) => void;
  onRuleQuickCreate?: (mode: AlertRuleDialogMode, draft: AlertSilenceFormDraft | AlertInhibitFormDraft, count: number) => Promise<void>;
  operationFeedback?: { tone: 'success' | 'danger'; copy: string } | null;
  entityResponseResult?: AlertEntityResponseResult;
  realtimeEventCount?: number;
  realtimeGroupIds?: number[];
  initialDialogState?: { groupKey: string; mode: AlertRuleDialogMode } | null;
};

type PendingBatchStatusAction = {
  action: Extract<AlertClosureOperationAction, 'acknowledge' | 'unacknowledge' | 'resolve' | 'reopen'>;
  ids: number[];
  title: string;
  tone: 'info' | 'critical';
};

const coldCenterVisual = coldOpsCatalogVisual;
const SELECTED_BATCH_DIALOG_GROUP_KEY = '__selected_batch__';

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldMutedButtonClassName =
  'h-7 min-w-[72px] rounded-[3px] border-[#2b3039] bg-[#0b0c0e] px-2.5 text-[12px] font-semibold text-[#aeb7c7] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldLinkClassName =
  'inline-flex h-8 items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldSelectClassName =
  'h-7 min-w-[120px] rounded-[3px] border-[#2b3039] bg-[#0b0c0e] px-2 text-[12px] font-semibold text-[#dbe4f0] outline-none focus-visible:border-[#4e74f8] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.16)]';

const coldPanelClassName =
  'rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)]';

const coldPillClassName =
  'inline-flex min-h-6 items-center rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]';

const operationFeedbackClassNames = {
  success: 'border-[#2f6d4d] bg-[#0d2118] text-[#b7f5ce]',
  danger: 'border-[#76333a] bg-[#241015] text-[#ffc4cc]'
} as const;

const SEVERITY_OPTIONS = ['critical', 'error', 'warning', 'info', 'unknown'] as const;

function getSeverityLabel(severity: (typeof SEVERITY_OPTIONS)[number], t: Translator): string {
  switch (severity) {
    case 'critical':
      return t('alert.center.metrics.critical');
    case 'warning':
      return t('alert.center.metrics.warning');
    case 'error':
      return t('alert.center.metrics.error');
    case 'info':
      return t('alert.center.metrics.info');
    case 'unknown':
    default:
      return t('alert.center.metrics.unknown');
  }
}

function formatTopologySourceKind(sourceKind: string | undefined, t: Translator) {
  if (!sourceKind) return t('alert.center.topology.source.all');
  switch (sourceKind) {
    case 'otlp-trace-call':
      return t('alert.center.topology.source.otlp-trace-call');
    case 'monitor-ownership':
      return t('alert.center.topology.source.monitor-ownership');
    case 'template-dependency':
      return t('alert.center.topology.source.template-dependency');
    case 'k8s-workload':
      return t('alert.center.topology.source.k8s-workload');
    case 'database-middleware-connection':
      return t('alert.center.topology.source.database-middleware-connection');
    case 'cmdb-manual-label':
      return t('alert.center.topology.source.cmdb-manual-label');
    case 'alert-impact':
      return t('alert.center.topology.source.alert-impact');
    default:
      return t('alert.center.topology.source.unknown', { sourceKind });
  }
}

function formatTopologyViewMode(viewMode: string | undefined, t: Translator) {
  if (!viewMode || viewMode === 'alert-impact') return t('topology.view.alert-impact.label');
  switch (viewMode) {
    case 'application':
      return t('topology.view.application.label');
    case 'service-call':
      return t('topology.view.service-call.label');
    case 'resource-dependency':
      return t('topology.view.resource-dependency.label');
    default:
      return t('alert.center.topology.view-mode.unknown', { viewMode });
  }
}

function isDirectClosureAction(key: string): key is AlertClosureOperationAction {
  return key === 'acknowledge' || key === 'recover' || key === 'close';
}

function mapGroupActionToClosureOperation(key: string): AlertClosureOperationAction | null {
  if (key === 'acknowledge') return 'acknowledge';
  if (key === 'resolve') return 'recover';
  if (key === 'unacknowledge') return 'unacknowledge';
  if (key === 'reopen') return 'reopen';
  if (key === 'delete') return 'delete';
  return null;
}

function resolveBatchStatusConfirmTitle(action: PendingBatchStatusAction['action'], t: Translator): string {
  switch (action) {
    case 'acknowledge':
      return t('entity.alert.workbench.confirm.acknowledge-selected');
    case 'unacknowledge':
      return t('entity.alert.workbench.confirm.unacknowledge-selected');
    case 'resolve':
      return t('alert.center.confirm.mark-done-batch');
    case 'reopen':
      return t('alert.center.confirm.mark-no-batch');
    default:
      return t('common.confirm.operation');
  }
}

function resolveNumericGroupId(groupKey: string) {
  const groupId = Number(groupKey);
  return Number.isFinite(groupId) && groupId > 0 ? groupId : null;
}

function buildSharedGroupLabels(groups: GroupAlert[]): Record<string, string> {
  if (groups.length === 0) return {};
  const initialLabels = groups[0].groupLabels || groups[0].commonLabels || {};
  return groups.slice(1).reduce<Record<string, string>>((intersection, group) => {
    const nextLabels = group.groupLabels || group.commonLabels || {};
    return Object.entries(intersection).reduce<Record<string, string>>((acc, [key, value]) => {
      if (nextLabels[key] === value) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }, { ...initialLabels });
}

function buildSelectedBatchRuleGroup(groups: GroupAlert[]): GroupAlert | null {
  if (groups.length === 0) return null;
  const sharedLabels = buildSharedGroupLabels(groups);
  const representativeAlerts = groups.flatMap(group => group.alerts?.slice(0, 1) || []);
  const alerts: SingleAlert[] = representativeAlerts.length > 0
    ? representativeAlerts
    : groups.map(group => ({
      id: Number(group.id) || 0,
      fingerprint: String(group.groupKey || group.id),
      labels: group.groupLabels || group.commonLabels || {},
      status: group.status
    }));

  return {
    id: 0,
    groupKey: SELECTED_BATCH_DIALOG_GROUP_KEY,
    status: groups[0].status,
    groupLabels: sharedLabels,
    commonLabels: sharedLabels,
    alerts,
    gmtUpdate: groups
      .map(group => group.gmtUpdate)
      .filter((value): value is number => typeof value === 'number')
      .sort((left, right) => right - left)[0] ?? groups[0].gmtUpdate
  };
}

function buildEntityReturnHrefWithResponseResult(href: string, result: AlertEntityResponseResult): string {
  if (!href || !result || result.count <= 0) {
    return href;
  }
  const [pathAndQuery, hashFragment] = href.split('#', 2);
  const [path, currentQuery] = pathAndQuery.split('?', 2);
  const params = new URLSearchParams(currentQuery || '');
  params.set('responseResultKind', 'alerts');
  params.set('responseResultAction', result.action);
  params.set('responseResultCount', String(result.count));
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ''}${hashFragment ? `#${hashFragment}` : ''}`;
}

export function AlertCenterSurface({
  t,
  data,
  draft,
  onDraftChange,
  onRefresh,
  onClearFilters,
  pageSizeOptions = [8, 15, 25],
  onPageIndexChange,
  onPageSizeChange,
  selectedGroupIds = [],
  onSelectedGroupIdsChange,
  onClosureAction,
  onRuleQuickCreate,
  operationFeedback = null,
  entityResponseResult = null,
  realtimeEventCount = 0,
  realtimeGroupIds = [],
  initialDialogState = null
}: AlertCenterSurfaceProps) {
  const activeFilters = hasActiveAlertFilters(draft);
  const entityContextActive = hasAlertEntityContext(draft);
  const topologyContextActive = hasAlertTopologyContext(draft);
  const entityContextSummary = buildAlertEntityContextSummary(draft, t);
  const entityTitle = draft.entityName || draft.entityId;
  const returnTo = resolveAlertInternalReturnHref(draft.returnTo);
  const topologyReturnHref = returnTo || '/topology';
  const entityReturnHref = buildEntityReturnHrefWithResponseResult(
    buildEntityWorkspaceHref(
      buildEntitySignalRouteContext({
        entityId: draft.entityId,
        entityName: draft.entityName,
        returnTo
      })
    ),
    entityResponseResult
  );
  const totalAlerts = data.groupAlerts.totalElements || 0;
  const currentAlertGroups = data.groupAlerts.content || [];
  const currentStatusCounts = currentAlertGroups.reduce<Record<string, number>>((counts, group) => {
    const status = (group.status || 'firing').trim().toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const alertFacts = [
    {
      id: 'total',
      label: t('alert.workbench.total'),
      value: totalAlerts,
      tone: 'neutral' as const
    },
    {
      id: 'firing',
      label: t('alert.workbench.firing'),
      value: currentStatusCounts.firing || 0,
      tone: 'critical' as const
    },
    {
      id: 'acknowledged',
      label: t('alert.workbench.acknowledged'),
      value: currentStatusCounts.acknowledged || 0,
      tone: 'warning' as const
    },
    {
      id: 'resolved',
      label: t('alert.workbench.resolved'),
      value: currentStatusCounts.resolved || 0,
      tone: 'success' as const
    }
  ];
  const currentPageIndex = Math.max(0, data.groupAlerts.pageIndex ?? draft.pageIndex ?? 0);
  const currentPageSize = Math.max(1, data.groupAlerts.pageSize ?? draft.pageSize ?? pageSizeOptions[0] ?? 8);
  const totalPages = Math.max(1, Math.ceil(totalAlerts / currentPageSize));
  const currentPage = Math.min(currentPageIndex + 1, totalPages);
  const pageStart = totalAlerts === 0 || data.groupAlerts.content.length === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageEnd = totalAlerts === 0 ? 0 : Math.min(totalAlerts, currentPageIndex * currentPageSize + data.groupAlerts.content.length);
  const paginationSummary = t('alert.center.pagination.summary', {
    page: currentPage,
    totalPages,
    from: pageStart,
    to: pageEnd,
    total: totalAlerts
  });
  const noiseControlCard = buildAlertNoiseControlSummary(data.noiseControlSummary, totalAlerts, t);
  const groupCards = buildAlertGroupCards(data.groupAlerts, entityContextActive, t, formatTime);
  const primaryGroup = data.groupAlerts.content[0] || null;
  const primaryGroupId = primaryGroup?.id && Number.isFinite(Number(primaryGroup.id)) ? Number(primaryGroup.id) : null;
  const evidenceClosureRows = buildAlertEvidenceClosureRows(draft, primaryGroup, t);
  const evidenceContextRows = buildAlertEvidenceContextRows(draft, t, primaryGroup);
  const closureOperationRows = buildAlertClosureOperationRows(draft, primaryGroup, t);
  const evidenceSummary = evidenceClosureRows.map(row => row.title).join(' / ');
  const operationSummary = closureOperationRows.map(row => row.label).join(' / ');
  const disabledClosureActionTitle = t('alert.center.closure-action.disabled.no-group');
  const selectedGroupIdSet = React.useMemo(() => new Set(selectedGroupIds), [selectedGroupIds]);
  const realtimeGroupIdSet = React.useMemo(() => new Set(realtimeGroupIds), [realtimeGroupIds]);
  const currentPageGroupIds = React.useMemo(
    () => data.groupAlerts.content
      .map(group => Number(group.id))
      .filter(groupId => Number.isFinite(groupId) && groupId > 0),
    [data.groupAlerts.content]
  );
  const allCurrentPageSelected = currentPageGroupIds.length > 0 && currentPageGroupIds.every(groupId => selectedGroupIdSet.has(groupId));
  const selectedFiringIds = data.groupAlerts.content
    .filter(group => group.status === 'firing' && selectedGroupIdSet.has(Number(group.id)))
    .map(group => Number(group.id));
  const selectedAcknowledgedIds = data.groupAlerts.content
    .filter(group => group.status === 'acknowledged' && selectedGroupIdSet.has(Number(group.id)))
    .map(group => Number(group.id));
  const selectedResolvedIds = data.groupAlerts.content
    .filter(group => group.status === 'resolved' && selectedGroupIdSet.has(Number(group.id)))
    .map(group => Number(group.id));
  const selectedGroups = React.useMemo(
    () => data.groupAlerts.content.filter(group => selectedGroupIdSet.has(Number(group.id))),
    [data.groupAlerts.content, selectedGroupIdSet]
  );
  const selectedBatchRuleGroup = React.useMemo(() => buildSelectedBatchRuleGroup(selectedGroups), [selectedGroups]);
  const [dialogState, setDialogState] = React.useState<{ groupKey: string; mode: AlertRuleDialogMode } | null>(initialDialogState);
  const [pendingBatchStatusAction, setPendingBatchStatusAction] = React.useState<PendingBatchStatusAction | null>(null);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = React.useState<number | null>(null);
  const activeDialogGroup = React.useMemo(
    () => {
      if (!dialogState) return null;
      if (dialogState.groupKey === SELECTED_BATCH_DIALOG_GROUP_KEY) {
        return selectedBatchRuleGroup;
      }
      return data.groupAlerts.content.find(group => String(group.id) === dialogState.groupKey) || null;
    },
    [data.groupAlerts.content, dialogState, selectedBatchRuleGroup]
  );
  const activeDialogSelectionCount = dialogState?.groupKey === SELECTED_BATCH_DIALOG_GROUP_KEY
    ? selectedGroups.length
    : activeDialogGroup
      ? 1
      : 0;

  function handlePageJumpChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    const nextPageIndex = Math.min(Math.max(parsed, 1), totalPages) - 1;
    onPageIndexChange?.(nextPageIndex);
  }

  function updateSelectedGroupId(groupId: number, checked: boolean) {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    const next = new Set(selectedGroupIds);
    if (checked) {
      next.add(groupId);
    } else {
      next.delete(groupId);
    }
    onSelectedGroupIdsChange?.(Array.from(next));
  }

  function updateCurrentPageSelection(checked: boolean) {
    if (!checked) {
      onSelectedGroupIdsChange?.([]);
      return;
    }
    onSelectedGroupIdsChange?.(Array.from(new Set([...selectedGroupIds, ...currentPageGroupIds])));
  }

  function requestBatchStatusAction(action: PendingBatchStatusAction['action'], ids: number[]) {
    const normalizedIds = ids.filter(groupId => Number.isFinite(groupId) && groupId > 0);
    if (normalizedIds.length > 0) {
      setPendingBatchStatusAction({
        action,
        ids: normalizedIds,
        title: resolveBatchStatusConfirmTitle(action, t),
        tone: action === 'resolve' || action === 'reopen' ? 'critical' : 'info'
      });
    }
  }

  function confirmPendingBatchStatusAction() {
    if (!pendingBatchStatusAction) return;
    onClosureAction?.(pendingBatchStatusAction.action, pendingBatchStatusAction.ids);
    setPendingBatchStatusAction(null);
  }

  function confirmPendingDeleteGroup() {
    if (!pendingDeleteGroupId) return;
    onClosureAction?.('delete', pendingDeleteGroupId);
    setPendingDeleteGroupId(null);
  }

  function openSelectedRuleDialog(mode: AlertRuleDialogMode) {
    if (selectedGroups.length === 0) return;
    setDialogState({ groupKey: SELECTED_BATCH_DIALOG_GROUP_KEY, mode });
  }

  return (
    <>
      <div
        data-alert-center-surface="otlp-cold-center-console"
        data-alert-center-style-baseline={coldCenterVisual.canvasName}
        data-alert-center-sse-contract="angular-alert-event-refresh"
        data-alert-center-sse-event-count={realtimeEventCount}
        data-alert-center-sse-highlight="angular-new-alert"
        data-alert-center-sse-highlight-ids={realtimeGroupIds.join(',')}
        data-alert-center-delete-page-clamp="angular-update-page-index"
        data-alert-center-delete-page-clamp-owner="route-state-contract"
        data-alert-center-post-action-filter-contract="angular-retain-filter"
        data-alert-center-post-action-filter-owner="route-state-contract"
        data-alert-center-rule-create-feedback="angular-new-notify"
        data-alert-center-rule-create-feedback-owner="route-state-contract"
        data-alert-center-rule-selection-count="angular-group-count"
        data-alert-center-rule-selection-count-owner="route-state-contract"
        data-alert-center-inhibit-defaults="angular-drop-severity-equal-allowlist"
        data-alert-center-inhibit-defaults-owner="route-state-contract"
        data-alert-center-batch-confirm="angular-status-confirm"
        data-alert-center-batch-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-alert-center-row-delete-confirm="angular-single-delete-confirm"
        data-alert-center-row-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-alert-noise-control-action-label-contract="angular-possible-suppression-counts"
        data-alert-noise-control-action-label-owner="route-state-contract"
        data-alert-center-acknowledged-actions-contract="angular-unacknowledge-resolve"
        data-alert-center-acknowledged-actions-owner="route-alert-card"
        className={coldCenterVisual.canvas.root}
        style={coldCenterVisual.canvas.backgroundStyle}
      >
        <section className={coldCenterVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-alert-center-header="cold-compact-header" className={coldCenterVisual.panel.hero}>
                <div className="max-w-[860px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('alert.workbench.kicker')}
                  </h1>
                  <p className="mt-4 max-w-[800px] text-[13px] leading-6 text-[#a9b0bb]">
                    <span className="font-semibold text-[#dbe4f0]">{t('alert.workbench.title')}</span>
                    <br />
                    {entityContextActive ? t('alert.workbench.copy.entity') : t('alert.workbench.copy')}
                  </p>
                  <div data-alert-center-command-row="standard-equal-buttons" className={coldCenterVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('alert.workbench.action.refresh')}
                    </Button>
                    {activeFilters ? (
                      <Button size="sm" variant="default" className={coldButtonClassName} onClick={onClearFilters}>
                        {t('alert.workbench.action.clear-filters')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <HzStatStrip
                  columns={4}
                  frame="panel-inset"
                  spacing="compact"
                  className="mt-5"
                  data-alert-center-facts-strip="angular-platform-facts-strip"
                  data-alert-center-facts-strip-owner="hertzbeat-ui-stat-strip"
                >
                  {alertFacts.map(fact => (
                    <HzStatCell
                      key={fact.id}
                      label={fact.label}
                      value={fact.value}
                      tone={fact.tone}
                      variant="tile"
                      density="compact"
                      frame="inset"
                      data-alert-center-fact={fact.id}
                      data-alert-center-fact-owner="hertzbeat-ui-stat-cell"
                    />
                  ))}
                </HzStatStrip>
              </div>
            </div>

            <div data-alert-center-admin-layout="full-width-admin-list" className="space-y-5">
              <section className="min-w-0 space-y-4">
                {entityContextActive ? (
                  <div data-alert-entity-context="cold-context-panel" className={coldPanelClassName}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                          {t('entity.response.context.title')}
                        </div>
                        <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">{entityTitle}</div>
                        {entityContextSummary ? (
                          <div className="mt-2 text-[12px] leading-5 text-[#a9b0bb]">{entityContextSummary}</div>
                        ) : null}
                      </div>
                      <a className={coldLinkClassName} href={entityReturnHref}>
                        {t('entity.response.context.return')}
                      </a>
                    </div>
                  </div>
                ) : null}

                {topologyContextActive ? (
                  <div
                    data-alert-topology-context="impact-filter-panel"
                    data-alert-topology-view-mode={draft.viewMode || 'all'}
                    data-alert-topology-source-kind={draft.sourceKind || 'all'}
                    data-alert-topology-edge-id={draft.edgeId || 'none'}
                    className={coldPanelClassName}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                          {t('alert.center.topology.context.kicker')}
                        </div>
                        <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">
                          {draft.serviceName || draft.entityName || draft.entityId || t('alert.center.topology.context.fallback')}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={coldPillClassName}>{formatTopologyViewMode(draft.viewMode, t)}</span>
                          <span className={coldPillClassName}>{formatTopologySourceKind(draft.sourceKind, t)}</span>
                          {draft.edgeId ? <span className={coldPillClassName}>{draft.edgeId}</span> : null}
                          {draft.environment ? <span className={coldPillClassName}>{draft.environment}</span> : null}
                          {draft.timeRange ? <span className={coldPillClassName}>{draft.timeRange}</span> : null}
                        </div>
                      </div>
                      <a data-alert-topology-return="true" className={coldLinkClassName} href={topologyReturnHref}>
                        {t('alert.center.topology.context.return')}
                      </a>
                    </div>
                  </div>
                ) : null}

                {noiseControlCard ? (
                  <div data-alert-noise-controls="cold-noise-panel" className={coldPanelClassName}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                          {t('entity.detail.noise-controls.kicker')}
                        </div>
                        <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">{noiseControlCard.title}</div>
                        <div className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]">{noiseControlCard.copy}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          className={coldLinkClassName}
                          href={buildAlertNoiseControlManageHref('silence', draft, data.noiseControlSummary)}
                          data-alert-noise-control-action="silence"
                          data-alert-noise-control-action-label={
                            data.noiseControlSummary?.possibleAlertSuppression && data.noiseControlSummary.activeSilenceCount === 0
                              ? 'angular-view-or-create'
                              : 'angular-open-matching'
                          }
                        >
                          {noiseControlCard.silenceActionLabel}
                        </a>
                        <a
                          className={coldLinkClassName}
                          href={buildAlertNoiseControlManageHref('inhibit', draft, data.noiseControlSummary)}
                          data-alert-noise-control-action="inhibit"
                          data-alert-noise-control-action-label={
                            data.noiseControlSummary?.possibleAlertSuppression && data.noiseControlSummary.matchingInhibitCount === 0
                              ? 'angular-view-or-create'
                              : 'angular-open-matching'
                          }
                        >
                          {noiseControlCard.inhibitActionLabel}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}

                {operationFeedback ? (
                  <div
                    data-alert-operation-feedback={operationFeedback.tone}
                    aria-live="polite"
                    className={`rounded-[4px] border px-3 py-2 text-[12px] font-semibold ${operationFeedbackClassNames[operationFeedback.tone]}`}
                  >
                    {operationFeedback.copy}
                  </div>
                ) : null}

                {entityContextActive ? (
                  <div
                    data-alert-center-entity-batch="angular-selected-groups"
                    data-alert-center-entity-batch-owner="hertzbeat-ui-batch-toolbar"
                    className={coldPanelClassName}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <HzCheckbox
                        checked={allCurrentPageSelected}
                        onChange={event => updateCurrentPageSelection(event.currentTarget.checked)}
                        label={t('alert.center.batch.select-page')}
                        data-alert-center-batch-select-page="hertzbeat-ui-checkbox"
                      />
                    </div>
                    <HzBatchToolbar
                      selectionCount={selectedGroupIds.length}
                      selectionLabel={t('alert.center.batch.selection-label')}
                      variant="embedded"
                      data-alert-center-batch-toolbar="selected-entity-alerts"
                      actions={[
                        {
                          id: 'acknowledge-selected',
                          label: t('alert.center.batch.acknowledge-selected', { count: selectedFiringIds.length }),
                          disabled: selectedFiringIds.length === 0,
                          onSelect: () => requestBatchStatusAction('acknowledge', selectedFiringIds),
                          buttonProps: {
                            'data-alert-center-batch-action': 'acknowledge-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        },
                        {
                          id: 'unacknowledge-selected',
                          label: t('alert.center.batch.unacknowledge-selected', { count: selectedAcknowledgedIds.length }),
                          disabled: selectedAcknowledgedIds.length === 0,
                          onSelect: () => requestBatchStatusAction('unacknowledge', selectedAcknowledgedIds),
                          buttonProps: {
                            'data-alert-center-batch-action': 'unacknowledge-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        },
                        {
                          id: 'resolve-selected',
                          label: t('alert.center.batch.resolve-selected', { count: selectedFiringIds.length }),
                          disabled: selectedFiringIds.length === 0,
                          onSelect: () => requestBatchStatusAction('resolve', selectedFiringIds),
                          buttonProps: {
                            'data-alert-center-batch-action': 'resolve-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        },
                        {
                          id: 'reopen-selected',
                          label: t('alert.center.batch.reopen-selected', { count: selectedResolvedIds.length }),
                          disabled: selectedResolvedIds.length === 0,
                          onSelect: () => requestBatchStatusAction('reopen', selectedResolvedIds),
                          buttonProps: {
                            'data-alert-center-batch-action': 'reopen-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        },
                        {
                          id: 'silence-selected',
                          label: t('alert.center.batch.silence-selected', { count: selectedGroups.length }),
                          disabled: selectedGroups.length === 0,
                          onSelect: () => openSelectedRuleDialog('silence'),
                          buttonProps: {
                            'data-alert-center-batch-action': 'silence-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar',
                            'data-alert-center-batch-dialog-source': 'selected-groups'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        },
                        {
                          id: 'inhibit-selected',
                          label: t('alert.center.batch.inhibit-selected', { count: selectedGroups.length }),
                          disabled: selectedGroups.length === 0,
                          onSelect: () => openSelectedRuleDialog('inhibit'),
                          buttonProps: {
                            'data-alert-center-batch-action': 'inhibit-selected',
                            'data-alert-center-batch-action-owner': 'hertzbeat-ui-batch-toolbar',
                            'data-alert-center-batch-dialog-source': 'selected-groups'
                          } as React.ButtonHTMLAttributes<HTMLButtonElement>
                        }
                      ]}
                    />
                  </div>
                ) : null}

                <div data-alert-evidence-closure="otlp-alert-evidence-workbench" className={coldPanelClassName}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        {t('alert.center.evidence.closure.kicker')}
                      </div>
                      <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">{t('alert.center.evidence.closure.title')}</div>
                      <div className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]">
                        {t('alert.center.evidence.closure.copy')}
                      </div>
                      <div
                        data-alert-closure-summary="evidence-and-actions"
                        data-alert-evidence-summary={evidenceClosureRows.map(row => row.key).join(',')}
                        data-alert-operation-summary={closureOperationRows.map(row => row.key).join(',')}
                        className="mt-3 grid max-w-[860px] gap-2 text-[12px] md:grid-cols-2"
                      >
                        <div className="rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                          <span className="font-semibold text-[#7e8494]">{t('alert.center.evidence.closure.summary.evidence')}</span>
                          <span className="ml-2 text-[#dbe4f0]">{evidenceSummary}</span>
                        </div>
                        <div className="rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                          <span className="font-semibold text-[#7e8494]">{t('alert.center.evidence.closure.summary.operations')}</span>
                          <span className="ml-2 text-[#dbe4f0]">{operationSummary}</span>
                        </div>
                      </div>
                      {evidenceContextRows.length > 0 ? (
                        <div
                          data-alert-evidence-context="inherited-time-context"
                          className="mt-3 grid max-w-[860px] gap-2 text-[12px] md:grid-cols-2"
                        >
                          {evidenceContextRows.map(row => (
                            <div
                              key={row.key}
                              data-alert-evidence-context-row={row.key}
                              className="rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2"
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7e8494]">{row.title}</div>
                              <div className="mt-1 truncate font-semibold text-[#dbe4f0]">{row.copy}</div>
                              {row.meta ? <div className="mt-1 truncate text-[11px] leading-4 text-[#8f99ab]">{row.meta}</div> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-5">
                    {evidenceClosureRows.map(row => (
                      <a
                        key={row.key}
                        data-alert-evidence-link={row.key}
                        href={row.href}
                        className="rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-3 transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                      >
                        <div className="text-[12px] font-semibold text-[#eef2f7]">{row.title}</div>
                        <div className="mt-1 truncate text-[11px] text-[#cbd5e1]">{row.copy}</div>
                        <div className="mt-2 text-[11px] leading-4 text-[#7e8494]">{row.meta}</div>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-5">
                    {closureOperationRows.map(row =>
                      row.href ? (
                        <a
                          key={row.key}
                          data-alert-closure-action={row.key}
                          href={row.href}
                          className="rounded-[4px] border border-[#303743] bg-[#0f141d] px-3 py-3 text-left transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                        >
                          <span className="block text-[12px] font-semibold text-[#eef2f7]">{row.label}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-[#8f99ab]">{row.copy}</span>
                        </a>
                      ) : (
                        <button
                          key={row.key}
                          type="button"
                          data-alert-closure-action={row.key}
                          data-alert-closure-action-disabled={primaryGroupId ? undefined : 'missing-alert-group-id'}
                          disabled={!primaryGroupId}
                          title={!primaryGroupId ? disabledClosureActionTitle : undefined}
                          aria-label={!primaryGroupId ? `${row.label}：${disabledClosureActionTitle}` : undefined}
                          onClick={() => {
                            if (primaryGroupId && isDirectClosureAction(row.key)) {
                              onClosureAction?.(row.key, primaryGroupId);
                            }
                          }}
                          className="rounded-[4px] border border-[#303743] bg-[#0f141d] px-3 py-3 text-left transition hover:border-[#4e74f8] hover:bg-[#151b28]"
                        >
                          <span className="block text-[12px] font-semibold text-[#eef2f7]">{row.label}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-[#8f99ab]">{row.copy}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div data-alert-center-toolbar="cold-query-toolbar" className="mb-6 flex w-fit max-w-full flex-wrap items-center gap-2">
                  <SearchRow
                    data-alert-center-search-row="shared-compact"
                    data-alert-center-query-toolbar="single-query-form"
                    className="mb-0"
                    value={draft.search}
                    placeholder={t('alert.center.search')}
                    searchLabel={t('common.search')}
                    clearLabel={t('common.clear')}
                    onValueChange={value => onDraftChange({ ...draft, search: value })}
                    onSearch={onRefresh}
                    filters={
                      <div data-alert-center-query-filters="inline-before-submit" className="flex min-w-0 flex-wrap items-center gap-2">
                        <Select
                          aria-label={t('alert.center.filter-status')}
                          className={coldSelectClassName}
                          data-alert-center-select="status"
                          value={draft.status}
                          onChange={event => onDraftChange({ ...draft, status: event.target.value })}
                        >
                          <option value="">{t('alert.center.filter-status')}</option>
                          <option value="firing">{t('alert.status.firing')}</option>
                          <option value="acknowledged">{t('alert.status.acknowledged')}</option>
                          <option value="resolved">{t('alert.status.resolved')}</option>
                        </Select>
                        <Select
                          aria-label={t('entity.response.context.severity')}
                          className={coldSelectClassName}
                          data-alert-center-select="severity"
                          value={draft.severity}
                          onChange={event => onDraftChange({ ...draft, severity: event.target.value })}
                        >
                          <option value="">{t('entity.response.context.severity')}</option>
                          {SEVERITY_OPTIONS.map(severity => (
                            <option key={severity} value={severity}>
                              {getSeverityLabel(severity, t)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    }
                  />
                  {activeFilters ? (
                    <Button
                      size="sm"
                      variant="default"
                      className={coldMutedButtonClassName}
                      data-alert-center-clear-filters="true"
                      onClick={onClearFilters}
                    >
                      {t('alert.workbench.action.clear-filters')}
                    </Button>
                  ) : null}
                </div>

                <div
                  data-alert-center-list-shell="cold-alert-list"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="grid h-9 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[#252b34] bg-[#101217] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                    <span>{t('alert.workbench.title')}</span>
                    <span className="text-[#cbd5e1]">{totalAlerts}</span>
                  </div>
                  {data.groupAlerts.content.length === 0 ? (
                    <div
                      data-alert-center-empty-state="cold-table-empty"
                      className="flex min-h-[280px] items-center justify-center border-t border-[#252b34] px-6 py-10 text-center text-[#a9b0bb]"
                    >
                      <div className="inline-flex max-w-[520px] flex-col items-center gap-2.5">
                        <span
                          data-alert-center-empty-icon="cold-empty-box"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                        >
                          <Inbox className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="text-[13px] font-semibold text-[#eef2f7]">{t('alert.workbench.empty.title')}</div>
                        <div className="text-[12px] leading-5 text-[#8f99ab]">
                          {activeFilters ? t('alert.workbench.empty.copy.filtered') : t('alert.workbench.empty.copy')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div data-alert-group-card-stack="true" className="divide-y divide-[#252b34]">
                      {groupCards.map(group => {
                        const groupId = resolveNumericGroupId(group.key);
                        const realtimeHighlighted = groupId != null && realtimeGroupIdSet.has(groupId);
                        return (
                        <article
                          key={group.key}
                          data-alert-group-card={group.key}
                          data-alert-group-realtime-state={realtimeHighlighted ? 'new' : undefined}
                          data-alert-group-realtime-owner={realtimeHighlighted ? 'angular-new-alert' : undefined}
                          className={`bg-[#0b0c0e] p-4 transition hover:bg-[#111721] ${
                            realtimeHighlighted
                              ? 'border-l-[3px] border-l-[#4e74f8] bg-[#101827] shadow-[inset_3px_0_0_rgba(78,116,248,0.28)]'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              {entityContextActive ? (
                                <HzCheckbox
                                  checked={selectedGroupIdSet.has(resolveNumericGroupId(group.key) ?? -1)}
                                  onChange={event => {
                                    const groupId = resolveNumericGroupId(group.key);
                                    if (groupId) {
                                      updateSelectedGroupId(groupId, event.currentTarget.checked);
                                    }
                                  }}
                                  label={t('alert.center.batch.select-group')}
                                  data-alert-center-group-select="hertzbeat-ui-checkbox"
                                  data-alert-center-group-select-id={group.key}
                                  containerClassName="mb-2"
                                />
                              ) : null}
                              <div className="flex flex-wrap gap-1.5">
                                {group.labels.map(label => (
                                  <span key={label} className={coldPillClassName}>
                                    {label}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 text-[12px] text-[#858d9a]">{group.updatedAt}</div>
                              {group.triageReason ? (
                                <div className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]">{group.triageReason}</div>
                              ) : null}
                              <div
                                data-alert-group-response-posture={group.key}
                                data-alert-group-response-stage={group.responseStage}
                                data-alert-group-evidence-summary={group.evidenceSummary}
                                data-alert-group-closure-summary={group.closureSummary}
                                className="mt-3 flex max-w-[860px] flex-wrap gap-2 text-[11px] leading-4"
                              >
                                {[group.responseStage, group.evidenceSummary, group.closureSummary].map(item => (
                                  <span key={item} className="rounded-[3px] border border-[#252b34] bg-[#101217] px-2 py-1 text-[#cbd5e1]">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              {group.actions.map(action => (
                                <Button
                                  key={`${group.key}-${action.key}`}
                                  size="sm"
                                  variant="default"
                                  className={coldMutedButtonClassName}
                                  data-alert-group-action={action.key}
                                  onClick={() => {
                                    if (action.dialogMode) {
                                      setDialogState({ groupKey: group.key, mode: action.dialogMode });
                                      return;
                                    }
                                    const closureAction = mapGroupActionToClosureOperation(action.key);
                                    const groupId = resolveNumericGroupId(group.key);
                                    if (closureAction && groupId) {
                                      if (closureAction === 'delete') {
                                        setPendingDeleteGroupId(groupId);
                                      } else {
                                        onClosureAction?.(closureAction, groupId);
                                      }
                                    }
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {group.alerts.map(alert => (
                              <div
                                key={alert.key}
                                data-alert-card={alert.key}
                                className="rounded-[4px] border border-[#252b34] bg-[#101217] px-3 py-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[14px] font-semibold text-[#eef2f7]">{alert.title}</div>
                                    {alert.triggerSummary ? (
                                      <div className="mt-1 text-[12px] text-[#a9b0bb]">{alert.triggerSummary}</div>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-[12px] text-[#858d9a]">
                                    <div className="font-semibold text-[#cbd5e1]">{alert.status}</div>
                                    <div className="mt-1">
                                      {alert.timeLabel}: {alert.timeValue}
                                    </div>
                                  </div>
                                </div>
                                {alert.labels.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {alert.labels.map(label => (
                                      <span key={`${alert.key}-${label}`} className={coldPillClassName}>
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                <div
                                  data-alert-card-status-detail="angular-status-section"
                                  data-alert-card-status-detail-owner="hertzbeat-ui-status-badge"
                                  className="mt-3 grid gap-2 border-t border-[#252b34] pt-3"
                                >
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                                    {t('alert.center.status')}
                                  </div>
                                  <HzStatusBadge
                                    tone={alert.statusTone}
                                    label={t('alert.center.status')}
                                    value={alert.status}
                                    layout="context-pill"
                                    data-alert-card-status-badge="angular-status-tag"
                                    data-alert-card-status-value={alert.status}
                                  />
                                </div>
                                {alert.annotations.length > 0 ? (
                                  <div
                                    data-alert-card-annotations="angular-detail-section"
                                    data-alert-card-annotations-owner="route-alert-card"
                                    className="mt-3 grid gap-2 border-t border-[#252b34] pt-3"
                                  >
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                                      {t('common.annotation')}
                                    </div>
                                    {alert.annotations.map(annotation => (
                                      <div
                                        key={`${alert.key}-${annotation.key}`}
                                        data-alert-card-annotation={annotation.key}
                                        className="grid gap-1 rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2 text-[12px]"
                                      >
                                        <span className="font-semibold text-[#cbd5e1]">{annotation.key}:</span>
                                        <span className="whitespace-pre-wrap break-words leading-5 text-[#a9b0bb]">{annotation.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {alert.timeRows.length > 0 ? (
                                  <div
                                    data-alert-card-time-detail="angular-first-last-end"
                                    data-alert-card-time-detail-owner="route-alert-card"
                                    className="mt-3 grid gap-2 border-t border-[#252b34] pt-3"
                                  >
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                                      {t('alert.center.time')}
                                    </div>
                                    <div className="grid gap-1 text-[12px] md:grid-cols-3">
                                      {alert.timeRows.map(row => (
                                        <div
                                          key={`${alert.key}-${row.key}`}
                                          data-alert-card-time-row={row.key}
                                          className="rounded-[3px] border border-[#252b34] bg-[#0b0c0e] px-2 py-2"
                                        >
                                          <div className="text-[11px] font-semibold text-[#7e8494]">{row.label}</div>
                                          <div className="mt-1 font-mono text-[#dbe4f0]">{row.value}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div
                  data-alert-center-pagination="cold-dense-pagination"
                  data-alert-center-pagination-owner="hertzbeat-ui-pagination-bar"
                >
                  <HzPaginationBar
                    summary={paginationSummary}
                    pageSizeLabel={t('alert.center.pagination.page-size')}
                    pageSizeValue={String(currentPageSize)}
                    pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
                    pageJumpLabel={t('alert.center.pagination.page')}
                    pageJumpValue={String(currentPage)}
                    pageJumpMax={totalPages}
                    previousLabel={t('common.previous-page')}
                    nextLabel={t('common.next-page')}
                    previousDisabled={currentPageIndex <= 0}
                    nextDisabled={currentPage >= totalPages}
                    onPrevious={() => onPageIndexChange?.(Math.max(currentPageIndex - 1, 0))}
                    onNext={() => onPageIndexChange?.(Math.min(currentPageIndex + 1, totalPages - 1))}
                    onPageSizeChange={value => onPageSizeChange?.(Number.parseInt(value, 10))}
                    onPageJumpChange={handlePageJumpChange}
                    pageJumpInputProps={
                      {
                        'data-alert-center-pagination-page-jump-owner': 'hertzbeat-ui-input'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                    }
                    pageSizeSelectProps={
                      {
                        'data-alert-center-pagination-page-size-owner': 'hertzbeat-ui-select'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
                    }
                    className="border-x-0"
                  />
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
      <HzConfirmDialog
        open={Boolean(pendingBatchStatusAction)}
        tone={pendingBatchStatusAction?.tone || 'info'}
        kicker={t('alert.workbench.kicker')}
        title={pendingBatchStatusAction?.title || t('common.confirm.operation')}
        cancelLabel={t('common.button.cancel')}
        confirmLabel={t('common.button.ok')}
        onClose={() => setPendingBatchStatusAction(null)}
        onConfirm={confirmPendingBatchStatusAction}
        data-alert-center-batch-status-confirm="angular-status-confirm"
        data-alert-center-batch-status-confirm-action={pendingBatchStatusAction?.action}
        data-alert-center-batch-status-confirm-count={pendingBatchStatusAction?.ids.length}
        confirmButtonProps={
          {
            'data-alert-center-batch-status-confirm-ok': 'angular-status-confirm'
          } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
        }
        cancelButtonProps={
          {
            'data-alert-center-batch-status-confirm-cancel': 'angular-status-confirm'
          } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
        }
      />
      <HzConfirmDialog
        open={pendingDeleteGroupId != null}
        tone="critical"
        kicker={t('alert.workbench.kicker')}
        title={t('common.confirm.delete')}
        cancelLabel={t('common.button.cancel')}
        confirmLabel={t('common.button.ok')}
        onClose={() => setPendingDeleteGroupId(null)}
        onConfirm={confirmPendingDeleteGroup}
        data-alert-center-row-delete-confirm-dialog="angular-single-delete-confirm"
        data-alert-center-row-delete-confirm-group-id={pendingDeleteGroupId ?? undefined}
        confirmButtonProps={
          {
            'data-alert-center-row-delete-confirm-ok': 'angular-single-delete-confirm'
          } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
        }
        cancelButtonProps={
          {
            'data-alert-center-row-delete-confirm-cancel': 'angular-single-delete-confirm'
          } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
        }
      />
      {dialogState && activeDialogGroup ? (
        <AlertRuleQuickDialog
          t={t}
          mode={dialogState.mode}
          group={activeDialogGroup}
          query={draft}
          onClose={() => setDialogState(null)}
          onSubmit={onRuleQuickCreate ? (mode, nextDraft) => onRuleQuickCreate(mode, nextDraft, activeDialogSelectionCount) : undefined}
        />
      ) : null}
    </>
  );
}
