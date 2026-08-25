/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useMemo } from 'react';

import type { AgentRetryRequest, AgentSourceTarget } from '../model/agent-workspace-contract';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { runStatusEvent } from './agent-run-observation';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import type { AgentWorkspaceRefs, useAgentWorkspaceRuntime } from './use-agent-workspace-runtime';

type Runtime = ReturnType<typeof useAgentWorkspaceRuntime>;

export function useAgentWorkspaceActions(
  history: AgentWorkspaceHistory,
  runtime: Runtime,
  refs: AgentWorkspaceRefs,
  target?: AgentSourceTarget,
  invalidTarget = false
): AgentWorkspaceViewModel['actions'] {
  const selectSession = useSelectSession(history, runtime, refs);
  const newInvestigation = useCallback(() => {
    refs.bumpOperationGeneration();
    runtime.resetTransientOperations();
    refs.replaceStream();
    refs.setConversation();
    refs.setStreamedSession();
    refs.setLastRequest();
    history.selectSession(undefined);
    history.setTranscript({ status: 'ready', items: [] });
    history.setDraftMessages([]);
    runtime.setComposer('');
    runtime.setFailure(undefined);
    runtime.setTarget(undefined);
    runtime.dispatch({ type: 'WORKSPACE_RESET' });
  }, [history, refs, runtime]);
  const send = useSendInvestigation(history, runtime, refs, target, invalidTarget);
  return useMemo(
    () => ({
      selectSession,
      newInvestigation,
      setComposer: runtime.setComposer,
      send,
      stop: runtime.stop,
      retry: runtime.retry,
      recover: runtime.recover,
      decideApproval: runtime.decideApproval,
      submitInteraction: runtime.submitInteraction
    }),
    [newInvestigation, runtime, selectSession, send]
  );
}

function useSelectSession(history: AgentWorkspaceHistory, runtime: Runtime, refs: AgentWorkspaceRefs) {
  return useCallback(
    async (sessionUid: string) => {
      refs.bumpOperationGeneration();
      runtime.resetTransientOperations();
      const session = history.sessions.items.find(item => item.sessionUid === sessionUid);
      refs.replaceStream();
      refs.setConversation(session?.conversationId ?? undefined);
      history.selectSession(sessionUid);
      runtime.setFailure(undefined);
      runtime.setTarget(undefined);
      history.setDraftMessages([]);
      runtime.dispatch({ type: 'WORKSPACE_RESET' });
      const loaded = await history.loadSession(sessionUid);
      if (!loaded?.snapshot || !session?.conversationId) return;
      history.mergeSessionSnapshot(loaded.snapshot);
      runtime.setTarget(loaded.snapshot.target ?? undefined);
      const retryRequest = loaded.snapshot.retryRequest;
      refs.setLastRequest(retryRequest ? retryChatRequest(retryRequest) : undefined);
      const resultAlreadyVisible = Boolean(
        loaded.snapshot.result &&
        loaded.items.some(item => item.role === 'assistant' && item.text === loaded.snapshot?.result)
      );
      runtime.dispatch(
        runStatusEvent(
          loaded.snapshot,
          session.conversationId,
          loaded.snapshot.status === 'CREATED' || loaded.snapshot.status === 'RUNNING',
          resultAlreadyVisible,
          Boolean(retryRequest)
        )
      );
    },
    [history, refs, runtime]
  );
}

function retryChatRequest(retryRequest: AgentRetryRequest) {
  return {
    conversationId: retryRequest.conversationId,
    messageId: retryRequest.messageId,
    message: retryRequest.message,
    ...(retryRequest.target ? { target: retryRequest.target } : {}),
    attachments: retryRequest.attachments,
    preferredLanguage: retryRequest.preferredLanguage
  };
}

function useSendInvestigation(
  history: AgentWorkspaceHistory,
  runtime: Runtime,
  refs: AgentWorkspaceRefs,
  target?: AgentSourceTarget,
  invalidTarget = false
) {
  return useCallback(async () => {
    const message = runtime.composer.trim();
    if (!message || runtime.streaming || invalidTarget) return;
    const conversationId = refs.getConversation() ?? crypto.randomUUID();
    refs.setConversation(conversationId);
    const request = {
      conversationId,
      messageId: crypto.randomUUID(),
      message,
      ...(target ? { target } : {}),
      attachments: []
    };
    refs.setLastRequest(request);
    runtime.setComposer('');
    history.setDraftMessages(current => [...current, { id: request.messageId, role: 'user', text: message }]);
    await runtime.execute(request);
  }, [history, invalidTarget, refs, runtime, target]);
}
