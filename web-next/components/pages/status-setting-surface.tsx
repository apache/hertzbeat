'use client';

import React from 'react';
import { ExternalLink, Inbox, Pencil, Plus, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SearchRow } from '../ui/search-row';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';
import { latestIncidentMessage } from '../../lib/status-center/display';
import type { PageResult, StatusPageComponent, StatusPageIncident, StatusPageOrg } from '../../lib/types';
import type {
  StatusComponentDraft,
  StatusIncidentDraft,
  StatusOrgDraft
} from '../../lib/setting-status/view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type StatusManagementData = {
  org: StatusPageOrg;
  components: StatusPageComponent[];
  incidents: PageResult<StatusPageIncident>;
};

type StatusSettingSurfaceProps = {
  t: Translator;
  data: StatusManagementData;
  mode: 'component' | 'incident';
  editingOrg: boolean;
  orgDraft: StatusOrgDraft;
  savingOrg: boolean;
  orgMessage: string | null;
  orgError: string | null;
  editingComponent: boolean;
  componentDraft: StatusComponentDraft;
  savingComponent: boolean;
  componentMessage: string | null;
  componentError: string | null;
  selectedComponentId: number | null;
  editingIncident: boolean;
  incidentDraft: StatusIncidentDraft;
  savingIncident: boolean;
  incidentMessage: string | null;
  incidentError: string | null;
  selectedIncidentId: number | null;
  incidentSearchInput: string;
  formatTime: (value?: number | string | null) => string;
  publicStatusHref: string;
  onEditOrg: () => void;
  onModeChange: (mode: 'component' | 'incident') => void;
  onNewComponent: () => void;
  onEditComponent: (component?: StatusPageComponent) => void;
  onDeleteComponent: (component?: StatusPageComponent) => void;
  onNewIncident: () => void;
  onEditIncident: (incident?: StatusPageIncident) => void;
  onDeleteIncident: (incident?: StatusPageIncident) => void;
  onOrgDraftChange: (patch: Partial<StatusOrgDraft>) => void;
  onSaveOrg: () => void;
  onCancelOrg: () => void;
  onComponentDraftChange: (patch: Partial<StatusComponentDraft>) => void;
  onSaveComponent: () => void;
  onCancelComponent: () => void;
  onSelectComponent: (componentId: number) => void;
  onIncidentDraftChange: (patch: Partial<StatusIncidentDraft>) => void;
  onSaveIncident: () => void;
  onCancelIncident: () => void;
  onSelectIncident: (incidentId: number) => void;
  onIncidentSearchInputChange: (value: string) => void;
  onCommitIncidentSearch: () => void;
  onResetIncidentSearch: () => void;
  onIncidentPageSizeChange: (pageSize: number) => void;
  onIncidentPrevious: () => void;
  onIncidentNext: () => void;
};

type FieldProps = {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

type DeleteDialogState =
  | { kind: 'component'; item: StatusPageComponent }
  | { kind: 'incident'; item: StatusPageIncident }
  | null;

const coldStatusVisual = coldOpsCatalogVisual;

const coldButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-white';

const coldIconButtonClassName =
  'h-8 w-8 min-w-0 rounded-[3px] border-[#2b3039] bg-[#101217] text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white';

const coldInputClassName =
  'h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#eef2f7] outline-none placeholder:text-[#6f7788] focus:border-[#4e74f8] focus:ring-2 focus:ring-[rgba(78,116,248,0.16)]';

const coldTableToolbarClassName =
  'mb-3 flex min-h-10 w-full min-w-0 flex-wrap items-center gap-2 rounded-[3px] border border-[#282d36] bg-[#101217] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';

function EmptyTableRow({ colSpan }: { colSpan: number }) {
  return (
    <tr data-status-empty-row="cold-table-empty" className="bg-[#0b0c0e]">
      <td colSpan={colSpan} className="h-[240px] px-3 py-10 text-center text-[#858d9a]">
        <div className="inline-flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-[13px] font-semibold text-[#dbe4f0]">暂无数据</div>
        </div>
      </td>
    </tr>
  );
}

function ColdField({ label, required = false, value, placeholder, onChange }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <span>
        {required ? <span className="mr-1 text-[#f87171]">*</span> : null}
        {label}
      </span>
      <Input
        className={coldInputClassName}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function DialogField({ label, value, placeholder, onChange }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <span>{label}</span>
      <Input
        className={coldInputClassName}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function tagClassName(kind: 'ok' | 'bad' | 'warn' | 'neutral') {
  if (kind === 'ok') return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  if (kind === 'bad') return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  if (kind === 'warn') return 'border-[#854d0e]/55 bg-[#2a1d10] text-[#facc15]';
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function componentTone(state?: number | string | null) {
  const value = Number(state ?? 0);
  if (value === 0) return tagClassName('ok');
  if (value === 1) return tagClassName('bad');
  return tagClassName('neutral');
}

function incidentTone(state?: number | string | null) {
  const value = Number(state ?? 0);
  if (value === 0) return tagClassName('bad');
  if (value === 1 || value === 2) return tagClassName('warn');
  if (value === 3) return tagClassName('ok');
  return tagClassName('neutral');
}

function Tag({ className, children }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-[3px] border px-2 text-[11px] font-semibold ${className || ''}`}>
      {children}
    </span>
  );
}

function labelEntries(labels?: Record<string, string> | null) {
  return Object.entries(labels || {});
}

function StatusTabs({
  activeMode,
  t,
  onModeChange
}: {
  activeMode: 'component' | 'incident';
  t: Translator;
  onModeChange: (mode: 'component' | 'incident') => void;
}) {
  return (
    <div data-status-tabs="cold-segmented-tabs" className="mb-4 inline-flex rounded-[3px] border border-[#2b3039] bg-[#101217] p-1">
      {[
        ['component', t('status.component')],
        ['incident', t('status.incident')]
      ].map(([key, label]) => {
        const mode = key as 'component' | 'incident';
        const active = activeMode === mode;
        return (
          <button
            key={key}
            type="button"
            className={`h-7 min-w-[104px] rounded-[3px] px-3 text-[12px] font-semibold transition ${
              active ? 'bg-[#182238] text-[#f5f7fb]' : 'text-[#858d9a] hover:bg-[#151b28] hover:text-[#dbe4f0]'
            }`}
            onClick={() => onModeChange(mode)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusSettingSurface({
  t,
  data,
  mode,
  editingComponent,
  componentDraft,
  savingComponent,
  componentMessage,
  componentError,
  selectedComponentId,
  editingIncident,
  incidentDraft,
  savingIncident,
  incidentMessage,
  incidentError,
  selectedIncidentId,
  orgDraft,
  savingOrg,
  orgMessage,
  orgError,
  incidentSearchInput,
  formatTime,
  publicStatusHref,
  onModeChange,
  onNewComponent,
  onEditComponent,
  onDeleteComponent,
  onNewIncident,
  onEditIncident,
  onDeleteIncident,
  onOrgDraftChange,
  onSaveOrg,
  onComponentDraftChange,
  onSaveComponent,
  onCancelComponent,
  onIncidentDraftChange,
  onSaveIncident,
  onCancelIncident,
  onSelectComponent,
  onIncidentSearchInputChange,
  onCommitIncidentSearch,
  onResetIncidentSearch,
  onSelectIncident
}: StatusSettingSurfaceProps) {
  const statusOrg = data.org || {};
  const components = data.components || [];
  const incidents = data.incidents?.content || [];
  const publicStatusLabel = statusOrg.name ? `${statusOrg.name} ${t('menu.advanced.status')}` : t('menu.advanced.status');
  const activeMode = mode === 'incident' ? 'incident' : 'component';
  const orgValues = {
    name: orgDraft.name || statusOrg.name || '',
    description: orgDraft.description || statusOrg.description || '',
    home: orgDraft.home || statusOrg.home || '',
    logo: orgDraft.logo || statusOrg.logo || '',
    feedback: orgDraft.feedback || statusOrg.feedback || '',
    color: orgDraft.color || statusOrg.color || ''
  };
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>(null);
  const deleteDialogTitle = deleteDialog?.kind === 'component' ? '确认删除组件' : '确认删除维护事件';
  const deleteDialogName = deleteDialog?.item.name || '-';
  const deleteDialogCopy =
    deleteDialog?.kind === 'component'
      ? '删除后该组件会从公开状态页移除，相关维护事件需要重新绑定组件。'
      : '删除后该维护事件会从公开状态页移除，历史说明不会再展示给访问者。';

  function openComponentDeleteDialog(component: StatusPageComponent) {
    if (component.id != null) onSelectComponent(component.id);
    setDeleteDialog({ kind: 'component', item: component });
  }

  function openIncidentDeleteDialog(incident: StatusPageIncident) {
    if (incident.id != null) onSelectIncident(incident.id);
    setDeleteDialog({ kind: 'incident', item: incident });
  }

  function submitDeleteDialog() {
    if (!deleteDialog) {
      return;
    }
    const target = deleteDialog;
    setDeleteDialog(null);
    if (target.kind === 'component') {
      onDeleteComponent(target.item);
      return;
    }
    onDeleteIncident(target.item);
  }

  return (
    <>
      <div
        data-status-setting-surface="otlp-cold-status-console"
        data-status-setting-style-baseline={coldStatusVisual.canvasName}
        className={coldStatusVisual.canvas.root}
        style={coldStatusVisual.canvas.backgroundStyle}
      >
        <section className={coldStatusVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-status-header="cold-compact-header" className={coldStatusVisual.panel.hero}>
                <div className="max-w-[840px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('menu.advanced.status')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    管理公开状态页的组织档案、服务组件和维护事件，保持配置、发布和检索动作在一个紧凑后台工作面中完成。
                  </p>
                  <div data-status-command-row="standard-equal-buttons" className={coldStatusVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={() => onModeChange(activeMode)}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                    <a href={publicStatusHref} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center gap-1.5 ${coldPrimaryButtonClassName}`}>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      {publicStatusLabel}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div data-status-admin-layout="full-width-admin-list" className="space-y-5">
              <section className="min-w-0">
                <div
                  data-status-org-form="cold-settings-form"
                  className="mb-5 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[12px] font-semibold text-[#f1f4fa]">组织档案</div>
                      <p className="mt-1 text-[12px] leading-5 text-[#858d9a]">公开状态页展示的组织信息和反馈入口。</p>
                    </div>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSaveOrg} disabled={savingOrg}>
                      {t('common.button.ok')}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ColdField required label={t('status.org.name')} value={orgValues.name} placeholder={t('status.org.name.tip')} onChange={value => onOrgDraftChange({ name: value })} />
                    <ColdField required label={t('status.org.desc')} value={orgValues.description} placeholder={t('status.org.desc.tip')} onChange={value => onOrgDraftChange({ description: value })} />
                    <ColdField required label={t('status.org.home')} value={orgValues.home} placeholder={t('status.org.home.tip')} onChange={value => onOrgDraftChange({ home: value })} />
                    <ColdField required label={t('status.org.logo')} value={orgValues.logo} placeholder={t('status.org.logo.tip')} onChange={value => onOrgDraftChange({ logo: value })} />
                    <ColdField required label={t('status.org.feedback')} value={orgValues.feedback} placeholder={t('status.org.feedback.tip')} onChange={value => onOrgDraftChange({ feedback: value })} />
                    <ColdField label={t('status.org.color')} value={orgValues.color} placeholder={t('status.org.color.tip')} onChange={value => onOrgDraftChange({ color: value })} />
                  </div>
                  {orgMessage ? <div className="mt-3 text-[12px] text-[#a9b0bb]">{orgMessage}</div> : null}
                  {orgError ? <div className="mt-3 text-[12px] text-[#f87171]">{orgError}</div> : null}
                </div>

                <StatusTabs activeMode={activeMode} t={t} onModeChange={onModeChange} />

                <div hidden={activeMode !== 'component'}>
                  <div data-status-component-toolbar="cold-table-toolbar" className={coldTableToolbarClassName}>
                    <div className="min-w-0 flex-1 text-[12px] font-semibold text-[#dbe4f0]">
                      {t('status.component')} <span className="ml-2 text-[#6f7788]">{components.length}</span>
                    </div>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={() => onModeChange('component')}>
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNewComponent}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('status.component.new')}
                    </Button>
                  </div>

                  <div data-status-component-table-shell="cold-dense-table" className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
                    <table data-status-component-table="cold-component-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[22%] px-3 py-2.5">{t('status.component.name')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('status.component.state')}</th>
                          <th className="w-[15%] px-3 py-2.5">{t('status.component.method')}</th>
                          <th className="w-[25%] px-3 py-2.5">{t('status.component.tag')}</th>
                          <th className="w-[16%] px-3 py-2.5">{t('common.edit-time')}</th>
                          <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.length > 0 ? components.map(component => (
                          <tr
                            key={component.id || component.name}
                            data-status-component-row={component.id || component.name}
                            className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]"
                          >
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{component.name || '-'}</td>
                            <td className="px-3 py-2.5">
                              <Tag className={componentTone(component.state)}>{t(`status.component.state.${Number(component.state ?? 0)}`)}</Tag>
                            </td>
                            <td className="px-3 py-2.5">
                              <Tag className={tagClassName('neutral')}>{t(`status.component.method.${Number(component.method ?? 0)}`)}</Tag>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {labelEntries(component.labels).length > 0 ? labelEntries(component.labels).map(([key, value]) => (
                                  <span key={`${component.id}-${key}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                    {key}:{value}
                                  </span>
                                )) : <span className="text-[#6f7788]">-</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(component.gmtUpdate || component.gmtCreate || null)}</td>
                            <td className="px-3 py-2.5">
                              <div data-status-component-row-actions="cold-icon-actions" className="flex gap-1.5">
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('status.component.edit')}
                                  onClick={() => {
                                    if (component.id != null) onSelectComponent(component.id);
                                    onEditComponent(component);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('status.component.edit')}</span>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('status.component.delete')}
                                  data-status-component-delete-confirm-trigger="cold-modal"
                                  onClick={() => openComponentDeleteDialog(component)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('status.component.delete')}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )) : <EmptyTableRow colSpan={6} />}
                      </tbody>
                    </table>
                  </div>
                  {componentMessage ? <div className="px-3 py-2 text-sm text-[#a9b0bb]">{componentMessage}</div> : null}
                  {componentError ? <div className="px-3 py-2 text-sm text-[#f87171]">{componentError}</div> : null}
                </div>

                <div hidden={activeMode !== 'incident'}>
                  <SearchRow
                    data-status-incident-toolbar="cold-table-toolbar"
                    data-status-incident-search-owner="shared-search-row"
                    className="mb-3"
                    inputWidthClassName="w-[320px]"
                    value={incidentSearchInput}
                    placeholder={t('status.incident.name')}
                    searchLabel={t('common.search')}
                    clearLabel={t('common.reset')}
                    showClearWhenEmpty
                    onValueChange={onIncidentSearchInputChange}
                    onSearch={onCommitIncidentSearch}
                    onClear={onResetIncidentSearch}
                    trailingActions={
                      <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNewIncident}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('status.incident.new')}
                      </Button>
                    }
                  />

                  <div data-status-incident-table-shell="cold-dense-table" className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
                    <table data-status-incident-table="cold-incident-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[18%] px-3 py-2.5">{t('status.incident.name')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('status.incident.state')}</th>
                          <th className="w-[28%] px-3 py-2.5">{t('status.incident.message-latest')}</th>
                          <th className="w-[18%] px-3 py-2.5">{t('status.incident.component')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('common.new-time')}</th>
                          <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.length > 0 ? incidents.map(incident => (
                          <tr
                            key={incident.id || incident.name}
                            data-status-incident-row={incident.id || incident.name}
                            className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]"
                          >
                            <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{incident.name || '-'}</td>
                            <td className="px-3 py-2.5">
                              <Tag className={incidentTone(incident.state ?? incident.status)}>{t(`status.incident.state.${Number(incident.state ?? incident.status ?? 0)}`)}</Tag>
                            </td>
                            <td className="truncate px-3 py-2.5" title={latestIncidentMessage(incident) || '-'}>
                              {latestIncidentMessage(incident) || '-'}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {(incident.components || []).length > 0 ? (incident.components || []).map(component => (
                                  <span key={`${incident.id}-${component.id || component.name}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                    {component.name || component.id}
                                  </span>
                                )) : <span className="text-[#6f7788]">-</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(incident.startTime || incident.gmtCreate || null)}</td>
                            <td className="px-3 py-2.5">
                              <div data-status-incident-row-actions="cold-icon-actions" className="flex gap-1.5">
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('status.incident.update')}
                                  onClick={() => {
                                    if (incident.id != null) onSelectIncident(incident.id);
                                    onEditIncident(incident);
                                  }}
                                >
                                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('status.incident.update')}</span>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="default"
                                  className={coldIconButtonClassName}
                                  title={t('status.incident.delete')}
                                  data-status-incident-delete-confirm-trigger="cold-modal"
                                  onClick={() => openIncidentDeleteDialog(incident)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span className="sr-only">{t('status.incident.delete')}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )) : <EmptyTableRow colSpan={6} />}
                      </tbody>
                    </table>
                  </div>
                  {incidentMessage ? <div className="px-3 py-2 text-sm text-[#a9b0bb]">{incidentMessage}</div> : null}
                  {incidentError ? <div className="px-3 py-2 text-sm text-[#f87171]">{incidentError}</div> : null}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <OverlayDialog
        open={editingComponent}
        title={componentDraft.id ? t('status.component.edit') : t('status.component.new')}
        kicker={t('status.component')}
        maxWidthClassName="max-w-2xl"
        onClose={onCancelComponent}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={onCancelComponent}>
              {t('common.button.cancel')}
            </Button>
            <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSaveComponent} disabled={savingComponent}>
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <DialogField label={t('status.component.name')} value={componentDraft.name} placeholder={t('status.component.name.tip')} onChange={value => onComponentDraftChange({ name: value })} />
          <DialogField label={t('status.component.method')} value={componentDraft.method} placeholder="0 / 1" onChange={value => onComponentDraftChange({ method: value })} />
          <DialogField label={t('status.component.state')} value={componentDraft.state} placeholder="0 / 1 / 2" onChange={value => onComponentDraftChange({ state: value })} />
          <DialogField label={t('status.component.tag')} value={componentDraft.labelsText} placeholder="env:prod, app:api" onChange={value => onComponentDraftChange({ labelsText: value })} />
          <div className="md:col-span-2">
            <DialogField label={t('status.org.desc')} value={componentDraft.description} placeholder={t('status.component.name.tip')} onChange={value => onComponentDraftChange({ description: value })} />
          </div>
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={editingIncident}
        title={incidentDraft.id ? t('status.incident.update') : t('status.incident.new')}
        kicker={t('status.incident')}
        maxWidthClassName="max-w-2xl"
        onClose={onCancelIncident}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={onCancelIncident}>
              {t('common.button.cancel')}
            </Button>
            <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSaveIncident} disabled={savingIncident}>
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <DialogField label={t('status.incident.name')} value={incidentDraft.name} placeholder={t('status.incident.name.tip')} onChange={value => onIncidentDraftChange({ name: value })} />
          <DialogField label={t('status.incident.state')} value={incidentDraft.state} placeholder="0 / 1 / 2 / 3" onChange={value => onIncidentDraftChange({ state: value })} />
          <DialogField label={t('status.incident.component')} value={incidentDraft.componentIdsText} placeholder="1, 2" onChange={value => onIncidentDraftChange({ componentIdsText: value })} />
          <DialogField label={t('status.incident.message')} value={incidentDraft.message} placeholder={t('status.incident.message.tip.0')} onChange={value => onIncidentDraftChange({ message: value })} />
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={deleteDialog !== null}
        title={deleteDialogTitle}
        kicker={t('menu.advanced.status')}
        maxWidthClassName="max-w-xl"
        onClose={() => setDeleteDialog(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" className={coldButtonClassName} onClick={() => setDeleteDialog(null)}>
              取消
            </Button>
            <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={submitDeleteDialog}>
              确认删除
            </Button>
          </div>
        }
      >
        <div
          data-status-delete-confirm="cold-modal"
          data-status-delete-confirm-kind={deleteDialog?.kind || ''}
          className="space-y-3 text-[12px] leading-6 text-[#a9b0bb]"
        >
          <p>{deleteDialogCopy}</p>
          <div className="rounded-[3px] border border-[#3f2228] bg-[#181013] px-3 py-2 font-semibold text-[#f0b8c1]">
            {deleteDialogName}
          </div>
        </div>
      </OverlayDialog>
    </>
  );
}
