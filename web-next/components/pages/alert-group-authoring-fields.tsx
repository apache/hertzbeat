'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { NumberStepper } from '../ui/number-stepper';
import { TagInput } from '../ui/tag-input';
import { AlertAuthoringFieldLabel } from './alert-authoring-primitives';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../../lib/alert-label-options';
import type { AlertGroupFormDraft } from '../../lib/alert-group/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

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
          <span>{t('alert.group-converge.name')}</span>
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
            label={t('common.enable')}
            onChange={event => onDraftChange({ ...draft, enable: event.target.checked })}
          />
        </div>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.group-converge.group-labels')}</span>
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
          <span>{t('alert.group-converge.group-wait')}</span>
          <NumberStepper
            name="alert_group_wait"
            min="0"
            step="30"
            value={draft.groupWait}
            onValueChange={value => onDraftChange({ ...draft, groupWait: value })}
          />
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.group-converge.group-interval')}</span>
          <NumberStepper
            name="alert_group_interval"
            min="0"
            step="300"
            value={draft.groupInterval}
            onValueChange={value => onDraftChange({ ...draft, groupInterval: value })}
          />
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.group-converge.repeat-interval')}</span>
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
