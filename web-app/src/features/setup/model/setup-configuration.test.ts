/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  SETUP_CONFIGURATION_FORM_DEFAULTS,
  clearConfigurationSecrets,
  createConfigurationRequest,
  createExternalApplyResumeDraft,
  createSetupConfigurationDraft,
  createValidationRequest,
  managementSectionComplete,
  telemetrySectionComplete
} from './setup-configuration';

describe('setup configuration model', () => {
  it('keeps named form defaults aligned with the current server profiles', () => {
    expect(SETUP_CONFIGURATION_FORM_DEFAULTS).toEqual({
      managementJdbcUrl: 'jdbc:h2:./data/hertzbeat;MODE=MYSQL',
      managementUsername: 'sa',
      telemetryDatabase: 'public'
    });
    expect(JSON.stringify(SETUP_CONFIGURATION_FORM_DEFAULTS)).not.toContain('password');
    expect(createSetupConfigurationDraft().managementDatabase.password).toBe('');
  });

  it('starts an external-apply resume with no recovered or invented configuration values', () => {
    expect(createExternalApplyResumeDraft()).toEqual({
      managementDatabase: { kind: null, jdbcUrl: '', username: '', password: '' },
      telemetryStore: {
        kind: 'greptime',
        grpcEndpoints: '',
        httpEndpoint: '',
        database: '',
        username: '',
        password: ''
      }
    });
  });

  it('requires complete management fields and paired optional telemetry credentials', () => {
    const draft = populatedDraft();
    expect(managementSectionComplete(draft.managementDatabase)).toBe(true);
    expect(telemetrySectionComplete(draft.telemetryStore)).toBe(true);
    expect(managementSectionComplete({ ...draft.managementDatabase, username: '' })).toBe(false);
    expect(telemetrySectionComplete({ ...draft.telemetryStore, password: '' })).toBe(false);
    expect(telemetrySectionComplete({ ...draft.telemetryStore, username: '', password: '' })).toBe(true);
  });

  it('builds exactly one validation section', () => {
    const draft = populatedDraft();
    expect(createValidationRequest('metadata_database', draft)).toEqual({
      section: 'metadata_database',
      managementDatabase: draft.managementDatabase
    });
    expect(createValidationRequest('telemetry_store', draft)).toEqual({
      section: 'telemetry_store',
      telemetryStore: draft.telemetryStore
    });
  });

  it('uses the server phase and apply mode for configuration submission', () => {
    const draft = populatedDraft();
    expect(createConfigurationRequest('configuration_required', 'managed_write', draft)).toEqual({
      expectedPhase: 'configuration_required',
      applyMode: 'managed_write',
      managementDatabase: draft.managementDatabase,
      telemetryStore: draft.telemetryStore
    });
  });

  it('preserves non-blank password bytes while normalizing blank optional credentials', () => {
    const draft = populatedDraft();
    draft.telemetryStore.password = '  telemetry secret  ';
    expect(createValidationRequest('telemetry_store', draft)).toMatchObject({
      telemetryStore: { username: 'greptime', password: '  telemetry secret  ' }
    });
    draft.telemetryStore.username = '   ';
    draft.telemetryStore.password = '   ';
    expect(createValidationRequest('telemetry_store', draft)).toMatchObject({
      telemetryStore: { username: null, password: null }
    });
  });

  it('retires both passwords without discarding non-secret draft values', () => {
    const draft = populatedDraft();
    expect(clearConfigurationSecrets(draft)).toEqual({
      ...draft,
      managementDatabase: { ...draft.managementDatabase, password: '' },
      telemetryStore: { ...draft.telemetryStore, password: '' }
    });
  });
});

function populatedDraft() {
  const draft = createSetupConfigurationDraft();
  return {
    managementDatabase: {
      ...draft.managementDatabase,
      kind: 'postgresql' as const,
      jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
      username: 'hertzbeat',
      password: 'metadata-secret'
    },
    telemetryStore: {
      ...draft.telemetryStore,
      grpcEndpoints: 'greptime:4001',
      httpEndpoint: 'http://greptime:4000',
      database: 'public',
      username: 'greptime',
      password: 'telemetry-secret'
    }
  };
}
