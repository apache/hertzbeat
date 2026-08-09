/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { SETUP_PHASES } from '../model/setup-contract';
import { parseSetupStatus } from './setup-schema';

describe('setup status wire contract', () => {
  it.each(SETUP_PHASES)('parses the frozen %s phase without inventing setup state', phase => {
    expect(parseSetupStatus(statusFixture({ phase })).phase).toBe(phase);
  });

  it('preserves the local and remote access boundary from the server', () => {
    expect(parseSetupStatus(statusFixture({ access: 'local' })).access).toBe('local');
    expect(parseSetupStatus(statusFixture({ access: 'locked' })).access).toBe('locked');
    expect(parseSetupStatus(statusFixture({ access: 'unlocked' })).access).toBe('unlocked');
  });

  it.each([
    ['unknown phase', { phase: 'ready' }],
    ['secret field', { password: 'must-not-parse' }],
    ['unknown warning', { pendingWarnings: ['unsafe_warning'] }],
    ['invalid observed instant', { observedAt: 'today' }]
  ])('rejects %s', (_label, override) => {
    expect(() => parseSetupStatus(statusFixture(override))).toThrowError('Setup response was invalid');
  });
});

function statusFixture(overrides: Record<string, unknown> = {}) {
  return {
    phase: 'configuration_required',
    observedAt: '2026-08-08T06:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: {
      kind: 'h2',
      configured: false,
      source: 'built_in_default',
      restartRequired: false
    },
    telemetryStore: {
      kind: 'greptime',
      configured: false,
      source: 'built_in_default',
      restartRequired: false
    },
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
