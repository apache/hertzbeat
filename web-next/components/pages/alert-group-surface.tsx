'use client';

import React from 'react';
import { ArrowLeft, Inbox, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { HzCheckbox, HzInlineFeedback, HzPaginationBar } from '@hertzbeat/ui';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { AlertGroupAuthoringFields } from './alert-group-authoring-fields';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import type { AlertLabelOptions } from '../../lib/alert-label-options';
import type { AlertGroupFormDraft } from '../../lib/alert-group/controller';
import type { AlertGroupEvidenceContext } from '../../lib/alert-group/view-model';
import type { AlertGroupConverge, PageResult } from '../../lib/types';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertGroupSurfaceProps = {
  t: Translator;
  data: { list: PageResult<AlertGroupConverge> };
  search: string;
  selectedId: number | null;
  checkedIds: number[];
  editorOpen: boolean;
  editorLoading: boolean;
  editorSaving: boolean;
  editorMessage: string | null;
  editorError: string | null;
  editorErrorDetail?: string | null;
  editorErrorContract?: 'save' | 'enable' | 'delete' | null;
  evidenceContext?: AlertGroupEvidenceContext | null;
  draft: AlertGroupFormDraft;
  formatTime: (value?: number | string | null) => string;
  labelOptions?: AlertLabelOptions;
  onSearchChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  onSelect: (nextId: number | null) => void;
  onCheckedIdsChange: (nextIds: number[]) => void;
  pageSizeOptions?: number[];
  onPageIndexChange?: (nextPageIndex: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
  onNew: () => void;
  onSave: () => void;
  onToggleEnabled: (group: AlertGroupConverge) => void;
  onEdit: (groupId: number) => void;
  onDelete: (groupId: number) => void;
  onDeleteSelected: () => void;
  onCloseEditor: () => void;
  onDraftChange: (nextDraft: AlertGroupFormDraft) => void;
};

const coldGroupVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

export function AlertGroupSurface({
  t,
  data,
  search,
  selectedId,
  checkedIds,
  editorOpen,
  editorLoading,
  editorSaving,
  editorMessage,
  editorError,
  editorErrorDetail,
  editorErrorContract,
  evidenceContext,
  draft,
  formatTime,
  labelOptions,
  onSearchChange,
  onApplyFilter,
  onClearFilter,
  onRefresh,
  onSelect,
  onCheckedIdsChange,
  pageSizeOptions = [8, 15, 25],
  onPageIndexChange,
  onPageSizeChange,
  onNew,
  onSave,
  onToggleEnabled,
  onEdit,
  onDelete,
  onDeleteSelected,
  onCloseEditor,
  onDraftChange
}: AlertGroupSurfaceProps) {
  const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;
  const selectedCount = checkedIds.length;
  const emptyValue = t('common.none');
  const currentPageIndex = Math.max(0, data.list.pageIndex ?? 0);
  const currentPageSize = Math.max(1, data.list.pageSize ?? pageSizeOptions[0] ?? 8);
  const totalElements = data.list.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / currentPageSize));
  const currentPage = Math.min(currentPageIndex + 1, totalPages);
  const pageStart = totalElements === 0 || data.list.content.length === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageEnd = totalElements === 0 ? 0 : Math.min(totalElements, currentPageIndex * currentPageSize + data.list.content.length);
  const currentPageIds = data.list.content.map(item => item.id);
  const currentPageIdSet = new Set(currentPageIds);
  const allCurrentPageChecked = currentPageIds.length > 0 && currentPageIds.every(id => checkedIds.includes(id));
  const paginationSummary = t('alert.group.pagination.summary', {
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

  function handleSelectCurrentPage(checked: boolean) {
    if (checked) {
      onCheckedIdsChange(Array.from(new Set([...checkedIds, ...currentPageIds])));
      return;
    }
    onCheckedIdsChange(checkedIds.filter(id => !currentPageIdSet.has(id)));
  }

  return (
    <>
      <div
        data-alert-group-surface="otlp-hertzbeat-ui-group-console"
        data-alert-group-style-baseline={coldGroupVisual.canvasName}
        className={coldGroupVisual.canvas.root}
        style={coldGroupVisual.canvas.backgroundStyle}
      >
        <section className={coldGroupVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-alert-group-header="hertzbeat-ui-compact-header" className={coldGroupVisual.panel.hero}>
                <div className="max-w-[820px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('alert.group.title')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('alert.group.copy')}
                  </p>
                  <div data-alert-group-command-row="standard-equal-buttons" className={coldGroupVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="primary" className={coldPrimaryButtonClassName} onClick={onNew}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('alert.group.action.new')}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onDeleteSelected}
                      data-alert-group-delete-selected="toolbar"
                      data-alert-group-delete-selected-owner="route-no-select-warning"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.delete-batch')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-alert-group-admin-layout="full-width-admin-list" className="space-y-5">
              {!editorOpen && (editorError || editorMessage) ? (
                <HzInlineFeedback
                  tone={editorError ? 'warning' : 'success'}
                  title={editorError || editorMessage}
                  description={editorErrorContract === 'enable' || editorErrorContract === 'delete' ? editorErrorDetail : undefined}
                  variant="embedded"
                  data-alert-group-action-feedback-owner="hertzbeat-ui-inline-feedback"
                  data-alert-group-action-feedback={editorError ? 'warning' : 'success'}
                  data-alert-group-enable-failure={editorErrorContract === 'enable' ? 'angular-notify-title-detail' : undefined}
                  data-alert-group-enable-failure-owner={editorErrorContract === 'enable' ? 'hertzbeat-ui-inline-feedback' : undefined}
                  data-alert-group-enable-feedback-title={editorErrorContract === 'enable' ? 'common.notify.edit-fail' : undefined}
                  data-alert-group-enable-feedback-detail={editorErrorContract === 'enable' ? 'backend-message' : undefined}
                  data-alert-group-delete-failure={editorErrorContract === 'delete' ? 'angular-notify-title-detail' : undefined}
                  data-alert-group-delete-failure-owner={editorErrorContract === 'delete' ? 'hertzbeat-ui-inline-feedback' : undefined}
                  data-alert-group-delete-feedback-title={editorErrorContract === 'delete' ? 'common.notify.delete-fail' : undefined}
                  data-alert-group-delete-feedback-detail={editorErrorContract === 'delete' ? 'backend-message' : undefined}
                />
              ) : null}
              {evidenceContext ? (
                <section
                  data-alert-group-evidence-context="signal-route"
                  data-alert-group-evidence-signal={evidenceContext.signal}
                  data-alert-group-prefill-labels={evidenceContext.groupLabelsText}
                  className="rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#eef2f7]">{evidenceContext.title}</p>
                      <p className="mt-1 max-w-[820px] text-[12px] leading-5 text-[#9099a7]">{evidenceContext.copy}</p>
                    </div>
                    {evidenceContext.returnHref ? (
                      <a
                        data-alert-group-evidence-return="true"
                        href={evidenceContext.returnHref}
                        className="inline-flex h-8 items-center gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('alert.rule.evidence.return')}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#788292]">{t('alert.group.evidence.labels')}</p>
                    <p className="mt-1 break-words font-mono text-[11px] leading-5 text-[#9aa5b5]">
                      <span data-alert-group-evidence-labels={evidenceContext.groupLabelsText ? 'provided-labels' : 'localized-fallback'}>
                        {evidenceContext.groupLabelsText || emptyValue}
                      </span>
                    </p>
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
                  data-alert-group-toolbar="hertzbeat-ui-query-toolbar"
                  value={search}
                  placeholder={t('alert.group-converge.name')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  onValueChange={onSearchChange}
                  onSearch={onApplyFilter}
                  onClear={search ? onClearFilter : undefined}
                />

                <div
                  data-alert-group-table-shell="hertzbeat-ui-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="overflow-hidden">
                    <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[44px] px-3 py-2.5">
                            <HzCheckbox
                              data-alert-group-select-current-page="table-header"
                              data-alert-group-select-current-page-owner="hertzbeat-ui-checkbox"
                              checked={allCurrentPageChecked}
                              disabled={currentPageIds.length === 0}
                              aria-label={t('common.select')}
                              containerClassName="min-h-0"
                              onChange={event => handleSelectCurrentPage(event.target.checked)}
                            />
                          </th>
                          <th className="w-[17%] px-3 py-2.5">{t('alert.group-converge.name')}</th>
                          <th className="w-[18%] px-3 py-2.5">{t('alert.group-converge.group-labels')}</th>
                          <th className="w-[10%] px-3 py-2.5">{t('alert.group-converge.group-wait')}</th>
                          <th className="w-[10%] px-3 py-2.5">{t('alert.group-converge.group-interval')}</th>
                          <th className="w-[10%] px-3 py-2.5">{t('alert.group-converge.repeat-interval')}</th>
                          <th className="w-[8%] px-3 py-2.5">{t('common.enable')}</th>
                          <th className="w-[15%] px-3 py-2.5">{t('common.edit-time')}</th>
                          <th className="w-[72px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.list.content.length > 0 ? data.list.content.map(item => {
                          const checked = checkedIds.includes(item.id);
                          const rowSelected = selected?.id === item.id;
                          return (
                            <tr
                              key={item.id}
                              data-alert-group-row={item.id}
                              className={cn(
                                'cursor-pointer border-t border-[#252b34] transition hover:bg-[#111721]',
                                rowSelected ? 'bg-[#10141d]' : 'bg-[#0b0c0e]'
                              )}
                              onClick={() => onSelect(item.id)}
                            >
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-group-row-checkbox="hertzbeat-ui-checkbox"
                                  checked={checked}
                                  aria-label={item.name || t('alert.group.default-title')}
                                  containerClassName="min-h-0"
                                  onChange={event => {
                                    onCheckedIdsChange(
                                      event.target.checked ? [...checkedIds, item.id] : checkedIds.filter(value => value !== item.id)
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{item.name || t('alert.group.default-title')}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {(item.groupLabels || []).map(label => (
                                    <span
                                      key={`${item.id}-${label}`}
                                      className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]"
                                    >
                                      {label.length > 15 ? `${label.slice(0, 15)}...` : label}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">{item.groupWait || 0}{t('alert.group-converge.seconds')}</td>
                              <td className="px-3 py-2.5 tabular-nums">{item.groupInterval || 0}{t('alert.group-converge.seconds')}</td>
                              <td className="px-3 py-2.5 tabular-nums">{item.repeatInterval || 0}{t('alert.group-converge.seconds')}</td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-group-enable-checkbox="hertzbeat-ui-checkbox"
                                  checked={item.enable ?? true}
                                  containerClassName="min-h-0"
                                  onChange={() => onToggleEnabled(item)}
                                  label={<span className="sr-only">{item.enable ? t('common.enabled') : t('common.disabled')}</span>}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(item.gmtUpdate || item.gmtCreate || null)}</td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <div className="flex gap-1.5">
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onEdit(item.id)} disabled={editorLoading} title={t('alert.group-converge.edit')}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{editorLoading && rowSelected ? t('common.loading') : t('alert.group-converge.edit')}</span>
                                  </Button>
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onDelete(item.id)} title={t('alert.group-converge.delete')}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('alert.group-converge.delete')}</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr data-alert-group-empty-state="hertzbeat-ui-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                            <td colSpan={9} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                              <div className="inline-flex flex-col items-center gap-2.5">
                                <span
                                  data-alert-group-empty-icon="hertzbeat-ui-empty-box"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                                >
                                  <Inbox className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div data-alert-group-empty-copy="true" className="text-[13px] font-semibold">{t('alert.group.empty.title')}</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div
                    data-alert-group-pagination="hertzbeat-ui-dense-pagination"
                    data-alert-group-pagination-owner="hertzbeat-ui-pagination-bar"
                  >
                    <HzPaginationBar
                      summary={paginationSummary}
                      pageSizeLabel={t('alert.group.pagination.page-size')}
                      pageSizeValue={String(currentPageSize)}
                      pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
                      pageJumpLabel={t('alert.group.pagination.page')}
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
                          'data-alert-group-pagination-page-jump-owner': 'hertzbeat-ui-input'
                        } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                      }
                      pageSizeSelectProps={
                        {
                          'data-alert-group-pagination-page-size-owner': 'hertzbeat-ui-select'
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
      <OverlayDialog
        open={editorOpen}
        title={draft.id ? t('alert.group-converge.edit') : t('alert.group-converge.new')}
        kicker={t('alert.group.title')}
        onClose={onCloseEditor}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {evidenceContext?.returnHref ? (
              <a
                data-alert-group-editor-return="evidence-context"
                href={evidenceContext.returnHref}
                className="inline-flex h-8 items-center gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {t('alert.rule.evidence.return')}
              </a>
            ) : null}
            <Button size="sm" variant="subtle" onClick={onCloseEditor}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={onSave} disabled={editorSaving}>
              {editorSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        }
      >
        {editorErrorContract === 'save' && editorErrorDetail && editorError ? (
          <HzInlineFeedback
            tone="critical"
            title={editorError}
            description={editorErrorDetail}
            variant="embedded"
            className="mb-3 rounded-[3px] border border-[#5d3037] bg-[#1a1013]"
            data-alert-group-editor-error-inline="hertzbeat-ui-validation"
            data-alert-group-save-failure="angular-notify-title-detail"
            data-alert-group-save-failure-owner="hertzbeat-ui-inline-feedback"
            data-alert-group-save-feedback-title={draft.id ? 'common.notify.edit-fail' : 'common.notify.new-fail'}
            data-alert-group-save-feedback-detail="backend-message"
          />
        ) : editorError ? (
          <div
            role="alert"
            data-alert-group-editor-error-inline="hertzbeat-ui-validation"
            className="mb-3 rounded-[3px] border border-[#5d3037] bg-[#1a1013] px-3 py-2 text-[12px] font-semibold text-[#f0a7b2]"
          >
            {editorError}
          </div>
        ) : null}
        <AlertGroupAuthoringFields
          t={t}
          draft={draft}
          onDraftChange={onDraftChange}
          mode="workspace"
          labelOptions={labelOptions}
          sourceGroupLabelsText={evidenceContext?.groupPreview?.groupLabelsText}
          sourceSignal={evidenceContext?.signal}
        />
      </OverlayDialog>
    </>
  );
}
