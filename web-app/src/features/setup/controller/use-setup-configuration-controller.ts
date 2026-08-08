/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { configureSetup, loadSetupOperation, validateSetupSection } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import type { SetupStatus } from '../model/setup-contract';
import {
  clearConfigurationSecrets,
  createConfigurationRequest,
  createExternalApplyResumeDraft,
  createSetupConfigurationDraft,
  createValidationRequest,
  type SetupConfigurationDraft,
  type SetupValidationSection
} from '../model/setup-configuration';
import {
  configurationWorkflowState,
  type SetupRequestFailure,
  type SetupSectionValidation,
  type SetupSectionValidationMap
} from '../model/setup-configuration-state';
import type { SetupConfigurationAcknowledgement } from '../model/setup-responses';
import { classifySetupRequestFailure } from './setup-request-failure';
import { setupQueryKeys } from './setup-query-keys';
import { useSetupConfigurationExport } from './use-setup-configuration-export';
import { useSetupStatusConvergence } from './use-setup-status-convergence';
import { useSetupWriteBoundary } from './use-setup-write-boundary';

export function useSetupConfigurationController(status: SetupStatus, refetchStatus: () => Promise<unknown> | void) {
  const [draft, setDraft] = useState(() =>
    status.phase === 'external_apply_required' ? createExternalApplyResumeDraft() : createSetupConfigurationDraft()
  );
  const [validation, setValidation] = useState<SetupSectionValidationMap>(initialValidation);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailure, setSubmitFailure] = useState<SetupRequestFailure | null>(null);
  const [acknowledgement, setAcknowledgement] = useState<SetupConfigurationAcknowledgement | null>(null);
  const [configurationExpectedPhase, setConfigurationExpectedPhase] = useState(status.phase);
  const validating = useRef(new Set<SetupValidationSection>());
  const submitPending = useRef(false);
  const startWrite = useSetupWriteBoundary();
  const operationId = acknowledgement?.operationId ?? status.operationId;
  const operationQuery = useSetupOperation(operationId);

  useSetupStatusConvergence(acknowledgement, status.phase, operationQuery.data ?? null, refetchStatus);
  const exportController = useSetupConfigurationExport(
    acknowledgement,
    draft,
    configurationExpectedPhase,
    status.applyMode,
    startWrite
  );

  const updateManagement = useCallback((value: Partial<SetupConfigurationDraft['managementDatabase']>) => {
    setDraft(current => ({ ...current, managementDatabase: { ...current.managementDatabase, ...value } }));
    setValidation(current => ({ ...current, metadata_database: { state: 'idle' } }));
  }, []);
  const updateTelemetry = useCallback((value: Partial<SetupConfigurationDraft['telemetryStore']>) => {
    setDraft(current => ({ ...current, telemetryStore: { ...current.telemetryStore, ...value } }));
    setValidation(current => ({ ...current, telemetry_store: { state: 'idle' } }));
  }, []);
  const validateSection = useCallback(
    async (section: SetupValidationSection) => {
      if (validating.current.has(section)) return;
      const write = startWrite();
      validating.current.add(section);
      setValidation(current => ({ ...current, [section]: { state: 'checking' } }));
      try {
        const result = await validateSetupSection(createValidationRequest(section, draft), write.signal);
        if (!write.signal.aborted) {
          setValidation(current => ({ ...current, [section]: { state: 'complete', ...result } }));
        }
      } catch (error) {
        if (!write.signal.aborted) setValidation(current => ({ ...current, [section]: validationFailure(error) }));
      } finally {
        write.release();
        validating.current.delete(section);
      }
    },
    [draft, startWrite]
  );
  const submit = useCallback(async () => {
    if (submitPending.current || !bothSectionsValid(validation)) return;
    const write = startWrite();
    submitPending.current = true;
    setSubmitting(true);
    setSubmitFailure(null);
    try {
      const ack = await configureSetup(createConfigurationRequest(status.phase, status.applyMode, draft), write.signal);
      if (!write.signal.aborted) {
        setAcknowledgement(ack);
        setConfigurationExpectedPhase(status.phase);
        if (ack.state !== 'awaiting_external_apply') setDraft(current => clearConfigurationSecrets(current));
      }
    } catch (error) {
      if (!write.signal.aborted) setSubmitFailure(classifySetupRequestFailure(error));
    } finally {
      write.release();
      submitPending.current = false;
      if (!write.signal.aborted) setSubmitting(false);
    }
  }, [draft, startWrite, status.applyMode, status.phase, validation]);

  const phase = effectivePhase(status, acknowledgement);
  const operationFailure = operationQuery.error ? classifySetupRequestFailure(operationQuery.error) : null;
  return {
    acknowledgement,
    applyMode: status.applyMode,
    draft,
    workflowState: configurationWorkflowState(
      phase,
      operationQuery.data ?? null,
      operationFailure?.failure ?? null,
      needsExternalResume(status, acknowledgement)
    ),
    canSubmit: bothSectionsValid(validation) && !submitting,
    submitting,
    submitFailure,
    validation,
    updateManagement,
    updateTelemetry,
    validateSection,
    submit,
    ...exportController
  };
}

function useSetupOperation(operationId: string | null) {
  return useQuery({
    queryKey: setupQueryKeys.operation(operationId ?? 'inactive'),
    queryFn: ({ signal }) => loadOperation(operationId, signal),
    enabled: Boolean(operationId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: query => operationPollInterval(query.state.data)
  });
}

function effectivePhase(status: SetupStatus, acknowledgement: SetupConfigurationAcknowledgement | null) {
  return status.phase === 'configuration_required' ? (acknowledgement?.phase ?? status.phase) : status.phase;
}

function needsExternalResume(status: SetupStatus, acknowledgement: SetupConfigurationAcknowledgement | null) {
  return status.phase === 'external_apply_required' && acknowledgement === null;
}

const initialValidation: SetupSectionValidationMap = {
  metadata_database: { state: 'idle' },
  telemetry_store: { state: 'idle' }
};

function validationFailure(error: unknown): SetupSectionValidation {
  return { state: 'failed', ...classifySetupRequestFailure(error) };
}

function bothSectionsValid(validation: SetupSectionValidationMap) {
  return isValid(validation.metadata_database) && isValid(validation.telemetry_store);
}

function isValid(validation: SetupSectionValidation) {
  return validation.state === 'complete' && validation.valid;
}

function operationPollInterval(operation: { state: string; nextPollAfterMillis: number } | undefined) {
  if (!operation) return false;
  if (
    operation.state === 'succeeded' ||
    operation.state === 'failed' ||
    operation.state === 'rolled_back' ||
    operation.state === 'awaiting_restart' ||
    operation.state === 'awaiting_external_apply'
  ) {
    return false;
  }
  return operation.nextPollAfterMillis;
}

function loadOperation(operationId: string | null, signal: AbortSignal) {
  if (!operationId) throw new SetupContractError();
  return loadSetupOperation(operationId, signal);
}
