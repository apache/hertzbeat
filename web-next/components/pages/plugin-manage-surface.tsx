'use client';

import React from 'react';
import { Inbox, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { buildPluginTableRows } from '../../lib/plugin-manage/view-model';
import type { PluginManagePageData, PluginUploadDraft } from '../../lib/plugin-manage/controller';
import type { Plugin } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type PluginManageSurfaceProps = {
  t: Translator;
  data: PluginManagePageData;
  search: string;
  selectedIds: number[];
  draftPlugin: PluginUploadDraft | null;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onDeleteSelected: () => void;
  onSelectedIdsChange: (ids: number[]) => void;
  onEditParams: (plugin: Plugin) => void;
  onToggleEnabled: (plugin: Plugin) => void;
  onDeleteOne: (plugin: Plugin) => void;
  onDraftChange: (patch: Partial<PluginUploadDraft>) => void;
  onCloseDialog: () => void;
  onSaveDialog: () => void;
};

const coldPluginVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldDialogInputClassName =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.16)]';

function isChineseTranslator(t: Translator): boolean {
  return t('common.refresh') === '刷新' || t('menu.advanced.plugins') === '插件管理';
}

function pluginTypeLabel(t: Translator, type?: string) {
  return type ? t(`plugin.type.${type}`) : t('common.none');
}

function pluginStatusLabel(enabled: boolean, t: Translator): string {
  if (isChineseTranslator(t)) {
    return enabled ? '已启用' : '已停用';
  }
  return enabled ? 'Enabled' : 'Disabled';
}

function PluginSwitch({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-[3px] border transition ${
        checked ? 'border-[#31405c] bg-[#182238]' : 'border-[#2b3039] bg-[#101217]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-[2px] bg-[#dbe4f0] shadow transition ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function PluginManageSurface({
  t,
  data,
  search,
  selectedIds,
  draftPlugin,
  onSearchChange,
  onSearch,
  onRefresh,
  onNew,
  onDeleteSelected,
  onSelectedIdsChange,
  onEditParams,
  onToggleEnabled,
  onDeleteOne,
  onDraftChange,
  onCloseDialog,
  onSaveDialog
}: PluginManageSurfaceProps) {
  const resolvedSelectedIds = selectedIds ?? [];
  const plugins = data.list.content ?? [];
  const rows = buildPluginTableRows(plugins);
  const allSelected = plugins.length > 0 && plugins.every(plugin => resolvedSelectedIds.includes(plugin.id));

  return (
    <>
      <div
        data-plugin-manage-surface="otlp-cold-plugin-console"
        data-plugin-manage-style-baseline={coldPluginVisual.canvasName}
        className={coldPluginVisual.canvas.root}
        style={coldPluginVisual.canvas.backgroundStyle}
      >
        <section className={coldPluginVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-plugin-header="cold-compact-header" className={coldPluginVisual.panel.hero}>
                <div className="max-w-[820px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.advanced.plugins')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    管理自定义插件、执行类型和启用状态，保持上传、筛选、批量删除和参数编辑在同一个紧凑工作面中完成。
                  </p>
                  <div data-plugin-command-row="standard-equal-buttons" className={coldPluginVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={onRefresh}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNew}>
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('plugin.upload')}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      onClick={onDeleteSelected}
                      disabled={resolvedSelectedIds.length === 0}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('plugin.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-plugin-admin-layout="full-width-admin-list" className="space-y-5">
              <section className="min-w-0">
                <SearchRow
                  data-plugin-manage-toolbar="cold-table-toolbar"
                  data-plugin-manage-search-owner="shared-search-row"
                  value={search}
                  placeholder={t('plugin.search')}
                  searchLabel={t('common.search')}
                  inputWidthClassName="w-[360px]"
                  onValueChange={onSearchChange}
                  onSearch={onSearch}
                  trailingActions={
                    <div className="text-[12px] font-semibold text-[#858d9a]">
                      已选择 <span className="text-[#dbe4f0]">{resolvedSelectedIds.length}</span>
                    </div>
                  }
                />

                <div
                  data-plugin-manage-table-shell="cold-dense-table"
                  className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <table data-plugin-manage-table="cold-plugin-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                    <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                      <tr>
                        <th className="w-[44px] px-3 py-2.5">
                          <Checkbox
                            data-plugin-select-all="cold-checkbox"
                            aria-label={t('common.select')}
                            containerClassName="min-h-0"
                            checked={allSelected}
                            disabled={plugins.length === 0}
                            onChange={event => {
                              onSelectedIdsChange(event.target.checked ? plugins.map(plugin => plugin.id) : []);
                            }}
                          />
                        </th>
                        <th className="w-[24%] px-3 py-2.5">{t('plugin.name')}</th>
                        <th className="w-[28%] px-3 py-2.5">{t('plugin.type')}</th>
                        <th className="w-[14%] px-3 py-2.5">{t('plugin.status')}</th>
                        <th className="w-[12%] px-3 py-2.5">参数</th>
                        <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? rows.map((row, index) => {
                        const original = plugins[index];
                        const checked = resolvedSelectedIds.includes(original.id);
                        return (
                          <tr key={row.key} data-plugin-row={row.key} className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]">
                            <td className="px-3 py-2.5">
                              <Checkbox
                                aria-label={t('common.select')}
                                data-plugin-row-select={String(original.id)}
                                containerClassName="min-h-0"
                                checked={checked}
                                onChange={event => {
                                  onSelectedIdsChange(
                                    event.target.checked
                                      ? [...resolvedSelectedIds, original.id]
                                      : resolvedSelectedIds.filter(value => value !== original.id)
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{row.name}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {row.typeLabels.length > 0 ? row.typeLabels.map(typeLabel => (
                                  <span key={`${row.key}-${typeLabel}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                    {pluginTypeLabel(t, typeLabel)}
                                  </span>
                                )) : <span className="text-[#6f7681]">-</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <PluginSwitch
                                  checked={Boolean(original.enableStatus)}
                                  label={pluginStatusLabel(Boolean(original.enableStatus), t)}
                                  onChange={() => onToggleEnabled(original)}
                                />
                                <span className="text-[11px] font-semibold text-[#cbd5e1]">
                                  {pluginStatusLabel(Boolean(original.enableStatus), t)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{row.paramCount}</td>
                            <td className="px-3 py-2.5">
                              <div data-plugin-row-actions="cold-icon-actions" className="flex gap-1.5">
                                {row.canEditParams ? (
                                  <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onEditParams(original)} title={t('plugin.param.edit')}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('plugin.param.edit')}</span>
                                  </Button>
                                ) : null}
                                <Button size="icon" variant="default" className={coldIconButtonClassName} onClick={() => onDeleteOne(original)} title={t('plugin.delete')}>
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('plugin.delete')}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr data-plugin-manage-empty-state="cold-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                          <td colSpan={6} className="h-[240px] px-3 text-center text-[#a9b0bb]">
                            <div className="inline-flex flex-col items-center gap-2.5">
                              <span
                                data-plugin-manage-empty-icon="cold-empty-box"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                              >
                                <Inbox className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <div className="text-[13px] font-semibold text-[#eef2f7]">暂无数据</div>
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
        open={Boolean(draftPlugin)}
        title={t('plugin.upload')}
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
        {draftPlugin ? (
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#a9b0bb]">
              <span>{t('plugin.name')}</span>
              <Input
                className={coldDialogInputClassName}
                value={draftPlugin.name}
                onChange={event => onDraftChange({ name: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2 text-[12px] font-semibold text-[#a9b0bb]">
              <span>{t('plugin.jar.file')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className={`${coldDialogInputClassName} min-w-0 flex-1`}
                  value={draftPlugin.jarFileName}
                  onChange={event => onDraftChange({ jarFileName: event.target.value })}
                />
                <Button size="sm" variant="default" className={coldButtonClassName} type="button">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('common.file.select')}
                </Button>
              </div>
            </label>
            <Checkbox
              data-plugin-draft-enabled-checkbox="cold-checkbox"
              checked={draftPlugin.enableStatus}
              onChange={event => onDraftChange({ enableStatus: event.target.checked })}
              label={t('plugin.status')}
              containerClassName="text-[#a9b0bb]"
            />
          </div>
        ) : null}
      </OverlayDialog>
    </>
  );
}
