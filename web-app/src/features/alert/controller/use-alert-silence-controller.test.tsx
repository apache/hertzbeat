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
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ApiMessageError } from '@/core/http/api-message';
import { AlertSilenceContractError, AlertSilenceMissingError } from '../alert-silence-model';
import { alertSilenceDetailDraft } from '../alert-silence-page-model';

const api = vi.hoisted(() => ({
  deleteAlertSilence: vi.fn(), loadAlertSilence: vi.fn(), loadAlertSilences: vi.fn(),
  saveAlertSilence: vi.fn(), updateAlertSilenceEnabled: vi.fn()
}));
vi.mock('../alert-silence-api', async importOriginal => ({
  ...await importOriginal<typeof import('../alert-silence-api')>(), ...api
}));

import { useAlertSilenceController } from './use-alert-silence-controller';

const record = { id: 7, name: 'Maintenance', enable: true, matchAll: true, type: 0 as const,
  times: null, labels: null, days: null, periodStart: null, periodEnd: null };
const editable = { ...record, labels: {}, days: [], periodStart: '2026-07-16T10:00:00Z',
  periodEnd: '2026-07-16T12:00:00Z' };
const page = (content = [record], number = 0, total = content.length) => ({
  content, totalElements: total, totalPages: total === 0 ? 0 : Math.ceil(total / 8), number, size: 8
});

describe('useAlertSilenceController', () => {
  beforeAll(async () => { await initializeI18n(); await loadLocale('en-US'); });
  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    api.loadAlertSilences.mockResolvedValue(page());
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.updateAlertSilenceEnabled.mockResolvedValue(undefined);
    api.deleteAlertSilence.mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('converges search draft on Push, Back, and Forward without render-phase updates', async () => {
    const view = renderController(['/alerts/silences?search=one', '/alerts/silences?search=two'], 1);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    expect(view.result.current.controller.state.search).toBe('two');
    act(() => { void view.result.current.navigate('/alerts/silences?search=three'); });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('three'));
    act(() => { void view.result.current.navigate(-1); });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('two'));
    act(() => { void view.result.current.navigate(1); });
    await waitFor(() => expect(view.result.current.controller.state.search).toBe('three'));
  });

  it('normalizes an out-of-range nonzero page and proves the follow-up read', async () => {
    api.loadAlertSilences.mockImplementation(query => Promise.resolve(query.pageIndex === 2
      ? { content: [], totalElements: 9, totalPages: 2, number: 2, size: 8 }
      : { content: [record], totalElements: 9, totalPages: 2, number: 1, size: 8 }));
    const view = renderController(['/alerts/silences?pageIndex=2&pageSize=8'], 0);
    await waitFor(() => expect(view.result.current.location.search).toContain('pageIndex=1'));
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    expect(api.loadAlertSilences).toHaveBeenCalledWith(expect.objectContaining({ pageIndex: 1 }), expect.any(AbortSignal));
  });

  it('does not let stale edit completion replace a newer create draft', async () => {
    let resolveDetail!: (value: typeof record) => void;
    api.loadAlertSilence.mockReturnValue(new Promise(resolve => { resolveDetail = resolve; }));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => { void view.result.current.controller.actions.edit(7); });
    act(() => view.result.current.controller.actions.create());
    act(() => resolveDetail(record));
    await waitFor(() => expect(alertSilenceDetailDraft(view.result.current.controller.state.detail))
      .toMatchObject({ name: '' }));
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).not.toHaveProperty('id');
  });

  it('removes a ready draft as soon as a different detail starts loading', async () => {
    const next = deferred<typeof editable>();
    api.loadAlertSilence.mockResolvedValueOnce(editable).mockReturnValueOnce(next.promise);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    expect(view.result.current.controller.state.detail).toMatchObject({
      kind: 'ready', source: 'detail', id: 7, draft: { id: 7 }
    });

    let pending!: Promise<void>;
    act(() => { pending = view.result.current.controller.actions.edit(8); });
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'loading', id: 8 });
    expect(view.result.current.controller.state.detail).not.toHaveProperty('draft');

    await act(async () => { next.reject(new AlertSilenceMissingError()); await pending; });
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'missing', id: 8 });
    expect(view.result.current.controller.state.detail).not.toHaveProperty('draft');
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
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
    act(() => { void view.result.current.controller.actions.edit(7); });
    act(() => view.result.current.controller.actions.cancel());
    expect(requests[0]?.signal.aborted).toBe(true);
    act(() => { void view.result.current.controller.actions.edit(7); });
    act(() => { void view.result.current.controller.actions.edit(8); });
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(requests[2]).toMatchObject({ id: 8 });
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
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

  it('keeps a create draft open when its awaited list reread fails', async () => {
    api.loadAlertSilences.mockResolvedValueOnce(page()).mockRejectedValueOnce(new Error('reread failed'));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    await act(() => view.result.current.controller.actions.save());
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
  });

  it('keeps a create draft open until the awaited list reread succeeds', async () => {
    let resolveReread!: (value: ReturnType<typeof page>) => void;
    api.loadAlertSilences
      .mockResolvedValueOnce(page())
      .mockReturnValueOnce(new Promise(resolve => { resolveReread = resolve; }));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let save!: Promise<void>;
    act(() => { save = view.result.current.controller.actions.save(); });
    await waitFor(() => expect(api.loadAlertSilences).toHaveBeenCalledTimes(2));
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    await act(async () => { resolveReread(page()); await save; });
    expect(view.result.current.controller.state.detail).toEqual({ kind: 'idle' });
  });

  it('uses a synchronous mutex for same-tick save attempts', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(new Promise<void>(resolve => { resolveSave = resolve; }));
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
    await act(async () => { resolveSave(); await Promise.all([first, second]); });
  });

  it('does not replace an in-flight save draft with a new draft', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(new Promise<void>(resolve => { resolveSave = resolve; }));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let save!: Promise<void>;
    act(() => { save = view.result.current.controller.actions.save(); });
    await waitFor(() => expect(view.result.current.controller.state.busy).toBe(true));
    act(() => view.result.current.controller.actions.create());
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    await act(async () => { resolveSave(); await save; });
  });

  it('does not update or replace controlled draft values while save is in flight', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(new Promise<void>(resolve => { resolveSave = resolve; }));
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.create());
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Created' }));
    let save!: Promise<void>;
    act(() => { save = view.result.current.controller.actions.save(); });
    await waitFor(() => expect(view.result.current.controller.state.busy).toBe(true));
    act(() => {
      view.result.current.controller.actions.updateDraft({ name: 'Late update' });
      view.result.current.controller.actions.replaceDraft({
        ...alertSilenceDetailDraft(view.result.current.controller.state.detail)!, name: 'Late replacement'
      });
    });
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail)).toMatchObject({ name: 'Created' });
    await act(async () => { resolveSave(); await save; });
  });

  it('requires toggle convergence and delete missing proof before list reread', async () => {
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    api.loadAlertSilence.mockResolvedValue(record);
    await act(() => view.result.current.controller.actions.toggle(record, false));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(1);

    api.loadAlertSilence.mockRejectedValue(new AlertSilenceMissingError());
    await act(() => view.result.current.controller.actions.remove(7));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
  });

  it('rereads the list after a canonical toggle converges', async () => {
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    api.loadAlertSilence.mockResolvedValue({ ...record, enable: false });
    await act(() => view.result.current.controller.actions.toggle(record, false));
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(2);
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

  it('keeps the editor open when canonical edit fields do not converge', async () => {
    api.loadAlertSilence.mockResolvedValue(editable);
    const view = renderController(['/alerts/silences'], 0);
    await waitFor(() => expect(view.result.current.controller.state.list.kind).toBe('ready'));
    await act(() => view.result.current.controller.actions.edit(7));
    act(() => view.result.current.controller.actions.updateDraft({ name: 'Updated' }));
    api.loadAlertSilence.mockResolvedValue(editable);
    await act(() => view.result.current.controller.actions.save());
    expect(api.loadAlertSilences).toHaveBeenCalledTimes(1);
    expect(alertSilenceDetailDraft(view.result.current.controller.state.detail))
      .toMatchObject({ id: 7, name: 'Updated' });
  });
});

function renderController(entries: string[], initialIndex: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => ({ controller: useAlertSilenceController(), navigate: useNavigate(), location: useLocation() }), {
    wrapper: ({ children }: PropsWithChildren) => <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}><MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
        <App>{children}</App>
      </MemoryRouter></QueryClientProvider>
    </I18nextProvider>
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
