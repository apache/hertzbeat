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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { AgentGatewayEvent } from '../model/agent-workspace-contract';
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

describe('failure transcript convergence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAgentSessions.mockResolvedValue([]);
    api.listAgentTranscript.mockResolvedValue([]);
    api.getLatestAgentRun.mockResolvedValue(null);
  });
  it('keeps one failed reply after durable refill while retaining retry and failure state', async () => {
    api.streamAgentChat.mockImplementation((_request, publish: (event: AgentGatewayEvent) => void) => {
      publish(event('RUN_STARTED', {}, { runUid: 'run-1', sessionUid: 'session-1' }));
      publish(event('MESSAGE_DELTA', { delta: 'No verified data. Budget reached.' }, { itemId: 'reply' }));
      publish(event('MESSAGE_COMPLETED', {}, { itemId: 'reply' }));
      publish(event('ERROR', { errorMessage: 'READ_EQUIVALENT_REQUEST_BUDGET' }, { runUid: 'run-1' }));
      return Promise.resolve();
    });
    api.listAgentSessions.mockResolvedValue([
      {
        id: 1,
        sessionUid: 'session-1',
        conversationId: 'conversation-1',
        status: 'FAILED',
        title: 'Logs',
        gmtCreate: null,
        gmtUpdate: null
      }
    ]);
    api.listAgentTranscript.mockResolvedValue([
      { id: 1, sequence: 1, role: 'user', text: 'How many logs in the last half hour?', createdAt: null },
      { id: 2, sequence: 2, role: 'assistant', text: 'No verified data. Budget reached.', createdAt: null }
    ]);
    api.getLatestAgentRun.mockResolvedValue({
      runUid: 'run-1',
      sessionUid: 'session-1',
      messageId: 'm',
      status: 'FAILED',
      result: null,
      errorMessage: 'READ_EQUIVALENT_REQUEST_BUDGET',
      target: null,
      replayAvailable: true,
      startedAt: null,
      completedAt: null,
      retryRequest: null
    });
    const { result } = renderHook(() => useAgentWorkspaceController({ language: 'en-US' }));
    await waitFor(() => expect(result.current.sessions.status).toBe('ready'));
    act(() => result.current.actions.setComposer('How many logs in the last half hour?'));
    await act(async () => result.current.actions.send());
    expect(result.current.run.status).toBe('error');
    expect(result.current.run.messages).toEqual([]);
    expect(result.current.transcript.items.filter(m => m.role === 'assistant')).toHaveLength(1);
    expect(result.current.run.retryAvailable).toBe(true);
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
