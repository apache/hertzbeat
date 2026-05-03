'use client';

import React from 'react';
import { Copy, Inbox, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { buildLabelDisplayName } from '../../lib/label-manage/view-model';
import type { LabelManagePageData } from '../../lib/label-manage/controller';
import type { Label } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type LabelManageSurfaceProps = {
  t: Translator;
  data: LabelManagePageData;
  search: string;
  draftLabel: Label | null;
  isManageModalAdd: boolean;
  formatTime: (value?: number | string | null) => string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onCopy: (label: Label) => void;
  onEdit: (label: Label) => void;
  onDelete: (label: Label) => void;
  onDraftChange: (patch: Partial<Label>) => void;
  onCloseDialog: () => void;
  onSaveDialog: () => void;
};

const coldLabelVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldDialogInputClassName =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.16)]';

function isChineseTranslator(t: Translator): boolean {
  return t('common.refresh') === '刷新' || t('menu.advanced.labels') === '标签管理';
}

function resolveCopy(t: Translator, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

function resolveLabelType(type: number | null | undefined, t: Translator): string {
  const chinese = isChineseTranslator(t);
  if (type === 0) return chinese ? '自动标签' : 'Auto label';
  if (type === 1) return chinese ? '用户标签' : 'User label';
  if (type === 2) return chinese ? '预置标签' : 'Preset label';
  return '-';
}

export function LabelManageSurface({
  t,
  data,
  search,
  draftLabel,
  isManageModalAdd,
  formatTime,
  onSearchChange,
  onSearch,
  onRefresh,
  onNew,
  onCopy,
  onEdit,
  onDelete,
  onDraftChange,
  onCloseDialog,
  onSaveDialog
}: LabelManageSurfaceProps) {
  const labels = data.list.content ?? [];
  const dialogTitle = isManageModalAdd ? t('label.new') : t('label.edit');
  const displayName = draftLabel ? buildLabelDisplayName(draftLabel) : '';
  const emptyTitle = resolveCopy(t, 'setting.labels.empty.title', '暂无标签');
  const emptyCopy = resolveCopy(t, 'setting.labels.empty.copy', '请先新增标签。');

  return (
    <>
      <div
        data-label-manage-surface="otlp-cold-label-console"
        data-label-manage-style-baseline={coldLabelVisual.canvasName}
        className={coldLabelVisual.canvas.root}
        style={coldLabelVisual.canvas.backgroundStyle}
      >
        <section className={coldLabelVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-label-header="cold-compact-header" className={coldLabelVisual.panel.hero}>
                <div className="max-w-[820px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.advanced.labels')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    统一管理监控标签名称、标签值和描述，用紧凑表格保持检索、复制和编辑动作在同一工作面里完成。
                  </p>
                  <div data-label-command-row="standard-equal-buttons" className={coldLabelVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNew}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.button.new')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-label-admin-layout="full-width-admin-list" className="space-y-5">
              <section className="min-w-0">
                <SearchRow
                  data-label-toolbar="cold-table-toolbar"
                  data-label-search-owner="shared-search-row"
                  value={search}
                  placeholder={t('label.search')}
                  searchLabel={t('common.search')}
                  inputWidthClassName="w-[360px]"
                  onValueChange={onSearchChange}
                  onSearch={onSearch}
                />

                <div
                  data-label-table-shell="cold-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <table data-label-table="cold-label-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[24%] px-3 py-2.5">标签名称</th>
                        <th className="w-[18%] px-3 py-2.5">标签类型</th>
                        <th className="w-[28%] px-3 py-2.5">标签描述</th>
                        <th className="w-[18%] px-3 py-2.5">{t('common.edit-time')}</th>
                        <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labels.length > 0 ? labels.map(label => {
                        const labelText = buildLabelDisplayName(label);
                        const copyLabel = t('common.copy.button');
                        const editLabel = t('common.button.edit');
                        const deleteLabel = t('common.button.delete');

                        return (
                          <tr key={label.id} data-label-row={label.id} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">
                              <a
                                href={`/monitors?labels=${encodeURIComponent(labelText)}`}
                                className="inline-flex max-w-full rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[12px] leading-5 text-[#dbe4f0] hover:border-[#4e74f8] hover:text-white"
                              >
                                <span className="truncate">{labelText}</span>
                              </a>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                {resolveLabelType(label.type, t)}
                              </span>
                            </td>
                            <td className="truncate px-3 py-2.5" title={label.description || '-'}>
                              {label.description || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-[#858d9a]">
                              {formatTime(label.gmtUpdate || label.gmtCreate || null)}
                            </td>
                            <td className="px-3 py-2.5">
                              <div data-label-row-actions="cold-icon-actions" className="flex gap-1.5">
                                <Button size="icon" variant="default" className={coldIconButtonClassName} aria-label={copyLabel} title={copyLabel} onClick={() => onCopy(label)}>
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                                <Button size="icon" variant="default" className={coldIconButtonClassName} aria-label={editLabel} title={editLabel} onClick={() => onEdit(label)}>
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                                <Button size="icon" variant="default" className={coldIconButtonClassName} aria-label={deleteLabel} title={deleteLabel} onClick={() => onDelete(label)}>
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr data-label-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                          <td colSpan={5} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                            <div className="inline-flex flex-col items-center gap-2.5">
                              <span
                                data-label-empty-icon="cold-empty-box"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                              >
                                <Inbox className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <div className="text-[13px] font-semibold text-[#eef2f7]">{emptyTitle}</div>
                              <div className="text-[12px] leading-5 text-[#8f99ab]">{emptyCopy}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <OverlayDialog
        open={Boolean(draftLabel)}
        title={dialogTitle}
        onClose={onCloseDialog}
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={onCloseDialog}>
              {t('common.button.cancel')}
            </Button>
            <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSaveDialog}>
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        {draftLabel ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#a9b0bb]">
                <span>{t('label.name')}</span>
                <Input
                  className={coldDialogInputClassName}
                  value={draftLabel.name || ''}
                  onChange={event => onDraftChange({ name: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#a9b0bb]">
                <span>{t('label.value')}</span>
                <Input
                  className={coldDialogInputClassName}
                  value={draftLabel.tagValue || ''}
                  onChange={event => onDraftChange({ tagValue: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#a9b0bb]">
                <span>{t('label.description')}</span>
                <Input
                  className={coldDialogInputClassName}
                  value={draftLabel.description || ''}
                  onChange={event => onDraftChange({ description: event.target.value })}
                />
              </label>
            </div>
            <div data-label-dialog-preview="cold-preview" className="rounded-[4px] border border-[#2b3039] bg-[#101217] p-3">
              <div className="mb-3 text-[13px] font-semibold text-[#eef2f7]">{t('label.display')}</div>
              <div className="inline-flex min-h-8 max-w-full items-center rounded-[3px] border border-[#303743] bg-[#0b0c0e] px-2.5 text-[12px] font-semibold text-[#dbe4f0]">
                <span className="truncate">{displayName || '-'}</span>
              </div>
            </div>
          </div>
        ) : null}
      </OverlayDialog>
    </>
  );
}
