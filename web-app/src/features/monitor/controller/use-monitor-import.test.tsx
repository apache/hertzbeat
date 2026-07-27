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

import { App } from 'antd';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({ importMonitorConfig: vi.fn() }));
vi.mock('../api/monitor-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-import-api')>()),
  importMonitorConfig: api.importMonitorConfig
}));

import { MonitorImportError } from '../api/monitor-import-api';
import { useMonitorImport } from './use-monitor-import';

describe('useMonitorImport', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.resetAllMocks();
    api.importMonitorConfig.mockResolvedValue(undefined);
  });

  it('imports an administrator-selected file and rereads the real list', async () => {
    const reread = vi.fn().mockResolvedValue(undefined);
    const onImported = vi.fn();
    const file = new File(['[]'], 'monitors.json');
    const view = renderHook(() => useMonitorImport(reread, { canWrite: true }, onImported), { wrapper });

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());

    expect(api.importMonitorConfig).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(onImported).toHaveBeenCalledOnce();
    expect(reread).toHaveBeenCalledOnce();
    expect(view.result.current.state.draft).toBeNull();
  });

  it('clears an unsubmitted file on cancel without writing', () => {
    const view = renderHook(() => useMonitorImport(vi.fn(), { canWrite: true }), { wrapper });

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    act(() => view.result.current.actions.cancel());

    expect(view.result.current.state.draft).toBeNull();
    expect(api.importMonitorConfig).not.toHaveBeenCalled();
  });

  it('allows a server-authorized user to open the import draft', () => {
    const allowed = renderHook(() => useMonitorImport(vi.fn(), { canWrite: true }), { wrapper });
    act(() => allowed.result.current.actions.open());
    expect(allowed.result.current.state.draft).toEqual({ file: null });
  });

  it('keeps a guest direct open inert', () => {
    const denied = renderHook(() => useMonitorImport(vi.fn(), { canWrite: false }), { wrapper });
    act(() => denied.result.current.actions.open());
    expect(denied.result.current.state.draft).toBeNull();
    expect(api.importMonitorConfig).not.toHaveBeenCalled();
  });

  it('preserves validation and safe API failure kinds', async () => {
    const admin = renderHook(() => useMonitorImport(vi.fn(), { canWrite: true }), { wrapper });
    act(() => admin.result.current.actions.open());
    act(() => admin.result.current.actions.selectFile(new File(['x'], 'monitors.toml')));
    await act(() => admin.result.current.actions.submit());
    expect(admin.result.current.state.invalid).toBe('unsupported');

    api.importMonitorConfig.mockRejectedValue(new MonitorImportError('forbidden'));
    act(() => admin.result.current.actions.selectFile(new File(['[]'], 'monitors.json')));
    await act(() => admin.result.current.actions.submit());
    expect(admin.result.current.state.failure).toBe('forbidden');
  });
});

function wrapper({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <App>{children}</App>
    </I18nextProvider>
  );
}
