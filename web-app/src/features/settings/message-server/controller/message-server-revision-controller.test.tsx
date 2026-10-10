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
import { act, renderHook, waitFor } from '@testing-library/react';
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
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('../api/message-server-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/message-server-api')>()),
  ...api
}));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: notify }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMessageServerController } from './use-message-server-controller';
import { MessageServerContractError } from '../api/message-server-schema';

describe('Message Server revision ownership', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates from missing, then updates from the revision returned by POST without a redundant GET', async () => {
    api.loadEmailServerConfig.mockResolvedValue(missingEvidence());
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig
      .mockResolvedValueOnce(emailEvidence('email-r1'))
      .mockResolvedValueOnce(emailEvidence('email-r2', { emailHost: 'smtp-b.example.test' }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('missing'));

    act(() => result.current.actions.openEmail());
    act(() =>
      result.current.actions.updateEmail({
        emailHost: 'smtp.example.test',
        emailUsername: 'ops@example.test',
        emailPassword: 'initial-secret'
      })
    );
    await act(async () => result.current.actions.submitEmail());

    expect(api.saveEmailServerConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ emailPassword: 'initial-secret' }),
      'missing',
      expect.any(AbortSignal)
    );
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(result.current.email.kind).toBe('configured');

    act(() => result.current.actions.openEmail());
    act(() => result.current.actions.updateEmail({ emailHost: 'smtp-b.example.test' }));
    await act(async () => result.current.actions.submitEmail());

    expect(api.saveEmailServerConfig).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ emailPassword: expect.anything() }),
      'email-r1',
      expect.any(AbortSignal)
    );
  });

  it('preserves a losing draft until explicit reload, then retries with the newly loaded revision', async () => {
    api.loadEmailServerConfig
      .mockResolvedValueOnce(emailEvidence('email-r1'))
      .mockResolvedValueOnce(emailEvidence('email-r2', { emailHost: 'winner.example.test' }));
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig
      .mockRejectedValueOnce(new ApiMessageError('redacted conflict', { code: 15, status: 409 }))
      .mockResolvedValueOnce(emailEvidence('email-r3', { emailHost: 'loser.example.test' }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());
    act(() => result.current.actions.updateEmail({ emailHost: 'loser.example.test' }));

    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft?.emailHost).toBe('loser.example.test');
    expect(result.current.emailSaveRecovery).toBe('messageServer.revisionConflict');
    expect(result.current.emailSaveRecoveryRetryable).toBe(true);
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.revisionConflict');

    await act(async () => result.current.actions.retryEmailSave());
    expect(result.current.emailDraft?.emailHost).toBe('loser.example.test');
    expect(result.current.emailSaveRecovery).toBeNull();
    expect(result.current.email.kind).toBe('configured');
    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ emailHost: 'loser.example.test' }),
      'email-r2',
      expect.any(AbortSignal)
    );
  });

  it('updates configured SMS with its own revision and explicit secret replacement', async () => {
    api.loadEmailServerConfig.mockResolvedValue(missingEvidence());
    api.loadSmsServerConfig.mockResolvedValue(smsEvidence('sms-r1'));
    api.saveSmsServerConfig.mockResolvedValue(smsEvidence('sms-r2'));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.sms.kind).toBe('configured'));
    act(() => result.current.actions.openSms());
    act(() =>
      result.current.actions.replaceSms({
        ...result.current.smsDraft!,
        tencent: { ...result.current.smsDraft!.tencent, secretId: 'replacement' }
      })
    );

    await act(async () => result.current.actions.submitSms());

    expect(api.saveSmsServerConfig).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ secretId: 'replacement' }) }),
      'sms-r1',
      expect.any(AbortSignal)
    );
    expect(api.loadSmsServerConfig).toHaveBeenCalledTimes(1);
    expect(result.current.smsDraft).toBeNull();
  });

  it('classifies HTTP 428 as a client contract failure without exposing the response body', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence('email-r1'));
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig.mockRejectedValue(
      new ApiMessageError('message_server_config_revision_required private details', { code: 15, status: 428 })
    );
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());

    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft).not.toBeNull();
    expect(result.current.emailSaveRecovery).toBe('messageServer.revisionRequired');
    expect(result.current.emailSaveRecoveryRetryable).toBe(false);
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.revisionRequired');
    expect(notify.error).not.toHaveBeenCalledWith(expect.stringContaining('private details'));

    act(() => result.current.actions.closeEmail());
    expect(result.current.emailDraft).toBeNull();
    act(() => result.current.actions.openEmail());
    expect(result.current.emailSaveRecovery).toBeNull();
    expect(result.current.emailDraft).not.toBeNull();
  });

  it.each([
    ['network', new Error('private network details')],
    ['contract', new MessageServerContractError('private contract details')]
  ])('locks an ambiguous %s write until reload provides the revision used by retry', async (_kind, failure) => {
    api.loadEmailServerConfig
      .mockResolvedValueOnce(emailEvidence('email-r1'))
      .mockResolvedValueOnce(emailEvidence('email-r2', { emailHost: 'winner.example.test' }));
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(emailEvidence('email-r3', { emailHost: 'operator.example.test' }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());
    act(() => result.current.actions.updateEmail({ emailHost: 'operator.example.test' }));

    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft?.emailHost).toBe('operator.example.test');
    expect(result.current.emailLocked).toBe(true);
    expect(result.current.emailSaveRecovery).toBe('messageServer.saveNotConverged');
    expect(notify.error).not.toHaveBeenCalledWith(expect.stringContaining('private'));

    await act(async () => result.current.actions.retryEmailSave());
    expect(result.current.emailDraft?.emailHost).toBe('operator.example.test');
    expect(result.current.emailLocked).toBe(false);
    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ emailHost: 'operator.example.test' }),
      'email-r2',
      expect.any(AbortSignal)
    );
  });

  it('releases the gate after an explicit HTTP 4xx rejection so a corrected draft can submit', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence('email-r1'));
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig
      .mockRejectedValueOnce(new ApiMessageError('private rejection', { status: 403 }))
      .mockResolvedValueOnce(emailEvidence('email-r2', { emailHost: 'corrected.example.test' }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());

    await act(async () => result.current.actions.submitEmail());
    expect(result.current.emailLocked).toBe(false);
    expect(result.current.emailSaveRecovery).toBeNull();
    expect(result.current.emailDraft).not.toBeNull();
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveFailed');

    act(() => result.current.actions.updateEmail({ emailHost: 'corrected.example.test' }));
    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(2);
    expect(result.current.emailDraft).toBeNull();
  });

  it('admits one write in flight and aborts page A before page B owns a new revision', async () => {
    const save = deferred<ReturnType<typeof emailEvidence>>();
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence('email-r1'));
    api.loadSmsServerConfig.mockResolvedValue(missingEvidence());
    api.saveEmailServerConfig.mockReturnValue(save.promise);
    const { result, unmount } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());

    let first!: Promise<void>;
    act(() => {
      first = result.current.actions.submitEmail();
      void result.current.actions.submitEmail();
    });
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
    const signal = api.saveEmailServerConfig.mock.calls[0]?.[2] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);

    api.loadEmailServerConfig.mockResolvedValue(emailEvidence('email-b1'));
    api.saveEmailServerConfig.mockResolvedValueOnce(emailEvidence('email-b2'));
    const pageB = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(pageB.result.current.email.kind).toBe('configured'));
    act(() => pageB.result.current.actions.openEmail());
    await act(async () => pageB.result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      'email-b1',
      expect.any(AbortSignal)
    );

    save.resolve(emailEvidence('email-r2'));
    await act(async () => first);
    expect(notify.success).toHaveBeenCalledTimes(1);
    pageB.unmount();
  });
});

function missingEvidence() {
  return { status: 'missing' as const, revision: 'missing' as const, config: null };
}

function emailEvidence(revision: string, patch: Record<string, unknown> = {}) {
  return {
    status: 'configured' as const,
    revision,
    config: {
      type: 0,
      emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test',
      emailPort: 587,
      emailSsl: false,
      emailStarttls: true,
      enable: true,
      configuredSecrets: ['emailPassword' as const],
      ...patch
    }
  };
}

function smsEvidence(revision: string) {
  return {
    status: 'configured' as const,
    revision,
    config: {
      enable: true,
      type: 'tencent' as const,
      options: { appId: 'app', signName: 'sign', templateId: 'template' },
      configuredSecrets: ['secretId' as const, 'secretKey' as const]
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
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
