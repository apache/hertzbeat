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
  AlertAuthoringPanel,
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
          <span>{t('alert.inhibit.name')}</span>
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
            label={t('common.enable')}
            onChange={event => onDraftChange({ ...draft, enable: event.target.checked })}
          />
        </div>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.inhibit.source_labels')}</span>
          <div data-alert-inhibit-source-label-selector="searchable-label-record">
            <LabelRecordInput
              name="inhibit_source_labels"
              value={draft.sourceLabelsText}
              labelOptions={effectiveLabelOptions}
              keyPlaceholder="标签名"
              valuePlaceholder="标签值"
              onValueChange={value => onDraftChange({ ...draft, sourceLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.inhibit.target_labels')}</span>
          <div data-alert-inhibit-target-label-selector="searchable-label-record">
            <LabelRecordInput
              name="inhibit_target_labels"
              value={draft.targetLabelsText}
              labelOptions={effectiveLabelOptions}
              keyPlaceholder="标签名"
              valuePlaceholder="标签值"
              onValueChange={value => onDraftChange({ ...draft, targetLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
        <AlertAuthoringFieldLabel>
          <span>{t('alert.inhibit.equal_labels')}</span>
          <div data-alert-inhibit-equal-label-selector="searchable-tags">
            <TagInput
              name="inhibit_equal_labels"
              value={draft.equalLabelsText}
              suggestions={effectiveLabelOptions.keys}
              placeholder="alertname, severity, service"
              onValueChange={value => onDraftChange({ ...draft, equalLabelsText: value })}
            />
          </div>
        </AlertAuthoringFieldLabel>
      </div>
    </div>
  );
}
