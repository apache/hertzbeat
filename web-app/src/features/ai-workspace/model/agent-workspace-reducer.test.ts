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

import type { AgentGatewayEvent } from './agent-workspace-contract';
import { agentWorkspaceReducer, initialAgentWorkspaceRun } from './agent-workspace-reducer';

describe('Agent workspace event projection', () => {
  it('assembles streamed text while keeping tool activity separate from the answer', () => {
    const events = [
      event('RUN_STARTED', { traceId: 'trace-1' }, { runUid: 'run-1' }),
      event('MESSAGE_STARTED', { traceId: 'trace-1' }, { itemId: 'message-1' }),
      event('MESSAGE_DELTA', { traceId: 'trace-1', deltaIndex: 0, delta: 'Check ' }, { itemId: 'message-1' }),
      event('TOOL_STARTED', {
        traceId: 'trace-1',
        toolName: 'metrics.query',
        toolCallId: 'tool-1',
        arguments: {},
        status: 'RUNNING'
      }),
      event('MESSAGE_DELTA', { traceId: 'trace-1', deltaIndex: 1, delta: 'complete.' }, { itemId: 'message-1' }),
      event('TOOL_COMPLETED', {
        traceId: 'trace-1',
        toolName: 'metrics.query',
        toolCallId: 'tool-1',
        approvalId: null,
        policyDecision: 'ALLOW',
        errorMessage: null,
        elapsedMs: 12,
        status: 'SUCCEEDED'
      })
    ];

    const state = events.reduce(agentWorkspaceReducer, initialAgentWorkspaceRun);

    expect(state.runUid).toBe('run-1');
    expect(state.messages).toEqual([{ id: 'message-1', text: 'Check complete.', status: 'streaming' }]);
    expect(state.tools).toEqual([
      expect.objectContaining({ toolCallId: 'tool-1', toolName: 'metrics.query', status: 'SUCCEEDED' })
    ]);
  });

  it('retains a pending approval until its exact completion event arrives', () => {
    const requested = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('APPROVAL_REQUESTED', {
        traceId: 'trace-1',
        toolName: 'monitor.disable',
        approvalId: 'approval-1',
        toolCallId: 'tool-1',
        status: 'PENDING'
      })
    );
    expect(requested.approvals).toEqual([
      { approvalId: 'approval-1', toolCallId: 'tool-1', toolName: 'monitor.disable', status: 'PENDING' }
    ]);

    const completed = agentWorkspaceReducer(
      requested,
      event('APPROVAL_COMPLETED', {
        traceId: 'trace-1',
        toolName: 'monitor.disable',
        approvalId: 'approval-1',
        toolCallId: 'tool-1',
        status: 'REJECTED'
      })
    );
    expect(completed.approvals[0]).toMatchObject({ approvalId: 'approval-1', status: 'REJECTED' });
  });

  it('projects a durable terminal replay without fabricating a live start', () => {
    const state = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event(
        'RUN_STATUS',
        { status: 'SUCCEEDED', result: 'Durable answer', errorMessage: null, replayAvailable: true },
        { runUid: 'run-1' }
      )
    );

    expect(state).toMatchObject({
      runUid: 'run-1',
      status: 'complete',
      messages: [expect.objectContaining({ text: 'Durable answer', status: 'complete' })]
    });
  });

  it('projects an indeterminate completion as manual recovery without retry', () => {
    const live = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('ERROR', { status: 'recovery_required', errorMessage: 'Internal completion detail' }, { runUid: 'run-1' })
    );

    expect(live).toMatchObject({
      runUid: 'run-1',
      status: 'error',
      recoveryRequired: true,
      recoveryAvailable: false,
      retryAvailable: false,
      errorMessage: 'Internal completion detail'
    });

    const replay = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event(
        'RUN_STATUS',
        {
          status: 'RECOVERY_REQUIRED',
          errorMessage: 'Durable completion could not be confirmed',
          replayAvailable: true,
          retryAvailable: false
        },
        { runUid: 'run-1' }
      )
    );

    expect(replay).toMatchObject({
      runUid: 'run-1',
      status: 'error',
      recoveryRequired: true,
      recoveryAvailable: false,
      retryAvailable: false,
      errorMessage: 'Durable completion could not be confirmed'
    });
  });

  it.each([
    ['TARGET_MISMATCH', 'mismatch'],
    ['TARGET_UNAVAILABLE', 'unavailable']
  ] as const)('projects %s without fabricating a retryable run', (status, targetFailure) => {
    const state = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('ERROR', { status, errorMessage: 'Safe target error' })
    );

    expect(state).toMatchObject({
      status: 'error',
      targetFailure,
      retryAvailable: false,
      recoveryAvailable: false
    });
  });

  it('surfaces model retry progress while the run stays active', () => {
    const started = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('RUN_STARTED', { traceId: 'trace-1' }, { runUid: 'run-1' })
    );

    const retrying = agentWorkspaceReducer(
      started,
      event('MODEL_RETRY', { traceId: 'trace-1', attempt: 1, maxAttempts: 2, delayMs: 500, errorMessage: 'HTTP 429' })
    );

    expect(retrying).toMatchObject({
      status: 'running',
      runUid: 'run-1',
      modelRetry: { attempt: 1, maxAttempts: 2, delayMs: 500, errorMessage: 'HTTP 429' }
    });

    const advanced = agentWorkspaceReducer(
      retrying,
      event('MODEL_RETRY', { traceId: 'trace-1', attempt: 2, maxAttempts: 2, delayMs: 1000, errorMessage: 'HTTP 503' })
    );

    expect(advanced.modelRetry).toMatchObject({ attempt: 2, maxAttempts: 2, errorMessage: 'HTTP 503' });
  });

  it('clears retry progress once the assistant stream resumes or the run terminates', () => {
    const retrying = agentWorkspaceReducer(
      agentWorkspaceReducer(
        initialAgentWorkspaceRun,
        event('RUN_STARTED', { traceId: 'trace-1' }, { runUid: 'run-1' })
      ),
      event('MODEL_RETRY', { traceId: 'trace-1', attempt: 1, maxAttempts: 2, errorMessage: 'boom' })
    );

    const resumed = agentWorkspaceReducer(
      retrying,
      event('MESSAGE_STARTED', { traceId: 'trace-1' }, { itemId: 'message-1' })
    );
    expect(resumed.modelRetry).toBeUndefined();
    expect(resumed.status).toBe('running');

    const failed = agentWorkspaceReducer(
      retrying,
      event('ERROR', { errorMessage: 'still failing' }, { runUid: 'run-1' })
    );
    expect(failed.modelRetry).toBeUndefined();
    expect(failed).toMatchObject({ status: 'error', errorMessage: 'still failing' });
  });

  it('ignores unknown event types instead of dropping the stream', () => {
    const state = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('FUTURE_EVENT' as AgentGatewayEvent['type'], { notice: 'from a newer backend' })
    );

    expect(state).toEqual(initialAgentWorkspaceRun);
  });
});

function event(
  type: AgentGatewayEvent['type'],
  payload: Record<string, unknown>,
  identity: { runUid?: string; itemId?: string } = {}
): AgentGatewayEvent {
  return {
    type,
    eventId: `event-${type}`,
    conversationId: 'conversation-1',
    sessionUid: 'session-1',
    runUid: identity.runUid ?? null,
    itemId: identity.itemId ?? null,
    payload,
    timestamp: 1
  };
}
