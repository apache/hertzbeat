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

import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
const api = vi.hoisted(() => ({
  getAgentPermission: vi.fn(),
  createAgentPermissionChallenge: vi.fn(),
  confirmAgentPermission: vi.fn(),
  revokeAgentPermission: vi.fn()
}));
vi.mock('../api/agent-permission-api', () => api);
import { useAgentPermissionMode } from './use-agent-permission-mode';
const clients: QueryClient[] = [];
let clock = 100000;
function mount(sessionUid = 'ags-test') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const initialProps: { uid: string | undefined } = { uid: sessionUid };
  return renderHook(({ uid }) => useAgentPermissionMode(uid), {
    initialProps,
    wrapper
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  clock = 100000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  api.getAgentPermission.mockImplementation((sessionUid: string) =>
    Promise.resolve({
      sessionUid,
      mode: 'MANUAL',
      expiresAt: 0,
      serverNow: 10000,
      fullAllowed: true
    })
  );
  api.createAgentPermissionChallenge.mockResolvedValue({
    sessionUid: 'ags-test',
    challengeId: '123e4567-e89b-42d3-a456-426614174000',
    generation: 1,
    notBefore: 15000,
    expiresAt: 130000,
    serverNow: 10000,
    noticeVersion: 1
  });
  api.confirmAgentPermission.mockResolvedValue({
    sessionUid: 'ags-test',
    mode: 'FULL',
    expiresAt: 915000,
    serverNow: 15000,
    fullAllowed: true
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.restoreAllMocks();
});
describe('explicit permission consent', () => {
  it('does not enable after the timer alone and requires acknowledged human confirmation', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.actions.requestFull());
    act(() => result.current.actions.acknowledge(true));
    clock += 4999;
    await waitFor(() => expect(result.current.remainingSeconds).toBe(1));
    expect(result.current.confirmAllowed).toBe(false);
    await act(() => result.current.actions.confirm());
    expect(api.confirmAgentPermission).not.toHaveBeenCalled();
    clock += 251;
    await waitFor(() => expect(result.current.confirmAllowed).toBe(true));
    expect(api.confirmAgentPermission).not.toHaveBeenCalled();
    await act(() => result.current.actions.confirm());
    expect(api.confirmAgentPermission).toHaveBeenCalledTimes(1);
    expect(result.current.dialogOpen).toBe(false);
  });
  it('cannot confirm an old challenge after selecting another conversation', async () => {
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(() => result.current.actions.requestFull());
    act(() => result.current.actions.acknowledge(true));
    clock += 5250;
    await waitFor(() => expect(result.current.confirmAllowed).toBe(true));
    rerender({ uid: undefined });
    expect(result.current.phase).toBe('unselected');
    expect(result.current.dialogOpen).toBe(false);
    rerender({ uid: 'ags-another' });
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(result.current.dialogOpen).toBe(false);
    await act(() => result.current.actions.confirm());
    expect(api.confirmAgentPermission).not.toHaveBeenCalled();
  });
  it('can dismiss a pending challenge and ignores its late response after reopening', async () => {
    let finishOld!: (value: unknown) => void;
    const oldRequest = new Promise(resolve => {
      finishOld = resolve;
    });
    api.createAgentPermissionChallenge.mockImplementationOnce(() => oldRequest);
    const { result } = mount();
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    let oldAction!: Promise<void>;
    act(() => {
      oldAction = result.current.actions.requestFull();
    });
    await waitFor(() => expect(api.createAgentPermissionChallenge).toHaveBeenCalledOnce());
    act(() => result.current.actions.dismiss());
    expect(result.current.dialogOpen).toBe(false);
    const oldSignal = api.createAgentPermissionChallenge.mock.calls[0]?.[1] as AbortSignal;
    expect(oldSignal.aborted).toBe(true);
    await act(() => result.current.actions.requestFull());
    await waitFor(() => expect(api.createAgentPermissionChallenge).toHaveBeenCalledTimes(2));
    act(() => result.current.actions.acknowledge(true));
    clock += 5250;
    await waitFor(() => expect(result.current.confirmAllowed).toBe(true));
    await act(async () => {
      finishOld({
        sessionUid: 'ags-test',
        challengeId: '123e4567-e89b-42d3-a456-426614174999',
        generation: 99,
        notBefore: 15000,
        expiresAt: 130000,
        serverNow: 10000,
        noticeVersion: 1
      });
      await oldAction;
    });
    await act(() => result.current.actions.confirm());
    expect(api.confirmAgentPermission.mock.calls[0]?.[1].challengeId).toBe('123e4567-e89b-42d3-a456-426614174000');
  });
});
