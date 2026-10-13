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

import type { SetupStatus } from '../model/setup-contract';
import { setupPollDelay } from './setup-poll-backoff';
import { safeSetupStatusRefresh, type SetupStatusRefresh } from './setup-status-refresh';

export function useSetupStatusAuthorityConvergence(
  active: boolean,
  refetchStatus: SetupStatusRefresh,
  converged: (status: SetupStatus) => boolean
) {
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failedAttempts = 0;
    const refresh = async () => {
      const result = await safeSetupStatusRefresh(() => refetchStatus(controller.signal));
      if (controller.signal.aborted || (result.succeeded && converged(result.status))) return;
      const delay = setupPollDelay(0, result.succeeded ? 0 : failedAttempts);
      failedAttempts = result.succeeded ? 0 : failedAttempts + 1;
      timer = setTimeout(() => void refresh(), delay);
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, converged, refetchStatus]);
}
