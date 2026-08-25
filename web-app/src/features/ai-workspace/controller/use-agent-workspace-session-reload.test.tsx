/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('AI workspace durable session reload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAgentSessions.mockResolvedValue([session()]);
    api.listAgentTranscript.mockResolvedValue([durableUser()]);
    api.getLatestAgentRun.mockResolvedValue(failedSnapshot());
  });

  it('keeps a durable USER visible when latest-run loading fails', async () => {
    api.getLatestAgentRun.mockRejectedValue(new Error('contract'));
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));

    expect(result.current.transcript).toEqual({ status: 'error', items: [durableUser()] });
    expect(result.current.run.status).toBe('idle');
  });

  it('converges the exact FAILED snapshot and retry when transcript loading fails', async () => {
    api.listAgentTranscript.mockRejectedValue(new Error('contract'));
    const { result } = renderHook(() => useAgentWorkspaceController());
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));

    await act(async () => result.current.actions.selectSession('session-1'));

    expect(result.current.transcript).toEqual({ status: 'error', items: [] });
    expect(result.current.run).toMatchObject({
      status: 'error',
      errorMessage: 'Runtime model returned no response.',
      retryAvailable: true
    });
    expect(result.current.target).toMatchObject({ version: 'entity-monitor-metric.v1', entityId: 73, monitorId: 42 });

    await act(async () => result.current.actions.retry());
    expect(api.streamAgentChat).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        messageId: expect.not.stringMatching('message-1'),
        message: 'Inspect response time',
        target: sourceTarget()
      }),
      expect.any(Function),
      expect.objectContaining({ language: 'zh-CN' })
    );
  });
});

function durableUser() {
  return {
    id: 1,
    sequence: 1,
    role: 'user' as const,
    text: 'Inspect response time',
    createdAt: '2026-08-15T04:21:33.436546'
  };
}

function session() {
  return {
    id: 1,
    sessionUid: 'session-1',
    conversationId: 'conversation-1',
    status: 'FAILED',
    title: 'Response time',
    gmtCreate: null,
    gmtUpdate: '2026-08-15T04:21:33.504973'
  };
}

function failedSnapshot() {
  return {
    runUid: 'run-1',
    sessionUid: 'session-1',
    messageId: 'message-1',
    status: 'FAILED' as const,
    target: {
      ...sourceTarget(),
      version: 'entity-monitor-metric.v1',
      entityId: 73,
      service: { name: 'mysql-primary' }
    },
    result: null,
    errorMessage: 'Runtime model returned no response.',
    replayAvailable: true,
    startedAt: '2026-08-15T04:21:33.438437',
    completedAt: '2026-08-15T04:21:33.504973',
    retryRequest: {
      conversationId: 'conversation-1',
      messageId: 'message-1',
      message: 'Inspect response time',
      target: sourceTarget(),
      attachments: [],
      preferredLanguage: 'zh-CN'
    }
  };
}

function sourceTarget() {
  return {
    monitorId: 42,
    signal: {
      type: 'metrics' as const,
      query: 'summary.responseTime',
      start: 200_000,
      end: 2_000_000,
      timezone: 'Asia/Shanghai'
    }
  };
}
