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

import { act, renderHook as renderRawHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentGatewayEvent, AgentSourceTarget } from '../model/agent-workspace-contract';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useAgentWorkspaceController } from './use-agent-workspace-controller';

const renderHook: typeof renderRawHook = (callback, options) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderRawHook(callback, { ...options, wrapper: Wrapper });
};
vi.mock('../api/agent-batch-api', () => ({
  getAgentBatch: vi.fn().mockResolvedValue(null),
  streamAgentBatch: vi.fn()
}));

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

vi.mock('../api/agent-gateway-api', () => ({
  ...api,
  listAgentTranscriptPage: async (sessionUid: string, signal?: AbortSignal) => ({
    items: await api.listAgentTranscript(sessionUid, signal),
    pageIndex: 0
  })
}));

describe('useAgentWorkspaceController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAgentSessions.mockResolvedValue([]);
    api.listAgentTranscript.mockResolvedValue([]);
    api.getLatestAgentRun.mockResolvedValue(null);
  });

  it('cancels the entire pending run and only prepares a manually sent revision draft', async () => {
    const pending = {
      approvalId: 'a',
      toolCallId: 'call-a',
      toolName: 'monitor.favorite_set',
      status: 'WAITING_APPROVAL',
      canDecide: true
    };
    const running = {
      ...snapshot('run-1', 'session-1', 'message-1', 'RUNNING'),
      approvalRecoveryUnavailable: false,
      recoveredApprovals: [pending, { ...pending, approvalId: 'b', toolCallId: 'call-b' }]
    };
    const cancelled = {
      ...running,
      status: 'CANCELLED',
      recoveredApprovals: running.recoveredApprovals.map(a => ({ ...a, status: 'UNAVAILABLE', canDecide: false }))
    };
    api.listAgentSessions.mockResolvedValue([session('session-1', 'conversation-1', 'RUNNING')]);
    api.getLatestAgentRun.mockResolvedValue(running);
    api.getAgentRun.mockResolvedValueOnce(running).mockResolvedValueOnce(cancelled);
    api.stopAgentRun.mockResolvedValue({ accepted: true });
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    await act(async () => result.current.actions.selectSession('session-1'));
    let ok = false;
    await act(async () => {
      const outcomes = await Promise.all([
        result.current.actions.reviseApproval!('a', 'Disable only the dedicated test policy'),
        result.current.actions.reviseApproval!('a', 'Second duplicate click')
      ]);
      expect(outcomes).toEqual([true, false]);
      ok = outcomes[0]!;
    });
    expect(ok).toBe(true);
    expect(result.current.composer).toBe('Disable only the dedicated test policy');
    expect(result.current.run.status).not.toBe('running');
    expect(result.current.run.approvals.every(a => a.canDecide !== true)).toBe(true);
    expect(api.stopAgentRun).toHaveBeenCalledExactlyOnceWith('run-1');
    expect(api.decideAgentApproval).not.toHaveBeenCalled();
    expect(api.streamAgentChat).not.toHaveBeenCalled();
    api.getLatestAgentRun.mockResolvedValue(snapshot('run-revised', 'session-1', 'message-new', 'SUCCEEDED'));
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-revised', sessionUid: 'session-1' }));
      publish(event('RUN_COMPLETED', {}, { runUid: 'run-revised', sessionUid: 'session-1' }));
      return Promise.resolve();
    });
    await act(async () => result.current.actions.send());
    expect(api.streamAgentChat).toHaveBeenCalledTimes(1);
    expect(api.streamAgentChat.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ message: 'Disable only the dedicated test policy', messageId: expect.any(String) })
    );
    expect(api.streamAgentChat.mock.calls[0]?.[0].messageId).not.toBe('message-1');
    expect(api.decideAgentApproval).not.toHaveBeenCalled();
  });

  it('does not move a selected session backwards when its snapshot timestamp is older', async () => {
    api.listAgentSessions.mockResolvedValue([
      {
        ...session('session-1', 'conversation-1', 'RUNNING'),
        gmtUpdate: '2026-08-14T12:00:00'
      },
      {
        ...session('session-2', 'conversation-2', 'SUCCEEDED'),
        gmtUpdate: '2026-08-14T11:30:00'
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([]);
    api.getLatestAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'FAILED', 'Warehouse unavailable'),
      completedAt: '2026-08-14T11:00:00'
    });
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));

    await waitFor(() => expect(result.current.run.status).toBe('error'));
    expect(result.current.sessions.items.map(item => item.sessionUid)).toEqual(['session-1', 'session-2']);
    expect(result.current.sessions.items[0]).toMatchObject({
      status: 'FAILED',
      gmtUpdate: '2026-08-14T12:00:00'
    });
  });

  it('does not let an aborted old selection overwrite the newer session', async () => {
    const oldTranscript = deferred<unknown[]>();
    const oldRun = deferred<ReturnType<typeof snapshot>>();
    let oldTranscriptSignal: AbortSignal | undefined;
    let oldRunSignal: AbortSignal | undefined;
    api.listAgentSessions.mockResolvedValue([
      session('session-old', 'conversation-old', 'FAILED'),
      session('session-new', 'conversation-new', 'COMPLETED')
    ]);
    api.listAgentTranscript.mockImplementation((sessionUid: string, signal?: AbortSignal) => {
      if (sessionUid === 'session-old') {
        oldTranscriptSignal = signal;
        return oldTranscript.promise;
      }
      return Promise.resolve([{ id: 2, sequence: 1, role: 'assistant', text: 'New answer', createdAt: null }]);
    });
    api.getLatestAgentRun.mockImplementation((sessionUid: string, signal?: AbortSignal) => {
      if (sessionUid === 'session-old') {
        oldRunSignal = signal;
        return oldRun.promise;
      }
      return Promise.resolve(snapshot('run-new', 'session-new', 'message-new', 'SUCCEEDED', null, 'New answer'));
    });
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    let oldSelection!: Promise<void>;
    act(() => {
      oldSelection = result.current.actions.selectSession('session-old');
    });
    await act(async () => result.current.actions.selectSession('session-new'));

    await waitFor(() => expect(result.current.run.runUid).toBe('run-new'));
    expect(oldTranscriptSignal?.aborted).toBe(true);
    expect(oldRunSignal?.aborted).toBe(true);
    oldTranscript.resolve([{ id: 1, sequence: 1, role: 'assistant', text: 'Old answer', createdAt: null }]);
    oldRun.resolve(snapshot('run-old', 'session-old', 'message-old', 'FAILED', 'Old failure'));
    await act(async () => oldSelection);
    expect(result.current.selectedSessionUid).toBe('session-new');
    expect(result.current.run.runUid).toBe('run-new');
    expect(result.current.transcript.items).toEqual([expect.objectContaining({ text: 'New answer' })]);
  });

  it('does not let an aborted run convergence restore a session after starting a new investigation', async () => {
    const oldRefresh = deferred<ReturnType<typeof session>[]>();
    api.listAgentSessions.mockResolvedValueOnce([]).mockReturnValueOnce(oldRefresh.promise);
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-old', sessionUid: 'session-old' }));
      publish(event('RUN_COMPLETED', {}));
      return Promise.resolve();
    });
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    act(() => result.current.actions.setComposer('Inspect the old run'));
    let execution!: Promise<void>;
    act(() => {
      execution = result.current.actions.send();
    });
    await waitFor(() => expect(api.listAgentSessions).toHaveBeenCalledTimes(2));
    act(() => result.current.actions.newInvestigation());
    oldRefresh.resolve([session('session-old', 'conversation-old', 'COMPLETED')]);
    await act(async () => execution);

    expect(result.current.selectedSessionUid).toBeUndefined();
    expect(result.current.run.status).toBe('idle');
    expect(result.current.transcript.items).toEqual([]);
    expect(api.listAgentTranscript).not.toHaveBeenCalledWith('session-old', expect.anything());
  });

  it('resets stale draft and runtime context when the route source intent changes', async () => {
    const first = sourceTarget();
    const second = {
      ...sourceTarget(),
      monitorId: 43,
      signal: { ...sourceTarget().signal, query: 'basic.threads_connected' }
    };
    const { result, rerender } = renderHook(({ target }) => useAgentWorkspaceController({ target }), {
      initialProps: { target: first }
    });
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    act(() => result.current.actions.setComposer('Stale prompt'));

    rerender({ target: second });

    await waitFor(() => expect(result.current.composer).toBe(''));
    expect(result.current.target).toEqual(second);
    expect(result.current.selectedSessionUid).toBeUndefined();
    expect(result.current.run.status).toBe('idle');
  });

  it('invalidates stale stream settlement across alert-to-alert and alert-to-monitor source changes', async () => {
    const oldStream = deferred<void>();
    api.streamAgentChat.mockReturnValue(oldStream.promise);
    const alertA: AgentSourceTarget = { alertId: 41, alertType: 'single' };
    const alertB: AgentSourceTarget = { alertId: 42, alertType: 'single' };
    const monitor: AgentSourceTarget = sourceTarget();
    const initialProps: { target: AgentSourceTarget } = { target: alertA };
    const { result, rerender } = renderHook(
      ({ target }: { target: AgentSourceTarget }) => useAgentWorkspaceController({ target }),
      { initialProps }
    );
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    act(() => result.current.actions.setComposer('Inspect alert A'));
    let execution!: Promise<void>;
    act(() => {
      execution = result.current.actions.send();
    });
    await waitFor(() => expect(api.streamAgentChat).toHaveBeenCalledOnce());

    rerender({ target: alertB });
    await waitFor(() => expect(result.current.target).toEqual(alertB));
    oldStream.reject(new Error('stale response'));
    await act(async () => execution);
    expect(result.current.failure).toBeUndefined();
    expect(result.current.target).toEqual(alertB);
    expect(result.current.run.status).toBe('idle');

    rerender({ target: monitor });
    await waitFor(() => expect(result.current.target).toEqual(monitor));
    expect(result.current.failure).toBeUndefined();
  });

  it('blocks invalid target-looking routes and resets between distinct invalid URLs', async () => {
    const { result, rerender } = renderHook(
      ({ contextKey }) => useAgentWorkspaceController({ contextKey, invalidTarget: true }),
      { initialProps: { contextKey: 'invalid:/ai?entityId=73' } }
    );
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    act(() => result.current.actions.setComposer('Must not become untargeted'));
    await act(async () => result.current.actions.send());
    expect(api.streamAgentChat).not.toHaveBeenCalled();
    expect(result.current.invalidTarget).toBe(true);

    rerender({ contextKey: 'invalid:/ai?alertId=9' });

    await waitFor(() => expect(result.current.composer).toBe(''));
    expect(result.current.run.status).toBe('idle');
    expect(api.streamAgentChat).not.toHaveBeenCalled();
  });

  it('converges a restored approval without replaying the model stream', async () => {
    const pending = {
      approvalId: 'approval-restored',
      toolCallId: 'call',
      toolName: 'monitor.create_batch',
      status: 'WAITING_APPROVAL',
      canDecide: true
    };
    api.listAgentSessions.mockResolvedValue([session('session-1', 'conversation-1', 'RUNNING')]);
    api.getLatestAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'RUNNING'),
      recoveredApprovals: [pending]
    });
    api.getAgentRun.mockResolvedValue({
      ...snapshot('run-1', 'session-1', 'message-1', 'SUCCEEDED'),
      result: 'Partial: HTTP_403',
      replayAvailable: true,
      recoveredApprovals: [{ ...pending, status: 'APPROVED', canDecide: false }]
    });
    api.decideAgentApproval.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    await act(async () => result.current.actions.selectSession('session-1'));
    expect(result.current.run.approvals).toHaveLength(1);
    api.getLatestAgentRun.mockResolvedValue(
      snapshot('run-1', 'session-1', 'message-1', 'SUCCEEDED', null, 'Partial: HTTP_403')
    );
    api.listAgentTranscript.mockResolvedValue([
      { id: 2, sequence: 1, role: 'assistant', text: 'Partial: HTTP_403', createdAt: null }
    ]);
    await act(async () => result.current.actions.decideApproval('approval-restored', 'approve'));
    expect(result.current.run.status).not.toBe('running');
    expect(result.current.transcript.items).toEqual([expect.objectContaining({ text: 'Partial: HTTP_403' })]);
    expect(result.current.run.approvals).toHaveLength(0);
    expect(api.decideAgentApproval).toHaveBeenCalledTimes(1);
    expect(api.streamAgentChat).not.toHaveBeenCalled();
  });

  it('ignores stale stop, approval, and interaction failures after a workspace reset', async () => {
    api.listAgentSessions.mockResolvedValue([session('session-1', 'conversation-1', 'RUNNING')]);
    api.getLatestAgentRun.mockResolvedValue(snapshot('run-1', 'session-1', 'message-1', 'RUNNING'));
    const stop = deferred<void>();
    api.stopAgentRun.mockReturnValue(stop.promise);
    const approval = deferred<void>();
    api.decideAgentApproval.mockReturnValue(approval.promise);
    const interaction = deferred<void>();
    api.submitAgentInteraction.mockReturnValue(interaction.promise);
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    await act(async () => result.current.actions.selectSession('session-1'));

    let stopping!: Promise<void>;
    act(() => {
      stopping = result.current.actions.stop();
    });
    await waitFor(() => expect(result.current.stopping).toBe(true));
    act(() => result.current.actions.newInvestigation());
    stop.reject(new Error('old stop failure'));
    await act(async () => stopping);
    expect(result.current.stopping).toBe(false);
    expect(result.current.failure).toBeUndefined();

    let approving!: Promise<void>;
    act(() => {
      approving = result.current.actions.decideApproval('approval-1', 'approve');
    });
    act(() => result.current.actions.newInvestigation());
    approval.reject(new Error('old approval failure'));
    await act(async () => approving);
    expect(result.current.failure).toBeUndefined();

    let submitting!: Promise<void>;
    act(() => {
      submitting = result.current.actions.submitInteraction('interaction-1', { value: 'old' });
    });
    act(() => result.current.actions.newInvestigation());
    interaction.reject(new Error('old interaction failure'));
    await act(async () => submitting);
    expect(result.current.failure).toBeUndefined();
  });

  it('bounds active observation without fabricating a terminal state or losing recovery actions', async () => {
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(
        event(
          'RUN_STATUS',
          { status: 'RUNNING', result: null, errorMessage: null, replayAvailable: true },
          { runUid: 'run-stale', sessionUid: 'session-1' }
        )
      );
      return Promise.resolve();
    });
    api.getAgentRun.mockResolvedValue(snapshot('run-stale', 'session-1', 'message-1', 'RUNNING'));
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    vi.useFakeTimers();
    try {
      act(() => result.current.actions.setComposer('Inspect checkout'));
      await act(async () => {
        const execution = result.current.actions.send();
        await vi.advanceTimersByTimeAsync(95_000);
        await execution;
      });

      expect(api.getAgentRun.mock.calls.length).toBeGreaterThan(0);
      expect(api.getAgentRun.mock.calls.length).toBeLessThan(100);
      expect(result.current.streaming).toBe(false);
      expect(result.current.run).toMatchObject({
        runUid: 'run-stale',
        status: 'running',
        observationExpired: true
      });
      const originalId = api.streamAgentChat.mock.calls[0]?.[0].messageId;
      api.streamAgentChat.mockRejectedValueOnce(new Error('transport unavailable'));
      await act(async () => result.current.actions.recover());
      expect(api.streamAgentChat.mock.calls[1]?.[0].messageId).toBe(originalId);
      await act(async () => result.current.actions.retry());
      expect(api.streamAgentChat).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
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
