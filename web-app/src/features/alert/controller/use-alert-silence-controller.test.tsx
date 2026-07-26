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
import { App } from 'antd';
import { act, cleanup, renderHook, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ApiMessageError } from '@/core/http/api-message';
import {
  AlertSilenceContractError,
  AlertSilenceMissingError,
  AlertSilenceRequestFailure,
  buildAlertSilencePayload,
  type AlertSilence
} from '../model/alert-silence-model';
import { alertSilenceDetailDraft } from '../model/alert-silence-page-model';
import { normalizeAlertSilenceApiFailure } from '../api/alert-silence-api-failure';

const api = vi.hoisted(() => ({
  deleteAlertSilence: vi.fn(),
  deleteAlertSilences: vi.fn(),
  loadAlertSilence: vi.fn(),
  loadAlertSilences: vi.fn(),
  loadMatchedAlertSilences: vi.fn(),
  saveAlertSilence: vi.fn(),
  updateAlertSilenceEnabled: vi.fn()
}));
vi.mock('../api/alert-silence-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-silence-api')>()),
  ...api
}));

import { useAlertSilenceController } from './use-alert-silence-controller';

const record = {
  id: 7,
  name: 'Maintenance',
  enable: true,
  matchAll: true,
  type: 0 as const,
  times: null,
  labels: null,
  days: null,
  periodStart: null,
  periodEnd: null
};
const editable = {
  ...record,
  labels: {},
  days: [],
  periodStart: '2026-07-16T10:00:00Z',
  periodEnd: '2026-07-16T12:00:00Z'
};
const page = (content: AlertSilence[] = [record], number = 0, total = content.length) => ({
  content,
  totalElements: total,
  totalPages: total === 0 ? 0 : Math.ceil(total / 8),
  number,
  size: 8
});

describe('useAlertSilenceController', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    api.loadAlertSilences.mockResolvedValue(page());
    api.loadMatchedAlertSilences.mockResolvedValue({ records: [], missingCount: 0 });
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.updateAlertSilenceEnabled.mockResolvedValue(undefined);
    api.deleteAlertSilence.mockResolvedValue(undefined);
    api.deleteAlertSilences.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('converges search draft on Push, Back, and Forward without render-phase updates', async () => {
    const view = renderController(['/alerts/silences?search=one', '/alerts/silences?search=two'], 1);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    expect(view.result.current.controller.state.search).toBe('two');
    act(() => {
      void view.result.current.navigate('/alerts/silences?search=three');
    });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('three'));
    act(() => {
      void view.result.current.navigate(-1);
    });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('two'));
    act(() => {
      void view.result.current.navigate(1);
    });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('three'));
  });

  it('cancels an obsolete list read and never exposes it under the newer query', async () => {
    const stale = deferred<ReturnType<typeof page>>();
    let staleSignal: AbortSignal | undefined;
    const current = { ...record, id: 8, name: 'Current projection' };
    api.loadAlertSilences.mockImplementation((query, signal) => {
      if (query.search === 'old') {
        staleSignal = signal;
        return stale.promise;
      }
      return Promise.resolve(page([current]));
    });
    const view = renderController(['/alerts/silences?search=old'], 0);
    await waitFor(() => expect(staleSignal).toBeInstanceOf(AbortSignal));

    act(() => {
      void view.result.current.navigate('/alerts/silences?search=new');
    });

    await waitFor(() => expect(staleSignal?.aborted).toBe(true));
    await waitFor(() => expect(view.result.current.controller.state.list).toMatchObject({ kind: 'ready' }));
    expect(view.result.current.controller.state.list).toMatchObject({ records: [current] });

    await act(async () => {
      stale.resolve(page([{ ...record, name: 'Obsolete projection' }]));
      await stale.promise;
    });
    expect(view.result.current.controller.state.list).toMatchObject({ records: [current] });
  });

  it('normalizes an out-of-range nonzero page and proves the follow-up read', async () => {
    api.loadAlertSilences.mockImplementation(query =>
      Promise.resolve(
        query.pageIndex === 2
          ? { content: [], totalElements: 9, totalPages: 2, number: 2, size: 8 }
          : { content: [record], totalElements: 9, totalPages: 2, number: 1, size: 8 }
      )
    );
    const view = renderController(['/alerts/silences?pageIndex=2&pageSize=8'], 0);
    await waitFor(() => expect(view.result.current.location.search).toContain('pageIndex=1'));
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    expect(api.loadAlertSilences).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 1 }),
      expect.any(AbortSignal)
    );
  });

  it('does not let stale edit completion replace a newer create draft', async () => {
    let resolveDetail!: (value: typeof record) => void;
    api.loadAlertSilence.mockReturnValue(
      new Promise(resolve => {
        resolveDetail = resolve;
      })
    );
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => {
      void view.result.current.controller.actions.edit(7);
    });
    act(() => view.result.current.controller.actions.create());
    act(() => resolveDetail(record));
    await waitFor(() =>
      expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: '' })
    );
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).not.toHaveProperty('id');
  });

  it('removes a ready draft as soon as a different detail starts loading', async () => {
    const next = deferred<typeof editable>();
    api.loadAlertSilence.mockResolvedValueOnce(editable).mockReturnValueOnce(next.promise);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    expect(view.result.current.controller.state.detail).toMatchObject({
      kind: 'ready',
      source: 'detail',
      id: 7,
      draft: { id: 7 }
    });

    let pending!: Promise<void>;
    act(() => {
      pending = view.result.current.controller.actions.edit(8);
    });
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'loading', id: 8 });
    expect(view.result.current.controller.state.detail).not.toHaveProperty('draft');

    await act(async () => {
      next.reject(new AlertSilenceMissingError());
      await pending;
    });
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'missing', id: 8 });
    expect(view.result.current.controller.state.detail).not.toHaveProperty('draft');
  });

  it.each([
    [new AlertSilenceRequestFailure('unavailable', 'uncertain'), 'unavailable'],
    [new AlertSilenceContractError('bad detail'), 'error']
  ] as const)('clears previous detail evidence when the next read becomes %s', async (reason, kind) => {
    api.loadAlertSilence.mockResolvedValueOnce(editable).mockRejectedValueOnce(reason);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    await act(() => view.result.current.controller.actions.edit(8));

    expect(view.result.current.controller.state.detail).toEqual({ kind, id: 8 });
    expect(view.result.current.controller.state.detail).not.toHaveProperty('draft');
  });

  it('aborts stale detail for cancel and a newer edit', async () => {
    const requests: Array<{ id: number; signal: AbortSignal }> = [];
    api.loadAlertSilence.mockImplementation((id, signal) => {
      requests.push({ id, signal });
      return new Promise(() => undefined);
    });
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => {
      void view.result.current.controller.actions.edit(7);
    });
    act(() => view.result.current.controller.actions.cancel());
    expect(requests[0]?.signal.aborted).toBe(true);
    act(() => {
      void view.result.current.controller.actions.edit(7);
    });
    act(() => {
      void view.result.current.controller.actions.edit(8);
    });
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(requests[2]).toMatchObject({ id: 8 });
  });

  it.each([
    [new AlertSilenceRequestFailure('unavailable', 'uncertain'), 'unavailable'],
    [new AlertSilenceContractError('bad'), 'error']
  ] as const)('classifies list failures without fake empty as %s', async (reason, kind) => {
    api.loadAlertSilences.mockRejectedValue(reason);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe(kind));
  });

  it('uses empty only for a canonical zero page', async () => {
    api.loadAlertSilences.mockResolvedValue(page([], 0, 0));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('empty'));
  });

  it('loads only exact entity-matched silences and keeps the context while switching views', async () => {
    api.loadMatchedAlertSilences.mockResolvedValue({
      records: [{ ...record, id: 31, name: 'Checkout maintenance' }],
      missingCount: 1
    });
    const view = renderController(
      [
        '/alerts/silences?entityId=7&entityName=Checkout&matchMode=entity-noise-controls&matchingRuleType=silence&matchingRuleIds=31%2C32&pageIndex=0&pageSize=8'
      ],
      0
    );

    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    expect(view.result.current.controller.state.management).toMatchObject({
      context: { mode: 'matched', matchingRuleIds: [31, 32] },
      missingCount: 1
    });
    expect(api.loadAlertSilences).not.toHaveBeenCalled();
    act(() => view.result.current.controller.actions.viewAllRules());
    await waitFor(() => expect(view.result.current.controller.state.management.context?.mode).toBe('all'));
    expect(view.result.current.location.search).toContain('matchingRuleIds=31%2C32');
  });

  it('does not leave a committed create draft retryable when its projection read fails', async () => {
    api.loadAlertSilences.mockResolvedValueOnce(page()).mockRejectedValueOnce(new Error('reread failed'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    await act(() => view.result.current.controller.actions.save());
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.controller.state.list.kind).toBe('error');
    expect(await screen.findByText(i18n.t('alertSilences.saveSuccess'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('alertSilences.saveFailed'))).not.toBeInTheDocument();

    await act(() => view.result.current.controller.actions.save());
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
  });

  it('classifies an unavailable post-commit projection without making create retryable', async () => {
    api.loadAlertSilences
      .mockResolvedValueOnce(page())
      .mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));

    await act(() => view.result.current.controller.actions.save());
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.controller.state.list.kind).toBe('unavailable');
    expect(await screen.findByText(i18n.t('alertSilences.saveSuccess'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('alertSilences.saveFailed'))).not.toBeInTheDocument();

    await act(() => view.result.current.controller.actions.refresh());
    expect(view.result.current.controller.state.list.kind).toBe('ready');
    expect(view.result.current.controller.state.busy).toBe(false);
  });

  it('closes a committed create before projection validation and displayed reread finish', async () => {
    const proof = deferred<ReturnType<typeof page>>();
    api.loadAlertSilences.mockResolvedValueOnce(page()).mockReturnValueOnce(proof.promise);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    const draft = alertSilenceDetailDraft(view.result.current.controller.state.detail);
    if (!draft) throw new Error('Create draft was not opened');
    const created = { id: 8, times: null, ...buildAlertSilencePayload(draft) };
    api.loadAlertSilences.mockResolvedValueOnce(page([created]));
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.controller.actions.save();
    });
    await waitFor(() => expect(api.loadAlertSilences).toHaveBeenCalledTimes(2));
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.controller.state.busy).toBe(true);
    await act(async () => {
      proof.resolve(page([created]));
      await save;
    });
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(3);
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.controller.state.busy).toBe(false);
  });

  it('uses a synchronous mutex for same-tick save attempts', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(
      new Promise<void>(resolve => {
        resolveSave = resolve;
      })
    );
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.controller.actions.save();
      second = view.result.current.controller.actions.save();
    });
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSave();
      await Promise.all([first, second]);
    });
  });

  it('uses the same synchronous owner for same-tick toggle attempts', async () => {
    const write = deferred<void>();
    api.updateAlertSilenceEnabled.mockReturnValue(write.promise);
    api.loadAlertSilence.mockResolvedValue({ ...record, enable: false });
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.controller.actions.toggle(record, false);
      second = view.result.current.controller.actions.toggle(record, false);
    });

    expect(api.updateAlertSilenceEnabled).toHaveBeenCalledTimes(1);
    await act(async () => {
      write.resolve();
      await Promise.all([first, second]);
    });
  });

  it('uses the same synchronous owner for same-tick delete attempts', async () => {
    const write = deferred<void>();
    api.deleteAlertSilence.mockReturnValue(write.promise);
    api.loadAlertSilence.mockRejectedValue(new AlertSilenceMissingError());
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.controller.actions.remove(7);
      second = view.result.current.controller.actions.remove(7);
    });

    expect(api.deleteAlertSilence).toHaveBeenCalledTimes(1);
    await act(async () => {
      write.resolve();
      await Promise.all([first, second]);
    });
  });

  it('deletes selected policies in one write and proves every id missing', async () => {
    api.loadAlertSilences
      .mockResolvedValueOnce(page([record, { ...record, id: 8 }], 0, 2))
      .mockResolvedValueOnce(page([], 0, 0));
    api.loadAlertSilence.mockRejectedValue(new AlertSilenceMissingError());
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.selectIds([8, 7, 8]));
    expect(view.result.current.controller.state.selectedIds).toEqual([7, 8]);
    await act(() => view.result.current.controller.actions.removeMany([8, 7, 8]));

    expect(api.deleteAlertSilences).toHaveBeenCalledWith([7, 8]);
    expect(api.loadAlertSilence).toHaveBeenCalledWith(7);
    expect(api.loadAlertSilence).toHaveBeenCalledWith(8);
  });

  it('does not publish a stale write failure after controller unmount', async () => {
    const write = deferred<void>();
    api.saveAlertSilence.mockReturnValue(write.promise);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));

    let save!: Promise<void>;
    act(() => {
      save = view.result.current.controller.actions.save();
    });
    view.unmount();
    await act(async () => {
      write.reject(new Error('late write failure'));
      await save;
    });

    expect(screen.queryByText(i18n.t('alertSilences.saveFailed'))).not.toBeInTheDocument();
  });

  it.each([
    ['network', new AlertSilenceRequestFailure('unavailable', 'uncertain')],
    ['5xx', new AlertSilenceRequestFailure('unavailable', 'uncertain')],
    ['HTTP 408', normalizeAlertSilenceApiFailure(new ApiMessageError('timeout', { status: 408 }))],
    [
      'cause-bearing 4xx',
      normalizeAlertSilenceApiFailure(
        new ApiMessageError('offline', { status: 400, cause: new Error('private cause') })
      )
    ],
    ['business envelope', normalizeAlertSilenceApiFailure(new ApiMessageError('failed', { code: 15, status: 200 }))],
    ['unknown', new Error('private provider failure')]
  ] as const)('locks an uncertain create after a %s failure and never repeats its POST', async (_label, reason) => {
    api.saveAlertSilence.mockRejectedValueOnce(reason).mockResolvedValueOnce(undefined);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));

    await act(() => view.result.current.controller.actions.save());
    expect(view.result.current.controller.state.recovery).toEqual({
      kind: 'create',
      phase: 'commit-uncertain',
      retryable: false
    });
    expect(view.result.current.controller.state.busy).toBe(false);
    expect(view.result.current.controller.state.writeLocked).toBe(true);
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    expect(document.body).not.toHaveTextContent('private provider failure');

    await act(() => view.result.current.controller.actions.save());
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
  });

  it('permits a deliberate create resubmit only after an explicit HTTP 4xx rejection', async () => {
    api.saveAlertSilence
      .mockRejectedValueOnce(new AlertSilenceRequestFailure('error', 'rejected'))
      .mockResolvedValueOnce(undefined);
    api.loadAlertSilences.mockImplementation(query =>
      Promise.resolve(query.search === 'Created' ? page([{ ...record, id: 8, name: 'Created' }]) : page())
    );
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));

    await act(() => view.result.current.controller.actions.save());
    expect(view.result.current.controller.state.recovery).toBeNull();
    expect(view.result.current.controller.state.busy).toBe(false);
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });

    await act(() => view.result.current.controller.actions.save());
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
  });

  it('recovers an uncertain update through exact detail proof without repeating PUT', async () => {
    api.loadAlertSilence.mockResolvedValueOnce(editable);
    api.saveAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Updated' }));

    await act(() => view.result.current.controller.actions.save());
    expect(view.result.current.controller.state.recovery).toEqual({ kind: 'update', phase: 'proof', retryable: true });
    expect(view.result.current.controller.state.busy).toBe(false);
    expect(view.result.current.controller.state.writeLocked).toBe(true);
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);

    api.loadAlertSilence.mockResolvedValueOnce({ ...editable, name: 'Updated' });
    await act(() => view.result.current.controller.actions.refresh());
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.recovery).toBeNull();
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
  });

  it('does not enter a different editor while an update proof receipt is retained', async () => {
    api.loadAlertSilence.mockResolvedValueOnce(editable);
    api.saveAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Updated' }));
    await act(() => view.result.current.controller.actions.save());
    expect(view.result.current.controller.state.recovery).toMatchObject({ kind: 'update', phase: 'proof' });

    act(() => view.result.current.controller.actions.cancel());
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    const inspected = { ...editable, id: 8, name: 'Another silence' };
    api.loadAlertSilence.mockImplementation(id =>
      Promise.resolve(id === 8 ? inspected : { ...editable, name: 'Updated' })
    );
    act(() => view.result.current.controller.actions.create());
    await act(() => view.result.current.controller.actions.edit(8));
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(api.loadAlertSilence).toHaveBeenCalledTimes(1);

    await act(() => view.result.current.controller.actions.refresh());

    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.recovery).toBeNull();
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });

    await act(() => view.result.current.controller.actions.edit(8));
    expect(view.result.current.controller.state.detail).toMatchObject({
      kind: 'ready',
      id: 8,
      draft: { id: 8, name: 'Another silence' }
    });
  });

  it('recovers an uncertain toggle through exact detail proof without repeating PUT', async () => {
    api.updateAlertSilenceEnabled.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    await act(() => view.result.current.controller.actions.toggle(record, false));
    expect(view.result.current.controller.state.recovery).toEqual({ kind: 'toggle', phase: 'proof', retryable: true });
    api.loadAlertSilence.mockImplementation(id =>
      Promise.resolve(id === 8 ? { ...editable, id: 8, name: 'Another silence' } : { ...record, enable: false })
    );
    act(() => view.result.current.controller.actions.create());
    await act(() => view.result.current.controller.actions.edit(8));
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(api.loadAlertSilence).not.toHaveBeenCalled();

    await act(() => view.result.current.controller.actions.refresh());
    expect(api.updateAlertSilenceEnabled).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.recovery).toBeNull();
  });

  it('recovers an uncertain delete through exact missing proof without repeating DELETE', async () => {
    api.deleteAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    api.loadAlertSilences.mockResolvedValueOnce(page()).mockResolvedValueOnce(page([], 0, 0));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    await act(() => view.result.current.controller.actions.remove(7));
    expect(view.result.current.controller.state.recovery).toEqual({ kind: 'delete', phase: 'proof', retryable: true });
    api.loadAlertSilence.mockRejectedValueOnce(new AlertSilenceMissingError());

    await act(() => view.result.current.controller.actions.refresh());
    expect(api.deleteAlertSilence).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.recovery).toBeNull();
  });

  it('does not replace an in-flight save draft with a new draft', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(
      new Promise<void>(resolve => {
        resolveSave = resolve;
      })
    );
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.controller.actions.save();
    });
    await waitFor(() => expect(view.result.current.controller.state.busy).toBe(true));
    act(() => view.result.current.controller.actions.create());
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    await act(async () => {
      resolveSave();
      await save;
    });
  });

  it('does not update or replace controlled draft values while save is in flight', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(
      new Promise<void>(resolve => {
        resolveSave = resolve;
      })
    );
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let save!: Promise<void>;
    act(() => {
      save = view.result.current.controller.actions.save();
    });
    await waitFor(() => expect(view.result.current.controller.state.busy).toBe(true));
    act(() => {
      view.result.current.controller.actions.updateDraft({ name: 'Late update' });
      view.result.current.controller.actions.replaceDraft({
        ...alertSilenceDetailDraft(view.result.current.controller.state.detail)!,
        name: 'Late replacement'
      });
    });
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    await act(async () => {
      resolveSave();
      await save;
    });
  });

  it('requires explicit projection recovery after failed toggle proof before another write', async () => {
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    api.loadAlertSilence.mockResolvedValue(record);
    await act(() => view.result.current.controller.actions.toggle(record, false));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.list.kind).toBe('error');

    api.loadAlertSilence.mockResolvedValue({ ...record, enable: false });
    await act(() => view.result.current.controller.actions.refresh());
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.list.kind).toBe('ready');
    expect(view.result.current.controller.state.recovery).toBeNull();

    api.loadAlertSilence.mockRejectedValue(new AlertSilenceMissingError());
    await act(() => view.result.current.controller.actions.remove(7));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(3);
  });

  it('rereads the list after a canonical toggle converges', async () => {
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    api.loadAlertSilence.mockResolvedValue({ ...record, enable: false });
    await act(() => view.result.current.controller.actions.toggle(record, false));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
  });

  it('rereads the latest route query when a pending operation outlives its original context', async () => {
    const write = deferred<void>();
    let oldReads = 0;
    api.loadAlertSilences.mockImplementation(query => {
      if (query.search === 'old' && oldReads++ > 0) return Promise.reject(new Error('stale query failed'));
      return Promise.resolve(page());
    });
    api.updateAlertSilenceEnabled.mockReturnValue(write.promise);
    api.loadAlertSilence.mockResolvedValue({ ...record, enable: false });
    const view = renderController(['/alerts/silences?search=old'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.controller.actions.toggle(record, false);
    });
    act(() => {
      void view.result.current.navigate('/alerts/silences?search=new');
    });
    await waitFor(() => expect(view.result.current.controller.state.query.search).toBe('new'));
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));

    await act(async () => {
      write.resolve();
      await operation;
    });

    expect(api.loadAlertSilences).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'new' }),
      expect.any(AbortSignal)
    );
    expect(view.result.current.controller.state.list.kind).toBe('ready');
    expect(view.result.current.controller.state.busy).toBe(false);
  });

  it('closes an edit only after save, canonical detail convergence, and list reread', async () => {
    api.loadAlertSilence.mockResolvedValue(editable);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Updated' }));
    api.loadAlertSilence.mockResolvedValue({ ...editable, name: 'Updated' });
    await act(() => view.result.current.controller.actions.save());
    expect(api.saveAlertSilence).toHaveBeenCalled();
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
  });

  it('does not turn a committed edit into a retryable save when canonical proof fails', async () => {
    api.loadAlertSilence.mockResolvedValue(editable);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Updated' }));
    api.loadAlertSilence.mockResolvedValue(editable);
    await act(() => view.result.current.controller.actions.save());
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(1);
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.controller.state.list.kind).toBe('error');
    expect(await screen.findByText(i18n.t('alertSilences.saveSuccess'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('alertSilences.saveFailed'))).not.toBeInTheDocument();
  });
});

function renderController(entries: string[], initialIndex: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(
    () => ({ controller: useAlertSilenceController(), navigate: useNavigate(), location: useLocation() }),
    {
      wrapper: ({ children }: PropsWithChildren) => (
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
              <App>{children}</App>
            </MemoryRouter>
          </QueryClientProvider>
        </I18nextProvider>
      )
    }
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
