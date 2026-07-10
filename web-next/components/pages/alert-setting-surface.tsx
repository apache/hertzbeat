'use client';

import Link from 'next/link';
import React from 'react';
import { Activity, CircleHelp, Inbox, Pencil, Plus, RefreshCw, Timer, Trash2, Upload } from 'lucide-react';
import { HzBatchToolbar, HzInlineFeedback, HzPaginationBar, type HzStatusTone } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { buildAlertSettingRows, type AlertSettingEvidenceContext } from '../../lib/alert-setting/view-model';
import type { AlertSettingPageData } from '../../lib/alert-setting/controller';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertSettingSurfaceProps = {
  t: Translator;
  data: AlertSettingPageData;
  search: string;
  checkedIds: number[];
  evidenceContext?: AlertSettingEvidenceContext | null;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onNewRealtime?: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleEnabled: (defineId: number, enabled: boolean) => void;
  onEdit: (defineId: number) => void;
  onDelete: (defineId: number) => void;
  onCheckedIdsChange: (nextIds: number[]) => void;
  requestedPageSize?: number;
  onPageIndexChange?: (nextPageIndex: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  pendingActionId?: string | null;
  actionFeedback?: {
    tone: HzStatusTone;
    title: string;
    description?: string;
    contract?:
      | 'delete'
      | 'enable'
      | 'export-fail'
      | 'no-select-delete'
      | 'no-select-export'
      | 'import-success'
      | 'import-fail'
      | 'delete-success'
      | 'enable-success'
      | 'save-success';
    deletedCount?: number;
    toggledRule?: {
      id: number;
      name: string;
      enabled: boolean;
    };
    savedRule?: {
      name: string;
      type: string;
      expr: string;
      enabled: boolean;
      intent: 'create' | 'edit';
    };
  } | null;
};

const coldSettingVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function hasReadyAlertSettingExecutor(data: AlertSettingPageData) {
  if (data.datasourceStatus.code !== 0) return false;
  const statusData = data.datasourceStatus.data || {};
  return Boolean(
    statusData.hasPromqlExecutor
      ?? statusData.promql
      ?? statusData.sql
      ?? statusData.ready
      ?? Object.keys(statusData).length === 0
  );
}

function alertSettingActionHelp(t: Translator, label: string, key: string) {
  return {
    ariaLabel: t('alert.setting.action.help-aria', { action: label }),
    body: t(`alert.setting.action.${key}.help`),
    impact: t(`alert.setting.action.${key}.impact`)
  };
}

function AlertSettingActionHelp({
  actionKey,
  label,
  body,
  impact
}: {
  actionKey: string;
  label: string;
  body: React.ReactNode;
  impact?: React.ReactNode;
}) {
  return (
    <span
      data-alert-setting-action-help-key={actionKey}
      data-alert-setting-action-help-placement="inline-action"
      className="group/help relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
    >
      <button
        type="button"
        aria-label={label}
        data-alert-setting-action-help-trigger="hertzbeat-ui-action-help"
        data-alert-setting-action-help-style="icon-after-action"
        data-alert-setting-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#d8e4ff] transition hover:text-[#f5f7fb] focus:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-alert-setting-action-help-icon="lucide-circle-help" />
      </button>
      <span
        role="tooltip"
        data-alert-setting-action-help="hertzbeat-ui-action-tooltip"
        className="pointer-events-none absolute left-0 top-6 z-30 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        <span className="block text-[11px] leading-4 text-[#dbe4f0]">{body}</span>
        {impact ? <span className="mt-2 block border-t border-[#2b3039] pt-2 text-[11px] leading-4 text-[#98a2b3]">{impact}</span> : null}
      </span>
    </span>
  );
}

function AlertSettingActionCluster({
  actionKey,
  children,
  help
}: {
  actionKey: string;
  children: React.ReactNode;
  help: ReturnType<typeof alertSettingActionHelp>;
}) {
  return (
    <span data-alert-setting-action-cluster={actionKey} className="inline-flex items-center gap-1.5">
      {children}
      <AlertSettingActionHelp
        actionKey={actionKey}
        label={help.ariaLabel}
        body={help.body}
        impact={help.impact}
      />
    </span>
  );
}

function AlertSettingRowActionCluster({
  actionKey,
  children,
  help
}: {
  actionKey: string;
  children: React.ReactNode;
  help: ReturnType<typeof alertSettingActionHelp>;
}) {
  return (
    <span data-alert-setting-row-action-help={actionKey} className="inline-flex items-center gap-1">
      {children}
      <AlertSettingActionHelp
        actionKey={actionKey}
        label={help.ariaLabel}
        body={help.body}
        impact={help.impact}
      />
    </span>
  );
}

export function AlertSettingSurface({
  t,
  data,
  search,
  checkedIds,
  evidenceContext,
  formatTime,
  onSearchChange,
  onApplyFilter,
  onClearFilter,
  onRefresh,
  onNew,
  onNewRealtime,
  onDeleteSelected,
  onExport,
  onImport,
  onToggleEnabled,
  onEdit,
  onDelete,
  onCheckedIdsChange,
  requestedPageSize,
  onPageIndexChange,
  onPageSizeChange,
  pendingActionId = null,
  actionFeedback = null
}: AlertSettingSurfaceProps) {
  const rows = buildAlertSettingRows(data.list.content, t, formatTime);
  const selectedCount = checkedIds.length;
  const visibleIds = data.list.content.map(item => item.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every(id => checkedIds.includes(id));
  const emptyValue = t('common.none');
  const actionFeedbackContract = actionFeedback?.contract ?? null;
  const toggledRule = actionFeedbackContract === 'enable-success' ? actionFeedback?.toggledRule : null;
  const savedRule = actionFeedbackContract === 'save-success' ? actionFeedback?.savedRule : null;
  const currentPageIndex = data.list.pageIndex ?? 0;
  const currentPageSize = requestedPageSize || data.list.pageSize || 8;
  const visibleRowCount = data.list.content.length;
  const visibleRowFloor = currentPageIndex * currentPageSize + visibleRowCount;
  const totalElements = Math.max(data.list.totalElements ?? 0, visibleRowFloor);
  const totalPages = Math.max(1, Math.ceil(totalElements / currentPageSize));
  const currentPage = currentPageIndex + 1;
  const pageRangeFrom = totalElements === 0 || visibleRowCount === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageRangeTo = totalElements === 0 || visibleRowCount === 0
    ? 0
    : Math.min(totalElements, currentPageIndex * currentPageSize + visibleRowCount);
  const pageSizeOptions = [8, 15, 25];
  const periodicAvailable = hasReadyAlertSettingExecutor(data);
  const capabilityStatus = periodicAvailable ? 'realtime-ready-periodic-ready' : 'realtime-ready-periodic-blocked';
  const paginationSummary = t('common.pagination.summary', {
    page: currentPage,
    totalPages,
    from: pageRangeFrom,
    to: pageRangeTo,
    total: totalElements
  });
  const actionHelps = {
    refresh: alertSettingActionHelp(t, t('common.refresh'), 'refresh'),
    new: alertSettingActionHelp(t, t('alert.setting.action.new'), 'new'),
    delete: alertSettingActionHelp(t, t('common.button.delete-batch'), 'delete'),
    export: alertSettingActionHelp(t, t('common.button.export'), 'export'),
    import: alertSettingActionHelp(t, t('common.button.import'), 'import'),
    rowEnable: alertSettingActionHelp(t, t('common.enable'), 'row-enable'),
    rowEdit: alertSettingActionHelp(t, t('alert.setting.edit'), 'row-edit'),
    rowDelete: alertSettingActionHelp(t, t('alert.setting.delete'), 'row-delete')
  };
  const handlePageJumpChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    onPageIndexChange?.(nextPage - 1);
  };

  return (
    <div
      data-alert-setting-surface="otlp-hertzbeat-ui-setting-console"
      data-alert-setting-style-baseline={coldSettingVisual.canvasName}
      className={coldSettingVisual.canvas.root}
      style={coldSettingVisual.canvas.backgroundStyle}
    >
      <section className={coldSettingVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div
              data-alert-setting-header="hertzbeat-ui-compact-header"
              data-alert-setting-header-nesting-contract="flat-page-introduction"
              className="p-0"
            >
              <div className="max-w-[840px]">
                <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                  {t('menu.alert.setting')}
                </h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('alert.setting.copy')}
                </p>
                <div data-alert-setting-command-row="standard-equal-buttons" className={coldSettingVisual.button.row}>
                  <AlertSettingActionCluster actionKey="refresh" help={actionHelps.refresh}>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      data-alert-setting-command-action="refresh"
                      onClick={onRefresh}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                  </AlertSettingActionCluster>
                  <AlertSettingActionCluster actionKey="new" help={actionHelps.new}>
                    <Button
                      size="sm"
                      variant="primary"
                      className={coldPrimaryButtonClassName}
                      data-alert-setting-command-action="new"
                      onClick={onNew}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('alert.setting.action.new')}
                    </Button>
                  </AlertSettingActionCluster>
                  <AlertSettingActionCluster actionKey="delete" help={actionHelps.delete}>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onDeleteSelected}
                      data-alert-setting-command-action="delete-selected"
                      data-alert-setting-no-select-delete-trigger="angular-warning"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.delete-batch')}
                    </Button>
                  </AlertSettingActionCluster>
                </div>
                <div
                  data-alert-setting-capability-summary={capabilityStatus}
                  data-alert-setting-capability-owner="alert-threshold-create-entry"
                  data-alert-setting-capability-periodic={periodicAvailable ? 'ready' : 'blocked'}
                  className="mt-3 flex max-w-[780px] flex-wrap items-center gap-2 border-y border-[#202633] py-2 text-[11px] leading-5 text-[#98a2b3]"
                >
                  <span
                    data-alert-setting-capability-item="realtime"
                    className="inline-flex items-center gap-1.5 text-[#dbe4f0]"
                  >
                    <Activity className="h-3 w-3" aria-hidden="true" />
                    {t('alert.setting.capability.realtime.ready')}
                  </span>
                  <span
                    data-alert-setting-capability-item="periodic"
                    className="inline-flex items-center gap-1.5"
                  >
                    <Timer className="h-3 w-3" aria-hidden="true" />
                    {periodicAvailable
                      ? t('alert.setting.capability.periodic.ready')
                      : t('alert.setting.capability.periodic.blocked')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div data-alert-setting-admin-layout="full-width-admin-list" className="space-y-5">
            {evidenceContext ? (
              <section
                data-alert-setting-evidence-context="signal-route"
                data-alert-setting-evidence-layering="flat-context-band"
                data-alert-setting-evidence-density="compact-strip"
                data-alert-setting-evidence-signal={evidenceContext.signal}
                data-alert-setting-prefill-labels={evidenceContext.labelsText}
                className="mt-4 border-y border-[#27303c] bg-[#0b0f15]/80 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#eef2f7]">{evidenceContext.title}</p>
                    <p className="mt-0.5 max-w-[900px] text-[12px] leading-5 text-[#9099a7]">{evidenceContext.copy}</p>
                  </div>
                  {evidenceContext.returnHref ? (
                    <a
                      data-alert-setting-evidence-return="true"
                      href={evidenceContext.returnHref}
                      className="inline-flex h-7 shrink-0 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 text-[11px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                    >
                      {t('alert.rule.evidence.return')}
                    </a>
                  ) : null}
                </div>
                <div
                  data-alert-setting-evidence-labels={evidenceContext.labelsText ? 'provided-labels' : 'localized-fallback'}
                  data-alert-setting-evidence-labels-layout="inline-strip"
                  className="mt-2 font-mono text-[11px] leading-5 text-[#9aa5b5]"
                >
                  {evidenceContext.labelsText || emptyValue}
                </div>
                <div
                  data-alert-setting-evidence-facts-layout="inline-chips"
                  className="mt-2 flex flex-wrap items-center gap-1.5"
                >
                  {evidenceContext.rows.map(row => (
                    <span
                      key={`${row.label}-${row.value}`}
                      data-alert-setting-evidence-fact="compact-chip"
                      className="inline-flex max-w-[260px] items-center gap-1.5 rounded-[3px] border border-[#222a34] bg-[#101217] px-2 py-1 text-[11px] leading-4"
                      title={`${row.label}: ${row.value} · ${row.meta}`}
                    >
                      <span className="shrink-0 text-[#788292]">{row.label}</span>
                      <span className="truncate font-semibold text-[#eef2f7]">{row.value}</span>
                      <span className="truncate text-[#778091]">{row.meta}</span>
                    </span>
                  ))}
                </div>
                {evidenceContext.workflowActions.length > 0 ? (
                  <div
                    data-alert-setting-workflow-actions="signal-alert-next-steps"
                    data-alert-setting-workflow-actions-owner="signal-alert-handoff"
                    data-alert-setting-workflow-actions-layout="secondary-inline-row"
                    className="mt-2 flex flex-wrap items-center gap-1.5"
                  >
                    {evidenceContext.workflowActions.map(action => (
                      <a
                        key={action.key}
                        data-alert-setting-workflow-action={action.key}
                        href={action.href}
                        title={action.copy}
                        className="inline-flex h-7 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-2.5 text-[11px] font-semibold text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                      >
                        <span>{action.label}</span>
                        <span className="sr-only">{action.copy}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            <section className="min-w-0">
              <SearchRow
                data-alert-setting-toolbar="hertzbeat-ui-query-toolbar"
                data-alert-setting-search-translation-contract="angular-app-entry-search"
                data-alert-setting-search-translation-owner="alert-setting-query-state"
                data-alert-setting-search-translation-source="/apps/defines"
                value={search}
                placeholder={t('alert.setting.search')}
                searchLabel={t('common.search')}
                clearLabel={t('common.clear')}
                onValueChange={onSearchChange}
                onSearch={onApplyFilter}
                onClear={search ? onClearFilter : undefined}
              />
              <HzBatchToolbar
                data-alert-setting-batch-owner="hertzbeat-ui-batch-toolbar"
                data-alert-setting-import-export-contract="angular-import-export"
                selectionCount={selectedCount}
                selectionLabel={t('alert.setting.batch.selection-label')}
                variant="embedded"
                actions={[
                  {
                    id: 'export-type',
                    label: t('common.button.export'),
                    busy: pendingActionId === 'export',
                    busyLabel: t('common.notify.export-pending'),
                    disabled: Boolean(pendingActionId && pendingActionId !== 'export'),
                    help: {
                      label: actionHelps.export.ariaLabel,
                      body: actionHelps.export.body,
                      impact: actionHelps.export.impact,
                      rootProps: {
                        'data-alert-setting-action-help-key': 'batch-export',
                        'data-alert-setting-action-help-placement': 'inline-action'
                      },
                      triggerProps: {
                        'data-alert-setting-action-help-trigger': 'hertzbeat-ui-action-help',
                        'data-alert-setting-action-help-style': 'icon-after-action',
                        'data-alert-setting-action-help-visual': 'circle-help-icon'
                      },
                      tooltipProps: {
                        'data-alert-setting-action-help': 'hertzbeat-ui-action-tooltip'
                      }
                    },
                    onSelect: onExport,
                    buttonProps: {
                      'data-alert-setting-command-action': 'export',
                      'data-alert-setting-export-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                      'data-alert-setting-export-trigger': 'json-excel-dialog',
                      'data-alert-setting-no-select-export-trigger': 'angular-warning'
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>
                  },
                  {
                    id: 'import',
                    label: t('common.button.import'),
                    busy: pendingActionId === 'import',
                    busyLabel: t('common.notify.import-pending'),
                    disabled: Boolean(pendingActionId && pendingActionId !== 'import'),
                    help: {
                      label: actionHelps.import.ariaLabel,
                      body: actionHelps.import.body,
                      impact: actionHelps.import.impact,
                      rootProps: {
                        'data-alert-setting-action-help-key': 'batch-import',
                        'data-alert-setting-action-help-placement': 'inline-action'
                      },
                      triggerProps: {
                        'data-alert-setting-action-help-trigger': 'hertzbeat-ui-action-help',
                        'data-alert-setting-action-help-style': 'icon-after-action',
                        'data-alert-setting-action-help-visual': 'circle-help-icon'
                      },
                      tooltipProps: {
                        'data-alert-setting-action-help': 'hertzbeat-ui-action-tooltip'
                      }
                    },
                    onSelect: onImport,
                    buttonProps: {
                      'data-alert-setting-command-action': 'import',
                      'data-alert-setting-import-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                      'data-alert-setting-import-trigger': 'file-upload'
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>
                  },
                  {
                    id: 'delete',
                    label: t('common.button.delete-batch'),
                    tone: 'critical',
                    disabled: Boolean(pendingActionId && pendingActionId !== 'delete'),
                    help: {
                      label: actionHelps.delete.ariaLabel,
                      body: actionHelps.delete.body,
                      impact: actionHelps.delete.impact,
                      rootProps: {
                        'data-alert-setting-action-help-key': 'batch-delete',
                        'data-alert-setting-action-help-placement': 'inline-action'
                      },
                      triggerProps: {
                        'data-alert-setting-action-help-trigger': 'hertzbeat-ui-action-help',
                        'data-alert-setting-action-help-style': 'icon-after-action',
                        'data-alert-setting-action-help-visual': 'circle-help-icon'
                      },
                      tooltipProps: {
                        'data-alert-setting-action-help': 'hertzbeat-ui-action-tooltip'
                      }
                    },
                    onSelect: onDeleteSelected,
                    buttonProps: {
                      'data-alert-setting-command-action': 'delete-selected',
                      'data-alert-setting-delete-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                      'data-alert-setting-no-select-delete-trigger': 'angular-warning'
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>
                  }
                ]}
              />
              {actionFeedback ? (
                <div data-alert-setting-action-feedback={actionFeedback.tone}>
                  <HzInlineFeedback
                    tone={actionFeedback.tone}
                    title={actionFeedback.title}
                    description={actionFeedback.description}
                    meta={pendingActionId ? t('common.loading') : undefined}
                    variant="embedded"
                    data-alert-setting-action-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-alert-setting-delete-failure={actionFeedbackContract === 'delete' ? 'angular-notify-title-detail' : undefined}
                    data-alert-setting-delete-failure-owner={
                      actionFeedbackContract === 'delete' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-delete-feedback-title={
                      actionFeedbackContract === 'delete' ? 'common.notify.delete-fail' : undefined
                    }
                    data-alert-setting-delete-feedback-detail={actionFeedbackContract === 'delete' ? 'backend-message' : undefined}
                    data-alert-setting-enable-failure={actionFeedbackContract === 'enable' ? 'angular-notify-title-detail' : undefined}
                    data-alert-setting-enable-failure-owner={
                      actionFeedbackContract === 'enable' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-enable-feedback-title={
                      actionFeedbackContract === 'enable' ? 'common.notify.edit-fail' : undefined
                    }
                    data-alert-setting-enable-feedback-detail={actionFeedbackContract === 'enable' ? 'backend-message' : undefined}
                    data-alert-setting-enable-success={
                      actionFeedbackContract === 'enable-success' ? 'rule-enable-state-confirmed' : undefined
                    }
                    data-alert-setting-enable-success-owner={
                      actionFeedbackContract === 'enable-success' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-enable-success-state={
                      actionFeedbackContract === 'enable-success' ? (toggledRule?.enabled ? 'enabled' : 'disabled') : undefined
                    }
                    data-alert-setting-delete-success={
                      actionFeedbackContract === 'delete-success' ? 'rule-delete-confirmed' : undefined
                    }
                    data-alert-setting-delete-success-owner={
                      actionFeedbackContract === 'delete-success' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-delete-success-count={
                      actionFeedbackContract === 'delete-success' ? String(actionFeedback.deletedCount ?? 0) : undefined
                    }
                    data-alert-setting-export-failure={actionFeedbackContract === 'export-fail' ? 'angular-notify-title-detail' : undefined}
                    data-alert-setting-export-failure-owner={
                      actionFeedbackContract === 'export-fail' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-export-feedback-title={
                      actionFeedbackContract === 'export-fail' ? 'common.notify.export-fail' : undefined
                    }
                    data-alert-setting-export-feedback-detail={actionFeedbackContract === 'export-fail' ? 'backend-message' : undefined}
                    data-alert-setting-no-select-delete={actionFeedbackContract === 'no-select-delete' ? 'angular-warning' : undefined}
                    data-alert-setting-no-select-delete-owner={
                      actionFeedbackContract === 'no-select-delete' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-no-select-export={actionFeedbackContract === 'no-select-export' ? 'angular-warning' : undefined}
                    data-alert-setting-no-select-export-owner={
                      actionFeedbackContract === 'no-select-export' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-import-success={actionFeedbackContract === 'import-success' ? 'angular-notify-title' : undefined}
                    data-alert-setting-import-success-owner={
                      actionFeedbackContract === 'import-success' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-import-failure={actionFeedbackContract === 'import-fail' ? 'angular-notify-title-detail' : undefined}
                    data-alert-setting-import-failure-owner={
                      actionFeedbackContract === 'import-fail' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-import-feedback-title={
                      actionFeedbackContract === 'import-success'
                        ? 'common.notify.import-success'
                        : actionFeedbackContract === 'import-fail'
                          ? 'common.notify.import-fail'
                          : undefined
                    }
                    data-alert-setting-import-feedback-detail={actionFeedbackContract === 'import-fail' ? 'backend-message' : undefined}
                    data-alert-setting-save-success={
                      actionFeedbackContract === 'save-success' ? 'rule-write-confirmed' : undefined
                    }
                    data-alert-setting-save-success-owner={
                      actionFeedbackContract === 'save-success' ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-alert-setting-save-feedback-title={
                      actionFeedbackContract === 'save-success' ? 'alert.setting.save.success.title' : undefined
                    }
                    data-alert-setting-save-feedback-detail={
                      actionFeedbackContract === 'save-success' ? (savedRule?.enabled ? 'enabled' : 'disabled') : undefined
                    }
                  />
                </div>
              ) : null}

              <div
                data-alert-setting-table-shell="hertzbeat-ui-dense-table"
                className="min-w-0 max-w-full overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div
                  data-alert-setting-table-layout="fixed-truncate"
                  className="overflow-hidden"
                >
                  <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[44px] px-3 py-2.5">
                          <Checkbox
                            data-alert-setting-select-all="hertzbeat-ui-checkbox"
                            checked={allVisibleChecked}
                            disabled={visibleIds.length === 0}
                            aria-label={t('common.select')}
                            containerClassName="min-h-0 justify-center"
                            onChange={event => {
                              onCheckedIdsChange(event.target.checked ? visibleIds : []);
                            }}
                          />
                        </th>
                        <th className="w-[17%] px-3 py-2.5">{t('alert.setting.name')}</th>
                        <th className="w-[12%] px-3 py-2.5">{t('alert.setting.type')}</th>
                        <th className="w-[19%] px-3 py-2.5">{t('alert.setting.expr')}</th>
                        <th className="w-[16%] px-3 py-2.5">{t('alert.setting.content')}</th>
                        <th className="w-[15%] px-3 py-2.5">{t('alert.setting.bind-labels')}</th>
                        <th className="w-[8%] px-3 py-2.5">{t('common.enable')}</th>
                        <th className="w-[13%] px-3 py-2.5">{t('common.edit-time')}</th>
                        <th className="w-[150px] px-3 py-2.5">{t('common.edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? rows.map((row, index) => {
                        const original = data.list.content[index];
                        const checked = checkedIds.includes(original.id);
                        const isSavedRuleRow = Boolean(
                          savedRule
                            && original.name === savedRule.name
                            && original.type === savedRule.type
                            && original.expr === savedRule.expr
                        );
                        const isToggledRuleRow = Boolean(toggledRule && original.id === toggledRule.id);
                        return (
                          <tr
                            key={row.key}
                            data-alert-setting-row={row.key}
                            data-alert-setting-saved-row={isSavedRuleRow ? 'write-confirmed' : undefined}
                            data-alert-setting-saved-row-enabled={isSavedRuleRow ? String(Boolean(original.enable)) : undefined}
                            data-alert-setting-enabled-row={isToggledRuleRow ? 'write-confirmed' : undefined}
                            data-alert-setting-enabled-row-state={isToggledRuleRow ? (toggledRule?.enabled ? 'enabled' : 'disabled') : undefined}
                            className={cn(
                              'border-t border-[#252b34] transition hover:bg-[#111721]',
                              isSavedRuleRow || isToggledRuleRow
                                ? 'bg-[#102018] ring-1 ring-inset ring-[#2f855a] hover:bg-[#12251b]'
                                : checked
                                  ? 'bg-[#10141d]'
                                  : 'bg-[#0b0c0e]'
                            )}
                          >
                            <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                              <Checkbox
                                data-alert-setting-row-checkbox="hertzbeat-ui-checkbox"
                                checked={checked}
                                aria-label={row.name}
                                containerClassName="min-h-0"
                                onChange={event => {
                                  onCheckedIdsChange(
                                    event.target.checked
                                      ? [...checkedIds, original.id]
                                      : checkedIds.filter(value => value !== original.id)
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]" title={row.name}>
                              <span className="block truncate">{row.name}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                {row.type}
                              </span>
                              {row.runtimeSummary ? (
                                <div
                                  data-alert-setting-runtime-summary="period-times-priority"
                                  className="mt-1 text-[10px] leading-4 text-[#858d9a]"
                                >
                                  {row.runtimeSummary}
                                </div>
                              ) : null}
                            </td>
                            <td className="truncate px-3 py-2.5" title={row.expr}>{row.expr}</td>
                            <td className="truncate px-3 py-2.5" title={row.template}>{row.template}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {row.labels.length > 0 ? row.labels.map(label => (
                                  <span key={`${row.key}-${label}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                    {label}
                                  </span>
                                )) : <span data-alert-setting-empty-labels="localized-fallback" className="text-[#6f7681]">{emptyValue}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                              <AlertSettingRowActionCluster actionKey="row-enable" help={actionHelps.rowEnable}>
                                <Checkbox
                                  data-alert-setting-enable-checkbox="hertzbeat-ui-checkbox"
                                  data-alert-setting-command-action="row-enable"
                                  checked={Boolean(original.enable)}
                                  containerClassName="min-h-0"
                                  onChange={event => onToggleEnabled(original.id, event.target.checked)}
                                  label={<span className="sr-only">{row.enabledLabel}</span>}
                                />
                              </AlertSettingRowActionCluster>
                            </td>
                            <td className="px-3 py-2.5 text-[#858d9a]">{row.updatedAt}</td>
                            <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <AlertSettingRowActionCluster actionKey="row-edit" help={actionHelps.rowEdit}>
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className={coldIconButtonClassName}
                                    data-alert-setting-command-action="row-edit"
                                    onClick={() => onEdit(original.id)}
                                    title={t('alert.setting.edit')}
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('alert.setting.edit')}</span>
                                  </Button>
                                </AlertSettingRowActionCluster>
                                <AlertSettingRowActionCluster actionKey="row-delete" help={actionHelps.rowDelete}>
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className={coldIconButtonClassName}
                                    data-alert-setting-command-action="row-delete"
                                    onClick={() => onDelete(original.id)}
                                    title={t('alert.setting.delete')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('alert.setting.delete')}</span>
                                  </Button>
                                </AlertSettingRowActionCluster>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr
                          data-alert-setting-empty-state="hertzbeat-ui-table-empty"
                          data-alert-setting-empty-layout="visible-table-start"
                          className="border-t border-[#252b34] bg-[#0b0c0e]"
                        >
                          <td colSpan={9} className="h-[240px] px-6 py-8 text-left text-[#a9b0bb]">
                            <div className="flex w-full max-w-[760px] flex-col items-start gap-3">
                              <span
                                data-alert-setting-empty-icon="hertzbeat-ui-empty-box"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                              >
                                <Inbox className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <div data-alert-setting-empty-copy="true" className="space-y-1.5">
                                <div className="text-[13px] font-semibold text-[#eef2f7]">{t('alert.setting.empty.title')}</div>
                                <p
                                  data-alert-setting-empty-risk-copy="connect-or-import-before-enable"
                                  className="max-w-[620px] text-[12px] leading-5 text-[#8d95a5]"
                                >
                                  {t('alert.setting.empty.copy')}
                                </p>
                              </div>
                              <div
                                data-alert-setting-empty-actions="create-import-connect"
                                className="flex flex-wrap items-center justify-start gap-2"
                              >
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className={coldPrimaryButtonClassName}
                                  onClick={onNewRealtime ?? onNew}
                                  data-alert-setting-command-action="empty-create-realtime"
                                  data-alert-setting-empty-action="create-realtime"
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('alert.setting.empty.action.create-realtime')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className={coldButtonClassName}
                                  onClick={onImport}
                                  data-alert-setting-command-action="empty-import-rules"
                                  data-alert-setting-empty-action="import-rules"
                                >
                                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('alert.setting.empty.action.import')}
                                </Button>
                                <Link
                                  href="/monitors"
                                  className={cn(coldButtonClassName, 'inline-flex items-center justify-center gap-2 no-underline')}
                                  data-alert-setting-command-action="empty-connect-data"
                                  data-alert-setting-empty-action="connect-data"
                                >
                                  <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('alert.setting.empty.action.connect-data')}
                                </Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div
                  data-alert-setting-pagination="angular-nz-table-server"
                  data-alert-setting-pagination-owner="hertzbeat-ui-pagination-bar"
                  data-alert-setting-pagination-contract="angular-page-index-size"
                >
                  <HzPaginationBar
                    summary={paginationSummary}
                    pageSizeLabel={t('common.page-size')}
                    pageSizeValue={String(currentPageSize)}
                    pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
                    pageJumpLabel={t('common.page')}
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
                    pageSizeSelectProps={
                      {
                        'data-alert-setting-pagination-page-size-owner': 'hertzbeat-ui-select'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
                    }
                    pageJumpInputProps={
                      {
                        'data-alert-setting-pagination-page-jump-owner': 'hertzbeat-ui-input'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                    }
                    previousButtonProps={
                      {
                        'data-alert-setting-pagination-action': 'previous'
                      } as React.ComponentProps<typeof HzPaginationBar>['previousButtonProps']
                    }
                    nextButtonProps={
                      {
                        'data-alert-setting-pagination-action': 'next'
                      } as React.ComponentProps<typeof HzPaginationBar>['nextButtonProps']
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
