/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type {
  MetadataDatabaseConfiguration,
  MetadataDatabaseKind,
  SetupApplyMode,
  SetupPhase,
  TelemetryStoreConfiguration
} from './setup-contract';

export type SetupValidationSection = 'metadata_database' | 'telemetry_store';
export type SetupConfigurationDraft = {
  managementDatabase: Omit<MetadataDatabaseConfiguration, 'kind'> & { kind: MetadataDatabaseKind | null };
  telemetryStore: TelemetryStoreConfiguration & { username: string; password: string };
};
export type SetupValidationRequest =
  | { section: 'metadata_database'; managementDatabase: MetadataDatabaseConfiguration }
  | { section: 'telemetry_store'; telemetryStore: TelemetryStoreConfiguration };
export type SetupConfigurationRequest = {
  expectedPhase: SetupPhase;
  applyMode: SetupApplyMode;
  managementDatabase: MetadataDatabaseConfiguration;
  telemetryStore: TelemetryStoreConfiguration;
};
export const SETUP_EXPORT_FORMATS = ['yaml', 'env', 'kubernetes_secret'] as const;
export type SetupExportFormat = (typeof SETUP_EXPORT_FORMATS)[number];
export type SetupExportRequest = { format: SetupExportFormat; configuration: SetupConfigurationRequest };

export const SETUP_CONFIGURATION_FORM_DEFAULTS = {
  managementJdbcUrl: 'jdbc:h2:./data/hertzbeat;MODE=MYSQL',
  managementUsername: 'sa',
  telemetryDatabase: 'public'
} as const;

export function createSetupConfigurationDraft(): SetupConfigurationDraft {
  return {
    managementDatabase: {
      kind: 'h2',
      jdbcUrl: SETUP_CONFIGURATION_FORM_DEFAULTS.managementJdbcUrl,
      username: SETUP_CONFIGURATION_FORM_DEFAULTS.managementUsername,
      password: ''
    },
    telemetryStore: {
      kind: 'greptime',
      grpcEndpoints: '',
      httpEndpoint: '',
      database: SETUP_CONFIGURATION_FORM_DEFAULTS.telemetryDatabase,
      username: '',
      password: ''
    }
  };
}

export function createExternalApplyResumeDraft(): SetupConfigurationDraft {
  return {
    managementDatabase: { kind: null, jdbcUrl: '', username: '', password: '' },
    telemetryStore: {
      kind: 'greptime',
      grpcEndpoints: '',
      httpEndpoint: '',
      database: '',
      username: '',
      password: ''
    }
  };
}

export function managementSectionComplete(value: SetupConfigurationDraft['managementDatabase']) {
  return value.kind !== null && nonBlank(value.jdbcUrl) && nonBlank(value.username) && nonBlank(value.password);
}

export function telemetrySectionComplete(value: SetupConfigurationDraft['telemetryStore']) {
  if (!nonBlank(value.grpcEndpoints) || !nonBlank(value.httpEndpoint) || !nonBlank(value.database)) return false;
  return nonBlank(value.username) === nonBlank(value.password);
}

export function createValidationRequest(
  section: SetupValidationSection,
  draft: SetupConfigurationDraft
): SetupValidationRequest {
  if (section === 'metadata_database') {
    return { section, managementDatabase: managementConfiguration(draft.managementDatabase) };
  }
  return { section, telemetryStore: normalizedTelemetry(draft.telemetryStore) };
}

export function createConfigurationRequest(
  expectedPhase: SetupPhase,
  applyMode: SetupApplyMode,
  draft: SetupConfigurationDraft
): SetupConfigurationRequest {
  return {
    expectedPhase,
    applyMode,
    managementDatabase: managementConfiguration(draft.managementDatabase),
    telemetryStore: normalizedTelemetry(draft.telemetryStore)
  };
}

export function createExportRequest(
  format: SetupExportFormat,
  expectedPhase: SetupPhase,
  applyMode: SetupApplyMode,
  draft: SetupConfigurationDraft
): SetupExportRequest {
  return { format, configuration: createConfigurationRequest(expectedPhase, applyMode, draft) };
}

export function clearConfigurationSecrets(draft: SetupConfigurationDraft): SetupConfigurationDraft {
  return {
    managementDatabase: { ...draft.managementDatabase, password: '' },
    telemetryStore: { ...draft.telemetryStore, password: '' }
  };
}

function normalizedTelemetry(value: SetupConfigurationDraft['telemetryStore']): TelemetryStoreConfiguration {
  const username = value.username.trim();
  const password = value.password;
  return { ...value, username: username || null, password: password.trim() ? password : null };
}

function managementConfiguration(value: SetupConfigurationDraft['managementDatabase']): MetadataDatabaseConfiguration {
  if (!value.kind) throw new Error('Incomplete setup configuration');
  return { ...value, kind: value.kind };
}

function nonBlank(value: string) {
  return value.trim().length > 0;
}
