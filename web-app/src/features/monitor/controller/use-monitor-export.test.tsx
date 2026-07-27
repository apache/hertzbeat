/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { App } from 'antd';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const exportApi = vi.hoisted(() => ({ requestMonitorExport: vi.fn() }));
const download = vi.hoisted(() => ({ saveMonitorExport: vi.fn() }));
vi.mock('../api/monitor-export-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-export-api')>()),
  requestMonitorExport: exportApi.requestMonitorExport
}));
vi.mock('../model/monitor-export-download', () => download);

import { useMonitorExport } from './use-monitor-export';

describe('useMonitorExport', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.resetAllMocks();
    exportApi.requestMonitorExport.mockResolvedValue({
      data: new Blob(['[]']),
      filename: 'monitor.json'
    });
  });

  it('exports selected monitors and all monitors for an administrator', async () => {
    const view = renderHook(() => useMonitorExport([7, 8], { canExport: true }), { wrapper });

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
  });

  it('does not admit export without the backend-required administrator role', async () => {
    const view = renderHook(() => useMonitorExport([7], { canExport: false }), { wrapper });

    expect(view.result.current.canExport).toBe(false);
    await act(() => view.result.current.exportSelected('JSON'));
    await act(() => view.result.current.exportAll('JSON'));

    expect(exportApi.requestMonitorExport).not.toHaveBeenCalled();
    expect(download.saveMonitorExport).not.toHaveBeenCalled();
  });

  it('does not send an empty selected export request', async () => {
    const view = renderHook(() => useMonitorExport([], { canExport: true }), { wrapper });

    await act(() => view.result.current.exportSelected('JSON'));

    expect(exportApi.requestMonitorExport).not.toHaveBeenCalled();
  });
});

function wrapper({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <App>{children}</App>
    </I18nextProvider>
  );
}
