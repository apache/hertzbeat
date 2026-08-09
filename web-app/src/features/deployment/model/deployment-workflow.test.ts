/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  clearDeploymentTargetIdentity,
  clearDeploymentSecrets,
  createDeploymentDraft,
  createMigrationExportRequest,
  createMigrationRequest,
  createMigrationValidationRequest,
  deploymentPollInterval,
  migrationValidationAllowsStart,
  migrationStartAdmission,
  selectMigrationTarget
} from './deployment-workflow';

describe('deployment migration workflow', () => {
  it('keeps target kind coupled and clears credentials when target changes', () => {
    const mysql = {
      ...createDeploymentDraft(),
      target: 'mysql' as const,
      targetDatabase: { kind: 'mysql' as const, jdbcUrl: 'jdbc:mysql://db/hb', username: 'hb', password: 'secret' }
    };

    expect(selectMigrationTarget(mysql, 'postgresql')).toEqual({
      target: 'postgresql',
      targetDatabase: { kind: 'postgresql', jdbcUrl: '', username: '', password: '' },
      applyMode: 'managed_write'
    });
  });

  it('constructs only target-matched requests and clears the password explicitly', () => {
    const draft = {
      target: 'mysql' as const,
      targetDatabase: { kind: 'mysql' as const, jdbcUrl: ' jdbc:mysql://db/hb ', username: ' hb ', password: 'secret' },
      applyMode: 'external_apply' as const
    };

    expect(createMigrationValidationRequest(draft)).toEqual({
      target: 'mysql',
      targetDatabase: { kind: 'mysql', jdbcUrl: 'jdbc:mysql://db/hb', username: 'hb', password: 'secret' }
    });
    expect(createMigrationRequest(draft)).toMatchObject({ target: 'mysql', applyMode: 'external_apply' });
    expect(clearDeploymentSecrets(draft).targetDatabase.password).toBe('');
    expect(clearDeploymentTargetIdentity(draft).targetDatabase).toEqual({
      kind: 'mysql',
      jdbcUrl: '',
      username: '',
      password: ''
    });
    expect(createMigrationExportRequest('yaml', clearDeploymentSecrets(draft), 'one-shot-secret')).toMatchObject({
      format: 'yaml',
      expectedState: 'awaiting_external_apply',
      targetDatabase: { password: 'one-shot-secret' }
    });
  });

  it('admits only a valid validation result without a stable error', () => {
    const observedAt = '2026-08-09T01:00:00Z';
    expect(migrationValidationAllowsStart({ valid: true, observedAt, errorCode: null, warnings: [] })).toBe(true);
    expect(
      migrationValidationAllowsStart({
        valid: true,
        observedAt,
        errorCode: 'metadata_connection_failed',
        warnings: []
      })
    ).toBe(false);
    expect(migrationValidationAllowsStart({ valid: false, observedAt, errorCode: null, warnings: [] })).toBe(false);
  });

  it('requires server maintenance admission, validation, and explicit acknowledgement before start', () => {
    expect(migrationStartAdmission('unavailable', true, true)).toBe('maintenance_unavailable');
    expect(migrationStartAdmission('not_applicable', true, true)).toBe('maintenance_unavailable');
    expect(migrationStartAdmission('auto_enter', false, true)).toBe('validation_required');
    expect(migrationStartAdmission('auto_enter', true, false)).toBe('acknowledgement_required');
    expect(migrationStartAdmission('auto_enter', true, true)).toBe('allowed');
    expect(migrationStartAdmission('use_current', true, true)).toBe('allowed');
  });

  it('polls only server-directed lifecycle states using the exact delay', () => {
    expect(deploymentPollInterval({ state: 'pending', nextPollAfterMillis: 750 })).toBe(750);
    expect(deploymentPollInterval({ state: 'running', nextPollAfterMillis: 1_250 })).toBe(1_250);
    expect(deploymentPollInterval({ state: 'awaiting_restart', nextPollAfterMillis: 2_000 })).toBe(2_000);
    expect(deploymentPollInterval({ state: 'ready_to_activate', nextPollAfterMillis: 0 })).toBe(false);
    expect(deploymentPollInterval(null)).toBe(false);
  });
});
