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

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { normalizeAlertInhibitApiFailure } from '../api/alert-inhibit-api-failure';
import {
  AlertInhibitContractError,
  AlertInhibitMissingError,
  AlertInhibitRequestFailure,
  type AlertInhibit
} from '../model/alert-inhibit-model';
import {
  alertInhibitPage,
  deferred,
  persistedAlertInhibit,
  validAlertInhibitDraft
} from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitCommandController } from './use-alert-inhibit-command-controller';

const api = vi.hoisted(() => ({
  deleteAlertInhibit: vi.fn(),
  deleteAlertInhibits: vi.fn(),
  loadAllAlertInhibits: vi.fn(),
  loadAlertInhibit: vi.fn(),
  loadAlertInhibitPrefillAlerts: vi.fn(),
  saveAlertInhibit: vi.fn(),
  updateAlertInhibitEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
const reread = vi.hoisted(() => vi.fn());

vi.mock('../api/alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-inhibit-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { entity?: string }) =>
      key === 'alertInhibits.entityPrefill.name' ? `${values?.entity} inhibit` : key
  })
}));

describe('Alert Inhibit command controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibit.mockResolvedValue(persistedAlertInhibit);
    api.loadAllAlertInhibits.mockResolvedValue([]);
    api.loadAlertInhibitPrefillAlerts.mockResolvedValue([
      { labels: { service: 'checkout', environment: 'prod', severity: 'critical' } },
      { labels: { service: 'checkout', environment: 'prod', severity: 'warning' } }
    ]);
    api.saveAlertInhibit.mockResolvedValue(undefined);
    api.updateAlertInhibitEnabled.mockResolvedValue(undefined);
    api.deleteAlertInhibit.mockResolvedValue(undefined);
    api.deleteAlertInhibits.mockResolvedValue(undefined);
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

    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1));
    expect(api.updateAlertInhibitEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertInhibit).not.toHaveBeenCalled();
    act(() => write.resolve(undefined));
    await act(async () => Promise.all([first, duplicate]));
    expect(result.current.state.command).toBe('recovering');
    expect(result.current.state.recovery).toEqual({
      kind: 'save',
      phase: 'commit-uncertain',
      retryable: true
    });
  });

  it('opens an entity-owned create draft only after alert-label prefill settles', async () => {
    const { result } = renderCommandController({
      entityId: 7,
      entityName: 'Checkout API',
      returnTo: '/entities/7',
      returnLabel: '',
      mode: 'matched',
      matchingRuleIds: []
    });

    act(() => result.current.create());
    await waitFor(() => expect(result.current.state.prefill).toBe('received'));

    expect(api.loadAlertInhibitPrefillAlerts).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(result.current.state.draft).toMatchObject({
      name: 'Checkout API inhibit',
      sourceLabelsText: 'environment:prod, service:checkout',
      targetLabelsText: 'environment:prod, service:checkout',
      equalLabels: ['service']
    });
  });

  it('opens an honest manual draft when entity alerts have no safe common labels', async () => {
    api.loadAlertInhibitPrefillAlerts.mockResolvedValueOnce([]);
    const { result } = renderCommandController(entityManagementContext());

    act(() => result.current.create());
    await waitFor(() => expect(result.current.state.prefill).toBe('manual'));

    expect(result.current.state.draft).toMatchObject({
      name: 'Checkout API inhibit',
      sourceLabelsText: '',
      targetLabelsText: '',
      equalLabels: []
    });
  });

  it('keeps unavailable prefill distinct and does not infer label conditions', async () => {
    api.loadAlertInhibitPrefillAlerts.mockRejectedValueOnce(new AlertInhibitRequestFailure('unavailable', 'uncertain'));
    const { result } = renderCommandController(entityManagementContext());

    act(() => result.current.create());
    await waitFor(() => expect(result.current.state.prefill).toBe('unavailable'));

    expect(result.current.state.draft).toMatchObject({
      sourceLabelsText: '',
      targetLabelsText: '',
      equalLabels: []
    });
  });

  it('deduplicates same-tick prefill and retires its late result after unmount', async () => {
    const alerts = deferred<Array<{ labels: Record<string, string> }>>();
    api.loadAlertInhibitPrefillAlerts.mockReturnValueOnce(alerts.promise);
    const { result, unmount } = renderCommandController(entityManagementContext());
    act(() => {
      result.current.create();
      result.current.create();
    });

    expect(api.loadAlertInhibitPrefillAlerts).toHaveBeenCalledOnce();
    const signal = api.loadAlertInhibitPrefillAlerts.mock.calls[0]?.[1] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      alerts.resolve([{ labels: { service: 'checkout' } }]);
      await alerts.promise;
    });
  });

  it('does not publish prefill after navigation changes the entity context', async () => {
    const alerts = deferred<Array<{ labels: Record<string, string> }>>();
    api.loadAlertInhibitPrefillAlerts.mockReturnValueOnce(alerts.promise);
    const { result, rerender } = renderHook(({ management }) => useAlertInhibitCommandController(reread, management), {
      initialProps: { management: entityManagementContext() }
    });
    act(() => result.current.actions.create());
    rerender({ management: { ...entityManagementContext(), entityId: 8, entityName: 'Billing API' } });

    await act(async () => {
      alerts.resolve([{ labels: { service: 'checkout' } }]);
      await alerts.promise;
    });

    expect(result.current.state.prefill).toBe('idle');
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.command).toBe('idle');
  });

  it('retires a pending submit when the controller unmounts', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const { result, unmount } = renderCommandController();
    await act(async () => result.current.edit(persistedAlertInhibit.id));
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
    });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalledOnce());
    unmount();
    act(() => write.resolve(undefined));
    await act(async () => submission);

    expect(reread).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('does not report a pending submit failure after the controller unmounts', async () => {
    let rejectWrite!: (reason: unknown) => void;
    api.saveAlertInhibit.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectWrite = reject;
      })
    );
    const { result, unmount } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
    });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalledOnce());
    unmount();
    act(() => rejectWrite(new Error('late failure')));
    await act(async () => submission);

    expect(reread).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('retires a pending toggle when the controller unmounts', async () => {
    const detail = deferred<AlertInhibit>();
    api.loadAlertInhibit.mockReturnValueOnce(detail.promise);
    const { result, unmount } = renderCommandController();

    let operation!: Promise<void>;
    act(() => {
      operation = result.current.toggle(persistedAlertInhibit, false);
    });
    unmount();
    act(() => detail.resolve(persistedAlertInhibit));
    await act(async () => operation);

    expect(api.updateAlertInhibitEnabled).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('retires a pending remove when the controller unmounts', async () => {
    const deletion = deferred<void>();
    api.deleteAlertInhibit.mockReturnValueOnce(deletion.promise);
    const { result, unmount } = renderCommandController();

    let operation!: Promise<void>;
    act(() => {
      operation = result.current.remove(persistedAlertInhibit.id);
    });
    unmount();
    act(() => deletion.resolve(undefined));
    await act(async () => operation);

    expect(api.loadAlertInhibit).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
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
    await act(async () => result.current.edit(persistedAlertInhibit.id));
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
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(1);

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
    api.saveAlertInhibit.mockRejectedValueOnce(new AlertInhibitRequestFailure('missing', 'rejected'));
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());

    expect(result.current.state.editorFailure).toBe('error');
    expect(result.current.state.recovery).toBeUndefined();
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
    expect(result.current.state.editorFailure).toBe('unavailable');
    expect(result.current.state.recovery).toEqual({ kind: 'save', phase: 'proof', retryable: true });
    expect(notify.error).toHaveBeenCalledWith('common.unavailable');
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
    api.loadAlertInhibit
      .mockResolvedValueOnce(persistedAlertInhibit)
      .mockResolvedValueOnce({ ...persistedAlertInhibit, id: 8, enable: false });
    await act(async () => result.current.toggle(persistedAlertInhibit, false));
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('common.unavailable');
    expect(result.current.state.recovery).toEqual({ kind: 'toggle', phase: 'proof', retryable: true });
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

  it('deletes selected policies in one write and proves every id missing', async () => {
    const { result } = renderCommandController();
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());

    await act(async () => result.current.removeMany([8, 7, 8]));

    expect(api.deleteAlertInhibits).toHaveBeenCalledOnce();
    expect(api.deleteAlertInhibits).toHaveBeenCalledWith([7, 8]);
    expect(api.loadAlertInhibit).toHaveBeenCalledWith(7);
    expect(api.loadAlertInhibit).toHaveBeenCalledWith(8);
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
  });

  it.each([
    ['unavailable request', unavailableRequestFailure()],
    ['uncertain request', uncertainRequestFailure()],
    ['unknown failure', new Error('unknown write outcome')],
    ['contract failure', new AlertInhibitContractError('local contract is uncertain')]
  ])('recovers an ambiguous update %s by proof without repeating PUT', async (_label, failure) => {
    const { result } = renderCommandController();
    await act(async () => result.current.edit(persistedAlertInhibit.id));
    api.saveAlertInhibit.mockRejectedValueOnce(failure);

    await act(async () => result.current.submit());

    expect(result.current.state.recovery).toEqual({ kind: 'save', phase: 'proof', retryable: true });
    expect(result.current.state.draft).not.toBeNull();
    await act(async () => result.current.retry());
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.saveSuccess');
  });

  it('resumes list projection after an acknowledged update without repeating write or detail proof', async () => {
    const { result } = renderCommandController();
    await act(async () => result.current.edit(persistedAlertInhibit.id));
    reread.mockRejectedValueOnce(unavailableRequestFailure());

    await act(async () => result.current.submit());

    expect(result.current.state.recovery).toEqual({ kind: 'save', phase: 'projection', retryable: true });
    await act(async () => result.current.retry());
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    expect(reread).toHaveBeenCalledTimes(2);
    expect(result.current.state.draft).toBeNull();
  });

  it('proves an acknowledged create from complete before and after snapshots', async () => {
    const created = { ...persistedAlertInhibit, id: 8 };
    api.loadAllAlertInhibits
      .mockResolvedValueOnce([persistedAlertInhibit])
      .mockResolvedValueOnce([persistedAlertInhibit, created]);
    api.loadAlertInhibit.mockResolvedValueOnce(created);
    reread.mockResolvedValueOnce(alertInhibitPage({ search: '', pageIndex: 0, pageSize: 8 }, [created]));
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());

    expect(api.loadAllAlertInhibits).toHaveBeenCalledTimes(2);
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledWith(8);
    expect(reread).toHaveBeenCalledOnce();
    expect(result.current.state.recovery).toBeUndefined();
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.saveSuccess');
  });

  it('rejects an oversized preflight snapshot without issuing POST', async () => {
    api.loadAllAlertInhibits.mockRejectedValueOnce(
      new AlertInhibitContractError('Alert inhibit proof exceeds the bounded scan limit')
    );
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());

    expect(api.loadAllAlertInhibits).toHaveBeenCalledOnce();
    expect(api.saveAlertInhibit).not.toHaveBeenCalled();
    expect(result.current.state.recovery).toBeUndefined();
    expect(result.current.state.draft).not.toBeNull();
  });

  it('keeps ambiguous create identity retryable and never repeats POST', async () => {
    const created = { ...persistedAlertInhibit, id: 8 };
    const duplicate = { ...persistedAlertInhibit, id: 9 };
    api.loadAllAlertInhibits
      .mockResolvedValueOnce([persistedAlertInhibit])
      .mockResolvedValueOnce([persistedAlertInhibit, created, duplicate])
      .mockResolvedValueOnce([persistedAlertInhibit, created]);
    api.loadAlertInhibit.mockResolvedValueOnce(created);
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());

    expect(result.current.state.recovery).toEqual({
      kind: 'save',
      phase: 'commit-uncertain',
      retryable: true
    });
    expect(result.current.state.draft).not.toBeNull();
    expect(api.loadAlertInhibit).not.toHaveBeenCalled();
    await act(async () => result.current.retry());
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAllAlertInhibits).toHaveBeenCalledTimes(3);
    expect(api.loadAlertInhibit).toHaveBeenCalledWith(8);
    expect(result.current.state.draft).toBeNull();
  });

  it.each([
    ['unavailable', unavailableRequestFailure()],
    ['bounded scan', new AlertInhibitContractError('Alert inhibit proof exceeds the bounded scan limit')]
  ])('retries %s create proof by reads only', async (_label, proofFailure) => {
    const created = { ...persistedAlertInhibit, id: 8 };
    api.loadAllAlertInhibits
      .mockResolvedValueOnce([persistedAlertInhibit])
      .mockRejectedValueOnce(proofFailure)
      .mockResolvedValueOnce([persistedAlertInhibit, created]);
    api.loadAlertInhibit.mockResolvedValueOnce(created);
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));

    await act(async () => result.current.submit());
    expect(result.current.state.recovery).toEqual({
      kind: 'save',
      phase: 'commit-uncertain',
      retryable: true
    });
    await act(async () => result.current.retry());

    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAllAlertInhibits).toHaveBeenCalledTimes(3);
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.saveSuccess');
  });

  it('cancels a create draft without scanning or writing', () => {
    const { result } = renderCommandController();
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    act(() => result.current.closeDraft());

    expect(result.current.state.draft).toBeNull();
    expect(api.loadAllAlertInhibits).not.toHaveBeenCalled();
    expect(api.saveAlertInhibit).not.toHaveBeenCalled();
  });

  it('recovers an ambiguous toggle by exact proof without repeating PUT', async () => {
    api.updateAlertInhibitEnabled.mockRejectedValueOnce(unavailableRequestFailure());
    api.loadAlertInhibit
      .mockResolvedValueOnce(persistedAlertInhibit)
      .mockResolvedValueOnce({ ...persistedAlertInhibit, enable: false });
    const { result } = renderCommandController();

    await act(async () => result.current.toggle(persistedAlertInhibit, false));
    expect(result.current.state.recovery).toEqual({ kind: 'toggle', phase: 'proof', retryable: true });

    await act(async () => result.current.retry());
    expect(api.updateAlertInhibitEnabled).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
  });

  it('keeps a timed-out update receipt proof-only when a second action is attempted', async () => {
    const timedOutWrite = normalizeAlertInhibitApiFailure(new ApiMessageError('timeout', { status: 408 }));
    api.saveAlertInhibit.mockRejectedValueOnce(timedOutWrite);
    const { result } = renderCommandController();
    await act(async () => result.current.edit(persistedAlertInhibit.id));

    await act(async () => result.current.submit());
    expect(result.current.state.recovery).toEqual({ kind: 'save', phase: 'proof', retryable: true });

    await act(async () => result.current.submit());
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retry());
    expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    expect(result.current.state.draft).toBeNull();
  });

  it('recovers an ambiguous delete by absence proof without repeating DELETE', async () => {
    api.deleteAlertInhibit.mockRejectedValueOnce(unavailableRequestFailure());
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    const { result } = renderCommandController();

    await act(async () => result.current.remove(persistedAlertInhibit.id));
    expect(result.current.state.recovery).toEqual({ kind: 'delete', phase: 'proof', retryable: true });
    expect(notify.error).toHaveBeenCalledWith('common.unavailable');

    await act(async () => result.current.retry());
    expect(api.deleteAlertInhibit).toHaveBeenCalledTimes(1);
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(1);
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
  });

  it('uses non-definite copy when acknowledged toggle projection fails', async () => {
    api.loadAlertInhibit
      .mockResolvedValueOnce(persistedAlertInhibit)
      .mockResolvedValueOnce({ ...persistedAlertInhibit, enable: false });
    reread.mockRejectedValueOnce(new AlertInhibitContractError('projection invalid'));
    const { result } = renderCommandController();

    await act(async () => result.current.toggle(persistedAlertInhibit, false));

    expect(result.current.state.recovery).toEqual({ kind: 'toggle', phase: 'projection', retryable: true });
    expect(notify.error).toHaveBeenCalledWith('common.unavailable');
    expect(notify.error).not.toHaveBeenCalledWith('alertInhibits.operationFailed');
  });

  it('uses non-definite copy when acknowledged delete projection fails', async () => {
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    reread.mockRejectedValueOnce(new AlertInhibitContractError('projection invalid'));
    const { result } = renderCommandController();

    await act(async () => result.current.remove(persistedAlertInhibit.id));

    expect(result.current.state.recovery).toEqual({ kind: 'delete', phase: 'projection', retryable: true });
    expect(notify.error).toHaveBeenCalledWith('common.unavailable');
    expect(notify.error).not.toHaveBeenCalledWith('alertInhibits.operationFailed');
  });
});

function unavailableRequestFailure() {
  return new AlertInhibitRequestFailure('unavailable', 'uncertain');
}

function uncertainRequestFailure() {
  return new AlertInhibitRequestFailure('error', 'uncertain');
}

function renderCommandController(management: Parameters<typeof useAlertInhibitCommandController>[1] = null) {
  return renderHook(() => {
    const command = useAlertInhibitCommandController(reread, management);
    return { state: command.state, ...command.actions };
  });
}

function entityManagementContext() {
  return {
    entityId: 7,
    entityName: 'Checkout API',
    returnTo: '/entities/7',
    returnLabel: '',
    mode: 'matched' as const,
    matchingRuleIds: []
  };
}
