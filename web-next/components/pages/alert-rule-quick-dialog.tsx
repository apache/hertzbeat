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
import type { AlertSilenceFormDraft } from '../../lib/alert-silence/controller';
import type { AlertInhibitFormDraft } from '../../lib/alert-inhibit/controller';
import { validateAlertSilenceForm } from '../../lib/alert-silence/view-model';
import { validateAlertInhibitForm } from '../../lib/alert-inhibit/view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertRuleQuickDialogProps = {
  t: Translator;
  mode: AlertRuleDialogMode;
  group: GroupAlert;
  query: AlertQueryState;
  onClose: () => void;
  onSubmit?: (mode: AlertRuleDialogMode, draft: AlertSilenceFormDraft | AlertInhibitFormDraft) => Promise<void>;
};

export function AlertRuleQuickDialog({
  t,
  mode,
  group,
  query,
  onClose,
  onSubmit
}: AlertRuleQuickDialogProps) {
  const model = React.useMemo(() => buildAlertRuleQuickDialogModel(group, mode, query, t), [group, mode, query, t]);
  const [silenceDraft, setSilenceDraft] = React.useState(model.silenceDraft);
  const [inhibitDraft, setInhibitDraft] = React.useState(model.inhibitDraft);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSilenceDraft(model.silenceDraft);
    setInhibitDraft(model.inhibitDraft);
  }, [model]);

  const workspaceHref = buildAlertRuleWorkspaceHref(mode, query, group);
  const workspaceLabel = t('alert.center.open-full-workspace');
  const silencePreviewLabels = buildAlertRulePreviewLabelsFromText(silenceDraft?.labelsText || '');
  const inhibitSourcePreviewLabels = buildAlertRulePreviewLabelsFromText(inhibitDraft?.sourceLabelsText || '');
  const inhibitTargetPreviewLabels = buildAlertRulePreviewLabelsFromText(inhibitDraft?.targetLabelsText || '');

  async function handleSubmit() {
    if (!onSubmit || submitting) return;
    const nextDraft = mode === 'silence' ? silenceDraft : inhibitDraft;
    if (!nextDraft) return;
    const validationError =
      mode === 'silence'
        ? validateAlertSilenceForm(nextDraft as AlertSilenceFormDraft, t)
        : validateAlertInhibitForm(nextDraft as AlertInhibitFormDraft, t);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(mode, nextDraft);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('common.save-failed'));
    } finally {
      setSubmitting(false);
    }
  }

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
          <Button
            size="sm"
            variant="subtle"
            data-alert-rule-dialog-command-action="cancel"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <a
            href={workspaceHref}
            data-alert-rule-dialog-command-action="full-workspace"
            data-alert-rule-dialog-full-workspace={mode}
            className="inline-flex h-8 items-center rounded-[2px] border border-[var(--ops-primary)] bg-[var(--ops-primary)] px-3 text-[12px] font-semibold text-white transition-colors hover:brightness-[1.04]"
          >
            {workspaceLabel}
          </a>
          {onSubmit ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              data-alert-rule-dialog-command-action="submit"
              data-alert-rule-dialog-submit={mode}
              data-alert-rule-dialog-submit-owner="alert-center-quick-dialog"
            >
              {submitting ? t('common.saving') : t('common.save')}
            </Button>
          ) : null}
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

        {submitError ? (
          <AlertAuthoringCallout
            data-alert-rule-submit-error="true"
            tone="error"
            warning={submitError}
            className="text-sm leading-6"
          />
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
