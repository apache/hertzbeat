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

import { ApiMessageError } from '@/core/http/api-message';

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
import { MessageServerContractError } from '../api/message-server-schema';

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

  it('locks an unprovable ambiguous email secret replacement without repeating POST', async () => {
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
    expect(result.current.emailSaveRecovery).toBe('messageServer.saveNotConverged');
    expect(result.current.emailSaveRecoveryRetryable).toBe(false);
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveNotConverged');

    await act(async () => result.current.actions.submitEmail());
    await act(async () => result.current.actions.retryEmailSave());
    act(() => result.current.actions.closeEmail());
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(result.current.emailDraft).not.toBeNull();
  });

  it('treats a malformed 2xx response after an email secret replacement as commit-uncertain', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockRejectedValue(new MessageServerContractError());
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailPassword: 'replacement' });
    });

    await act(async () => result.current.actions.submitEmail());
    await act(async () => result.current.actions.submitEmail());

    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(result.current.emailSaveRecovery).toBe('messageServer.saveNotConverged');
    expect(result.current.emailSaveRecoveryRetryable).toBe(false);
    expect(notify.error).toHaveBeenLastCalledWith('messageServer.saveNotConverged');
  });

  it('keeps a convergable ambiguous SMS write locked to proof-only retry', async () => {
    const save = deferred<void>();
    api.loadEmailServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.loadSmsServerConfig
      .mockResolvedValueOnce(smsEvidence())
      .mockResolvedValueOnce(smsEvidence())
      .mockResolvedValueOnce(smsEvidence({ enable: false }));
    api.saveSmsServerConfig.mockReturnValue(save.promise);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.sms.kind).toBe('configured'));
    act(() => result.current.actions.openSms());

    let submit: Promise<void>;
    act(() => result.current.actions.replaceSms({ ...result.current.smsDraft!, enable: false }));
    act(() => {
      submit = result.current.actions.submitSms();
      result.current.actions.closeSms();
    });
    expect(result.current.smsDraft).not.toBeNull();
    expect(result.current.smsDraft?.enable).toBe(false);
    save.reject(new Error('write failed'));
    await act(async () => submit!);
    expect(result.current.smsDraft).not.toBeNull();
    expect(result.current.smsSaveRecovery).toBe('messageServer.saveNotConverged');
    act(() => result.current.actions.closeSms());
    expect(result.current.smsDraft).not.toBeNull();

    await act(async () => result.current.actions.retrySmsSave());

    expect(api.saveSmsServerConfig).toHaveBeenCalledTimes(1);
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

    await act(async () => result.current.actions.retryEmailSave());
    await waitFor(() => expect(result.current.emailDraft).toBeNull());
    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
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

    await act(async () => result.current.actions.retrySmsSave());
    await waitFor(() => expect(result.current.smsDraft).toBeNull());
    expect(api.saveSmsServerConfig).toHaveBeenCalledTimes(1);
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
    const rejected = new ApiMessageError('write rejected', { status: 400 });
    api.saveEmailServerConfig.mockRejectedValueOnce(rejected).mockResolvedValueOnce(undefined);
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

  it.each([
    ['server error', { status: 503 }],
    ['malformed success response', new MessageServerContractError()]
  ])('proves an ambiguous email POST after %s without repeating the write', async (_label, details) => {
    const desired = emailEvidence({ emailHost: 'new.example.test' });
    api.loadEmailServerConfig.mockResolvedValueOnce(emailEvidence()).mockResolvedValueOnce(desired);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    const writeError = details instanceof Error ? details : Object.assign(new Error('ambiguous write'), details);
    api.saveEmailServerConfig.mockRejectedValue(writeError);
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailHost: 'new.example.test' });
    });

    await act(async () => result.current.actions.submitEmail());

    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2);
    expect(result.current.emailDraft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('messageServer.saveSuccess');
  });

  it('keeps an ambiguous email POST locked to proof-only retry while reread is unavailable', async () => {
    const desired = emailEvidence({ emailHost: 'new.example.test' });
    const retryProof = deferred<ReturnType<typeof emailEvidence>>();
    api.loadEmailServerConfig
      .mockResolvedValueOnce(emailEvidence())
      .mockRejectedValueOnce('offline')
      .mockReturnValueOnce(retryProof.promise);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockRejectedValue(Object.assign(new Error('ambiguous write'), { status: 503 }));
    const { result } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => {
      result.current.actions.openEmail();
      result.current.actions.updateEmail({ emailHost: 'new.example.test' });
    });

    await act(async () => result.current.actions.submitEmail());
    expect(result.current.emailSaveRecovery).toBe('messageServer.read.unavailable');

    let firstRetry: Promise<void>;
    let duplicateRetry: Promise<void>;
    act(() => {
      firstRetry = result.current.actions.retryEmailSave();
      duplicateRetry = result.current.actions.retryEmailSave();
    });
    await waitFor(() => expect(result.current.provingEmail).toBe(true));
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(3);
    retryProof.resolve(desired);
    await act(async () => Promise.all([firstRetry!, duplicateRetry!]));

    expect(api.saveEmailServerConfig).toHaveBeenCalledTimes(1);
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(3);
    expect(result.current.emailDraft).toBeNull();
  });

  it('retires an in-flight email proof when the controller unmounts', async () => {
    const proof = deferred<ReturnType<typeof emailEvidence>>();
    api.loadEmailServerConfig.mockResolvedValueOnce(emailEvidence()).mockReturnValueOnce(proof.promise);
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());

    let saving: Promise<void> | undefined;
    act(() => {
      saving = result.current.actions.submitEmail();
    });
    await waitFor(() => expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2));
    unmount();
    proof.resolve(emailEvidence());
    await act(async () => saving);

    expect(notify.success).not.toHaveBeenCalled();
  });

  it('does not start a save through an action retained after unmount', async () => {
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue({ status: 'missing', config: null });
    api.saveEmailServerConfig.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useMessageServerController(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.email.kind).toBe('configured'));
    act(() => result.current.actions.openEmail());
    const retainedSubmit = result.current.actions.submitEmail;

    unmount();
    await act(async () => retainedSubmit());

    expect(api.saveEmailServerConfig).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
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
