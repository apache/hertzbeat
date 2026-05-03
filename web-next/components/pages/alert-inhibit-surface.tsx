'use client';

import React from 'react';
import { ArrowLeft, Inbox, Network, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { AlertInhibitAuthoringFields } from './alert-inhibit-authoring-fields';
import {
  hasAlertTopologyReturnContext,
  resolveAlertInternalReturnHref,
  type AlertQueryState
} from '../../lib/alert-manage/query-state';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import type { AlertInhibitFormDraft } from '../../lib/alert-inhibit/controller';
import type { AlertInhibitEvidenceContext } from '../../lib/alert-inhibit/view-model';
import type { AlertLabelOptions } from '../../lib/alert-label-options';
import type { AlertInhibit, PageResult } from '../../lib/types';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertInhibitSurfaceProps = {
  t: Translator;
  data: { list: PageResult<AlertInhibit> };
  search: string;
  selectedId: number | null;
  checkedIds: number[];
  editorOpen: boolean;
  editorLoading: boolean;
  editorSaving: boolean;
  editorMessage: string | null;
  editorError: string | null;
  returnContext?: AlertQueryState;
  evidenceContext?: AlertInhibitEvidenceContext | null;
  draft: AlertInhibitFormDraft;
  labelOptions?: AlertLabelOptions;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  onSelect: (nextId: number | null) => void;
  onCheckedIdsChange: (nextIds: number[]) => void;
  onNew: () => void;
  onEdit: (inhibitId?: number) => void;
  onSave: () => void;
  onToggleEnabled: (inhibit?: AlertInhibit) => void;
  onDelete: (inhibitId?: number) => void;
  onDeleteSelected: () => void;
  onCloseEditor: () => void;
  onDraftChange: (nextDraft: AlertInhibitFormDraft) => void;
  onCopySourceToTarget: () => void;
  onDropSeverity: () => void;
  onClearTarget: () => void;
  onClearEqual: () => void;
};

const coldInhibitVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function getLabelEntries(labels?: Record<string, unknown> | null) {
  return Object.entries(labels ?? {});
}

export function AlertInhibitSurface({
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
  returnContext,
  evidenceContext,
  draft,
  labelOptions,
  formatTime,
  onSearchChange,
  onApplyFilter,
  onClearFilter,
  onRefresh,
  onSelect,
  onCheckedIdsChange,
  onNew,
  onEdit,
  onSave,
  onToggleEnabled,
  onDelete,
  onDeleteSelected,
  onCloseEditor,
  onDraftChange,
  onCopySourceToTarget,
  onDropSeverity,
  onClearTarget,
  onClearEqual
}: AlertInhibitSurfaceProps) {
  const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;
  const selectedCount = checkedIds.length;
  const visibleIds = data.list.content.map(item => item.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every(id => checkedIds.includes(id));
  const topologyReturnHref = resolveAlertInternalReturnHref(returnContext?.returnTo);
  const topologyReturnActive = hasAlertTopologyReturnContext(returnContext);

  return (
    <>
      <div
        data-alert-inhibit-surface="otlp-cold-inhibit-console"
        data-alert-inhibit-style-baseline={coldInhibitVisual.canvasName}
        className={coldInhibitVisual.canvas.root}
        style={coldInhibitVisual.canvas.backgroundStyle}
      >
        <section className={coldInhibitVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-alert-inhibit-header="cold-compact-header" className={coldInhibitVisual.panel.hero}>
                <div className="max-w-[840px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.alert.inhibit')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('alert.inhibit.copy')}
                  </p>
                  {topologyReturnActive ? (
                    <div
                      data-alert-inhibit-return-context="topology-edge"
                      data-alert-inhibit-return-edge-id={returnContext?.edgeId || 'none'}
                      className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-[3px] border border-[#303743] bg-[#101217] px-3 py-2 text-[12px] text-[#a9b0bb]"
                    >
                      <Network className="h-3.5 w-3.5 text-[#8ea2ff]" aria-hidden="true" />
                      <span className="font-semibold text-[#dbe4f0]">{returnContext?.serviceName || returnContext?.entityName || t('menu.topology')}</span>
                      {returnContext?.viewMode ? <span className="text-[#7e8494]">{returnContext.viewMode}</span> : null}
                      {returnContext?.sourceKind ? <span className="text-[#7e8494]">{returnContext.sourceKind}</span> : null}
                      {returnContext?.edgeId ? <span className="text-[#7e8494]">{returnContext.edgeId}</span> : null}
                      <a
                        data-alert-inhibit-return-action="true"
                        className="inline-flex items-center gap-1 rounded-[3px] border border-[#394150] px-2 py-1 font-semibold text-[#d8e4ff] hover:border-[#4e74f8] hover:text-white"
                        href={topologyReturnHref}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('menu.topology')}
                      </a>
                    </div>
                  ) : null}
                  <div data-alert-inhibit-command-row="standard-equal-buttons" className={coldInhibitVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="primary" className={coldPrimaryButtonClassName} onClick={onNew}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('alert.inhibit.action.new')}
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

            <div data-alert-inhibit-admin-layout="full-width-admin-list" className="space-y-5">
              {evidenceContext ? (
                <section
                  data-alert-inhibit-evidence-context="signal-route"
                  data-alert-inhibit-evidence-signal={evidenceContext.signal}
                  data-alert-inhibit-prefill-source-labels={evidenceContext.sourceLabelsText}
                  data-alert-inhibit-prefill-target-labels={evidenceContext.targetLabelsText}
                  data-alert-inhibit-prefill-equal-labels={evidenceContext.equalLabelsText}
                  className="rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#eef2f7]">{evidenceContext.title}</p>
                      <p className="mt-1 max-w-[820px] text-[12px] leading-5 text-[#9099a7]">{evidenceContext.copy}</p>
                    </div>
                    {evidenceContext.returnHref ? (
                      <a
                        data-alert-inhibit-evidence-return="true"
                        href={evidenceContext.returnHref}
                        className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                      >
                        {t('alert.rule.evidence.return')}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_1fr_0.8fr]">
                    <div className="rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-[#788292]">{t('alert.inhibit.evidence.source-labels')}</p>
                      <p className="font-mono text-[11px] leading-5 text-[#9aa5b5]">{evidenceContext.sourceLabelsText || '-'}</p>
                    </div>
                    <div className="rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-[#788292]">{t('alert.inhibit.evidence.target-labels')}</p>
                      <p className="font-mono text-[11px] leading-5 text-[#9aa5b5]">{evidenceContext.targetLabelsText || '-'}</p>
                    </div>
                    <div className="rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-[#788292]">{t('alert.inhibit.evidence.equal-labels')}</p>
                      <p className="font-mono text-[11px] leading-5 text-[#9aa5b5]">{evidenceContext.equalLabelsText || '-'}</p>
                    </div>
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
                  data-alert-inhibit-toolbar="cold-query-toolbar"
                  value={search}
                  placeholder={t('alert.inhibit.name')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  onValueChange={onSearchChange}
                  onSearch={onApplyFilter}
                  onClear={search ? onClearFilter : undefined}
                />

                <div
                  data-alert-inhibit-table-shell="cold-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="overflow-hidden">
                    <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[44px] px-3 py-2.5">
                            <Checkbox
                              data-alert-inhibit-select-all="cold-checkbox"
                              checked={allVisibleChecked}
                              disabled={visibleIds.length === 0}
                              aria-label={t('common.select')}
                              containerClassName="min-h-0 justify-center"
                              onChange={event => {
                                onCheckedIdsChange(event.target.checked ? visibleIds : []);
                              }}
                            />
                          </th>
                          <th className="w-[17%] px-3 py-2.5">{t('alert.inhibit.name')}</th>
                          <th className="w-[19%] px-3 py-2.5">{t('alert.inhibit.source_labels')}</th>
                          <th className="w-[19%] px-3 py-2.5">{t('alert.inhibit.target_labels')}</th>
                          <th className="w-[13%] px-3 py-2.5">{t('alert.inhibit.equal_labels')}</th>
                          <th className="w-[9%] px-3 py-2.5">{t('common.enable')}</th>
                          <th className="w-[15%] px-3 py-2.5">{t('common.edit-time')}</th>
                          <th className="w-[72px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.list.content.length > 0 ? data.list.content.map(item => {
                          const checked = checkedIds.includes(item.id);
                          const rowSelected = selected?.id === item.id;
                          const sourceLabels = getLabelEntries(item.sourceLabels);
                          const targetLabels = getLabelEntries(item.targetLabels);
                          const equalLabels = item.equalLabels ?? [];
                          return (
                            <tr
                              key={item.id}
                              data-alert-inhibit-row={item.id}
                              className={cn(
                                'cursor-pointer border-t border-[#252b34] transition hover:bg-[#111721]',
                                rowSelected ? 'bg-[#10141d]' : 'bg-[#0b0c0e]'
                              )}
                              onClick={() => onSelect(item.id)}
                            >
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-inhibit-row-checkbox="cold-checkbox"
                                  checked={checked}
                                  aria-label={item.name || t('alert.inhibit.default-title')}
                                  containerClassName="min-h-0"
                                  onChange={event => {
                                    onCheckedIdsChange(
                                      event.target.checked ? [...checkedIds, item.id] : checkedIds.filter(value => value !== item.id)
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{item.name || t('alert.inhibit.default-title')}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {sourceLabels.length > 0 ? sourceLabels.map(([key, value]) => (
                                    <span key={`${item.id}-source-${key}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                      {key}:{String(value)}
                                    </span>
                                  )) : <span className="text-[#6f7681]">-</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {targetLabels.length > 0 ? targetLabels.map(([key, value]) => (
                                    <span key={`${item.id}-target-${key}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                      {key}:{String(value)}
                                    </span>
                                  )) : <span className="text-[#6f7681]">-</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {equalLabels.length > 0 ? equalLabels.map(label => (
                                    <span key={`${item.id}-equal-${label}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                      {label}
                                    </span>
                                  )) : <span className="text-[#6f7681]">-</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-inhibit-enable-checkbox="cold-checkbox"
                                  checked={item.enable ?? true}
                                  containerClassName="min-h-0"
                                  onChange={() => onToggleEnabled(item)}
                                  label={<span className="sr-only">{item.enable ? t('common.enabled') : t('common.disabled')}</span>}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(item.gmtUpdate || item.gmtCreate || null)}</td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <div className="flex gap-1.5">
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onEdit(item.id)} disabled={editorLoading} title={t('alert.inhibit.edit')}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{editorLoading && rowSelected ? t('common.loading') : t('alert.inhibit.edit')}</span>
                                  </Button>
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onDelete(item.id)} title={t('alert.inhibit.delete')}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('alert.inhibit.delete')}</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr data-alert-inhibit-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                            <td colSpan={8} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                              <div className="inline-flex flex-col items-center gap-2.5">
                                <span
                                  data-alert-inhibit-empty-icon="cold-empty-box"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                                >
                                  <Inbox className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div data-alert-inhibit-empty-copy="true" className="text-[13px] font-semibold">{t('alert.inhibit.empty.title')}</div>
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
      {editorMessage ? <span className="sr-only" data-alert-inhibit-editor-message>{editorMessage}</span> : null}
      {editorError ? <span className="sr-only" data-alert-inhibit-editor-error>{editorError}</span> : null}
      <OverlayDialog
        open={editorOpen}
        title={draft.id ? t('alert.inhibit.edit') : t('alert.inhibit.new')}
        kicker={t('menu.alert.inhibit')}
        onClose={onCloseEditor}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {evidenceContext?.returnHref ? (
              <a
                data-alert-inhibit-editor-return="evidence-context"
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
            data-alert-inhibit-editor-error-inline="cold-validation"
            className="mb-3 rounded-[3px] border border-[#5d3037] bg-[#1a1013] px-3 py-2 text-[12px] font-semibold text-[#f0a7b2]"
          >
            {editorError}
          </div>
        ) : null}
        <AlertInhibitAuthoringFields
          t={t}
          draft={draft}
          onDraftChange={onDraftChange}
          mode="workspace"
          onCopySourceToTarget={onCopySourceToTarget}
          onDropSeverity={onDropSeverity}
          onClearTarget={onClearTarget}
          onClearEqual={onClearEqual}
          labelOptions={labelOptions}
        />
      </OverlayDialog>
    </>
  );
}
