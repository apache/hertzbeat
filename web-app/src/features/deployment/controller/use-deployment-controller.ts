/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { DeploymentRequestError, loadDeployment, loadMigration } from '../api/deployment-api';
import type { DeploymentDraft, MigrationExportFormat } from '../model/deployment-workflow';
import { createDeploymentDraft, deploymentPollInterval, selectMigrationTarget } from '../model/deployment-workflow';
import {
  deploymentCommandErrorKey,
  deploymentControllerAdmission,
  deploymentLoadState
} from './deployment-controller-state';
import { deploymentQueryKeys } from './deployment-query-keys';
import { useDeploymentCommands } from './use-deployment-commands';
import { useDeploymentIdentityRetirement } from './use-deployment-identity-retirement';
import { useDeploymentOperationRoute } from './use-deployment-operation-route';

export function useDeploymentController() {
  const core = useDeploymentCore();
  const { deployment, operation, commands, draft, maintenanceAcknowledged } = core;
  const admission = deploymentControllerAdmission({
    deployment: deployment.data ?? null,
    operation: operation.data ?? null,
    draft,
    validation: commands.validation,
    busy: commands.busy,
    acknowledged: maintenanceAcknowledged,
    exportPassword: commands.exportPassword
  });
  const activeOperationId = deployment.data?.migration.activeOperationId ?? null;
  return {
    state: deploymentLoadState(deployment.isPending, deployment.isError),
    deployment: deployment.data ?? null,
    draft,
    validation: commands.validation,
    operation: operation.data ?? null,
    busy: commands.busy,
    busyAction: commands.busyAction,
    ...admission,
    exportFormat: commands.exportFormat,
    exportPassword: commands.exportPassword,
    maintenanceAcknowledged,
    commandErrorKey: deploymentCommandErrorKey(commands.error, operation.error),
    retry: () => deployment.refetch(),
    refreshOperation: () => operation.refetch(),
    startNewMigration: core.resetLifecycle,
    continueCurrentMigration: () => activeOperationId && core.route.setOperationId(activeOperationId),
    updateDraft: core.updateDraft,
    updateExportFormat: (value: MigrationExportFormat) => commands.setExportFormat(value),
    updateExportPassword: (value: string) => commands.setExportPassword(value),
    setMaintenanceAcknowledged: core.setMaintenanceAcknowledged,
    validate: () => (admission.canValidate ? commands.validate() : Promise.resolve()),
    start: () => (admission.canStart ? commands.start() : Promise.resolve()),
    activate: () => (admission.canActivate ? commands.activate() : Promise.resolve()),
    exportConfiguration: () => (admission.canExport ? commands.exportConfiguration() : Promise.resolve())
  };
}

function useDeploymentCore() {
  const queryClient = useQueryClient();
  const route = useDeploymentOperationRoute();
  const [draft, setDraft] = useState(createDeploymentDraft);
  const [maintenanceAcknowledged, setMaintenanceAcknowledged] = useState(false);
  const deployment = useDeploymentQuery();
  const operation = useDeploymentOperation(route.operationId);
  const commands = useDeploymentCommands({
    draft,
    operationId: route.operationId,
    queryClient,
    setDraft,
    setOperationId: route.setOperationId,
    refreshDeployment: deployment.refetch
  });
  useDeploymentIdentityRetirement(
    route.operationId,
    setDraft,
    setMaintenanceAcknowledged,
    commands.setExportPassword,
    commands.resetValidation
  );
  const resetLifecycle = useResetDeploymentLifecycle({
    operationId: route.operationId,
    setOperationId: route.setOperationId,
    queryClient,
    refetchDeployment: deployment.refetch,
    setDraft,
    setMaintenanceAcknowledged,
    resetCommands: commands.reset
  });
  useOperationRecovery(operation.error, route.operationId, resetLifecycle);
  useTerminalConvergence(operation.data ?? null, queryClient);
  useOperationTarget(operation.data?.target, setDraft);

  const updateDraft = useCallback(
    (value: DeploymentDraft) => {
      setDraft(value);
      setMaintenanceAcknowledged(false);
      commands.resetValidation();
    },
    [commands]
  );
  return {
    route,
    deployment,
    operation,
    commands,
    draft,
    maintenanceAcknowledged,
    updateDraft,
    setMaintenanceAcknowledged,
    resetLifecycle
  };
}

function useDeploymentQuery() {
  return useQuery({
    queryKey: deploymentQueryKeys.view(),
    queryFn: ({ signal }) => loadDeployment(signal),
    retry: false
  });
}

function useDeploymentOperation(operationId: string | null) {
  return useQuery({
    queryKey: deploymentQueryKeys.migration(operationId ?? 'inactive'),
    queryFn: ({ signal }) => loadMigration(operationId ?? '', signal),
    enabled: operationId !== null,
    retry: false,
    gcTime: 0,
    refetchInterval: query => deploymentPollInterval(query.state.data ?? null)
  });
}

function useOperationRecovery(error: unknown, operationId: string | null, reset: () => Promise<unknown>) {
  const recovered = useRef<string | null>(null);
  useEffect(() => {
    const missing =
      error instanceof DeploymentRequestError && (error.status === 404 || error.errorCode === 'operation_not_found');
    if (missing && operationId && recovered.current !== operationId) {
      recovered.current = operationId;
      void reset();
    }
  }, [error, operationId, reset]);
}

function useTerminalConvergence(
  operation: ReturnType<typeof useDeploymentOperation>['data'] | null,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const converged = useRef<string | null>(null);
  useEffect(() => {
    if (!operation || !['succeeded', 'failed', 'rolled_back'].includes(operation.state)) return;
    const identity = `${operation.operationId}:${operation.state}:${operation.completedAt}`;
    if (converged.current === identity) return;
    converged.current = identity;
    void queryClient.invalidateQueries({ queryKey: deploymentQueryKeys.view() });
  }, [operation, queryClient]);
}

function useOperationTarget(
  target: DeploymentDraft['target'] | undefined,
  setDraft: Dispatch<SetStateAction<DeploymentDraft>>
) {
  useEffect(() => {
    if (target) setDraft(current => selectMigrationTarget(current, target));
  }, [setDraft, target]);
}

type ResetInputs = {
  operationId: string | null;
  setOperationId: (operationId: string | null) => void;
  queryClient: ReturnType<typeof useQueryClient>;
  refetchDeployment: () => Promise<unknown>;
  setDraft: Dispatch<SetStateAction<DeploymentDraft>>;
  setMaintenanceAcknowledged: (value: boolean) => void;
  resetCommands: () => void;
};

function useResetDeploymentLifecycle(input: ResetInputs) {
  return useCallback(async () => {
    if (input.operationId)
      input.queryClient.removeQueries({ queryKey: deploymentQueryKeys.migration(input.operationId), exact: true });
    input.setOperationId(null);
    input.setDraft(createDeploymentDraft());
    input.setMaintenanceAcknowledged(false);
    input.resetCommands();
    return input.refetchDeployment();
  }, [input]);
}
