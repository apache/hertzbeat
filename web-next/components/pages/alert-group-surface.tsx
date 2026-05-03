'use client';

import React from 'react';
import { ArrowLeft, Inbox, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { AlertGroupAuthoringFields } from './alert-group-authoring-fields';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
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
  onNew: () => void;
  onSave: () => void;
  onToggleEnabled: (group: AlertGroupConverge) => void;
  onEdit: (groupId: number) => void;
  onDelete: (groupId: number) => void;
  onDeleteSelected: () => void;
  onCloseEditor: () => void;
  onDraftChange: (nextDraft: AlertGroupFormDraft) => void;
};

const coldGroupVisual = coldOpsCatalogVisual;

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

  return (
    <>
      <div
        data-alert-group-surface="otlp-cold-group-console"
        data-alert-group-style-baseline={coldGroupVisual.canvasName}
        className={coldGroupVisual.canvas.root}
        style={coldGroupVisual.canvas.backgroundStyle}
      >
        <section className={coldGroupVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-alert-group-header="cold-compact-header" className={coldGroupVisual.panel.hero}>
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
                      disabled={selectedCount === 0}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.delete-batch')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-alert-group-admin-layout="full-width-admin-list" className="space-y-5">
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
                      {evidenceContext.groupLabelsText || '-'}
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
                  data-alert-group-toolbar="cold-query-toolbar"
                  value={search}
                  placeholder={t('alert.group-converge.name')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  onValueChange={onSearchChange}
                  onSearch={onApplyFilter}
                  onClear={search ? onClearFilter : undefined}
                />

                <div
                  data-alert-group-table-shell="cold-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="overflow-hidden">
                    <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[44px] px-3 py-2.5">
                            <span className="sr-only">{t('common.select')}</span>
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
                                  data-alert-group-row-checkbox="cold-checkbox"
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
                                  data-alert-group-enable-checkbox="cold-checkbox"
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
                          <tr data-alert-group-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                            <td colSpan={9} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                              <div className="inline-flex flex-col items-center gap-2.5">
                                <span
                                  data-alert-group-empty-icon="cold-empty-box"
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
        {editorError ? (
          <div
            role="alert"
            data-alert-group-editor-error-inline="cold-validation"
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
        />
      </OverlayDialog>
    </>
  );
}
