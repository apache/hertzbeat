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

import { useRef, useState, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { ApiMessageError } from '@/core/http/api-message';
import { deleteAgentSessions, previewAgentSessionDeletion } from '../api/agent-session-management-api';
import type { AgentSessionDeletion } from '../model/agent-session-management';
import { isAgentSessionActive } from '../model/agent-session-management';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import type { AgentWorkspaceRefs } from './use-agent-workspace-runtime';

const idle: AgentSessionDeletion = { phase: 'idle', sessionUids: [], activeCount: 0 };

export function useAgentSessionDeletion(history: AgentWorkspaceHistory, refs: AgentWorkspaceRefs, reset: () => void) {
  const [state, setState] = useState<AgentSessionDeletion>(idle);
  const pending = useRef(false);
  const prepareAll = useDeletionPreview(setState, refs, pending);
  const prepareOne = useSingleDeletion(history, setState, pending);
  const confirm = useConfirmDeletion(state, setState, history, refs, reset, pending);
  return {
    state,
    requestDeleteSession: prepareOne,
    requestClearSessions: prepareAll,
    cancelSessionDeletion: () => {
      if (!pending.current) setState(idle);
    },
    confirmSessionDeletion: confirm
  };
}

type Setter = Dispatch<SetStateAction<AgentSessionDeletion>>;
type Pending = MutableRefObject<boolean>;

function useDeletionPreview(setState: Setter, refs: AgentWorkspaceRefs, pending: Pending) {
  return async () => {
    if (pending.current) return;
    pending.current = true;
    setState({ ...idle, phase: 'loading' });
    try {
      const preview = await previewAgentSessionDeletion();
      if (refs.isMounted()) setState({ ...preview, phase: 'confirming' });
    } catch {
      if (refs.isMounted()) setState({ ...idle, phase: 'confirming', error: 'unavailable' });
    } finally {
      pending.current = false;
    }
  };
}

function useSingleDeletion(history: AgentWorkspaceHistory, setState: Setter, pending: Pending) {
  return (uid: string) => {
    if (pending.current) return;
    const session = history.sessions.items.find(item => item.sessionUid === uid);
    if (!session) return;
    setState({
      phase: 'confirming',
      sessionUids: [uid],
      activeCount: isAgentSessionActive(session.status) ? 1 : 0,
      ...(session.title ? { title: session.title } : {})
    });
  };
}

function useConfirmDeletion(
  state: AgentSessionDeletion,
  setState: Setter,
  history: AgentWorkspaceHistory,
  refs: AgentWorkspaceRefs,
  reset: () => void,
  pending: Pending
) {
  return async () => {
    if (pending.current || state.phase !== 'confirming' || !state.sessionUids.length || state.activeCount) return;
    pending.current = true;
    const generation = refs.getOperationGeneration();
    setState(current => ({ ...current, phase: 'deleting', error: undefined }));
    try {
      await deleteAgentSessions(state.sessionUids);
      if (!refs.isMounted()) return;
      if (
        refs.getOperationGeneration() === generation &&
        history.selectedSessionUid &&
        state.sessionUids.includes(history.selectedSessionUid)
      )
        reset();
      setState(idle);
      await history.refreshSessions();
    } catch (error) {
      if (refs.isMounted())
        setState(current => ({
          ...current,
          phase: 'confirming',
          error: error instanceof ApiMessageError && error.status === 409 ? 'active' : 'unavailable'
        }));
    } finally {
      pending.current = false;
    }
  };
}
