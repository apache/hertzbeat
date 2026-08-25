/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
