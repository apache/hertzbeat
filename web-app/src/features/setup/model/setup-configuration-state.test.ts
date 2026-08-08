/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { configurationWorkflowState } from './setup-configuration-state';

describe('setup configuration workflow state', () => {
  it.each([
    ['configuration_required', 'editing'],
    ['external_apply_required', 'external-waiting'],
    ['application_starting', 'waiting'],
    ['recovery_required', 'recovery'],
    ['migration_in_progress', 'migration']
  ] as const)('maps server phase %s to %s', (phase, expected) => {
    expect(configurationWorkflowState(phase, null)).toBe(expected);
  });

  it('prefers failed operation evidence over a generic server phase', () => {
    expect(configurationWorkflowState('application_starting', { state: 'failed' }, null)).toBe('failed');
    expect(configurationWorkflowState('recovery_required', { state: 'rolled_back' }, null)).toBe('failed');
  });

  it('distinguishes refresh re-entry from a locally acknowledged external operation', () => {
    expect(configurationWorkflowState('external_apply_required', null, null, true)).toBe('external-resume');
    expect(configurationWorkflowState('external_apply_required', null, null, false)).toBe('external-waiting');
  });

  it.each([
    ['unavailable', 'poll-unavailable'],
    ['contract', 'poll-contract'],
    ['error', 'poll-error']
  ] as const)('surfaces %s operation polling failure', (failure, expected) => {
    expect(configurationWorkflowState('application_starting', null, failure)).toBe(expected);
  });
});
