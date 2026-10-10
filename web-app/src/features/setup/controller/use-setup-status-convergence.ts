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

import { useEffect } from 'react';

import type { SetupPhase } from '../model/setup-contract';
import type { SetupConfigurationAcknowledgement, SetupOperation } from '../model/setup-responses';
import { setupPollDelay } from './setup-poll-backoff';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';

export function useSetupStatusConvergence(
  acknowledgement: SetupConfigurationAcknowledgement | null,
  serverPhase: SetupPhase,
  operation: Pick<SetupOperation, 'state' | 'nextPollAfterMillis'> | null,
  refetchStatus: SetupStatusRefresh
) {
  useEffect(() => {
    if (!shouldConvergeStatus(acknowledgement, serverPhase, operation)) return;
    const hint = acknowledgement?.nextPollAfterMillis ?? operation?.nextPollAfterMillis ?? 0;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let failedAttempts = 0;
    const schedule = () => {
      timer = setTimeout(() => void tick(), setupPollDelay(hint, failedAttempts));
    };
    const tick = async () => {
      if (!active) return;
      const refresh = await safeSetupStatusRefresh(refetchStatus);
      failedAttempts = refresh.succeeded ? 0 : failedAttempts + 1;
      // Schedule only after settlement so slow or rejected requests can never overlap.
      if (active) schedule();
    };
    schedule();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [acknowledgement, operation, refetchStatus, serverPhase]);
}

function shouldConvergeStatus(
  acknowledgement: SetupConfigurationAcknowledgement | null,
  serverPhase: SetupPhase,
  operation: Pick<SetupOperation, 'state'> | null
) {
  if (isTerminal(operation?.state)) return false;
  if (serverPhase === 'application_starting') return true;
  if (acknowledgement?.state === 'awaiting_external_apply') {
    return serverPhase === 'configuration_required' || serverPhase === 'external_apply_required';
  }
  const restartPending = acknowledgement?.state === 'awaiting_restart' || operation?.state === 'awaiting_restart';
  return restartPending && serverPhase === 'configuration_required';
}

function isTerminal(state: string | undefined) {
  return state === 'succeeded' || state === 'failed' || state === 'rolled_back';
}
