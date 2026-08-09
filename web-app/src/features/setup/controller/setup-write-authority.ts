/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { SetupRequestError } from '../api/setup-api';
import type { SetupStatus } from '../model/setup-contract';
import { setupWriteOutcome } from './setup-write-outcome';

type SetupWriteArea = 'configuration' | 'administrator' | 'unlock';
export type SetupWriteAuthority = 'current' | 'rejected_refresh_required' | 'uncertain_refresh_required';

const directInputRejections: Record<SetupWriteArea, ReadonlySet<string>> = {
  configuration: new Set(['invalid_request']),
  administrator: new Set(['invalid_request', 'administrator_username_invalid']),
  unlock: new Set(['invalid_request', 'setup_code_invalid', 'setup_code_expired'])
};

export function setupWriteAuthority(error: unknown, area: SetupWriteArea): SetupWriteAuthority {
  const settlement = setupWriteOutcome(error) === 'definite_rejection' ? 'rejected' : 'uncertain';
  const currentAuthority =
    settlement === 'rejected' &&
    error instanceof SetupRequestError &&
    Boolean(error.errorCode && directInputRejections[area].has(error.errorCode));
  if (currentAuthority) return 'current';
  return settlement === 'rejected' ? 'rejected_refresh_required' : 'uncertain_refresh_required';
}

export function configurationRetryAllowed(status: SetupStatus | null) {
  if (!status || status.access === 'locked' || status.operationId) return false;
  return status.phase === 'configuration_required' || status.phase === 'external_apply_required';
}

export function configurationSubmissionAllowed(status: SetupStatus, operationState?: string) {
  if (status.access === 'locked') return false;
  const configurationPhase = status.phase === 'configuration_required' || status.phase === 'external_apply_required';
  if (!configurationPhase) return false;
  if (!status.operationId) return true;
  return status.phase === 'external_apply_required' && operationState === 'awaiting_external_apply';
}

export function administratorRetryAllowed(status: SetupStatus | null) {
  return Boolean(
    status &&
    status.access !== 'locked' &&
    status.phase === 'administrator_required' &&
    !status.operationId &&
    !status.administratorConfigured
  );
}

export function setupAuthorityFingerprint(status: SetupStatus) {
  return [
    status.phase,
    status.access,
    status.operationId ?? 'none',
    status.errorCode ?? 'none',
    status.administratorConfigured ? 'administrator' : 'no-administrator'
  ].join('|');
}
