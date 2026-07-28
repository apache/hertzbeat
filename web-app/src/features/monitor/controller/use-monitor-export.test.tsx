/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportApi = vi.hoisted(() => ({ requestMonitorExport: vi.fn() }));
const download = vi.hoisted(() => ({ saveMonitorExport: vi.fn() }));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('../api/monitor-export-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-export-api')>()),
  requestMonitorExport: exportApi.requestMonitorExport
}));
vi.mock('../model/monitor-export-download', () => download);
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMonitorExport } from './use-monitor-export';

describe('useMonitorExport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    exportApi.requestMonitorExport.mockResolvedValue({
      data: new Blob(['[]']),
      filename: 'monitor.json'
    });
  });

  it('exports selected monitors and all monitors for an administrator', async () => {
    const view = renderHook(() => useMonitorExport([7, 8], { canExport: true }));

    await act(() => view.result.current.exportSelected('JSON'));
    await act(() => view.result.current.exportAll('EXCEL'));

    expect(exportApi.requestMonitorExport).toHaveBeenNthCalledWith(
      1,
      { kind: 'selected', ids: [7, 8] },
      'JSON',
      expect.any(AbortSignal)
    );
    expect(exportApi.requestMonitorExport).toHaveBeenNthCalledWith(
      2,
      { kind: 'all' },
      'EXCEL',
      expect.any(AbortSignal)
    );
    expect(download.saveMonitorExport).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledTimes(2);
  });

  it('does not admit export without the backend-required administrator role', async () => {
    const view = renderHook(() => useMonitorExport([7], { canExport: false }));

    expect(view.result.current.canExport).toBe(false);
    await act(() => view.result.current.exportSelected('JSON'));
    await act(() => view.result.current.exportAll('JSON'));

    expect(exportApi.requestMonitorExport).not.toHaveBeenCalled();
    expect(download.saveMonitorExport).not.toHaveBeenCalled();
  });

  it('does not send an empty selected export request', async () => {
    const view = renderHook(() => useMonitorExport([], { canExport: true }));

    await expect(view.result.current.exportSelected('JSON')).resolves.toBe(false);

    expect(exportApi.requestMonitorExport).not.toHaveBeenCalled();
    expect(download.saveMonitorExport).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('fails retained selected and all callbacks closed after export permission is lost', async () => {
    const view = renderHook(({ canExport }: { canExport: boolean }) => useMonitorExport([7, 8], { canExport }), {
      initialProps: { canExport: true }
    });
    const retainedSelected = view.result.current.exportSelected;
    const retainedAll = view.result.current.exportAll;

    view.rerender({ canExport: false });
    await expect(retainedSelected('JSON')).resolves.toBe(false);
    await expect(retainedAll('EXCEL')).resolves.toBe(false);

    expect(exportApi.requestMonitorExport).not.toHaveBeenCalled();
    expect(download.saveMonitorExport).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'retires an in-flight export on permission loss before a late %s',
    async completion => {
      let settle!: () => void;
      let signal!: AbortSignal;
      exportApi.requestMonitorExport.mockImplementation(
        (_scope, _format, observedSignal) =>
          new Promise((resolve, reject) => {
            signal = observedSignal;
            settle = () =>
              completion === 'resolve'
                ? resolve({ data: new Blob(['late']), filename: 'late.json' })
                : reject(new Error('late failure'));
          })
      );
      const view = renderHook(({ canExport }: { canExport: boolean }) => useMonitorExport([7], { canExport }), {
        initialProps: { canExport: true }
      });
      let result!: Promise<boolean>;

      act(() => {
        result = view.result.current.exportAll('JSON');
      });
      await waitFor(() => expect(view.result.current.exporting).toBe(true));
      view.rerender({ canExport: false });

      expect(signal.aborted).toBe(true);
      expect(view.result.current.exporting).toBe(false);
      await act(async () => {
        settle();
        await expect(result).resolves.toBe(false);
      });
      expect(download.saveMonitorExport).not.toHaveBeenCalled();
      expect(notify.success).not.toHaveBeenCalled();
      expect(notify.error).not.toHaveBeenCalled();
    }
  );

  it('does not publish a late successful export after unmount even when transport ignores abort', async () => {
    let resolveExport!: (value: { data: Blob; filename: string }) => void;
    let signal!: AbortSignal;
    exportApi.requestMonitorExport.mockImplementation(
      (_scope, _format, observedSignal) =>
        new Promise(resolve => {
          signal = observedSignal;
          resolveExport = resolve;
        })
    );
    const view = renderHook(() => useMonitorExport([7], { canExport: true }));
    const result = view.result.current.exportSelected('JSON');

    view.unmount();
    expect(signal.aborted).toBe(true);
    resolveExport({ data: new Blob(['late']), filename: 'late.json' });
    await expect(result).resolves.toBe(false);

    expect(download.saveMonitorExport).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('rejects an ABA late response while allowing the new owner to publish', async () => {
    const requests: Array<{
      signal: AbortSignal;
      resolve: (value: { data: Blob; filename: string }) => void;
    }> = [];
    exportApi.requestMonitorExport.mockImplementation(
      (_scope, _format, signal) =>
        new Promise(resolve => {
          requests.push({ signal, resolve });
        })
    );
    const view = renderHook(({ canExport }: { canExport: boolean }) => useMonitorExport([7], { canExport }), {
      initialProps: { canExport: true }
    });
    const first = view.result.current.exportAll('JSON');
    await waitFor(() => expect(view.result.current.exporting).toBe(true));

    view.rerender({ canExport: false });
    view.rerender({ canExport: true });
    let second!: Promise<boolean>;
    act(() => {
      second = view.result.current.exportSelected('EXCEL');
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    await waitFor(() => expect(view.result.current.exporting).toBe(true));

    requests[0]!.resolve({ data: new Blob(['old']), filename: 'old.json' });
    await expect(first).resolves.toBe(false);
    expect(view.result.current.exporting).toBe(true);
    expect(download.saveMonitorExport).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();

    requests[1]!.resolve({ data: new Blob(['new']), filename: 'new.xlsx' });
    await expect(second).resolves.toBe(true);
    expect(download.saveMonitorExport).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledOnce();
    expect(notify.error).not.toHaveBeenCalled();
  });
});
