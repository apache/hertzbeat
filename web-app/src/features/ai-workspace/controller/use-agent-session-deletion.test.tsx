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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { useAgentSessionDeletion } from './use-agent-session-deletion';
import type { AgentWorkspaceHistory } from './use-agent-workspace-history';
import type { AgentWorkspaceRefs } from './use-agent-workspace-runtime';

const api = vi.hoisted(() => ({ previewAgentSessionDeletion: vi.fn(), deleteAgentSessions: vi.fn() }));
vi.mock('../api/agent-session-management-api', () => api);

function fixture() {
  const reset = vi.fn();
  const history = {
    selectedSessionUid: 'ags_1',
    sessions: { items: [{ sessionUid: 'ags_1', title: 'Local', status: 'SUCCEEDED' }] },
    refreshSessions: vi.fn().mockResolvedValue([])
  } as unknown as AgentWorkspaceHistory;
  const refs = { isMounted: () => true, getOperationGeneration: () => 0 } as AgentWorkspaceRefs;
  return { history, reset, ...renderHook(() => useAgentSessionDeletion(history, refs, reset)) };
}

describe('session deletion orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.previewAgentSessionDeletion.mockResolvedValue({ sessionUids: ['ags_1', 'ags_2', 'ags_3'], activeCount: 0 });
    api.deleteAgentSessions.mockResolvedValue({ deletedCount: 3 });
  });

  it('requires confirmation and cancels without deleting', async () => {
    const { result } = fixture();
    await act(() => result.current.requestClearSessions());
    expect(result.current.state.sessionUids).toEqual(['ags_1', 'ags_2', 'ags_3']);
    expect(api.deleteAgentSessions).not.toHaveBeenCalled();
    act(() => result.current.cancelSessionDeletion());
    await act(() => result.current.confirmSessionDeletion());
    expect(api.deleteAgentSessions).not.toHaveBeenCalled();
  });

  it('deletes the exact preview, including sessions outside the first history page', async () => {
    const { result, reset, history } = fixture();
    await act(() => result.current.requestClearSessions());
    await act(() => result.current.confirmSessionDeletion());
    expect(api.deleteAgentSessions).toHaveBeenCalledExactlyOnceWith(['ags_1', 'ags_2', 'ags_3']);
    expect(reset).toHaveBeenCalledOnce();
    expect(history.refreshSessions).toHaveBeenCalledOnce();
    expect(result.current.state.phase).toBe('idle');
  });

  it('selects only the requested visible session', async () => {
    const { result } = fixture();
    act(() => result.current.requestDeleteSession('ags_1'));
    expect(result.current.state.title).toBe('Local');
    await act(() => result.current.confirmSessionDeletion());
    expect(api.deleteAgentSessions).toHaveBeenCalledExactlyOnceWith(['ags_1']);
  });

  it('blocks active preview and preserves history on a server-side active race', async () => {
    api.previewAgentSessionDeletion.mockResolvedValueOnce({ sessionUids: ['ags_1'], activeCount: 1 });
    const { result, reset, history } = fixture();
    await act(() => result.current.requestClearSessions());
    await act(() => result.current.confirmSessionDeletion());
    expect(api.deleteAgentSessions).not.toHaveBeenCalled();
    act(() => result.current.cancelSessionDeletion());
    act(() => result.current.requestDeleteSession('ags_1'));
    api.deleteAgentSessions.mockRejectedValueOnce(new ApiMessageError('Conflict', { status: 409 }));
    await act(() => result.current.confirmSessionDeletion());
    expect(result.current.state.error).toBe('active');
    expect(reset).not.toHaveBeenCalled();
    expect(history.refreshSessions).not.toHaveBeenCalled();
  });

  it('does not delete after a preview failure', async () => {
    api.previewAgentSessionDeletion.mockRejectedValueOnce(new Error('offline'));
    const { result } = fixture();
    await act(() => result.current.requestClearSessions());
    await act(() => result.current.confirmSessionDeletion());
    expect(result.current.state.error).toBe('unavailable');
    expect(api.deleteAgentSessions).not.toHaveBeenCalled();
  });
});
