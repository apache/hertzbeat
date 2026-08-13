/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentGatewayEvent } from '../model/agent-workspace-contract';
import { useAgentWorkspaceController } from './use-agent-workspace-controller';

const api = vi.hoisted(() => ({
  decideAgentApproval: vi.fn(),
  listAgentSessions: vi.fn(),
  listAgentTranscript: vi.fn(),
  stopAgentRun: vi.fn(),
  streamAgentChat: vi.fn(),
  submitAgentInteraction: vi.fn()
}));

vi.mock('../api/agent-gateway-api', () => api);

describe('useAgentWorkspaceController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAgentSessions.mockResolvedValue([]);
    api.listAgentTranscript.mockResolvedValue([]);
  });

  it('streams one target-bound investigation and converges to its authoritative transcript', async () => {
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-1', sessionUid: 'session-1' }));
      publish(event('MESSAGE_DELTA', { delta: 'Database waits increased.' }, { itemId: 'message-1' }));
      publish(event('RUN_COMPLETED', {}));
      return Promise.resolve();
    });
    api.listAgentSessions.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        sessionUid: 'session-1',
        conversationId: 'conversation-1',
        status: 'COMPLETED',
        title: 'Database waits',
        gmtCreate: null,
        gmtUpdate: null
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'assistant', text: 'Database waits increased.', createdAt: null }
    ]);
    const { result } = renderHook(() => useAgentWorkspaceController({ target: { entityId: 73 }, language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Check database waits'));
    await act(async () => result.current.actions.send());

    expect(api.streamAgentChat).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Check database waits', target: { entityId: 73 }, attachments: [] }),
      expect.any(Function),
      expect.objectContaining({ language: 'en-US' })
    );
    await waitFor(() => expect(result.current.selectedSessionUid).toBe('session-1'));
    expect(result.current.transcript.items).toEqual([expect.objectContaining({ text: 'Database waits increased.' })]);
    expect(result.current.draftMessages).toEqual([]);
  });

  it('retains the exact request for a cause-free retry after response loss', async () => {
    api.streamAgentChat.mockRejectedValueOnce(new Error('private provider detail')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAgentWorkspaceController({ language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Inspect checkout'));
    await act(async () => result.current.actions.send());
    expect(result.current.failure).toBe('unavailable');

    await act(async () => result.current.actions.retry());
    expect(api.streamAgentChat).toHaveBeenCalledTimes(2);
    expect(api.streamAgentChat.mock.calls[1]?.[0]).toEqual(api.streamAgentChat.mock.calls[0]?.[0]);
  });
});

function event(
  type: AgentGatewayEvent['type'],
  payload: Record<string, unknown>,
  identity: { runUid?: string; sessionUid?: string; itemId?: string } = {}
): AgentGatewayEvent {
  return {
    type,
    eventId: `event-${type}`,
    conversationId: 'conversation-1',
    sessionUid: identity.sessionUid ?? null,
    runUid: identity.runUid ?? null,
    itemId: identity.itemId ?? null,
    payload,
    timestamp: 1
  };
}
