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

import { useEffect, useRef } from 'react';

import type { SetupOperation } from '../model/setup-responses';
import { setupPollDelay } from './setup-poll-backoff';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';
import { configurationRetryAllowed } from './setup-write-authority';

type TerminalOperation = Pick<SetupOperation, 'state'>;

export function useSetupOperationLifecycle(
  operationId: string | null,
  operation: TerminalOperation | null,
  refetchStatus: SetupStatusRefresh,
  retireFailedOperationSecrets: () => void,
  settleFailedOperation: () => void,
  reopen: () => void
) {
  const settled = useRef<string | null>(null);
  const retired = useRef<string | null>(null);
  useEffect(() => {
    if (!operationId || !isTerminal(operation?.state)) return;
    const fingerprint = `${operationId}:${operation.state}`;
    if (settled.current === fingerprint) return;
    if (operation.state !== 'succeeded' && retired.current !== fingerprint) {
      retired.current = fingerprint;
      retireFailedOperationSecrets();
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const converge = async () => {
      const refresh = await safeSetupStatusRefresh(refetchStatus);
      if (!active) return;
      if (!refresh.succeeded || refresh.status.operationId === operationId) {
        timer = setTimeout(() => void converge(), setupPollDelay(0, attempt));
        attempt += 1;
        return;
      }
      const authoritative = refresh.status;
      settled.current = fingerprint;
      if (operation.state !== 'succeeded') {
        settleFailedOperation();
        if (configurationRetryAllowed(authoritative)) reopen();
      }
    };
    void converge();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [operation?.state, operationId, refetchStatus, reopen, retireFailedOperationSecrets, settleFailedOperation]);
}

function isTerminal(state: string | undefined): state is 'succeeded' | 'failed' | 'rolled_back' {
  return state === 'succeeded' || state === 'failed' || state === 'rolled_back';
}
