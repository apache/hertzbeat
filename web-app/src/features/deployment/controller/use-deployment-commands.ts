/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import {
  activateMigration,
  DeploymentRequestError,
  exportMigration,
  startMigration,
  validateMigration
} from '../api/deployment-api';
import type { MigrationView, ValidationResponse } from '../model/deployment-contract';
import type { DeploymentCommandAction, DeploymentDraft, MigrationExportFormat } from '../model/deployment-workflow';
import {
  clearDeploymentSecrets,
  createMigrationExportRequest,
  createMigrationRequest,
  createMigrationValidationRequest
} from '../model/deployment-workflow';
import { deploymentWriteOutcome } from './deployment-write-outcome';
import { downloadDeploymentExport } from './deployment-download';
import { deploymentQueryKeys } from './deployment-query-keys';
import { useDeploymentWriteBoundary } from './use-deployment-write-boundary';

type Inputs = {
  draft: DeploymentDraft;
  operationId: string | null;
  queryClient: QueryClient;
  setDraft: (draft: DeploymentDraft | ((current: DeploymentDraft) => DeploymentDraft)) => void;
  setOperationId: (operationId: string | null) => void;
  refreshDeployment: () => unknown;
};

export function useDeploymentCommands(input: Inputs) {
  const executor = useCommandExecutor(input.operationId);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [exportFormat, setExportFormat] = useState<MigrationExportFormat>('yaml');
  const [exportPassword, setExportPassword] = useState('');
  const resetValidation = useCallback(() => setValidation(null), []);

  const validate = () =>
    executor.run('validate', signal => validateMigration(createMigrationValidationRequest(input.draft), signal), {
      success: setValidation
    });
  const start = () =>
    executor.run('start', signal => startMigration(createMigrationRequest(input.draft), signal), {
      success: value => startSucceeded(input, value),
      failure: error => startFailed(input, error)
    });
  const activate = () => {
    if (!input.operationId) return Promise.resolve();
    return executor.run(
      'activate',
      signal => activateMigration(input.operationId ?? '', { expectedState: 'ready_to_activate' }, signal),
      { success: value => operationChanged(input, value) }
    );
  };
  const exportConfiguration = () => {
    if (!input.operationId) return Promise.resolve();
    const request = createMigrationExportRequest(exportFormat, input.draft, exportPassword);
    return executor.run('export', signal => exportMigration(input.operationId ?? '', request, signal), {
      success: artifact => {
        downloadDeploymentExport(artifact);
        setExportPassword('');
        void input.queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.migration(input.operationId ?? '') });
      },
      failure: () => setExportPassword('')
    });
  };
  const reset = useCallback(() => {
    setValidation(null);
    setExportFormat('yaml');
    setExportPassword('');
    executor.reset();
  }, [executor]);
  return {
    ...executor,
    validation,
    exportFormat,
    exportPassword,
    setExportFormat,
    setExportPassword,
    resetValidation,
    reset,
    validate,
    start,
    activate,
    exportConfiguration
  };
}

function startSucceeded(input: Inputs, value: MigrationView) {
  input.setDraft(current => clearDeploymentSecrets(current));
  input.setOperationId(value.operationId);
  input.queryClient.setQueryData(deploymentQueryKeys.migration(value.operationId), value);
}

function startFailed(input: Inputs, error: unknown) {
  if (error instanceof DeploymentRequestError && error.errorCode === 'operation_conflict') {
    void input.refreshDeployment();
    return;
  }
  if (deploymentWriteOutcome(error) === 'definite_rejection') return;
  input.setDraft(current => clearDeploymentSecrets(current));
  void input.refreshDeployment();
}

function operationChanged(input: Inputs, value: MigrationView) {
  input.queryClient.setQueryData(deploymentQueryKeys.migration(value.operationId), value);
  void input.queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.view() });
}

type Settlement<T> = { success: (value: T) => void; failure?: (error: unknown) => void };
type CommandAdmission = { epoch: number };
type CommandStatus = {
  operationId: string | null;
  epoch: number;
  action: DeploymentCommandAction | null;
  error: unknown;
};

function useCommandExecutor(operationId: string | null) {
  const { startWrite, currentEpoch } = useDeploymentWriteBoundary(operationId);
  const [status, setStatus] = useState<CommandStatus>({ operationId, epoch: 0, action: null, error: null });
  const admitted = useRef<CommandAdmission | null>(null);
  const run = useCallback(
    async <T>(
      action: DeploymentCommandAction,
      task: (signal: AbortSignal) => Promise<T>,
      settlement: Settlement<T>
    ) => {
      if (admitted.current?.epoch === currentEpoch()) return;
      const boundary = startWrite();
      const admission = { epoch: boundary.epoch };
      admitted.current = admission;
      setStatus({ operationId, epoch: boundary.epoch, action, error: null });
      let value: T | undefined;
      let failure: unknown;
      try {
        value = await task(boundary.signal);
      } catch (error) {
        failure = error;
      }
      const live = boundary.release();
      const ownsAdmission = admitted.current === admission;
      if (ownsAdmission) admitted.current = null;
      if (!live || !ownsAdmission) return;
      if (failure !== undefined) {
        setStatus({ operationId, epoch: boundary.epoch, action: null, error: failure });
        settlement.failure?.(failure);
      } else {
        setStatus({ operationId, epoch: boundary.epoch, action: null, error: null });
        settlement.success(value as T);
      }
    },
    [currentEpoch, operationId, startWrite]
  );
  const reset = useCallback(
    () => setStatus({ operationId, epoch: currentEpoch(), action: null, error: null }),
    [currentEpoch, operationId]
  );
  const current = status.operationId === operationId && status.epoch === currentEpoch();
  const busyAction = current ? status.action : null;
  const busy = busyAction !== null;
  const error = current ? status.error : null;
  return { busy, busyAction, error, run, reset };
}
