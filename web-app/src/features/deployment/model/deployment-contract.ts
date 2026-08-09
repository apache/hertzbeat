/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  ExportResponse,
  MetadataDatabaseConfiguration,
  MetadataDatabaseKind,
  SetupApplyMode,
  SetupWarningCode
} from '@/features/setup';

export const DEPLOYMENT_MAINTENANCE_MODES = ['inactive', 'active'] as const;
export const DEPLOYMENT_TOPOLOGIES = ['single_node', 'multi_node', 'unknown'] as const;
export const MAINTENANCE_ADMISSIONS = ['use_current', 'auto_enter', 'unavailable', 'not_applicable'] as const;
export const MIGRATION_TARGETS = ['mysql', 'postgresql'] as const;
export const MIGRATION_STATES = [
  'pending',
  'running',
  'ready_to_activate',
  'awaiting_external_apply',
  'awaiting_restart',
  'succeeded',
  'failed',
  'rolled_back'
] as const;
export const MIGRATION_STAGES = [
  'queued',
  'copying',
  'verifying',
  'ready_to_activate',
  'awaiting_external_apply',
  'activating',
  'awaiting_restart',
  'completed',
  'rolling_back',
  'rolled_back',
  'failed'
] as const;
export const MIGRATION_VERIFICATION_STATES = ['pending', 'running', 'succeeded', 'failed'] as const;
export const DEPLOYMENT_ERROR_CODES = [
  'migration_unavailable',
  'migration_source_unsupported',
  'migration_target_not_empty',
  'migration_multi_node_unsupported',
  'migration_topology_unavailable',
  'migration_maintenance_required',
  'migration_copy_failed',
  'migration_verification_failed',
  'migration_activation_not_available',
  'migration_activation_failed',
  'restart_failed',
  'operation_not_found',
  'operation_conflict',
  'invalid_request',
  'internal_error',
  'metadata_connection_failed',
  'metadata_kind_unsupported',
  'metadata_schema_mismatch',
  'metadata_insufficient_privileges'
] as const;

type ConfigSource =
  'built_in_default' | 'ui_managed' | 'external_file' | 'environment' | 'system_property' | 'command_line';
type DeploymentMaintenanceMode = (typeof DEPLOYMENT_MAINTENANCE_MODES)[number];
export type MaintenanceAdmission = (typeof MAINTENANCE_ADMISSIONS)[number];
type DeploymentTopology = (typeof DEPLOYMENT_TOPOLOGIES)[number];
export type MigrationTarget = (typeof MIGRATION_TARGETS)[number];
export type MigrationState = (typeof MIGRATION_STATES)[number];
type MigrationStage = (typeof MIGRATION_STAGES)[number];
type MigrationVerificationState = (typeof MIGRATION_VERIFICATION_STATES)[number];
export type DeploymentErrorCode = (typeof DEPLOYMENT_ERROR_CODES)[number];
export type ValidationResponse = {
  valid: boolean;
  observedAt: string;
  errorCode: DeploymentErrorCode | null;
  warnings: SetupWarningCode[];
};

type DatabaseSummary = {
  kind: MetadataDatabaseKind | null;
  configured: boolean;
  source: ConfigSource;
  restartRequired: boolean;
};
type GreptimeDatabaseSummary = Omit<DatabaseSummary, 'kind'> & { kind: 'greptime' };
export type DeploymentView = {
  observedAt: string;
  managementDatabase: DatabaseSummary;
  greptimeDatabase: GreptimeDatabaseSummary;
  applyMode: SetupApplyMode;
  maintenanceMode: DeploymentMaintenanceMode;
  topology: DeploymentTopology;
  migration: {
    allowed: boolean;
    blockedBy: DeploymentErrorCode | null;
    maintenanceAdmission: MaintenanceAdmission;
    activeOperationId: string | null;
  };
};
export type MigrationView = {
  operationId: string;
  state: MigrationState;
  source: 'h2';
  target: MigrationTarget;
  stage: MigrationStage;
  progressPercent: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  verificationState: MigrationVerificationState;
  errorCode: DeploymentErrorCode | null;
  nextPollAfterMillis: number;
  activationAvailable: boolean;
  restartRequired: boolean;
  externalApplyRequired: boolean;
};
export type MigrationValidationRequest = { target: MigrationTarget; targetDatabase: MetadataDatabaseConfiguration };
export type MigrationStartRequest = MigrationValidationRequest & { applyMode: SetupApplyMode };
export type MigrationActivateRequest = { expectedState: 'ready_to_activate' };
export type MigrationExportRequest = {
  format: 'yaml' | 'env' | 'kubernetes_secret';
  expectedState: 'awaiting_external_apply';
  targetDatabase: MetadataDatabaseConfiguration;
};
export type { ExportResponse, MetadataDatabaseConfiguration, SetupApplyMode };
