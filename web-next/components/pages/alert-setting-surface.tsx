'use client';

import React from 'react';
import { Inbox, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { HzBatchToolbar, HzInlineFeedback, HzPaginationBar, type HzStatusTone } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
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
  onDeleteSelected: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleEnabled: (defineId: number, enabled: boolean) => void;
  onEdit: (defineId: number) => void;
  onDelete: (defineId: number) => void;
  onCheckedIdsChange: (nextIds: number[]) => void;
  onPageIndexChange?: (nextPageIndex: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  pendingActionId?: string | null;
  actionFeedback?: {
    tone: HzStatusTone;
    title: string;
    description?: string;
    contract?: 'delete' | 'enable' | 'export-fail' | 'no-select-delete' | 'no-select-export' | 'import-success' | 'import-fail';
  } | null;
};

const coldSettingVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

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
  onDeleteSelected,
  onExport,
  onImport,
  onToggleEnabled,
  onEdit,
  onDelete,
  onCheckedIdsChange,
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
  const currentPageIndex = data.list.pageIndex ?? 0;
  const currentPageSize = data.list.pageSize || 8;
  const totalElements = data.list.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / currentPageSize));
  const currentPage = currentPageIndex + 1;
  const pageSizeOptions = [8, 15, 25];
  const paginationSummary = t('common.pagination.summary', {
    page: currentPage,
    totalPages,
    total: totalElements
  });
  const handlePageJumpChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    onPageIndexChange?.(nextPage - 1);
  };

  return (
    <div
      data-alert-setting-surface="otlp-cold-setting-console"
      data-alert-setting-style-baseline={coldSettingVisual.canvasName}
      className={coldSettingVisual.canvas.root}
      style={coldSettingVisual.canvas.backgroundStyle}
    >
      <section className={coldSettingVisual.layout.pageSection}>
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5">
            <div data-alert-setting-header="cold-compact-header" className={coldSettingVisual.panel.hero}>
              <div className="max-w-[840px]">
                <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                  {t('menu.alert.setting')}
                </h1>
                <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                  {t('alert.setting.copy')}
                </p>
                <div data-alert-setting-command-row="standard-equal-buttons" className={coldSettingVisual.button.row}>
                  <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.refresh')}
                  </Button>
                  <Button size="sm" variant="primary" className={coldPrimaryButtonClassName} onClick={onNew}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('alert.setting.action.new')}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className={coldButtonClassName}
                    onClick={onDeleteSelected}
                    data-alert-setting-no-select-delete-trigger="angular-warning"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.button.delete-batch')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div data-alert-setting-admin-layout="full-width-admin-list" className="space-y-5">
            {evidenceContext ? (
              <section
                data-alert-setting-evidence-context="signal-route"
                data-alert-setting-evidence-signal={evidenceContext.signal}
                data-alert-setting-prefill-labels={evidenceContext.labelsText}
                className="rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#eef2f7]">{evidenceContext.title}</p>
                    <p className="mt-1 max-w-[820px] text-[12px] leading-5 text-[#9099a7]">{evidenceContext.copy}</p>
                  </div>
                  {evidenceContext.returnHref ? (
                    <a
                      data-alert-setting-evidence-return="true"
                      href={evidenceContext.returnHref}
                      className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                    >
                      {t('alert.rule.evidence.return')}
                    </a>
                  ) : null}
                </div>
                <div
                  data-alert-setting-evidence-labels={evidenceContext.labelsText ? 'provided-labels' : 'localized-fallback'}
                  className="mt-3 rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2 font-mono text-[11px] leading-5 text-[#9aa5b5]"
                >
                  {evidenceContext.labelsText || emptyValue}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
                  {evidenceContext.rows.map(row => (
                    <div key={`${row.label}-${row.value}`} className="min-w-0 rounded-[3px] border border-[#222a34] bg-[#101217] px-3 py-2">
                      <p className="text-[11px] font-semibold text-[#788292]">{row.label}</p>
                      <p className="mt-1 truncate text-[13px] font-semibold text-[#eef2f7]" title={row.value}>{row.value}</p>
                      <p className="mt-1 truncate text-[11px] text-[#778091]" title={row.meta}>{row.meta}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="min-w-0">
              <SearchRow
                data-alert-setting-toolbar="cold-query-toolbar"
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
                    onSelect: onExport,
                    buttonProps: {
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
                    onSelect: onImport,
                    buttonProps: {
                      'data-alert-setting-import-trigger-owner': 'hertzbeat-ui-batch-toolbar',
                      'data-alert-setting-import-trigger': 'file-upload'
                    } as React.ButtonHTMLAttributes<HTMLButtonElement>
                  },
                  {
                    id: 'delete',
                    label: t('common.button.delete-batch'),
                    tone: 'critical',
                    disabled: Boolean(pendingActionId && pendingActionId !== 'delete'),
                    onSelect: onDeleteSelected,
                    buttonProps: {
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
                  />
                </div>
              ) : null}

              <div
                data-alert-setting-table-shell="cold-dense-table"
                className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
              >
                <div className="overflow-hidden">
                  <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[44px] px-3 py-2.5">
                          <Checkbox
                            data-alert-setting-select-all="cold-checkbox"
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
                        <th className="w-[72px] px-3 py-2.5">{t('common.edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? rows.map((row, index) => {
                        const original = data.list.content[index];
                        const checked = checkedIds.includes(original.id);
                        return (
                          <tr
                            key={row.key}
                            data-alert-setting-row={row.key}
                            className={cn(
                              'border-t border-[#252b34] transition hover:bg-[#111721]',
                              checked ? 'bg-[#10141d]' : 'bg-[#0b0c0e]'
                            )}
                          >
                            <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                              <Checkbox
                                data-alert-setting-row-checkbox="cold-checkbox"
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
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{row.name}</td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                {row.type}
                              </span>
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
                              <Checkbox
                                data-alert-setting-enable-checkbox="cold-checkbox"
                                checked={Boolean(original.enable)}
                                containerClassName="min-h-0"
                                onChange={event => onToggleEnabled(original.id, event.target.checked)}
                                label={<span className="sr-only">{row.enabledLabel}</span>}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-[#858d9a]">{row.updatedAt}</td>
                            <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                              <div className="flex gap-1.5">
                                <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onEdit(original.id)} title={t('alert.setting.edit')}>
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('alert.setting.edit')}</span>
                                </Button>
                                <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onDelete(original.id)} title={t('alert.setting.delete')}>
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('alert.setting.delete')}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr data-alert-setting-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                          <td colSpan={9} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                            <div className="inline-flex flex-col items-center gap-2.5">
                              <span
                                data-alert-setting-empty-icon="cold-empty-box"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                              >
                                <Inbox className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <div data-alert-setting-empty-copy="true" className="text-[13px] font-semibold">{t('alert.setting.empty.title')}</div>
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
