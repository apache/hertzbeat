/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentGatewayEvent } from '../model/agent-workspace-contract';
import { useAgentWorkspaceController } from './use-agent-workspace-controller';

const api = vi.hoisted(() => ({
  decideAgentApproval: vi.fn(),
  getAgentRun: vi.fn(),
  getLatestAgentRun: vi.fn(),
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
    api.getLatestAgentRun.mockResolvedValue(null);
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
    const target = {
      monitorId: 42,
      signal: {
        type: 'metrics' as const,
        query: 'basic.max_connections',
        start: 200_000,
        end: 2_000_000,
        timezone: 'Asia/Shanghai'
      }
    };
    const { result } = renderHook(() => useAgentWorkspaceController({ target, language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Check database waits'));
    await act(async () => result.current.actions.send());

    expect(api.streamAgentChat).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Check database waits', target, attachments: [] }),
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

    await act(async () => result.current.actions.recover());
    expect(api.streamAgentChat).toHaveBeenCalledTimes(2);
    expect(api.streamAgentChat.mock.calls[1]?.[0]).toEqual(api.streamAgentChat.mock.calls[0]?.[0]);
  });

  it('replaces the URL source intent with the durable canonical target after RUN_STARTED', async () => {
    const completed = deferred<void>();
    api.getAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'RUNNING'),
      target: canonicalTarget()
    });
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-1', sessionUid: 'session-1' }));
      return completed.promise;
    });
    const { result } = renderHook(() => useAgentWorkspaceController({ target: sourceTarget() }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    act(() => result.current.actions.setComposer('Inspect the selected metric'));
    let execution!: Promise<void>;
    act(() => {
      execution = result.current.actions.send();
    });

    await waitFor(() => expect(result.current.target).toEqual(canonicalTarget()));
    expect(api.getAgentRun).toHaveBeenCalledWith('run-1', expect.any(AbortSignal));
    completed.resolve();
    await act(async () => execution);
  });

  it('converges failed runs without hiding the runtime or tool error', async () => {
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-1', sessionUid: 'session-1' }));
      publish(
        event(
          'TOOL_COMPLETED',
          {
            toolName: 'metrics.history',
            toolCallId: 'tool-1',
            status: 'failed',
            errorMessage: 'Metrics warehouse unavailable'
          },
          { itemId: 'tool-1' }
        )
      );
      publish(event('ERROR', { errorMessage: 'Runtime model returned no response.' }));
      return Promise.resolve();
    });
    api.listAgentSessions.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        sessionUid: 'session-1',
        conversationId: 'conversation-1',
        status: 'FAILED',
        title: 'Failed metrics investigation',
        gmtCreate: null,
        gmtUpdate: null
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([
      {
        id: 1,
        sequence: 1,
        role: 'toolResult',
        text: 'Metrics warehouse unavailable',
        toolName: 'metrics.history',
        errorMessage: 'Metrics warehouse unavailable',
        createdAt: null
      }
    ]);
    const { result } = renderHook(() =>
      useAgentWorkspaceController({
        target: {
          monitorId: 42,
          signal: {
            type: 'metrics',
            query: 'basic.max_connections',
            start: 200_000,
            end: 2_000_000,
            timezone: 'Asia/Shanghai'
          }
        }
      })
    );
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Inspect the selected metric'));
    await act(async () => result.current.actions.send());

    expect(result.current.selectedSessionUid).toBe('session-1');
    expect(result.current.sessions.items[0]?.status).toBe('FAILED');
    expect(result.current.transcript.items[0]).toMatchObject({ toolName: 'metrics.history' });
    expect(result.current.run).toMatchObject({
      status: 'error',
      errorMessage: 'Runtime model returned no response.',
      tools: [expect.objectContaining({ errorMessage: 'Metrics warehouse unavailable' })]
    });
    await act(async () => result.current.actions.retry());
    expect(api.streamAgentChat).toHaveBeenCalledTimes(2);
    expect(api.streamAgentChat.mock.calls[1]?.[0].messageId).not.toBe(api.streamAgentChat.mock.calls[0]?.[0].messageId);
  });

  it('recovers an active replay with the same message id and polls its durable result', async () => {
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(
        event(
          'RUN_STATUS',
          { status: 'RUNNING', result: null, errorMessage: null, replayAvailable: true },
          { runUid: 'run-1', sessionUid: 'session-1' }
        )
      );
      return Promise.resolve();
    });
    api.getAgentRun.mockResolvedValue({
      runUid: 'run-1',
      sessionUid: 'session-1',
      messageId: 'message-1',
      status: 'SUCCEEDED',
      target: null,
      result: 'Durable answer',
      errorMessage: null,
      replayAvailable: true,
      startedAt: null,
      completedAt: null
    });
    api.listAgentSessions.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        sessionUid: 'session-1',
        conversationId: 'conversation-1',
        status: 'COMPLETED',
        title: 'Recovered',
        gmtCreate: null,
        gmtUpdate: null
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'assistant', text: 'Durable answer', createdAt: null }
    ]);
    const { result } = renderHook(() => useAgentWorkspaceController({ language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Recover this run'));
    await act(async () => result.current.actions.send());

    expect(api.getAgentRun).toHaveBeenCalledWith('run-1', expect.any(AbortSignal));
    expect(result.current.transcript.items).toEqual([expect.objectContaining({ text: 'Durable answer' })]);
  });

  it('restores the exact latest failed run when a refreshed session is selected', async () => {
    api.listAgentSessions.mockResolvedValue([
      {
        ...session('session-1', 'conversation-1', 'RUNNING'),
        gmtUpdate: '2026-08-14T10:00:00'
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'user', text: 'Inspect checkout', createdAt: null }
    ]);
    api.getLatestAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'FAILED', 'Warehouse unavailable'),
      target: canonicalTarget(),
      completedAt: '2026-08-14T11:00:00'
    });
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));

    await waitFor(() => expect(result.current.run.status).toBe('error'));
    expect(result.current.run).toMatchObject({ runUid: 'run-1', errorMessage: 'Warehouse unavailable' });
    expect(result.current.target).toEqual(canonicalTarget());
    expect(result.current.sessions.items[0]).toMatchObject({
      status: 'FAILED',
      gmtUpdate: '2026-08-14T11:00:00'
    });
    expect(result.current.run.recoveryAvailable).toBe(false);
    expect(result.current.transcript.items).toEqual([expect.objectContaining({ text: 'Inspect checkout' })]);
    await act(async () => result.current.actions.retry());
    expect(api.streamAgentChat).not.toHaveBeenCalled();
  });

  it('restores an exact durable request for a fresh retry after refresh', async () => {
    api.listAgentSessions.mockResolvedValue([session('session-1', 'conversation-1', 'FAILED')]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'user', text: 'Inspect checkout', createdAt: null }
    ]);
    api.getLatestAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'FAILED', 'Warehouse unavailable'),
      retryRequest: {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        message: 'Inspect checkout',
        target: sourceTarget(),
        attachments: ['artifact-a', 'artifact-b'],
        preferredLanguage: 'ja-JP'
      }
    });
    const { result } = renderHook(() => useAgentWorkspaceController({ language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));
    expect(result.current.run).toMatchObject({ recoveryAvailable: false, retryAvailable: true });
    await act(async () => result.current.actions.retry());

    expect(api.streamAgentChat).toHaveBeenCalledOnce();
    expect(api.streamAgentChat.mock.calls[0]?.[0]).toEqual({
      conversationId: 'conversation-1',
      messageId: expect.not.stringMatching('message-1'),
      message: 'Inspect checkout',
      target: sourceTarget(),
      attachments: ['artifact-a', 'artifact-b'],
      preferredLanguage: 'ja-JP'
    });
    expect(api.streamAgentChat.mock.calls[0]?.[2]).toMatchObject({ language: 'ja-JP' });
  });

  it('restores an exact active request for same-id recovery only', async () => {
    api.listAgentSessions.mockResolvedValue([session('session-1', 'conversation-1', 'RUNNING')]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'user', text: 'Inspect checkout', createdAt: null }
    ]);
    api.getLatestAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'RUNNING'),
      retryRequest: {
        conversationId: 'conversation-1',
        messageId: 'message-1',
        message: 'Inspect checkout',
        target: sourceTarget(),
        attachments: [],
        preferredLanguage: 'en-US'
      }
    });
    api.streamAgentChat.mockRejectedValue(new Error('transport unavailable'));
    const { result } = renderHook(() => useAgentWorkspaceController({ language: 'ja-JP' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));
    expect(result.current.run).toMatchObject({ status: 'running', recoveryAvailable: true, retryAvailable: false });
    await act(async () => result.current.actions.recover());
    expect(api.streamAgentChat).toHaveBeenCalledOnce();
    expect(api.streamAgentChat.mock.calls[0]?.[0]).toMatchObject({
      messageId: 'message-1',
      preferredLanguage: 'en-US'
    });
    await act(async () => result.current.actions.retry());
    expect(api.streamAgentChat).toHaveBeenCalledOnce();
  });
});

function session(sessionUid: string, conversationId: string, status: string) {
  return { id: 1, sessionUid, conversationId, status, title: sessionUid, gmtCreate: null, gmtUpdate: null };
}

function sourceTarget() {
  return {
    monitorId: 42,
    signal: {
      type: 'metrics' as const,
      query: 'basic.max_connections',
      start: 200_000,
      end: 2_000_000,
      timezone: 'Asia/Shanghai'
    }
  };
}

function canonicalTarget() {
  return {
    ...sourceTarget(),
    version: 'entity-monitor-metric.v1',
    entityId: 73,
    service: { name: 'checkout-db', namespace: 'database', environment: 'production' }
  };
}

function snapshot(
  runUid: string,
  sessionUid: string,
  messageId: string,
  status: 'CREATED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED',
  errorMessage: string | null = null,
  result: string | null = null
) {
  return {
    runUid,
    sessionUid,
    messageId,
    status,
    target: null,
    result,
    errorMessage,
    replayAvailable: true,
    startedAt: null,
    completedAt: null,
    retryRequest: null
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, reject, resolve };
}

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
