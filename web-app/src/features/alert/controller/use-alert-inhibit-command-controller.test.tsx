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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertInhibitMissingError, type AlertInhibit } from '../alert-inhibit-model';
import {
  alertInhibitPage,
  deferred,
  persistedAlertInhibit,
  validAlertInhibitDraft
} from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitCommandController } from './use-alert-inhibit-command-controller';

const api = vi.hoisted(() => ({
  deleteAlertInhibit: vi.fn(),
  loadAlertInhibit: vi.fn(),
  saveAlertInhibit: vi.fn(),
  updateAlertInhibitEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
const reread = vi.hoisted(() => vi.fn());

vi.mock('../alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-inhibit-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert Inhibit command controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibit.mockResolvedValue(persistedAlertInhibit);
    api.saveAlertInhibit.mockResolvedValue(undefined);
    api.updateAlertInhibitEnabled.mockResolvedValue(undefined);
    api.deleteAlertInhibit.mockResolvedValue(undefined);
    reread.mockResolvedValue(alertInhibitPage({ search: '', pageIndex: 0, pageSize: 8 }, []));
  });

  it('admits only one same-tick write command', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    let first!: Promise<void>;
    let duplicate!: Promise<void>;
    act(() => {
      first = result.current.submit();
      duplicate = result.current.submit();
      void result.current.toggle(persistedAlertInhibit, false);
      void result.current.remove(persistedAlertInhibit.id);
    });

    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.updateAlertInhibitEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertInhibit).not.toHaveBeenCalled();
    act(() => write.resolve(undefined));
    await act(async () => Promise.all([first, duplicate]));
    expect(result.current.state.command).toBe('idle');
  });

  it('lets toggle synchronously claim the gate before its detail read settles', async () => {
    const freshDetail = deferred<AlertInhibit>();
    api.loadAlertInhibit
      .mockReturnValueOnce(freshDetail.promise)
      .mockResolvedValue({ ...persistedAlertInhibit, enable: false });
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    let first!: Promise<void>;
    act(() => {
      first = result.current.toggle(persistedAlertInhibit, false);
      void result.current.toggle(persistedAlertInhibit, false);
      void result.current.remove(persistedAlertInhibit.id);
      void result.current.submit();
    });

    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.deleteAlertInhibit).not.toHaveBeenCalled();
    expect(api.saveAlertInhibit).not.toHaveBeenCalled();
    act(() => freshDetail.resolve(persistedAlertInhibit));
    await act(async () => first);
    expect(api.updateAlertInhibitEnabled).toHaveBeenCalledTimes(1);
  });

  it('lets remove synchronously claim the gate before delete settles', async () => {
    const deletion = deferred<void>();
    api.deleteAlertInhibit.mockReturnValueOnce(deletion.promise);
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    let first!: Promise<void>;
    act(() => {
      first = result.current.remove(persistedAlertInhibit.id);
      void result.current.remove(persistedAlertInhibit.id);
      void result.current.toggle(persistedAlertInhibit, false);
      void result.current.submit();
    });

    expect(api.deleteAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.updateAlertInhibitEnabled).not.toHaveBeenCalled();
    expect(api.saveAlertInhibit).not.toHaveBeenCalled();
    act(() => deletion.resolve(undefined));
    await act(async () => first);
    expect(result.current.state.command).toBe('idle');
  });

  it('blocks editor context changes during a write and releases the gate in finally', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
    });

    act(() => {
      result.current.create();
      result.current.closeDraft();
      result.current.updateDraft({ name: 'must not replace' });
      void result.current.edit(persistedAlertInhibit.id);
    });
    expect(result.current.state.draft).toMatchObject({ name: persistedAlertInhibit.name });
    expect(api.loadAlertInhibit).not.toHaveBeenCalled();

    act(() => write.resolve(undefined));
    await act(async () => submission);
    expect(result.current.state.command).toBe('idle');
    act(() => result.current.create());
    expect(result.current.state.draft).toMatchObject({ name: '' });
  });

  it('cannot submit the retired draft while a different detail is loading', async () => {
    const next = deferred<AlertInhibit>();
    api.loadAlertInhibit.mockResolvedValueOnce(persistedAlertInhibit).mockReturnValueOnce(next.promise);
    const { result } = renderCommandController();
    await act(async () => result.current.edit(7));

    let nextEdit!: Promise<void>;
    act(() => {
      nextEdit = result.current.edit(8);
      void result.current.submit();
    });

    expect(result.current.state.draft).toBeNull();
    expect(api.saveAlertInhibit).not.toHaveBeenCalled();
    act(() => next.resolve({ ...persistedAlertInhibit, id: 8 }));
    await act(async () => nextEdit);
  });

  it('toggles from fresh exact detail and then proves canonical convergence', async () => {
    const stale = { ...persistedAlertInhibit, name: 'Stale list name' };
    const fresh = { ...persistedAlertInhibit, name: 'Fresh detail name' };
    api.loadAlertInhibit.mockResolvedValueOnce(fresh).mockResolvedValueOnce({ ...fresh, enable: false });
    const { result } = renderCommandController();

    await act(async () => result.current.toggle(stale, false));

    expect(api.loadAlertInhibit).toHaveBeenNthCalledWith(1, persistedAlertInhibit.id);
    expect(api.updateAlertInhibitEnabled).toHaveBeenCalledWith(fresh, false);
    expect(api.loadAlertInhibit.mock.invocationCallOrder[0]).toBeLessThan(
      api.updateAlertInhibitEnabled.mock.invocationCallOrder[0] ?? 0
    );
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
  });

  it('classifies write missing as an editor error rather than detail missing', async () => {
    api.saveAlertInhibit.mockRejectedValueOnce(new ApiMessageError('missing', { status: 404 }));
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());

    expect(result.current.state.editorFailure).toBe('error');
    expect(result.current.state.detail).toEqual({ kind: 'idle' });
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.command).toBe('idle');
    act(() => result.current.create());
    expect(result.current.state.draft).toMatchObject({ name: '' });
  });

  it('accepts semantic map/set order after PUT and rejects writable drift', async () => {
    const { result } = renderCommandController();
    await act(async () => result.current.edit(7));
    act(() => result.current.updateDraft({ equalLabels: ['instance', 'service'] }));
    api.loadAlertInhibit.mockResolvedValueOnce({
      ...persistedAlertInhibit,
      sourceLabels: { service: 'api', severity: 'critical' },
      targetLabels: { service: 'api', severity: 'warning' },
      equalLabels: ['service', 'instance']
    });
    await act(async () => result.current.submit());
    expect(result.current.state.draft).toBeNull();

    await act(async () => result.current.edit(7));
    api.loadAlertInhibit.mockResolvedValueOnce({
      ...persistedAlertInhibit,
      targetLabels: { severity: 'info', service: 'api' }
    });
    await act(async () => result.current.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).toHaveBeenCalledTimes(1);
  });

  it('proves toggle convergence and exact id before success', async () => {
    const { result } = renderCommandController();
    api.loadAlertInhibit.mockResolvedValueOnce(persistedAlertInhibit).mockResolvedValueOnce({
      ...persistedAlertInhibit,
      sourceLabels: { service: 'api', severity: 'critical' },
      enable: false
    });
    await act(async () => result.current.toggle(persistedAlertInhibit, false));
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
    vi.clearAllMocks();
    api.updateAlertInhibitEnabled.mockResolvedValue(undefined);
    api.loadAlertInhibit.mockResolvedValue({ ...persistedAlertInhibit, id: 8, enable: false });
    await act(async () => result.current.toggle(persistedAlertInhibit, false));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('deletes only after missing detail and list absence', async () => {
    const { result } = renderCommandController();
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    await act(async () => result.current.remove(7));
    expect(notify.success).toHaveBeenCalled();
    vi.clearAllMocks();
    api.deleteAlertInhibit.mockResolvedValue(undefined);
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    reread.mockResolvedValue(alertInhibitPage({ search: '', pageIndex: 0, pageSize: 8 }, [persistedAlertInhibit]));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
  });
});

function renderCommandController() {
  return renderHook(() => {
    const command = useAlertInhibitCommandController(reread);
    return { state: command.state, ...command.actions };
  });
}
