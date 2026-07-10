'use client';

import React from 'react';
import { CircleHelp, Cloud, Copy, Inbox, MoreHorizontal, Power, PowerOff, RefreshCw, Trash2, UploadCloud, X } from 'lucide-react';
import { HzButton, HzCodeEditor, HzConfirmDialog, HzInlineFeedback, HzPaginationBar, HzTableRowActionButton } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { buildCollectorClusterHealthEvidence, buildCollectorTableRows } from '../../lib/collector-manage/view-model';
import type { CollectorSummary, PageResult } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type CollectorActionTone = 'success' | 'warning' | 'critical';
type CollectorMutationAction = 'delete' | 'online' | 'offline';
export type CollectorDeleteTarget = {
  collectors: string[];
  label: string;
  mode: 'single' | 'batch';
  action?: CollectorMutationAction;
};

type CollectorManageSurfaceProps = {
  t: Translator;
  data: { list: PageResult<CollectorSummary> };
  search: string;
  selectedCollectors?: string[];
  actionMessage?: string | null;
  actionError?: string | null;
  actionMeta?: string | null;
  actionTone?: CollectorActionTone;
  actionFeedbackContract?: string | null;
  loadError?: string | null;
  deleteTarget?: CollectorDeleteTarget | null;
  isDeletePending?: boolean;
  isLoadPending?: boolean;
  deployOpen?: boolean;
  deployName?: string;
  deployIdentity?: string;
  deployHost?: string;
  deployDockerShell?: string;
  deployPackageShell?: string;
  deployError?: string | null;
  deployCopyMessage?: string | null;
  isDeployPending?: boolean;
  deployNameValidationVisible?: boolean;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSearchClear: () => void;
  onRefresh: () => void;
  onDeploy: () => void;
  onGoOnline: () => void;
  onGoOffline: () => void;
  onDelete: () => void;
  onSelectedCollectorsChange?: (collectors: string[]) => void;
  pageSizeOptions?: number[];
  onPageIndexChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onDeleteCancel?: () => void;
  onDeleteConfirm?: () => void;
  onDeployNameChange?: (value: string) => void;
  onDeployGenerate?: () => void;
  onDeployClose?: () => void;
  onDeployCopy?: (value: string) => void;
  onRowGoOnline: (collector: string) => void;
  onRowGoOffline: (collector: string) => void;
  onRowDelete: (collector: string) => void;
};

const coldCollectorVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white disabled:opacity-40';

const collectorActionMenuRootClassName = 'relative z-40 inline-block overflow-visible';
const collectorActionMenuPanelBaseClassName =
  'absolute top-9 z-[100] min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]';

function statusClassName(statusTone: 'success' | 'danger') {
  if (statusTone === 'success') {
    return 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]';
  }
  return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
}

function resolveCollectorTargetAction(target?: CollectorDeleteTarget | null): CollectorMutationAction {
  return target?.action ?? 'delete';
}

function resolveCollectorConfirmTitle(target: CollectorDeleteTarget | null | undefined, t: Translator) {
  const action = resolveCollectorTargetAction(target);
  if (action === 'online') return t(target?.mode === 'batch' ? 'collector.confirm.online-batch' : 'collector.confirm.online');
  if (action === 'offline') return t(target?.mode === 'batch' ? 'collector.confirm.offline-batch' : 'collector.confirm.offline');
  return t(target?.mode === 'batch' ? 'common.confirm.delete-batch' : 'common.confirm.delete');
}

function CollectorActionHelp({
  id,
  label,
  copy,
  scope = 'action'
}: {
  id: string;
  label: string;
  copy: string;
  scope?: 'action' | 'row-action';
}) {
  const tooltipId = `collector-action-help-${id}`;
  return (
    <span {...(scope === 'row-action' ? { 'data-collector-row-action-help': id } : { 'data-collector-action-help': id })} className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
        data-collector-action-help-style="icon-after-action"
        data-collector-action-help-visual="circle-help-icon"
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#d8e4ff] transition hover:text-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-collector-action-help-icon="lucide-circle-help" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        {...(scope === 'row-action' ? { 'data-collector-row-action-help-tooltip': id } : { 'data-collector-action-help-tooltip': id })}
        className="pointer-events-none absolute left-0 top-6 z-50 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left text-[11px] leading-4 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
      >
        {copy}
      </span>
    </span>
  );
}

function EmptyTableRow({
  colSpan,
  copy,
  state = 'plain',
  t,
  title
}: {
  colSpan: number;
  copy?: string;
  state?: 'plain' | 'filtered';
  t: Translator;
  title?: string;
}) {
  return (
    <tr data-collector-empty-state="hertzbeat-ui-table-empty" className="bg-[#0b0c0e]">
      <td colSpan={colSpan} className="h-[240px] px-3 py-10 text-center text-[#858d9a]">
        <div className="inline-flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div data-collector-empty-title={state} className="text-[13px] font-semibold text-[#dbe4f0]">
            {title || t('common.no-data')}
          </div>
          {copy ? (
            <div data-collector-empty-copy={state} className="max-w-[360px] text-[12px] leading-5 text-[#858d9a]">
              {copy}
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function CollectorManageSurface({
  t,
  data,
  search,
  selectedCollectors,
  actionMessage,
  actionError,
  actionMeta,
  actionTone,
  actionFeedbackContract,
  loadError,
  deleteTarget,
  isDeletePending,
  isLoadPending,
  deployOpen,
  deployName,
  deployIdentity,
  deployHost,
  deployDockerShell,
  deployPackageShell,
  deployError,
  deployCopyMessage,
  isDeployPending,
  deployNameValidationVisible,
  formatTime,
  onSearchChange,
  onSearch,
  onSearchClear,
  onRefresh,
  onDeploy,
  onGoOnline,
  onGoOffline,
  onDelete,
  onSelectedCollectorsChange,
  pageSizeOptions = [8, 15, 25],
  onPageIndexChange,
  onPageSizeChange,
  onDeleteCancel,
  onDeleteConfirm,
  onDeployNameChange,
  onDeployGenerate,
  onDeployClose,
  onDeployCopy,
  onRowGoOnline,
  onRowGoOffline,
  onRowDelete
}: CollectorManageSurfaceProps) {
  const collectors = data.list.content ?? [];
  const rows = buildCollectorTableRows(collectors, t, formatTime);
  const clusterHealth = buildCollectorClusterHealthEvidence(collectors, formatTime, t);
  const collectorNames = rows.map(row => row.name);
  const immutableCollectorNames = rows.filter(row => !row.canMutate).map(row => row.name);
  const resolvedSelectedCollectors = selectedCollectors ?? [];
  const currentPageIndex = Math.max(0, data.list.pageIndex ?? 0);
  const currentPageSize = Math.max(1, data.list.pageSize ?? pageSizeOptions[0] ?? 8);
  const totalElements = data.list.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / currentPageSize));
  const currentPage = Math.min(currentPageIndex + 1, totalPages);
  const pageStart = totalElements === 0 || rows.length === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageEnd = totalElements === 0 ? 0 : Math.min(totalElements, currentPageIndex * currentPageSize + rows.length);
  const allSelected = collectorNames.length > 0 && collectorNames.every(name => resolvedSelectedCollectors.includes(name));
  const actionFeedbackTitle = actionError ?? actionMessage ?? '';
  const resolvedActionTone = actionTone ?? (actionError ? 'critical' : 'success');
  const targetAction = resolveCollectorTargetAction(deleteTarget);
  const mutationPending = Boolean(isDeletePending);
  const tableLoading = Boolean(isLoadPending || mutationPending);
  const resolvedActionFeedbackContract =
    actionFeedbackContract ??
    (resolvedActionTone === 'warning' ? 'angular-no-select-warning' : resolvedActionTone === 'critical' ? 'angular-delete-fail' : 'angular-delete-notify');
  const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null);
  const [localDeployCopyMessage, setLocalDeployCopyMessage] = React.useState<string | null>(null);
  const localDeployCopyTimerRef = React.useRef<number | null>(null);
  const trimmedDeployName = deployName?.trim() ?? '';
  const resolvedDeployIdentity = deployIdentity ?? '';
  const visibleDeployCopyMessage = deployCopyMessage || localDeployCopyMessage;
  const showDeployNameValidation = Boolean(deployNameValidationVisible && !trimmedDeployName && !resolvedDeployIdentity);
  const isFilteredEmpty = rows.length === 0 && search.trim().length > 0;
  const paginationSummary = t('collector.pagination.summary', {
    page: currentPage,
    totalPages,
    from: pageStart,
    to: pageEnd,
    total: totalElements
  });

  function handlePageJumpChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    const nextPageIndex = Math.min(Math.max(parsed, 1), totalPages) - 1;
    onPageIndexChange?.(nextPageIndex);
  }

  React.useEffect(() => () => {
    if (localDeployCopyTimerRef.current) {
      window.clearTimeout(localDeployCopyTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    setLocalDeployCopyMessage(null);
  }, [deployOpen, resolvedDeployIdentity]);

  function handleDeployCopy(value: string) {
    if (localDeployCopyTimerRef.current) {
      window.clearTimeout(localDeployCopyTimerRef.current);
    }
    setLocalDeployCopyMessage(t('common.notify.copy-success'));
    localDeployCopyTimerRef.current = window.setTimeout(() => {
      setLocalDeployCopyMessage(null);
      localDeployCopyTimerRef.current = null;
    }, 3000);
    onDeployCopy?.(value);
  }

  return (
    <>
      <div
        data-collector-manage-surface="otlp-hertzbeat-ui-collector-console"
        data-collector-manage-style-baseline={coldCollectorVisual.canvasName}
        className={coldCollectorVisual.canvas.root}
        style={coldCollectorVisual.canvas.backgroundStyle}
      >
        <section className={coldCollectorVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div
              data-collector-header="hertzbeat-ui-compact-header"
              data-collector-header-nesting-contract="flat-page-introduction"
              className="p-0"
            >
              <div className="max-w-[840px]">
                <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                  {t('menu.advanced.collector')}
                </h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('setting.collector.copy')}
                </p>
                <div data-collector-command-row="standard-equal-buttons" className={coldCollectorVisual.button.row}>
                  <span className="inline-flex items-center gap-1">
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh} data-collector-command-action="refresh">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <CollectorActionHelp id="refresh" label={t('collector.action.refresh.help-label')} copy={t('collector.action.refresh.help')} />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className={coldPrimaryButtonClassName}
                      onClick={onDeploy}
                      data-collector-command-action="deploy-open"
                      data-collector-deploy-open="angular-deploy-modal"
                    >
                      <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('collector.deploy')}
                    </Button>
                    <CollectorActionHelp id="deploy" label={t('collector.action.deploy.help-label')} copy={t('collector.action.deploy.help')} />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onGoOnline}
                      data-collector-command-action="selected-online"
                      data-collector-online-selected="angular-batch-online-entry"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('collector.online')}
                    </Button>
                    <CollectorActionHelp id="online" label={t('collector.action.online.help-label')} copy={t('collector.action.online.help')} />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onGoOffline}
                      data-collector-command-action="selected-offline"
                      data-collector-offline-selected="angular-batch-offline-entry"
                    >
                      <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('collector.offline')}
                    </Button>
                    <CollectorActionHelp id="offline" label={t('collector.action.offline.help-label')} copy={t('collector.action.offline.help')} />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onDelete}
                      data-collector-command-action="selected-delete"
                      data-collector-delete-selected="angular-batch-delete-entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('collector.delete')}
                    </Button>
                    <CollectorActionHelp id="delete" label={t('collector.action.delete.help-label')} copy={t('collector.action.delete.help')} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            data-collector-health-evidence="cluster-status"
            data-collector-health-tone={clusterHealth.tone}
            className="mb-5 grid gap-3 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.28)] md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-[#7e8494]">{clusterHealth.title}</div>
              <div className="mt-1 text-[14px] font-semibold text-[#eef2f7]">{clusterHealth.copy}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="inline-flex items-center justify-center rounded-[3px] border border-[#303743] bg-[#101217] px-2.5 py-1 text-[11px] font-semibold text-[#cbd5e1]">
                {clusterHealth.meta}
              </span>
              <span
                data-collector-health-freshness="last-seen"
                className="inline-flex items-center justify-center rounded-[3px] border border-[#303743] bg-[#101217] px-2.5 py-1 text-[11px] font-semibold text-[#9aa3b2]"
              >
                {clusterHealth.freshness}
              </span>
            </div>
          </div>

          <div
            data-collector-admin-layout="full-width-admin-list"
            data-collector-delete-warning-contract="angular-no-select-warning"
            data-collector-delete-confirm-contract="angular-modal-confirm"
            data-collector-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
            data-collector-delete-feedback-contract="angular-delete-notify"
            data-collector-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
            data-collector-delete-api-contract="angular-repeated-collectors-query"
            data-collector-delete-page-clamp-contract="angular-update-page-index"
            data-collector-delete-page-clamp-owner="route-state-contract"
            data-collector-selection-reset-contract="angular-load-clears-selection"
            data-collector-selection-reset-owner="route-state-contract"
            data-collector-search-submit-contract="angular-enter-and-clear"
            data-collector-search-clear-contract="angular-cleared-load"
            data-collector-search-clear-owner="shared-search-row"
            data-collector-operate-warning-contract="angular-no-select-online-offline"
            data-collector-operate-confirm-contract="angular-modal-confirm"
            data-collector-operate-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
            data-collector-operate-feedback-contract="angular-operate-notify"
            data-collector-operate-feedback-contract-owner="hertzbeat-ui-inline-feedback"
            data-collector-operate-api-contract="angular-put-repeated-collectors-query"
            data-collector-mutation-loading-contract="angular-nz-table-loading"
            data-collector-load-failure-contract="angular-console-only-shell"
            data-collector-load-failure-owner="collector-route-controller"
            data-collector-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
            data-collector-deploy-modal-contract="angular-generate-identity-modal"
            data-collector-deploy-api-contract="angular-post-generate-identity"
            data-collector-deploy-failure-contract="angular-apply-fail-notification"
            data-collector-deploy-validation-contract="angular-submit-marks-required"
            data-collector-deploy-validation-trim-contract="hertzbeat-required-after-trim"
            data-collector-deploy-validation-trim-owner="collector-route-controller"
            data-collector-deploy-loading-contract="angular-nz-ok-loading"
            data-collector-deploy-mask-contract="angular-mask-closable-false"
            data-collector-deploy-width-contract="angular-width-45-percent"
            data-collector-deploy-field-layout-contract="angular-label-7-control-12"
            data-collector-deploy-field-layout-owner="route-form-field-grid"
            data-collector-deploy-command-contract="angular-docker-package-shells"
            data-collector-deploy-command-owner="hertzbeat-ui-code-editor"
            data-collector-deploy-package-link-contract="angular-github-releases-link"
            data-collector-deploy-copy-contract="angular-copy-identity"
            data-collector-deploy-copy-feedback-contract="angular-copy-success-duration-800"
            data-collector-deploy-result-close-contract="angular-danger-close-after-identity"
            data-collector-deploy-result-close-owner="hertzbeat-ui-button"
            data-collector-deploy-close-reset-contract="angular-close-clears-name"
            data-collector-deploy-close-reset-owner="collector-route-controller"
            data-collector-deploy-close-pending-result-contract="angular-close-ignores-late-generate"
            data-collector-deploy-close-pending-result-owner="collector-route-controller"
            className="space-y-5"
          >
            <section className="min-w-0">
              <SearchRow
                data-collector-toolbar="hertzbeat-ui-table-toolbar"
                data-collector-search-owner="shared-search-row"
                value={search}
                placeholder={t('collector.name')}
                searchLabel={t('common.search')}
                clearLabel={t('common.clear')}
                inputWidthClassName="w-[360px]"
                onValueChange={onSearchChange}
                onSearch={onSearch}
                onClear={onSearchClear}
                data-collector-search-submit-contract="angular-enter-and-clear"
                data-collector-search-clear-contract="angular-cleared-load"
                data-collector-search-clear-owner="shared-search-row"
                trailingActions={
                  <div className="text-[12px] font-semibold text-[#858d9a]">
                    {t('setting.collector.selected-count', { count: resolvedSelectedCollectors.length })}
                  </div>
                }
              />
              {actionFeedbackTitle ? (
                <HzInlineFeedback
                  tone={resolvedActionTone}
                  title={actionFeedbackTitle}
                  meta={actionMeta ?? undefined}
                  variant="embedded"
                  data-collector-action-feedback={resolvedActionTone}
                  data-collector-action-feedback-contract={resolvedActionFeedbackContract}
                  data-collector-delete-feedback={
                    resolvedActionFeedbackContract.startsWith('angular-delete') || resolvedActionFeedbackContract === 'angular-no-select-warning'
                      ? resolvedActionFeedbackContract
                      : undefined
                  }
                  data-collector-delete-feedback-owner="hertzbeat-ui-inline-feedback"
                  data-collector-delete-feedback-title={resolvedActionFeedbackContract === 'angular-delete-fail' ? 'common.notify.delete-fail' : undefined}
                  data-collector-delete-feedback-detail={resolvedActionFeedbackContract === 'angular-delete-fail' && actionMeta ? 'backend-message' : undefined}
                  data-collector-operate-feedback={
                    resolvedActionFeedbackContract.startsWith('angular-operate') || resolvedActionFeedbackContract.startsWith('angular-no-select-o')
                      ? resolvedActionFeedbackContract
                      : undefined
                  }
                  data-collector-operate-feedback-owner="hertzbeat-ui-inline-feedback"
                  data-collector-operate-feedback-title={resolvedActionFeedbackContract === 'angular-operate-fail' ? 'common.notify.operate-fail' : undefined}
                  data-collector-operate-feedback-detail={resolvedActionFeedbackContract === 'angular-operate-fail' && actionMeta ? 'backend-message' : undefined}
                />
              ) : null}

              <div
                data-collector-table-shell="hertzbeat-ui-dense-table"
                data-collector-table-loading={tableLoading ? 'true' : 'false'}
                data-collector-table-loading-contract="angular-load-collectors-table"
                data-collector-table-loading-owner="angular-nz-table-loading"
                data-collector-table-loading-scope="load-search-refresh-pagination-mutation"
                data-collector-table-loading-source={tableLoading ? 'route-load-or-mutation' : 'idle'}
                aria-busy={tableLoading ? 'true' : 'false'}
                className="overflow-visible rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <table data-collector-manage-table="hertzbeat-ui-collector-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                  <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                    <tr>
                      <th className="w-[44px] px-3 py-2.5">
                        <Checkbox
                          data-collector-select-all="hertzbeat-ui-checkbox"
                          data-collector-select-all-contract="angular-header-includes-disabled-default"
                          data-collector-selectable-names={collectorNames.join(',')}
                          data-collector-immutable-names={immutableCollectorNames.join(',')}
                          aria-label={t('common.select')}
                          containerClassName="min-h-0"
                          checked={allSelected}
                          disabled={collectorNames.length === 0}
                          onChange={event => {
                            onSelectedCollectorsChange?.(event.target.checked ? collectorNames : []);
                          }}
                        />
                      </th>
                      <th className="w-[18%] px-3 py-2.5">{t('collector.name')}</th>
                      <th className="w-[11%] px-3 py-2.5">{t('collector.status')}</th>
                      <th className="w-[14%] px-3 py-2.5">{t('collector.mode')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.task')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.pinned')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.dispatched')}</th>
                      <th className="w-[12%] px-3 py-2.5">{t('collector.ip')}</th>
                      <th className="w-[10%] px-3 py-2.5">{t('collector.version')}</th>
                      <th className="w-[13%] px-3 py-2.5">{t('collector.start-time')}</th>
                      <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? rows.map(row => {
                      const rowActionMenuId = row.name;
                      const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId;

                      return (
                        <tr key={row.key} data-collector-row={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                          <td className="px-3 py-2.5">
                            <Checkbox
                              aria-label={t('common.select')}
                              data-collector-row-select={row.name}
                              data-collector-row-select-contract={row.canMutate ? 'angular-selectable' : 'angular-disabled-visual-only'}
                              containerClassName="min-h-0"
                              checked={row.canMutate && resolvedSelectedCollectors.includes(row.name)}
                              disabled={!row.canMutate}
                              onChange={event => {
                                onSelectedCollectorsChange?.(
                                  event.target.checked
                                    ? [...resolvedSelectedCollectors, row.name]
                                    : resolvedSelectedCollectors.filter(value => value !== row.name)
                                );
                              }}
                            />
                          </td>
                        <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                          <div className="min-w-0">
                            <span className="inline-flex max-w-full items-center gap-1.5">
                            <Cloud className="h-3.5 w-3.5 shrink-0 text-[#858d9a]" aria-hidden="true" />
                            <span className="truncate">{row.name}</span>
                            </span>
                            <div
                              data-collector-row-health="collector-status"
                              data-collector-row-health-tone={row.healthEvidence.tone}
                              className="mt-1 truncate text-[11px] font-medium text-[#858d9a]"
                            >
                              {row.healthEvidence.copy}
                            </div>
                            <div data-collector-row-freshness="last-seen" className="mt-0.5 truncate text-[11px] font-medium text-[#6f7788]">
                              {row.healthEvidence.freshness}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            data-collector-status-tone={row.statusTone}
                            className={`rounded-[3px] border px-2 py-0.5 text-[11px] font-semibold leading-4 ${statusClassName(row.statusTone)}`}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                            {row.modeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{row.taskCount}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.pinCount}</td>
                        <td className="px-3 py-2.5 tabular-nums">{row.dispatchCount}</td>
                        <td className="truncate px-3 py-2.5" title={row.ip}>{row.ip}</td>
                        <td className="truncate px-3 py-2.5" title={row.version}>{row.version}</td>
                        <td className="px-3 py-2.5 text-[#858d9a]">{row.updatedAt}</td>
                        <td className="px-3 py-2.5">
                          <div data-collector-row-actions="hertzbeat-ui-icon-actions" className="flex gap-1.5">
                            {row.nextAction === 'online' ? (
                              <span className="inline-flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('collector.online')}
                                  onClick={() => {
                                    setOpenRowActionMenuId(null);
                                    onRowGoOnline(row.name);
                                  }}
                                  disabled={!row.canMutate}
                                  data-collector-command-action="row-online"
                                  data-collector-online-one={row.name}
                                >
                                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('collector.online')}</span>
                                </Button>
                                <CollectorActionHelp
                                  id="row-online"
                                  label={t('collector.action.row-online.help-label')}
                                  copy={t('collector.action.row-online.help')}
                                  scope="row-action"
                                />
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('collector.offline')}
                                  onClick={() => {
                                    setOpenRowActionMenuId(null);
                                    onRowGoOffline(row.name);
                                  }}
                                  disabled={!row.canMutate}
                                  data-collector-command-action="row-offline"
                                  data-collector-offline-one={row.name}
                                >
                                  <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('collector.offline')}</span>
                                </Button>
                                <CollectorActionHelp
                                  id="row-offline"
                                  label={t('collector.action.row-offline.help-label')}
                                  copy={t('collector.action.row-offline.help')}
                                  scope="row-action"
                                />
                              </span>
                            )}
                            <div
                              className={collectorActionMenuRootClassName}
                              data-collector-row-delete-menu={rowActionMenuId}
                              data-collector-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
                              data-collector-row-delete-menu-layer="overlay-visible-above-panel"
                              data-collector-row-delete-menu-clearance="floating-overlay-no-panel-crop"
                              data-collector-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}
                            >
                              <button
                                type="button"
                                aria-expanded={isRowActionMenuOpen}
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                className={`${coldIconButtonClassName} inline-flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden`}
                                onClick={() => {
                                  setOpenRowActionMenuId(current => (current === rowActionMenuId ? null : rowActionMenuId));
                                }}
                                data-collector-command-action="row-more"
                                data-collector-row-delete-menu-trigger={rowActionMenuId}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="sr-only">{t('common.edit')}</span>
                              </button>
                              <div
                                role="menu"
                                hidden={!isRowActionMenuOpen}
                                className={`${collectorActionMenuPanelBaseClassName} right-0`}
                                data-collector-row-delete-menu-panel={rowActionMenuId}
                                data-collector-row-delete-menu-layer-panel="overlay-visible-above-panel"
                                data-collector-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
                                data-collector-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                                data-collector-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}
                              >
                                <span className="flex items-center gap-1">
                                  <HzTableRowActionButton
                                    width="root-span"
                                    intent="ghost"
                                    onClick={() => {
                                      setOpenRowActionMenuId(null);
                                      onRowDelete(row.name);
                                    }}
                                    disabled={!row.canMutate}
                                    data-collector-command-action="row-delete"
                                    data-collector-delete-one={row.name}
                                    data-collector-delete-one-owner="hertzbeat-ui-table-row-action-button"
                                    className="w-full text-[#fecaca] hover:text-white"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{t('collector.delete')}</span>
                                  </HzTableRowActionButton>
                                  <CollectorActionHelp
                                    id="row-delete"
                                    label={t('collector.action.row-delete.help-label')}
                                    copy={t('collector.action.row-delete.help')}
                                    scope="row-action"
                                  />
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      );
                    }) : (
                      <EmptyTableRow
                        colSpan={11}
                        t={t}
                        state={isFilteredEmpty ? 'filtered' : 'plain'}
                        title={isFilteredEmpty ? t('collector.empty.filtered.title') : undefined}
                        copy={isFilteredEmpty ? t('collector.empty.filtered.copy') : undefined}
                      />
                    )}
                  </tbody>
                </table>
                <div
                  data-collector-pagination="hertzbeat-ui-dense-pagination"
                  data-collector-pagination-owner="hertzbeat-ui-pagination-bar"
                  data-collector-pagination-contract="angular-search-pagination"
                >
                  <HzPaginationBar
                    summary={paginationSummary}
                    pageSizeLabel={t('collector.pagination.page-size')}
                    pageSizeValue={String(currentPageSize)}
                    pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
                    pageJumpLabel={t('collector.pagination.page')}
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
                        'data-collector-pagination-page-jump-owner': 'hertzbeat-ui-input'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                    }
                    pageSizeSelectProps={
                      {
                        'data-collector-pagination-page-size-owner': 'hertzbeat-ui-select'
                      } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
                    }
                    className="border-x-0"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
        </section>
      </div>
      <HzConfirmDialog
        open={Boolean(deleteTarget)}
        tone="critical"
        kicker={t('menu.advanced.collector')}
        title={resolveCollectorConfirmTitle(deleteTarget, t)}
        cancelLabel={t('common.button.cancel')}
        confirmLabel={t('common.button.ok')}
        confirmDisabled={mutationPending}
        onCancel={onDeleteCancel ?? (() => {})}
        onConfirm={onDeleteConfirm ?? (() => {})}
        data-collector-delete-confirm="angular-modal-confirm"
        data-collector-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-collector-operate-confirm={targetAction === 'online' || targetAction === 'offline' ? 'angular-modal-confirm' : undefined}
        data-collector-operate-confirm-owner="hertzbeat-ui-confirm-dialog"
        confirmButtonProps={{
          'data-collector-command-action': targetAction === 'online' ? 'online-confirm' : targetAction === 'offline' ? 'offline-confirm' : 'delete-confirm',
          'data-collector-delete-confirm-submit': 'angular-modal-confirm',
          'data-collector-operate-confirm-submit': targetAction === 'online' || targetAction === 'offline' ? 'angular-modal-confirm' : undefined
        } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
        cancelButtonProps={{
          'data-collector-command-action': 'confirm-cancel'
        } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']}
      >
        <div data-collector-delete-confirm-target={deleteTarget?.label ?? ''}>
          {deleteTarget?.label ?? t('common.none')}
        </div>
      </HzConfirmDialog>
      {deployOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          data-collector-deploy-dialog="angular-generate-identity-modal"
          data-collector-deploy-dialog-owner="collector-manage-surface"
          data-collector-deploy-mask-closable="angular-mask-closable-false"
          data-collector-deploy-mask-closable-owner="angular-nz-modal"
          data-collector-deploy-close-reset="angular-close-clears-name"
          data-collector-deploy-close-reset-owner="collector-route-controller"
          data-collector-deploy-close-pending-result="angular-close-ignores-late-generate"
          data-collector-deploy-close-pending-result-owner="collector-route-controller"
        >
          <section
            className="grid max-h-[88vh] w-[min(92vw,920px)] overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_28px_70px_rgba(0,0,0,0.48)] md:w-[45vw] md:max-w-[45vw]"
            data-collector-deploy-width="angular-width-45-percent"
            data-collector-deploy-width-owner="angular-nz-modal"
          >
            <header className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#252b34] bg-[#101217] px-5">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">{t('menu.advanced.collector')}</div>
                <h2 className="truncate text-[18px] font-semibold text-[#eef2f7]">{t('collector.deploy')}</h2>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28]"
                onClick={onDeployClose}
                data-collector-command-action="deploy-cancel"
                data-collector-deploy-close="angular-modal-cancel"
                data-collector-deploy-close-reset="angular-close-clears-name"
                data-collector-deploy-close-reset-owner="collector-route-controller"
                aria-label={t('collector.deploy.close')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-5">
              <div
                data-collector-deploy-guidance="identity-risk"
                className="mb-4 rounded-[4px] border border-[#553d1f] bg-[#241711] px-3 py-2 text-[12px] leading-5 text-[#fed7aa]"
              >
                {t('collector.deploy.guidance')}
              </div>
              <div
                className="grid gap-2 md:grid-cols-[7fr_12fr] md:items-start"
                data-collector-deploy-field="name"
                data-collector-deploy-field-layout="angular-label-7-control-12"
              >
                <label htmlFor="collector-deploy-name" className="pt-2 md:text-right" data-collector-deploy-label-span="7">
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5 text-[12px] font-semibold text-[#dbe4f0]">
                    <span>{t('collector.name')}</span>
                    <span data-collector-deploy-field-help="name">
                      <CollectorActionHelp id="deploy-name" label={t('collector.deploy.name.help-label')} copy={t('collector.deploy.name.help')} />
                    </span>
                    <span
                      className="rounded-[3px] border border-[#4e74f8]/40 bg-[#1a2440] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c8d5ff]"
                      data-collector-deploy-field-requirement="required"
                    >
                      {t('settings.form.field.requirement.required')}
                    </span>
                    <span
                      className="rounded-[3px] border border-[#2b3039] bg-[#11151c] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa4b5]"
                      data-collector-deploy-field-input-mode="manual"
                    >
                      {t('settings.form.field.input-mode.manual')}
                    </span>
                  </span>
                </label>
                <div className="min-w-0" data-collector-deploy-control-span="12">
                  <input
                    id="collector-deploy-name"
                    value={deployName ?? ''}
                    disabled={Boolean(resolvedDeployIdentity)}
                    onChange={event => onDeployNameChange?.(event.target.value)}
                    placeholder={t('collector.name.placeholder')}
                    className="h-8 w-full rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#dbe4f0] outline-none transition placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[#4e74f8]/10 disabled:opacity-60"
                    data-collector-deploy-name-input="angular-required-name"
                    data-collector-deploy-name-validation-trim="hertzbeat-required-after-trim"
                    data-collector-deploy-name-validation-trim-owner="collector-route-controller"
                    data-collector-deploy-name-validation-state={showDeployNameValidation ? 'dirty-invalid' : 'pristine'}
                    data-collector-deploy-name-lock={resolvedDeployIdentity ? 'angular-disable-after-identity' : 'editable-before-identity'}
                    data-collector-deploy-name-lock-owner="angular-ngmodel-input"
                    data-collector-deploy-name-disabled={resolvedDeployIdentity ? 'true' : 'false'}
                  />
                  {showDeployNameValidation ? (
                    <div
                      className="mt-1 text-[11px] font-medium text-[#fca5a5]"
                      data-collector-deploy-name-validation="validation.required"
                      data-collector-deploy-name-validation-contract="angular-submit-marks-required"
                    >
                      {t('validation.required')}
                    </div>
                  ) : null}
                </div>
              </div>
              {deployError ? (
                <div className="mt-4">
                  <HzInlineFeedback
                    tone="critical"
                    title={t('common.notify.apply-fail')}
                    meta={deployError}
                    variant="embedded"
                    data-collector-deploy-feedback="angular-apply-fail-notification"
                    data-collector-deploy-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-collector-deploy-feedback-title="common.notify.apply-fail"
                    data-collector-deploy-feedback-detail="backend-message"
                  />
                </div>
              ) : null}
              {visibleDeployCopyMessage ? (
                <div className="mt-4">
                  <HzInlineFeedback
                    tone="success"
                    title={visibleDeployCopyMessage}
                    variant="embedded"
                    data-collector-deploy-copy-feedback="angular-copy-success"
                    data-collector-deploy-copy-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-collector-deploy-copy-feedback-duration-ms="3000"
                  />
                </div>
              ) : null}
              {resolvedDeployIdentity ? (
                <div className="mt-5 grid gap-4" data-collector-deploy-result="angular-identity-shells">
                  <div className="grid gap-2 text-center">
                    <div className="text-[14px] font-semibold text-[#eef2f7]">{t('collector.deploy.identity')}</div>
                    <div className="text-[12px] text-[#858d9a]">{t('collector.deploy.identity.tip')}</div>
                    <button
                      type="button"
                      className="mx-auto inline-flex max-w-full items-center gap-2 rounded-[3px] border border-[#553d1f] bg-[#241711] px-3 py-2 font-mono text-[12px] font-semibold text-[#fed7aa] hover:border-[#f97316]"
                      onClick={() => handleDeployCopy(resolvedDeployIdentity)}
                      data-collector-command-action="deploy-copy-identity"
                      data-collector-deploy-copy-identity="angular-copy-identity"
                      title={t('common.button.copy.tip')}
                    >
                      <span className="truncate">{resolvedDeployIdentity}</span>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t('common.copy.button')}</span>
                    </button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <HzCodeEditor
                      readOnly
                      language="shell"
                      value={deployDockerShell ?? ''}
                      title={t('collector.deploy.docker')}
                      meta={deployHost ?? 'MANAGER_HOST'}
                      minHeight="240px"
                      data-collector-deploy-docker-shell="angular-docker-shell"
                      data-collector-deploy-code-owner="hertzbeat-ui-code-editor"
                    />
                    <HzCodeEditor
                      readOnly
                      language="yaml"
                      value={deployPackageShell ?? ''}
                      title={t('collector.deploy.package')}
                      meta={
                        <a
                          href="https://github.com/apache/hertzbeat/releases"
                          target="_blank"
                          rel="noreferrer"
                          data-collector-deploy-package-link="angular-github-releases-link"
                          data-collector-deploy-package-link-owner="angular-nz-modal"
                        >
                          {t('collector.deploy.package.github')}
                        </a>
                      }
                      minHeight="260px"
                      data-collector-deploy-package-shell="angular-package-shell"
                      data-collector-deploy-code-owner="hertzbeat-ui-code-editor"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-[#252b34] bg-[#101217] px-5 py-3">
              {resolvedDeployIdentity ? (
                <HzButton
                  size="md"
                  intent="danger"
                  onClick={onDeployClose}
                  data-collector-command-action="deploy-result-close"
                  data-collector-deploy-result-close="angular-close-saved"
                  data-collector-deploy-result-close-contract="angular-danger-close-after-identity"
                  data-collector-deploy-result-close-owner="hertzbeat-ui-button"
                  data-collector-deploy-result-close-reset="angular-close-clears-name"
                  data-collector-deploy-result-close-reset-owner="collector-route-controller"
                >
                  {t('collector.deploy.close')}
                </HzButton>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className={coldPrimaryButtonClassName}
                  onClick={onDeployGenerate}
                  disabled={Boolean(isDeployPending || resolvedDeployIdentity)}
                  data-collector-command-action="deploy-generate"
                  data-collector-deploy-generate="angular-generate-identity"
                  data-collector-deploy-generate-validation="angular-click-before-required"
                  data-collector-deploy-ok-loading={isDeployPending ? 'true' : 'false'}
                  data-collector-deploy-ok-loading-owner="angular-nz-ok-loading"
                  aria-busy={isDeployPending ? 'true' : 'false'}
                >
                  {isDeployPending ? t('common.loading') : t('collector.deploy.ok')}
                </Button>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
