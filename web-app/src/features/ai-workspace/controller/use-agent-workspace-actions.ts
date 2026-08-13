/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useMemo } from 'react';

import type { AgentTargetRef } from '../model/agent-workspace-contract';
import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import type { AgentWorkspaceRefs, useAgentWorkspaceRuntime } from './use-agent-workspace-runtime';

type Runtime = ReturnType<typeof useAgentWorkspaceRuntime>;

export function useAgentWorkspaceActions(
  history: AgentWorkspaceHistory,
  runtime: Runtime,
  refs: AgentWorkspaceRefs,
  target?: AgentTargetRef
): AgentWorkspaceViewModel['actions'] {
  const selectSession = useCallback(
    (sessionUid: string) => {
      const session = history.sessions.items.find(item => item.sessionUid === sessionUid);
      refs.setConversation(session?.conversationId ?? undefined);
      history.setSelectedSessionUid(sessionUid);
      runtime.setFailure(undefined);
      history.setDraftMessages([]);
      runtime.dispatch({ type: 'WORKSPACE_RESET' });
      void history.loadTranscript(sessionUid);
    },
    [history, refs, runtime]
  );
  const newInvestigation = useCallback(() => {
    refs.replaceStream();
    refs.setConversation();
    refs.setStreamedSession();
    refs.setLastRequest();
    history.setSelectedSessionUid(undefined);
    history.setTranscript({ status: 'ready', items: [] });
    history.setDraftMessages([]);
    runtime.setComposer('');
    runtime.setFailure(undefined);
    runtime.dispatch({ type: 'WORKSPACE_RESET' });
  }, [history, refs, runtime]);
  const send = useSendInvestigation(history, runtime, refs, target);
  return useMemo(
    () => ({
      selectSession,
      newInvestigation,
      setComposer: runtime.setComposer,
      send,
      stop: runtime.stop,
      retry: runtime.retry,
      decideApproval: runtime.decideApproval,
      submitInteraction: runtime.submitInteraction
    }),
    [newInvestigation, runtime, selectSession, send]
  );
}

function useSendInvestigation(
  history: AgentWorkspaceHistory,
  runtime: Runtime,
  refs: AgentWorkspaceRefs,
  target?: AgentTargetRef
) {
  return useCallback(async () => {
    const message = runtime.composer.trim();
    if (!message || runtime.streaming) return;
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
  }, [history, refs, runtime, target]);
}
