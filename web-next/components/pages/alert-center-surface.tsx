'use client';

import React from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
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

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertCenterSurfaceProps = {
  t: Translator;
  data: AlertPageData;
  draft: AlertQueryState;
  onDraftChange: (nextDraft: AlertQueryState) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  onClosureAction?: (action: AlertClosureOperationAction, groupId: number) => void;
  operationFeedback?: { tone: 'success' | 'danger'; copy: string } | null;
  initialDialogState?: { groupKey: string; mode: AlertRuleDialogMode } | null;
};

const coldCenterVisual = coldOpsCatalogVisual;

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

const topologySourceLabels: Record<string, string> = {
  'otlp-trace-call': 'OTLP 调用关系',
  'monitor-ownership': '监控对象归属',
  'template-dependency': '模板依赖',
  'k8s-workload': 'K8s 工作负载',
  'database-middleware-connection': '数据库 / 中间件连接',
  'cmdb-manual-label': 'CMDB / 手工标签',
  'alert-impact': '告警影响面'
};

function isChineseTranslator(t: Translator): boolean {
  return t('common.refresh') === '刷新' || t('alert.status.firing') === '告警中';
}

function getSeverityLabel(severity: (typeof SEVERITY_OPTIONS)[number], t: Translator): string {
  const chinese = isChineseTranslator(t);
  switch (severity) {
    case 'critical':
      return t('alert.center.metrics.critical');
    case 'warning':
      return t('alert.center.metrics.warning');
    case 'error':
      return chinese ? '错误' : 'Error';
    case 'info':
      return chinese ? '信息' : 'Info';
    case 'unknown':
    default:
      return chinese ? '未知' : 'Unknown';
  }
}

function formatTopologySourceKind(sourceKind?: string) {
  if (!sourceKind) return '全部关系来源';
  return topologySourceLabels[sourceKind] || sourceKind;
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

function resolveNumericGroupId(groupKey: string) {
  const groupId = Number(groupKey);
  return Number.isFinite(groupId) && groupId > 0 ? groupId : null;
}

export function AlertCenterSurface({
  t,
  data,
  draft,
  onDraftChange,
  onRefresh,
  onClearFilters,
  onClosureAction,
  operationFeedback = null,
  initialDialogState = null
}: AlertCenterSurfaceProps) {
  const activeFilters = hasActiveAlertFilters(draft);
  const entityContextActive = hasAlertEntityContext(draft);
  const topologyContextActive = hasAlertTopologyContext(draft);
  const entityContextSummary = buildAlertEntityContextSummary(draft, t);
  const entityTitle = draft.entityName || draft.entityId;
  const returnTo = resolveAlertInternalReturnHref(draft.returnTo);
  const topologyReturnHref = returnTo || '/topology';
  const entityReturnHref = buildEntityWorkspaceHref(
    buildEntitySignalRouteContext({
      entityId: draft.entityId,
      entityName: draft.entityName,
      returnTo
    })
  );
  const totalAlerts = data.groupAlerts.totalElements || 0;
  const noiseControlCard = buildAlertNoiseControlSummary(data.noiseControlSummary, totalAlerts, t);
  const groupCards = buildAlertGroupCards(data.groupAlerts, entityContextActive, t, formatTime);
  const primaryGroup = data.groupAlerts.content[0] || null;
  const primaryGroupId = primaryGroup?.id && Number.isFinite(Number(primaryGroup.id)) ? Number(primaryGroup.id) : null;
  const evidenceClosureRows = buildAlertEvidenceClosureRows(draft, primaryGroup, t);
  const evidenceContextRows = buildAlertEvidenceContextRows(draft, t, primaryGroup);
  const closureOperationRows = buildAlertClosureOperationRows(draft, primaryGroup, t);
  const chinese = isChineseTranslator(t);
  const evidenceSummary = evidenceClosureRows.map(row => row.title).join(' / ');
  const operationSummary = closureOperationRows.map(row => row.label).join(' / ');
  const disabledClosureActionTitle = t('alert.center.closure-action.disabled.no-group');
  const [dialogState, setDialogState] = React.useState<{ groupKey: string; mode: AlertRuleDialogMode } | null>(initialDialogState);
  const activeDialogGroup = React.useMemo(
    () => (dialogState ? data.groupAlerts.content.find(group => String(group.id) === dialogState.groupKey) || null : null),
    [data.groupAlerts.content, dialogState]
  );

  return (
    <>
      <div
        data-alert-center-surface="otlp-cold-center-console"
        data-alert-center-style-baseline={coldCenterVisual.canvasName}
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
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">拓扑影响面</div>
                        <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">
                          {draft.serviceName || draft.entityName || draft.entityId || '当前拓扑上下文'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={coldPillClassName}>{draft.viewMode || 'alert-impact'}</span>
                          <span className={coldPillClassName}>{formatTopologySourceKind(draft.sourceKind)}</span>
                          {draft.edgeId ? <span className={coldPillClassName}>{draft.edgeId}</span> : null}
                          {draft.environment ? <span className={coldPillClassName}>{draft.environment}</span> : null}
                          {draft.timeRange ? <span className={coldPillClassName}>{draft.timeRange}</span> : null}
                        </div>
                      </div>
                      <a data-alert-topology-return="true" className={coldLinkClassName} href={topologyReturnHref}>
                        返回拓扑
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
                        <a className={coldLinkClassName} href={buildAlertNoiseControlManageHref('silence', draft, data.noiseControlSummary)}>
                          {noiseControlCard.silenceActionLabel}
                        </a>
                        <a className={coldLinkClassName} href={buildAlertNoiseControlManageHref('inhibit', draft, data.noiseControlSummary)}>
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

                <div data-alert-evidence-closure="otlp-alert-evidence-workbench" className={coldPanelClassName}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">告警证据闭环</div>
                      <div className="mt-1 text-[18px] font-semibold text-[#f5f7fb]">处理前先看证据</div>
                      <div className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#a9b0bb]">
                        把实体、指标、日志、链路和拓扑证据放在同一个处理入口。
                      </div>
                      <div
                        data-alert-closure-summary="evidence-and-actions"
                        data-alert-evidence-summary={evidenceClosureRows.map(row => row.key).join(',')}
                        data-alert-operation-summary={closureOperationRows.map(row => row.key).join(',')}
                        className="mt-3 grid max-w-[860px] gap-2 text-[12px] md:grid-cols-2"
                      >
                        <div className="rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                          <span className="font-semibold text-[#7e8494]">{chinese ? '证据范围' : 'Evidence scope'}</span>
                          <span className="ml-2 text-[#dbe4f0]">{evidenceSummary}</span>
                        </div>
                        <div className="rounded-[3px] border border-[#252b34] bg-[#101217] px-3 py-2">
                          <span className="font-semibold text-[#7e8494]">{chinese ? '处理动作' : 'Closure actions'}</span>
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
                      {groupCards.map(group => (
                        <article key={group.key} data-alert-group-card={group.key} className="bg-[#0b0c0e] p-4 transition hover:bg-[#111721]">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
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
                                      onClosureAction?.(closureAction, groupId);
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
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
      {dialogState && activeDialogGroup ? (
        <AlertRuleQuickDialog
          t={t}
          mode={dialogState.mode}
          group={activeDialogGroup}
          query={draft}
          onClose={() => setDialogState(null)}
        />
      ) : null}
    </>
  );
}
