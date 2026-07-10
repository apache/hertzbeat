'use client';

import React from 'react';
import { ArrowRight, CircleHelp, ExternalLink, Inbox, MoreHorizontal, Pencil, Plus, Power, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
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
  fieldKey?: string;
  help?: string;
  impact?: string;
  helpLabel?: string;
  inputMode?: 'manual' | 'selection';
  inputModeLabel?: string;
  requirementLabel?: string;
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

function statusFieldControlName(fieldKey?: string) {
  return fieldKey ? `status_${fieldKey.replace(/-/g, '_')}` : undefined;
}

function focusStatusControl(selector: string) {
  const focus = () => document.querySelector<HTMLElement>(selector)?.focus();
  focus();
  window.requestAnimationFrame?.(focus);
}

function EmptyTableRow({
  colSpan,
  t,
  state = 'plain',
  title,
  copy
}: {
  colSpan: number;
  t: Translator;
  state?: 'plain' | 'filtered-incident';
  title?: string;
  copy?: string;
}) {
  return (
    <tr data-status-empty-row="hertzbeat-ui-table-empty" className="bg-[#0b0c0e]">
      <td colSpan={colSpan} className="h-[240px] px-3 py-10 text-center text-[#858d9a]">
        <div className="inline-flex flex-col items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#303743] bg-[#101217] text-[#cbd5e1]">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div data-status-empty-title={state} className="text-[13px] font-semibold text-[#dbe4f0]">
            {title || t('common.no-data')}
          </div>
          {copy ? (
            <div data-status-empty-copy={state} className="max-w-[360px] text-[12px] leading-5 text-[#858d9a]">
              {copy}
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function ColdField({
  label,
  required = false,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputModeLabel,
  requirementLabel,
  value,
  placeholder,
  onChange
}: FieldProps) {
  const inputId = React.useId();
  const helpCopy = [help, impact].filter(Boolean).join(' ');
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <label htmlFor={inputId}>
            {required ? <span className="mr-1 text-[#f87171]">*</span> : null}
            {label}
          </label>
        {helpCopy ? (
          <span className="group/help relative inline-flex">
            <button
              type="button"
              aria-label={helpLabel || label}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#182238] text-[10px] font-semibold leading-none text-[#d8e4ff] outline-none transition hover:bg-[#24304d] hover:text-[#f5f7fb] focus:bg-[#24304d] focus:text-[#f5f7fb] focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
              data-status-setting-field-help-key={fieldKey}
              data-status-setting-field-help-placement="inline-label"
              data-status-setting-field-help-trigger="hertzbeat-ui-field-help"
              data-status-setting-field-help-style="icon-after-label"
              data-status-setting-field-help-visual="circle-help-icon"
              data-status-setting-field-input-mode="manual"
              data-status-setting-field-requirement={required ? 'required' : 'optional'}
              data-status-setting-field-help-icon="lucide-circle-help"
            >
              <CircleHelp size={12} strokeWidth={2} aria-hidden="true" />
            </button>
            <span
              className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-[260px] -translate-x-1/2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-2 text-left text-[12px] font-medium leading-5 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.45)] group-hover/help:block group-focus/help:block group-focus-within/help:block group-focus-visible/help:block"
              data-status-setting-field-help="hertzbeat-ui-field-tooltip"
            >
              {helpCopy}
            </span>
          </span>
        ) : null}
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {requirementLabel ? (
            <span
              data-status-setting-field-requirement-badge={required ? 'required' : 'optional'}
              className={required ? 'rounded-[3px] bg-[#3b1d1d] px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb4b4]' : 'rounded-[3px] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3]'}
            >
              {requirementLabel}
            </span>
          ) : null}
          {inputModeLabel ? (
            <span
              data-status-setting-field-input-mode-badge="manual"
              className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3]"
            >
              {inputModeLabel}
            </span>
          ) : null}
        </span>
      </div>
      <Input
        id={inputId}
        name={statusFieldControlName(fieldKey)}
        aria-label={label}
        data-status-setting-field-input={fieldKey}
        className={coldInputClassName}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}

function StatusDialogFieldTitle({
  label,
  required = false,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'manual',
  inputModeLabel,
  requirementLabel,
  controlId
}: Omit<FieldProps, 'value' | 'placeholder' | 'onChange'> & { controlId?: string }) {
  const helpCopy = [help, impact].filter(Boolean).join(' ');
  const fallbackTooltipId = React.useId();
  const tooltipId = `status-dialog-field-help-${fieldKey || fallbackTooltipId.replace(/:/g, '')}`;
  return (
    <div
      data-status-dialog-field-title={fieldKey}
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] font-semibold text-[#a9b0bb]"
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <label htmlFor={controlId}>
          {label}
          {required ? (
            <span
              data-status-dialog-required-mark="hertzbeat-ui-required"
              aria-hidden="true"
              className="ml-1 text-[#f87171]"
            >
              *
            </span>
          ) : null}
        </label>
        {helpCopy ? (
          <span className="group/help relative inline-flex">
            <button
              type="button"
              aria-label={helpLabel || label}
              aria-describedby={tooltipId}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#182238] text-[10px] font-semibold leading-none text-[#d8e4ff] outline-none transition hover:bg-[#24304d] hover:text-[#f5f7fb] focus:bg-[#24304d] focus:text-[#f5f7fb] focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
              data-status-dialog-field-help-key={fieldKey}
              data-status-dialog-field-help-placement="inline-label"
              data-status-dialog-field-help-trigger="hertzbeat-ui-field-help"
              data-status-dialog-field-help-style="icon-after-label"
              data-status-dialog-field-help-visual="circle-help-icon"
              data-status-dialog-field-help-icon="lucide-circle-help"
              onClick={event => {
                event.stopPropagation();
              }}
              onMouseDown={event => {
                event.stopPropagation();
              }}
            >
              <CircleHelp size={12} strokeWidth={2} aria-hidden="true" />
            </button>
            <span
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-[260px] -translate-x-1/2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 py-2 text-left text-[12px] font-medium leading-5 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.45)] group-hover/help:block group-focus/help:block group-focus-within/help:block group-focus-visible/help:block"
              data-status-dialog-field-help="hertzbeat-ui-field-tooltip"
            >
              {helpCopy}
            </span>
          </span>
        ) : null}
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {requirementLabel ? (
          <span
            data-status-dialog-field-requirement={required ? 'required' : 'optional'}
            className={required ? 'rounded-[3px] bg-[#3b1d1d] px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb4b4]' : 'rounded-[3px] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3]'}
          >
            {requirementLabel}
          </span>
        ) : null}
        {inputModeLabel ? (
          <span
            data-status-dialog-field-input-mode={inputMode}
            className={inputMode === 'selection' ? 'rounded-[3px] border border-[#31405c] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold text-[#d8e4ff]' : 'rounded-[3px] border border-[#2b3039] bg-[#101217] px-1.5 py-0.5 text-[10px] font-semibold text-[#98a2b3]'}
          >
            {inputModeLabel}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function DialogField({
  label,
  required,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'manual',
  inputModeLabel,
  requirementLabel,
  value,
  placeholder,
  onChange
}: FieldProps) {
  const inputId = React.useId();
  return (
    <div className="grid gap-1.5">
      <StatusDialogFieldTitle
        label={label}
        required={required}
        fieldKey={fieldKey}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode={inputMode}
        inputModeLabel={inputModeLabel}
        requirementLabel={requirementLabel}
        controlId={inputId}
      />
      <Input
        id={inputId}
        name={statusFieldControlName(fieldKey)}
        aria-label={label}
        data-status-dialog-input={fieldKey}
        className={coldInputClassName}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}

type DialogTextareaFieldProps = FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'placeholder' | 'onChange' | 'inputMode'>;

function DialogTextareaField({
  label,
  required,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'manual',
  inputModeLabel,
  requirementLabel,
  value,
  placeholder,
  onChange,
  ...props
}: DialogTextareaFieldProps) {
  const textareaId = React.useId();
  return (
    <div className="grid gap-1.5">
      <StatusDialogFieldTitle
        label={label}
        required={required}
        fieldKey={fieldKey}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode={inputMode}
        inputModeLabel={inputModeLabel}
        requirementLabel={requirementLabel}
        controlId={textareaId}
      />
      <HzTextarea
        id={textareaId}
        name={statusFieldControlName(fieldKey)}
        aria-label={label}
        data-status-dialog-input={fieldKey}
        height="default"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        {...props}
      />
    </div>
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
  required,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'selection',
  inputModeLabel,
  requirementLabel,
  components,
  value,
  emptyLabel,
  onChange
}: {
  label: string;
  required?: boolean;
  fieldKey?: string;
  help?: string;
  impact?: string;
  helpLabel?: string;
  inputMode?: 'manual' | 'selection';
  inputModeLabel?: string;
  requirementLabel?: string;
  components: StatusPageComponent[];
  value: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  const selectedIds = parseComponentIdSelection(value);
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <StatusDialogFieldTitle
        label={label}
        required={required}
        fieldKey={fieldKey}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode={inputMode}
        inputModeLabel={inputModeLabel}
        requirementLabel={requirementLabel}
      />
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
  required,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'selection',
  inputModeLabel,
  requirementLabel,
  value,
  onChange,
  t
}: {
  label: string;
  required?: boolean;
  fieldKey?: string;
  help?: string;
  impact?: string;
  helpLabel?: string;
  inputMode?: 'manual' | 'selection';
  inputModeLabel?: string;
  requirementLabel?: string;
  value: string;
  onChange: (value: string) => void;
  t: Translator;
}) {
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <StatusDialogFieldTitle
        label={label}
        required={required}
        fieldKey={fieldKey}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode={inputMode}
        inputModeLabel={inputModeLabel}
        requirementLabel={requirementLabel}
      />
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

function DialogComponentRadioGroup({
  label,
  required,
  fieldKey,
  help,
  impact,
  helpLabel,
  inputMode = 'selection',
  inputModeLabel,
  requirementLabel,
  name,
  value,
  options,
  onChange,
  owner
}: {
  label: string;
  required?: boolean;
  fieldKey?: string;
  help?: string;
  impact?: string;
  helpLabel?: string;
  inputMode?: 'manual' | 'selection';
  inputModeLabel?: string;
  requirementLabel?: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  onChange: (value: string) => void;
  owner: 'method' | 'state';
}) {
  return (
    <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
      <StatusDialogFieldTitle
        label={label}
        required={required}
        fieldKey={fieldKey}
        help={help}
        impact={impact}
        helpLabel={helpLabel}
        inputMode={inputMode}
        inputModeLabel={inputModeLabel}
        requirementLabel={requirementLabel}
      />
      <HzRadioButtonGroup
        name={name}
        value={value}
        onChange={onChange}
        data-status-component-choice-control={owner}
        data-status-component-choice-owner="hertzbeat-ui-radio-button-group"
        options={options}
      />
    </div>
  );
}

function tagClassName(kind: 'ok' | 'bad' | 'warn' | 'neutral') {
  if (kind === 'ok') return 'border-[#2f4a3b] bg-[#101217] text-[#9fd8b5]';
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

function StatusRowActionHelp({
  id,
  label,
  copy,
  scope = 'row'
}: {
  id: string;
  label: string;
  copy: string;
  scope?: 'toolbar' | 'row';
}) {
  const tooltipId = `status-${scope}-action-help-${id}`;
  const helpStyle = 'icon-after-action';
  const helpVisual = 'circle-help-icon';
  const rootData =
    scope === 'toolbar'
      ? { 'data-status-action-help': id, 'data-status-action-help-style': helpStyle }
      : { 'data-status-row-action-help': id, 'data-status-row-action-help-style': helpStyle };
  const triggerData =
    scope === 'toolbar'
      ? { 'data-status-action-help-trigger': 'hertzbeat-ui-action-help' }
      : { 'data-status-row-action-help-trigger': 'hertzbeat-ui-action-help' };
  const tooltipData =
    scope === 'toolbar'
      ? { 'data-status-action-help-tooltip': id }
      : { 'data-status-row-action-help-tooltip': id };
  return (
    <span {...rootData} className="group/help relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        {...triggerData}
        data-status-help-style={helpStyle}
        data-status-help-visual={helpVisual}
        className="inline-flex h-5 w-5 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[#8d95a5] transition hover:text-[#d8e4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
        onMouseDown={event => {
          event.stopPropagation();
        }}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <CircleHelp size={13} strokeWidth={2} aria-hidden="true" data-status-help-icon="lucide-circle-help" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        {...tooltipData}
        className="pointer-events-none absolute left-0 top-6 z-50 hidden w-[280px] rounded-[3px] border border-[#2b3039] bg-[#101217] p-3 text-left text-[11px] leading-4 text-[#dbe4f0] shadow-[0_16px_40px_rgba(0,0,0,0.42)] group-hover/help:block group-focus-within/help:block"
      >
        {copy}
      </span>
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
            data-status-command-action={`tab-${mode}`}
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
  const hasSavedStatusOrg = statusOrg.id != null;
  const activeMode = mode === 'incident' ? 'incident' : 'component';
  const isIncidentFilteredEmpty = incidents.length === 0 && incidentSearchInput.trim().length > 0;
  const incidentPrerequisite = !hasSavedStatusOrg
    ? t('setting.status.incidents.prerequisite.org')
    : components.length === 0
      ? t('setting.status.incidents.prerequisite.components')
      : null;
  const incidentTotalElements = Math.max(0, data.incidents?.totalElements ?? incidents.length);
  const incidentPageSize = Math.max(1, data.incidents?.pageSize ?? 8);
  const incidentTotalPages = Math.max(1, Math.ceil(incidentTotalElements / incidentPageSize));
  const incidentPageIndex = Math.min(Math.max(0, data.incidents?.pageIndex ?? 0), incidentTotalPages - 1);
  const incidentCurrentPage = incidentPageIndex + 1;
  const incidentPaginationSummary = `${t('common.total')} ${incidentTotalElements}`;
  const hasOrgDraftValue = Boolean(
    orgDraft.id != null ||
    orgDraft.name.trim() ||
    orgDraft.description.trim() ||
    orgDraft.home.trim() ||
    orgDraft.feedback.trim() ||
    orgDraft.logo.trim() ||
    orgDraft.color.trim()
  );
  const orgValues = hasOrgDraftValue
    ? {
        name: orgDraft.name,
        description: orgDraft.description,
        home: orgDraft.home,
        logo: orgDraft.logo,
        feedback: orgDraft.feedback,
        color: orgDraft.color
      }
    : {
        name: statusOrg.name || '',
        description: statusOrg.description || '',
        home: statusOrg.home || '',
        logo: statusOrg.logo || '',
        feedback: statusOrg.feedback || '',
        color: statusOrg.color || ''
      };
  const [deleteDialog, setDeleteDialog] = React.useState<DeleteDialogState>(null);
  const emptyCellText = t('common.none');

  React.useEffect(() => {
    if (!editingComponent || !componentError) return;
    const selector = !componentDraft.name.trim()
      ? '[data-status-dialog-input="component-name"]'
      : !componentDraft.description.trim()
        ? '[data-status-dialog-input="component-description"]'
        : null;
    if (!selector) return;
    focusStatusControl(selector);
  }, [componentDraft.description, componentDraft.name, componentError, editingComponent]);

  React.useEffect(() => {
    if (!editingIncident || !incidentError) return;
    const selector = !incidentDraft.name.trim()
      ? '[data-status-dialog-input="incident-name"]'
      : !incidentDraft.componentIdsText.trim()
        ? '[data-status-incident-component-picker] input[type="checkbox"]'
        : !incidentDraft.message.trim()
          ? '[data-status-dialog-input="incident-message"]'
          : null;
    if (!selector) return;
    focusStatusControl(selector);
  }, [editingIncident, incidentDraft.componentIdsText, incidentDraft.message, incidentDraft.name, incidentError]);

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
  const statusDialogLabels = {
    required: t('setting.status.field.requirement.required'),
    optional: t('setting.status.field.requirement.optional'),
    manual: t('setting.status.field.input-mode.manual'),
    selection: t('setting.status.field.input-mode.selection')
  };
  const statusDialogHelpLabel = (field: string) => t('setting.status.field.help-aria', { field });

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
              <div
                data-status-header="hertzbeat-ui-compact-header"
                data-status-header-nesting-contract="flat-page-introduction"
                className="p-0"
              >
                <div className="max-w-[840px]">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#f5f7fb]">
                    {t('setting.status.title')}
                  </h1>
                  <p className="mt-4 max-w-[780px] text-[13px] leading-6 text-[#a9b0bb]">
                    {t('setting.status.subtitle')}
                  </p>
                  <div data-status-command-row="standard-equal-buttons" className={coldStatusVisual.button.row}>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldButtonClassName}
                        onClick={() => onModeChange(activeMode)}
                        data-status-command-action="page-refresh"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.refresh')}
                      </Button>
                      <StatusRowActionHelp
                        id="page-refresh"
                        label={t('setting.status.action.refresh.help-label')}
                        copy={t('setting.status.action.refresh.help')}
                        scope="toolbar"
                      />
                    </span>
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
                    <Button
                      size="sm"
                      variant="default"
                      className={coldPrimaryButtonClassName}
                      onClick={onSaveOrg}
                      disabled={savingOrg}
                      data-status-command-action="org-save"
                    >
                      {t('common.button.ok')}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <ColdField
                      required
                      fieldKey="org-name"
                      label={t('setting.status.org.name')}
                      help={t('setting.status.org.name.help')}
                      impact={t('setting.status.org.name.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.name') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.required}
                      value={orgValues.name}
                      placeholder={t('setting.status.org.name')}
                      onChange={value => onOrgDraftChange({ name: value })}
                    />
                    <ColdField
                      required
                      fieldKey="org-description"
                      label={t('setting.status.org.description')}
                      help={t('setting.status.org.description.help')}
                      impact={t('setting.status.org.description.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.description') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.required}
                      value={orgValues.description}
                      placeholder={t('setting.status.org.description')}
                      onChange={value => onOrgDraftChange({ description: value })}
                    />
                    <ColdField
                      required
                      fieldKey="org-home"
                      label={t('setting.status.org.home')}
                      help={t('setting.status.org.home.help')}
                      impact={t('setting.status.org.home.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.home') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.required}
                      value={orgValues.home}
                      placeholder={t('setting.status.org.home')}
                      onChange={value => onOrgDraftChange({ home: value })}
                    />
                    <ColdField
                      required
                      fieldKey="org-logo"
                      label={t('setting.status.org.logo')}
                      help={t('setting.status.org.logo.help')}
                      impact={t('setting.status.org.logo.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.logo') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.required}
                      value={orgValues.logo}
                      placeholder={t('setting.status.org.logo')}
                      onChange={value => onOrgDraftChange({ logo: value })}
                    />
                    <ColdField
                      required
                      fieldKey="org-feedback"
                      label={t('setting.status.org.feedback')}
                      help={t('setting.status.org.feedback.help')}
                      impact={t('setting.status.org.feedback.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.feedback') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.required}
                      value={orgValues.feedback}
                      placeholder={t('setting.status.org.feedback')}
                      onChange={value => onOrgDraftChange({ feedback: value })}
                    />
                    <ColdField
                      fieldKey="org-color"
                      label={t('setting.status.org.color')}
                      help={t('setting.status.org.color.help')}
                      impact={t('setting.status.org.color.impact')}
                      helpLabel={t('setting.status.org.field.help-aria', { field: t('setting.status.org.color') })}
                      inputModeLabel={statusDialogLabels.manual}
                      requirementLabel={statusDialogLabels.optional}
                      value={orgValues.color}
                      placeholder={t('setting.status.org.color')}
                      onChange={value => onOrgDraftChange({ color: value })}
                    />
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
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldButtonClassName}
                        data-status-component-refresh-contract="angular-sync-component"
                        data-status-component-refresh-owner="route-refresh-contract"
                        data-status-command-action="component-refresh"
                        onClick={() => onModeChange('component')}
                      >
                        {t('common.refresh')}
                      </Button>
                      <StatusRowActionHelp
                        id="component-refresh"
                        label={t('setting.status.components.action.refresh.help-label')}
                        copy={t('setting.status.components.action.refresh.help')}
                        scope="toolbar"
                      />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        className={coldPrimaryButtonClassName}
                        onClick={onNewComponent}
                        data-status-command-action="component-new"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('setting.status.components.new')}
                      </Button>
                      <StatusRowActionHelp
                        id="component-new"
                        label={t('setting.status.components.action.new.help-label')}
                        copy={t('setting.status.components.action.new.help')}
                        scope="toolbar"
                      />
                    </span>
                    {hasPublicStatusLink ? (
                      <span className="inline-flex items-center gap-1">
                        <a
                          href={publicStatusHref}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-center gap-1.5 ${coldPrimaryButtonClassName}`}
                          data-status-public-link-contract="angular-tab-toolbar-conditional"
                          data-status-public-link-owner="status-tab-toolbar"
                          data-status-public-link-mode="component"
                          data-status-command-action="component-public"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          {publicStatusLabel}
                        </a>
                        <StatusRowActionHelp
                          id="component-public"
                          label={t('setting.status.action.public.help-label')}
                          copy={t('setting.status.action.public.help')}
                          scope="toolbar"
                        />
                      </span>
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
                                  <span className="inline-flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="default"
                                      className={coldIconButtonClassName}
                                      title={t('setting.status.components.edit')}
                                      onClick={() => {
                                        if (component.id != null) onSelectComponent(component.id);
                                        onEditComponent(component);
                                      }}
                                      data-status-command-action="component-row-edit"
                                    >
                                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{t('setting.status.components.edit')}</span>
                                    </Button>
                                    <StatusRowActionHelp
                                      id="component-edit"
                                      label={t('setting.status.components.row-edit.help-label')}
                                      copy={t('setting.status.components.row-edit.help')}
                                    />
                                  </span>
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
                                      data-status-command-action="component-row-more"
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
                                      <span className="flex items-center gap-1">
                                        <HzTableRowActionButton
                                          width="root-span"
                                          intent="ghost"
                                          onClick={() => {
                                            setOpenRowActionMenuId(null);
                                            openComponentDeleteDialog(component);
                                          }}
                                          data-status-component-delete-confirm-trigger="angular-modal-confirm"
                                          data-status-component-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                                          data-status-command-action="component-row-delete"
                                          className="w-full text-[#fecaca] hover:text-white"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                          <span className="truncate">{t('setting.status.components.delete')}</span>
                                        </HzTableRowActionButton>
                                        <StatusRowActionHelp
                                          id="component-delete"
                                          label={t('setting.status.components.row-delete.help-label')}
                                          copy={t('setting.status.components.row-delete.help')}
                                        />
                                      </span>
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
                        <span className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className={coldButtonClassName}
                            data-status-incident-refresh-contract="angular-sync-incidence"
                            data-status-incident-refresh-owner="route-refresh-contract"
                            data-status-command-action="incident-refresh"
                            onClick={() => onModeChange('incident')}
                          >
                            {t('common.refresh')}
                          </Button>
                          <StatusRowActionHelp
                            id="incident-refresh"
                            label={t('setting.status.incidents.action.refresh.help-label')}
                            copy={t('setting.status.incidents.action.refresh.help')}
                            scope="toolbar"
                          />
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            className={coldPrimaryButtonClassName}
                            disabled={Boolean(incidentPrerequisite)}
                            aria-describedby={incidentPrerequisite ? 'status-incident-prerequisite' : undefined}
                            data-status-incident-new-state={incidentPrerequisite ? 'blocked' : 'ready'}
                            data-status-command-action="incident-new"
                            onClick={onNewIncident}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('setting.status.incidents.new')}
                          </Button>
                          <StatusRowActionHelp
                            id="incident-new"
                            label={t('setting.status.incidents.action.new.help-label')}
                            copy={t('setting.status.incidents.action.new.help')}
                            scope="toolbar"
                          />
                        </span>
                        {hasPublicStatusLink ? (
                          <span className="inline-flex items-center gap-1">
                            <a
                              href={publicStatusHref}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center justify-center gap-1.5 ${coldPrimaryButtonClassName}`}
                              data-status-public-link-contract="angular-tab-toolbar-conditional"
                              data-status-public-link-owner="status-tab-toolbar"
                              data-status-public-link-mode="incident"
                              data-status-command-action="incident-public"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              {publicStatusLabel}
                            </a>
                            <StatusRowActionHelp
                              id="incident-public"
                              label={t('setting.status.action.public.help-label')}
                              copy={t('setting.status.action.public.help')}
                              scope="toolbar"
                            />
                          </span>
                        ) : null}
                      </>
                    }
                  />
                  {incidentPrerequisite ? (
                    <div
                      id="status-incident-prerequisite"
                      role="status"
                      aria-live="polite"
                      data-status-incident-prerequisite="true"
                      data-status-incident-prerequisite-state={!hasSavedStatusOrg ? 'missing-org' : 'missing-component'}
                      className="mb-3 border border-[#2b3039] bg-[#101217] px-3 py-2 text-[12px] leading-5 text-[#d8e4ff]"
                    >
                      {incidentPrerequisite}
                    </div>
                  ) : null}

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
                                  <span className="inline-flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="default"
                                      className={coldIconButtonClassName}
                                      title={t('setting.status.incidents.update')}
                                      onClick={() => {
                                        if (incident.id != null) onSelectIncident(incident.id);
                                        onEditIncident(incident);
                                      }}
                                      data-status-command-action="incident-row-update"
                                    >
                                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">{t('setting.status.incidents.update')}</span>
                                    </Button>
                                    <StatusRowActionHelp
                                      id="incident-update"
                                      label={t('setting.status.incidents.row-update.help-label')}
                                      copy={t('setting.status.incidents.row-update.help')}
                                    />
                                  </span>
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
                                      data-status-command-action="incident-row-more"
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
                                      <span className="flex items-center gap-1">
                                        <HzTableRowActionButton
                                          width="root-span"
                                          intent="ghost"
                                          onClick={() => {
                                            setOpenRowActionMenuId(null);
                                            openIncidentDeleteDialog(incident);
                                          }}
                                          data-status-incident-delete-confirm-trigger="angular-modal-confirm"
                                          data-status-incident-delete-confirm-owner="hertzbeat-ui-confirm-dialog"
                                          data-status-command-action="incident-row-delete"
                                          className="w-full text-[#fecaca] hover:text-white"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                          <span className="truncate">{t('setting.status.incidents.delete')}</span>
                                        </HzTableRowActionButton>
                                        <StatusRowActionHelp
                                          id="incident-delete"
                                          label={t('setting.status.incidents.row-delete.help-label')}
                                          copy={t('setting.status.incidents.row-delete.help')}
                                        />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <EmptyTableRow
                            colSpan={6}
                            t={t}
                            state={isIncidentFilteredEmpty ? 'filtered-incident' : 'plain'}
                            title={isIncidentFilteredEmpty ? t('setting.status.incidents.empty.filtered.title') : undefined}
                            copy={isIncidentFilteredEmpty ? t('setting.status.incidents.empty.filtered.copy') : undefined}
                          />
                        )}
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
        closeLabel={t('common.dialog.close')}
        onClose={onCancelComponent}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              className={coldButtonClassName}
              onClick={onCancelComponent}
              data-status-command-action="component-cancel"
            >
              {t('common.button.cancel')}
            </Button>
            <Button
              size="sm"
              variant="default"
              className={coldPrimaryButtonClassName}
              onClick={onSaveComponent}
              disabled={savingComponent}
              data-status-command-action="component-save"
            >
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        {componentError ? (
          <div
            data-status-component-dialog-feedback="error"
            data-status-dialog-feedback-owner="route-action-feedback-contract"
            className="mb-3 rounded-[3px] border border-[#7f1d1d]/60 bg-[#2a1214] px-3 py-2 text-[12px] font-semibold text-[#fca5a5]"
          >
            {componentError}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <DialogField
            required
            fieldKey="component-name"
            label={t('setting.status.components.name')}
            help={t('setting.status.components.name.help')}
            impact={t('setting.status.components.name.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.components.name'))}
            inputModeLabel={statusDialogLabels.manual}
            requirementLabel={statusDialogLabels.required}
            value={componentDraft.name}
            placeholder={t('setting.status.components.name')}
            onChange={value => onComponentDraftChange({ name: value })}
          />
          <DialogComponentRadioGroup
            required
            fieldKey="component-method"
            label={t('setting.status.components.method')}
            help={t('setting.status.components.method.help')}
            impact={t('setting.status.components.method.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.components.method'))}
            inputModeLabel={statusDialogLabels.selection}
            requirementLabel={statusDialogLabels.required}
            name="status-component-method"
            value={componentDraft.method}
            owner="method"
            options={[
              { value: '0', label: t('setting.status.components.method.0'), icon: <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> },
              { value: '1', label: t('setting.status.components.method.1'), icon: <Power className="h-3.5 w-3.5" aria-hidden="true" /> }
            ]}
            onChange={value => onComponentDraftChange({ method: value })}
          />
          <DialogComponentRadioGroup
            required
            fieldKey="component-state"
            label={t('setting.status.components.state')}
            help={t('setting.status.components.state.help')}
            impact={t('setting.status.components.state.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.components.state'))}
            inputModeLabel={statusDialogLabels.selection}
            requirementLabel={statusDialogLabels.required}
            name="status-component-state"
            value={componentDraft.state}
            owner="state"
            options={[
              { value: '0', label: t('status.component.state.0'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
              { value: '1', label: t('status.component.state.1'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> },
              { value: '2', label: t('status.component.state.2'), icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> }
            ]}
            onChange={value => onComponentDraftChange({ state: value })}
          />
          <DialogField
            fieldKey="component-labels"
            label={t('setting.status.components.labels')}
            help={t('setting.status.components.labels.help')}
            impact={t('setting.status.components.labels.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.components.labels'))}
            inputModeLabel={statusDialogLabels.manual}
            requirementLabel={statusDialogLabels.optional}
            value={componentDraft.labelsText}
            placeholder={t('setting.status.component.labels.placeholder')}
            onChange={value => onComponentDraftChange({ labelsText: value })}
          />
          <div className="md:col-span-2">
            <DialogField
              required
              fieldKey="component-description"
              label={t('setting.status.component.description')}
              help={t('setting.status.component.description.help')}
              impact={t('setting.status.component.description.impact')}
              helpLabel={statusDialogHelpLabel(t('setting.status.component.description'))}
              inputModeLabel={statusDialogLabels.manual}
              requirementLabel={statusDialogLabels.required}
              value={componentDraft.description}
              placeholder={t('setting.status.component.description.placeholder')}
              onChange={value => onComponentDraftChange({ description: value })}
            />
          </div>
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={editingIncident}
        title={incidentDraft.id ? t('setting.status.incidents.update') : t('setting.status.incidents.new')}
        kicker={t('setting.status.incidents.tab')}
        maxWidthClassName="max-w-2xl"
        closeLabel={t('common.dialog.close')}
        onClose={onCancelIncident}
        overlayProps={{
          'data-status-incident-failure-close-contract': 'angular-cancel-on-api-failure',
          'data-status-incident-failure-close-owner': 'status-route-action-feedback'
        } as React.ComponentProps<typeof OverlayDialog>['overlayProps']}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              className={coldButtonClassName}
              onClick={onCancelIncident}
              data-status-command-action="incident-cancel"
            >
              {t('common.button.cancel')}
            </Button>
            <Button
              size="sm"
              variant="default"
              className={coldPrimaryButtonClassName}
              onClick={onSaveIncident}
              disabled={savingIncident}
              data-status-command-action="incident-save"
            >
              {t('common.button.save')}
            </Button>
          </div>
        }
      >
        {incidentError ? (
          <div
            data-status-incident-dialog-feedback="error"
            data-status-dialog-feedback-owner="route-action-feedback-contract"
            className="mb-3 rounded-[3px] border border-[#7f1d1d]/60 bg-[#2a1214] px-3 py-2 text-[12px] font-semibold text-[#fca5a5]"
          >
            {incidentError}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <DialogField
            required
            fieldKey="incident-name"
            label={t('setting.status.incidents.name')}
            help={t('setting.status.incidents.name.help')}
            impact={t('setting.status.incidents.name.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.incidents.name'))}
            inputModeLabel={statusDialogLabels.manual}
            requirementLabel={statusDialogLabels.required}
            value={incidentDraft.name}
            placeholder={t('setting.status.incidents.name')}
            onChange={value => onIncidentDraftChange({ name: value })}
          />
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
              required
              fieldKey="incident-state"
              label={t('setting.status.incidents.state')}
              help={t('setting.status.incidents.state.help')}
              impact={t('setting.status.incidents.state.impact')}
              helpLabel={statusDialogHelpLabel(t('setting.status.incidents.state'))}
              inputModeLabel={statusDialogLabels.selection}
              requirementLabel={statusDialogLabels.required}
              value={incidentDraft.state}
              t={t}
              onChange={value => onIncidentDraftChange({ state: value })}
            />
          </div>
          <DialogComponentCheckboxGroup
            required
            fieldKey="incident-components"
            label={t('setting.status.incidents.components')}
            help={t('setting.status.incidents.components.help')}
            impact={t('setting.status.incidents.components.impact')}
            helpLabel={statusDialogHelpLabel(t('setting.status.incidents.components'))}
            inputModeLabel={statusDialogLabels.selection}
            requirementLabel={statusDialogLabels.required}
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
              required
              fieldKey="incident-message"
              label={t('setting.status.incidents.message')}
              help={t('setting.status.incidents.message.help')}
              impact={t('setting.status.incidents.message.impact')}
              helpLabel={statusDialogHelpLabel(t('setting.status.incidents.message'))}
              inputModeLabel={statusDialogLabels.manual}
              requirementLabel={statusDialogLabels.required}
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
              'data-status-command-action': 'delete-confirm',
              'data-status-delete-confirm-ok': 'angular-modal-confirm'
            } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
          }
          cancelButtonProps={
            {
              'data-status-command-action': 'delete-cancel',
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
