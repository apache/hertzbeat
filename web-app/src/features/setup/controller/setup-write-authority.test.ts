/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { SetupRequestError } from '../api/setup-api';
import type { SetupStatus } from '../model/setup-contract';
import {
  administratorRetryAllowed,
  configurationRetryAllowed,
  configurationSubmissionAllowed,
  setupAuthorityFingerprint,
  setupWriteAuthority
} from './setup-write-authority';

describe('setup write authority', () => {
  it('separates rejected settlement from authority refresh requirements', () => {
    expect(setupWriteAuthority(new SetupRequestError('http', 409, 'operation_conflict'), 'configuration')).toBe(
      'rejected_refresh_required'
    );
    expect(setupWriteAuthority(new SetupRequestError('unavailable'), 'configuration')).toBe(
      'uncertain_refresh_required'
    );
    expect(setupWriteAuthority(new SetupRequestError('http', 400, 'invalid_request'), 'configuration')).toBe('current');
    expect(
      setupWriteAuthority(new SetupRequestError('http', 409, 'administrator_username_invalid'), 'administrator')
    ).toBe('current');
  });

  it.each([
    ['setup locked', 'setup_locked', 'configuration'],
    ['operation conflict', 'operation_conflict', 'configuration'],
    ['configuration recovery', 'config_recovery_required', 'configuration'],
    ['administrator exists', 'administrator_already_configured', 'administrator'],
    ['setup complete', 'setup_complete', 'administrator']
  ] as const)('requires rejected authority refresh for %s', (_label, errorCode, area) => {
    expect(setupWriteAuthority(new SetupRequestError('http', 409, errorCode), area)).toBe('rejected_refresh_required');
  });

  it('allows configuration retry only from an accessible configuration phase without an operation', () => {
    expect(configurationRetryAllowed(statusFixture())).toBe(true);
    expect(configurationRetryAllowed(statusFixture({ access: 'locked' }))).toBe(false);
    expect(configurationRetryAllowed(statusFixture({ operationId: 'active' }))).toBe(false);
    expect(configurationRetryAllowed(statusFixture({ phase: 'recovery_required' }))).toBe(false);
  });

  it('allows administrator retry only while authority still requires an administrator', () => {
    const administrator = statusFixture({ phase: 'administrator_required' });
    expect(administratorRetryAllowed(administrator)).toBe(true);
    expect(administratorRetryAllowed({ ...administrator, administratorConfigured: true })).toBe(false);
    expect(administratorRetryAllowed({ ...administrator, operationId: 'active' })).toBe(false);
  });

  it('blocks active configuration operations while preserving an awaiting external export', () => {
    expect(configurationSubmissionAllowed(statusFixture({ operationId: 'pending' }), 'pending')).toBe(false);
    expect(configurationSubmissionAllowed(statusFixture({ operationId: 'running' }), 'running')).toBe(false);
    expect(
      configurationSubmissionAllowed(
        statusFixture({ phase: 'external_apply_required', operationId: 'external' }),
        'awaiting_external_apply'
      )
    ).toBe(true);
  });

  it('does not treat a timestamp-only refresh as new configuration authority', () => {
    expect(setupAuthorityFingerprint(statusFixture({ observedAt: '2026-08-09T00:00:01Z' }))).toBe(
      setupAuthorityFingerprint(statusFixture())
    );
  });

  it('does not treat a timestamp-only refresh as new administrator authority', () => {
    const administrator = statusFixture({ phase: 'administrator_required' });
    expect(setupAuthorityFingerprint({ ...administrator, observedAt: '2026-08-09T00:00:01Z' })).toBe(
      setupAuthorityFingerprint(administrator)
    );
  });
});

function statusFixture(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return {
    phase: 'configuration_required',
    observedAt: '2026-08-09T00:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: { kind: 'h2', configured: false, source: 'built_in_default', restartRequired: false },
    telemetryStore: { kind: 'greptime', configured: false, source: 'built_in_default', restartRequired: false },
    administratorConfigured: false,
    optional: {
      publicBaseUrlConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: [],
    ...overrides
  };
}
