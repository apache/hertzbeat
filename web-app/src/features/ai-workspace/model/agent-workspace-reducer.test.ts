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
import { approvalSummaryFixture } from './agent-approval-summary-fixture';

import type { AgentGatewayEvent } from './agent-workspace-contract';
import { agentWorkspaceReducer, initialAgentWorkspaceRun } from './agent-workspace-reducer';

describe('Agent workspace event projection', () => {
  it('keeps the same typed summary on live approval and owner-checked recovery', () => {
    const summary = approvalSummaryFixture();
    const requested = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('APPROVAL_REQUESTED', {
        approvalId: 'approval',
        toolCallId: 'call',
        toolName: 'monitor.create_batch',
        status: 'waiting_approval',
        canDecide: true,
        summary
      })
    );
    expect(requested.approvals[0]?.summary).toEqual(summary);
    const restored = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('RUN_STATUS', {
        status: 'RUNNING',
        recoveredApprovals: [
          {
            approvalId: 'approval',
            toolCallId: 'call',
            toolName: 'monitor.create_batch',
            status: 'WAITING_APPROVAL',
            canDecide: true,
            summary
          }
        ]
      })
    );
    expect(restored.approvals[0]?.summary).toEqual(summary);
  });

  it('restores approval cards from a fresh run status without inventing a decision', () => {
    const state = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event(
        'RUN_STATUS',
        {
          status: 'RUNNING',
          recoveredApprovals: [
            {
              approvalId: 'restored',
              toolCallId: 'call',
              toolName: 'monitor.create_batch',
              status: 'WAITING_APPROVAL',
              canDecide: true
            }
          ],
          approvalRecoveryUnavailable: false
        },
        { runUid: 'restored-run' }
      )
    );
    expect(state.approvals[0]).toMatchObject({ approvalId: 'restored', status: 'WAITING_APPROVAL', canDecide: true });
    const expired = agentWorkspaceReducer(
      state,
      event('RUN_STATUS', {
        status: 'RUNNING',
        recoveredApprovals: [
          {
            approvalId: 'restored',
            toolCallId: 'call',
            toolName: 'monitor.create_batch',
            status: 'EXPIRED',
            canDecide: false
          }
        ]
      })
    );
    expect(expired.approvals).toHaveLength(1);
    expect(expired.approvals[0]).toMatchObject({ status: 'EXPIRED', canDecide: false });
  });

  it('projects real lowercase approval events without inventing decision authority', () => {
    const payload = {
      approvalId: 'approval-wire',
      toolCallId: 'tool-wire',
      toolName: 'monitor.create_batch',
      status: 'waiting_approval'
    };
    const requested = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('APPROVAL_REQUESTED', { ...payload, canDecide: true })
    );
    expect(requested.approvals).toEqual([{ ...payload, status: 'WAITING_APPROVAL', canDecide: true }]);
    expect(
      agentWorkspaceReducer(initialAgentWorkspaceRun, event('APPROVAL_REQUESTED', payload)).approvals[0]?.canDecide
    ).toBeUndefined();
    const completed = agentWorkspaceReducer(requested, event('APPROVAL_COMPLETED', { ...payload, status: 'approved' }));
    expect(completed.approvals[0]?.status).toBe('APPROVED');
  });

  it.each([
    ['in_progress', 'RUNNING'],
    ['completed', 'SUCCEEDED'],
    ['declined', 'DENIED'],
    ['failed', 'FAILED'],
    ['unrecognized', 'UNRECOGNIZED'],
    ['', '']
  ])('projects tool wire status %s as %s', (wire, expected) => {
    const state = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('TOOL_STARTED', { toolCallId: 'wire', toolName: 'monitor.create_batch', status: wire })
    );
    expect(state.tools[0]?.status).toBe(expected);
  });

  it('projects lowercase user input waiting and completion', () => {
    const requested = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('INPUT_REQUESTED', { interactionId: 'input', status: 'waiting_input' })
    );
    expect(requested.inputs[0]?.status).toBe('WAITING_INPUT');
    const completed = agentWorkspaceReducer(
      requested,
      event('INPUT_COMPLETED', { interactionId: 'input', status: 'completed' })
    );
    expect(completed.inputs[0]?.status).toBe('COMPLETED');
  });

  it('clears server execution facts on new runs and rejects stale snapshot facts', () => {
    const summary = {
      status: 'PARTIAL' as const,
      totalAttempts: 1,
      succeededAttempts: 0,
      failedAttempts: 1,
      recoveredAttempts: 0,
      unresolvedAttempts: 1,
      unfinishedAttempts: 0,
      failures: [],
      truncated: false
    };
    const loaded = agentWorkspaceReducer(initialAgentWorkspaceRun, {
      type: 'RUN_EVIDENCE_LOADED',
      runUid: 'run-1',
      evidence: [],
      executionSummary: summary
    });
    expect(loaded.executionSummary).toEqual(summary);
    expect(
      agentWorkspaceReducer(loaded, {
        type: 'RUN_EVIDENCE_LOADED',
        runUid: 'stale',
        evidence: [],
        executionSummary: null
      })
    ).toBe(loaded);
    expect(agentWorkspaceReducer(loaded, event('RUN_STARTED', {}, { runUid: 'run-2' }))).not.toHaveProperty(
      'executionSummary'
    );
  });

  it('keeps verified snapshot evidence distinct from missing legacy data and clears it on scope changes', () => {
    const loaded = agentWorkspaceReducer(initialAgentWorkspaceRun, {
      type: 'RUN_EVIDENCE_LOADED',
      runUid: 'run-1',
      evidence: []
    });
    expect(loaded.evidence).toEqual([]);
    expect(agentWorkspaceReducer(loaded, { type: 'RUN_EVIDENCE_LOADED', runUid: 'stale', evidence: [] })).toBe(loaded);
    const legacy = agentWorkspaceReducer(loaded, { type: 'RUN_EVIDENCE_LOADED', runUid: 'run-1', evidence: undefined });
    expect(legacy).not.toHaveProperty('evidence');
    expect(agentWorkspaceReducer(loaded, event('RUN_STARTED', {}, { runUid: 'run-2' }))).not.toHaveProperty('evidence');
    expect(agentWorkspaceReducer(loaded, { type: 'WORKSPACE_RESET' })).toEqual(initialAgentWorkspaceRun);
  });

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

  it('uses only a server boolean for approval capability', () => {
    const payload = { approvalId: 'a', toolCallId: 't', toolName: 'monitor.create', status: 'PENDING' };
    const allowed = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('APPROVAL_REQUESTED', { ...payload, canDecide: true })
    );
    expect(allowed.approvals[0]?.canDecide).toBe(true);
    const invalid = agentWorkspaceReducer(
      initialAgentWorkspaceRun,
      event('APPROVAL_REQUESTED', { ...payload, canDecide: 'true' })
    );
    expect(invalid.approvals[0]?.canDecide).toBeUndefined();
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
});

describe('Cancelled approval tool evidence', () => {
  const identity = { runUid: 'cancel-run' };
  const tool = { toolCallId: 'pending-call', toolName: 'alert_inhibit.create' };
  const proof = 'CANCELLED_BEFORE_APPROVAL_NOT_EXECUTED';
  const start = () => agentWorkspaceReducer(initialAgentWorkspaceRun, event('RUN_STARTED', {}, identity));

  it('shows approval wait on live and recovered pending cards', () => {
    const approval = { ...tool, approvalId: 'pending', status: 'WAITING_APPROVAL', canDecide: true };
    const live = agentWorkspaceReducer(start(), event('APPROVAL_REQUESTED', approval, identity));
    expect(live.tools[0]?.status).toBe('WAITING_APPROVAL');
    const restored = agentWorkspaceReducer(
      start(),
      event('RUN_STATUS', { status: 'RUNNING', recoveredApprovals: [approval] }, identity)
    );
    expect(restored.tools[0]?.status).toBe('WAITING_APPROVAL');
  });

  it('retains exact cancellation proof after terminal run and late events', () => {
    let state = agentWorkspaceReducer(start(), event('TOOL_STARTED', { ...tool, status: 'RUNNING' }, identity));
    state = agentWorkspaceReducer(
      state,
      event('TOOL_COMPLETED', { ...tool, status: 'DECLINED', errorMessage: proof }, identity)
    );
    expect(state.tools[0]?.status).toBe('CANCELLED');
    state = agentWorkspaceReducer(
      state,
      event('RUN_STATUS', { status: 'CANCELLED', recoveredApprovals: [] }, identity)
    );
    state = agentWorkspaceReducer(state, event('TOOL_STARTED', { ...tool, status: 'RUNNING' }, identity));
    state = agentWorkspaceReducer(
      state,
      event('APPROVAL_REQUESTED', { ...tool, approvalId: 'late', status: 'WAITING_APPROVAL' }, identity)
    );
    expect(state.tools[0]?.status).toBe('CANCELLED');
    expect(state.cancelled).toBe(true);
    expect(state.approvals).toEqual([]);
    expect(agentWorkspaceReducer(state, event('RUN_STARTED', {}, { runUid: 'next' })).cancelled).toBe(false);
  });

  it.each(['RUN_STATUS', 'ERROR'] as const)(
    'does not claim an in-flight write was not executed on %s cancellation alone',
    type => {
      let state = agentWorkspaceReducer(start(), event('TOOL_STARTED', { ...tool, status: 'RUNNING' }, identity));
      state = agentWorkspaceReducer(state, event(type, { status: 'CANCELLED' }, identity));
      expect(state.tools[0]?.status).toBe('UNKNOWN');
    }
  );

  it('does not relabel normal rejection or successful tools as cancelled', () => {
    for (const [status, errorMessage, expected] of [
      ['DENIED', 'User rejected proposal', 'DENIED'],
      ['SUCCEEDED', proof, 'SUCCEEDED']
    ]) {
      const state = agentWorkspaceReducer(
        start(),
        event('TOOL_COMPLETED', { ...tool, status, errorMessage }, identity)
      );
      expect(state.tools[0]?.status).toBe(expected);
    }
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
