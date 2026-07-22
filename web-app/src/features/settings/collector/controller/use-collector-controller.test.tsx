/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEffect, type PropsWithChildren } from 'react';
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadCollectorManagementPage,
  loadCollectorMutationProofPage,
  mutateCollectors
} from '../api/collector-management-api';
import { useCollectorController } from './use-collector-controller';

vi.mock('../api/collector-management-api', () => ({
  loadCollectorManagementPage: vi.fn(),
  loadCollectorMutationProofPage: vi.fn(),
  mutateCollectors: vi.fn()
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const load = vi.mocked(loadCollectorManagementPage);
const loadProof = vi.mocked(loadCollectorMutationProofPage);
const mutate = vi.mocked(mutateCollectors);
let navigateRoute: NavigateFunction | undefined;

describe('useCollectorController', () => {
  afterEach(() => vi.clearAllMocks());

  it('proves a successful delete from the final visible row on the adjusted backend page', async () => {
    load
      .mockResolvedValueOnce(page(2, [collector('edge')], 17))
      .mockResolvedValueOnce(page(1, [collector('west')], 16));
    loadProof.mockResolvedValueOnce(page(2, [], 16));
    mutate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectorController(), {
      wrapper: wrapper('/settings/collectors?pageIndex=2&pageSize=8')
    });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestAction('delete', ['edge']));
    await act(async () => result.current.actions.confirmAction());

    expect(mutate).toHaveBeenCalledWith('delete', ['edge']);
    expect(loadProof).toHaveBeenCalledWith({ name: '', pageIndex: 2, pageSize: 8 });
    expect(load.mock.calls[1]?.[0]).toEqual({ name: '', pageIndex: 1, pageSize: 8 });
    expect(result.current.query.pageIndex).toBe(1);
    expect(result.current.mutationFailure).toBeNull();
  });

  it('does not let absence on the previous page masquerade as deletion proof', async () => {
    load.mockImplementation(query =>
      Promise.resolve(query.pageIndex === 2 ? page(2, [collector('edge')], 17) : page(1, [collector('west')], 16))
    );
    loadProof.mockResolvedValue(page(2, [collector('edge')], 17));
    mutate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectorController(), {
      wrapper: wrapper('/settings/collectors?pageIndex=2&pageSize=8')
    });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestAction('delete', ['edge']));
    await act(async () => result.current.actions.confirmAction());

    expect(loadProof).toHaveBeenCalledWith({ name: '', pageIndex: 2, pageSize: 8 });
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.query.pageIndex).toBe(2);
    expect(result.current.mutationFailure).toBe('validation');
  });

  it('does not reread or repeat a permission-rejected write', async () => {
    const { ApiMessageError } = await import('@/core/http/api-message');
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    mutate.mockRejectedValue(new ApiMessageError('raw forbidden detail', { status: 403 }));
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestAction('offline', ['edge']));
    await act(async () => result.current.actions.confirmAction());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.mutationFailure).toBe('permission');
  });

  it('does not let an old delete completion overwrite newer URL navigation', async () => {
    const proof = deferred<ReturnType<typeof page>>();
    load.mockResolvedValueOnce(page(2, [collector('edge')], 17)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    loadProof.mockReturnValueOnce(proof.promise);
    mutate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectorController(), {
      wrapper: wrapper('/settings/collectors?pageIndex=2&pageSize=8')
    });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestAction('delete', ['edge']));
    let confirmation: Promise<void> | undefined;
    act(() => {
      confirmation = result.current.actions.confirmAction();
      void confirmation;
    });
    await waitFor(() => expect(loadProof).toHaveBeenCalledTimes(1));

    act(() => {
      void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west');
    });
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    proof.resolve(page(2, [], 16));
    await act(async () => confirmation);

    expect(result.current.query).toEqual({ name: 'west', pageIndex: 0, pageSize: 8 });
  });

  it('cancels an in-flight receipt refresh before writing and proving a mutation', async () => {
    let refreshAborted = false;
    let resolveRefresh!: (value: ReturnType<typeof page>) => void;
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockImplementationOnce(
      (_query, signal) =>
        new Promise((resolve, reject) => {
          resolveRefresh = resolve;
          signal?.addEventListener('abort', () => {
            refreshAborted = true;
            reject(new DOMException('Collector refresh aborted', 'AbortError'));
          });
        })
    );
    loadProof.mockResolvedValueOnce(page(0, [{ ...collector('edge'), online: false }], 1));
    mutate.mockImplementation(() => {
      expect(refreshAborted).toBe(true);
      return Promise.resolve(undefined);
    });
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.refresh());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    act(() => result.current.actions.requestAction('offline', ['edge']));
    await act(async () => result.current.actions.confirmAction());

    expect(refreshAborted).toBe(true);
    expect(mutate).toHaveBeenCalledWith('offline', ['edge']);
    expect(result.current.mutationFailure).toBeNull();
    resolveRefresh(page(0, [collector('edge')], 1));
  });
});

function wrapper(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={queryClient}>
          <App>
            <NavigationProbe />
            {children}
          </App>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

function NavigationProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRoute = navigate;
    return () => {
      navigateRoute = undefined;
    };
  }, [navigate]);
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function page(number: number, content: ReturnType<typeof collector>[], totalElements: number) {
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / 8),
    number,
    size: 8
  };
}

function collector(name: string) {
  return {
    name,
    address: '10.0.0.7',
    version: '2.0.0',
    mode: 'public',
    online: true,
    immutable: false,
    pinMonitorNum: 0,
    dispatchMonitorNum: 0,
    updatedAt: null,
    runtimeStatusReportedAt: null,
    instrumentationIntake: { status: 'unavailable' as const, errorCode: 'intake_not_advertised' as const }
  };
}
