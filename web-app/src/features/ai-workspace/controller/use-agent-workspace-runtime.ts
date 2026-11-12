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

import type { AgentTransportFailure } from '../model/agent-transport-diagnostic';
import { useCallback, useReducer, useState } from 'react';
import type { Dispatch } from 'react';

import { useAgentRecovery } from './use-agent-runtime-recovery';
import { decideAgentApproval, submitAgentInteraction } from '../api/agent-gateway-api';
import type { AgentTargetRef } from '../model/agent-workspace-contract';
import { agentWorkspaceReducer, initialAgentWorkspaceRun } from '../model/agent-workspace-reducer';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';

import { useSafeAgentAction, useStopAgentRun, useBatchExecution } from './agent-runtime-actions';

import { useAgentConvergence, useAgentExecution, useAgentAfterApproval } from './use-agent-runtime-execution';
import { useAgentProposalRevision } from './use-agent-proposal-revision';
import type { AgentWorkspaceRefs } from './agent-workspace-refs';
export type { AgentWorkspaceRefs } from './agent-workspace-refs';

export function useAgentWorkspaceRuntime(history: AgentWorkspaceHistory, refs: AgentWorkspaceRefs, language?: string) {
  const [run, dispatch] = useReducer(agentWorkspaceReducer, initialAgentWorkspaceRun);
  const [composer, setComposer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const { failure, transportFailure, setFailure, setTransportFailure } = useAgentFailureState();
  const [target, setTarget] = useState<AgentTargetRef | undefined>(undefined);
  const converge = useAgentConvergence(history, refs, dispatch);
  const execute = useAgentExecution({
    refs,
    ...(language ? { language } : {}),
    converge,
    dispatch,
    setStreaming,
    setFailure,
    setTransportFailure,
    setTarget
  });
  const { recover, retry } = useAgentRecovery(run, refs, execute, streaming, failure);
  const stop = useStopAgentRun(run.runUid, stopping, refs, setStopping, setFailure);
  const afterApproval = useAgentAfterApproval(run.runUid, refs, dispatch, converge);
  const reviseApproval = useAgentProposalRevision({
    runUid: run.runUid,
    stopping,
    refs,
    setStopping,
    setStreaming,
    setFailure,
    setComposer,
    dispatch
  });
  return {
    run,
    dispatch,
    composer,
    setComposer,
    streaming,
    stopping,
    failure: run.status === 'complete' ? undefined : failure,
    transportFailure: run.status === 'complete' ? undefined : transportFailure,
    setFailure,
    resetTransientOperations: () => {
      setStopping(false);
      setFailure(undefined);
    },
    target,
    setTarget,
    execute,
    executeBatch: useBatchExecution(refs, execute, streaming),
    recover,
    retry,
    stop,
    reviseApproval,
    decideApproval: useSafeAgentAction(decideAgentApproval, refs, setFailure, afterApproval),
    submitInteraction: useSafeAgentAction(submitAgentInteraction, refs, setFailure)
  };
}

function useAgentFailureState() {
  const [failure, setFailureState] = useState<'unavailable' | undefined>(undefined);
  const [transportFailure, setTransportFailure] = useState<AgentTransportFailure>();
  const setFailure = useCallback<Dispatch<React.SetStateAction<'unavailable' | undefined>>>(value => {
    setTransportFailure(undefined);
    setFailureState(value);
  }, []);
  return { failure, transportFailure, setFailure, setTransportFailure };
}
