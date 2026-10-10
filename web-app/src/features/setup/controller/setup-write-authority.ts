/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
