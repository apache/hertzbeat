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

import { useCallback } from 'react';
import { getAgentBatch } from '../api/agent-batch-api';
import type { AgentChatRequest } from '../model/agent-workspace-contract';
import type { AgentWorkspaceRunState } from '../model/agent-run-state';
import type { AgentWorkspaceRefs } from './agent-workspace-refs';

export function useAgentRecovery(
  run: AgentWorkspaceRunState,
  refs: AgentWorkspaceRefs,
  execute: (request: AgentChatRequest) => Promise<void>,
  streaming: boolean,
  failure: 'unavailable' | undefined
) {
  const recover = useCallback(async () => {
    const request = refs.getLastRequest();
    const activeRecovery = run.status === 'running' && run.recoveryAvailable === true;
    if (!request || streaming || run.status === 'complete' || (failure !== 'unavailable' && !activeRecovery)) return;
    await execute(request);
  }, [execute, failure, refs, run.recoveryAvailable, run.status, streaming]);
  const retry = useCallback(async () => {
    const request = refs.getLastRequest();
    if (!request || streaming || run.status !== 'error' || run.retryAvailable !== true) return;
    if (run.runUid && (await getAgentBatch(run.runUid))) return;
    const nextRequest = { ...request, messageId: crypto.randomUUID() };
    refs.setLastRequest(nextRequest);
    await execute(nextRequest);
  }, [execute, refs, run.retryAvailable, run.runUid, run.status, streaming]);
  return { recover, retry };
}
