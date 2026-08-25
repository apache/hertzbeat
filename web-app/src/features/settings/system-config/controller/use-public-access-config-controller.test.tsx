/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
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
});

function renderController(canConfigure: boolean, client = queryClient()) {
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return renderHook(() => usePublicAccessConfigController(canConfigure), { wrapper: Wrapper });
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}
