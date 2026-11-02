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

import { describe, expect, it } from 'vitest';
import {
  agentWorkspaceReducer,
  initialAgentWorkspaceRun,
  type AgentWorkspaceRunState
} from './agent-workspace-reducer';
import type { AgentGatewayEvent } from './agent-workspace-contract';
const live: AgentWorkspaceRunState = {
  ...initialAgentWorkspaceRun,
  runUid: 'run-1',
  status: 'error',
  messages: [{ id: 'live', text: 'No verified data. Budget reached.', status: 'complete' }]
};
describe('terminal projection', () => {
  it('reconciles the live failure only after its current-run persisted text is visible', () => {
    const state = agentWorkspaceReducer(live, {
      type: 'RUN_TRANSCRIPT_RECONCILED',
      runUid: 'run-1',
      assistantTexts: ['No verified data. Budget reached.']
    });
    expect(state.messages).toEqual([]);
    expect(state.status).toBe('error');
  });
  it('retains partial text when history loading fails or text is missing', () => {
    expect(
      agentWorkspaceReducer(live, { type: 'RUN_TRANSCRIPT_RECONCILED', runUid: 'run-1', assistantTexts: [] }).messages
    ).toEqual(live.messages);
  });
  it('ignores stale reconciliation for another run', () => {
    expect(
      agentWorkspaceReducer(live, {
        type: 'RUN_TRANSCRIPT_RECONCILED',
        runUid: 'old',
        assistantTexts: ['No verified data. Budget reached.']
      })
    ).toBe(live);
  });
  it('does not add a second copy when a success snapshot repeats streamed text', () => {
    const event: AgentGatewayEvent = {
      type: 'RUN_STATUS',
      eventId: 'terminal',
      runUid: 'run-1',
      conversationId: 'c',
      sessionUid: 's',
      itemId: null,
      timestamp: 1,
      payload: { status: 'SUCCEEDED', result: 'No verified data. Budget reached.', replayAvailable: true }
    };
    expect(agentWorkspaceReducer(live, event).messages).toHaveLength(1);
  });
});
