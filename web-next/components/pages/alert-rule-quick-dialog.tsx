'use client';

import React from 'react';
import { Button } from '../ui/button';
import { OverlayDialog } from '../workbench/overlay-dialog';
import { AlertAuthoringCallout, AlertAuthoringPanel } from './alert-authoring-primitives';
import type { GroupAlert } from '../../lib/types';
import type { AlertQueryState } from '../../lib/alert-manage/query-state';
import {
  buildAlertRulePreviewLabelsFromText,
  buildAlertRuleQuickDialogModel,
  buildAlertRuleWorkspaceHref,
  clearAlertInhibitEqualLabels,
  clearAlertInhibitTarget,
  copyAlertInhibitSourceToTarget,
  dropSeverityFromAlertInhibitTarget,
  type AlertRuleDialogMode
} from '../../lib/alert-manage/view-model';
import { AlertSilenceAuthoringFields } from './alert-silence-authoring-fields';
import { AlertInhibitAuthoringFields } from './alert-inhibit-authoring-fields';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertRuleQuickDialogProps = {
  t: Translator;
  mode: AlertRuleDialogMode;
  group: GroupAlert;
  query: AlertQueryState;
  onClose: () => void;
};

export function AlertRuleQuickDialog({
  t,
  mode,
  group,
  query,
  onClose
}: AlertRuleQuickDialogProps) {
  const model = React.useMemo(() => buildAlertRuleQuickDialogModel(group, mode, query, t), [group, mode, query, t]);
  const [silenceDraft, setSilenceDraft] = React.useState(model.silenceDraft);
  const [inhibitDraft, setInhibitDraft] = React.useState(model.inhibitDraft);

  React.useEffect(() => {
    setSilenceDraft(model.silenceDraft);
    setInhibitDraft(model.inhibitDraft);
  }, [model]);

  const workspaceHref = buildAlertRuleWorkspaceHref(mode, query, group);
  const workspaceLabel = t('alert.center.open-full-workspace');
  const silencePreviewLabels = buildAlertRulePreviewLabelsFromText(silenceDraft?.labelsText || '');
  const inhibitSourcePreviewLabels = buildAlertRulePreviewLabelsFromText(inhibitDraft?.sourceLabelsText || '');
  const inhibitTargetPreviewLabels = buildAlertRulePreviewLabelsFromText(inhibitDraft?.targetLabelsText || '');

  return (
    <OverlayDialog
      open
      title={model.title}
      kicker={model.summary}
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      contentClassName="space-y-4"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <a
            href={workspaceHref}
            data-alert-rule-dialog-full-workspace={mode}
            className="inline-flex h-8 items-center rounded-[2px] border border-[var(--ops-primary)] bg-[var(--ops-primary)] px-3 text-[12px] font-semibold text-white transition-colors hover:brightness-[1.04]"
          >
            {workspaceLabel}
          </a>
        </div>
      }
    >
      <div data-alert-rule-dialog={mode} className="space-y-4">
        <AlertAuthoringPanel heading={t('entity.response.context.title')}>
          <div className="text-[18px] font-semibold text-[var(--ops-text-primary)]">{model.entityTitle}</div>
          <div className="text-sm leading-6 text-[var(--ops-text-secondary)]">{model.authoringTitle}</div>
          <div className="text-sm leading-6 text-[var(--ops-text-tertiary)]">{model.authoringCopy}</div>
        </AlertAuthoringPanel>

        {model.warning ? (
          <AlertAuthoringCallout data-alert-rule-warning="true" warning={model.warning} className="text-sm leading-6" />
        ) : null}

        {mode === 'silence' ? (
          <>
            {silenceDraft ? (
              <AlertSilenceAuthoringFields
                t={t}
                draft={silenceDraft}
                onDraftChange={nextDraft => setSilenceDraft(nextDraft)}
                mode="dialog"
                prefillTitle={model.authoringTitle}
                prefillCopy={model.authoringCopy}
                prefillWarning={model.warning}
                previewLabels={silencePreviewLabels}
              />
            ) : null}
          </>
        ) : null}

        {mode === 'inhibit' && inhibitDraft ? (
          <>
            <AlertInhibitAuthoringFields
              t={t}
              draft={inhibitDraft}
              onDraftChange={nextDraft => setInhibitDraft(nextDraft)}
              mode="dialog"
              prefillTitle={model.authoringTitle}
              prefillCopy={model.authoringCopy}
              prefillWarning={model.warning}
              sourcePreviewLabels={inhibitSourcePreviewLabels}
              targetPreviewLabels={inhibitTargetPreviewLabels}
              onCopySourceToTarget={() => setInhibitDraft(prev => (prev ? copyAlertInhibitSourceToTarget(prev) : prev))}
              onDropSeverity={() => setInhibitDraft(prev => (prev ? dropSeverityFromAlertInhibitTarget(prev) : prev))}
              onClearTarget={() => setInhibitDraft(prev => (prev ? clearAlertInhibitTarget(prev) : prev))}
              onClearEqual={() => setInhibitDraft(prev => (prev ? clearAlertInhibitEqualLabels(prev) : prev))}
            />
          </>
        ) : null}
      </div>
    </OverlayDialog>
  );
}
