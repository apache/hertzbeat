'use client';

import React from 'react';
import { Activity, ArrowLeft, BarChart3, RotateCcw, Save, SearchCheck, Timer } from 'lucide-react';
import { HzConfirmDialog, HzInlineFeedback, type HzStatusTone } from '@hertzbeat/ui';
import type { DatasourceStatusPayload } from '../../lib/alert-setting/controller';
import type { AlertDefine } from '../../lib/types';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { HzCodeEditor } from '../ui/hz-code-editor';
import { Input } from '../ui/input';
import { LabelRecordInput } from '../ui/label-record-input';
import { NumberStepper } from '../ui/number-stepper';
import { SegmentedControl } from '../ui/segmented-control';
import {
  AlertAuthoringInlineHelp,
  AlertAuthoringRequiredMark
} from './alert-authoring-primitives';
import { OverlayDialog } from '../workbench/overlay-dialog';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertSettingCreateKind = 'realtime' | 'periodic';
export type AlertSettingCreateDataType = 'metric' | 'log' | 'trace';
export type AlertSettingCreateMode = 'type' | 'authoring';
export type AlertSettingCreateIntent = 'create' | 'edit';
type AlertSettingCreateFieldRequirement = 'required' | 'optional';
type AlertSettingCreateFieldInputMode = 'manual' | 'selection';
export type AlertSettingCreateSaveFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  contract: AlertSettingCreateIntent;
};
export type AlertSettingCreatePreviewFeedback = {
  tone: HzStatusTone;
  title: string;
  description?: string;
  rows?: Array<Record<string, unknown>>;
  totalRows?: number;
  sampleLimit?: number;
  contract: 'success' | 'empty' | 'unsupported' | 'failed';
};
type AlertSettingCreatePreviewEvidenceContract = AlertSettingCreatePreviewFeedback['contract'] | 'loading';

export type AlertSettingCreateDraft = {
  id?: number;
  name: string;
  kind: AlertSettingCreateKind;
  dataType: AlertSettingCreateDataType;
  datasource: string;
  expr: string;
  template: string;
  labelsText: string;
  enable: boolean;
  period: string;
  times: string;
  priority: string;
};

export type AlertSettingCreatePayload = {
  id?: number;
  name: string;
  type: `${AlertSettingCreateKind}_${AlertSettingCreateDataType}`;
  datasource: string;
  expr: string;
  template: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enable: boolean;
  period: number;
  times: number;
  priority: number;
};

export type AlertSettingCreateValidationField = 'name' | 'expr' | 'template';

export type AlertSettingCreateValidationIssue = {
  field: AlertSettingCreateValidationField;
  message: string;
};

export function createDefaultAlertSettingDraft(
  kind: AlertSettingCreateKind = 'realtime',
  previous?: Partial<AlertSettingCreateDraft>
): AlertSettingCreateDraft {
  const dataType = kind === 'periodic' ? previous?.dataType || 'metric' : previous?.dataType === 'log' ? 'log' : 'metric';
  const previousKind = previous?.kind;
  const previousDataType = previous?.dataType;
  const didChangeSignalMode = Boolean(previousKind && previousDataType && (previousKind !== kind || previousDataType !== dataType));
  return {
    name: previous?.name || '',
    kind,
    dataType,
    datasource: didChangeSignalMode
      ? resolveAlertSettingCreateDatasource(kind, dataType)
      : previous?.datasource || resolveAlertSettingCreateDatasource(kind, dataType),
    expr: previous?.expr || '',
    template: previous?.template || '',
    labelsText: previous?.labelsText || '',
    enable: previous?.enable ?? true,
    period: previous?.period || '300',
    times: previous?.times || '3',
    priority: previous?.priority || '2'
  };
}

function parseAlertDefineType(type?: string | null): {
  kind: AlertSettingCreateKind;
  dataType: AlertSettingCreateDataType;
} {
  const [rawKind, rawDataType] = String(type || 'realtime_metric').split('_');
  const kind: AlertSettingCreateKind = rawKind === 'periodic' ? 'periodic' : 'realtime';
  let dataType: AlertSettingCreateDataType =
    rawDataType === 'trace' ? 'trace' : rawDataType === 'log' ? 'log' : 'metric';
  if (kind === 'realtime' && dataType === 'trace') {
    dataType = 'metric';
  }
  return { kind, dataType };
}

function formatLabelsText(labels?: Record<string, string>) {
  return Object.entries(labels || {})
    .map(([key, value]) => `${key}:${value}`)
    .join(', ');
}

export function buildAlertSettingDraftFromDefine(define: AlertDefine): AlertSettingCreateDraft {
  const { kind, dataType } = parseAlertDefineType(define.type);
  return {
    id: define.id,
    name: define.name || '',
    kind,
    dataType,
    datasource: define.datasource || 'promql',
    expr: define.expr || '',
    template: define.template || '',
    labelsText: formatLabelsText(define.labels),
    enable: define.enable ?? true,
    period: String(define.period || 300),
    times: String(define.times || 3),
    priority: String(define.priority ?? 2)
  };
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseLabels(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((result, item) => {
      const [rawKey, ...rest] = item.split(':');
      const key = rawKey.trim();
      const labelValue = rest.join(':').trim();
      if (key) {
        result[key] = labelValue || key;
      }
      return result;
    }, {});
}

function sortRecord(record: Record<string, string>) {
  return Object.keys(record)
    .sort()
    .reduce<Record<string, string>>((result, key) => {
      result[key] = record[key];
      return result;
    }, {});
}

export function serializeAlertSettingCreatePayload(payload: AlertSettingCreatePayload) {
  return JSON.stringify({
    ...payload,
    labels: sortRecord(payload.labels),
    annotations: sortRecord(payload.annotations)
  });
}

export function resolveAlertSettingCreateDatasource(
  kind: AlertSettingCreateKind,
  dataType: AlertSettingCreateDataType
) {
  if (kind === 'periodic' && (dataType === 'log' || dataType === 'trace')) {
    return 'sql';
  }
  return 'promql';
}

function resolveAlertSettingCreateValidationMessage(t: Translator, field: AlertSettingCreateValidationField) {
  switch (field) {
    case 'name':
      return t('alert.setting.validation.name');
    case 'expr':
      return t('alert.setting.validation.expr');
    case 'template':
      return t('alert.setting.validation.template');
  }
}

function isAlertSettingCreateFieldValid(draft: AlertSettingCreateDraft, field: AlertSettingCreateValidationField) {
  switch (field) {
    case 'name':
      return Boolean(draft.name.trim());
    case 'expr':
      return Boolean(draft.expr.trim());
    case 'template':
      return Boolean(draft.template.trim());
  }
}

export function buildAlertSettingCreateValidation(
  t: Translator,
  draft: AlertSettingCreateDraft
): AlertSettingCreateValidationIssue[] {
  const requiredFields: AlertSettingCreateValidationField[] = ['name', 'expr', 'template'];
  return requiredFields
    .filter(field => !isAlertSettingCreateFieldValid(draft, field))
    .map(field => ({
      field,
      message: resolveAlertSettingCreateValidationMessage(t, field)
    }));
}

function formatPreviewValue(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function resolvePreviewEvidenceTone(contract: AlertSettingCreatePreviewEvidenceContract): HzStatusTone {
  switch (contract) {
    case 'success':
      return 'success';
    case 'empty':
    case 'unsupported':
      return 'warning';
    case 'failed':
      return 'critical';
    case 'loading':
      return 'info';
  }
}

function resolvePreviewEvidenceDotClassName(contract: AlertSettingCreatePreviewEvidenceContract) {
  switch (contract) {
    case 'success':
      return 'bg-[#4ade80]';
    case 'empty':
    case 'unsupported':
      return 'bg-[#f8c572]';
    case 'failed':
      return 'bg-[#ff6b8a]';
    case 'loading':
      return 'bg-[#6ba7ff]';
  }
}

function resolvePreviewEvidenceWriteImpactKey(
  contract: AlertSettingCreatePreviewEvidenceContract,
  draft: AlertSettingCreateDraft
) {
  if (contract === 'loading') {
    return 'alert.setting.preview.evidence.write.loading';
  }
  if (!draft.enable) {
    return 'alert.setting.preview.evidence.write.disabled';
  }
  return `alert.setting.preview.evidence.write.enabled.${contract}`;
}

function alertSettingFieldHelp(t: Translator, label: string, key: string) {
  return {
    ariaLabel: t('alert.setting.field.help-aria', { field: label }),
    body: t(`alert.setting.field.${key}.help`),
    impact: t(`alert.setting.field.${key}.impact`)
  };
}

function alertSettingTypeHelp(t: Translator, label: string, key: AlertSettingCreateKind) {
  return {
    ariaLabel: t('alert.setting.create.type.help-aria', { type: label }),
    body: t(`alert.setting.create.${key}.help`),
    impact: t(`alert.setting.create.${key}.impact`)
  };
}

function AlertSettingCreateTypeHelp({
  typeKey,
  help
}: {
  typeKey: AlertSettingCreateKind;
  help: ReturnType<typeof alertSettingTypeHelp>;
}) {
  return (
    <AlertAuthoringInlineHelp
      id={`alert-setting-create-${typeKey}-type-help`}
      label={help.ariaLabel}
      body={help.body}
      impact={help.impact}
      data-alert-setting-create-type-help-key={typeKey}
    />
  );
}

function AlertSettingCreateFieldTitle({
  row,
  label,
  required,
  requirement,
  inputMode,
  t,
  help
}: {
  row: string;
  label: string;
  required?: boolean;
  requirement: AlertSettingCreateFieldRequirement;
  inputMode: AlertSettingCreateFieldInputMode;
  t: Translator;
  help: {
    body: React.ReactNode;
    impact: React.ReactNode;
    ariaLabel: string;
  };
}) {
  return (
    <span
      data-alert-setting-create-field-title={row}
      className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] font-semibold text-[#a9b0bb]"
    >
      <span>
        {label}
        {required ? <AlertAuthoringRequiredMark /> : null}
      </span>
      <AlertAuthoringInlineHelp
        id={`alert-setting-create-${row}-help`}
        label={help.ariaLabel}
        body={help.body}
        impact={help.impact}
        data-alert-setting-create-field-help={row}
      />
      <span
        data-alert-setting-create-field-requirement={requirement}
        className="rounded-[2px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
      >
        {t(`alert.setting.field.requirement.${requirement}`)}
      </span>
      <span
        data-alert-setting-create-field-input-mode={inputMode}
        className="rounded-[2px] bg-[#141922] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#9ba7bc]"
      >
        {t(`alert.setting.field.input-mode.${inputMode}`)}
      </span>
    </span>
  );
}

function AlertSettingCreateFieldStack({
  asLabel = false,
  row,
  label,
  required,
  requirement,
  inputMode,
  t,
  help,
  children
}: {
  asLabel?: boolean;
  row: string;
  label: string;
  required?: boolean;
  requirement: AlertSettingCreateFieldRequirement;
  inputMode: AlertSettingCreateFieldInputMode;
  t: Translator;
  help: {
    body: React.ReactNode;
    impact: React.ReactNode;
    ariaLabel: string;
  };
  children: React.ReactNode;
}) {
  const content = (
    <>
      <AlertSettingCreateFieldTitle
        row={row}
        label={label}
        required={required}
        requirement={requirement}
        inputMode={inputMode}
        t={t}
        help={help}
      />
      {children}
    </>
  );
  const className = 'grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]';
  if (asLabel) {
    return (
      <label data-alert-setting-create-field-row={row} className={className}>
        {content}
      </label>
    );
  }
  return (
    <div data-alert-setting-create-field-row={row} className={className}>
      {content}
    </div>
  );
}

export function buildAlertSettingCreatePayload(draft: AlertSettingCreateDraft): AlertSettingCreatePayload {
  const payload: AlertSettingCreatePayload = {
    name: draft.name.trim(),
    type: `${draft.kind}_${draft.dataType}`,
    datasource: resolveAlertSettingCreateDatasource(draft.kind, draft.dataType),
    expr: draft.expr.trim(),
    template: draft.template.trim(),
    labels: parseLabels(draft.labelsText),
    annotations: {},
    enable: draft.enable,
    period: parseNumber(draft.period, 300),
    times: parseNumber(draft.times, 3),
    priority: parseNumber(draft.priority, 2)
  };
  if (typeof draft.id === 'number') {
    payload.id = draft.id;
  }
  return payload;
}

function hasReadyExecutor(status: DatasourceStatusPayload | undefined) {
  if (!status || status.code !== 0) return false;
  const data = status.data || {};
  return Boolean(data.hasPromqlExecutor ?? data.promql ?? data.sql ?? data.ready ?? Object.keys(data).length === 0);
}

function nextDraftValue(draft: AlertSettingCreateDraft, patch: Partial<AlertSettingCreateDraft>) {
  const next = { ...draft, ...patch };
  if (next.kind === 'realtime' && next.dataType === 'trace') {
    next.dataType = 'metric';
  }
  if (patch.kind || patch.dataType) {
    next.datasource = resolveAlertSettingCreateDatasource(next.kind, next.dataType);
  }
  return next;
}

function hasCreateDraftChanges(draft: AlertSettingCreateDraft) {
  return Boolean(
    draft.name.trim()
      || draft.expr.trim()
      || draft.template.trim()
      || draft.labelsText.trim()
      || draft.dataType !== 'metric'
      || draft.enable !== true
      || draft.period !== '300'
      || draft.times !== '3'
      || draft.priority !== '2'
  );
}

export function AlertSettingCreateDialog({
  t,
  open,
  mode,
  datasourceStatus,
  draft,
  submitting,
  onClose,
  onSelectType,
  onDraftChange,
  onBackToType,
  onSubmit,
  onPreview,
  evidenceReturnHref,
  saveFeedback,
  previewFeedback,
  previewing = false,
  intent = 'create'
}: {
  t: Translator;
  open: boolean;
  mode: AlertSettingCreateMode;
  intent?: AlertSettingCreateIntent;
  datasourceStatus?: DatasourceStatusPayload;
  draft: AlertSettingCreateDraft;
  submitting: boolean;
  onClose: () => void;
  onSelectType: (kind: AlertSettingCreateKind) => void;
  onDraftChange: (draft: AlertSettingCreateDraft) => void;
  onBackToType: () => void;
  onSubmit: (payload: AlertSettingCreatePayload) => Promise<void> | void;
  onPreview?: (payload: AlertSettingCreatePayload) => Promise<void> | void;
  evidenceReturnHref?: string;
  saveFeedback?: AlertSettingCreateSaveFeedback | null;
  previewFeedback?: AlertSettingCreatePreviewFeedback | null;
  previewing?: boolean;
}) {
  const [validationIssues, setValidationIssues] = React.useState<AlertSettingCreateValidationIssue[]>([]);
  const [initialEditPayload, setInitialEditPayload] = React.useState<{ key: string; value: string } | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const realtimeTypeButtonRef = React.useRef<HTMLButtonElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const expressionEditorRef = React.useRef<HTMLDivElement>(null);
  const templateEditorRef = React.useRef<HTMLDivElement>(null);
  const periodicAvailable = hasReadyExecutor(datasourceStatus);
  const capabilityStatus = periodicAvailable ? 'realtime-ready-periodic-ready' : 'realtime-ready-periodic-blocked';
  const isTypeMode = mode === 'type';
  const editBaselineKey =
    open && intent === 'edit' && mode === 'authoring' && typeof draft.id === 'number'
      ? String(draft.id)
      : null;
  const currentPayloadFingerprint = React.useMemo(
    () => serializeAlertSettingCreatePayload(buildAlertSettingCreatePayload(draft)),
    [draft]
  );
  const isUnchangedEdit = Boolean(
    editBaselineKey
      && initialEditPayload?.key === editBaselineKey
      && initialEditPayload.value === currentPayloadFingerprint
  );
  const shouldConfirmDiscard = Boolean(
    mode === 'authoring'
      && !submitting
      && (
        (intent === 'edit' && !isUnchangedEdit)
        || (intent === 'create' && hasCreateDraftChanges(draft))
      )
  );
  const title = isTypeMode
    ? t('alert.setting.create.title.type')
    : intent === 'edit'
      ? draft.kind === 'periodic'
        ? t('alert.setting.create.title.edit-periodic')
        : t('alert.setting.create.title.edit-realtime')
      : draft.kind === 'periodic'
        ? t('alert.setting.create.title.create-periodic')
        : t('alert.setting.create.title.create-realtime');
  const expressionLabel = t('alert.setting.expr');
  const contentLabel = t('alert.setting.content');
  const nameLabel = t('alert.setting.name');
  const typeLabel = t('alert.setting.type');
  const labelsLabel = t('alert.setting.bind-labels');
  const periodLabel = t('alert.setting.period');
  const timesLabel = t('alert.setting.times');
  const priorityLabel = t('alert.setting.priority');
  const enableLabel = t('alert.setting.enable');
  const realtimeTypeHelp = alertSettingTypeHelp(t, t('alert.setting.create.realtime.title'), 'realtime');
  const periodicTypeHelp = alertSettingTypeHelp(t, t('alert.setting.create.periodic.title'), 'periodic');

  React.useEffect(() => {
    if (!open) {
      setValidationIssues([]);
      setDiscardDialogOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'type') {
      realtimeTypeButtonRef.current?.focus();
      return;
    }
    nameInputRef.current?.focus();
  }, [mode, open]);

  React.useEffect(() => {
    if (!editBaselineKey) {
      setInitialEditPayload(null);
      return;
    }
    setInitialEditPayload(current => (
      current?.key === editBaselineKey
        ? current
        : { key: editBaselineKey, value: currentPayloadFingerprint }
    ));
  }, [currentPayloadFingerprint, editBaselineKey]);

  const previewBlockReason =
    !previewing && draft.enable && (previewFeedback?.contract === 'failed' || previewFeedback?.contract === 'unsupported')
      ? `${previewFeedback.contract}-preview-enabled`
      : undefined;

  function updateDraft(patch: Partial<AlertSettingCreateDraft>) {
    const nextDraft = nextDraftValue(draft, patch);
    setValidationIssues(currentIssues =>
      currentIssues.filter(issue => !isAlertSettingCreateFieldValid(nextDraft, issue.field))
    );
    onDraftChange(nextDraft);
  }

  function validateDraft() {
    const nextIssues = buildAlertSettingCreateValidation(t, draft);
    setValidationIssues(nextIssues);
    return nextIssues;
  }

  function focusCodeEditor(container: HTMLDivElement | null) {
    const target = container?.querySelector<HTMLElement>('[contenteditable="true"], [role="textbox"], textarea');
    if (target) {
      target.focus();
      return;
    }
    container?.focus();
  }

  function focusValidationField(field: AlertSettingCreateValidationField) {
    switch (field) {
      case 'name':
        nameInputRef.current?.focus();
        return;
      case 'expr':
        focusCodeEditor(expressionEditorRef.current);
        return;
      case 'template':
        focusCodeEditor(templateEditorRef.current);
        return;
    }
  }

  function focusFirstValidationIssue(issues: AlertSettingCreateValidationIssue[]) {
    const firstIssue = issues[0];
    if (!firstIssue) return;
    window.setTimeout(() => focusValidationField(firstIssue.field), 0);
  }

  async function submit() {
    const issues = validateDraft();
    if (issues.length > 0) {
      focusFirstValidationIssue(issues);
      return;
    }
    if (isUnchangedEdit) {
      setValidationIssues([]);
      return;
    }
    if (previewBlockReason) {
      setValidationIssues([]);
      return;
    }
    setValidationIssues([]);
    await onSubmit(buildAlertSettingCreatePayload(draft));
  }

  async function preview() {
    const issues = validateDraft();
    if (issues.length > 0) {
      focusFirstValidationIssue(issues);
      return;
    }
    setValidationIssues([]);
    await onPreview?.(buildAlertSettingCreatePayload(draft));
  }

  function requestClose() {
    if (shouldConfirmDiscard) {
      setDiscardDialogOpen(true);
      return;
    }
    onClose();
  }

  function validationIssueFor(field: AlertSettingCreateValidationField) {
    return validationIssues.find(issue => issue.field === field);
  }

  function validationErrorId(field: AlertSettingCreateValidationField) {
    return `alert-setting-create-${field}-validation`;
  }

  const previewEvidenceContract: AlertSettingCreatePreviewEvidenceContract | null = previewing
    ? 'loading'
    : previewFeedback?.contract ?? null;
  const previewEvidenceTone = previewEvidenceContract ? resolvePreviewEvidenceTone(previewEvidenceContract) : 'neutral';
  const previewEvidenceTitle = previewEvidenceContract === 'loading'
    ? t('alert.setting.preview.loading.title')
    : previewFeedback?.title;
  const previewEvidenceDataDescription = previewEvidenceContract === 'loading'
    ? t('alert.setting.preview.loading.description')
    : previewEvidenceContract === 'failed'
      ? t('alert.setting.preview.evidence.data.failed')
      : previewFeedback?.description || (previewEvidenceContract ? t(`alert.setting.preview.evidence.data.${previewEvidenceContract}`) : '');
  const previewEvidenceSummaryDescription =
    previewEvidenceContract === 'failed' && previewFeedback?.description
      ? t('alert.setting.preview.evidence.data.failed')
      : previewEvidenceDataDescription;
  const previewEvidenceWriteImpact = previewEvidenceContract
    ? t(resolvePreviewEvidenceWriteImpactKey(previewEvidenceContract, draft))
    : '';
  const previewEvidenceRows = previewFeedback?.rows ?? [];
  const previewEvidenceTotalRows = previewFeedback?.totalRows ?? previewEvidenceRows.length;
  const previewEvidenceSampleLimit = previewFeedback?.sampleLimit ?? 3;
  const previewEvidenceOverflow = Math.max(0, previewEvidenceTotalRows - previewEvidenceRows.length);
  const previewEvidenceDotClassName = previewEvidenceContract
    ? resolvePreviewEvidenceDotClassName(previewEvidenceContract)
    : 'bg-[#858d9a]';
  const showPreviewEvidenceGap = Boolean(!previewEvidenceContract && onPreview && draft.enable);
  const saveDisabledReason = isUnchangedEdit
    ? 'unchanged-edit'
    : previewBlockReason;

  const footer = isTypeMode ? (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="default"
        data-alert-setting-command-action="type-cancel"
        onClick={requestClose}
      >
        {t('common.button.cancel')}
      </Button>
    </div>
  ) : (
    <div className="flex justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="default"
          data-alert-setting-command-action="back-to-type"
          onClick={onBackToType}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('alert.setting.create.back-type')}
        </Button>
        {evidenceReturnHref ? (
          <a
            data-alert-setting-editor-return="evidence-context"
            data-alert-setting-command-action="return-to-evidence"
            href={evidenceReturnHref}
            className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-[#eef4ff]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('alert.rule.evidence.return')}
          </a>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="default"
          data-alert-setting-command-action="cancel"
          data-alert-setting-unsaved-cancel-trigger={shouldConfirmDiscard ? 'dirty' : 'clean'}
          onClick={requestClose}
        >
          {t('common.button.cancel')}
        </Button>
        {onPreview ? (
          <Button
            type="button"
            variant="default"
            disabled={submitting || previewing}
            data-alert-setting-command-action="preview"
            data-alert-setting-preview-action="true"
            data-alert-setting-preview-action-owner="hertzbeat-ui-button"
            onClick={preview}
          >
            <SearchCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {previewing ? t('alert.setting.preview.loading') : t('alert.setting.preview.action')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          disabled={submitting || isUnchangedEdit || Boolean(previewBlockReason)}
          data-alert-setting-command-action="save"
          data-alert-setting-save-action="true"
          data-alert-setting-save-dirty={intent === 'edit' ? (isUnchangedEdit ? 'unchanged' : 'changed') : undefined}
          data-alert-setting-save-disabled-reason={saveDisabledReason}
          data-alert-setting-save-preview-state={previewEvidenceContract || undefined}
          title={previewBlockReason ? previewEvidenceWriteImpact : undefined}
          onClick={submit}
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {submitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <OverlayDialog
        open={open}
        title={title}
        kicker={t('alert.setting.create.kicker')}
        footer={footer}
        onClose={requestClose}
        maxWidthClassName={isTypeMode ? 'max-w-2xl' : 'max-w-4xl'}
        contentClassName={isTypeMode ? 'space-y-3' : 'space-y-4'}
      >
      {isTypeMode ? (
        <>
          <div
            data-alert-setting-create-capability-status={capabilityStatus}
            data-alert-setting-create-capability-owner="threshold-type-gate"
            data-alert-setting-create-periodic-capability={periodicAvailable ? 'ready' : 'blocked'}
            className="border-y border-[#202633] bg-[#0b0f15] px-3 py-2 text-[11px] leading-5 text-[#98a2b3]"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                data-alert-setting-create-capability-item="realtime"
                className="inline-flex items-center gap-1.5 text-[#dbe4f0]"
              >
                <Activity className="h-3 w-3" aria-hidden="true" />
                {t('alert.setting.capability.realtime.ready')}
              </span>
              <span
                data-alert-setting-create-capability-item="periodic"
                className="inline-flex items-center gap-1.5"
              >
                <Timer className="h-3 w-3" aria-hidden="true" />
                {periodicAvailable
                  ? t('alert.setting.capability.periodic.ready')
                  : t('alert.setting.capability.periodic.blocked')}
              </span>
            </div>
          </div>
          <div
            data-alert-setting-create-dialog="type-select"
            data-alert-setting-create-type-selector="step-list"
            className="grid border-y border-[#202633]"
          >
            <div className="relative">
              <button
                ref={realtimeTypeButtonRef}
                type="button"
                data-alert-setting-command-action="select-realtime"
                data-alert-setting-create-option="realtime"
                data-alert-setting-create-type-step="realtime"
                data-alert-setting-create-type-visual="step-row-no-card"
                className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3 py-3 pr-10 text-left transition hover:bg-[#101722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8]"
                onClick={() => onSelectType('realtime')}
              >
                <span
                  data-alert-setting-create-type-icon="borderless"
                  className="mt-0.5 inline-flex h-5 w-5 items-center justify-center border-0 bg-transparent text-[#dbe4f0]"
                >
                  <Activity className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] font-semibold text-[#f5f7fb]">
                    {t('alert.setting.create.realtime.title')}
                  </span>
                  <span className="block text-[12px] leading-5 text-[#8f99ab]">
                    {t('alert.setting.create.realtime.copy')}
                  </span>
                </span>
              </button>
              <span className="absolute right-3 top-3">
                <AlertSettingCreateTypeHelp typeKey="realtime" help={realtimeTypeHelp} />
              </span>
            </div>
            <div className="relative border-t border-[#202633]">
              <button
                type="button"
                disabled={!periodicAvailable}
                data-alert-setting-command-action="select-periodic"
                data-alert-setting-create-option="periodic"
                data-alert-setting-create-type-step="periodic"
                data-alert-setting-create-type-visual="step-row-no-card"
                data-alert-setting-create-periodic-disabled={String(!periodicAvailable)}
                className={`grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-3 py-3 pr-10 text-left transition hover:bg-[#101722] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e74f8] disabled:pointer-events-none ${periodicAvailable ? '' : 'opacity-45'}`}
                onClick={() => onSelectType('periodic')}
              >
                <span
                  data-alert-setting-create-type-icon="borderless"
                  className="mt-0.5 inline-flex h-5 w-5 items-center justify-center border-0 bg-transparent text-[#dbe4f0]"
                >
                  <Timer className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] font-semibold text-[#f5f7fb]">
                    {t('alert.setting.create.periodic.title')}
                  </span>
                  <span className="block text-[12px] leading-5 text-[#8f99ab]">
                    {t('alert.setting.create.periodic.copy')}
                  </span>
                </span>
              </button>
              <span className="absolute right-3 top-3">
                <AlertSettingCreateTypeHelp typeKey="periodic" help={periodicTypeHelp} />
              </span>
            </div>
          </div>
        </>
      ) : (
        <div
          data-alert-setting-create-dialog="authoring"
          data-alert-setting-create-layout="single-column"
          data-alert-setting-create-change-state={intent === 'edit' ? (isUnchangedEdit ? 'unchanged' : 'changed') : undefined}
          className="space-y-3"
        >
          {validationIssues.length > 0 ? (
            <div
              role="alert"
              aria-live="polite"
              data-alert-setting-create-validation="hertzbeat-ui-validation-feedback"
              data-alert-setting-create-validation-count={String(validationIssues.length)}
              className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
            >
              <div>{t('alert.setting.validation.summary.title', { count: validationIssues.length })}</div>
              <ul
                data-alert-setting-create-validation-list="required-fields"
                className="mt-1 list-disc space-y-0.5 pl-4 font-medium"
              >
                {validationIssues.map(issue => (
                  <li key={issue.field} data-alert-setting-create-validation-item={issue.field}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {saveFeedback ? (
            <HzInlineFeedback
              tone={saveFeedback.tone}
              title={saveFeedback.title}
              description={saveFeedback.description}
              variant="embedded"
              data-alert-setting-save-failure="angular-notify-title-detail"
              data-alert-setting-save-failure-intent={saveFeedback.contract}
              data-alert-setting-save-failure-owner="hertzbeat-ui-inline-feedback"
              data-alert-setting-save-feedback-title={
                saveFeedback.contract === 'edit' ? 'common.notify.edit-fail' : 'common.notify.new-fail'
              }
              data-alert-setting-save-feedback-detail="backend-message"
            />
          ) : null}
          {isUnchangedEdit ? (
            <HzInlineFeedback
              tone="info"
              title={t('alert.setting.edit.no-changes')}
              variant="embedded"
              data-alert-setting-edit-no-changes="save-disabled"
              data-alert-setting-edit-no-changes-owner="hertzbeat-ui-inline-feedback"
            />
          ) : null}
          {showPreviewEvidenceGap ? (
            <HzInlineFeedback
              tone="warning"
              title={t('alert.setting.preview.missing-enabled.title')}
              description={t('alert.setting.preview.missing-enabled.description')}
              variant="embedded"
              data-alert-setting-preview-missing-enabled="save-without-sample-evidence"
              data-alert-setting-preview-missing-enabled-owner="hertzbeat-ui-inline-feedback"
            />
          ) : null}
          {previewEvidenceContract ? (
            <div
              data-alert-setting-preview-evidence={previewEvidenceContract}
              data-alert-setting-preview-evidence-owner="hertzbeat-ui-evidence-chain"
              data-alert-setting-preview-evidence-rows-count={String(previewEvidenceRows.length)}
              data-alert-setting-preview-evidence-rows-total={String(previewEvidenceTotalRows)}
              data-alert-setting-preview-evidence-rows-rendered={String(previewEvidenceRows.length)}
              data-alert-setting-preview-evidence-rows-limit={String(previewEvidenceSampleLimit)}
              data-alert-setting-preview-evidence-rows-overflow={previewEvidenceOverflow > 0 ? String(previewEvidenceOverflow) : undefined}
              className="space-y-2 rounded-[3px] border border-[#2b3039] bg-[#0b0d12] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#202633] pb-2">
                <div className="inline-flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[#f5f7fb]">
                  <span
                    data-alert-setting-preview-evidence-dot={previewEvidenceContract}
                    className={`h-2 w-2 rounded-full ${previewEvidenceDotClassName}`}
                  />
                  {t('alert.setting.preview.evidence.title')}
                </div>
                <span
                  data-alert-setting-preview-evidence-status={previewEvidenceContract}
                  className="rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-0.5 text-[11px] font-semibold text-[#dbe4f0]"
                >
                  {previewEvidenceTitle}
                </span>
              </div>
              <HzInlineFeedback
                tone={previewEvidenceTone}
                title={previewEvidenceTitle || ''}
                description={previewEvidenceSummaryDescription}
                variant="embedded"
                data-alert-setting-preview-feedback={previewEvidenceContract}
                data-alert-setting-preview-feedback-owner="hertzbeat-ui-inline-feedback"
                data-alert-setting-preview-feedback-message={previewEvidenceContract}
                data-alert-setting-preview-feedback-message-owner="hertzbeat-ui-inline-feedback"
              />
              <div
                data-alert-setting-preview-evidence-steps="state-data-write"
                className="grid gap-2 text-[12px] sm:grid-cols-3"
              >
                <div data-alert-setting-preview-evidence-step="state" className="grid gap-1 rounded-[3px] border border-[#202633] bg-[#101217] p-2">
                  <span className="text-[10px] font-semibold uppercase text-[#858d9a]">
                    {t('alert.setting.preview.evidence.state-label')}
                  </span>
                  <span className="min-w-0 break-words font-semibold text-[#dbe4f0]">
                    {t(`alert.setting.preview.evidence.state.${previewEvidenceContract}`)}
                  </span>
                </div>
                <div data-alert-setting-preview-evidence-step="data" className="grid gap-1 rounded-[3px] border border-[#202633] bg-[#101217] p-2">
                  <span className="text-[10px] font-semibold uppercase text-[#858d9a]">
                    {t('alert.setting.preview.evidence.data-label')}
                  </span>
                  <span className="min-w-0 break-words leading-5 text-[#dbe4f0]">{previewEvidenceDataDescription}</span>
                </div>
                <div data-alert-setting-preview-evidence-step="write" className="grid gap-1 rounded-[3px] border border-[#202633] bg-[#101217] p-2">
                  <span className="text-[10px] font-semibold uppercase text-[#858d9a]">
                    {t('alert.setting.preview.evidence.write-label')}
                  </span>
                  <span className="min-w-0 break-words leading-5 text-[#dbe4f0]">{previewEvidenceWriteImpact}</span>
                </div>
              </div>
              {previewEvidenceRows.length ? (
                <div
                  data-alert-setting-preview-rows="query-result-sample"
                  data-alert-setting-preview-rows-owner="hertzbeat-ui-inline-preview"
                  aria-label={t('alert.setting.preview.evidence.samples-label')}
                  className="overflow-hidden rounded-[3px] border border-[#2b3039] bg-[#0b0d12]"
                >
                  {previewEvidenceRows.slice(0, previewEvidenceSampleLimit).map((row, index) => (
                    <div
                      key={index}
                      data-alert-setting-preview-row={String(index)}
                      className="grid gap-1 border-t border-[#202633] px-3 py-2 text-[12px] first:border-t-0"
                    >
                      {Object.entries(row).slice(0, 6).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[minmax(88px,140px)_1fr] gap-2">
                          <span className="truncate font-semibold text-[#8f99ab]">{key}</span>
                          <span className="truncate text-[#dbe4f0]">{formatPreviewValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {previewBlockReason ? (
            <HzInlineFeedback
              tone={previewEvidenceContract === 'failed' ? 'critical' : 'warning'}
              title={t('alert.setting.preview.save-blocked.title')}
              description={previewEvidenceWriteImpact}
              variant="embedded"
              data-alert-setting-preview-save-blocked={previewBlockReason}
              data-alert-setting-preview-save-blocked-owner="hertzbeat-ui-inline-feedback"
              data-alert-setting-preview-save-blocked-state={previewEvidenceContract || undefined}
            />
          ) : null}
          <AlertSettingCreateFieldStack
            asLabel
            row="name"
            label={nameLabel}
            required
            requirement="required"
            inputMode="manual"
            t={t}
            help={alertSettingFieldHelp(t, nameLabel, 'name')}
          >
            <Input
              ref={nameInputRef}
              name="alert_define_name"
              value={draft.name}
              disabled={submitting}
              aria-invalid={validationIssueFor('name') ? 'true' : undefined}
              aria-describedby={validationIssueFor('name') ? validationErrorId('name') : undefined}
              data-alert-setting-create-field-invalid={validationIssueFor('name') ? 'true' : undefined}
              className="h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#dbe4f0] outline-none placeholder:text-[#858d9a] focus:border-[#4e74f8]"
              onChange={event => updateDraft({ name: event.target.value })}
            />
            {validationIssueFor('name') ? (
              <span
                id={validationErrorId('name')}
                data-alert-setting-create-field-error="name"
                className="text-[11px] font-semibold leading-4 text-[#ffb4c1]"
              >
                {validationIssueFor('name')?.message}
              </span>
            ) : null}
          </AlertSettingCreateFieldStack>
          <AlertSettingCreateFieldStack
            row="type"
            label={typeLabel}
            required
            requirement="required"
            inputMode="selection"
            t={t}
            help={alertSettingFieldHelp(t, typeLabel, draft.kind === 'periodic' ? 'periodic-type' : 'realtime-type')}
          >
            <SegmentedControl
              name="alert_define_data_type"
              value={draft.dataType}
              options={[
                { value: 'metric', label: t('alert.setting.data-type.metric') },
                { value: 'log', label: t('alert.setting.data-type.log') },
                ...(draft.kind === 'periodic' ? [{ value: 'trace', label: t('alert.setting.data-type.trace') }] : [])
              ]}
              onChange={value => updateDraft({ dataType: value as AlertSettingCreateDataType })}
            />
          </AlertSettingCreateFieldStack>
          <AlertSettingCreateFieldStack
            asLabel
            row="expression"
            label={expressionLabel}
            required
            requirement="required"
            inputMode="manual"
            t={t}
            help={alertSettingFieldHelp(t, expressionLabel, draft.kind === 'periodic' ? 'periodic-expression' : 'realtime-expression')}
          >
            <div ref={expressionEditorRef} data-alert-setting-create-field-focus-target="expr">
              <HzCodeEditor
                name="alert_define_expr"
                value={draft.expr}
                language="javascript"
                minHeight="96px"
                readOnly={submitting}
                ariaLabel={expressionLabel}
                aria-invalid={validationIssueFor('expr') ? 'true' : undefined}
                aria-describedby={validationIssueFor('expr') ? validationErrorId('expr') : undefined}
                data-alert-setting-create-field-invalid={validationIssueFor('expr') ? 'true' : undefined}
                tabIndex={-1}
                data-alert-setting-code-editor="threshold-expression"
                onChange={value => updateDraft({ expr: value })}
              />
            </div>
            {validationIssueFor('expr') ? (
              <span
                id={validationErrorId('expr')}
                data-alert-setting-create-field-error="expr"
                className="text-[11px] font-semibold leading-4 text-[#ffb4c1]"
              >
                {validationIssueFor('expr')?.message}
              </span>
            ) : null}
          </AlertSettingCreateFieldStack>
          <AlertSettingCreateFieldStack
            asLabel
            row="content"
            label={contentLabel}
            required
            requirement="required"
            inputMode="manual"
            t={t}
            help={alertSettingFieldHelp(t, contentLabel, 'content')}
          >
            <div ref={templateEditorRef} data-alert-setting-create-field-focus-target="template">
              <HzCodeEditor
                name="alert_define_template"
                value={draft.template}
                language="text"
                minHeight="72px"
                readOnly={submitting}
                ariaLabel={contentLabel}
                aria-invalid={validationIssueFor('template') ? 'true' : undefined}
                aria-describedby={validationIssueFor('template') ? validationErrorId('template') : undefined}
                data-alert-setting-create-field-invalid={validationIssueFor('template') ? 'true' : undefined}
                tabIndex={-1}
                data-alert-setting-code-editor="alert-template"
                onChange={value => updateDraft({ template: value })}
              />
            </div>
            {validationIssueFor('template') ? (
              <span
                id={validationErrorId('template')}
                data-alert-setting-create-field-error="template"
                className="text-[11px] font-semibold leading-4 text-[#ffb4c1]"
              >
                {validationIssueFor('template')?.message}
              </span>
            ) : null}
          </AlertSettingCreateFieldStack>
          <AlertSettingCreateFieldStack
            row="labels"
            label={labelsLabel}
            requirement="optional"
            inputMode="manual"
            t={t}
            help={alertSettingFieldHelp(t, labelsLabel, 'labels')}
          >
            <LabelRecordInput
              name="alert_define_labels"
              value={draft.labelsText}
              disabled={submitting}
              keyPlaceholder={t('alert.setting.label.key')}
              valuePlaceholder={t('alert.setting.label.value')}
              addLabel={t('alert.setting.label.add')}
              removeLabel={t('alert.setting.label.remove')}
              onValueChange={labelsText => updateDraft({ labelsText })}
            />
          </AlertSettingCreateFieldStack>
          <div className="grid gap-3 sm:grid-cols-3">
            {draft.kind === 'periodic' ? (
              <AlertSettingCreateFieldStack
                asLabel
                row="period"
                label={periodLabel}
                required
                requirement="required"
                inputMode="manual"
                t={t}
                help={alertSettingFieldHelp(t, periodLabel, 'period')}
              >
                <NumberStepper
                  name="alert_define_period"
                  min={1}
                  step={30}
                  value={draft.period}
                  disabled={submitting}
                  decrementLabel={`${t('common.decrement')} ${periodLabel}`}
                  incrementLabel={`${t('common.increment')} ${periodLabel}`}
                  onValueChange={period => updateDraft({ period })}
                />
              </AlertSettingCreateFieldStack>
            ) : null}
            <AlertSettingCreateFieldStack
              asLabel
              row="times"
              label={timesLabel}
              required
              requirement="required"
              inputMode="manual"
              t={t}
              help={alertSettingFieldHelp(t, timesLabel, 'times')}
            >
              <NumberStepper
                name="alert_define_times"
                min={1}
                value={draft.times}
                disabled={submitting}
                decrementLabel={`${t('common.decrement')} ${timesLabel}`}
                incrementLabel={`${t('common.increment')} ${timesLabel}`}
                onValueChange={times => updateDraft({ times })}
              />
            </AlertSettingCreateFieldStack>
            <AlertSettingCreateFieldStack
              asLabel
              row="priority"
              label={priorityLabel}
              required
              requirement="required"
              inputMode="manual"
              t={t}
              help={alertSettingFieldHelp(t, priorityLabel, 'priority')}
            >
              <NumberStepper
                name="alert_define_priority"
                min={0}
                max={3}
                value={draft.priority}
                disabled={submitting}
                decrementLabel={`${t('common.decrement')} ${priorityLabel}`}
                incrementLabel={`${t('common.increment')} ${priorityLabel}`}
                onValueChange={priority => updateDraft({ priority })}
              />
            </AlertSettingCreateFieldStack>
          </div>
          <AlertSettingCreateFieldStack
            row="enable"
            label={enableLabel}
            required
            requirement="required"
            inputMode="selection"
            t={t}
            help={alertSettingFieldHelp(t, enableLabel, 'enable')}
          >
            <Checkbox
              name="alert_define_enable"
              checked={draft.enable}
              disabled={submitting}
              aria-label={enableLabel}
              onChange={event => updateDraft({ enable: event.target.checked })}
            />
          </AlertSettingCreateFieldStack>
          <div className="flex items-center gap-2 rounded-[4px] border border-[#2b3039] bg-[#0d0f14] px-3 py-2 text-[12px] text-[#8f99ab]">
            <BarChart3 className="h-3.5 w-3.5 text-[#a9b7cc]" aria-hidden="true" />
            {t('alert.setting.datasource.ready')}
          </div>
        </div>
      )}
      </OverlayDialog>
      <div
        data-alert-setting-unsaved-cancel="hertzbeat-ui-confirm-dialog"
        data-alert-setting-unsaved-cancel-state={discardDialogOpen ? 'open' : 'closed'}
      >
        <HzConfirmDialog
          open={discardDialogOpen}
          tone="warning"
          title={t('alert.setting.unsaved-cancel.title')}
          kicker={t('alert.setting.unsaved-cancel.kicker')}
          cancelLabel={t('alert.setting.unsaved-cancel.keep-editing')}
          confirmLabel={t('alert.setting.unsaved-cancel.discard')}
          onClose={() => setDiscardDialogOpen(false)}
          onConfirm={() => {
            setDiscardDialogOpen(false);
            onClose();
          }}
          data-alert-setting-unsaved-cancel-dialog="hertzbeat-ui-confirm-dialog"
          cancelButtonProps={
            {
              type: 'button',
              'data-alert-setting-unsaved-cancel-keep-editing': 'true'
            } as React.ComponentProps<typeof HzConfirmDialog>['cancelButtonProps']
          }
          confirmButtonProps={
            {
              type: 'button',
              'data-alert-setting-unsaved-cancel-confirm': 'true'
            } as React.ComponentProps<typeof HzConfirmDialog>['confirmButtonProps']
          }
        >
          <p data-alert-setting-unsaved-cancel-copy="true">
            {t('alert.setting.unsaved-cancel.copy')}
          </p>
        </HzConfirmDialog>
      </div>
    </>
  );
}
