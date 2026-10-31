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

import { terminalMessages } from './agent-terminal-messages';
import type { AgentGatewayEvent, AgentRunSnapshot } from './agent-workspace-contract';
import { initialAgentWorkspaceRun, type AgentWorkspaceRunState } from './agent-run-state';
import { clearModelRetry, reduceModelRetry } from './agent-workspace-retry';
import {
  recoverApprovals,
  reduceMessageEvent,
  reduceInteractionEvent,
  stringField,
  stopUnresolvedTools
} from './agent-workspace-activity-reducer';
export {
  initialAgentWorkspaceRun,
  type AgentInputRequest,
  type AgentToolActivity,
  type AgentWorkspaceRunState
} from './agent-run-state';

export type AgentWorkspaceAction =
  | AgentGatewayEvent
  | { type: 'WORKSPACE_RESET' }
  | { type: 'RUN_TRANSCRIPT_RECONCILED'; runUid: string; assistantTexts: string[] }
  | {
      type: 'RUN_EVIDENCE_LOADED';
      runUid: string;
      evidence: AgentRunSnapshot['evidence'];
      executionSummary?: AgentRunSnapshot['executionSummary'];
    };

export function agentWorkspaceReducer(
  state: AgentWorkspaceRunState,
  event: AgentWorkspaceAction
): AgentWorkspaceRunState {
  if (event.type === 'WORKSPACE_RESET') return initialAgentWorkspaceRun;
  if (event.type === 'RUN_TRANSCRIPT_RECONCILED') {
    if (state.runUid !== event.runUid) return state;
    return { ...state, messages: state.messages.filter(message => !event.assistantTexts.includes(message.text)) };
  }
  if (event.type === 'RUN_EVIDENCE_LOADED') {
    if (state.runUid && state.runUid !== event.runUid) return state;
    const next = { ...state, runUid: event.runUid };
    delete next.evidence;
    delete next.executionSummary;
    if (event.executionSummary !== undefined) next.executionSummary = event.executionSummary;
    if (event.evidence !== undefined) next.evidence = event.evidence;
    return next;
  }
  return reduceLifecycleEvent(state, event) ?? reduceMessageEvent(state, event) ?? reduceInteractionEvent(state, event);
}

function withoutEvidence(state: AgentWorkspaceRunState) {
  const next = { ...state };
  delete next.evidence;
  delete next.executionSummary;
  return next;
}

function reduceLifecycleEvent(
  state: AgentWorkspaceRunState,
  event: AgentGatewayEvent
): AgentWorkspaceRunState | undefined {
  switch (event.type) {
    case 'RUN_STARTED':
      return {
        ...clearModelRetry(withoutEvidence(state)),
        status: 'running',
        cancelled: false,
        recoveryAvailable: true,
        retryAvailable: false,
        ...(event.runUid ? { runUid: event.runUid } : {})
      };
    case 'RUN_COMPLETED':
      return {
        ...clearModelRetry(state),
        status: 'complete',
        cancelled: false,
        recoveryAvailable: false,
        retryAvailable: false,
        messages: state.messages.map(item => ({ ...item, status: 'complete' }))
      };
    case 'RUN_STATUS':
      return reduceRunStatus(state, event);
    case 'MODEL_RETRY':
      return reduceModelRetry(state, event);
    case 'ERROR':
      return reduceErrorEvent(state, event);
    default:
      return undefined;
  }
}

function reduceErrorEvent(state: AgentWorkspaceRunState, event: AgentGatewayEvent): AgentWorkspaceRunState {
  const status = stringField(event.payload, 'status').toUpperCase();
  const recoveryRequired = status === 'RECOVERY_REQUIRED';
  const targetFailure =
    status === 'TARGET_MISMATCH' ? 'mismatch' : status === 'TARGET_UNAVAILABLE' ? 'unavailable' : undefined;
  return {
    ...clearModelRetry(state),
    ...(status === 'CANCELLED' ? { tools: stopUnresolvedTools(state.tools), approvals: [] } : {}),
    ...(event.runUid ? { runUid: event.runUid } : {}),
    status: 'error',
    cancelled: status === 'CANCELLED',
    recoveryAvailable: false,
    retryAvailable: !recoveryRequired && targetFailure === undefined,
    recoveryRequired,
    ...(targetFailure ? { targetFailure } : {}),
    errorMessage: stringField(event.payload, 'errorMessage')
  };
}

function reduceRunStatus(state: AgentWorkspaceRunState, event: AgentGatewayEvent): AgentWorkspaceRunState {
  state = recoverApprovals(state, event.payload);
  const status = stringField(event.payload, 'status').toUpperCase();
  const runUid = event.runUid ? { runUid: event.runUid } : {};
  if (status === 'CREATED' || status === 'RUNNING') {
    return {
      ...clearModelRetry(state),
      ...runUid,
      status: 'running',
      cancelled: false,
      recoveryAvailable: event.payload.recoveryAvailable === true,
      retryAvailable: false,
      ...(event.payload.observationExpired === true ? { observationExpired: true } : {})
    };
  }
  state = {
    ...state,
    cancelled: status === 'CANCELLED',
    approvals: [],
    ...(status === 'CANCELLED' ? { tools: stopUnresolvedTools(state.tools) } : {})
  };
  if (status === 'SUCCEEDED') {
    const result = stringField(event.payload, 'result');
    if (!result || event.payload.replayAvailable === false) {
      return {
        ...clearModelRetry(state),
        ...runUid,
        status: 'error',
        errorMessage: stringField(event.payload, 'errorMessage')
      };
    }
    return {
      ...clearModelRetry(state),
      ...runUid,
      status: 'complete',
      cancelled: false,
      recoveryAvailable: false,
      retryAvailable: false,
      messages: terminalMessages(state.messages, event.payload.resultAlreadyVisible === true, result, event.eventId)
    };
  }
  return {
    ...clearModelRetry(state),
    ...runUid,
    status: 'error',
    cancelled: status === 'CANCELLED',
    recoveryAvailable: false,
    retryAvailable: event.payload.retryAvailable === true,
    recoveryRequired: status === 'RECOVERY_REQUIRED',
    errorMessage: stringField(event.payload, 'errorMessage')
  };
}
