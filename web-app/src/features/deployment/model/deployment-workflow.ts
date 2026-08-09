/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  MaintenanceAdmission,
  MetadataDatabaseConfiguration,
  MigrationExportRequest,
  MigrationStartRequest,
  MigrationState,
  MigrationTarget,
  MigrationValidationRequest,
  SetupApplyMode,
  ValidationResponse
} from './deployment-contract';

export type DeploymentDraft = {
  target: MigrationTarget;
  targetDatabase: MetadataDatabaseConfiguration;
  applyMode: SetupApplyMode;
};
export type MigrationExportFormat = MigrationExportRequest['format'];
export type DeploymentCommandAction = 'validate' | 'start' | 'activate' | 'export';

export function createDeploymentDraft(): DeploymentDraft {
  return {
    target: 'mysql',
    targetDatabase: { kind: 'mysql', jdbcUrl: '', username: '', password: '' },
    applyMode: 'managed_write'
  };
}

export function selectMigrationTarget(draft: DeploymentDraft, target: MigrationTarget): DeploymentDraft {
  if (draft.target === target) return draft;
  return {
    target,
    targetDatabase: { kind: target, jdbcUrl: '', username: '', password: '' },
    applyMode: draft.applyMode
  };
}

export function deploymentDraftComplete(draft: DeploymentDraft) {
  return (
    draft.target === draft.targetDatabase.kind &&
    nonBlank(draft.targetDatabase.jdbcUrl) &&
    nonBlank(draft.targetDatabase.username) &&
    nonBlank(draft.targetDatabase.password)
  );
}

export function createMigrationValidationRequest(draft: DeploymentDraft): MigrationValidationRequest {
  return { target: draft.target, targetDatabase: normalizedTargetDatabase(draft) };
}

export function createMigrationRequest(draft: DeploymentDraft): MigrationStartRequest {
  return { ...createMigrationValidationRequest(draft), applyMode: draft.applyMode };
}

export function createMigrationExportRequest(
  format: MigrationExportFormat,
  draft: DeploymentDraft,
  password: string
): MigrationExportRequest {
  const targetDatabase = normalizedTargetDatabase({
    ...draft,
    targetDatabase: { ...draft.targetDatabase, password }
  });
  return { format, expectedState: 'awaiting_external_apply', targetDatabase };
}

export function deploymentExportComplete(draft: DeploymentDraft, password: string) {
  return deploymentDraftComplete({
    ...draft,
    targetDatabase: { ...draft.targetDatabase, password }
  });
}

export function clearDeploymentSecrets(draft: DeploymentDraft): DeploymentDraft {
  return { ...draft, targetDatabase: { ...draft.targetDatabase, password: '' } };
}

export function clearDeploymentTargetIdentity(draft: DeploymentDraft): DeploymentDraft {
  return {
    ...draft,
    targetDatabase: { kind: draft.target, jdbcUrl: '', username: '', password: '' }
  };
}

export function migrationValidationAllowsStart(validation: ValidationResponse | null) {
  return validation?.valid === true && validation.errorCode === null;
}

export function migrationStartAdmission(
  maintenanceAdmission: MaintenanceAdmission,
  valid: boolean,
  acknowledged: boolean
) {
  if (!['use_current', 'auto_enter'].includes(maintenanceAdmission)) return 'maintenance_unavailable';
  if (!valid) return 'validation_required';
  if (!acknowledged) return 'acknowledgement_required';
  return 'allowed';
}

export function deploymentPollInterval(operation: { state: MigrationState; nextPollAfterMillis: number } | null) {
  if (!operation || !['pending', 'running', 'awaiting_restart'].includes(operation.state)) return false;
  return operation.nextPollAfterMillis > 0 ? operation.nextPollAfterMillis : false;
}

function normalizedTargetDatabase(draft: DeploymentDraft): MetadataDatabaseConfiguration {
  if (!deploymentDraftComplete(draft)) throw new Error('Incomplete deployment target');
  return {
    kind: draft.target,
    jdbcUrl: draft.targetDatabase.jdbcUrl.trim(),
    username: draft.targetDatabase.username.trim(),
    password: draft.targetDatabase.password
  };
}

function nonBlank(value: string) {
  return value.trim().length > 0;
}
