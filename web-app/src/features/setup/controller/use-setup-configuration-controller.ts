/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import type { SetupStatus } from '../model/setup-contract';
import { createExternalApplyResumeDraft, createSetupConfigurationDraft } from '../model/setup-configuration';
import { configurationWorkflowState, type SetupSectionValidationMap } from '../model/setup-configuration-state';
import type { SetupConfigurationAcknowledgement, SetupOperation } from '../model/setup-responses';
import { classifySetupRequestFailure } from './setup-request-failure';
import type { SetupStatusRefresh } from './setup-status-refresh';
import { useSetupConfigurationExport } from './use-setup-configuration-export';
import { useSetupConfigurationDraftState, useSetupConfigurationDraftUpdates } from './use-setup-configuration-draft';
import {
  configurationRequestReady,
  useSetupConfigurationOperationAuthority,
  useSetupConfigurationSubmission
} from './use-setup-configuration-lifecycle';
import { useSetupSectionValidation } from './use-setup-section-validation';
import { useSetupWriteBoundary } from './use-setup-write-boundary';

export function useSetupConfigurationController(status: SetupStatus, refetchStatus: SetupStatusRefresh) {
  const { draft, draftRef, setDraft } = useSetupConfigurationDraftState(() =>
    status.phase === 'external_apply_required' ? createExternalApplyResumeDraft() : createSetupConfigurationDraft()
  );
  const [acknowledgement, setAcknowledgement] = useState<SetupConfigurationAcknowledgement | null>(null);
  const [configurationExpectedPhase] = useState(status.phase);
  const startWrite = useSetupWriteBoundary();
  const { validation, resetSection, resetValidation, validateSection } = useSetupSectionValidation(
    draftRef,
    startWrite
  );
  const authority = useSetupConfigurationOperationAuthority({
    status,
    refetchStatus,
    acknowledgement,
    setAcknowledgement,
    setDraft,
    resetValidation
  });
  const exportController = useSetupConfigurationExport(
    acknowledgement,
    draft,
    configurationExpectedPhase,
    status.applyMode,
    startWrite
  );
  const { updateManagement, updateTelemetry } = useSetupConfigurationDraftUpdates(draftRef, setDraft, resetSection);
  const submission = useSetupConfigurationSubmission({
    status,
    refetchStatus,
    draft,
    validation,
    authority,
    startWrite,
    setDraft,
    setAcknowledgement,
    resetValidation
  });

  return {
    acknowledgement,
    applyMode: status.applyMode,
    draft,
    workflowState: controllerWorkflowState(status, acknowledgement, authority.operation, authority.operationError),
    canSubmit: configurationCanSubmit(
      validation,
      authority.authoritativeWriteAllowed,
      submission.submitting,
      authority.closed
    ),
    submitting: submission.submitting,
    submitFailure: submission.submitFailure,
    validation,
    updateManagement,
    updateTelemetry,
    validateSection,
    submit: submission.submit,
    ...exportController
  };
}

function controllerWorkflowState(
  status: SetupStatus,
  acknowledgement: SetupConfigurationAcknowledgement | null,
  operation: SetupOperation | null,
  operationError: Error | null
) {
  const operationFailure = operationError ? classifySetupRequestFailure(operationError) : null;
  return configurationWorkflowState(
    effectivePhase(status, acknowledgement),
    operation,
    operationFailure?.failure ?? null,
    needsExternalResume(status, acknowledgement)
  );
}

function configurationCanSubmit(
  validation: SetupSectionValidationMap,
  authoritativeWriteAllowed: boolean,
  submitting: boolean,
  closed: boolean
) {
  return configurationRequestReady(validation, authoritativeWriteAllowed) && !submitting && !closed;
}

function effectivePhase(status: SetupStatus, acknowledgement: SetupConfigurationAcknowledgement | null) {
  return status.phase === 'configuration_required' ? (acknowledgement?.phase ?? status.phase) : status.phase;
}

function needsExternalResume(status: SetupStatus, acknowledgement: SetupConfigurationAcknowledgement | null) {
  return status.phase === 'external_apply_required' && acknowledgement === null;
}
