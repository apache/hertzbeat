/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useMemo, useRef } from 'react';

import type { AgentChatRequest, AgentSourceTarget } from '../model/agent-workspace-contract';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { useAgentWorkspaceActions } from './use-agent-workspace-actions';
import { useAgentWorkspaceHistory } from './use-agent-workspace-history';
import { useAgentWorkspaceRuntime, type AgentWorkspaceRefs } from './use-agent-workspace-runtime';

export function useAgentWorkspaceController({
  target,
  contextKey,
  invalidTarget = false,
  language
}: {
  target?: AgentSourceTarget | undefined;
  contextKey?: string | undefined;
  invalidTarget?: boolean | undefined;
  language?: string | undefined;
} = {}): AgentWorkspaceViewModel {
  const refs = useWorkspaceRefs();
  const history = useAgentWorkspaceHistory(refs.isMounted);
  const runtime = useAgentWorkspaceRuntime(history, refs, language);
  const actions = useAgentWorkspaceActions(history, runtime, refs, target, invalidTarget);
  useWorkspaceLifecycle(history.refreshSessions, history.cancelSessionLoad, refs);
  useSourceTargetLifecycle(contextKey ?? (target ? JSON.stringify(target) : 'none'), actions.newInvestigation);
  const displayedTarget = runtime.target ?? (runtime.run.status === 'idle' ? target : undefined);
  return {
    sessions: history.sessions,
    ...(history.selectedSessionUid ? { selectedSessionUid: history.selectedSessionUid } : {}),
    transcript: history.transcript,
    draftMessages: history.draftMessages,
    run: runtime.run,
    ...(displayedTarget ? { target: displayedTarget } : {}),
    invalidTarget,
    composer: runtime.composer,
    streaming: runtime.streaming,
    stopping: runtime.stopping,
    ...(runtime.failure ? { failure: runtime.failure } : {}),
    actions
  };
}

function useSourceTargetLifecycle(key: string, reset: () => void) {
  const current = useRef<{ initialized: boolean; key?: string }>({ initialized: false });
  useEffect(() => {
    if (!current.current.initialized) {
      current.current = { initialized: true, key };
      return;
    }
    if (current.current.key !== key) {
      current.current = { initialized: true, key };
      reset();
    }
  }, [key, reset]);
}

function useWorkspaceRefs(): AgentWorkspaceRefs {
  const mounted = useRef(true);
  const streamAbort = useRef<AbortController | undefined>(undefined);
  const lastRequest = useRef<AgentChatRequest | undefined>(undefined);
  const conversation = useRef<string | undefined>(undefined);
  const streamedSession = useRef<string | undefined>(undefined);
  const operationGeneration = useRef(0);
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
      },
      getOperationGeneration: () => operationGeneration.current,
      bumpOperationGeneration: () => {
        operationGeneration.current += 1;
        return operationGeneration.current;
      }
    }),
    []
  );
}

function useWorkspaceLifecycle(
  refreshSessions: (signal?: AbortSignal) => Promise<unknown>,
  cancelSessionLoad: () => void,
  refs: AgentWorkspaceRefs
) {
  useEffect(() => {
    refs.setMounted(true);
    const abort = new AbortController();
    void refreshSessions(abort.signal);
    return () => {
      refs.setMounted(false);
      abort.abort();
      cancelSessionLoad();
      refs.replaceStream();
    };
  }, [cancelSessionLoad, refreshSessions, refs]);
}
