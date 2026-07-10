'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { NumberStepper } from '../ui/number-stepper';
import { TagInput } from '../ui/tag-input';
import { AlertAuthoringFieldLabel, AlertAuthoringInlineHelp, AlertAuthoringRequiredMark } from './alert-authoring-primitives';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../../lib/alert-label-options';
import type { AlertGroupFormDraft } from '../../lib/alert-group/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type AlertGroupFieldRequirement = 'required' | 'optional';
type AlertGroupFieldInputMode = 'manual' | 'selection' | 'manual-or-selection';

type AlertGroupAuthoringFieldsProps = {
  t: Translator;
  draft: AlertGroupFormDraft;
  onDraftChange: (nextDraft: AlertGroupFormDraft) => void;
  mode?: 'workspace' | 'dialog';
  labelOptions?: AlertLabelOptions;
  sourceGroupLabelsText?: string;
  sourceSignal?: string;
};

function normalizeGroupLabelsText(value?: string | null) {
  return value?.trim() || '';
}

function getSourceGroupPreviewStatus(sourceGroupLabelsText: string, draftGroupLabelsText: string) {
  if (!sourceGroupLabelsText) {
    return 'none';
  }
  if (draftGroupLabelsText === sourceGroupLabelsText) {
    return 'prefilled';
  }
  if (draftGroupLabelsText.startsWith(`${sourceGroupLabelsText},`)) {
    return 'extended';
  }
  return 'edited';
}

function AlertGroupFieldTitle({
  t,
  field,
  requirement,
  inputMode,
  children
}: {
  t: Translator;
  field: string;
  requirement: AlertGroupFieldRequirement;
  inputMode: AlertGroupFieldInputMode;
  children: React.ReactNode;
}) {
  return (
    <span
      data-alert-group-authoring-field-title={field}
      className="inline-flex min-w-0 flex-wrap items-center gap-1.5"
    >
      <span>
        {children}
        {requirement === 'required' ? <AlertAuthoringRequiredMark /> : null}
      </span>
      <AlertAuthoringInlineHelp
        id={`alert-group-authoring-${field}-help`}
        label={t('alert.group.field.help-aria', { field: String(children) })}
        body={t(`alert.group.field.${field}.help`)}
        impact={t(`alert.group.field.${field}.impact`)}
        data-alert-group-authoring-field-help={field}
      />
      <span
        data-alert-group-authoring-field-requirement={requirement}
        className="rounded-[2px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
      >
        {t(`alert.group.field.requirement.${requirement}`)}
      </span>
      <span
        data-alert-group-authoring-field-input-mode={inputMode}
        className="rounded-[2px] bg-[#141922] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#9ba7bc]"
      >
        {t(`alert.group.field.input-mode.${inputMode}`)}
      </span>
    </span>
  );
}

export function AlertGroupAuthoringFields({
  t,
  draft,
  onDraftChange,
  mode = 'workspace',
  labelOptions,
  sourceGroupLabelsText,
  sourceSignal
}: AlertGroupAuthoringFieldsProps) {
  const effectiveLabelOptions = labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;
  const normalizedSourceGroupLabelsText = normalizeGroupLabelsText(sourceGroupLabelsText);
  const sourceGroupPreviewStatus = getSourceGroupPreviewStatus(
    normalizedSourceGroupLabelsText,
    normalizeGroupLabelsText(draft.groupLabelsText)
  );

  return (
    <div
      data-alert-group-authoring-fields={mode}
      data-alert-group-authoring-layout="single-column"
      className="space-y-4"
    >
      <div data-alert-group-authoring-form="single-column" className="space-y-3">
        <AlertAuthoringFieldLabel>
          <AlertGroupFieldTitle t={t} field="name" requirement="required" inputMode="manual">
            {t('alert.group-converge.name')}
          </AlertGroupFieldTitle>
          <Input
            name="alert_group_name"
            value={draft.name}
            onChange={event => onDraftChange({ ...draft, name: event.target.value })}
          />
        </AlertAuthoringFieldLabel>
        <div
          data-alert-group-enable-row="inline-control"
          className="flex min-h-8 items-center text-sm text-[var(--ops-text-secondary)]"
        >
          <Checkbox
            name="alert_group_enable"
            checked={draft.enable}
            label={(
              <AlertGroupFieldTitle t={t} field="enable" requirement="required" inputMode="selection">
                {t('common.enable')}
              </AlertGroupFieldTitle>
            )}
            onChange={event => onDraftChange({ ...draft, enable: event.target.checked })}
          />
        </div>
        <AlertAuthoringFieldLabel>
          <AlertGroupFieldTitle t={t} field="group-labels" requirement="required" inputMode="manual-or-selection">
            {t('alert.group-converge.group-labels')}
          </AlertGroupFieldTitle>
          <div
            data-alert-group-label-selector="shared-label-key-tags"
            data-alert-group-label-mode="group-by-label-keys"
          >
            <TagInput
              name="alert_group_labels"
              value={draft.groupLabelsText}
              onValueChange={value => onDraftChange({ ...draft, groupLabelsText: value })}
              placeholder={t('alert.group.labels.placeholder')}
              suggestions={effectiveLabelOptions.keys}
            />
            {normalizedSourceGroupLabelsText ? (
              <div
                data-alert-group-live-label-preview="signal-route"
                data-alert-group-live-label-preview-owner="signal-alert-handoff"
                data-alert-group-live-label-preview-status={sourceGroupPreviewStatus}
                data-alert-group-live-label-preview-signal={sourceSignal || 'context'}
                className="mt-2 rounded-[3px] border border-[#26303d] bg-[#080a0e] px-2.5 py-2"
              >
                <div className="mb-1 text-[11px] font-semibold uppercase text-[#8e99aa]">
                  {t('alert.group.preview.title')}
                </div>
                <code
                  data-alert-group-live-labels={sourceGroupPreviewStatus}
                  className="block whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#aab4c3]"
                >
                  {normalizedSourceGroupLabelsText}
                </code>
              </div>
            ) : null}
          </div>
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <AlertGroupFieldTitle t={t} field="group-wait" requirement="required" inputMode="manual">
            {t('alert.group-converge.group-wait')}
          </AlertGroupFieldTitle>
          <NumberStepper
            name="alert_group_wait"
            min="0"
            step="30"
            value={draft.groupWait}
            onValueChange={value => onDraftChange({ ...draft, groupWait: value })}
          />
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <AlertGroupFieldTitle t={t} field="group-interval" requirement="required" inputMode="manual">
            {t('alert.group-converge.group-interval')}
          </AlertGroupFieldTitle>
          <NumberStepper
            name="alert_group_interval"
            min="0"
            step="300"
            value={draft.groupInterval}
            onValueChange={value => onDraftChange({ ...draft, groupInterval: value })}
          />
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <AlertGroupFieldTitle t={t} field="repeat-interval" requirement="required" inputMode="manual">
            {t('alert.group-converge.repeat-interval')}
          </AlertGroupFieldTitle>
          <NumberStepper
            name="alert_group_repeat_interval"
            min="0"
            step="3600"
            value={draft.repeatInterval}
            onValueChange={value => onDraftChange({ ...draft, repeatInterval: value })}
          />
        </AlertAuthoringFieldLabel>
      </div>
    </div>
  );
}
