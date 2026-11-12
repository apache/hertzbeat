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
import type { Dispatch } from 'react';

import { streamAgentBatch } from '../api/agent-batch-api';
import { stopAgentRun, streamAgentChat } from '../api/agent-gateway-api';

type OperationRefs = {
  isMounted: () => boolean;
  getOperationGeneration: () => number;
};

export function useStopAgentRun(
  runUid: string | undefined,
  stopping: boolean,
  refs: OperationRefs,
  setStopping: Dispatch<React.SetStateAction<boolean>>,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>
) {
  return useCallback(async () => {
    if (!runUid || stopping) return;
    const generation = refs.getOperationGeneration();
    setStopping(true);
    try {
      await stopAgentRun(runUid);
    } catch {
      if (currentOperation(refs, generation)) setFailure('unavailable');
    } finally {
      if (currentOperation(refs, generation)) setStopping(false);
    }
  }, [refs, runUid, setFailure, setStopping, stopping]);
}

export function useSafeAgentAction<T extends unknown[]>(
  action: (...args: T) => Promise<unknown>,
  refs: OperationRefs,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>,
  afterSuccess?: () => Promise<void>
) {
  return useCallback(
    async (...args: T) => {
      const generation = refs.getOperationGeneration();
      try {
        await action(...args);
        if (currentOperation(refs, generation)) await afterSuccess?.();
      } catch {
        if (currentOperation(refs, generation)) setFailure('unavailable');
      }
    },
    [action, afterSuccess, refs, setFailure]
  );
}

function currentOperation(refs: OperationRefs, generation: number) {
  return refs.isMounted() && refs.getOperationGeneration() === generation;
}

export function useBatchExecution(
  refs: { getConversation: () => string | undefined; setLastRequest: () => void },
  execute: (
    request: import('../model/agent-workspace-contract').AgentChatRequest,
    batch?: { runUid: string; planHash: string }
  ) => Promise<void>,
  streaming: boolean
) {
  return useCallback(
    async (batch: { runUid: string; planHash: string }) => {
      const conversationId = refs.getConversation();
      if (!conversationId || streaming) return;
      refs.setLastRequest();
      await execute({ conversationId, messageId: `batch:${batch.runUid}`, message: '', attachments: [] }, batch);
    },
    [execute, refs, streaming]
  );
}

export async function streamWorkspaceInput(
  request: import('../model/agent-workspace-contract').AgentChatRequest,
  onEvent: (event: import('../model/agent-workspace-contract').AgentGatewayEvent) => void,
  signal: AbortSignal,
  language: string | undefined,
  batch?: { runUid: string; planHash: string }
) {
  if (batch) return streamAgentBatch(batch, onEvent, signal, language);
  const preferredLanguage = request.preferredLanguage ?? language;
  return streamAgentChat(request, onEvent, { signal, ...(preferredLanguage ? { language: preferredLanguage } : {}) });
}
