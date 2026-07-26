/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ requestAlertRuleExport: vi.fn() }));
const download = vi.hoisted(() => ({ saveBrowserDownload: vi.fn() }));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('../api/alert-rule-export-api', () => ({
  AlertRuleExportError: class AlertRuleExportError extends Error {
    constructor(readonly kind: string) {
      super('failed');
    }
  },
  ...api
}));
vi.mock('@/shared/browser-download', () => download);
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useAlertRuleExport } from './use-alert-rule-export';

describe('Alert Rule export controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.requestAlertRuleExport.mockResolvedValue({ data: new Blob(['rules']), filename: 'rules.json' });
  });

  it('downloads one canonical selected export and reports success', async () => {
    const { result } = renderHook(() => useAlertRuleExport());
    await act(async () => result.current.exportSelected([9, 7, 9], 'JSON'));

    expect(api.requestAlertRuleExport).toHaveBeenCalledWith([9, 7, 9], 'JSON', expect.any(AbortSignal));
    expect(download.saveBrowserDownload).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith('alertRules.export.success');
  });

  it('admits only one export and aborts it when the controller unmounts', async () => {
    let observedSignal: AbortSignal | undefined;
    api.requestAlertRuleExport.mockImplementation((_ids, _format, signal) => {
      observedSignal = signal;
      return new Promise(() => undefined);
    });
    const { result, unmount } = renderHook(() => useAlertRuleExport());

    act(() => {
      void result.current.exportSelected([7], 'JSON');
      void result.current.exportSelected([7], 'EXCEL');
    });
    expect(api.requestAlertRuleExport).toHaveBeenCalledTimes(1);
    unmount();
    expect(observedSignal?.aborted).toBe(true);
  });
});
