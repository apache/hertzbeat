/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ loadMonitorImportTasks: vi.fn() }));
const stream = vi.hoisted(() => ({
  close: vi.fn(),
  handlers: undefined as { onCanonicalReread: (name: 'manager-ready' | 'IMPORT_TASK_EVENT') => void } | undefined,
  openMonitorImportTaskStream: vi.fn(handlers => {
    stream.handlers = handlers;
    return { close: stream.close };
  })
}));
vi.mock('../api/monitor-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-import-api')>()),
  loadMonitorImportTasks: api.loadMonitorImportTasks
}));
vi.mock('../api/monitor-import-task-stream', () => ({
  openMonitorImportTaskStream: stream.openMonitorImportTaskStream
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: { progress?: number }) => `${key}:${values?.progress ?? ''}` })
}));

import { useShellMonitorImportTaskNotifications } from './use-shell-monitor-import-task-notifications';

const running = task('IN_PROGRESS', 40);
const completed = task('COMPLETED', 100);
const historicalCompleted = {
  ...completed,
  taskId: '323e4567-e89b-42d3-a456-426614174000'
};
const fastCompleted = {
  ...completed,
  taskId: '423e4567-e89b-42d3-a456-426614174000'
};
const failed = {
  ...running,
  taskId: '223e4567-e89b-42d3-a456-426614174000',
  status: 'FAILED' as const,
  completedAt: '2026-07-31T12:00:10Z',
  errorCode: 'IMPORT_FAILED' as const
};
const failedRunning = { ...running, taskId: failed.taskId };

describe('shell monitor import canonical reread', () => {
  const open = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    stream.handlers = undefined;
    api.loadMonitorImportTasks.mockResolvedValue([]);
    vi.spyOn(App, 'useApp').mockReturnValue({
      message: {},
      modal: {},
      notification: { open }
    } as unknown as ReturnType<typeof App.useApp>);
  });

  it('single-flights duplicate manager triggers, rereads canonical list state, and refetches active task detail', async () => {
    const request = deferred<(typeof running)[]>();
    api.loadMonitorImportTasks.mockReturnValueOnce(request.promise).mockResolvedValueOnce([running]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(client) });

    act(() => {
      stream.handlers?.onCanonicalReread('manager-ready');
      stream.handlers?.onCanonicalReread('IMPORT_TASK_EVENT');
      stream.handlers?.onCanonicalReread('IMPORT_TASK_EVENT');
    });
    expect(api.loadMonitorImportTasks).toHaveBeenCalledOnce();
    request.resolve([running]);
    await waitFor(() => expect(api.loadMonitorImportTasks).toHaveBeenCalledTimes(2));

    expect(refetch).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['monitor', 'import-tasks'], type: 'active' }),
      { cancelRefetch: false }
    );
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ key: `monitor-import:${running.taskId}`, type: 'info' })
    );
  });

  it('derives terminal notification state only from canonical GET data and never records a filename', async () => {
    api.loadMonitorImportTasks.mockResolvedValueOnce([running]).mockResolvedValueOnce([completed]);
    renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(new QueryClient()) });

    act(() => stream.handlers?.onCanonicalReread('manager-ready'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    act(() => stream.handlers?.onCanonicalReread('IMPORT_TASK_EVENT'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));

    expect(open.mock.calls[1]?.[0]).toMatchObject({ key: `monitor-import:${running.taskId}`, type: 'success' });
    expect(JSON.stringify(open.mock.calls)).not.toContain('.json');
    expect(JSON.stringify(open.mock.calls)).not.toContain('filename');
  });

  it('establishes the first canonical list as a baseline without replaying historical terminal tasks', async () => {
    api.loadMonitorImportTasks.mockResolvedValueOnce([historicalCompleted, failed, running]);
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(client) });

    act(() => stream.handlers?.onCanonicalReread('manager-ready'));
    await waitFor(() => expect(api.loadMonitorImportTasks).toHaveBeenCalledOnce());
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: `monitor-import:${running.taskId}` }));
    expect(open).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: `monitor-import:${historicalCompleted.taskId}` })
    );
    expect(open).not.toHaveBeenCalledWith(expect.objectContaining({ key: `monitor-import:${failed.taskId}` }));
    expect(refetch).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['monitor', 'list'] }),
      expect.anything()
    );
  });

  it('refetches monitor lists once for an observed completion, but not for duplicates or failures', async () => {
    api.loadMonitorImportTasks
      .mockResolvedValueOnce([running, failedRunning])
      .mockResolvedValueOnce([completed, failed])
      .mockResolvedValueOnce([completed, failed]);
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(client) });

    for (const [index, eventName] of (['manager-ready', 'IMPORT_TASK_EVENT', 'IMPORT_TASK_EVENT'] as const).entries()) {
      act(() => stream.handlers?.onCanonicalReread(eventName));
      await waitFor(() => expect(api.loadMonitorImportTasks).toHaveBeenCalledTimes(index + 1));
    }
    await waitFor(() =>
      expect(refetch).toHaveBeenCalledWith({ queryKey: ['monitor', 'list'], type: 'active' }, { cancelRefetch: false })
    );

    const listRefetches = refetch.mock.calls.filter(([filters]) => filters?.queryKey?.join(':') === 'monitor:list');
    expect(listRefetches).toHaveLength(1);
  });

  it('converges once when a task first appears completed after the baseline', async () => {
    api.loadMonitorImportTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([fastCompleted, failed])
      .mockResolvedValueOnce([fastCompleted, failed]);
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(client) });

    for (const [index, eventName] of (['manager-ready', 'IMPORT_TASK_EVENT', 'IMPORT_TASK_EVENT'] as const).entries()) {
      act(() => stream.handlers?.onCanonicalReread(eventName));
      await waitFor(() => expect(api.loadMonitorImportTasks).toHaveBeenCalledTimes(index + 1));
    }

    const listRefetches = refetch.mock.calls.filter(([filters]) => filters?.queryKey?.join(':') === 'monitor:list');
    expect(listRefetches).toHaveLength(1);
  });

  it('aborts a canonical read and closes the stream on unmount without late publication', async () => {
    let signal: AbortSignal | undefined;
    api.loadMonitorImportTasks.mockImplementation(
      (requestSignal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal = requestSignal;
          requestSignal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), {
            once: true
          });
        })
    );
    const view = renderHook(useShellMonitorImportTaskNotifications, { wrapper: wrapper(new QueryClient()) });
    act(() => stream.handlers?.onCanonicalReread('manager-ready'));
    await waitFor(() => expect(signal).toBeInstanceOf(AbortSignal));

    view.unmount();

    expect(signal?.aborted).toBe(true);
    expect(stream.close).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
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
