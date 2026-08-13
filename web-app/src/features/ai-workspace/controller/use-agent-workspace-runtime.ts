/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useReducer, useState } from 'react';
import type { Dispatch } from 'react';

import { decideAgentApproval, stopAgentRun, streamAgentChat, submitAgentInteraction } from '../api/agent-gateway-api';
import type { AgentChatRequest, AgentGatewayEvent } from '../model/agent-workspace-contract';
import {
  agentWorkspaceReducer,
  initialAgentWorkspaceRun,
  type AgentWorkspaceAction
} from '../model/agent-workspace-reducer';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';

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
};

export function useAgentWorkspaceRuntime(history: AgentWorkspaceHistory, refs: AgentWorkspaceRefs, language?: string) {
  const [run, dispatch] = useReducer(agentWorkspaceReducer, initialAgentWorkspaceRun);
  const [composer, setComposer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [failure, setFailure] = useState<'unavailable' | undefined>(undefined);
  const converge = useAgentConvergence(history, refs, dispatch);
  const execute = useAgentExecution({
    refs,
    ...(language ? { language } : {}),
    converge,
    dispatch,
    setStreaming,
    setFailure
  });
  const retry = useCallback(async () => {
    const request = refs.getLastRequest();
    if (request && !streaming) await execute(request);
  }, [execute, refs, streaming]);
  const stop = useStopAgentRun(run.runUid, stopping, refs.isMounted, setStopping, setFailure);
  return {
    run,
    dispatch,
    composer,
    setComposer,
    streaming,
    stopping,
    failure,
    setFailure,
    execute,
    retry,
    stop,
    decideApproval: useSafeAction(decideAgentApproval, setFailure),
    submitInteraction: useSafeAction(submitAgentInteraction, setFailure)
  };
}

function useAgentConvergence(
  history: AgentWorkspaceHistory,
  refs: AgentWorkspaceRefs,
  dispatch: Dispatch<AgentWorkspaceAction>
) {
  return useCallback(
    async (sessionUid?: string) => {
      const items = await history.refreshSessions();
      const confirmed = sessionUid ?? refs.getStreamedSession();
      if (!confirmed || !refs.isMounted()) return;
      const session = items.find(item => item.sessionUid === confirmed);
      if (session?.conversationId) refs.setConversation(session.conversationId);
      history.setSelectedSessionUid(confirmed);
      await history.loadTranscript(confirmed);
      if (refs.isMounted()) dispatch({ type: 'WORKSPACE_RESET' });
    },
    [dispatch, history, refs]
  );
}

function useAgentExecution(options: {
  refs: AgentWorkspaceRefs;
  language?: string;
  converge: (sessionUid?: string) => Promise<void>;
  dispatch: Dispatch<AgentWorkspaceAction>;
  setStreaming: Dispatch<React.SetStateAction<boolean>>;
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>;
}) {
  const { refs, language, converge, dispatch, setStreaming, setFailure } = options;
  return useCallback(
    async (request: AgentChatRequest) => {
      const abort = new AbortController();
      refs.replaceStream(abort);
      refs.setStreamedSession();
      setStreaming(true);
      setFailure(undefined);
      dispatch({ type: 'WORKSPACE_RESET' });
      try {
        await streamAgentChat(request, event => publishEvent(event, refs, abort, dispatch), {
          signal: abort.signal,
          ...(language ? { language } : {})
        });
        if (!refs.isMounted() || abort.signal.aborted) return;
        await converge(refs.getStreamedSession());
        refs.setLastRequest();
      } catch {
        if (!abort.signal.aborted && refs.isMounted()) setFailure('unavailable');
      } finally {
        refs.clearStream(abort);
        if (refs.isMounted()) setStreaming(false);
      }
    },
    [converge, dispatch, language, refs, setFailure, setStreaming]
  );
}

function publishEvent(
  event: AgentGatewayEvent,
  refs: AgentWorkspaceRefs,
  abort: AbortController,
  dispatch: Dispatch<AgentWorkspaceAction>
) {
  if (!refs.isMounted() || abort.signal.aborted) return;
  if (event.sessionUid) refs.setStreamedSession(event.sessionUid);
  if (event.conversationId) refs.setConversation(event.conversationId);
  dispatch(event);
}

function useStopAgentRun(
  runUid: string | undefined,
  stopping: boolean,
  isMounted: () => boolean,
  setStopping: Dispatch<React.SetStateAction<boolean>>,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>
) {
  return useCallback(async () => {
    if (!runUid || stopping) return;
    setStopping(true);
    try {
      await stopAgentRun(runUid);
    } catch {
      setFailure('unavailable');
    } finally {
      if (isMounted()) setStopping(false);
    }
  }, [isMounted, runUid, setFailure, setStopping, stopping]);
}

function useSafeAction<T extends unknown[]>(
  action: (...args: T) => Promise<unknown>,
  setFailure: Dispatch<React.SetStateAction<'unavailable' | undefined>>
) {
  return useCallback(
    async (...args: T) => {
      try {
        await action(...args);
      } catch {
        setFailure('unavailable');
      }
    },
    [action, setFailure]
  );
}
