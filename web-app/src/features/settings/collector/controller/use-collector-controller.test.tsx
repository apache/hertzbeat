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

import { ApiMessageError } from '@/core/http/api-message';
import type { CollectorInstrumentationIntake } from '@/shared/collector';

import {
  clearCollectorInstrumentationIntake,
  loadCollectorManagementPage,
  loadCollectorMutationProofPage,
  mutateCollectors,
  saveCollectorInstrumentationIntake
} from '../api/collector-management-api';
import { useCollectorController } from './use-collector-controller';

vi.mock('../api/collector-management-api', () => ({
  loadCollectorManagementPage: vi.fn(),
  loadCollectorMutationProofPage: vi.fn(),
  mutateCollectors: vi.fn(),
  saveCollectorInstrumentationIntake: vi.fn(),
  clearCollectorInstrumentationIntake: vi.fn()
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const load = vi.mocked(loadCollectorManagementPage);
const loadProof = vi.mocked(loadCollectorMutationProofPage);
const mutate = vi.mocked(mutateCollectors);
const saveIntake = vi.mocked(saveCollectorInstrumentationIntake);
const clearIntake = vi.mocked(clearCollectorInstrumentationIntake);
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

  it('closes a pending action without writing when the semantic query changed before confirmation', async () => {
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    mutate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.requestAction('offline', ['edge']));
    expect(result.current.pendingAction).not.toBeNull();
    act(() => {
      void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west');
    });
    await waitFor(() => expect(result.current.query.name).toBe('west'));

    await act(async () => result.current.actions.confirmAction());

    expect(mutate).not.toHaveBeenCalled();
    expect(loadProof).not.toHaveBeenCalled();
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.mutating).toBe(false);
    expect(result.current.mutationFailure).toBeNull();
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

  it('proves an intake save by its safe response and authoritative list reread', async () => {
    const available = collector('edge', intakeAvailable());
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [available], 1));
    saveIntake.mockResolvedValue(intakeAvailable());
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.openIntake('edge'));
    await act(async () => result.current.actions.saveIntake(intakeRequest()));

    expect(saveIntake).toHaveBeenCalledWith('edge', intakeRequest());
    expect(load.mock.calls[1]?.[0]).toEqual({ name: '', pageIndex: 0, pageSize: 8 });
    expect(result.current.intakeEditor).toBeNull();
    expect(result.current.intakeFailure).toBeNull();
    expect(result.current.listState).toMatchObject({
      kind: 'ready',
      records: [{ name: 'edge', instrumentationIntake: { status: 'available', gateway: 'server' } }]
    });
  });

  it('rejects success when the intake response and authoritative list reread disagree', async () => {
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('edge')], 1));
    saveIntake.mockResolvedValue(intakeAvailable());
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.openIntake('edge'));
    const successMessagesBefore = document.body.textContent?.match(/collectors\.intake\.success/gu)?.length ?? 0;
    await act(async () => result.current.actions.saveIntake(intakeRequest()));

    expect(saveIntake).toHaveBeenCalledWith('edge', intakeRequest());
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.intakeEditor).not.toBeNull();
    expect(result.current.intakeFailure).toBe('validation');
    expect(document.body.textContent?.match(/collectors\.intake\.success/gu)?.length ?? 0).toBe(successMessagesBefore);
  });

  it('clears a persisted invalid intake and proves exact not-advertised state by list reread', async () => {
    load
      .mockResolvedValueOnce(page(0, [collector('edge', intakeUnavailable('intake_advertisement_invalid'))], 1))
      .mockResolvedValueOnce(page(0, [collector('edge')], 1));
    clearIntake.mockResolvedValue(intakeUnavailable());
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    act(() => result.current.actions.openIntake('edge'));
    await act(async () => result.current.actions.clearIntake());

    expect(clearIntake).toHaveBeenCalledWith('edge');
    expect(result.current.intakeEditor).toBeNull();
    expect(result.current.listState).toMatchObject({
      kind: 'ready',
      records: [{ name: 'edge', instrumentationIntake: { status: 'unavailable' } }]
    });
  });

  it('rejects an invalid intake draft before transport', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openIntake('edge'));

    await act(async () =>
      result.current.actions.saveIntake({ ...intakeRequest(), otlpGrpcEndpoint: 'http://unsafe.example.test' })
    );

    expect(saveIntake).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.intakeFailure).toBe('validation');
    expect(result.current.intakeEditor).not.toBeNull();
  });

  it.each([
    [new ApiMessageError('raw forbidden detail', { status: 403 }), 'permission'],
    [new ApiMessageError('raw validation detail', { status: 422 }), 'validation'],
    [new ApiMessageError('raw unavailable detail', { status: 503 }), 'unavailable'],
    [new Error('raw generic detail'), 'error']
  ] as const)('classifies intake write failure as %s without proof or raw state', async (error, failure) => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    saveIntake.mockRejectedValue(error);
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openIntake('edge'));

    await act(async () => result.current.actions.saveIntake(intakeRequest()));

    expect(result.current.intakeFailure).toBe(failure);
    expect(result.current.intakeEditor).not.toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result.current)).not.toContain('raw ');
  });

  it('clears intake failure on cancel so a later ordinary mutation owns its feedback', async () => {
    load.mockResolvedValue(page(0, [collector('edge')], 1));
    mutate.mockRejectedValue(new ApiMessageError('raw forbidden detail', { status: 403 }));
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openIntake('edge'));
    await act(async () =>
      result.current.actions.saveIntake({ ...intakeRequest(), otlpGrpcEndpoint: 'http://unsafe.example.test' })
    );
    expect(result.current.intakeFailure).toBe('validation');

    act(() => result.current.actions.cancelIntake());
    expect(result.current.intakeFailure).toBeNull();
    act(() => result.current.actions.requestAction('offline', ['edge']));
    await act(async () => result.current.actions.confirmAction());

    expect(result.current.mutationFailure).toBe('permission');
    expect(result.current.intakeFailure).toBeNull();
  });

  it('closes a stale intake dialog without write or proof after the semantic query changes', async () => {
    load.mockResolvedValueOnce(page(0, [collector('edge')], 1)).mockResolvedValueOnce(page(0, [collector('west')], 1));
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openIntake('edge'));
    act(() => {
      void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west');
    });
    await waitFor(() => expect(result.current.query.name).toBe('west'));

    await act(async () => result.current.actions.saveIntake(intakeRequest()));

    expect(saveIntake).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.intakeEditor).toBeNull();
  });

  it('does not let a late intake completion overwrite a newer semantic query', async () => {
    const write = deferred<ReturnType<typeof intakeAvailable>>();
    load
      .mockResolvedValueOnce(page(0, [collector('edge')], 1))
      .mockResolvedValueOnce(page(0, [collector('west')], 1))
      .mockResolvedValueOnce(page(0, [collector('edge', intakeAvailable())], 1));
    saveIntake.mockReturnValue(write.promise);
    const { result } = renderHook(() => useCollectorController(), { wrapper: wrapper('/settings/collectors') });
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openIntake('edge'));
    let submission: Promise<void> | undefined;
    act(() => {
      submission = result.current.actions.saveIntake(intakeRequest());
      void submission;
    });
    await waitFor(() => expect(saveIntake).toHaveBeenCalledTimes(1));

    act(() => {
      void navigateRoute?.('/settings/collectors?pageIndex=0&pageSize=8&name=west');
    });
    await waitFor(() => expect(result.current.query.name).toBe('west'));
    write.resolve(intakeAvailable());
    await act(async () => submission);

    expect(result.current.query.name).toBe('west');
    expect(result.current.listState).toMatchObject({ kind: 'ready', records: [{ name: 'west' }] });
    expect(result.current.intakeEditor).toBeNull();
    expect(result.current.intakeFailure).toBeNull();
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

function collector(name: string, instrumentationIntake: CollectorInstrumentationIntake = intakeUnavailable()) {
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
    instrumentationIntake
  };
}

function intakeRequest() {
  return {
    schemaVersion: 1 as const,
    gateway: 'server' as const,
    capabilities: ['otlp_grpc'] as const,
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
  };
}

function intakeAvailable() {
  return {
    status: 'available' as const,
    schemaVersion: 1 as const,
    collectorId: 'edge',
    gateway: 'server' as const,
    capabilities: ['otlp_grpc'] as const,
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
    authorizationHeader: 'Authorization' as const
  };
}

function intakeUnavailable(
  errorCode:
    | 'intake_not_advertised'
    | 'intake_advertisement_invalid'
    | 'intake_advertisement_unavailable' = 'intake_not_advertised'
) {
  return { status: 'unavailable' as const, errorCode };
}
