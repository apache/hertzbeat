/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useReducer, useState } from 'react';
import type { Dispatch } from 'react';

import { decideAgentApproval, getAgentRun, streamAgentChat, submitAgentInteraction } from '../api/agent-gateway-api';
import type { AgentChatRequest, AgentTargetRef } from '../model/agent-workspace-contract';
import {
  agentWorkspaceReducer,
  initialAgentWorkspaceRun,
  type AgentWorkspaceAction
} from '../model/agent-workspace-reducer';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import { observeActiveRun, publishAgentEvent, trackRunProgress, type RunProgress } from './agent-run-observation';
import { useSafeAgentAction, useStopAgentRun } from './agent-runtime-actions';

export type AgentWorkspaceRefs = {
  isMounted: () => boolean;
  setMounted: (value: boolean) => void;
  replaceStream: (value?: AbortController) => void;
  clearStream: (expected: AbortController) => void;
  getLastRequest: () => AgentChatRequest | undefined;
  setLastRequest: (value?: AgentChatRequest) => void;
  getConversation: () => string | undefined;
  setConversation: (value?: string) => void;
  getStreamedSession: () => string | undefined;
  setStreamedSession: (value?: string) => void;
  getOperationGeneration: () => number;
  bumpOperationGeneration: () => number;
};

export function useAgentWorkspaceRuntime(history: AgentWorkspaceHistory, refs: AgentWorkspaceRefs, language?: string) {
  const [run, dispatch] = useReducer(agentWorkspaceReducer, initialAgentWorkspaceRun);
  const [composer, setComposer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [failure, setFailure] = useState<'unavailable' | undefined>(undefined);
  const [target, setTarget] = useState<AgentTargetRef | undefined>(undefined);
  const converge = useAgentConvergence(history, refs, dispatch);
  const execute = useAgentExecution({
    refs,
    ...(language ? { language } : {}),
    converge,
    dispatch,
    setStreaming,
    setFailure,
    setTarget
  });
  const recover = useCallback(async () => {
    const request = refs.getLastRequest();
    const activeRecovery = run.status === 'running' && run.recoveryAvailable === true;
    if (!request || streaming || (failure !== 'unavailable' && !activeRecovery)) return;
    await execute(request);
  }, [execute, failure, refs, run.recoveryAvailable, run.status, streaming]);
  const retry = useCallback(async () => {
    const request = refs.getLastRequest();
    if (!request || streaming || run.status !== 'error' || run.retryAvailable !== true) return;
    const nextRequest = { ...request, messageId: crypto.randomUUID() };
    refs.setLastRequest(nextRequest);
    await execute(nextRequest);
  }, [execute, refs, run.retryAvailable, run.status, streaming]);
  const stop = useStopAgentRun(run.runUid, stopping, refs, setStopping, setFailure);
  return {
    run,
    dispatch,
    composer,
    setComposer,
    streaming,
    stopping,
    failure,
    setFailure,
    resetTransientOperations: () => {
      setStopping(false);
      setFailure(undefined);
    },
    target,
    setTarget,
    execute,
    recover,
    retry,
    stop,
    decideApproval: useSafeAgentAction(decideAgentApproval, refs, setFailure),
    submitInteraction: useSafeAgentAction(submitAgentInteraction, refs, setFailure)
  };
}

function useAgentConvergence(
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
  await history.loadSession(confirmed);
  if (!convergenceCancelled(signal, refs) && !preserveRun) dispatch({ type: 'WORKSPACE_RESET' });
}

function convergenceCancelled(signal: AbortSignal | undefined, refs: AgentWorkspaceRefs) {
  return signal?.aborted === true || !refs.isMounted();
}

function useAgentExecution(options: {
  refs: AgentWorkspaceRefs;
  language?: string;
  converge: (sessionUid?: string, preserveRun?: boolean, signal?: AbortSignal) => Promise<void>;
  dispatch: Dispatch<AgentWorkspaceAction>;
  setStreaming: Dispatch<React.SetStateAction<boolean>>;
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>;
  setTarget: Dispatch<React.SetStateAction<AgentTargetRef | undefined>>;
}) {
  const { refs, language, converge, dispatch, setStreaming, setFailure, setTarget } = options;
  return useCallback(
    async (request: AgentChatRequest) => {
      const abort = new AbortController();
      refs.replaceStream(abort);
      refs.setStreamedSession();
      setStreaming(true);
      setFailure(undefined);
      setTarget(undefined);
      dispatch({ type: 'WORKSPACE_RESET' });
      try {
        const progress: RunProgress = { terminalError: false };
        await streamAgentChat(
          request,
          event => {
            trackRunProgress(event, progress);
            publishAgentEvent(event, refs, abort, dispatch);
            if (event.type === 'RUN_STARTED' && event.runUid) {
              void loadAuthoritativeTarget(event.runUid, abort, refs, setTarget);
            }
          },
          {
            signal: abort.signal,
            ...((request.preferredLanguage ?? language) ? { language: request.preferredLanguage ?? language } : {})
          }
        );
        if (!refs.isMounted() || abort.signal.aborted) return;
        if (progress.activeRunUid) {
          await observeActiveRun(progress.activeRunUid, request.conversationId, abort, refs, dispatch, converge);
          return;
        }
        await converge(refs.getStreamedSession(), progress.terminalError, abort.signal);
        if (!progress.terminalError) refs.setLastRequest();
      } catch {
        if (!abort.signal.aborted && refs.isMounted()) setFailure('unavailable');
      } finally {
        refs.clearStream(abort);
        if (refs.isMounted()) setStreaming(false);
      }
    },
    [converge, dispatch, language, refs, setFailure, setStreaming, setTarget]
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
