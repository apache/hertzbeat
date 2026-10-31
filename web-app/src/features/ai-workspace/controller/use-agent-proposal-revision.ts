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
import type { Dispatch, SetStateAction } from 'react';
import type { AgentWorkspaceAction } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceRefs } from './agent-workspace-refs';
import { cancelProposalForRevision } from './agent-revise-proposal';
import { runStatusEvent } from './agent-run-observation';

export function useAgentProposalRevision({
  runUid,
  stopping,
  refs,
  setStopping,
  setStreaming,
  setFailure,
  setComposer,
  dispatch
}: {
  runUid: string | undefined;
  stopping: boolean;
  refs: AgentWorkspaceRefs;
  setStopping: Dispatch<SetStateAction<boolean>>;
  setStreaming: Dispatch<SetStateAction<boolean>>;
  setFailure: Dispatch<SetStateAction<'unavailable' | undefined>>;
  setComposer: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<AgentWorkspaceAction>;
}) {
  const revisionInFlight = useRef(false);
  return useCallback(
    async (approvalId: string, revision: string) => {
      if (revisionInFlight.current || !runUid || stopping || !revision.trim() || revision.length > 4000) return false;
      const generation = refs.getOperationGeneration();
      let ownedGeneration = generation;
      const current = () => refs.isMounted() && refs.getOperationGeneration() === ownedGeneration;
      revisionInFlight.current = true;
      setStopping(true);
      try {
        const snapshot = await cancelProposalForRevision(runUid, approvalId, current);
        if (!current()) return false;
        ownedGeneration = refs.bumpOperationGeneration();
        refs.replaceStream();
        refs.setLastRequest();
        setStreaming(false);
        dispatch(runStatusEvent(snapshot, refs.getConversation() ?? ''));
        setComposer(revision);
        return current();
      } catch {
        if (current()) setFailure('unavailable');
        return false;
      } finally {
        revisionInFlight.current = false;
        if (current()) setStopping(false);
      }
    },
    [runUid, stopping, refs, setFailure, setStopping, setStreaming, setComposer, dispatch]
  );
}
