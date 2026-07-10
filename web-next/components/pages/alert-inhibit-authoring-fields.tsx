'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { LabelRecordInput } from '../ui/label-record-input';
import { TagInput } from '../ui/tag-input';
import {
  AlertAuthoringActionPill,
  AlertAuthoringCallout,
  AlertAuthoringFieldLabel,
  AlertAuthoringInlineHelp,
  AlertAuthoringPanel,
  AlertAuthoringRequiredMark,
  AlertAuthoringValuePill
} from './alert-authoring-primitives';
import type { AlertInhibitFormDraft } from '../../lib/alert-inhibit/controller';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../../lib/alert-label-options';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type PreviewLabel = { key: string; value: string };

type AlertInhibitAuthoringFieldsProps = {
  t: Translator;
  draft: AlertInhibitFormDraft;
  onDraftChange: (nextDraft: AlertInhibitFormDraft) => void;
  mode?: 'workspace' | 'dialog';
  prefillTitle?: string;
  prefillCopy?: string;
  prefillWarning?: string | null;
  sourcePreviewLabels?: PreviewLabel[];
  targetPreviewLabels?: PreviewLabel[];
  onCopySourceToTarget?: () => void;
  onDropSeverity?: () => void;
  onClearTarget?: () => void;
  onClearEqual?: () => void;
  labelOptions?: AlertLabelOptions;
};

type AlertInhibitFieldRequirement = 'required' | 'optional';
type AlertInhibitFieldInputMode = 'manual' | 'selection' | 'manual-or-selection';

function AlertInhibitFieldTitle({
  t,
  field,
  label,
  requirement,
  inputMode
}: {
  t: Translator;
  field: string;
  label: string;
  requirement: AlertInhibitFieldRequirement;
  inputMode: AlertInhibitFieldInputMode;
}) {
  return (
    <span
      data-alert-inhibit-authoring-field-title={field}
      className="inline-flex min-w-0 flex-wrap items-center gap-1.5"
    >
      <span>
        {label}
        {requirement === 'required' ? <AlertAuthoringRequiredMark /> : null}
      </span>
      <AlertAuthoringInlineHelp
        id={`alert-inhibit-authoring-${field}-help`}
        label={t('alert.inhibit.field.help-aria', { field: label })}
        body={t(`alert.inhibit.field.${field}.help`)}
        impact={t(`alert.inhibit.field.${field}.impact`)}
        data-alert-inhibit-authoring-field-help={field}
      />
      <span
        data-alert-inhibit-authoring-field-requirement={requirement}
        className="rounded-[4px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
      >
        {t(`alert.inhibit.field.requirement.${requirement}`)}
      </span>
      <span
        data-alert-inhibit-authoring-field-input-mode={inputMode}
        className="rounded-[4px] bg-[#141922] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#9ba7bc]"
      >
        {t(`alert.inhibit.field.input-mode.${inputMode}`)}
      </span>
    </span>
  );
}

export function AlertInhibitAuthoringFields({
  t,
  draft,
  onDraftChange,
  mode = 'workspace',
  prefillTitle,
  prefillCopy,
  prefillWarning,
  sourcePreviewLabels = [],
  targetPreviewLabels = [],
  onCopySourceToTarget,
  onDropSeverity,
  onClearTarget,
  onClearEqual,
  labelOptions
}: AlertInhibitAuthoringFieldsProps) {
  const showShortcuts = Boolean(onCopySourceToTarget || onDropSeverity || onClearTarget || onClearEqual);
  const effectiveLabelOptions = labelOptions ?? DEFAULT_ALERT_LABEL_OPTIONS;

  return (
    <div
      data-alert-inhibit-authoring-fields={mode}
      data-alert-inhibit-authoring-layout="single-column"
      className="space-y-4"
    >
      <AlertAuthoringCallout
        title={prefillTitle}
        copy={prefillCopy}
        warning={prefillWarning}
        data-alert-inhibit-prefill-warning={prefillWarning ? 'true' : undefined}
      />

      {showShortcuts ? (
        <div className="flex flex-wrap gap-2">
          <AlertAuthoringActionPill className="h-8 px-3" onClick={onCopySourceToTarget}>
            {t('entity.alert.workbench.inhibit.shortcut.copy-source')}
          </AlertAuthoringActionPill>
          <AlertAuthoringActionPill className="h-8 px-3" onClick={onDropSeverity}>
            {t('entity.alert.workbench.inhibit.shortcut.drop-severity')}
          </AlertAuthoringActionPill>
          <AlertAuthoringActionPill className="h-8 px-3" onClick={onClearTarget}>
            {t('entity.alert.workbench.inhibit.shortcut.clear-target')}
          </AlertAuthoringActionPill>
          <AlertAuthoringActionPill className="h-8 px-3" onClick={onClearEqual}>
            {t('entity.alert.workbench.inhibit.shortcut.clear-equal')}
          </AlertAuthoringActionPill>
        </div>
      ) : null}

      {sourcePreviewLabels.length > 0 ? (
        <AlertAuthoringPanel heading={t('alert.inhibit.source_labels')}>
          <div className="flex flex-wrap gap-2">
            {sourcePreviewLabels.map(label => (
              <AlertAuthoringValuePill
                key={`source-${label.key}-${label.value}`}
              >
                {label.key}:{label.value}
              </AlertAuthoringValuePill>
            ))}
          </div>
        </AlertAuthoringPanel>
      ) : null}

      {targetPreviewLabels.length > 0 ? (
        <AlertAuthoringPanel heading={t('alert.inhibit.target_labels')}>
          <div className="flex flex-wrap gap-2">
            {targetPreviewLabels.map(label => (
              <AlertAuthoringValuePill
                key={`target-${label.key}-${label.value}`}
              >
                {label.key}:{label.value}
              </AlertAuthoringValuePill>
            ))}
          </div>
        </AlertAuthoringPanel>
      ) : null}

      <div data-alert-inhibit-authoring-form="single-column" className="space-y-3">
        <AlertAuthoringFieldLabel>
          <AlertInhibitFieldTitle
            t={t}
            field="name"
            label={t('alert.inhibit.name')}
            requirement="required"
            inputMode="manual"
          />
          <Input
            name="inhibit_name"
            value={draft.name}
            onChange={event => onDraftChange({ ...draft, name: event.target.value })}
          />
        </AlertAuthoringFieldLabel>
        <div
          data-alert-inhibit-enable-row="inline-control"
          className="flex min-h-8 items-center text-sm text-[var(--ops-text-secondary)]"
        >
          <Checkbox
            name="inhibit_enable"
            checked={draft.enable}
            label={(
              <AlertInhibitFieldTitle
                t={t}
                field="enable"
                label={t('common.enable')}
                requirement="required"
                inputMode="selection"
              />
            )}
            onChange={event => onDraftChange({ ...draft, enable: event.target.checked })}
          />
        </div>
        <AlertAuthoringFieldLabel>
          <AlertInhibitFieldTitle
            t={t}
            field="source-labels"
            label={t('alert.inhibit.source_labels')}
            requirement="required"
            inputMode="manual-or-selection"
          />
          <div data-alert-inhibit-source-label-selector="searchable-label-record">
            <LabelRecordInput
              name="inhibit_source_labels"
              value={draft.sourceLabelsText}
              labelOptions={effectiveLabelOptions}
              keyPlaceholder={t('alert.inhibit.label.key.placeholder')}
              valuePlaceholder={t('alert.inhibit.label.value.placeholder')}
              onValueChange={value => onDraftChange({ ...draft, sourceLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <AlertInhibitFieldTitle
            t={t}
            field="target-labels"
            label={t('alert.inhibit.target_labels')}
            requirement="required"
            inputMode="manual-or-selection"
          />
          <div data-alert-inhibit-target-label-selector="searchable-label-record">
            <LabelRecordInput
              name="inhibit_target_labels"
              value={draft.targetLabelsText}
              labelOptions={effectiveLabelOptions}
              keyPlaceholder={t('alert.inhibit.label.key.placeholder')}
              valuePlaceholder={t('alert.inhibit.label.value.placeholder')}
              onValueChange={value => onDraftChange({ ...draft, targetLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <AlertInhibitFieldTitle
            t={t}
            field="equal-labels"
            label={t('alert.inhibit.equal_labels')}
            requirement="required"
            inputMode="manual-or-selection"
          />
          <div data-alert-inhibit-equal-label-selector="searchable-tags">
            <TagInput
              name="inhibit_equal_labels"
              value={draft.equalLabelsText}
              suggestions={effectiveLabelOptions.keys}
              placeholder={t('alert.inhibit.equal.placeholder')}
              onValueChange={value => onDraftChange({ ...draft, equalLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
      </div>
    </div>
  );
}
