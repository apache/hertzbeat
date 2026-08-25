/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { listAgentSessions } from '../api/agent-gateway-api';
import type { AgentRunSnapshot } from '../model/agent-workspace-contract';
import type { AgentDraftMessage, AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { type AgentSessionLoad, useAgentSessionLoader } from './use-agent-session-loader';

export type AgentWorkspaceHistory = {
  sessions: AgentWorkspaceViewModel['sessions'];
  selectedSessionUid?: string;
  transcript: AgentWorkspaceViewModel['transcript'];
  draftMessages: AgentDraftMessage[];
  selectSession: (sessionUid?: string) => void;
  setTranscript: Dispatch<SetStateAction<AgentWorkspaceViewModel['transcript']>>;
  setDraftMessages: Dispatch<SetStateAction<AgentDraftMessage[]>>;
  mergeSessionSnapshot: (snapshot: AgentRunSnapshot) => void;
  refreshSessions: (signal?: AbortSignal) => Promise<AgentWorkspaceViewModel['sessions']['items']>;
  loadSession: (sessionUid: string) => Promise<AgentSessionLoad | undefined>;
  cancelSessionLoad: () => void;
};

export function useAgentWorkspaceHistory(isMounted: () => boolean): AgentWorkspaceHistory {
  const [sessions, setSessions] = useState<AgentWorkspaceViewModel['sessions']>({ status: 'loading', items: [] });
  const [selectedSessionUid, setSelectedSessionUid] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState<AgentWorkspaceViewModel['transcript']>({ status: 'ready', items: [] });
  const [draftMessages, setDraftMessages] = useState<AgentDraftMessage[]>([]);
  const selectedRef = useRef<string | undefined>(undefined);
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
  const { cancelSessionLoad, loadSession } = useAgentSessionLoader({
    isMounted,
    selectedRef,
    setTranscript,
    setDraftMessages
  });
  const selectSession = useCallback(
    (sessionUid?: string) => {
      cancelSessionLoad();
      selectedRef.current = sessionUid;
      setSelectedSessionUid(sessionUid);
    },
    [cancelSessionLoad]
  );
  const mergeSessionSnapshot = useSessionSnapshotMerge(setSessions);
  return {
    sessions,
    ...(selectedSessionUid ? { selectedSessionUid } : {}),
    transcript,
    draftMessages,
    selectSession,
    setTranscript,
    setDraftMessages,
    mergeSessionSnapshot,
    refreshSessions,
    loadSession,
    cancelSessionLoad
  };
}

function useSessionSnapshotMerge(setSessions: Dispatch<SetStateAction<AgentWorkspaceViewModel['sessions']>>) {
  return useCallback(
    (snapshot: AgentRunSnapshot) => {
      setSessions(current => ({
        ...current,
        items: current.items
          .map(item =>
            item.sessionUid === snapshot.sessionUid
              ? {
                  ...item,
                  status: snapshot.status,
                  gmtUpdate: latestSessionTimestamp(item.gmtUpdate, snapshot.completedAt ?? snapshot.startedAt ?? null)
                }
              : item
          )
          .sort((left, right) => sessionTimestamp(right.gmtUpdate) - sessionTimestamp(left.gmtUpdate))
      }));
    },
    [setSessions]
  );
}

function sessionTimestamp(value: string | null) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function latestSessionTimestamp(existing: string | null, candidate: string | null) {
  if (!candidate) return existing;
  const candidateTimestamp = Date.parse(candidate);
  if (!Number.isFinite(candidateTimestamp)) return existing;
  const existingTimestamp = existing ? Date.parse(existing) : Number.NaN;
  return !Number.isFinite(existingTimestamp) || candidateTimestamp > existingTimestamp ? candidate : existing;
}
