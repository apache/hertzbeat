/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  classifyMessageServerReadError: vi.fn((error: unknown) => error === 'invalid' ? 'invalid' : 'unavailable'),
  loadEmailServerConfig: vi.fn(),
  loadSmsServerConfig: vi.fn(),
  saveEmailServerConfig: vi.fn(),
  saveSmsServerConfig: vi.fn()
}));
vi.mock('../api/message-server-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/message-server-api')>(),
  ...api
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMessageServerController } from './use-message-server-controller';

describe('useMessageServerController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps configured and missing evidence distinct and proves save by reread', async () => {
    const email = { status: 'configured' as const, config: { type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true,
      configuredSecrets: ['emailPassword' as const] } };
    const missing = { status: 'missing' as const, config: null };
    api.loadEmailServerConfig.mockResolvedValue(email);
    api.loadSmsServerConfig.mockResolvedValue(missing);
    api.saveEmailServerConfig.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    expect(result.current.sms.kind).toBe('missing');
    act(() => result.current.actions.openEmail());
    expect(result.current.emailDraft?.emailPassword).toBe('');
    act(() => result.current.actions.setEmailSecretCleared(true));
    expect(result.current.emailDraft?.clearSecrets).toEqual(['emailPassword']);
    act(() => result.current.actions.updateEmail({ emailPassword: 'replacement' }));
    expect(result.current.emailDraft?.clearSecrets).toEqual([]);
    act(() => result.current.actions.setEmailSecretCleared(true));
    expect(result.current.emailDraft?.emailPassword).toBe('');
    act(() => result.current.actions.setEmailSecretCleared(false));
    await act(async () => result.current.actions.submitEmail());

    expect(api.saveEmailServerConfig).toHaveBeenCalledWith({ type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true });
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.emailDraft).toBeNull());
  });

  it('does not collapse invalid configuration into storage unavailability', async () => {
    api.loadEmailServerConfig.mockRejectedValue('invalid');
    api.loadSmsServerConfig.mockRejectedValue('offline');
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('invalid'));
    expect(result.current.sms.kind).toBe('unavailable');
  });

  it('keeps the editor open and exposes reread failure instead of reporting false success', async () => {
    const email = { status: 'configured' as const, config: { type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true,
      configuredSecrets: ['emailPassword' as const] } };
    api.loadEmailServerConfig.mockResolvedValueOnce(email).mockRejectedValueOnce('offline');
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(email);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());
    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft).not.toBeNull();
    await waitFor(() => expect(result.current.email.kind).toBe('unavailable'));
  });

  it('does not close or report convergence when the authoritative reread is missing', async () => {
    const email = { status: 'configured' as const, config: { type: 0, emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test', emailPort: 587, emailSsl: false, emailStarttls: true, enable: true,
      configuredSecrets: ['emailPassword' as const] } };
    api.loadEmailServerConfig.mockResolvedValueOnce(email).mockResolvedValueOnce({ status: 'missing', config: null });
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(email);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());
    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft).not.toBeNull();
    await waitFor(() => expect(result.current.email.kind).toBe('missing'));
  });
});

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}><App>{children}</App></QueryClientProvider>;
  };
}
