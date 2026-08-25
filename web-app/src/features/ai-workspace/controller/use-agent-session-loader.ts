/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { getLatestAgentRun, listAgentTranscript } from '../api/agent-gateway-api';
import type { AgentRunSnapshot, AgentTranscriptMessage } from '../model/agent-workspace-contract';
import type { AgentDraftMessage, AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

export type AgentSessionLoad = {
  items: AgentTranscriptMessage[];
  snapshot: AgentRunSnapshot | null;
};

export function useAgentSessionLoader(options: {
  isMounted: () => boolean;
  selectedRef: MutableRefObject<string | undefined>;
  setTranscript: Dispatch<SetStateAction<AgentWorkspaceViewModel['transcript']>>;
  setDraftMessages: Dispatch<SetStateAction<AgentDraftMessage[]>>;
}) {
  const { isMounted, selectedRef, setDraftMessages, setTranscript } = options;
  const loadAbortRef = useRef<AbortController | undefined>(undefined);
  const loadGenerationRef = useRef(0);
  const cancelSessionLoad = useCallback(() => {
    loadGenerationRef.current += 1;
    loadAbortRef.current?.abort();
    loadAbortRef.current = undefined;
  }, []);
  const loadSession = useCallback(
    async (sessionUid: string): Promise<AgentSessionLoad | undefined> => {
      loadAbortRef.current?.abort();
      const abort = new AbortController();
      loadAbortRef.current = abort;
      const generation = loadGenerationRef.current;
      setTranscript(current => ({ status: 'loading', items: current.items }));
      try {
        const [transcriptResult, snapshotResult] = await Promise.allSettled([
          listAgentTranscript(sessionUid, abort.signal),
          getLatestAgentRun(sessionUid, abort.signal)
        ]);
        if (isCurrentLoad(abort, generation, sessionUid, loadGenerationRef.current, selectedRef, isMounted)) {
          const loaded = resolvedSessionLoad(transcriptResult, snapshotResult);
          setTranscript(loaded.transcript);
          setDraftMessages([]);
          return loaded.result;
        }
      } catch {
        if (isCurrentLoad(abort, generation, sessionUid, loadGenerationRef.current, selectedRef, isMounted)) {
          setTranscript({ status: 'error', items: [] });
        }
      } finally {
        if (loadAbortRef.current === abort) loadAbortRef.current = undefined;
      }
      return undefined;
    },
    [isMounted, selectedRef, setDraftMessages, setTranscript]
  );
  return { cancelSessionLoad, loadSession };
}

function isCurrentLoad(
  abort: AbortController,
  generation: number,
  sessionUid: string,
  currentGeneration: number,
  selectedRef: MutableRefObject<string | undefined>,
  isMounted: () => boolean
) {
  return !abort.signal.aborted && isMounted() && generation === currentGeneration && selectedRef.current === sessionUid;
}

function resolvedSessionLoad(
  transcriptResult: PromiseSettledResult<AgentTranscriptMessage[]>,
  snapshotResult: PromiseSettledResult<AgentRunSnapshot | null>
) {
  const items = transcriptResult.status === 'fulfilled' ? transcriptResult.value : [];
  const snapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null;
  const status = transcriptResult.status === 'fulfilled' && snapshotResult.status === 'fulfilled' ? 'ready' : 'error';
  return {
    transcript: { status, items } satisfies AgentWorkspaceViewModel['transcript'],
    result: { items, snapshot } satisfies AgentSessionLoad
  };
}
