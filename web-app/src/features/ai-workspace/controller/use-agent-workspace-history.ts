/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { listAgentSessions, listAgentTranscript } from '../api/agent-gateway-api';
import type { AgentDraftMessage, AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

export type AgentWorkspaceHistory = {
  sessions: AgentWorkspaceViewModel['sessions'];
  selectedSessionUid?: string;
  transcript: AgentWorkspaceViewModel['transcript'];
  draftMessages: AgentDraftMessage[];
  setSelectedSessionUid: Dispatch<SetStateAction<string | undefined>>;
  setTranscript: Dispatch<SetStateAction<AgentWorkspaceViewModel['transcript']>>;
  setDraftMessages: Dispatch<SetStateAction<AgentDraftMessage[]>>;
  refreshSessions: (signal?: AbortSignal) => Promise<AgentWorkspaceViewModel['sessions']['items']>;
  loadTranscript: (sessionUid: string, signal?: AbortSignal) => Promise<void>;
};

export function useAgentWorkspaceHistory(isMounted: () => boolean): AgentWorkspaceHistory {
  const [sessions, setSessions] = useState<AgentWorkspaceViewModel['sessions']>({ status: 'loading', items: [] });
  const [selectedSessionUid, setSelectedSessionUid] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState<AgentWorkspaceViewModel['transcript']>({ status: 'ready', items: [] });
  const [draftMessages, setDraftMessages] = useState<AgentDraftMessage[]>([]);
  const refreshSessions = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const items = await listAgentSessions(signal);
        if (!signal?.aborted && isMounted()) setSessions({ status: 'ready', items });
        return items;
      } catch {
        if (!signal?.aborted && isMounted()) setSessions(current => ({ status: 'error', items: current.items }));
        return [];
      }
    },
    [isMounted]
  );
  const loadTranscript = useCallback(
    async (sessionUid: string, signal?: AbortSignal) => {
      setTranscript(current => ({ status: 'loading', items: current.items }));
      try {
        const items = await listAgentTranscript(sessionUid, signal);
        if (!signal?.aborted && isMounted()) {
          setTranscript({ status: 'ready', items });
          setDraftMessages([]);
        }
      } catch {
        if (!signal?.aborted && isMounted()) {
          setTranscript(current => ({ status: 'error', items: current.items }));
        }
      }
    },
    [isMounted]
  );
  return {
    sessions,
    ...(selectedSessionUid ? { selectedSessionUid } : {}),
    transcript,
    draftMessages,
    setSelectedSessionUid,
    setTranscript,
    setDraftMessages,
    refreshSessions,
    loadTranscript
  };
}
