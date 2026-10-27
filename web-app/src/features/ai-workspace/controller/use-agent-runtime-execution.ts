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

import { useCallback, type Dispatch } from 'react';
import { agentTransportFailure, type AgentTransportFailure } from '../model/agent-transport-diagnostic';
import { getAgentRun } from '../api/agent-gateway-api';
import type { AgentChatRequest, AgentTargetRef } from '../model/agent-workspace-contract';
import type { AgentWorkspaceAction } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceRefs } from './agent-workspace-refs';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import { observeActiveRun, publishAgentEvent, trackRunProgress, type RunProgress } from './agent-run-observation';
import { streamWorkspaceInput } from './agent-runtime-actions';

export function useAgentConvergence(
  history: AgentWorkspaceHistory,
  refs: AgentWorkspaceRefs,
  dispatch: Dispatch<AgentWorkspaceAction>
) {
  return useCallback(
    async (sessionUid?: string, preserveRun = false, signal?: AbortSignal) =>
      convergeAgentSession(history, refs, dispatch, sessionUid, preserveRun, signal),
    [dispatch, history, refs]
  );
}

async function convergeAgentSession(
  history: AgentWorkspaceHistory,
  refs: AgentWorkspaceRefs,
  dispatch: Dispatch<AgentWorkspaceAction>,
  sessionUid: string | undefined,
  preserveRun: boolean,
  signal: AbortSignal | undefined
) {
  const items = await history.refreshSessions(signal);
  if (convergenceCancelled(signal, refs)) return;
  const confirmed = sessionUid ?? refs.getStreamedSession();
  if (!confirmed) return;
  const session = items.find(item => item.sessionUid === confirmed);
  if (session?.conversationId) refs.setConversation(session.conversationId);
  history.selectSession(confirmed);
  const loaded = await history.loadSession(confirmed);
  if (convergenceCancelled(signal, refs)) return;
  if (!preserveRun) dispatch({ type: 'WORKSPACE_RESET' });
  if (loaded?.snapshot) {
    dispatch({
      type: 'RUN_TRANSCRIPT_RECONCILED',
      runUid: loaded.snapshot.runUid,
      assistantTexts: loaded.items
        .slice(loaded.items.map(item => item.role).lastIndexOf('user') + 1)
        .filter(item => item.role === 'assistant')
        .map(item => item.text)
    });
    dispatch({
      type: 'RUN_EVIDENCE_LOADED',
      runUid: loaded.snapshot.runUid,
      evidence: loaded.snapshot.evidence,
      executionSummary: loaded.snapshot.executionSummary
    });
  }
}

function convergenceCancelled(signal: AbortSignal | undefined, refs: AgentWorkspaceRefs) {
  return signal?.aborted === true || !refs.isMounted();
}

export function useAgentExecution(options: {
  refs: AgentWorkspaceRefs;
  language?: string;
  converge: (sessionUid?: string, preserveRun?: boolean, signal?: AbortSignal) => Promise<void>;
  dispatch: Dispatch<AgentWorkspaceAction>;
  setStreaming: Dispatch<React.SetStateAction<boolean>>;
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>;
  setTransportFailure: Dispatch<React.SetStateAction<AgentTransportFailure | undefined>>;
  setTarget: Dispatch<React.SetStateAction<AgentTargetRef | undefined>>;
}) {
  const { refs, language, converge, dispatch, setStreaming, setFailure, setTransportFailure, setTarget } = options;
  return useCallback(
    async (request: AgentChatRequest, batch?: { runUid: string; planHash: string }) => {
      const abort = new AbortController();
      refs.replaceStream(abort);
      refs.setStreamedSession();
      setStreaming(true);
      setFailure(undefined);
      setTarget(undefined);
      dispatch({ type: 'WORKSPACE_RESET' });
      try {
        const progress: RunProgress = { terminalError: false };
        const onEvent = (event: Parameters<typeof publishAgentEvent>[0]) => {
          trackRunProgress(event, progress);
          publishAgentEvent(event, refs, abort, dispatch);
          if (event.type === 'RUN_STARTED' && event.runUid) {
            void loadAuthoritativeTarget(event.runUid, abort, refs, setTarget);
          }
        };
        await streamWorkspaceInput(request, onEvent, abort.signal, language, batch);
        if (!refs.isMounted() || abort.signal.aborted) return;
        if (progress.activeRunUid) {
          await observeActiveRun(progress.activeRunUid, request.conversationId, abort, refs, dispatch, converge);
          return;
        }
        await converge(refs.getStreamedSession(), progress.terminalError, abort.signal);
        if (!progress.terminalError) refs.setLastRequest();
      } catch (error) {
        if (!abort.signal.aborted && refs.isMounted()) {
          setFailure('unavailable');
          setTransportFailure(agentTransportFailure(error));
        }
      } finally {
        refs.clearStream(abort);
        if (refs.isMounted()) setStreaming(false);
      }
    },
    [converge, dispatch, language, refs, setFailure, setTransportFailure, setStreaming, setTarget]
  );
}

async function loadAuthoritativeTarget(
  runUid: string,
  abort: AbortController,
  refs: AgentWorkspaceRefs,
  setTarget: Dispatch<React.SetStateAction<AgentTargetRef | undefined>>
) {
  try {
    const snapshot = await getAgentRun(runUid, abort.signal);
    if (!abort.signal.aborted && refs.isMounted()) setTarget(snapshot.target ?? undefined);
  } catch {
    // The stream remains authoritative for status; target metadata is optional until convergence.
  }
}

export function useAgentAfterApproval(
  runUid: string | undefined,
  refs: AgentWorkspaceRefs,
  dispatch: Dispatch<AgentWorkspaceAction>,
  converge: (sessionUid?: string, preserveRun?: boolean, signal?: AbortSignal) => Promise<void>
) {
  return useCallback(async () => {
    const conversation = refs.getConversation();
    if (!runUid || !conversation) return;
    const generation = refs.getOperationGeneration();
    const abort = new AbortController();
    const current = () => refs.isMounted() && refs.getOperationGeneration() === generation;
    const scopedRefs = { ...refs, isMounted: current };
    await observeActiveRun(runUid, conversation, abort, scopedRefs, dispatch, async (...args) => {
      if (current()) await converge(...args);
    });
  }, [converge, refs, runUid, dispatch]);
}
