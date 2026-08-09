/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeploymentRequestError } from '../api/deployment-api';
import type { DeploymentView, MigrationView, ValidationResponse } from '../model/deployment-contract';
import type { DeploymentDraft } from '../model/deployment-workflow';
import {
  deploymentDraftComplete,
  deploymentExportComplete,
  migrationStartAdmission,
  migrationValidationAllowsStart
} from '../model/deployment-workflow';

export function deploymentControllerAdmission(input: AdmissionInput) {
  const noCommand = !input.busy;
  const canValidate = validateAdmission(input, noCommand);
  const canStart = startAdmission(input, canValidate);
  const canActivate = activateAdmission(input.operation, noCommand);
  const canExport = exportAdmission(input, noCommand);
  return { canValidate, canStart, canActivate, canExport };
}

function validateAdmission(input: AdmissionInput, noCommand: boolean) {
  return (
    !input.operation &&
    input.deployment?.migration.allowed === true &&
    deploymentDraftComplete(input.draft) &&
    noCommand
  );
}

function startAdmission(input: AdmissionInput, canValidate: boolean) {
  if (!canValidate || !input.deployment || !migrationValidationAllowsStart(input.validation)) return false;
  return (
    migrationStartAdmission(input.deployment.migration.maintenanceAdmission, true, input.acknowledged) === 'allowed'
  );
}

function activateAdmission(operation: MigrationView | null, noCommand: boolean) {
  return (
    noCommand &&
    operation?.state === 'ready_to_activate' &&
    operation.activationAvailable &&
    !operation.externalApplyRequired
  );
}

function exportAdmission(input: AdmissionInput, noCommand: boolean) {
  return (
    noCommand &&
    input.operation?.state === 'awaiting_external_apply' &&
    input.operation.externalApplyRequired &&
    !input.operation.activationAvailable &&
    deploymentExportComplete(input.draft, input.exportPassword)
  );
}

export function deploymentLoadState(pending: boolean, failed: boolean) {
  if (pending) return 'loading' as const;
  if (failed) return 'error' as const;
  return 'ready' as const;
}

export function deploymentCommandErrorKey(commandError: unknown, operationError: unknown) {
  const error = commandError ?? operationError;
  if (!error) return null;
  if (error instanceof DeploymentRequestError && error.errorCode) return `deployment.errors.${error.errorCode}`;
  if (error instanceof DeploymentRequestError && error.kind === 'unavailable') return 'deployment.unavailable';
  return 'common.routeError.description';
}

type AdmissionInput = {
  deployment: DeploymentView | null;
  operation: MigrationView | null;
  draft: DeploymentDraft;
  validation: ValidationResponse | null;
  busy: boolean;
  acknowledged: boolean;
  exportPassword: string;
};
