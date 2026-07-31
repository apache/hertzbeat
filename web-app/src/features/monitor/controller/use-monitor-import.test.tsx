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

const api = vi.hoisted(() => ({ importMonitorConfig: vi.fn() }));
const notify = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock('../api/monitor-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-import-api')>()),
  importMonitorConfig: api.importMonitorConfig
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { MonitorImportError } from '../api/monitor-import-api';
import { useMonitorImport } from './use-monitor-import';

describe('useMonitorImport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.importMonitorConfig.mockResolvedValue(running);
  });

  it('accepts an administrator-selected file without treating acceptance as completion', async () => {
    const reread = vi.fn().mockResolvedValue(undefined);
    const onImported = vi.fn();
    const file = new File(['[]'], 'monitors.json');
    const view = renderImportHook(() => useMonitorImport(reread, { canWrite: true }, onImported));

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());

    expect(api.importMonitorConfig).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(onImported).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
    expect(view.result.current.state).toMatchObject({ open: true, draft: { file: null }, task: { kind: 'ready' } });
  });

  it('clears an unsubmitted file on cancel without writing', () => {
    const view = renderImportHook(() => useMonitorImport(vi.fn(), { canWrite: true }));

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    act(() => view.result.current.actions.cancel());

    expect(view.result.current.state.draft).toBeNull();
    expect(api.importMonitorConfig).not.toHaveBeenCalled();
  });

  it('allows a server-authorized user to open the import draft', () => {
    const allowed = renderImportHook(() => useMonitorImport(vi.fn(), { canWrite: true }));
    act(() => allowed.result.current.actions.open());
    expect(allowed.result.current.state.draft).toEqual({ file: null });
  });

  it('keeps a guest direct open inert', () => {
    const denied = renderImportHook(() => useMonitorImport(vi.fn(), { canWrite: false }));
    act(() => denied.result.current.actions.open());
    expect(denied.result.current.state.draft).toBeNull();
    expect(api.importMonitorConfig).not.toHaveBeenCalled();
  });

  it('preserves validation and safe API failure kinds', async () => {
    const admin = renderImportHook(() => useMonitorImport(vi.fn(), { canWrite: true }));
    act(() => admin.result.current.actions.open());
    act(() => admin.result.current.actions.selectFile(new File(['x'], 'monitors.toml')));
    await act(() => admin.result.current.actions.submit());
    expect(admin.result.current.state.invalid).toBe('unsupported');

    api.importMonitorConfig.mockRejectedValue(new MonitorImportError('forbidden'));
    act(() => admin.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    await act(() => admin.result.current.actions.submit());
    expect(admin.result.current.state.failure).toBe('forbidden');
  });

  it('fails retained open, select, and submit callbacks closed after write permission is lost', async () => {
    const reread = vi.fn().mockResolvedValue(undefined);
    const onImported = vi.fn();
    const file = new File(['[]'], 'monitors.json');
    const view = renderHook(
      ({ canWrite }: { canWrite: boolean }) => useMonitorImport(reread, { canWrite }, onImported),
      { initialProps: { canWrite: true }, wrapper: queryWrapper() }
    );
    const retainedOpen = view.result.current.actions.open;
    act(() => view.result.current.actions.open());
    const retainedSelect = view.result.current.actions.selectFile;
    act(() => view.result.current.actions.selectFile(file));
    const retainedSubmit = view.result.current.actions.submit;

    view.rerender({ canWrite: false });
    expect(view.result.current.state).toMatchObject({
      canImport: false,
      draft: null,
      invalid: null,
      failure: null,
      busy: false
    });
    act(() => retainedOpen());
    act(() => retainedSelect(file));
    await expect(retainedSubmit()).resolves.toBe(false);

    expect(view.result.current.state.draft).toBeNull();
    expect(api.importMonitorConfig).not.toHaveBeenCalled();
    expect(onImported).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'retires an in-flight import on permission loss before a late %s',
    async completion => {
      let settle!: () => void;
      let signal!: AbortSignal;
      api.importMonitorConfig.mockImplementation(
        (_file, observedSignal) =>
          new Promise<typeof running>((resolve, reject) => {
            signal = observedSignal;
            settle = () => (completion === 'resolve' ? resolve(running) : reject(new Error('late failure')));
          })
      );
      const reread = vi.fn().mockResolvedValue(undefined);
      const onImported = vi.fn();
      const view = renderHook(
        ({ canWrite }: { canWrite: boolean }) => useMonitorImport(reread, { canWrite }, onImported),
        { initialProps: { canWrite: true }, wrapper: queryWrapper() }
      );
      act(() => view.result.current.actions.open());
      act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
      let result!: Promise<boolean>;
      act(() => {
        result = view.result.current.actions.submit();
      });
      await waitFor(() => expect(view.result.current.state.busy).toBe(true));

      view.rerender({ canWrite: false });
      expect(signal.aborted).toBe(true);
      expect(view.result.current.state).toMatchObject({
        canImport: false,
        draft: null,
        invalid: null,
        failure: null,
        busy: false
      });
      await act(async () => {
        settle();
        await expect(result).resolves.toBe(false);
      });

      expect(onImported).not.toHaveBeenCalled();
      expect(reread).not.toHaveBeenCalled();
      expect(notify.warning).not.toHaveBeenCalled();
      expect(view.result.current.state).toMatchObject({
        draft: null,
        invalid: null,
        failure: null,
        busy: false
      });
    }
  );

  it('does not publish a late import after unmount when transport ignores abort', async () => {
    let resolveImport!: () => void;
    let signal!: AbortSignal;
    api.importMonitorConfig.mockImplementation(
      (_file, observedSignal) =>
        new Promise<typeof running>(resolve => {
          signal = observedSignal;
          resolveImport = () => resolve(running);
        })
    );
    const reread = vi.fn().mockResolvedValue(undefined);
    const onImported = vi.fn();
    const view = renderImportHook(() => useMonitorImport(reread, { canWrite: true }, onImported));
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    const result = view.result.current.actions.submit();

    view.unmount();
    expect(signal.aborted).toBe(true);
    resolveImport();
    await expect(result).resolves.toBe(false);

    expect(onImported).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  it('rejects an ABA late response while allowing the new import owner to publish', async () => {
    const requests: Array<{ signal: AbortSignal; resolve: () => void }> = [];
    api.importMonitorConfig.mockImplementation(
      (_file, signal) =>
        new Promise<typeof running>(resolve => {
          requests.push({ signal, resolve: () => resolve(running) });
        })
    );
    const reread = vi.fn().mockResolvedValue(undefined);
    const onImported = vi.fn();
    const view = renderHook(
      ({ canWrite }: { canWrite: boolean }) => useMonitorImport(reread, { canWrite }, onImported),
      { initialProps: { canWrite: true }, wrapper: queryWrapper() }
    );
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'first.json')));
    const first = view.result.current.actions.submit();
    await waitFor(() => expect(view.result.current.state.busy).toBe(true));

    view.rerender({ canWrite: false });
    view.rerender({ canWrite: true });
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['name: second'], 'second.yml')));
    let second!: Promise<boolean>;
    act(() => {
      second = view.result.current.actions.submit();
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(view.result.current.state.busy).toBe(true));

    requests[0]!.resolve();
    await expect(first).resolves.toBe(false);
    expect(view.result.current.state.busy).toBe(true);
    expect(onImported).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();

    await act(async () => {
      requests[1]!.resolve();
      await expect(second).resolves.toBe(true);
    });
    expect(onImported).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
    expect(view.result.current.state).toMatchObject({ draft: { file: null }, busy: false, task: { kind: 'ready' } });
  });
});

const running = {
  schemaVersion: 1 as const,
  taskId: '123e4567-e89b-42d3-a456-426614174000',
  taskType: 'MONITOR_IMPORT' as const,
  status: 'IN_PROGRESS' as const,
  progress: 10,
  createdAt: '2026-07-31T12:00:00Z',
  startedAt: '2026-07-31T12:00:00Z',
  completedAt: null,
  errorCode: null
};

function renderImportHook<Result>(callback: () => Result) {
  return renderHook(callback, { wrapper: queryWrapper() });
}

function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
