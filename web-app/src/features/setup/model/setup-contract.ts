/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const SETUP_PHASES = [
  'configuration_required',
  'external_apply_required',
  'application_starting',
  'administrator_required',
  'optional_configuration',
  'complete',
  'recovery_required',
  'migration_in_progress'
] as const;
export const SETUP_ACCESS = ['local', 'locked', 'unlocked'] as const;
export const SETUP_APPLY_MODES = ['managed_write', 'external_apply'] as const;
export const SETUP_OPERATION_STATES = [
  'pending',
  'running',
  'awaiting_external_apply',
  'awaiting_restart',
  'succeeded',
  'failed',
  'rolled_back'
] as const;
export const SETUP_CONFIG_SOURCES = [
  'built_in_default',
  'ui_managed',
  'external_file',
  'environment',
  'system_property',
  'command_line'
] as const;
export const METADATA_DATABASE_KINDS = ['h2', 'mysql', 'postgresql'] as const;
export const SETUP_ERROR_CODES = [
  'setup_complete',
  'setup_locked',
  'setup_code_invalid',
  'setup_code_expired',
  'setup_rate_limited',
  'setup_not_complete',
  'config_read_only',
  'config_write_failed',
  'config_recovery_required',
  'metadata_connection_failed',
  'metadata_kind_unsupported',
  'metadata_schema_mismatch',
  'metadata_insufficient_privileges',
  'telemetry_connection_failed',
  'public_address_invalid',
  'mail_connection_failed',
  'administrator_already_configured',
  'administrator_username_invalid',
  'operation_not_found',
  'operation_conflict',
  'migration_source_unsupported',
  'migration_target_not_empty',
  'migration_multi_node_unsupported',
  'migration_copy_failed',
  'migration_verification_failed',
  'migration_activation_failed',
  'restart_failed',
  'invalid_request',
  'internal_error'
] as const;
export const SETUP_WARNING_CODES = [
  'external_apply_required',
  'restart_required',
  'public_address_plaintext',
  'mail_security_none',
  'h2_non_production'
] as const;

export type SetupPhase = (typeof SETUP_PHASES)[number];
export type SetupAccess = (typeof SETUP_ACCESS)[number];
export type SetupApplyMode = (typeof SETUP_APPLY_MODES)[number];
export type SetupOperationState = (typeof SETUP_OPERATION_STATES)[number];
export type SetupConfigSource = (typeof SETUP_CONFIG_SOURCES)[number];
export type SetupErrorCode = (typeof SETUP_ERROR_CODES)[number];
export type SetupWarningCode = (typeof SETUP_WARNING_CODES)[number];
export type MetadataDatabaseKind = (typeof METADATA_DATABASE_KINDS)[number];

export type SetupStatus = Readonly<{
  phase: SetupPhase;
  observedAt: string;
  access: SetupAccess;
  applyMode: SetupApplyMode;
  writableManagedConfig: boolean;
  operationId: string | null;
  errorCode: SetupErrorCode | null;
  managementDatabase: Readonly<{
    kind: MetadataDatabaseKind | null;
    configured: boolean;
    source: SetupConfigSource;
    restartRequired: boolean;
  }>;
  telemetryStore: Readonly<{
    kind: 'greptime';
    configured: boolean;
    source: SetupConfigSource;
    restartRequired: boolean;
  }>;
  administratorConfigured: boolean;
  optional: Readonly<{
    publicAccessConfigured: boolean;
    serverOtlpHttpConfigured: boolean;
    serverOtlpGrpcConfigured: boolean;
    retentionConfigured: boolean;
    mailConfigured: boolean;
  }>;
  pendingWarnings: readonly SetupWarningCode[];
}>;

export type MetadataDatabaseConfiguration = {
  kind: MetadataDatabaseKind;
  jdbcUrl: string;
  username: string;
  password: string;
};
export type TelemetryStoreConfiguration = {
  kind: 'greptime';
  grpcEndpoints: string;
  httpEndpoint: string;
  database: string;
  username?: string | null;
  password?: string | null;
};
export type PublicAccessConfiguration = {
  publicBaseUrl?: string | null;
  serverOtlpHttpEndpoint?: string | null;
  serverOtlpGrpcEndpoint?: string | null;
};
export type RetentionConfiguration = {
  metricsDays?: number | null;
  logsDays?: number | null;
  tracesDays?: number | null;
};
export type MailConfiguration = {
  host: string;
  port: number;
  security: 'none' | 'starttls' | 'tls';
  username?: string | null;
  password?: string | null;
  fromAddress: string;
};
