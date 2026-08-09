/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  DeploymentErrorCode,
  DeploymentView,
  MigrationView,
  ValidationResponse
} from '../model/deployment-contract';

export function deploymentCapabilityValid(value: DeploymentView) {
  const expected = structuralBlocker(value);
  const migration = value.migration;
  if (expected) return blockedCapability(migration, expected, 'not_applicable');
  if (migration.blockedBy === 'operation_conflict') return conflictCapability(migration);
  if (migration.blockedBy === 'migration_unavailable') {
    return blockedCapability(migration, 'migration_unavailable', 'unavailable');
  }
  return maintenanceCapability(value);
}

export function migrationLifecycleValid(value: MigrationView) {
  return migrationTimesValid(value) && migrationStateValid(value) && migrationOutcomeValid(value);
}

export function migrationValidationValid(value: ValidationResponse) {
  return value.valid === (value.errorCode === null);
}

function structuralBlocker(value: DeploymentView): DeploymentErrorCode | null {
  if (value.managementDatabase.kind !== 'h2') return 'migration_source_unsupported';
  if (value.topology === 'multi_node') return 'migration_multi_node_unsupported';
  if (value.topology === 'unknown') return 'migration_topology_unavailable';
  return null;
}

type MigrationCapability = DeploymentView['migration'];

function blockedCapability(
  migration: MigrationCapability,
  blocker: DeploymentErrorCode,
  admission: 'unavailable' | 'not_applicable'
) {
  return (
    !migration.allowed &&
    migration.blockedBy === blocker &&
    migration.maintenanceAdmission === admission &&
    migration.activeOperationId === null
  );
}

function conflictCapability(migration: MigrationCapability) {
  return (
    !migration.allowed &&
    migration.blockedBy === 'operation_conflict' &&
    migration.maintenanceAdmission === 'unavailable' &&
    migration.activeOperationId !== null
  );
}

function maintenanceCapability(value: DeploymentView) {
  const migration = value.migration;
  if (migration.activeOperationId !== null) return false;
  if (value.maintenanceMode === 'active') {
    return migration.allowed && migration.blockedBy === null && migration.maintenanceAdmission === 'use_current';
  }
  if (migration.maintenanceAdmission === 'auto_enter') return migration.allowed && migration.blockedBy === null;
  return (
    !migration.allowed &&
    migration.blockedBy === 'migration_maintenance_required' &&
    migration.maintenanceAdmission === 'unavailable'
  );
}

function migrationTimesValid(value: MigrationView) {
  const pending = value.state === 'pending';
  const terminal = ['succeeded', 'failed', 'rolled_back'].includes(value.state);
  if (pending !== (value.startedAt === null) || terminal !== (value.completedAt !== null)) return false;
  if (value.startedAt && Date.parse(value.startedAt) < Date.parse(value.createdAt)) return false;
  return !value.completedAt || (!!value.startedAt && Date.parse(value.completedAt) >= Date.parse(value.startedAt));
}

function migrationStateValid(value: MigrationView) {
  if (value.state === 'pending') return matches(value, 'queued', 0, 'pending', true);
  if (value.state === 'running') return runningStateValid(value);
  if (value.state === 'ready_to_activate') return matches(value, 'ready_to_activate', 100, 'succeeded', false);
  if (value.state === 'awaiting_external_apply') {
    return matches(value, 'awaiting_external_apply', 100, 'succeeded', false);
  }
  if (value.state === 'awaiting_restart') return matches(value, 'awaiting_restart', 100, 'succeeded', true);
  if (value.state === 'succeeded') return matches(value, 'completed', 100, 'succeeded', false);
  if (value.state === 'failed') return value.stage === 'failed' && failureStateValid(value);
  return value.stage === 'rolled_back' && failureStateValid(value);
}

function matches(
  value: MigrationView,
  stage: MigrationView['stage'],
  progress: number,
  verification: MigrationView['verificationState'],
  polls: boolean
) {
  return (
    value.stage === stage &&
    value.progressPercent === progress &&
    value.verificationState === verification &&
    value.nextPollAfterMillis > 0 === polls
  );
}

function runningStateValid(value: MigrationView) {
  if (value.nextPollAfterMillis <= 0) return false;
  if (value.stage === 'copying') return value.progressPercent < 100 && value.verificationState === 'pending';
  if (value.stage === 'verifying') return value.progressPercent === 100 && value.verificationState === 'running';
  if (value.stage === 'activating') return value.progressPercent === 100 && value.verificationState === 'succeeded';
  return value.stage === 'rolling_back' && ['succeeded', 'failed'].includes(value.verificationState);
}

function failureStateValid(value: MigrationView) {
  if (value.nextPollAfterMillis !== 0) return false;
  if (value.errorCode === 'migration_copy_failed') {
    return value.verificationState === 'pending' && value.progressPercent < 100;
  }
  if (value.errorCode === 'migration_verification_failed') {
    return value.verificationState === 'failed' && value.progressPercent === 100;
  }
  return (
    ['migration_activation_failed', 'restart_failed'].includes(value.errorCode ?? '') &&
    value.verificationState === 'succeeded' &&
    value.progressPercent === 100
  );
}

function migrationOutcomeValid(value: MigrationView) {
  const failure = ['failed', 'rolled_back'].includes(value.state);
  return (
    failure === (value.errorCode !== null) &&
    value.activationAvailable === (value.state === 'ready_to_activate') &&
    value.restartRequired === (value.state === 'awaiting_restart') &&
    value.externalApplyRequired === (value.state === 'awaiting_external_apply')
  );
}
