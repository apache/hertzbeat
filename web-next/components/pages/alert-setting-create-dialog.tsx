'use client';

import React from 'react';
import { Activity, ArrowLeft, BarChart3, RotateCcw, Save, SearchCheck, Timer } from 'lucide-react';
import { HzInlineFeedback, type HzStatusTone } from '@hertzbeat/ui';
import type { DatasourceStatusPayload } from '../../lib/alert-setting/controller';
import type { AlertDefine } from '../../lib/types';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { HzCodeEditor } from '../ui/hz-code-editor';
import { Input } from '../ui/input';
import { LabelRecordInput } from '../ui/label-record-input';
import { NumberStepper } from '../ui/number-stepper';
import { SegmentedControl } from '../ui/segmented-control';
import { OverlayDialog } from '../workbench/overlay-dialog';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type AlertSettingCreateKind = 'realtime' | 'periodic';
export type AlertSettingCreateDataType = 'metric' | 'log' | 'trace';
export type AlertSettingCreateMode = 'type' | 'authoring';
export type AlertSettingCreateIntent = 'create' | 'edit';
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
  contract: 'success' | 'empty' | 'unsupported' | 'failed';
};

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

export function createDefaultAlertSettingDraft(
  kind: AlertSettingCreateKind = 'realtime',
  previous?: Partial<AlertSettingCreateDraft>
): AlertSettingCreateDraft {
  const dataType = kind === 'periodic' ? previous?.dataType || 'metric' : previous?.dataType === 'log' ? 'log' : 'metric';
  return {
    name: previous?.name || '',
    kind,
    dataType,
    datasource: previous?.datasource || 'promql',
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

export function buildAlertSettingCreatePayload(draft: AlertSettingCreateDraft): AlertSettingCreatePayload {
  const payload: AlertSettingCreatePayload = {
    name: draft.name.trim(),
    type: `${draft.kind}_${draft.dataType}`,
    datasource: draft.datasource || 'promql',
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
  return next;
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
  const [validationMessage, setValidationMessage] = React.useState('');
  const periodicAvailable = hasReadyExecutor(datasourceStatus);
  const isTypeMode = mode === 'type';
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

  React.useEffect(() => {
    if (!open) {
      setValidationMessage('');
    }
  }, [open]);

  function updateDraft(patch: Partial<AlertSettingCreateDraft>) {
    onDraftChange(nextDraftValue(draft, patch));
  }

  async function submit() {
    if (!draft.name.trim()) {
      setValidationMessage(t('alert.setting.validation.name'));
      return;
    }
    if (!draft.expr.trim()) {
      setValidationMessage(t('alert.setting.validation.expr'));
      return;
    }
    if (!draft.template.trim()) {
      setValidationMessage(t('alert.setting.validation.template'));
      return;
    }
    setValidationMessage('');
    await onSubmit(buildAlertSettingCreatePayload(draft));
  }

  async function preview() {
    if (!draft.expr.trim()) {
      setValidationMessage(t('alert.setting.validation.expr'));
      return;
    }
    setValidationMessage('');
    await onPreview?.(buildAlertSettingCreatePayload(draft));
  }

  const footer = isTypeMode ? (
    <div className="flex justify-end">
      <Button type="button" variant="default" onClick={onClose}>
        {t('common.button.cancel')}
      </Button>
    </div>
  ) : (
    <div className="flex justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" onClick={onBackToType}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('alert.setting.create.back-type')}
        </Button>
        {evidenceReturnHref ? (
          <a
            data-alert-setting-editor-return="evidence-context"
            href={evidenceReturnHref}
            className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('alert.rule.evidence.return')}
          </a>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="default" onClick={onClose}>
          {t('common.button.cancel')}
        </Button>
        {onPreview ? (
          <Button
            type="button"
            variant="default"
            disabled={submitting || previewing}
            data-alert-setting-preview-action="true"
            data-alert-setting-preview-action-owner="hertzbeat-ui-button"
            onClick={preview}
          >
            <SearchCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {previewing ? t('alert.setting.preview.loading') : t('alert.setting.preview.action')}
          </Button>
        ) : null}
        <Button type="button" variant="primary" disabled={submitting} onClick={submit}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {submitting ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  );

  return (
    <OverlayDialog
      open={open}
      title={title}
      kicker={t('alert.setting.create.kicker')}
      footer={footer}
      onClose={onClose}
      maxWidthClassName={isTypeMode ? 'max-w-2xl' : 'max-w-4xl'}
      contentClassName={isTypeMode ? 'space-y-3' : 'space-y-4'}
    >
      {isTypeMode ? (
        <div data-alert-setting-create-dialog="type-select" className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-alert-setting-create-option="realtime"
            className="group min-h-[132px] rounded-[4px] border border-[#2b3039] bg-[#101217] p-4 text-left transition hover:border-[#4e74f8] hover:bg-[#151b28]"
            onClick={() => onSelectType('realtime')}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#334056] bg-[#0d1017] text-[#dbe4f0]">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-4 block text-[15px] font-semibold text-[#f5f7fb]">
              {t('alert.setting.create.realtime.title')}
            </span>
            <span className="mt-2 block text-[12px] leading-5 text-[#8f99ab]">
              {t('alert.setting.create.realtime.copy')}
            </span>
          </button>
          <button
            type="button"
            disabled={!periodicAvailable}
            data-alert-setting-create-option="periodic"
            data-alert-setting-create-periodic-disabled={String(!periodicAvailable)}
            className="group min-h-[132px] rounded-[4px] border border-[#2b3039] bg-[#101217] p-4 text-left transition hover:border-[#4e74f8] hover:bg-[#151b28] disabled:pointer-events-none disabled:opacity-45"
            onClick={() => onSelectType('periodic')}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#334056] bg-[#0d1017] text-[#dbe4f0]">
              <Timer className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-4 block text-[15px] font-semibold text-[#f5f7fb]">
              {t('alert.setting.create.periodic.title')}
            </span>
            <span className="mt-2 block text-[12px] leading-5 text-[#8f99ab]">
              {t('alert.setting.create.periodic.copy')}
            </span>
          </button>
        </div>
      ) : (
        <div
          data-alert-setting-create-dialog="authoring"
          data-alert-setting-create-layout="single-column"
          className="space-y-3"
        >
          {validationMessage ? (
            <div
              role="alert"
              aria-live="polite"
              data-alert-setting-create-validation="hertzbeat-ui-validation-feedback"
              className="rounded-[3px] border border-[#6f3141] bg-[#1b1014] px-3 py-2 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
            >
              {validationMessage}
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
          {previewFeedback ? (
            <div
              data-alert-setting-preview-feedback={previewFeedback.contract}
              data-alert-setting-preview-feedback-owner="hertzbeat-ui-inline-feedback"
              className="space-y-2"
            >
              <HzInlineFeedback
                tone={previewFeedback.tone}
                title={previewFeedback.title}
                description={previewFeedback.description}
                variant="embedded"
                data-alert-setting-preview-feedback-message={previewFeedback.contract}
                data-alert-setting-preview-feedback-message-owner="hertzbeat-ui-inline-feedback"
              />
              {previewFeedback.rows?.length ? (
                <div
                  data-alert-setting-preview-rows="query-result-sample"
                  data-alert-setting-preview-rows-owner="hertzbeat-ui-inline-preview"
                  className="overflow-hidden rounded-[3px] border border-[#2b3039] bg-[#0b0d12]"
                >
                  {previewFeedback.rows.slice(0, 3).map((row, index) => (
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
          <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
            {t('alert.setting.name')}
            <Input
              name="alert_define_name"
              value={draft.name}
              disabled={submitting}
              className="h-8 rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] text-[#dbe4f0] outline-none placeholder:text-[#858d9a] focus:border-[#4e74f8]"
              onChange={event => updateDraft({ name: event.target.value })}
            />
          </label>
          <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
            {t('alert.setting.type')}
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
          </div>
          <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
            {expressionLabel}
            <HzCodeEditor
              name="alert_define_expr"
              value={draft.expr}
              language="javascript"
              minHeight="96px"
              readOnly={submitting}
              ariaLabel={expressionLabel}
              data-alert-setting-code-editor="threshold-expression"
              onChange={value => updateDraft({ expr: value })}
            />
          </label>
          <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
            {contentLabel}
            <HzCodeEditor
              name="alert_define_template"
              value={draft.template}
              language="text"
              minHeight="72px"
              readOnly={submitting}
              ariaLabel={contentLabel}
              data-alert-setting-code-editor="alert-template"
              onChange={value => updateDraft({ template: value })}
            />
          </label>
          <div className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
            {t('alert.setting.bind-labels')}
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
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {draft.kind === 'periodic' ? (
              <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
                {t('alert.setting.period')}
                <NumberStepper
                  name="alert_define_period"
                  min={1}
                  step={30}
                  value={draft.period}
                  disabled={submitting}
                  decrementLabel={t('common.decrement')}
                  incrementLabel={t('common.increment')}
                  onValueChange={period => updateDraft({ period })}
                />
              </label>
            ) : null}
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
              {t('alert.setting.times')}
              <NumberStepper
                name="alert_define_times"
                min={1}
                value={draft.times}
                disabled={submitting}
                decrementLabel={t('common.decrement')}
                incrementLabel={t('common.increment')}
                onValueChange={times => updateDraft({ times })}
              />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#a9b0bb]">
              {t('alert.setting.priority')}
              <NumberStepper
                name="alert_define_priority"
                min={0}
                max={3}
                value={draft.priority}
                disabled={submitting}
                decrementLabel={t('common.decrement')}
                incrementLabel={t('common.increment')}
                onValueChange={priority => updateDraft({ priority })}
              />
            </label>
          </div>
          <Checkbox
            name="alert_define_enable"
            checked={draft.enable}
            disabled={submitting}
            label={t('alert.setting.enable')}
            onChange={event => updateDraft({ enable: event.target.checked })}
          />
          <div className="flex items-center gap-2 rounded-[4px] border border-[#2b3039] bg-[#0d0f14] px-3 py-2 text-[12px] text-[#8f99ab]">
            <BarChart3 className="h-3.5 w-3.5 text-[#a9b7cc]" aria-hidden="true" />
            {t('alert.setting.datasource.ready')}
          </div>
        </div>
      )}
    </OverlayDialog>
  );
}
