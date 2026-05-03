'use client';

import React from 'react';
import { ArrowLeft, Clock, Inbox, Network, Pencil, Plus, RefreshCw, Trash2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { SearchRow } from '../ui/search-row';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { AlertSilenceAuthoringFields } from './alert-silence-authoring-fields';
import {
  hasAlertTopologyReturnContext,
  resolveAlertInternalReturnHref,
  type AlertQueryState
} from '../../lib/alert-manage/query-state';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import type { AlertSilenceFormDraft } from '../../lib/alert-silence/controller';
import type { AlertSilenceEvidenceContext } from '../../lib/alert-silence/view-model';
import type { AlertLabelOptions } from '../../lib/alert-label-options';
import type { AlertSilence, PageResult } from '../../lib/types';
import { cn } from '../../lib/utils';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertSilenceSurfaceProps = {
  t: Translator;
  data: { list: PageResult<AlertSilence> };
  search: string;
  selectedId: number | null;
  checkedIds: number[];
  editorOpen: boolean;
  editorLoading: boolean;
  editorSaving: boolean;
  editorMessage: string | null;
  editorError: string | null;
  returnContext?: AlertQueryState;
  evidenceContext?: AlertSilenceEvidenceContext | null;
  draft: AlertSilenceFormDraft;
  labelOptions?: AlertLabelOptions;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  onSelect: (nextId: number | null) => void;
  onCheckedIdsChange: (nextIds: number[]) => void;
  onNew: () => void;
  onEdit: (silenceId?: number) => void;
  onSave: () => void;
  onToggleEnabled: (silence?: AlertSilence) => void;
  onDelete: (silenceId?: number) => void;
  onDeleteSelected: () => void;
  onCloseEditor: () => void;
  onDraftChange: (nextDraft: AlertSilenceFormDraft) => void;
};

const coldSilenceVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

function getSilenceTypeLabel(item: AlertSilence, t: Translator) {
  return Number(item.type ?? 0) === 0 ? t('alert.silence.type.once') : t('alert.silence.type.cyc');
}

function getSilenceTypeIcon(item: AlertSilence) {
  return Number(item.type ?? 0) === 0 ? (
    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
  );
}

export function AlertSilenceSurface({
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
  onDraftChange
}: AlertSilenceSurfaceProps) {
  const selected = data.list.content.find(item => item.id === selectedId) ?? data.list.content[0] ?? null;
  const selectedCount = checkedIds.length;
  const visibleIds = data.list.content.map(item => item.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every(id => checkedIds.includes(id));
  const topologyReturnHref = resolveAlertInternalReturnHref(returnContext?.returnTo);
  const topologyReturnActive = hasAlertTopologyReturnContext(returnContext);

  return (
    <>
      <div
        data-alert-silence-surface="otlp-cold-silence-console"
        data-alert-silence-style-baseline={coldSilenceVisual.canvasName}
        data-alert-silence-compact-canvas="content-height"
        className={coldSilenceVisual.canvas.root}
        style={{ ...coldSilenceVisual.canvas.backgroundStyle, minHeight: 'auto' }}
      >
        <section className={coldSilenceVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-alert-silence-header="cold-compact-header" className={coldSilenceVisual.panel.hero}>
                <div className="max-w-[840px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.alert.silence')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('alert.silence.copy')}
                  </p>
                  {topologyReturnActive ? (
                    <div
                      data-alert-silence-return-context="topology-edge"
                      data-alert-silence-return-edge-id={returnContext?.edgeId || 'none'}
                      className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-[3px] border border-[#303743] bg-[#101217] px-3 py-2 text-[12px] text-[#a9b0bb]"
                    >
                      <Network className="h-3.5 w-3.5 text-[#8ea2ff]" aria-hidden="true" />
                      <span className="font-semibold text-[#dbe4f0]">{returnContext?.serviceName || returnContext?.entityName || t('menu.topology')}</span>
                      {returnContext?.viewMode ? <span className="text-[#7e8494]">{returnContext.viewMode}</span> : null}
                      {returnContext?.sourceKind ? <span className="text-[#7e8494]">{returnContext.sourceKind}</span> : null}
                      {returnContext?.edgeId ? <span className="text-[#7e8494]">{returnContext.edgeId}</span> : null}
                      <a
                        data-alert-silence-return-action="true"
                        className="inline-flex items-center gap-1 rounded-[3px] border border-[#394150] px-2 py-1 font-semibold text-[#d8e4ff] hover:border-[#4e74f8] hover:text-white"
                        href={topologyReturnHref}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('menu.topology')}
                      </a>
                    </div>
                  ) : null}
                  <div data-alert-silence-command-row="standard-equal-buttons" className={coldSilenceVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="primary" className={coldPrimaryButtonClassName} onClick={onNew}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('alert.silence.action.new')}
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

            <div data-alert-silence-admin-layout="full-width-admin-list" className="space-y-5">
              {evidenceContext ? (
                <section
                  data-alert-silence-evidence-context="signal-route"
                  data-alert-silence-evidence-signal={evidenceContext.signal}
                  data-alert-silence-prefill-labels={evidenceContext.labelsText}
                  className="rounded-[4px] border border-[#27303c] bg-[#0b0f15] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[#eef2f7]">{evidenceContext.title}</p>
                      <p className="mt-1 max-w-[820px] text-[12px] leading-5 text-[#9099a7]">{evidenceContext.copy}</p>
                    </div>
                    {evidenceContext.returnHref ? (
                      <a
                        data-alert-silence-evidence-return="true"
                        href={evidenceContext.returnHref}
                        className="inline-flex h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
                      >
                        {t('alert.rule.evidence.return')}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-[3px] border border-[#222a34] bg-[#080a0e] px-3 py-2 font-mono text-[11px] leading-5 text-[#9aa5b5]">
                    {evidenceContext.labelsText || '-'}
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
                  data-alert-silence-toolbar="cold-query-toolbar"
                  value={search}
                  placeholder={t('alert.silence.name')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  onValueChange={onSearchChange}
                  onSearch={onApplyFilter}
                  onClear={search ? onClearFilter : undefined}
                />

                <div
                  data-alert-silence-table-shell="cold-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="overflow-hidden">
                    <table className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[44px] px-3 py-2.5">
                            <Checkbox
                              data-alert-silence-select-all="cold-checkbox"
                              checked={allVisibleChecked}
                              disabled={visibleIds.length === 0}
                              aria-label={t('common.select')}
                              containerClassName="min-h-0 justify-center"
                              onChange={event => {
                                onCheckedIdsChange(event.target.checked ? visibleIds : []);
                              }}
                            />
                          </th>
                          <th className="w-[20%] px-3 py-2.5">{t('alert.silence.name')}</th>
                          <th className="w-[16%] px-3 py-2.5">{t('alert.silence.type')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('alert.silence.times')}</th>
                          <th className="w-[10%] px-3 py-2.5">{t('common.enable')}</th>
                          <th className="w-[20%] px-3 py-2.5">{t('common.edit-time')}</th>
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
                              data-alert-silence-row={item.id}
                              className={cn(
                                'cursor-pointer border-t border-[#252b34] transition hover:bg-[#111721]',
                                rowSelected ? 'bg-[#10141d]' : 'bg-[#0b0c0e]'
                              )}
                              onClick={() => onSelect(item.id)}
                            >
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-silence-row-checkbox="cold-checkbox"
                                  checked={checked}
                                  aria-label={item.name || t('alert.silence.default-title')}
                                  containerClassName="min-h-0"
                                  onChange={event => {
                                    onCheckedIdsChange(
                                      event.target.checked ? [...checkedIds, item.id] : checkedIds.filter(value => value !== item.id)
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                                {item.name || t('alert.silence.default-title')}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                  {getSilenceTypeIcon(item)}
                                  {getSilenceTypeLabel(item, t)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                  <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                                  {item.times == null ? 0 : item.times}
                                </span>
                              </td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <Checkbox
                                  data-alert-silence-enable-checkbox="cold-checkbox"
                                  checked={item.enable ?? true}
                                  containerClassName="min-h-0"
                                  onChange={() => onToggleEnabled(item)}
                                  label={<span className="sr-only">{item.enable ? t('common.enabled') : t('common.disabled')}</span>}
                                />
                              </td>
                              <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(item.gmtUpdate || item.gmtCreate || null)}</td>
                              <td className="px-3 py-2.5" onClick={event => event.stopPropagation()}>
                                <div className="flex gap-1.5">
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onEdit(item.id)} disabled={editorLoading} title={t('alert.silence.edit')}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{editorLoading && rowSelected ? t('common.loading') : t('alert.silence.edit')}</span>
                                  </Button>
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onDelete(item.id)} title={t('alert.silence.delete')}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('alert.silence.delete')}</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr data-alert-silence-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                            <td colSpan={7} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                              <div className="inline-flex flex-col items-center gap-2.5">
                                <span
                                  data-alert-silence-empty-icon="cold-empty-box"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                                >
                                  <Inbox className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div data-alert-silence-empty-copy="true" className="text-[13px] font-semibold">{t('alert.silence.empty.title')}</div>
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
      {editorMessage ? <span className="sr-only" data-alert-silence-editor-message>{editorMessage}</span> : null}
      {editorError ? <span className="sr-only" data-alert-silence-editor-error>{editorError}</span> : null}
      <OverlayDialog
        open={editorOpen}
        title={draft.id ? t('alert.silence.edit') : t('alert.silence.new')}
        kicker={t('menu.alert.silence')}
        onClose={onCloseEditor}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {evidenceContext?.returnHref ? (
              <a
                data-alert-silence-editor-return="evidence-context"
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
            data-alert-silence-editor-error-inline="cold-validation"
            className="mb-3 rounded-[3px] border border-[#5d3037] bg-[#1a1013] px-3 py-2 text-[12px] font-semibold text-[#f0a7b2]"
          >
            {editorError}
          </div>
        ) : null}
        <AlertSilenceAuthoringFields t={t} draft={draft} onDraftChange={onDraftChange} mode="workspace" labelOptions={labelOptions} />
      </OverlayDialog>
    </>
  );
}
