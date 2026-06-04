'use client';

import React from 'react';
import { ArrowRight, ExternalLink, Inbox, MoreHorizontal, Pencil, Plus, Power, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { HzCheckbox, HzConfirmDialog, HzPaginationBar, HzRadioButtonGroup, HzStatusIncidentHistory, HzTableRowActionButton, HzTextarea } from '@hertzbeat/ui';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SearchRow } from '../ui/search-row';
import { hzOpsCatalogVisual } from '../../lib/hz-ops-visual';
import { latestIncidentMessage } from '../../lib/status-center/display';
import type { PageResult, StatusPageComponent, StatusPageIncident, StatusPageOrg } from '../../lib/types';
import {
  settingStatusComponentTagTone,
  settingStatusIncidentTagTone,
  type StatusComponentDraft,
  type StatusIncidentDraft,
  type StatusOrgDraft
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
  onIncidentPageIndexChange: (pageIndex: number) => void;
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

const coldStatusVisual = hzOpsCatalogVisual;

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

const statusActionMenuRootClassName = 'relative z-40 inline-block overflow-visible';
const statusActionMenuPanelBaseClassName =
  'mt-2 z-40 min-w-[132px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)]';

function EmptyTableRow({ colSpan, t }: { colSpan: number; t: Translator }) {
  return (
    <tr data-status-empty-row="hertzbeat-ui-table-empty" className="bg-[#0b0c0e]">
      <td colSpan={colSpan} className="h-[240px] px-3 py-10 text-center text-[#858d9a]">
        <div className="inline-flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-[13px] font-semibold text-[#dbe4f0]">{t('common.no-data')}</div>
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

type DialogTextareaFieldProps = FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'placeholder' | 'onChange'>;

function DialogTextareaField({
  label,
  value,
  placeholder,
  onChange,
  ...props
}: DialogTextareaFieldProps) {
  return (
    <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <span>{label}</span>
      <HzTextarea
        height="default"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}

function parseComponentIdSelection(text: string) {
  return new Set(
    text
      .split(',')
      .map(item => Number.parseInt(item.trim(), 10))
      .filter(value => Number.isFinite(value))
  );
}

function serializeComponentIdSelection(ids: Set<number>) {
  return Array.from(ids).sort((a, b) => a - b).join(', ');
}

function DialogComponentCheckboxGroup({
  label,
  components,
  value,
  emptyLabel,
  onChange
}: {
  label: string;
  components: StatusPageComponent[];
  value: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  const selectedIds = parseComponentIdSelection(value);
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <span>{label}</span>
      <div
        className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-1.5"
        data-status-incident-component-picker="angular-checkbox-group"
        data-status-incident-component-picker-owner="hertzbeat-ui-checkbox"
      >
        {components.length > 0 ? components.map(component => {
          const componentId = component.id;
          if (componentId == null) return null;
          const checked = selectedIds.has(componentId);
          return (
            <HzCheckbox
              key={componentId}
              label={component.name || String(componentId)}
              checked={checked}
              data-status-incident-component-option={componentId}
              onChange={event => {
                const nextIds = new Set(selectedIds);
                if (event.currentTarget.checked) {
                  nextIds.add(componentId);
                } else {
                  nextIds.delete(componentId);
                }
                onChange(serializeComponentIdSelection(nextIds));
              }}
            />
          );
        }) : <span className="text-[12px] font-semibold text-[#6f7788]">{emptyLabel}</span>}
      </div>
    </div>
  );
}

function DialogIncidentStateRadioGroup({
  label,
  value,
  onChange,
  t
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  t: Translator;
}) {
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <span>{label}</span>
      <HzRadioButtonGroup
        name="status-incident-state"
        value={value}
        onChange={onChange}
        data-status-incident-state-control="angular-radio-buttons"
        data-status-incident-state-owner="hertzbeat-ui-radio-button-group"
        options={[
          { value: '0', label: t('status.incident.state.0'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
          { value: '1', label: t('status.incident.state.1'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
          { value: '2', label: t('status.incident.state.2'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
          { value: '3', label: t('status.incident.state.3'), icon: <Power className="h-3.5 w-3.5" aria-hidden="true" /> }
        ]}
      />
    </div>
  );
}

function tagClassName(kind: 'ok' | 'bad' | 'warn' | 'neutral') {
  if (kind === 'ok') return 'border-[#166534]/45 bg-[#0f2f23] text-[#86efac]';
  if (kind === 'bad') return 'border-[#7f1d1d]/55 bg-[#2a1214] text-[#fca5a5]';
  if (kind === 'warn') return 'border-[#854d0e]/55 bg-[#2a1d10] text-[#facc15]';
  return 'border-[#303743] bg-[#101217] text-[#cbd5e1]';
}

function Tag({ className, children }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-[3px] border px-2 text-[11px] font-semibold ${className || ''}`}>
      {children}
    </span>
  );
}

function truncateIncidentHistoryTitle(message?: string | null, maxLength = 20) {
  const value = message?.trim() || '';
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function incidentHistoryTone(state?: number | null) {
  if (state === 0) return 'critical' as const;
  if (state === 1 || state === 2) return 'warning' as const;
  if (state === 3) return 'success' as const;
  return 'neutral' as const;
}

function incidentMessagePlaceholderKey(state: string) {
  const normalizedState = Number.parseInt(state, 10);
  return `status.incident.message.tip.${Number.isFinite(normalizedState) ? normalizedState : 0}`;
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
    <div
      data-status-tabs="hertzbeat-ui-segmented-tabs"
      data-status-tab-refresh-contract="angular-nz-tab-click-load"
      data-status-tab-refresh-owner="route-refresh-contract"
      className="mb-4 inline-flex rounded-[3px] border border-[#2b3039] bg-[#101217] p-1"
    >
      {[
        ['component', t('setting.status.components.tab')],
        ['incident', t('setting.status.incidents.tab')]
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
            data-status-tab-refresh-mode={mode}
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
  onIncidentPageIndexChange,
  onIncidentPageSizeChange,
  onIncidentPrevious,
  onIncidentNext,
  onSelectIncident
}: StatusSettingSurfaceProps) {
  const statusOrg = data.org || {};
  const components = data.components || [];
  const incidents = data.incidents?.content || [];
  const [openRowActionMenuId, setOpenRowActionMenuId] = React.useState<string | null>(null);
  const publicStatusLabel = statusOrg.name ? `${statusOrg.name} ${t('status.title')}` : t('status.title');
  const hasPublicStatusLink = statusOrg.id != null && statusOrg.name != null;
  const activeMode = mode === 'incident' ? 'incident' : 'component';
  const incidentTotalElements = Math.max(0, data.incidents?.totalElements ?? incidents.length);
  const incidentPageSize = Math.max(1, data.incidents?.pageSize ?? 8);
  const incidentTotalPages = Math.max(1, Math.ceil(incidentTotalElements / incidentPageSize));
  const incidentPageIndex = Math.min(Math.max(0, data.incidents?.pageIndex ?? 0), incidentTotalPages - 1);
  const incidentCurrentPage = incidentPageIndex + 1;
  const incidentPaginationSummary = `${t('common.total')} ${incidentTotalElements}`;
  const orgValues = {
    name: orgDraft.name || statusOrg.name || '',
    description: orgDraft.description || statusOrg.description || '',
    home: orgDraft.home || statusOrg.home || '',
    logo: orgDraft.logo || statusOrg.logo || '',
    feedback: orgDraft.feedback || statusOrg.feedback || '',
    color: orgDraft.color || statusOrg.color || ''
  };
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>(null);
  const emptyCellText = t('common.none');
  const incidentHistoryItems = (incidentDraft.existingContents || []).map((content, index) => {
    const state = Number(content.state ?? incidentDraft.state ?? 0);
    const message = content.message || emptyCellText;
    return {
      id: String(content.id ?? content.timestamp ?? index),
      title: truncateIncidentHistoryTitle(message) || emptyCellText,
      message,
      meta: formatTime(content.timestamp || null),
      stateLabel: t(`status.incident.state.${state}`),
      stateTone: incidentHistoryTone(state)
    };
  });
  const incidentMessagePlaceholder = t(incidentMessagePlaceholderKey(incidentDraft.state));
  const deleteDialogTitle =
    deleteDialog?.kind === 'component'
      ? t('setting.status.delete.component.title')
      : t('setting.status.delete.incident.title');
  const deleteDialogName = deleteDialog?.item.name || emptyCellText;
  const deleteDialogCopy =
    deleteDialog?.kind === 'component'
      ? t('setting.status.delete.component.copy')
      : t('setting.status.delete.incident.copy');

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

  function handleIncidentPageJumpChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    onIncidentPageIndexChange(Math.min(Math.max(parsed, 1), incidentTotalPages) - 1);
  }

  return (
    <>
      <div
        data-status-setting-surface="otlp-hertzbeat-ui-status-console"
        data-status-setting-style-baseline={coldStatusVisual.canvasName}
        data-status-setting-mutation-feedback="angular-notify-keys"
        data-status-setting-mutation-feedback-owner="route-action-feedback-contract"
        className={coldStatusVisual.canvas.root}
        style={coldStatusVisual.canvas.backgroundStyle}
      >
        <section className={coldStatusVisual.layout.pageSection}>
          <div className="mx-auto max-w-[1480px]">
            <div className="mb-5">
              <div data-status-header="hertzbeat-ui-compact-header" className={coldStatusVisual.panel.hero}>
                <div className="max-w-[840px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('setting.status.title')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('setting.status.subtitle')}
                  </p>
                  <div data-status-command-row="standard-equal-buttons" className={coldStatusVisual.button.row}>
                    <Button size="sm" variant="default" className={coldButtonClassName} onClick={() => onModeChange(activeMode)}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('common.refresh')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div data-status-admin-layout="full-width-admin-list" className="space-y-5">
              <section className="min-w-0">
                <div
                  data-status-org-form="hertzbeat-ui-settings-form"
                  className="mb-5 rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.32)]"
                >
                  <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[12px] font-semibold text-[#f1f4fa]">{t('setting.status.org.title')}</div>
                      <p className="mt-1 text-[12px] leading-5 text-[#858d9a]">{t('setting.status.org.copy')}</p>
                    </div>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onSaveOrg} disabled={savingOrg}>
                      {t('common.button.ok')}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ColdField required label={t('setting.status.org.name')} value={orgValues.name} placeholder={t('setting.status.org.name')} onChange={value => onOrgDraftChange({ name: value })} />
                    <ColdField required label={t('setting.status.org.description')} value={orgValues.description} placeholder={t('setting.status.org.description')} onChange={value => onOrgDraftChange({ description: value })} />
                    <ColdField required label={t('setting.status.org.home')} value={orgValues.home} placeholder={t('setting.status.org.home')} onChange={value => onOrgDraftChange({ home: value })} />
                    <ColdField required label={t('setting.status.org.logo')} value={orgValues.logo} placeholder={t('setting.status.org.logo')} onChange={value => onOrgDraftChange({ logo: value })} />
                    <ColdField required label={t('setting.status.org.feedback')} value={orgValues.feedback} placeholder={t('setting.status.org.feedback')} onChange={value => onOrgDraftChange({ feedback: value })} />
                    <ColdField label={t('setting.status.org.color')} value={orgValues.color} placeholder={t('setting.status.org.color')} onChange={value => onOrgDraftChange({ color: value })} />
                  </div>
                  {orgMessage ? <div className="mt-3 text-[12px] text-[#a9b0bb]">{orgMessage}</div> : null}
                  {orgError ? <div className="mt-3 text-[12px] text-[#f87171]">{orgError}</div> : null}
                </div>

                <StatusTabs activeMode={activeMode} t={t} onModeChange={onModeChange} />

                <div hidden={activeMode !== 'component'}>
                  <div data-status-component-toolbar="hertzbeat-ui-table-toolbar" className={coldTableToolbarClassName}>
                    <div className="min-w-0 flex-1 text-[12px] font-semibold text-[#dbe4f0]">
                      {t('setting.status.components.tab')} <span className="ml-2 text-[#6f7788]">{components.length}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className={coldButtonClassName}
                      data-status-component-refresh-contract="angular-sync-component"
                      data-status-component-refresh-owner="route-refresh-contract"
                      onClick={() => onModeChange('component')}
                    >
                      {t('common.refresh')}
                    </Button>
                    <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNewComponent}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('setting.status.components.new')}
                    </Button>
                    {hasPublicStatusLink ? (
                      <a
                        href={publicStatusHref}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-center gap-1.5 ${coldPrimaryButtonClassName}`}
                        data-status-public-link-contract="angular-tab-toolbar-conditional"
                        data-status-public-link-owner="status-tab-toolbar"
                        data-status-public-link-mode="component"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        {publicStatusLabel}
                      </a>
                    ) : null}
                  </div>

                  <div data-status-component-table-shell="hertzbeat-ui-dense-table" className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
                    <table data-status-component-table="hertzbeat-ui-component-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[22%] px-3 py-2.5">{t('setting.status.components.name')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('setting.status.components.state')}</th>
                          <th className="w-[15%] px-3 py-2.5">{t('setting.status.components.method')}</th>
                          <th className="w-[25%] px-3 py-2.5">{t('setting.status.components.labels')}</th>
                          <th className="w-[16%] px-3 py-2.5">{t('common.edit-time')}</th>
                          <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.length > 0 ? components.map(component => {
                          const componentLabels = labelEntries(component.labels);
                          const rowActionMenuId = `component-${component.id || component.name}`;
                          const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId;

                          return (
                            <tr
                              key={component.id || component.name}
                              data-status-component-row={component.id || component.name}
                              className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]"
                            >
                              <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{component.name || emptyCellText}</td>
                              <td className="px-3 py-2.5">
                                <Tag className={tagClassName(settingStatusComponentTagTone(component.state))}>{t(`status.component.state.${Number(component.state ?? 0)}`)}</Tag>
                              </td>
                              <td className="px-3 py-2.5">
                                <Tag className={tagClassName('neutral')}>{t(`setting.status.components.method.${Number(component.method ?? 0)}`)}</Tag>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {componentLabels.length > 0 ? componentLabels.map(([key, value]) => (
                                    <span key={`${component.id}-${key}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                      {key}:{value}
                                    </span>
                                  )) : <span className="text-[#6f7788]">{emptyCellText}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(component.gmtUpdate || component.gmtCreate || null)}</td>
                              <td className="px-3 py-2.5">
                                <div data-status-component-row-actions="hertzbeat-ui-icon-actions" className="flex gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className={coldIconButtonClassName}
                                    title={t('setting.status.components.edit')}
                                    onClick={() => {
                                      if (component.id != null) onSelectComponent(component.id);
                                      onEditComponent(component);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('setting.status.components.edit')}</span>
                                  </Button>
                                  <div
                                    className={statusActionMenuRootClassName}
                                    data-status-component-delete-menu={rowActionMenuId}
                                    data-status-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
                                    data-status-component-delete-menu-contract="angular-ellipsis-dropdown-delete"
                                    data-status-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}
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
                                      data-status-component-delete-menu-trigger={rowActionMenuId}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{t('common.edit')}</span>
                                    </button>
                                    <div
                                      role="menu"
                                      hidden={!isRowActionMenuOpen}
                                      className={`${statusActionMenuPanelBaseClassName} right-0`}
                                      data-status-component-delete-menu-panel={rowActionMenuId}
                                      data-status-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                                      data-status-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}
                                    >
                                      <HzTableRowActionButton
                                        width="root-span"
                                        intent="ghost"
                                        onClick={() => {
                                          setOpenRowActionMenuId(null);
                                          openComponentDeleteDialog(component);
                                        }}
                                        data-status-component-delete-confirm-trigger="angular-modal-confirm"
                                        data-status-component-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                                        className="w-full text-[#fecaca] hover:text-white"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        <span className="truncate">{t('setting.status.components.delete')}</span>
                                      </HzTableRowActionButton>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : <EmptyTableRow colSpan={6} t={t} />}
                      </tbody>
                    </table>
                  </div>
                  {componentMessage ? <div className="px-3 py-2 text-sm text-[#a9b0bb]">{componentMessage}</div> : null}
                  {componentError ? <div className="px-3 py-2 text-sm text-[#f87171]">{componentError}</div> : null}
                </div>

                <div hidden={activeMode !== 'incident'}>
                  <SearchRow
                    data-status-incident-toolbar="hertzbeat-ui-table-toolbar"
                    data-status-incident-search-owner="shared-search-row"
                    className="mb-3"
                    inputWidthClassName="w-[320px]"
                    value={incidentSearchInput}
                    placeholder={t('setting.status.incidents.name')}
                    searchLabel={t('common.search')}
                    clearLabel={t('common.reset')}
                    showClearWhenEmpty
                    onValueChange={onIncidentSearchInputChange}
                    onSearch={onCommitIncidentSearch}
                    onClear={onResetIncidentSearch}
                    trailingActions={
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className={coldButtonClassName}
                          data-status-incident-refresh-contract="angular-sync-incidence"
                          data-status-incident-refresh-owner="route-refresh-contract"
                          onClick={() => onModeChange('incident')}
                        >
                          {t('common.refresh')}
                        </Button>
                        <Button size="sm" variant="default" className={coldPrimaryButtonClassName} onClick={onNewIncident}>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('setting.status.incidents.new')}
                        </Button>
                        {hasPublicStatusLink ? (
                          <a
                            href={publicStatusHref}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center justify-center gap-1.5 ${coldPrimaryButtonClassName}`}
                            data-status-public-link-contract="angular-tab-toolbar-conditional"
                            data-status-public-link-owner="status-tab-toolbar"
                            data-status-public-link-mode="incident"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            {publicStatusLabel}
                          </a>
                        ) : null}
                      </>
                    }
                  />

                  <div data-status-incident-table-shell="hertzbeat-ui-dense-table" className="overflow-hidden rounded-[4px] border border-[#2b3039] bg-[#0b0c0e] shadow-[0_20px_56px_rgba(0,0,0,0.32)]">
                    <table data-status-incident-table="hertzbeat-ui-incident-table" className="w-full table-fixed border-collapse text-left text-[12px] text-[#a9b0bb]">
                      <thead className="border-b border-[#252b34] bg-[#101217] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e8494]">
                        <tr>
                          <th className="w-[18%] px-3 py-2.5">{t('setting.status.incidents.name')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('setting.status.incidents.state')}</th>
                          <th className="w-[28%] px-3 py-2.5">{t('setting.status.incidents.message-latest')}</th>
                          <th className="w-[18%] px-3 py-2.5">{t('setting.status.incidents.components')}</th>
                          <th className="w-[14%] px-3 py-2.5">{t('common.new-time')}</th>
                          <th className="w-[96px] px-3 py-2.5">{t('common.edit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.length > 0 ? incidents.map(incident => {
                          const incidentMessageText = latestIncidentMessage(incident) || emptyCellText;
                          const incidentComponents = incident.components || [];
                          const rowActionMenuId = `incident-${incident.id || incident.name}`;
                          const isRowActionMenuOpen = openRowActionMenuId === rowActionMenuId;

                          return (
                            <tr
                              key={incident.id || incident.name}
                              data-status-incident-row={incident.id || incident.name}
                              className="border-t border-[#252b34] bg-[#0b0c0e] transition hover:bg-[#111721]"
                            >
                              <td className="px-3 py-2.5 font-semibold text-[#eef2f7]">{incident.name || emptyCellText}</td>
                              <td className="px-3 py-2.5">
                                <Tag className={tagClassName(settingStatusIncidentTagTone(incident.state ?? incident.status))}>{t(`status.incident.state.${Number(incident.state ?? incident.status ?? 0)}`)}</Tag>
                              </td>
                              <td className="truncate px-3 py-2.5" title={incidentMessageText}>
                                {incidentMessageText}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {incidentComponents.length > 0 ? incidentComponents.map((component, index) => (
                                    <span key={`${incident.id}-${component.id || component.name || index}`} className="rounded-[3px] border border-[#303743] bg-[#101217] px-2 py-0.5 text-[11px] leading-4 text-[#cbd5e1]">
                                      {component.name || component.id || emptyCellText}
                                    </span>
                                  )) : <span className="text-[#6f7788]">{emptyCellText}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-[#858d9a]">{formatTime(incident.startTime || incident.gmtCreate || null)}</td>
                              <td className="px-3 py-2.5">
                                <div data-status-incident-row-actions="hertzbeat-ui-icon-actions" className="flex gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="default"
                                    className={coldIconButtonClassName}
                                    title={t('setting.status.incidents.update')}
                                    onClick={() => {
                                      if (incident.id != null) onSelectIncident(incident.id);
                                      onEditIncident(incident);
                                    }}
                                  >
                                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span className="sr-only">{t('setting.status.incidents.update')}</span>
                                  </Button>
                                  <div
                                    className={statusActionMenuRootClassName}
                                    data-status-incident-delete-menu={rowActionMenuId}
                                    data-status-row-delete-menu-contract="angular-ellipsis-dropdown-delete"
                                    data-status-incident-delete-menu-contract="angular-ellipsis-dropdown-delete"
                                    data-status-row-delete-menu-open={isRowActionMenuOpen ? 'true' : 'false'}
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
                                      data-status-incident-delete-menu-trigger={rowActionMenuId}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{t('common.edit')}</span>
                                    </button>
                                    <div
                                      role="menu"
                                      hidden={!isRowActionMenuOpen}
                                      className={`${statusActionMenuPanelBaseClassName} right-0`}
                                      data-status-incident-delete-menu-panel={rowActionMenuId}
                                      data-status-row-delete-menu-owner="hertzbeat-ui-table-row-action-button"
                                      data-status-row-delete-menu-panel-open={isRowActionMenuOpen ? 'true' : 'false'}
                                    >
                                      <HzTableRowActionButton
                                        width="root-span"
                                        intent="ghost"
                                        onClick={() => {
                                          setOpenRowActionMenuId(null);
                                          openIncidentDeleteDialog(incident);
                                        }}
                                        data-status-incident-delete-confirm-trigger="angular-modal-confirm"
                                        data-status-incident-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                                        className="w-full text-[#fecaca] hover:text-white"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        <span className="truncate">{t('setting.status.incidents.delete')}</span>
                                      </HzTableRowActionButton>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : <EmptyTableRow colSpan={6} t={t} />}
                      </tbody>
                    </table>
                    <div
                      data-status-incident-pagination="hertzbeat-ui-dense-pagination"
                      data-status-incident-pagination-owner="hertzbeat-ui-pagination-bar"
                      data-status-incident-pagination-contract="angular-search-pagination"
                    >
                      <HzPaginationBar
                        summary={incidentPaginationSummary}
                        pageSizeLabel={t('common.page-size')}
                        pageSizeValue={String(incidentPageSize)}
                        pageSizeOptions={[8, 15, 25].map(value => ({ value: String(value), label: String(value) }))}
                        pageJumpLabel={t('common.page')}
                        pageJumpValue={String(incidentCurrentPage)}
                        pageJumpMax={incidentTotalPages}
                        previousLabel={t('common.previous-page')}
                        nextLabel={t('common.next-page')}
                        previousDisabled={incidentPageIndex <= 0}
                        nextDisabled={incidentCurrentPage >= incidentTotalPages}
                        onPrevious={onIncidentPrevious}
                        onNext={onIncidentNext}
                        onPageSizeChange={value => onIncidentPageSizeChange(Number.parseInt(value, 10))}
                        onPageJumpChange={handleIncidentPageJumpChange}
                        pageJumpInputProps={
                          {
                            'data-status-incident-pagination-page-jump-owner': 'hertzbeat-ui-input'
                          } as React.ComponentProps<typeof HzPaginationBar>['pageJumpInputProps']
                        }
                        pageSizeSelectProps={
                          {
                            'data-status-incident-pagination-page-size-owner': 'hertzbeat-ui-select'
                          } as React.ComponentProps<typeof HzPaginationBar>['pageSizeSelectProps']
                        }
                        className="border-x-0"
                      />
                    </div>
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
        title={componentDraft.id ? t('setting.status.components.edit') : t('setting.status.components.new')}
        kicker={t('setting.status.components.tab')}
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
          <DialogField label={t('setting.status.components.name')} value={componentDraft.name} placeholder={t('setting.status.components.name')} onChange={value => onComponentDraftChange({ name: value })} />
          <DialogField label={t('setting.status.components.method')} value={componentDraft.method} placeholder={t('setting.status.component.method.placeholder')} onChange={value => onComponentDraftChange({ method: value })} />
          <DialogField label={t('setting.status.components.state')} value={componentDraft.state} placeholder={t('setting.status.component.state.placeholder')} onChange={value => onComponentDraftChange({ state: value })} />
          <DialogField label={t('setting.status.components.labels')} value={componentDraft.labelsText} placeholder={t('setting.status.component.labels.placeholder')} onChange={value => onComponentDraftChange({ labelsText: value })} />
          <div className="md:col-span-2">
            <DialogField label={t('setting.status.org.description')} value={componentDraft.description} placeholder={t('setting.status.component.description.placeholder')} onChange={value => onComponentDraftChange({ description: value })} />
          </div>
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={editingIncident}
        title={incidentDraft.id ? t('setting.status.incidents.update') : t('setting.status.incidents.new')}
        kicker={t('setting.status.incidents.tab')}
        maxWidthClassName="max-w-2xl"
        onClose={onCancelIncident}
        overlayProps={{
          'data-status-incident-failure-close-contract': 'angular-cancel-on-api-failure',
          'data-status-incident-failure-close-owner': 'status-route-action-feedback'
        } as React.ComponentProps<typeof OverlayDialog>['overlayProps']}
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
          <DialogField label={t('setting.status.incidents.name')} value={incidentDraft.name} placeholder={t('setting.status.incidents.name')} onChange={value => onIncidentDraftChange({ name: value })} />
          {incidentDraft.id ? (
            <div
              className="md:col-span-2"
              data-status-incident-history-contract="angular-collapse-desc"
              data-status-incident-history-owner="hertzbeat-ui-status-incident-history"
            >
              <HzStatusIncidentHistory
                title={t('status.incident.history')}
                items={incidentHistoryItems}
                emptyLabel={emptyCellText}
              />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <DialogIncidentStateRadioGroup
              label={t('setting.status.incidents.state')}
              value={incidentDraft.state}
              t={t}
              onChange={value => onIncidentDraftChange({ state: value })}
            />
          </div>
          <DialogComponentCheckboxGroup
            label={t('setting.status.incidents.components')}
            components={components}
            value={incidentDraft.componentIdsText}
            emptyLabel={emptyCellText}
            onChange={value => onIncidentDraftChange({ componentIdsText: value })}
          />
          <div
            className="md:col-span-2"
            data-status-incident-message-input="angular-textarea"
            data-status-incident-message-input-owner="hertzbeat-ui-textarea"
            data-status-incident-message-placeholder-contract="angular-state-placeholder"
          >
            <DialogTextareaField
              label={t('setting.status.incidents.message')}
              value={incidentDraft.message}
              placeholder={incidentMessagePlaceholder}
              rows={2}
              data-status-incident-message-placeholder={incidentMessagePlaceholderKey(incidentDraft.state)}
              onChange={value => onIncidentDraftChange({ message: value })}
            />
          </div>
        </div>
      </OverlayDialog>

      <div
        data-status-delete-confirm="angular-modal-confirm"
        data-status-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
        data-status-delete-confirm-state={deleteDialog ? 'open' : 'closed'}
      >
        <HzConfirmDialog
          open={deleteDialog !== null}
          tone="critical"
          title={deleteDialogTitle}
          kicker={t('status.title')}
          cancelLabel={t('common.button.cancel')}
          confirmLabel={t('setting.status.delete.confirm')}
          onClose={() => setDeleteDialog(null)}
          onConfirm={submitDeleteDialog}
          data-status-delete-confirm-dialog="angular-modal-confirm"
          data-status-delete-confirm-kind={deleteDialog?.kind || ''}
          confirmButtonProps={
            {
              'data-status-delete-confirm-ok': 'angular-modal-confirm'
            } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
          }
          cancelButtonProps={
            {
              'data-status-delete-confirm-cancel': 'angular-modal-confirm'
            } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
          }
        >
          <div
            data-status-delete-confirm-copy="angular-modal-confirm"
            className="space-y-3"
          >
            <p>{deleteDialogCopy}</p>
            <div className="rounded-[3px] border border-[#3f2228] bg-[#181013] px-3 py-2 font-semibold text-[#f0b8c1]">
              {deleteDialogName}
            </div>
          </div>
        </HzConfirmDialog>
      </div>
    </>
  );
}
