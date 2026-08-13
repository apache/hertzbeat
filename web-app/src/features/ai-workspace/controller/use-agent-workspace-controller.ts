/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useMemo, useRef } from 'react';

import type { AgentChatRequest, AgentTargetRef } from '../model/agent-workspace-contract';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { useAgentWorkspaceActions } from './use-agent-workspace-actions';
import { useAgentWorkspaceHistory } from './use-agent-workspace-history';
import { useAgentWorkspaceRuntime, type AgentWorkspaceRefs } from './use-agent-workspace-runtime';

export function useAgentWorkspaceController({
  target,
  language
}: {
  target?: AgentTargetRef | undefined;
  language?: string | undefined;
} = {}): AgentWorkspaceViewModel {
  const refs = useWorkspaceRefs();
  const history = useAgentWorkspaceHistory(refs.isMounted);
  const runtime = useAgentWorkspaceRuntime(history, refs, language);
  const actions = useAgentWorkspaceActions(history, runtime, refs, target);
  useWorkspaceLifecycle(history.refreshSessions, refs);
  return {
    sessions: history.sessions,
    ...(history.selectedSessionUid ? { selectedSessionUid: history.selectedSessionUid } : {}),
    transcript: history.transcript,
    draftMessages: history.draftMessages,
    run: runtime.run,
    ...(target ? { target } : {}),
    composer: runtime.composer,
    streaming: runtime.streaming,
    stopping: runtime.stopping,
    ...(runtime.failure ? { failure: runtime.failure } : {}),
    actions
  };
}

function useWorkspaceRefs(): AgentWorkspaceRefs {
  const mounted = useRef(true);
  const streamAbort = useRef<AbortController | undefined>(undefined);
  const lastRequest = useRef<AgentChatRequest | undefined>(undefined);
  const conversation = useRef<string | undefined>(undefined);
  const streamedSession = useRef<string | undefined>(undefined);
  return useMemo(
    () => ({
      isMounted: () => mounted.current,
      setMounted: (value: boolean) => {
        mounted.current = value;
      },
      replaceStream: (value?: AbortController) => {
        streamAbort.current?.abort();
        streamAbort.current = value;
      },
      clearStream: (expected: AbortController) => {
        if (streamAbort.current === expected) streamAbort.current = undefined;
      },
      getLastRequest: () => lastRequest.current,
      setLastRequest: (value?: AgentChatRequest) => {
        lastRequest.current = value;
      },
      getConversation: () => conversation.current,
      setConversation: (value?: string) => {
        conversation.current = value;
      },
      getStreamedSession: () => streamedSession.current,
      setStreamedSession: (value?: string) => {
        streamedSession.current = value;
      }
    }),
    []
  );
}

function useWorkspaceLifecycle(refreshSessions: (signal?: AbortSignal) => Promise<unknown>, refs: AgentWorkspaceRefs) {
  useEffect(() => {
    refs.setMounted(true);
    const abort = new AbortController();
    void refreshSessions(abort.signal);
    return () => {
      refs.setMounted(false);
      abort.abort();
      refs.replaceStream();
    };
  }, [refreshSessions, refs]);
}
