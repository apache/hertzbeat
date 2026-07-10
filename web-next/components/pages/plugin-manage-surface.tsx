'use client';

import React from 'react';
import { CircleHelp, Inbox, MoreHorizontal, Pencil, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { HzConfigurableFieldEditor, HzConfirmDialog, HzFileInput, HzInlineFeedback, HzInput, HzKeyValueEditor, HzMonitorEditorFieldGrid, HzPaginationBar, HzRadioButtonGroup, HzSwitch, HzTableRowActionButton, HzTextarea } from '@hertzbeat/ui';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { LabelRecordInput } from '../ui/label-record-input';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { buildPluginTableRows } from '../../lib/plugin-manage/view-model';
import type { PluginManagePageData, PluginParamDraft, PluginUploadDraft } from '../../lib/plugin-manage/controller';
import type { ParamDefine, Plugin } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type PluginActionTone = 'success' | 'warning' | 'critical';
type PluginActionKind = 'enable' | 'delete' | 'upload' | 'params';
export type PluginDeleteTarget = {
  ids: number[];
  label: string;
  mode: 'single' | 'batch';
};

type PluginManageSurfaceProps = {
  t: Translator;
  data: PluginManagePageData;
  search: string;
  selectedIds: number[];
  draftPlugin: PluginUploadDraft | null;
  isUploadDialogOpen?: boolean;
  paramDraft?: PluginParamDraft | null;
  actionMessage?: string | null;
  actionError?: string | null;
  actionMeta?: string | null;
  actionTone?: PluginActionTone;
  actionKind?: PluginActionKind;
  loadError?: string | null;
  uploadValidation?: { name?: boolean; jarFile?: boolean };
  isUploadPending?: boolean;
  isParamPending?: boolean;
  deleteTarget: PluginDeleteTarget | null;
  isLoadPending?: boolean;
  isDeletePending?: boolean;
  isTogglePending?: boolean;
  optimisticEnableStatus?: Record<number, boolean>;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onSearchClear?: () => void;
  onRefresh: () => void;
  onNew: () => void;
  onDeleteSelected: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onSelectedIdsChange: (ids: number[]) => void;
  pageSizeOptions?: number[];
  onPageIndexChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEditParams: (plugin: Plugin) => void;
  onParamChange?: (field: string, value: unknown) => void;
  onCloseParamDialog?: () => void;
  onSaveParamDialog?: () => void;
  onToggleEnabled: (plugin: Plugin) => void;
  onDeleteOne: (plugin: Plugin) => void;
  onDraftChange: (patch: Partial<PluginUploadDraft>) => void;
  onCloseDialog: () => void;
  onSaveDialog: () => void;
};

const coldPluginVisual = hzOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldDialogInputClassName =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.16)]';

const pluginActionMenuRootClassName = 'group relative z-[9999] inline-block overflow-visible open:z-[9999]';
const pluginActionMenuPanelBaseClassName =
  'mt-2 z-[9999] min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]';

function pluginTypeLabel(t: Translator, type?: string) {
  return type ? t(`plugin.type.${type}`) : t('common.none');
}

function pluginStatusLabel(enabled: boolean, t: Translator): string {
  return enabled ? t('common.enabled') : t('common.disabled');
}

function PluginInlineHelp({
  id,
  label,
  copy,
  scope
}: {
  id: string;
  label: string;
  copy: string;
  scope: 'action' | 'upload-field' | 'param-field' | 'row-action';
}) {
  const tooltipId = `plugin-${scope}-help-${id}`;
  const rootData =
    scope === 'action'
      ? { 'data-plugin-action-help': id }
      : scope === 'upload-field'
        ? { 'data-plugin-upload-field-help': id }
        : scope === 'param-field'
          ? { 'data-plugin-param-field-help': id }
          : { 'data-plugin-row-action-help': id };
  const tooltipData =
    scope === 'action'
      ? { 'data-plugin-action-help-tooltip': id }
      : scope === 'upload-field'
        ? { 'data-plugin-upload-field-help-tooltip': id }
        : scope === 'param-field'
          ? { 'data-plugin-param-field-help-tooltip': id }
          : { 'data-plugin-row-action-help-tooltip': id };
  const isActionHelp = scope === 'action' || scope === 'row-action';
  const helpStyle = isActionHelp ? 'icon-after-action' : 'icon-after-label';
  const helpVisual = 'circle-help-icon';
  const styleData =
    scope === 'action'
      ? { 'data-plugin-action-help-style': helpStyle }
      : scope === 'upload-field'
        ? { 'data-plugin-upload-field-help-style': helpStyle }
        : scope === 'param-field'
          ? { 'data-plugin-param-field-help-style': helpStyle }
          : { 'data-plugin-row-action-help-style': helpStyle };

  return (
    <span {...rootData} {...styleData} className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        data-plugin-help-style={helpStyle}
        data-plugin-help-visual={helpVisual}
        onMouseDown={event => {
          event.stopPropagation();
        }}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
      >
        <CircleHelp size={isActionHelp ? 13 : 12} strokeWidth={2} aria-hidden="true" data-plugin-help-icon="lucide-circle-help" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        {...tooltipData}
        className="pointer-events-none absolute left-0 top-6 z-50 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left text-[11px] leading-4 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover:block group-focus-within:block"
      >
        {copy}
      </span>
    </span>
  );
}

function PluginFieldTitle({
  id,
  children,
  helpLabel,
  help,
  mode,
  modeLabel,
  inputMode,
  inputModeLabel,
  requirement,
  requirementLabel,
  scope,
  required
}: {
  id: string;
  children: React.ReactNode;
  helpLabel: string;
  help: string;
  mode: string;
  modeLabel: string;
  inputMode?: string;
  inputModeLabel?: string;
  requirement?: string;
  requirementLabel?: string;
  scope: 'upload-field' | 'param-field';
  required?: boolean;
}) {
  const modeData =
    scope === 'upload-field'
      ? { 'data-plugin-upload-field-mode': mode }
      : { 'data-plugin-param-field-mode': mode };

  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span>{children}</span>
      {scope === 'upload-field' && requirement && inputMode ? (
        <>
          <span
            data-plugin-upload-field-meta="requirement-and-input-mode"
            data-plugin-upload-field-requirement={requirement}
            {...modeData}
            className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#ffb4a8]"
          >
            {requirementLabel}
          </span>
          <span
            data-plugin-upload-field-meta="requirement-and-input-mode"
            data-plugin-upload-field-input-mode={inputMode}
            className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#8f99ab]"
          >
            {inputModeLabel}
          </span>
        </>
      ) : (
        <span
          {...modeData}
          className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#8f99ab]"
        >
          {modeLabel}
        </span>
      )}
      <PluginInlineHelp id={id} label={helpLabel} copy={help} scope={scope} />
      {required ? <span className="text-[#ffb4a8]">*</span> : null}
    </span>
  );
}

function stringifyPluginParamValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

type PluginParamKeyValueRow = {
  key: string;
  value: string;
};

type PluginParamConfigurableRow = Record<string, string>;

function parsePluginParamKeyValueRows(value: unknown): PluginParamKeyValueRow[] {
  if (Array.isArray(value)) {
    const rows = value.map(item => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return {
          key: String(record.key ?? ''),
          value: String(record.value ?? '')
        };
      }
      return { key: String(item ?? ''), value: '' };
    });
    return rows.length > 0 ? rows : [{ key: '', value: '' }];
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length > 0
      ? entries.map(([key, entryValue]) => ({ key, value: String(entryValue ?? '') }))
      : [{ key: '', value: '' }];
  }

  if (typeof value !== 'string') return [{ key: '', value: '' }];
  const trimmed = value.trim();
  if (!trimmed || trimmed === '""') return [{ key: '', value: '' }];

  try {
    const parsed = JSON.parse(trimmed);
    return parsePluginParamKeyValueRows(parsed);
  } catch {
    return [{ key: '', value: trimmed }];
  }
}

function stringifyPluginParamKeyValueRows(rows: PluginParamKeyValueRow[]): string {
  return JSON.stringify(
    rows.reduce<Record<string, string>>((record, row) => {
      const key = row.key.trim();
      if (!key) return record;
      record[key] = row.value.trim();
      return record;
    }, {})
  );
}

function objectifyPluginParamLabelRows(rows: PluginParamKeyValueRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((record, row) => {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key || !value) return record;
    record[key] = value;
    return record;
  }, {});
}

function stringifyPluginParamLabelSelectorValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '""') return '';
    try {
      const parsed = JSON.parse(trimmed);
      return stringifyPluginParamLabelSelectorValue(parsed);
    } catch {
      return trimmed;
    }
  }

  return parsePluginParamKeyValueRows(value)
    .filter(row => row.key.trim())
    .map(row => {
      const key = row.key.trim();
      const rowValue = row.value.trim();
      return rowValue ? `${key}:${rowValue}` : key;
    })
    .join(', ');
}

function objectifyPluginParamLabelSelectorValue(value: string): Record<string, string> {
  return value.split(',').reduce<Record<string, string>>((record, item) => {
    const [keyPart, ...valueParts] = item.split(':');
    const key = keyPart.trim();
    const rowValue = valueParts.join(':').trim();
    if (!key || !rowValue) return record;
    record[key] = rowValue;
    return record;
  }, {});
}

function parsePluginParamConfigurableRows(value: unknown, keys: string[]): PluginParamConfigurableRow[] {
  if (Array.isArray(value)) {
    const rows = value.map(item => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return Object.fromEntries(keys.map(key => [key, String(record[key] ?? '')]));
      }
      return Object.fromEntries(keys.map((key, index) => [key, index === 0 ? String(item ?? '') : '']));
    });
    return rows.length > 0 ? rows : [{}];
  }
  return [{}];
}

function isPluginParamTextarea(define: ParamDefine): boolean {
  return define.type === 'json' || define.type === 'textarea' || define.type === 'textarea-limit';
}

function isPluginParamMultiFuncInput(define: ParamDefine): boolean {
  return define.type === 'text' || define.type === 'string' || define.type === 'array' || define.type === 'password';
}

function getPluginParamTextareaRows(define: ParamDefine): 4 | 8 {
  return define.type === 'json' || define.type === 'textarea' ? 8 : 4;
}

function buildPluginParamRadioOptions(define: ParamDefine) {
  return (define.options ?? []).map(option => ({
    value: option.value ?? '',
    label: typeof option.label === 'string' ? option.label : option.value ?? ''
  }));
}

function PluginSwitch({
  checked,
  label,
  onChange,
  commandAction
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  commandAction?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={label}
      onClick={onChange}
      data-plugin-command-action={commandAction}
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
  isUploadDialogOpen,
  paramDraft,
  actionMessage,
  actionError,
  actionMeta,
  actionTone,
  actionKind,
  loadError,
  uploadValidation,
  isUploadPending,
  isParamPending,
  deleteTarget,
  isLoadPending,
  isDeletePending,
  isTogglePending,
  optimisticEnableStatus,
  onSearchChange,
  onSearch,
  onSearchClear,
  onRefresh,
  onNew,
  onDeleteSelected,
  onDeleteCancel,
  onDeleteConfirm,
  onSelectedIdsChange,
  pageSizeOptions = [8, 15, 25],
  onPageIndexChange,
  onPageSizeChange,
  onEditParams,
  onParamChange,
  onCloseParamDialog,
  onSaveParamDialog,
  onToggleEnabled,
  onDeleteOne,
  onDraftChange,
  onCloseDialog,
  onSaveDialog
}: PluginManageSurfaceProps) {
  const resolvedSelectedIds = selectedIds ?? [];
  const plugins = data.list.content ?? [];
  const rows = buildPluginTableRows(plugins, t);
  const currentPageIndex = Math.max(0, data.list.pageIndex ?? 0);
  const currentPageSize = Math.max(1, data.list.pageSize ?? pageSizeOptions[0] ?? 8);
  const totalElements = data.list.totalElements || 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / currentPageSize));
  const currentPage = Math.min(currentPageIndex + 1, totalPages);
  const pageStart = totalElements === 0 || rows.length === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const pageEnd = totalElements === 0 ? 0 : Math.min(totalElements, currentPageIndex * currentPageSize + rows.length);
  const allSelected = plugins.length > 0 && plugins.every(plugin => resolvedSelectedIds.includes(plugin.id));
  const isFilteredEmpty = rows.length === 0 && search.trim().length > 0;
  const resolvedActionTone = actionTone ?? (actionError ? 'critical' : 'success');
  const isUploadFailure = actionKind === 'upload' && Boolean(actionError);
  const isParamFailure = actionKind === 'params' && Boolean(actionError);
  const isEnableFailure = actionKind === 'enable' && Boolean(actionError);
  const isDeleteFailure = actionKind === 'delete' && resolvedActionTone === 'critical' && Boolean(actionError);
  const actionFeedbackTitle = isUploadFailure
    ? t('common.notify.new-fail')
    : isParamFailure
      ? t('common.notify.edit-fail')
      : isEnableFailure
        ? t('common.notify.edit-fail')
        : isDeleteFailure
          ? t('common.notify.delete-fail')
          : actionError ?? actionMessage ?? '';
  const actionFeedbackMeta = isUploadFailure || isParamFailure || isEnableFailure || isDeleteFailure ? actionMeta ?? actionError ?? undefined : undefined;
  const tableLoading = Boolean(isLoadPending || isDeletePending || isTogglePending);
  const resolveEnableStatus = (plugin: Plugin) => (
    optimisticEnableStatus && Object.prototype.hasOwnProperty.call(optimisticEnableStatus, plugin.id)
      ? Boolean(optimisticEnableStatus[plugin.id])
      : Boolean(plugin.enableStatus)
  );
  const pluginJarInputRef = React.useRef<HTMLInputElement>(null);
  const [isToolbarActionMenuOpen, setToolbarActionMenuOpen] = React.useState(false);
  const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null);
  const paginationSummary = t('setting.plugins.pagination.summary', {
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

  return (
    <>
      <div
        data-plugin-manage-surface="otlp-hertzbeat-ui-plugin-console"
        data-plugin-manage-style-baseline={coldPluginVisual.canvasName}
        className={coldPluginVisual.canvas.root}
        style={coldPluginVisual.canvas.backgroundStyle}
      >
        <section className={coldPluginVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div
                data-plugin-header="hertzbeat-ui-compact-header"
                data-plugin-header-nesting-contract="flat-page-introduction"
                data-plugin-action-menu-clipping="none"
                className="z-[80] overflow-visible p-0"
                style={{ overflow: 'visible' }}
              >
                <div className="max-w-[820px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.advanced.plugins')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('setting.plugins.copy')}
                  </p>
                  <div data-plugin-command-row="standard-equal-buttons" className={coldPluginVisual.button.row}>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldButtonClassName}
                        onClick={onRefresh}
                        data-plugin-command-action="refresh"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.refresh')}
                      </Button>
                      <PluginInlineHelp id="refresh" label={t('setting.plugins.action.refresh.help-label')} copy={t('setting.plugins.action.refresh.help')} scope="action" />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldPrimaryButtonClassName}
                        onClick={onNew}
                        data-plugin-upload-open="angular-upload-modal"
                        data-plugin-command-action="upload-open"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('plugin.upload')}
                      </Button>
                      <PluginInlineHelp id="upload" label={t('setting.plugins.action.upload.help-label')} copy={t('setting.plugins.action.upload.help')} scope="action" />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <div
                        className={pluginActionMenuRootClassName}
                        data-plugin-toolbar-delete-menu="angular-toolbar-ellipsis-delete"
                        data-plugin-toolbar-delete-menu-contract="angular-toolbar-ellipsis-delete"
                        data-plugin-toolbar-delete-menu-layer="overlay-visible-above-panel"
                        data-plugin-toolbar-delete-menu-clearance="floating-overlay-no-panel-crop"
                        data-plugin-toolbar-delete-menu-open={isToolbarActionMenuOpen ? 'true' : 'false'}
                      >
                        <button
                          type="button"
                          aria-expanded={isToolbarActionMenuOpen}
                          aria-label={t('common.edit')}
                          title={t('common.edit')}
                          className={`${coldIconButtonClassName} inline-flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden`}
                          onClick={() => setToolbarActionMenuOpen(open => !open)}
                          data-plugin-toolbar-delete-menu-trigger="angular-toolbar-ellipsis-delete"
                          data-plugin-command-action="bulk-menu"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">{t('common.edit')}</span>
                        </button>
                        <div
                          role="menu"
                          hidden={!isToolbarActionMenuOpen}
                          className={`${pluginActionMenuPanelBaseClassName} left-0`}
                          data-plugin-toolbar-delete-menu-panel="angular-toolbar-ellipsis-delete"
                          data-plugin-toolbar-delete-menu-layer-panel="overlay-visible-above-panel"
                          data-plugin-toolbar-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
                          data-plugin-toolbar-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                        >
                          <HzTableRowActionButton
                            width="root-span"
                            intent="ghost"
                            onClick={() => {
                              setToolbarActionMenuOpen(false);
                              onDeleteSelected();
                            }}
                            data-plugin-delete-selected="angular-batch-delete-entry"
                            data-plugin-delete-selected-owner="hertzbeat-ui-table-row-action-button"
                            data-plugin-command-action="bulk-delete"
                            className="w-full text-[#fecaca] hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="truncate">{t('plugin.delete')}</span>
                          </HzTableRowActionButton>
                        </div>
                      </div>
                      <PluginInlineHelp id="bulk-delete" label={t('setting.plugins.action.bulk-delete.help-label')} copy={t('setting.plugins.action.bulk-delete.help')} scope="action" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              data-plugin-admin-layout="full-width-admin-list"
              data-plugin-enable-feedback-contract="angular-edit-notify"
              data-plugin-enable-feedback-contract-owner="hertzbeat-ui-inline-feedback"
              data-plugin-enable-optimistic-contract="angular-toggle-mutates-row-before-put"
              data-plugin-enable-optimistic-owner="route-state-contract"
              data-plugin-table-loading-contract="angular-load-plugins-table"
              data-plugin-table-loading-scope="load-search-refresh-pagination-mutation"
              data-plugin-load-failure-contract="angular-console-only-shell"
              data-plugin-load-failure-owner="plugin-route-controller"
              data-plugin-load-failure={loadError ? 'angular-console-only-shell' : 'none'}
              data-plugin-toggle-loading-contract="angular-nz-table-loading"
              data-plugin-toggle-loading-contract-owner="angular-nz-table-loading"
              data-plugin-selection-reset-contract="angular-load-clears-selection"
              data-plugin-selection-reset-owner="route-state-contract"
              data-plugin-query-param-order-contract="angular-page-index-size-search"
              data-plugin-query-param-order-owner="plugin-query-state"
              data-plugin-delete-warning-contract="angular-no-select-warning"
              data-plugin-delete-confirm-contract="angular-modal-confirm"
              data-plugin-delete-confirm-contract-owner="hertzbeat-ui-confirm-dialog"
              data-plugin-delete-feedback-contract="angular-delete-notify"
              data-plugin-delete-feedback-contract-owner="hertzbeat-ui-inline-feedback"
              data-plugin-delete-failure-contract="angular-delete-fail-notification"
              data-plugin-delete-failure-owner="hertzbeat-ui-inline-feedback"
              data-plugin-enable-failure-contract="angular-edit-fail-notification"
              data-plugin-enable-failure-owner="hertzbeat-ui-inline-feedback"
              data-plugin-delete-query-contract="angular-repeated-ids-query"
              data-plugin-delete-query-owner="route-mutation-contract"
              data-plugin-delete-page-clamp-contract="angular-update-page-index"
              data-plugin-table-columns-contract="angular-five-column-edit-actions"
              data-plugin-table-columns-owner="angular-nz-table"
              data-plugin-table-stable-height-contract="viewport-fill-on-empty-or-short"
              data-plugin-table-stable-height-owner="route-layout-contract"
              data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
              data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
              data-plugin-upload-validation-contract="angular-required-before-submit"
              data-plugin-upload-invalid-submit-contract="angular-mark-dirty-keep-open"
              data-plugin-upload-invalid-submit-owner="route-validation-contract"
              data-plugin-upload-loading-contract="angular-nz-ok-loading"
              data-plugin-upload-payload-contract="angular-form-data"
              data-plugin-upload-name-payload-contract="angular-raw-name-no-trim"
              data-plugin-upload-name-payload-owner="plugin-manage-controller"
              data-plugin-upload-save-lifecycle-contract="angular-close-success-keep-open-fail"
              data-plugin-upload-save-lifecycle-owner="route-state-contract"
              data-plugin-upload-success-reset-contract="angular-reset-form-after-success"
              data-plugin-upload-success-reset-owner="route-state-contract"
              data-plugin-upload-cancel-contract="angular-cancel-preserves-form"
              data-plugin-upload-cancel-contract-owner="route-state-contract"
              data-plugin-upload-cancel-pending-contract="angular-cancel-allowed-during-ok-loading"
              data-plugin-upload-cancel-pending-owner="angular-nz-modal"
              data-plugin-upload-mask-closable-contract="angular-mask-closable-false"
              data-plugin-upload-width-contract="angular-width-30-percent"
              data-plugin-upload-modal-owner="angular-nz-modal"
              data-plugin-upload-field-layout-contract="angular-label-8-control-14"
              data-plugin-upload-field-layout-owner="route-form-field-grid"
              data-plugin-upload-status-control-contract="angular-nz-switch"
              data-plugin-upload-status-control-owner="hertzbeat-ui-switch"
              data-plugin-upload-file-list-contract="angular-before-upload-single-replace"
              data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"
              data-plugin-upload-file-remove-contract="angular-nz-remove-clears-jar"
              data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"
              data-plugin-upload-feedback-contract="angular-new-notify"
              data-plugin-upload-feedback-contract-owner="hertzbeat-ui-inline-feedback"
              data-plugin-upload-failure-contract="angular-new-fail-notification"
              data-plugin-upload-failure-owner="hertzbeat-ui-inline-feedback"
              data-plugin-param-edit-contract="angular-params-define-modal"
              data-plugin-param-action-visibility-contract="angular-paramcount-zero-only"
              data-plugin-param-action-visibility-owner="plugin-view-model"
              data-plugin-param-mask-closable-contract="angular-mask-closable-false"
              data-plugin-param-modal-owner="angular-nz-modal"
              data-plugin-param-save-contract="angular-params-post"
              data-plugin-param-payload-contract="angular-object-values-payload"
              data-plugin-param-save-lifecycle-contract="angular-close-success-keep-open-fail"
              data-plugin-param-save-lifecycle-owner="route-state-contract"
              data-plugin-param-save-loading-contract="angular-no-ok-loading"
              data-plugin-param-save-loading-owner="angular-modal-ok-contract"
              data-plugin-param-feedback-contract="angular-edit-notify"
              data-plugin-param-failure-contract="angular-edit-fail-notification"
              data-plugin-param-failure-owner="hertzbeat-ui-inline-feedback"
              data-plugin-param-empty-contract="angular-empty-params-modal"
              data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"
              data-plugin-param-pending-editable-contract="angular-controls-remain-enabled"
              data-plugin-param-pending-editable-owner="angular-param-modal"
              data-plugin-param-width-contract="angular-default-modal-width"
              data-plugin-param-width-owner="angular-nz-modal"
              data-plugin-param-radio-contract="angular-nz-radio-group"
              data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"
              data-plugin-param-textarea-contract="angular-textarea-rows-8"
              data-plugin-param-textarea-owner="hertzbeat-ui-textarea"
              data-plugin-param-advanced-fields-contract="angular-configurable-and-multi-func"
              data-plugin-param-advanced-fields-owner="hertzbeat-ui-advanced-param-controls"
              data-plugin-param-configurable-field-contract="angular-app-configurable-field"
              data-plugin-param-configurable-field-owner="hertzbeat-ui-configurable-field"
              data-plugin-param-key-value-contract="angular-app-configurable-field"
              data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"
              data-plugin-param-labels-contract="angular-app-configurable-field"
              data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"
              data-plugin-param-label-selector-contract="angular-app-label-selector"
              data-plugin-param-label-selector-owner="hertzbeat-ui-label-selector"
              data-plugin-param-metrics-field-contract="angular-app-configurable-field"
              data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
              data-plugin-param-array-contract="angular-app-multi-func-input"
              data-plugin-param-array-owner="hertzbeat-ui-input"
              data-plugin-param-field-layout-contract="angular-label-7-control-8"
              data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"
              data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"
              className="space-y-5"
            >
              <section className="min-w-0">
                <SearchRow
                  data-plugin-manage-toolbar="hertzbeat-ui-table-toolbar"
                  data-plugin-manage-search-owner="shared-search-row"
                  data-plugin-search-submit-contract="angular-enter-and-clear"
                  data-plugin-search-clear-contract="angular-cleared-load"
                  data-plugin-search-clear-owner="shared-search-row"
                  value={search}
                  placeholder={t('plugin.search')}
                  searchLabel={t('common.search')}
                  clearLabel={t('common.clear')}
                  inputWidthClassName="w-[360px]"
                  onValueChange={onSearchChange}
                  onSearch={onSearch}
                  onClear={onSearchClear}
                  trailingActions={
                    <div className="text-[12px] font-semibold text-[#858d9a]">
                      {t('setting.plugins.selected-count', { count: resolvedSelectedIds.length })}
                    </div>
                  }
                />
                {actionFeedbackTitle ? (
                  <HzInlineFeedback
                    tone={resolvedActionTone}
                    title={actionFeedbackTitle}
                    meta={actionFeedbackMeta}
                    variant="embedded"
                    data-plugin-action-feedback={resolvedActionTone}
                    data-plugin-enable-feedback={
                      actionKind === 'enable'
                        ? resolvedActionTone === 'critical'
                          ? 'angular-edit-fail'
                          : 'angular-edit-notify'
                        : undefined
                    }
                    data-plugin-enable-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-plugin-enable-failure={isEnableFailure ? 'angular-edit-fail-notification' : undefined}
                    data-plugin-enable-failure-owner={isEnableFailure ? 'hertzbeat-ui-inline-feedback' : undefined}
                    data-plugin-enable-feedback-title={
                      actionKind === 'enable'
                        ? resolvedActionTone === 'critical'
                          ? 'common.notify.edit-fail'
                          : 'common.notify.edit-success'
                        : undefined
                    }
                    data-plugin-enable-feedback-detail={isEnableFailure ? 'backend-message' : undefined}
                    data-plugin-delete-feedback={
                      actionKind === 'delete'
                        ? resolvedActionTone === 'warning'
                          ? 'angular-no-select-warning'
                          : resolvedActionTone === 'critical'
                            ? 'angular-delete-fail'
                            : 'angular-delete-notify'
                        : undefined
                    }
                    data-plugin-delete-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-plugin-delete-failure={isDeleteFailure ? 'angular-delete-fail-notification' : undefined}
                    data-plugin-delete-failure-owner={isDeleteFailure ? 'hertzbeat-ui-inline-feedback' : undefined}
                    data-plugin-delete-feedback-title={
                      actionKind === 'delete'
                        ? resolvedActionTone === 'critical'
                          ? 'common.notify.delete-fail'
                          : resolvedActionTone === 'warning'
                            ? 'common.notify.no-select-delete'
                            : 'common.notify.delete-success'
                        : undefined
                    }
                    data-plugin-delete-feedback-detail={isDeleteFailure ? 'backend-message' : undefined}
                    data-plugin-upload-feedback={
                      actionKind === 'upload'
                        ? resolvedActionTone === 'critical'
                          ? 'angular-new-fail'
                          : 'angular-new-notify'
                        : undefined
                    }
                    data-plugin-upload-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-plugin-upload-feedback-title={
                      actionKind === 'upload'
                        ? resolvedActionTone === 'critical'
                          ? 'common.notify.new-fail'
                          : 'common.notify.new-success'
                        : undefined
                    }
                    data-plugin-upload-feedback-detail={
                      actionKind === 'upload' && resolvedActionTone === 'critical' ? 'backend-message' : undefined
                    }
                    data-plugin-param-feedback={
                      actionKind === 'params'
                        ? resolvedActionTone === 'critical'
                          ? 'angular-edit-fail'
                          : 'angular-edit-notify'
                        : undefined
                    }
                    data-plugin-param-feedback-owner="hertzbeat-ui-inline-feedback"
                    data-plugin-param-failure={isParamFailure ? 'angular-edit-fail-notification' : undefined}
                    data-plugin-param-failure-owner={
                      isParamFailure ? 'hertzbeat-ui-inline-feedback' : undefined
                    }
                    data-plugin-param-feedback-title={
                      actionKind === 'params'
                        ? resolvedActionTone === 'critical'
                          ? 'common.notify.edit-fail'
                          : 'common.notify.edit-success'
                        : undefined
                    }
                    data-plugin-param-feedback-detail={isParamFailure ? 'backend-message' : undefined}
                  />
                ) : null}

                <div
                  data-plugin-manage-table-shell="hertzbeat-ui-dense-table"
                  data-plugin-table-stable-height="viewport-fill-on-empty-or-short"
                  data-plugin-table-stable-height-owner="route-layout-contract"
                  data-plugin-table-loading={tableLoading ? 'true' : 'false'}
                  data-plugin-table-loading-owner="angular-nz-table-loading"
                  aria-busy={tableLoading ? 'true' : 'false'}
                  className="flex min-h-[360px] flex-col overflow-visible rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)] lg:min-h-[calc(100vh-390px)]"
                >
                  <div className="min-h-0 flex-1 bg-[#0b0c0e]" data-plugin-table-fill-stage="viewport-fill-on-empty-or-short">
                    <table
                      data-plugin-manage-table="hertzbeat-ui-plugin-table"
                      data-plugin-table-columns="angular-five-column-edit-actions"
                      data-plugin-table-columns-owner="angular-nz-table"
                      className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]"
                    >
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[44px] px-3 py-2.5">
                            <Checkbox
                              data-plugin-select-all="hertzbeat-ui-checkbox"
                              aria-label={t('common.select')}
                              containerClassName="min-h-0"
                              checked={allSelected}
                              disabled={plugins.length === 0}
                              onChange={event => {
                                onSelectedIdsChange(event.target.checked ? plugins.map(plugin => plugin.id) : []);
                              }}
                            />
                          </th>
                          <th className="w-[26%] px-3 py-2.5">{t('plugin.name')}</th>
                          <th className="w-[34%] px-3 py-2.5">{t('plugin.type')}</th>
                          <th className="w-[16%] px-3 py-2.5">{t('plugin.status')}</th>
                          <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length > 0 ? rows.map((row, index) => {
                          const original = plugins[index];
                          const checked = resolvedSelectedIds.includes(original.id);
                          const hasOptimisticEnableStatus = Boolean(
                            optimisticEnableStatus && Object.prototype.hasOwnProperty.call(optimisticEnableStatus, original.id)
                          );
                          const displayEnableStatus = resolveEnableStatus(original);
                          const rowActionMenuId = String(original.id);
                          const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId;
                          const actionLabelParams = { name: row.name };
                          const editParamsLabel = t('setting.plugins.action.params-aria', actionLabelParams);
                          const deleteLabel = t('setting.plugins.action.delete-aria', actionLabelParams);
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
                                  )) : <span className="text-[#6f7681]">{t('common.none')}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div
                                  className="flex items-center gap-2"
                                  data-plugin-enable-optimistic-state={hasOptimisticEnableStatus ? 'overridden' : 'source'}
                                  data-plugin-enable-optimistic-next-status={displayEnableStatus ? 'true' : 'false'}
                                >
                                  <PluginSwitch
                                    checked={displayEnableStatus}
                                    label={pluginStatusLabel(displayEnableStatus, t)}
                                    onChange={() => onToggleEnabled(original)}
                                    commandAction="row-toggle-enable"
                                  />
                                  <span className="text-[11px] font-semibold text-[#cbd5e1]">
                                    {pluginStatusLabel(displayEnableStatus, t)}
                                  </span>
                                  <PluginInlineHelp
                                    id="row-enable"
                                    label={t('setting.plugins.action.row-enable.help-label')}
                                    copy={t('setting.plugins.action.row-enable.help')}
                                    scope="row-action"
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div data-plugin-row-actions="angular-row-actions-contextual" data-plugin-row-actions-owner="hertzbeat-ui-icon-actions" className="flex gap-1.5">
                                  {row.canEditParams ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="default"
                                        className={coldIconButtonClassName}
                                        onClick={() => {
                                          setOpenRowActionMenuId(null);
                                          onEditParams(original);
                                        }}
                                        aria-label={editParamsLabel}
                                        title={editParamsLabel}
                                        data-plugin-param-edit-open={String(original.id)}
                                        data-plugin-command-action="row-edit-params"
                                        data-plugin-row-action="params"
                                        data-plugin-row-action-owner="row-contextual-icon-button"
                                        data-plugin-row-action-label={row.name}
                                      >
                                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="sr-only">{editParamsLabel}</span>
                                      </Button>
                                      <PluginInlineHelp
                                        id="row-params"
                                        label={t('setting.plugins.action.row-params.help-label')}
                                        copy={t('setting.plugins.action.row-params.help')}
                                        scope="row-action"
                                      />
                                    </span>
                                  ) : null}
                                  <div
                                    className={pluginActionMenuRootClassName}
                                    data-plugin-row-delete-menu={rowActionMenuId}
                                    data-plugin-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
                                    data-plugin-row-delete-menu-layer="overlay-visible-above-panel"
                                    data-plugin-row-delete-menu-clearance="floating-overlay-no-panel-crop"
                                    data-plugin-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}
                                  >
                                    <button
                                      type="button"
                                      aria-expanded={isRowActionMenuOpen}
                                      aria-label={t('common.edit')}
                                      title={t('common.edit')}
                                      className={`${coldIconButtonClassName} inline-flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden`}
                                      onClick={() => setOpenRowActionMenuId(current => (current === rowActionMenuId ? null : rowActionMenuId))}
                                      data-plugin-row-delete-menu-trigger={rowActionMenuId}
                                      data-plugin-command-action="row-more"
                                      data-plugin-row-action-label={row.name}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{deleteLabel}</span>
                                    </button>
                                    <div
                                      role="menu"
                                      hidden={!isRowActionMenuOpen}
                                      className={`${pluginActionMenuPanelBaseClassName} right-0`}
                                      data-plugin-row-delete-menu-panel={rowActionMenuId}
                                      data-plugin-row-delete-menu-layer-panel="overlay-visible-above-panel"
                                      data-plugin-row-delete-menu-clearance-panel="floating-overlay-no-panel-crop"
                                      data-plugin-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                                      data-plugin-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}
                                    >
                                      <span className="flex items-center gap-1">
                                        <HzTableRowActionButton
                                          width="root-span"
                                          intent="ghost"
                                          onClick={() => {
                                            setOpenRowActionMenuId(null);
                                            onDeleteOne(original);
                                          }}
                                          data-plugin-delete-one={String(original.id)}
                                          data-plugin-delete-one-owner="hertzbeat-ui-table-row-action-button"
                                          data-plugin-command-action="row-delete"
                                          data-plugin-row-action="delete"
                                          data-plugin-row-action-label={row.name}
                                          className="w-full text-[#fecaca] hover:text-white"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                          <span className="truncate">{t('plugin.delete')}</span>
                                        </HzTableRowActionButton>
                                        <PluginInlineHelp
                                          id="row-delete"
                                          label={t('setting.plugins.action.row-delete.help-label')}
                                          copy={t('setting.plugins.action.row-delete.help')}
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
                          <tr data-plugin-manage-empty-state="hertzbeat-ui-table-empty" className="border-t border-[#252b34] bg-[#0b0c0e]">
                            <td colSpan={5} className="h-[320px] px-3 text-center text-[#a9b0bb]">
                              <div className="inline-flex flex-col items-center gap-2.5">
                                <span
                                  data-plugin-manage-empty-icon="hertzbeat-ui-empty-box"
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]"
                                >
                                  <Inbox className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div
                                  data-plugin-manage-empty-title={isFilteredEmpty ? 'filtered' : 'plain'}
                                  className="text-[13px] font-semibold text-[#eef2f7]"
                                >
                                  {isFilteredEmpty ? t('setting.plugins.empty.filtered.title') : t('common.no-data')}
                                </div>
                                {isFilteredEmpty ? (
                                  <div
                                    data-plugin-manage-empty-copy="filtered-search"
                                    className="max-w-[360px] text-[12px] leading-5 text-[#858d9a]"
                                  >
                                    {t('setting.plugins.empty.filtered.copy')}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div
                    data-plugin-pagination="hertzbeat-ui-dense-pagination"
                    data-plugin-pagination-owner="hertzbeat-ui-pagination-bar"
                    data-plugin-pagination-contract="angular-search-pagination"
                  >
                    <HzPaginationBar
                      summary={paginationSummary}
                      pageSizeLabel={t('setting.plugins.pagination.page-size')}
                      pageSizeValue={String(currentPageSize)}
                      pageSizeOptions={pageSizeOptions.map(value => ({ value: String(value), label: String(value) }))}
                      pageJumpLabel={t('setting.plugins.pagination.page')}
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
                          'data-plugin-pagination-page-jump-owner': 'hertzbeat-ui-input'
                        } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                      }
                      pageSizeSelectProps={
                        {
                          'data-plugin-pagination-page-size-owner': 'hertzbeat-ui-select'
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
        open={Boolean((isUploadDialogOpen ?? Boolean(draftPlugin)) && draftPlugin)}
        title={t('plugin.upload')}
        onClose={onCloseDialog}
        maskClosable={false}
        maxWidthClassName="max-w-[min(92vw,30rem)] lg:max-w-[30vw]"
        overlayProps={{
          'data-plugin-upload-mask-closable': 'false',
          'data-plugin-upload-width': 'angular-width-30-percent',
          'data-plugin-upload-modal-owner': 'angular-nz-modal'
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              className={coldButtonClassName}
              onClick={onCloseDialog}
              data-plugin-upload-cancel="angular-cancel-preserves-form"
              data-plugin-upload-cancel-pending="angular-cancel-allowed-during-ok-loading"
              data-plugin-upload-cancel-pending-owner="angular-nz-modal"
              data-plugin-command-action="upload-cancel"
            >
              {t('common.button.cancel')}
            </Button>
            <Button
              size="sm"
              variant="default"
              className={coldPrimaryButtonClassName}
              onClick={onSaveDialog}
              disabled={Boolean(isUploadPending)}
              data-plugin-upload-save="angular-form-data"
              data-plugin-command-action="upload-save"
              data-plugin-upload-ok-loading={isUploadPending ? 'true' : 'false'}
              data-plugin-upload-ok-loading-owner="angular-nz-ok-loading"
              data-plugin-upload-save-lifecycle="angular-close-success-keep-open-fail"
              data-plugin-upload-save-lifecycle-owner="route-state-contract"
              aria-busy={isUploadPending ? 'true' : 'false'}
            >
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        {draftPlugin ? (
          <div
            className="space-y-3"
            data-plugin-upload-dialog="angular-cancel-preserves-form"
            data-plugin-upload-field-layout="angular-label-8-control-14"
            data-plugin-upload-invalid-submit={uploadValidation?.name || uploadValidation?.jarFile ? 'angular-mark-dirty-keep-open' : undefined}
            data-plugin-upload-invalid-submit-owner={uploadValidation?.name || uploadValidation?.jarFile ? 'route-validation-contract' : undefined}
          >
            <div
              data-plugin-upload-guidance="jar-runtime-risk"
              className="rounded-[4px] border border-[#553d1f] bg-[#241711] px-3 py-2 text-[12px] leading-5 text-[#fed7aa]"
            >
              {t('setting.plugins.upload.guidance')}
            </div>
            <label
              className="grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)] sm:items-start"
              data-plugin-upload-field="name"
              data-plugin-upload-field-layout="angular-label-8-control-14"
            >
              <span className="pt-2 text-right max-sm:text-left" data-plugin-upload-label-span="8">
                <PluginFieldTitle
                  id="name"
                  helpLabel={t('setting.plugins.field.name.help-label')}
                  help={t('setting.plugins.field.name.help')}
                  mode="required"
                  modeLabel={t('setting.plugins.field.mode.required')}
                  requirement="required"
                  requirementLabel={t('settings.form.field.requirement.required')}
                  inputMode="manual"
                  inputModeLabel={t('settings.form.field.input-mode.manual')}
                  scope="upload-field"
                  required
                >
                  {t('plugin.name')}
                </PluginFieldTitle>
              </span>
              <span className="min-w-0" data-plugin-upload-control-span="14">
                <Input
                  className={coldDialogInputClassName}
                  value={draftPlugin.name}
                  onChange={event => onDraftChange({ name: event.target.value })}
                  data-plugin-upload-name-input="angular-required"
                  data-plugin-upload-name-payload="angular-raw-name-no-trim"
                  data-plugin-upload-name-payload-owner="plugin-manage-controller"
                />
              </span>
              {uploadValidation?.name ? (
                <span className="text-[11px] font-semibold text-[#ffb4a8] sm:col-start-2" data-plugin-upload-validation="name-required">
                  {t('validation.required')}
                </span>
              ) : null}
            </label>
            <label
              className="grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)] sm:items-start"
              data-plugin-upload-field="jarFile"
              data-plugin-upload-field-layout="angular-label-8-control-14"
            >
              <span className="pt-2 text-right max-sm:text-left" data-plugin-upload-label-span="8">
                <PluginFieldTitle
                  id="jarFile"
                  helpLabel={t('setting.plugins.field.jar.help-label')}
                  help={t('setting.plugins.field.jar.help')}
                  mode="required"
                  modeLabel={t('setting.plugins.field.mode.required')}
                  requirement="required"
                  requirementLabel={t('settings.form.field.requirement.required')}
                  inputMode="selection"
                  inputModeLabel={t('settings.form.field.input-mode.selection')}
                  scope="upload-field"
                  required
                >
                  {t('plugin.jar.file')}
                </PluginFieldTitle>
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-2" data-plugin-upload-control-span="14">
                <HzFileInput
                  ref={pluginJarInputRef}
                  accept=".jar"
                  aria-label={t('plugin.jar.file')}
                  data-plugin-upload-file-input="angular-jar-before-upload"
                  data-plugin-upload-file-input-owner="hertzbeat-ui-file-input"
                  data-plugin-upload-file-list="angular-before-upload-single-replace"
                  data-plugin-upload-file-list-owner="hertzbeat-ui-file-input"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null;
                    onDraftChange({
                      jarFile: file,
                      jarFileName: file?.name ?? ''
                    });
                  }}
                />
                <Input
                  className={`${coldDialogInputClassName} min-w-0 flex-1`}
                  value={draftPlugin.jarFileName}
                  readOnly
                  placeholder={t('plugin.jar.file')}
                  data-plugin-upload-file-name="angular-jar-before-upload"
                />
                <Button
                  size="sm"
                  variant="default"
                  className={coldButtonClassName}
                  type="button"
                  data-plugin-upload-file-trigger="angular-jar-before-upload"
                  data-plugin-command-action="upload-file-select"
                  onClick={() => pluginJarInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('common.file.select')}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className={coldIconButtonClassName}
                  type="button"
                  aria-label={t('common.remove')}
                  disabled={!draftPlugin.jarFileName}
                  data-plugin-upload-file-remove="angular-nz-remove-clears-jar"
                  data-plugin-upload-file-remove-owner="hertzbeat-ui-file-input"
                  data-plugin-upload-file-remove-state={draftPlugin.jarFileName ? 'selected' : 'empty'}
                  data-plugin-command-action="upload-file-remove"
                  onClick={() => {
                    if (pluginJarInputRef.current) {
                      pluginJarInputRef.current.value = '';
                    }
                    onDraftChange({
                      jarFile: null,
                      jarFileName: ''
                    });
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </span>
              {uploadValidation?.jarFile ? (
                <span className="text-[11px] font-semibold text-[#ffb4a8] sm:col-start-2" data-plugin-upload-validation="jar-required">
                  {t('validation.required')}
                </span>
              ) : null}
            </label>
            <div
              className="grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(96px,8fr)_minmax(0,14fr)] sm:items-center"
              data-plugin-upload-field="enableStatus"
              data-plugin-upload-field-layout="angular-label-8-control-14"
              data-plugin-upload-status-field="angular-nz-switch"
            >
              <span className="text-right max-sm:text-left" data-plugin-upload-label-span="8">
                <PluginFieldTitle
                  id="enableStatus"
                  helpLabel={t('setting.plugins.field.status.help-label')}
                  help={t('setting.plugins.field.status.help')}
                  mode="side-effect"
                  modeLabel={t('setting.plugins.field.mode.side-effect')}
                  requirement="required"
                  requirementLabel={t('settings.form.field.requirement.required')}
                  inputMode="selection"
                  inputModeLabel={t('settings.form.field.input-mode.selection')}
                  scope="upload-field"
                >
                  {t('plugin.status')}
                </PluginFieldTitle>
              </span>
              <span className="min-w-0" data-plugin-upload-control-span="14">
                <HzSwitch
                  checked={draftPlugin.enableStatus}
                  onCheckedChange={checked => onDraftChange({ enableStatus: checked })}
                  aria-label={t('plugin.status')}
                  data-plugin-upload-status-control="angular-nz-switch"
                  data-plugin-upload-status-control-owner="hertzbeat-ui-switch"
                />
              </span>
            </div>
          </div>
        ) : null}
      </OverlayDialog>
      <OverlayDialog
        open={Boolean(paramDraft)}
        title={t('plugin.edit')}
        onClose={onCloseParamDialog ?? (() => {})}
        maskClosable={false}
        maxWidthClassName="max-w-[min(92vw,520px)]"
        overlayProps={{
          'data-plugin-param-mask-closable': 'false',
          'data-plugin-param-modal-owner': 'angular-nz-modal',
          'data-plugin-param-width': 'angular-default-modal-width',
          'data-plugin-param-width-owner': 'angular-nz-modal'
        }}
        footer={
          <div
            className="flex flex-wrap justify-end gap-2"
            data-plugin-param-save-loading-contract="angular-no-ok-loading"
            data-plugin-param-save-loading="angular-no-ok-loading"
            data-plugin-param-save-loading-owner="angular-modal-ok-contract"
            data-plugin-param-save-pending={isParamPending ? 'true' : 'false'}
            data-plugin-param-payload="angular-object-values-payload"
            data-plugin-param-save-lifecycle="angular-close-success-keep-open-fail"
            data-plugin-param-save-lifecycle-owner="route-state-contract"
            data-plugin-param-pending-editable={isParamPending ? 'angular-controls-remain-enabled' : 'idle'}
            data-plugin-param-pending-editable-owner="angular-param-modal"
          >
            <Button
              size="sm"
              variant="default"
              className={coldButtonClassName}
              onClick={onCloseParamDialog}
              data-plugin-param-cancel-loading="angular-no-ok-loading"
              data-plugin-command-action="param-cancel"
            >
              {t('common.button.cancel')}
            </Button>
            <Button
              size="sm"
              variant="default"
              className={coldPrimaryButtonClassName}
              onClick={onSaveParamDialog}
              data-plugin-param-save="angular-params-post"
              data-plugin-command-action="param-save"
              data-plugin-param-save-loading="angular-no-ok-loading"
              data-plugin-param-save-loading-owner="angular-modal-ok-contract"
            >
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        {paramDraft ? (
          <div
            className="space-y-3"
            data-plugin-param-dialog="angular-params-define-modal"
            data-plugin-param-dialog-plugin={paramDraft.plugin.name}
          >
            <div
              data-plugin-param-guidance="runtime-param-risk"
              className="rounded-[4px] border border-[#553d1f] bg-[#241711] px-3 py-2 text-[12px] leading-5 text-[#fed7aa]"
            >
              {t('setting.plugins.param.guidance')}
            </div>
            <HzMonitorEditorFieldGrid
              columns={1}
              data-plugin-param-form="angular-dynamic-form-field"
              data-plugin-param-form-owner="hertzbeat-ui-monitor-editor-field-grid"
              data-plugin-param-field-layout="angular-label-7-control-8"
              data-plugin-param-field-layout-owner="hertzbeat-ui-monitor-editor-field-grid"
            >
              {paramDraft.paramDefines.length > 0 ? paramDraft.paramDefines.map(define => {
                const current = paramDraft.params[define.field];
                const value = current?.paramValue;
                const stringValue = stringifyPluginParamValue(value);
                const label = typeof define.name === 'string' ? define.name : define.field;
                const isMultiFuncInput = isPluginParamMultiFuncInput(define);
                return (
                  <label
                    key={define.field}
                    className="grid gap-2 text-[12px] font-semibold text-[#a9b0bb] sm:grid-cols-[minmax(112px,7fr)_minmax(0,8fr)] sm:items-start"
                    data-plugin-param-field={define.field}
                    data-plugin-param-field-layout="angular-label-7-control-8"
                    data-plugin-param-field-type={define.type ?? 'password'}
                    data-plugin-param-field-required={define.required ? 'true' : 'false'}
                  >
                    <span className="pt-2 text-right max-sm:text-left" data-plugin-param-label-span="7">
                      <PluginFieldTitle
                        id={define.field}
                        helpLabel={t('setting.plugins.param.field.help-label', { field: label })}
                        help={t('setting.plugins.param.field.help', { field: label, type: define.type ?? 'text' })}
                        mode={define.required ? 'required' : 'optional'}
                        modeLabel={define.required ? t('setting.plugins.field.mode.required') : t('setting.plugins.field.mode.optional')}
                        scope="param-field"
                        required={define.required}
                      >
                        {label}
                      </PluginFieldTitle>
                    </span>
                    <span className="min-w-0" data-plugin-param-control-span="8">
                      {define.type === 'radio' && (define.options ?? []).length > 0 ? (
                        <HzRadioButtonGroup
                          name={define.field}
                          value={stringifyPluginParamValue(value)}
                          options={buildPluginParamRadioOptions(define)}
                          onChange={nextValue => onParamChange?.(define.field, nextValue)}
                          data-plugin-param-radio="angular-nz-radio-group"
                          data-plugin-param-radio-field={define.field}
                          data-plugin-param-radio-owner="hertzbeat-ui-radio-button-group"
                        />
                      ) : define.type === 'boolean' ? (
                        <Checkbox
                          checked={Boolean(value)}
                          onChange={event => onParamChange?.(define.field, event.target.checked)}
                          label={label}
                          containerClassName="text-[#a9b0bb]"
                          data-plugin-param-input={define.field}
                        />
                      ) : define.type === 'labels' ? (
                        <HzKeyValueEditor
                          rows={parsePluginParamKeyValueRows(value)}
                          onChange={rows => onParamChange?.(define.field, objectifyPluginParamLabelRows(rows))}
                          addLabel={t('common.add')}
                          removeLabel={t('common.remove')}
                          keyPlaceholder={t('common.label.key')}
                          valuePlaceholder={t('common.label.value')}
                          data-plugin-param-configurable-field="angular-app-configurable-field"
                          data-plugin-param-labels-editor={define.field}
                          data-plugin-param-labels-owner="hertzbeat-ui-key-value-editor"
                          keyInputProps={{ 'data-plugin-param-labels-input': 'key' } as React.ComponentProps<typeof HzKeyValueEditor>['keyInputProps']}
                          valueInputProps={{ 'data-plugin-param-labels-input': 'value' } as React.ComponentProps<typeof HzKeyValueEditor>['valueInputProps']}
                        />
                      ) : define.type === 'label-selector' ? (
                        <span
                          className="block min-w-0"
                          data-plugin-param-label-selector="angular-app-label-selector"
                          data-plugin-param-label-selector-field={define.field}
                          data-plugin-param-label-selector-owner="hertzbeat-ui-label-selector"
                        >
                          <LabelRecordInput
                            value={stringifyPluginParamLabelSelectorValue(value)}
                            onValueChange={nextValue => onParamChange?.(define.field, objectifyPluginParamLabelSelectorValue(nextValue))}
                            name={define.field}
                            keyPlaceholder={t('common.label.key')}
                            valuePlaceholder={t('common.label.value')}
                            addLabel={t('common.add')}
                            removeLabel={t('common.remove')}
                            containerClassName="min-w-0"
                          />
                        </span>
                      ) : define.type === 'key-value' ? (
                        <HzKeyValueEditor
                          rows={parsePluginParamKeyValueRows(value)}
                          onChange={rows => onParamChange?.(define.field, stringifyPluginParamKeyValueRows(rows))}
                          addLabel={t('common.add')}
                          removeLabel={t('common.remove')}
                          keyPlaceholder={t('monitor.headerName.tip')}
                          valuePlaceholder={t('monitor.headerValue.tip')}
                          data-plugin-param-configurable-field="angular-app-configurable-field"
                          data-plugin-param-key-value-editor={define.field}
                          data-plugin-param-key-value-owner="hertzbeat-ui-key-value-editor"
                          keyInputProps={{ 'data-plugin-param-key-value-input': 'key' } as React.ComponentProps<typeof HzKeyValueEditor>['keyInputProps']}
                          valueInputProps={{ 'data-plugin-param-key-value-input': 'value' } as React.ComponentProps<typeof HzKeyValueEditor>['valueInputProps']}
                        />
                      ) : define.type === 'metrics-field' ? (
                        <HzConfigurableFieldEditor
                          rows={parsePluginParamConfigurableRows(value, ['field', 'unit', 'type'])}
                          columns={[
                            {
                              key: 'field',
                              placeholder: 'Field',
                              inputProps: { 'data-plugin-param-metrics-field-input': 'field' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
                            },
                            {
                              key: 'unit',
                              placeholder: 'Unit',
                              className: 'minmax(50px,90px)',
                              inputProps: { 'data-plugin-param-metrics-field-input': 'unit' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
                            },
                            {
                              key: 'type',
                              placeholder: 'Type',
                              inputProps: { 'data-plugin-param-metrics-field-input': 'type' } as React.ComponentProps<typeof HzConfigurableFieldEditor>['columns'][number]['inputProps']
                            }
                          ]}
                          onChange={rows => onParamChange?.(define.field, rows)}
                          addLabel={t('common.add')}
                          removeLabel={t('common.remove')}
                          data-plugin-param-configurable-field="angular-app-configurable-field"
                          data-plugin-param-metrics-field-editor={define.field}
                          data-plugin-param-metrics-field-owner="hertzbeat-ui-configurable-field-editor"
                        />
                      ) : isPluginParamTextarea(define) ? (
                        <HzTextarea
                          value={stringValue}
                          onChange={event => onParamChange?.(define.field, event.target.value)}
                          rows={getPluginParamTextareaRows(define)}
                          height={getPluginParamTextareaRows(define) === 8 ? 'tall' : 'default'}
                          placeholder={typeof define.placeholder === 'string' ? define.placeholder : ''}
                          data-plugin-param-input={define.field}
                          data-plugin-param-textarea={define.type === 'textarea' ? 'angular-textarea-rows-8' : undefined}
                          data-plugin-param-textarea-rows={define.type === 'textarea' ? '8' : undefined}
                          data-plugin-param-input-owner="hertzbeat-ui-textarea"
                        />
                      ) : (
                        <span
                          className="relative block"
                          data-plugin-param-multi-func-input={isMultiFuncInput ? 'angular-app-multi-func-input' : undefined}
                          data-plugin-param-multi-func-type={isMultiFuncInput ? define.type : undefined}
                        >
                          <HzInput
                            className={`${coldDialogInputClassName}${isMultiFuncInput ? ' pr-8' : ''}`}
                            type={define.type === 'number' ? 'number' : define.type === 'password' ? 'password' : 'text'}
                            value={stringValue}
                            placeholder={typeof define.placeholder === 'string' ? define.placeholder : ''}
                            onChange={event => {
                              const nextValue = define.type === 'number'
                                ? event.target.value === ''
                                  ? null
                                  : Number(event.target.value)
                                : event.target.value;
                              onParamChange?.(define.field, nextValue);
                            }}
                            data-plugin-param-input={define.field}
                            data-plugin-param-input-owner="hertzbeat-ui-input"
                            data-plugin-param-array={define.type === 'array' ? 'angular-app-multi-func-input' : undefined}
                            data-plugin-param-array-owner={define.type === 'array' ? 'hertzbeat-ui-input' : undefined}
                          />
                          {isMultiFuncInput && stringValue ? (
                            <button
                              type="button"
                              className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[3px] text-[#858d9a] transition-colors hover:bg-[#202632] hover:text-[#eef2f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.2)]"
                              aria-label={t('common.clear')}
                              onClick={() => onParamChange?.(define.field, null)}
                              data-plugin-param-multi-func-clear="angular-allow-clear"
                              data-plugin-param-multi-func-clear-field={define.field}
                              data-plugin-param-multi-func-clear-owner="hertzbeat-ui-input-affordance"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                        </span>
                      )}
                    </span>
                  </label>
                );
              }) : (
                <div
                  className="text-[12px] font-semibold text-[#858d9a]"
                  data-plugin-param-empty="angular-empty-params-modal"
                  data-plugin-param-empty-owner="hertzbeat-ui-monitor-editor-field-grid"
                >
                  {t('common.no-data')}
                </div>
              )}
            </HzMonitorEditorFieldGrid>
          </div>
        ) : null}
      </OverlayDialog>
      <HzConfirmDialog
        open={Boolean(deleteTarget)}
        tone="critical"
        kicker={t('menu.advanced.plugins')}
        title={deleteTarget?.mode === 'batch' ? t('common.confirm.delete-batch') : t('common.confirm.delete')}
        cancelLabel={t('common.button.cancel')}
        confirmLabel={t('common.button.ok')}
        confirmDisabled={Boolean(isDeletePending)}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        data-plugin-delete-confirm="angular-modal-confirm"
        data-plugin-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        confirmButtonProps={{
          'data-plugin-command-action': 'delete-confirm',
          'data-plugin-delete-confirm-submit': 'angular-modal-confirm'
        } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']}
        cancelButtonProps={{
          'data-plugin-command-action': 'delete-cancel'
        } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']}
      >
        <div data-plugin-delete-confirm-target={deleteTarget?.label ?? ''}>
          {deleteTarget?.label ?? t('common.none')}
        </div>
        <div
          data-plugin-delete-guidance="runtime-dispatch-risk"
          className="rounded-[4px] border border-[#553d1f] bg-[#241711] px-3 py-2 text-[12px] leading-5 text-[#fed7aa]"
        >
          {t('setting.plugins.delete.guidance')}
        </div>
      </HzConfirmDialog>
    </>
  );
}
