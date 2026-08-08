/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { SetupErrorCode, SetupPhase } from './setup-contract';
import type { SetupValidationSection } from './setup-configuration';
import type { SetupOperation, SetupValidationResult } from './setup-responses';

export type SetupConfigurationWorkflowState =
  | 'editing'
  | 'external-resume'
  | 'external-waiting'
  | 'waiting'
  | 'recovery'
  | 'migration'
  | 'failed'
  | 'poll-unavailable'
  | 'poll-contract'
  | 'poll-error';

export type SetupRequestFailureKind = 'unavailable' | 'contract' | 'error';
export type SetupRequestFailure = { failure: SetupRequestFailureKind; errorCode: SetupErrorCode | null };

export type SetupSectionValidation =
  | { state: 'idle' }
  | { state: 'checking' }
  | ({ state: 'complete' } & SetupValidationResult)
  | { state: 'failed'; failure: SetupRequestFailureKind; errorCode: SetupErrorCode | null };

export type SetupSectionValidationMap = Record<SetupValidationSection, SetupSectionValidation>;

const phaseWorkflowStates: Partial<Record<SetupPhase, SetupConfigurationWorkflowState>> = {
  application_starting: 'waiting',
  recovery_required: 'recovery',
  migration_in_progress: 'migration'
};

export function configurationWorkflowState(
  phase: SetupPhase,
  operation: Pick<SetupOperation, 'state'> | null,
  pollFailure: SetupRequestFailureKind | null = null,
  externalResume = false
): SetupConfigurationWorkflowState {
  if (pollFailure) return `poll-${pollFailure}`;
  if (operation?.state === 'failed' || operation?.state === 'rolled_back') return 'failed';
  if (phase === 'external_apply_required') return externalResume ? 'external-resume' : 'external-waiting';
  return phaseWorkflowStates[phase] ?? 'editing';
}
