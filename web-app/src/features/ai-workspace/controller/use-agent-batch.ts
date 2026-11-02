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

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stopAgentRun } from '../api/agent-gateway-api';
import { getAgentBatch } from '../api/agent-batch-api';
import { agentWorkspaceQueryKeys, type AgentBatchProgress, type AgentBatchView } from '../model/agent-batch';

export function useAgentBatch(
  runUid: string | undefined,
  execute: (batch: { runUid: string; planHash: string }) => Promise<void>
): AgentBatchView {
  const query = useQuery({
    queryKey: agentWorkspaceQueryKeys.batch(runUid),
    queryFn: ({ signal }) => (runUid ? getAgentBatch(runUid, signal) : Promise.resolve(null)),
    enabled: Boolean(runUid),
    staleTime: 0,
    retry: false,
    refetchInterval: current => (current.state.data?.stage === 'COMPLETE' ? false : 1000)
  });
  const progress = query.data ?? undefined;
  const stop = useBatchStop(runUid, query.refetch);
  const continuation = useExplicitContinuation(runUid, progress, execute, query.refetch);
  return {
    ...(progress ? { progress } : {}),
    busy: continuation.busy,
    stopping: stop.busy,
    stop: stop.execute,
    unavailable: query.isError || continuation.failed || stop.failed,
    continue: continuation.execute
  };
}
function useExplicitContinuation(
  runUid: string | undefined,
  progress: AgentBatchProgress | undefined,
  execute: (batch: { runUid: string; planHash: string }) => Promise<void>,
  refetch: () => Promise<unknown>
) {
  const pending = useRef(false);
  const scope = useRef(runUid);
  useLayoutEffect(() => {
    scope.current = runUid;
  }, [runUid]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const continueBatch = useCallback(async () => {
    if (pending.current || !runUid || !progress) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const current = await getAgentBatch(runUid);
      if (scope.current !== runUid || !sameDisplayedBatch(current, progress)) return;
      const source =
        current.stage === 'RUNNING' || current.stage === 'WAITING_APPROVAL' ? current.resumeFromRunUid : current.runUid;
      await execute({ runUid: source, planHash: current.planHash });
    } catch {
      if (scope.current === runUid) setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
      void refetch();
    }
  }, [execute, progress, refetch, runUid]);
  return { busy, failed, execute: continueBatch };
}

function sameDisplayedBatch(
  current: AgentBatchProgress | null,
  displayed: AgentBatchProgress
): current is AgentBatchProgress {
  return Boolean(
    current && mayConnect(current) && current.runUid === displayed.runUid && current.planHash === displayed.planHash
  );
}
function mayConnect(progress: AgentBatchProgress) {
  return (
    progress.runStatus !== 'CANCELLED' &&
    (progress.nextAction !== 'NONE' || progress.stage === 'RUNNING' || progress.stage === 'WAITING_APPROVAL')
  );
}

function useBatchStop(runUid: string | undefined, refetch: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const scope = useRef(runUid);
  useLayoutEffect(() => {
    scope.current = runUid;
  }, [runUid]);
  const execute = useCallback(async () => {
    if (!runUid || pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const current = await getAgentBatch(runUid);
      if (scope.current !== runUid || !current || !['RUNNING', 'WAITING_APPROVAL'].includes(current.stage)) return;
      await stopAgentRun(current.runUid);
    } catch {
      if (scope.current === runUid) setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
      void refetch();
    }
  }, [refetch, runUid]);
  return { busy, failed, execute };
}
