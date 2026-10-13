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

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
const feedback = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('antd', () => ({ App: { useApp: () => ({ message: feedback }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/public-access-config-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/public-access-config-api')>()),
  loadPublicAccessConfig: api.load,
  savePublicAccessConfig: api.save
}));

import type { PublicAccessConfig } from '../model/public-access-config-model';

import { publicAccessConfigQueryKey } from '../api/public-access-config-api';
import { usePublicAccessConfigController } from './use-public-access-config-controller';

const emptyConfig = {
  publicBaseUrl: null,
  serverOtlpHttpEndpoint: null,
  serverOtlpGrpcEndpoint: null
};

describe('usePublicAccessConfigController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.load.mockResolvedValue(emptyConfig);
    api.save.mockImplementation(config => Promise.resolve(config));
  });

  it('loads, edits, saves, and replaces the cache with the authoritative response', async () => {
    const client = queryClient();
    const view = renderController(true, client);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    act(() => view.result.current.actions.update('publicBaseUrl', ' https://hertzbeat.example.test/base '));
    expect(view.result.current.state).toMatchObject({ kind: 'ready', dirty: true, valid: true });

    act(() => view.result.current.actions.save());
    await waitFor(() => expect(feedback.success).toHaveBeenCalled());

    expect(api.save).toHaveBeenCalledWith({
      publicBaseUrl: 'https://hertzbeat.example.test/base',
      serverOtlpHttpEndpoint: null,
      serverOtlpGrpcEndpoint: null
    });
    expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual({
      publicBaseUrl: 'https://hertzbeat.example.test/base',
      serverOtlpHttpEndpoint: null,
      serverOtlpGrpcEndpoint: null
    });
    expect(feedback.success).toHaveBeenCalledWith('systemConfig.publicAccess.saveSuccess');
  });

  it('proves an ambiguous save with one canonical reread instead of repeating the command', async () => {
    const intended = { ...emptyConfig, publicBaseUrl: 'https://hertzbeat.example.test' };
    api.save.mockRejectedValue(new Error('connection closed'));
    api.load.mockResolvedValueOnce(emptyConfig).mockResolvedValueOnce(intended);
    const view = renderController(true);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl));

    act(() => view.result.current.actions.save());
    await waitFor(() => expect(feedback.success).toHaveBeenCalled());

    expect(api.save).toHaveBeenCalledTimes(1);
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(view.result.current.state).toMatchObject({ kind: 'ready', dirty: false });
    expect(feedback.success).toHaveBeenCalledWith('systemConfig.publicAccess.saveSuccess');
  });

  it('keeps the draft and reports failure when a reread does not prove the intended write', async () => {
    api.save.mockRejectedValue(new Error('connection closed'));
    const view = renderController(true);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.actions.update('publicBaseUrl', 'https://hertzbeat.example.test'));

    act(() => view.result.current.actions.save());
    await waitFor(() => expect(feedback.error).toHaveBeenCalled());

    expect(view.result.current.state).toMatchObject({
      kind: 'ready',
      current: { publicBaseUrl: 'https://hertzbeat.example.test' },
      dirty: true,
      saving: false
    });
    expect(feedback.error).toHaveBeenCalledWith('systemConfig.publicAccess.saveFailed');
  });

  it('keeps every control read-only for non-administrators', async () => {
    const view = renderController(false);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    act(() => view.result.current.actions.update('publicBaseUrl', 'https://hertzbeat.example.test'));
    act(() => view.result.current.actions.save());

    expect(view.result.current.state).toMatchObject({ kind: 'ready', dirty: false });
    expect(api.save).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'admits one save and locks edits and discard before React commits saving state (StrictMode=%s)',
    async strictMode => {
      const write = deferred<PublicAccessConfig>();
      api.save.mockReturnValue(write.promise);
      const view = renderController(true, undefined, strictMode);
      await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
      act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
      act(() => {
        view.result.current.actions.save();
        view.result.current.actions.save();
        view.result.current.actions.update('publicBaseUrl', 'https://late.example.test');
        view.result.current.actions.discard();
      });
      expect(api.save).toHaveBeenCalledTimes(1);
      expect(view.result.current.state).toMatchObject({
        saving: true,
        current: { publicBaseUrl: intended.publicBaseUrl }
      });
      await act(async () => {
        write.resolve(intended);
        await write.promise;
      });
      expect(view.result.current.state).toMatchObject({ saving: false, dirty: false });
    }
  );

  it.each([
    ['unmount', 'success'],
    ['unmount', 'failure'],
    ['role loss', 'success'],
    ['role loss', 'failure']
  ] as const)('retires a late write %s / %s without cache or feedback publication', async (boundary, outcome) => {
    const write = deferred<PublicAccessConfig>();
    api.save.mockReturnValue(write.promise);
    const client = queryClient();
    const view = renderController(true, client);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
    act(() => view.result.current.actions.save());
    if (boundary === 'unmount') view.unmount();
    else {
      view.rerender({ canConfigure: false });
      expect(view.result.current.state).toMatchObject({ saving: false });
    }
    await act(async () => {
      if (outcome === 'success') write.resolve(intended);
      else write.reject(new Error('closed'));
      await write.promise.catch(() => undefined);
    });
    expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(emptyConfig);
    expect(feedback.success).not.toHaveBeenCalled();
    expect(feedback.error).not.toHaveBeenCalled();
    expect(api.load).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['unmount', 'success'],
    ['unmount', 'failure'],
    ['role loss', 'success'],
    ['role loss', 'failure']
  ] as const)('retires a late canonical proof %s / %s without publishing', async (boundary, outcome) => {
    const proof = deferred<PublicAccessConfig>();
    api.save.mockRejectedValue(new Error('closed'));
    api.load.mockResolvedValueOnce(emptyConfig).mockReturnValueOnce(proof.promise);
    const client = queryClient();
    const view = renderController(true, client);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
    act(() => view.result.current.actions.save());
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
    if (boundary === 'unmount') view.unmount();
    else view.rerender({ canConfigure: false });
    await act(async () => {
      if (outcome === 'success') proof.resolve(intended);
      else proof.reject(new Error('unavailable'));
      await proof.promise.catch(() => undefined);
    });
    expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(emptyConfig);
    expect(feedback.success).not.toHaveBeenCalled();
    expect(feedback.error).not.toHaveBeenCalled();
    if (boundary === 'role loss') expect(view.result.current.state).toMatchObject({ saving: false });
  });

  it.each([false, true])(
    'keeps a newer save locked when a retired write returns after access is restored (StrictMode=%s)',
    async strictMode => {
      const oldWrite = deferred<PublicAccessConfig>();
      const newWrite = deferred<PublicAccessConfig>();
      api.save.mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise);
      const client = queryClient();
      const view = renderController(true, client, strictMode);
      await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
      act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
      act(() => view.result.current.actions.save());
      view.rerender({ canConfigure: false });
      view.rerender({ canConfigure: true });
      const newer = { ...emptyConfig, publicBaseUrl: 'https://newer.example.test' };
      act(() => view.result.current.actions.update('publicBaseUrl', newer.publicBaseUrl));
      act(() => view.result.current.actions.save());
      expect(api.save).toHaveBeenCalledTimes(2);
      await act(async () => {
        oldWrite.resolve(intended);
        await oldWrite.promise;
      });
      expect(view.result.current.state).toMatchObject({
        saving: true,
        current: { publicBaseUrl: newer.publicBaseUrl }
      });
      expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(emptyConfig);
      expect(feedback.success).not.toHaveBeenCalled();
      act(() => view.result.current.actions.save());
      expect(api.save).toHaveBeenCalledTimes(2);
      await act(async () => {
        newWrite.resolve(newer);
        await newWrite.promise;
      });
      expect(view.result.current.state).toMatchObject({ saving: false, dirty: false });
      expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(newer);
      expect(feedback.success).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'keeps a newer save owned when a retired pending proof returns via %s',
    async outcome => {
      const oldProof = deferred<PublicAccessConfig>();
      const newWrite = deferred<PublicAccessConfig>();
      api.save.mockRejectedValueOnce(new Error('closed')).mockReturnValueOnce(newWrite.promise);
      api.load.mockResolvedValueOnce(emptyConfig).mockReturnValueOnce(oldProof.promise);
      const client = queryClient();
      const view = renderController(true, client);
      await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
      act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
      act(() => view.result.current.actions.save());
      await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
      expect(view.result.current.state).toMatchObject({ saving: true });
      view.rerender({ canConfigure: false });
      expect(view.result.current.state).toMatchObject({ saving: false });
      view.rerender({ canConfigure: true });
      const newer = { ...emptyConfig, publicBaseUrl: 'https://new-proof-owner.example.test' };
      act(() => view.result.current.actions.update('publicBaseUrl', newer.publicBaseUrl));
      act(() => view.result.current.actions.save());
      expect(api.save).toHaveBeenCalledTimes(2);
      await act(async () => {
        if (outcome === 'resolve') oldProof.resolve(intended);
        else oldProof.reject(new Error('unavailable'));
        await oldProof.promise.catch(() => undefined);
      });
      expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(emptyConfig);
      expect(feedback.success).not.toHaveBeenCalled();
      expect(feedback.error).not.toHaveBeenCalled();
      expect(view.result.current.state).toMatchObject({
        saving: true,
        current: { publicBaseUrl: newer.publicBaseUrl }
      });
      act(() => view.result.current.actions.save());
      expect(api.save).toHaveBeenCalledTimes(2);
      expect(api.load).toHaveBeenCalledTimes(2);
      await act(async () => {
        newWrite.resolve(newer);
        await newWrite.promise;
      });
      expect(client.getQueryData(publicAccessConfigQueryKey)).toEqual(newer);
      expect(feedback.success).toHaveBeenCalledTimes(1);
      expect(feedback.error).not.toHaveBeenCalled();
      expect(view.result.current.state).toMatchObject({ saving: false, dirty: false });
    }
  );

  it('reports an owned failure and releases the lock for a corrected retry', async () => {
    api.save.mockRejectedValueOnce(new Error('closed'));
    const view = renderController(true);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.actions.update('publicBaseUrl', intended.publicBaseUrl!));
    act(() => view.result.current.actions.save());
    await waitFor(() => expect(feedback.error).toHaveBeenCalledTimes(1));
    expect(view.result.current.state).toMatchObject({ saving: false, dirty: true });
    act(() => view.result.current.actions.update('publicBaseUrl', 'https://corrected.example.test'));
    act(() => view.result.current.actions.save());
    await waitFor(() => expect(feedback.success).toHaveBeenCalledTimes(1));
    expect(api.save).toHaveBeenCalledTimes(2);
    expect(view.result.current.state).toMatchObject({ saving: false, dirty: false });
  });
});

function renderController(canConfigure: boolean, client = queryClient(), strictMode = false) {
  function Wrapper({ children }: PropsWithChildren) {
    const content = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return strictMode ? <StrictMode>{content}</StrictMode> : content;
  }
  return renderHook(({ canConfigure }) => usePublicAccessConfigController(canConfigure), {
    initialProps: { canConfigure },
    wrapper: Wrapper
  });
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

const intended: PublicAccessConfig = { ...emptyConfig, publicBaseUrl: 'https://audit.example.test' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
