/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ importMonitorConfig: vi.fn(), loadMonitorImportTask: vi.fn() }));
const notify = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock('../api/monitor-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-import-api')>()),
  importMonitorConfig: api.importMonitorConfig,
  loadMonitorImportTask: api.loadMonitorImportTask
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { MonitorImportTaskReadError } from '../api/monitor-import-api';
import { monitorQueryKeys } from './monitor-query-keys';
import { useMonitorImport } from './use-monitor-import';

const running = task('IN_PROGRESS', 25);
const completed = task('COMPLETED', 100);

describe('useMonitorImport canonical task lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.importMonitorConfig.mockResolvedValue(running);
    api.loadMonitorImportTask.mockResolvedValue(running);
  });

  it('keeps accepted progress visible and refreshes the monitor list only after canonical completion', async () => {
    const client = queryClient();
    const reread = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorImport(reread, { canWrite: true }), { wrapper: wrapper(client) });
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'private-name.json')));

    await act(() => view.result.current.actions.submit());

    expect(view.result.current.state.task).toEqual({ kind: 'ready', task: running, refreshing: false });
    expect(view.result.current.state.draft).toEqual({ file: null });
    expect(reread).not.toHaveBeenCalled();

    api.loadMonitorImportTask.mockResolvedValue(completed);
    await act(() => client.refetchQueries({ queryKey: monitorQueryKeys.importTask(running.taskId), exact: true }));
    await waitFor(() =>
      expect(view.result.current.state.task).toEqual({ kind: 'ready', task: completed, refreshing: false })
    );
    await waitFor(() => expect(reread).toHaveBeenCalledOnce());
  });

  it('shows process-restart 404 as no longer queryable without fabricating a terminal task', async () => {
    const client = queryClient();
    const view = renderHook(() => useMonitorImport(vi.fn(), { canWrite: true }), { wrapper: wrapper(client) });
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    await act(() => view.result.current.actions.submit());
    api.loadMonitorImportTask.mockRejectedValue(new MonitorImportTaskReadError('not-queryable'));

    await act(() => client.refetchQueries({ queryKey: monitorQueryKeys.importTask(running.taskId), exact: true }));

    await waitFor(() => expect(view.result.current.state.task).toEqual({ kind: 'not-queryable' }));
    expect(JSON.stringify(view.result.current.state)).not.toContain('FAILED');
    expect(JSON.stringify(view.result.current.state)).not.toContain('COMPLETED');
  });

  it('renders only the canonical safe failure code', async () => {
    const failed = {
      ...running,
      status: 'FAILED' as const,
      completedAt: '2026-07-31T12:00:10Z',
      errorCode: 'IMPORT_FAILED' as const
    };
    api.importMonitorConfig.mockResolvedValue(failed);
    const view = renderHook(() => useMonitorImport(vi.fn(), { canWrite: true }), { wrapper: wrapper(queryClient()) });
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['bad'], 'monitors.yaml')));

    await act(() => view.result.current.actions.submit());

    expect(view.result.current.state.task).toEqual({ kind: 'ready', task: failed, refreshing: false });
  });

  it.each(['cancel', 'unmount'] as const)('retires an accepted response that arrives after %s', async retirement => {
    const request = deferred<typeof running>();
    let signal: AbortSignal | undefined;
    api.importMonitorConfig.mockImplementation((_file, requestSignal) => {
      signal = requestSignal;
      return request.promise;
    });
    const reread = vi.fn();
    const view = renderHook(() => useMonitorImport(reread, { canWrite: true }), { wrapper: wrapper(queryClient()) });
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    const result = view.result.current.actions.submit();
    await waitFor(() => expect(view.result.current.state.busy).toBe(true));

    if (retirement === 'cancel') act(() => view.result.current.actions.cancel());
    else view.unmount();
    expect(signal?.aborted).toBe(true);
    request.resolve(running);
    await expect(result).resolves.toBe(false);

    expect(reread).not.toHaveBeenCalled();
    if (retirement === 'cancel') expect(view.result.current.state.open).toBe(false);
  });
});

function task(status: 'IN_PROGRESS' | 'COMPLETED', progress: number) {
  return {
    schemaVersion: 1 as const,
    taskId: '123e4567-e89b-42d3-a456-426614174000',
    taskType: 'MONITOR_IMPORT' as const,
    status,
    progress,
    createdAt: '2026-07-31T12:00:00Z',
    startedAt: '2026-07-31T12:00:00Z',
    completedAt: status === 'COMPLETED' ? '2026-07-31T12:00:10Z' : null,
    errorCode: null
  };
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => (resolve = complete));
  return { promise, resolve };
}
