/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { monitorQueryKeys } from './monitor-query-keys';

const api = vi.hoisted(() => ({
  deleteMonitorGrafanaDashboards: vi.fn(),
  mutateMonitors: vi.fn()
}));
const verification = vi.hoisted(() => ({ verifyMonitorMutation: vi.fn() }));

vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  deleteMonitorGrafanaDashboards: api.deleteMonitorGrafanaDashboards,
  mutateMonitors: api.mutateMonitors
}));
vi.mock('./monitor-command-verification', async importOriginal => ({
  ...(await importOriginal<typeof import('./monitor-command-verification')>()),
  verifyMonitorMutation: verification.verifyMonitorMutation
}));

import { useMonitorListCommands } from './use-monitor-list-commands';

const page = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
type ListCapabilities = { canWrite: boolean; canDelete: boolean };

describe('useMonitorListCommands retirement', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    api.mutateMonitors.mockResolvedValue(undefined);
    api.deleteMonitorGrafanaDashboards.mockResolvedValue(false);
    verification.verifyMonitorMutation.mockResolvedValue({ kind: 'verified', evidence: [] });
  });
  afterEach(cleanup);

  it.each([
    [
      'delete resolves late',
      'delete',
      { canWrite: true, canDelete: true },
      { canWrite: true, canDelete: false },
      'resolve'
    ],
    [
      'enable rejects late',
      'enable',
      { canWrite: true, canDelete: false },
      { canWrite: false, canDelete: false },
      'reject'
    ]
  ] as const)(
    'retires in-flight %s on capability loss before it can publish',
    async (_label, action, initialCapabilities, nextCapabilities, completion) => {
      const mutation = deferred<void>();
      let mutationSignal: AbortSignal | undefined;
      api.mutateMonitors.mockImplementation((_action, _ids, signal: AbortSignal) => {
        mutationSignal = signal;
        return mutation.promise;
      });
      const queryClient = new QueryClient();
      const retainedDetail = { marker: 'retained-detail' };
      queryClient.setQueryData(monitorQueryKeys.detail(7), retainedDetail);
      const selection = selectionController();
      const reread = vi.fn().mockResolvedValue(page);
      const initialProps: { capabilities: ListCapabilities } = { capabilities: initialCapabilities };
      const view = renderHook(
        ({ capabilities }: { capabilities: ListCapabilities }) =>
          useMonitorListCommands('page=0', reread, selection, capabilities),
        {
          initialProps,
          wrapper: providers(queryClient)
        }
      );
      let operation!: Promise<void>;
      act(() => {
        operation = view.result.current.run(action, [7]);
      });
      expect(view.result.current.operating).toBe(true);

      view.rerender({ capabilities: nextCapabilities });

      expect(view.result.current.operating).toBe(false);
      expect(mutationSignal).toBeInstanceOf(AbortSignal);
      expect(mutationSignal?.aborted).toBe(true);
      if (completion === 'resolve') mutation.resolve();
      else mutation.reject(new Error('late rejection'));
      await act(async () => operation);

      expect(verification.verifyMonitorMutation).not.toHaveBeenCalled();
      expect(api.deleteMonitorGrafanaDashboards).not.toHaveBeenCalled();
      expect(queryClient.getQueryData(monitorQueryKeys.detail(7))).toBe(retainedDetail);
      expect(reread).not.toHaveBeenCalled();
      expect(screen.queryByText(i18n.t('monitorActions.success'))).not.toBeInTheDocument();
      expect(screen.queryByText(i18n.t('monitorActions.failed'))).not.toBeInTheDocument();
      if (action === 'delete') expect(selection.remove).not.toHaveBeenCalled();
      else expect(selection.remove).toHaveBeenCalledWith([7]);
    }
  );

  it('does not remove delete detail evidence before Grafana cleanup completes', async () => {
    const cleanupRequest = deferred<boolean>();
    api.deleteMonitorGrafanaDashboards.mockReturnValue(cleanupRequest.promise);
    verification.verifyMonitorMutation.mockResolvedValue({
      kind: 'verified',
      evidence: [{ kind: 'missing', id: 7 }]
    });
    const queryClient = new QueryClient();
    const retainedDetail = { marker: 'retained-detail' };
    queryClient.setQueryData(monitorQueryKeys.detail(7), retainedDetail);
    const selection = selectionController();
    const reread = vi.fn().mockResolvedValue(page);
    const view = renderHook(
      () =>
        useMonitorListCommands('page=0', reread, selection, {
          canWrite: true,
          canDelete: true
        }),
      { wrapper: providers(queryClient) }
    );

    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.run('delete', [7]);
    });
    await act(async () => Promise.resolve());

    expect(api.deleteMonitorGrafanaDashboards).toHaveBeenCalled();
    expect(queryClient.getQueryData(monitorQueryKeys.detail(7))).toBe(retainedDetail);
    expect(selection.remove).not.toHaveBeenCalled();

    cleanupRequest.resolve(false);
    await act(async () => operation);

    expect(queryClient.getQueryData(monitorQueryKeys.detail(7))).toBeUndefined();
    expect(selection.remove).toHaveBeenCalledWith([7]);
    expect(reread).toHaveBeenCalledOnce();
  });

  it('preserves delete detail evidence when capability loss retires the owner during Grafana cleanup', async () => {
    const cleanupRequest = deferred<boolean>();
    api.deleteMonitorGrafanaDashboards.mockReturnValue(cleanupRequest.promise);
    verification.verifyMonitorMutation.mockResolvedValue({
      kind: 'verified',
      evidence: [{ kind: 'missing', id: 7 }]
    });
    const queryClient = new QueryClient();
    const retainedDetail = { marker: 'retained-detail' };
    queryClient.setQueryData(monitorQueryKeys.detail(7), retainedDetail);
    const selection = selectionController();
    const reread = vi.fn().mockResolvedValue(page);
    const view = renderHook(({ capabilities }) => useMonitorListCommands('page=0', reread, selection, capabilities), {
      initialProps: { capabilities: { canWrite: true, canDelete: true } },
      wrapper: providers(queryClient)
    });

    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.run('delete', [7]);
    });
    await act(async () => Promise.resolve());
    view.rerender({ capabilities: { canWrite: true, canDelete: false } });

    expect(view.result.current.operating).toBe(false);
    cleanupRequest.resolve(false);
    await act(async () => operation);

    expect(queryClient.getQueryData(monitorQueryKeys.detail(7))).toBe(retainedDetail);
    expect(selection.remove).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
  });
});

function selectionController() {
  return { remove: vi.fn(), validatedIds: vi.fn(() => [7]) };
}

function providers(client: QueryClient) {
  return function Providers({ children }: PropsWithChildren) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <App>{children}</App>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
