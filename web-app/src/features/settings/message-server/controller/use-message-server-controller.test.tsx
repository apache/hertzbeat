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

const api = vi.hoisted(() => ({
  classifyMessageServerReadError: vi.fn((error: unknown) => {
    if (error === 'invalid') return 'invalid';
    if (error === 'offline') return 'unavailable';
    return 'error';
  }),
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

describe('useMessageServerController', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.classifyMessageServerReadError.mockImplementation((error: unknown) => {
      if (error === 'invalid') return 'invalid';
      if (error === 'offline') return 'unavailable';
      return 'error';
    });
  });

  it('keeps configured and missing evidence distinct and proves save by reread', async () => {
    const email = {
      status: 'configured' as const,
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

    expect(api.saveEmailServerConfig).toHaveBeenCalledWith({
      type: 0,
      emailHost: 'smtp.example.test',
      emailUsername: 'ops@example.test',
      emailPort: 587,
      emailSsl: false,
      emailStarttls: true,
      enable: true
    });
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
    const email = {
      status: 'configured' as const,
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
    const email = {
      status: 'configured' as const,
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

  it('deduplicates same-tick submissions per channel while allowing email and SMS to save concurrently', async () => {
    const emailSave = deferred<void>();
    const smsSave = deferred<void>();
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue(smsEvidence());
    api.saveEmailServerConfig.mockReturnValue(emailSave.promise);
    api.saveSmsServerConfig.mockReturnValue(smsSave.promise);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    await waitFor(() => expect(result.current.sms.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.openSms();
    });

    let emailFirst: Promise<void>;
    let emailSecond: Promise<void>;
    let smsFirst: Promise<void>;
    let smsSecond: Promise<void>;
    act(() => {
      emailFirst = result.current.actions.submitEmail();
      emailSecond = result.current.actions.submitEmail();
      smsFirst = result.current.actions.submitSms();
      smsSecond = result.current.actions.submitSms();
    });

    await waitFor(() => expect(api.saveEmailServerConfig).toHaveBeenCalledOnce());
    expect(api.saveSmsServerConfig).toHaveBeenCalledOnce();
    emailSave.resolve();
    smsSave.resolve();
    await act(async () => Promise.all([emailFirst!, emailSecond!, smsFirst!, smsSecond!]));
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2);
    expect(api.loadSmsServerConfig).toHaveBeenCalledTimes(2);
  });

  it('preserves the email draft and its replacement secret when close races a failed save, then unlocks retry', async () => {
    const firstSave = deferred<void>();
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailPassword: 'replacement' });
    });

    let firstSubmit: Promise<void>;
    act(() => {
      firstSubmit = result.current.actions.submitEmail();
      result.current.actions.closeEmail();
      result.current.actions.updateEmail({ emailHost: 'racing.example.test' });
      result.current.actions.setEmailSecretCleared(true);
    });
    expect(result.current.emailDraft?.emailPassword).toBe('replacement');
    expect(result.current.emailDraft?.emailHost).toBe('smtp.example.test');
    expect(result.current.emailDraft?.clearSecrets).toEqual([]);
    firstSave.reject(new Error('write failed'));
    await act(async () => firstSubmit!);
    expect(result.current.emailDraft?.emailPassword).toBe('replacement');

    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.emailDraft).toBeNull());
  });

  it('preserves the SMS draft when close races a failed save and allows close after the lock releases', async () => {
    const save = deferred<void>();
    api.loadEmailServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.loadSmsServerConfig.mockResolvedValue(smsEvidence());
    api.saveSmsServerConfig.mockReturnValue(save.promise);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.sms.kind).toBe('configured'));
    act(() => result.current.actions.openSms());

    let submit: Promise<void>;
    const replacement = { ...result.current.smsDraft!, enable: false };
    act(() => {
      submit = result.current.actions.submitSms();
      result.current.actions.closeSms();
      result.current.actions.replaceSms(replacement);
    });
    expect(result.current.smsDraft).not.toBeNull();
    expect(result.current.smsDraft?.enable).toBe(true);
    save.reject(new Error('write failed'));
    await act(async () => submit!);
    expect(result.current.smsDraft).not.toBeNull();
    act(() => result.current.actions.closeSms());
    expect(result.current.smsDraft).toBeNull();
  });

  it('keeps an edited email draft and authoritative old cache until semantic reread convergence', async () => {
    const oldEvidence = emailEvidence();
    const newEvidence = emailEvidence({ emailHost: 'new.example.test' });
    api.loadEmailServerConfig
      .mockResolvedValueOnce(oldEvidence)
      .mockResolvedValueOnce(oldEvidence)
      .mockResolvedValueOnce(newEvidence);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailHost: 'new.example.test' });
    });

    await act(async () => result.current.actions.submitEmail());
    expect(result.current.emailDraft?.emailHost).toBe('new.example.test');
    expect(result.current.email).toMatchObject({ kind: 'configured', config: { emailHost: 'smtp.example.test' } });
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveNotConverged');

    await act(async () => result.current.actions.submitEmail());
    await waitFor(() => expect(result.current.emailDraft).toBeNull());
    expect(result.current.email).toMatchObject({ kind: 'configured', config: { emailHost: 'new.example.test' } });
    expect(notify.success).toHaveBeenCalledWith('messageServer.saveSuccess');
  });

  it('keeps an SMS replacement draft until reread proves the replacement secret is configured', async () => {
    const initial = smsEvidence();
    const missingReplacement = smsEvidence({ configuredSecrets: ['secretKey'] });
    api.loadEmailServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.loadSmsServerConfig
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(missingReplacement)
      .mockResolvedValueOnce(initial);
    api.saveSmsServerConfig.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.sms.kind).toBe('configured'));
    act(() => result.current.actions.openSms());
    act(() => {
      result.current.actions.replaceSms({
        ...result.current.smsDraft!,
        tencent: { ...result.current.smsDraft!.tencent, secretId: 'replacement' }
      });
    });

    await act(async () => result.current.actions.submitSms());
    expect(result.current.smsDraft?.tencent.secretId).toBe('replacement');
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveNotConverged');
    expect(notify.success).not.toHaveBeenCalled();

    await act(async () => result.current.actions.submitSms());
    await waitFor(() => expect(result.current.smsDraft).toBeNull());
    expect(notify.success).toHaveBeenCalledWith('messageServer.saveSuccess');
  });

  it.each([
    ['missing reread', { status: 'missing', config: null }, 'messageServer.saveNotConverged'],
    ['invalid reread', 'invalid', 'messageServer.read.invalid'],
    ['unavailable reread', 'offline', 'messageServer.read.unavailable'],
    ['ordinary reread failure', 'ordinary', 'messageServer.read.error']
  ])('keeps the email draft and reports %s', async (_label, reread, expectedKey) => {
    api.loadEmailServerConfig.mockResolvedValueOnce(emailEvidence());
    if (typeof reread === 'string') api.loadEmailServerConfig.mockRejectedValueOnce(reread);
    else api.loadEmailServerConfig.mockResolvedValueOnce(reread);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());

    await act(async () => result.current.actions.submitEmail());

    expect(result.current.emailDraft).not.toBeNull();
    expect(notify.error).toHaveBeenLastCalledWith(expectedKey);
    unmount();
  });

  it('classifies write failure separately and releases the validation/save gate for a corrected draft', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockRejectedValueOnce(new Error('write failed')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailHost: '' });
    });

    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).not.toHaveBeenCalled();
    expect(notify.warning).toHaveBeenLastCalledWith('messageServer.validation');
    act(() => result.current.actions.updateEmail({ emailHost: 'smtp.example.test' }));
    await act(async () => result.current.actions.submitEmail());
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveFailed');
    expect(result.current.emailDraft).not.toBeNull();
    await act(async () => result.current.actions.submitEmail());
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.emailDraft).toBeNull());
  });

  it('reports defensive error state when a successful query has no evidence body', async () => {
    api.loadEmailServerConfig.mockResolvedValue(undefined);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.email.kind).toBe('error'));
    expect(result.current.sms.kind).toBe('missing');
  });
});

function emailEvidence(patch: Record<string, unknown> = {}) {
  return {
    status: 'configured' as const,
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

function smsEvidence(patch: Record<string, unknown> = {}) {
  return {
    status: 'configured' as const,
    config: {
      enable: true,
      type: 'tencent' as const,
      options: { appId: 'app', signName: 'sign', templateId: 'template' },
      configuredSecrets: ['secretId' as const, 'secretKey' as const],
      ...patch
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
