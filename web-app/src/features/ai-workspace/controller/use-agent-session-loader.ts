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

import { useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { getLatestAgentRun, listAgentTranscriptPage } from '../api/agent-gateway-api';
import type { AgentTranscriptPage } from '../model/agent-transcript-pagination';
import type { AgentRunSnapshot, AgentTranscriptMessage } from '../model/agent-workspace-contract';
import type { AgentDraftMessage, AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';

export type AgentSessionLoad = {
  items: AgentTranscriptMessage[];
  snapshot: AgentRunSnapshot | null;
};

export function useAgentSessionLoader(options: {
  isMounted: () => boolean;
  selectedRef: MutableRefObject<string | undefined>;
  transcriptRef: MutableRefObject<AgentWorkspaceViewModel['transcript']>;
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
      setTranscript({ status: 'loading', items: [] });
      try {
        const [transcriptResult, snapshotResult] = await Promise.allSettled([
          listAgentTranscriptPage(sessionUid, abort.signal),
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
  const loadOlder = useOlderTranscriptLoader(options, loadAbortRef, loadGenerationRef);
  return { cancelSessionLoad, loadSession, loadOlder };
}

function useOlderTranscriptLoader(
  { isMounted, selectedRef, transcriptRef, setTranscript }: Parameters<typeof useAgentSessionLoader>[0],
  loadAbortRef: MutableRefObject<AbortController | undefined>,
  loadGenerationRef: MutableRefObject<number>
) {
  return useCallback(async () => {
    const sessionUid = selectedRef.current;
    if (!sessionUid || loadAbortRef.current) return;
    const abort = new AbortController();
    const generation = loadGenerationRef.current;
    const pageIndex = transcriptRef.current.olderPageIndex;
    if (pageIndex === undefined) return;
    loadAbortRef.current = abort;
    setTranscript(current => ({ ...current, olderStatus: 'loading' }));
    try {
      const page = await listAgentTranscriptPage(sessionUid, abort.signal, pageIndex);
      if (isCurrentLoad(abort, generation, sessionUid, loadGenerationRef.current, selectedRef, isMounted)) {
        setTranscript(current => {
          const items = [...new Map([...page.items, ...current.items].map(item => [item.id, item])).values()].sort(
            (left, right) => left.sequence - right.sequence
          );
          return {
            status: current.status,
            items,
            olderStatus: 'ready',
            ...(page.pageIndex > 0 ? { olderPageIndex: page.pageIndex - 1 } : {})
          };
        });
      }
    } catch {
      if (isCurrentLoad(abort, generation, sessionUid, loadGenerationRef.current, selectedRef, isMounted)) {
        setTranscript(current => ({ ...current, olderStatus: 'error' }));
      }
    } finally {
      if (loadAbortRef.current === abort) loadAbortRef.current = undefined;
    }
  }, [isMounted, selectedRef, setTranscript, transcriptRef, loadAbortRef, loadGenerationRef]);
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
  transcriptResult: PromiseSettledResult<AgentTranscriptPage>,
  snapshotResult: PromiseSettledResult<AgentRunSnapshot | null>
) {
  const items = transcriptResult.status === 'fulfilled' ? transcriptResult.value.items : [];
  const snapshot = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null;
  const status = transcriptResult.status === 'fulfilled' && snapshotResult.status === 'fulfilled' ? 'ready' : 'error';
  return {
    transcript: {
      status,
      items,
      ...(transcriptResult.status === 'fulfilled' && transcriptResult.value.pageIndex > 0
        ? { olderPageIndex: transcriptResult.value.pageIndex - 1 }
        : {})
    } satisfies AgentWorkspaceViewModel['transcript'],
    result: { items, snapshot } satisfies AgentSessionLoad
  };
}
