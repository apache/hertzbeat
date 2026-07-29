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
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({
  loadEmailServerConfig: vi.fn(),
  loadSmsServerConfig: vi.fn(),
  saveEmailServerConfig: vi.fn(),
  saveSmsServerConfig: vi.fn()
}));
vi.mock('../api/message-server-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/message-server-api')>()),
  ...api
}));
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { MessageServerContractError } from '../api/message-server-schema';
import { useMessageServerController } from './use-message-server-controller';

describe('useMessageServerController reads', () => {
  beforeEach(() => vi.resetAllMocks());

  it('keeps configured and missing revision evidence distinct', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', revision: 'missing', config: null });
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    expect(result.current.sms.kind).toBe('missing');
  });

  it('keeps invalid, permission, and unavailable reads distinct', async () => {
    api.loadEmailServerConfig.mockRejectedValue(new MessageServerContractError());
    api.loadSmsServerConfig.mockRejectedValue(new ApiMessageError('redacted', { status: 503 }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('invalid'));
    expect(result.current.sms.kind).toBe('unavailable');
  });

  it('does not start a retained save action after page ownership is retired', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', revision: 'missing', config: null });
    const { result, unmount } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    result.current.actions.openEmail();
    const retainedSubmit = result.current.actions.submitEmail;

    unmount();
    await retainedSubmit();
    expect(api.saveEmailServerConfig).not.toHaveBeenCalled();
  });
});

function emailEvidence() {
  return {
    status: 'configured' as const,
    revision: 'email-r1',
    config: {
      type: 0,
      emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test',
      emailPort: 587,
      emailSsl: false,
      emailStarttls: true,
      enable: true,
      configuredSecrets: ['emailPassword' as const]
    }
  };
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SessionContext.Provider
        value={{
          session: {
            authenticated: true,
            username: 'administrator',
            workspaceId: null,
            roles: ['ADMIN'],
            expiresAt: null
          },
          loading: false,
          retry: () => undefined
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SessionContext.Provider>
    );
  };
}
