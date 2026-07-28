/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { SessionContext } from '@/core/auth/session-context';

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
import { createSmsServerDraft } from '../model/message-server-model';

describe('Message Server direct command admission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadEmailServerConfig.mockResolvedValue(emailEvidence());
    api.loadSmsServerConfig.mockResolvedValue(smsEvidence());
    api.saveEmailServerConfig.mockResolvedValue(emailEvidence());
    api.saveSmsServerConfig.mockResolvedValue(smsEvidence());
  });

  it.each([['USER'], ['GUEST']] as const)(
    'denies every retained write command for %s while preserving refresh',
    async role => {
      const view = renderController([...role]);
      await waitFor(() => expect(view.result.current.email.kind).toBe('configured'));
      const retained = view.result.current.actions;
      act(() => {
        retained.openEmail();
        retained.openSms();
        retained.updateEmail({ emailHost: 'forbidden.example.test' });
        retained.setEmailSecretCleared(true);
        retained.replaceSms(createSmsServerDraft());
      });
      await act(async () => {
        await retained.submitEmail();
        await retained.submitSms();
        await retained.retryEmailSave();
        await retained.retrySmsSave();
      });
      act(() => {
        retained.retryEmail();
        retained.retrySms();
      });

      expect(view.result.current.emailDraft).toBeNull();
      expect(view.result.current.smsDraft).toBeNull();
      expect(api.saveEmailServerConfig).not.toHaveBeenCalled();
      expect(api.saveSmsServerConfig).not.toHaveBeenCalled();
      await waitFor(() => expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2));
      expect(api.loadSmsServerConfig).toHaveBeenCalledTimes(2);
    }
  );

  it('retires both drafts and retained proof when ADMIN loses write access', async () => {
    api.loadEmailServerConfig
      .mockResolvedValueOnce(emailEvidence())
      .mockRejectedValueOnce(new ApiMessageError('redacted'));
    const session = { roles: ['ADMIN'] };
    const view = renderController(session);
    await waitFor(() => expect(view.result.current.email.kind).toBe('configured'));
    act(() => {
      view.result.current.actions.openEmail();
      view.result.current.actions.openSms();
    });
    await act(async () => view.result.current.actions.submitEmail());
    expect(view.result.current.emailSaveRecovery).toBe('messageServer.read.unavailable');
    const retainedRetry = view.result.current.actions.retryEmailSave;

    session.roles = ['USER'];
    act(() => view.rerender());
    await act(async () => retainedRetry());

    expect(view.result.current.emailDraft).toBeNull();
    expect(view.result.current.smsDraft).toBeNull();
    expect(view.result.current.emailSaveRecovery).toBeNull();
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2);
  });

  it('keeps ADMIN drafts across an ordinary equivalent session rerender', async () => {
    const session = { roles: ['ADMIN'] };
    const view = renderController(session);
    await waitFor(() => expect(view.result.current.email.kind).toBe('configured'));
    act(() => {
      view.result.current.actions.openEmail();
      view.result.current.actions.openSms();
    });

    session.roles = ['ADMIN'];
    act(() => view.rerender());

    expect(view.result.current.emailDraft).not.toBeNull();
    expect(view.result.current.smsDraft).not.toBeNull();
  });

  it('makes a late mutation receipt inert after ADMIN loses write access', async () => {
    const mutation = deferred<ReturnType<typeof emailEvidence>>();
    api.saveEmailServerConfig.mockReturnValueOnce(mutation.promise);
    const session = { roles: ['ADMIN'] };
    const view = renderController(session);
    await waitFor(() => expect(view.result.current.email.kind).toBe('configured'));
    act(() => view.result.current.actions.openEmail());
    let submit!: Promise<void>;
    act(() => {
      submit = view.result.current.actions.submitEmail();
    });
    await waitFor(() => expect(api.saveEmailServerConfig).toHaveBeenCalledOnce());

    session.roles = ['GUEST'];
    act(() => view.rerender());
    mutation.resolve(emailEvidence({ emailHost: 'late.example.test' }));
    await act(async () => submit);

    expect(view.result.current.emailDraft).toBeNull();
    expect(view.result.current.email).toMatchObject({
      kind: 'configured',
      config: { emailHost: 'smtp.example.test' }
    });
    expect(api.loadEmailServerConfig).toHaveBeenCalledOnce();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('cancels active proof ownership so a late reread cannot change cache or notify success', async () => {
    const proof = deferred<ReturnType<typeof emailEvidence>>();
    api.loadEmailServerConfig.mockResolvedValueOnce(emailEvidence()).mockReturnValueOnce(proof.promise);
    const session = { roles: ['ADMIN'] };
    const view = renderController(session);
    await waitFor(() => expect(view.result.current.email.kind).toBe('configured'));
    act(() => {
      view.result.current.actions.openEmail();
      view.result.current.actions.updateEmail({ emailHost: 'new.example.test' });
    });
    let submit!: Promise<void>;
    act(() => {
      submit = view.result.current.actions.submitEmail();
    });
    await waitFor(() => expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2));

    session.roles = ['USER'];
    act(() => view.rerender());
    proof.resolve(emailEvidence({ emailHost: 'new.example.test' }));
    await act(async () => submit);

    expect(view.result.current.emailDraft).toBeNull();
    expect(view.result.current.email).toMatchObject({
      kind: 'configured',
      config: { emailHost: 'smtp.example.test' }
    });
    expect(api.loadEmailServerConfig).toHaveBeenCalledTimes(2);
    expect(notify.success).not.toHaveBeenCalled();
  });
});

function renderController(rolesOrSession: string[] | { roles: string[] }) {
  const session = Array.isArray(rolesOrSession) ? { roles: rolesOrSession } : rolesOrSession;
  return renderHook(() => useMessageServerController(), { wrapper: wrapper(session) });
}

function wrapper(session: { roles: string[] }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SessionContext.Provider
        value={{
          session: {
            authenticated: true,
            username: 'operator',
            workspaceId: null,
            roles: session.roles,
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

function smsEvidence() {
  return {
    status: 'configured' as const,
    config: {
      enable: false,
      type: 'tencent' as const,
      options: { appId: 'app', signName: 'sign', templateId: 'template' },
      configuredSecrets: ['secretId' as const, 'secretKey' as const]
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}
