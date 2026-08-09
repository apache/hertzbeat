/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import { configureSetup } from '../api/setup-api';
import type { SetupStatus } from '../model/setup-contract';
import {
  clearConfigurationSecrets,
  createConfigurationRequest,
  type SetupConfigurationDraft
} from '../model/setup-configuration';
import type { SetupRequestFailure, SetupSectionValidationMap } from '../model/setup-configuration-state';
import type { SetupConfigurationAcknowledgement, SetupOperation } from '../model/setup-responses';
import { classifySetupRequestFailure } from './setup-request-failure';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';
import { configurationSubmissionAllowed, setupWriteAuthority } from './setup-write-authority';
import { useSetupOperationLifecycle } from './use-setup-operation-lifecycle';
import { useSetupOperationQuery } from './use-setup-operation-query';
import { useSetupStatusConvergence } from './use-setup-status-convergence';
import type { SetupWriteBoundary } from './use-setup-write-boundary';
import { useSetupWriteAdmission } from './use-setup-write-admission';

export function useSetupConfigurationOperationAuthority(options: ConfigurationOperationAuthorityOptions) {
  const operationId = options.acknowledgement?.operationId ?? options.status.operationId;
  const operationQuery = useSetupOperationQuery(operationId);
  const operation = operationQuery.data ?? null;
  const authoritativeWriteAllowed = configurationWriteAllowed(options.status, operation);
  const admission = useSetupWriteAdmission(authoritativeWriteAllowed);
  const { retireFailedOperationSecrets, settleFailedOperation } = useFailedOperationRetirement(options);
  useSetupStatusConvergence(options.acknowledgement, options.status.phase, operation, options.refetchStatus);
  useSetupOperationLifecycle(
    operationId,
    operation,
    options.refetchStatus,
    retireFailedOperationSecrets,
    settleFailedOperation,
    admission.reopen
  );
  return {
    operation,
    operationError: operationQuery.error,
    authoritativeWriteAllowed,
    closed: admission.closed,
    reconcile: admission.reconcile,
    tryClose: admission.tryClose
  };
}

export function useSetupConfigurationSubmission(options: ConfigurationSubmissionOptions) {
  const [submitting, setSubmitting] = useState(false);
  const [submitFailure, setSubmitFailure] = useState<SetupRequestFailure | null>(null);
  const reconcileFailure = useConfigurationFailureReconciliation(options, setSubmitFailure);
  const submit = useCallback(async () => {
    if (!configurationRequestReady(options.validation, options.authority.authoritativeWriteAllowed)) return;
    if (!options.authority.tryClose()) return;
    const write = options.startWrite();
    setSubmitting(true);
    setSubmitFailure(null);
    try {
      const ack = await configureSetup(
        createConfigurationRequest(options.status.phase, options.status.applyMode, options.draft),
        write.signal
      );
      if (!write.signal.aborted) {
        options.setAcknowledgement(ack);
        if (ack.state !== 'awaiting_external_apply') {
          options.setDraft(current => clearConfigurationSecrets(current));
        }
      }
    } catch (error) {
      if (!write.signal.aborted) await reconcileFailure(error);
    } finally {
      write.release();
      if (!write.signal.aborted) setSubmitting(false);
    }
  }, [options, reconcileFailure]);
  return { submitting, submitFailure, submit };
}

function useConfigurationFailureReconciliation(
  options: ConfigurationSubmissionOptions,
  setSubmitFailure: Dispatch<SetStateAction<SetupRequestFailure | null>>
) {
  return useCallback(
    async (error: unknown) => {
      setSubmitFailure(classifySetupRequestFailure(error));
      const writeAuthority = setupWriteAuthority(error, 'configuration');
      if (writeAuthority === 'current') {
        options.authority.reconcile(writeAuthority);
        return;
      }
      options.setDraft(current => clearConfigurationSecrets(current));
      options.resetValidation();
      const refresh = await safeSetupStatusRefresh(options.refetchStatus);
      const writeAllowed = refresh.succeeded && configurationWriteAllowed(refresh.status, options.authority.operation);
      options.authority.reconcile(writeAuthority, writeAllowed);
    },
    [options, setSubmitFailure]
  );
}

function useFailedOperationRetirement(options: ConfigurationOperationAuthorityOptions) {
  const { resetValidation, setAcknowledgement, setDraft } = options;
  return {
    retireFailedOperationSecrets: useCallback(() => {
      setDraft(current => clearConfigurationSecrets(current));
      resetValidation();
    }, [resetValidation, setDraft]),
    settleFailedOperation: useCallback(() => setAcknowledgement(null), [setAcknowledgement])
  };
}

function configurationWriteAllowed(status: SetupStatus, operation: SetupOperation | null) {
  const operationState =
    status.operationId && operation?.operationId === status.operationId ? operation.state : undefined;
  return configurationSubmissionAllowed(status, operationState);
}

export function configurationRequestReady(validation: SetupSectionValidationMap, authoritativeWriteAllowed: boolean) {
  return (
    validation.metadata_database.state === 'complete' &&
    validation.metadata_database.valid &&
    validation.telemetry_store.state === 'complete' &&
    validation.telemetry_store.valid &&
    authoritativeWriteAllowed
  );
}

type ConfigurationOperationAuthorityOptions = {
  status: SetupStatus;
  refetchStatus: SetupStatusRefresh;
  acknowledgement: SetupConfigurationAcknowledgement | null;
  setAcknowledgement: Dispatch<SetStateAction<SetupConfigurationAcknowledgement | null>>;
  setDraft: Dispatch<SetStateAction<SetupConfigurationDraft>>;
  resetValidation: () => void;
};

type ConfigurationSubmissionOptions = {
  status: SetupStatus;
  refetchStatus: SetupStatusRefresh;
  draft: SetupConfigurationDraft;
  validation: SetupSectionValidationMap;
  authority: ReturnType<typeof useSetupConfigurationOperationAuthority>;
  startWrite: SetupWriteBoundary;
  setDraft: Dispatch<SetStateAction<SetupConfigurationDraft>>;
  setAcknowledgement: Dispatch<SetStateAction<SetupConfigurationAcknowledgement | null>>;
  resetValidation: () => void;
};
