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
import type { AgentWorkspaceViewModel } from './agent-workspace-view-model';
import { agentExecutionPhase } from './agent-execution-phase';
function fixture(): AgentWorkspaceViewModel {
  const noop = async () => {};
  return {
    sessions: { status: 'ready', items: [] },
    transcript: { status: 'ready', items: [] },
    draftMessages: [],
    run: { status: 'idle', messages: [], tools: [], approvals: [], inputs: [] },
    composer: '',
    invalidTarget: false,
    streaming: false,
    stopping: false,
    actions: {
      selectSession: noop,
      newInvestigation: () => {},
      setComposer: () => {},
      send: noop,
      stop: noop,
      retry: noop,
      recover: noop,
      decideApproval: noop,
      submitInteraction: noop
    }
  };
}

describe('visible execution phase', () => {
  it('recognizes resident in_progress wire tool state', () => {
    const c = fixture();
    c.run.status = 'running';
    c.run.tools = [{ toolCallId: 'tool', toolName: 'monitor.create_batch', status: 'in_progress' }];
    expect(agentExecutionPhase(c)).toBe('executingTool');
  });

  it('is immediate after send and before first server event', () => {
    const c = fixture();
    c.streaming = true;
    expect(agentExecutionPhase(c)).toBe('thinking');
  });
  it.each([
    ['tool.search', 'findingTools'],
    ['logs.analysis', 'queryingLogs'],
    ['monitor.query', 'executingTool']
  ])('shows %s activity', (toolName, phase) => {
    const c = fixture();
    c.run.status = 'running';
    c.run.tools = [{ toolCallId: 'tool', toolName, status: 'RUNNING' }];
    expect(agentExecutionPhase(c)).toBe(phase);
  });
  it('returns to thinking after a tool completes then shows response streaming', () => {
    const c = fixture();
    c.run.status = 'running';
    c.run.tools = [{ toolCallId: 'tool', toolName: 'logs.analysis', status: 'SUCCEEDED' }];
    expect(agentExecutionPhase(c)).toBe('thinking');
    c.run.messages = [{ id: 'reply', text: '254 logs', status: 'streaming' }];
    expect(agentExecutionPhase(c)).toBe('responding');
  });
  it.each(['complete', 'error'] as const)('clears after %s even before request cleanup', status => {
    const c = fixture();
    c.streaming = true;
    c.run.status = status;
    expect(agentExecutionPhase(c)).toBeUndefined();
  });
  it('clears on disconnection and expired observation', () => {
    const c = fixture();
    c.streaming = true;
    c.run.status = 'running';
    c.failure = 'unavailable';
    expect(agentExecutionPhase(c)).toBeUndefined();
    delete c.failure;
    c.run.observationExpired = true;
    expect(agentExecutionPhase(c)).toBeUndefined();
  });
});
