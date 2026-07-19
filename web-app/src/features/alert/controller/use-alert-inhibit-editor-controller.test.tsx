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

import { AlertInhibitContractError, AlertInhibitMissingError, type AlertInhibit } from '../alert-inhibit-model';
import { deferred, persistedAlertInhibit } from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitEditorController, useAlertInhibitOperationGate } from './use-alert-inhibit-editor-controller';

const api = vi.hoisted(() => ({ loadAlertInhibit: vi.fn() }));

vi.mock('../alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-inhibit-api')>()),
  ...api
}));
describe('Alert Inhibit editor controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibit.mockResolvedValue(persistedAlertInhibit);
  });

  it.each([
    [new AlertInhibitMissingError(), 'missing'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertInhibitContractError('bad'), 'error']
  ])('keeps detail failures retryable as %s', async (reason, kind) => {
    api.loadAlertInhibit.mockRejectedValueOnce(reason).mockResolvedValueOnce(persistedAlertInhibit);
    const { result } = renderEditorController();
    await act(async () => result.current.actions.edit(7));
    expect(result.current.state.detail).toEqual({ kind, id: 7 });
    await act(async () => result.current.actions.retryDetail());
    expect(result.current.state.draft).toMatchObject({ id: 7 });
  });

  it('deduplicates detail, publishes only the latest id, and invalidates pending detail on create and close', async () => {
    const first = deferred<AlertInhibit>();
    const latest = deferred<AlertInhibit>();
    const createInvalidated = deferred<AlertInhibit>();
    const closeInvalidated = deferred<AlertInhibit>();
    api.loadAlertInhibit.mockReset();
    api.loadAlertInhibit.mockImplementation((id: number) => {
      if (id === 7) return first.promise;
      if (id === 8) return latest.promise;
      if (id === 9) return createInvalidated.promise;
      return closeInvalidated.promise;
    });
    const { result } = renderEditorController();

    let firstEdit!: Promise<void>;
    let duplicateEdit!: Promise<void>;
    let latestEdit!: Promise<void>;
    act(() => {
      firstEdit = result.current.actions.edit(7);
      duplicateEdit = result.current.actions.edit(7);
      latestEdit = result.current.actions.edit(8);
    });
    expect(api.loadAlertInhibit).toHaveBeenCalledTimes(2);
    act(() => latest.resolve({ ...persistedAlertInhibit, id: 8, name: 'Latest' }));
    await act(async () => latestEdit);
    expect(result.current.state.draft).toMatchObject({ id: 8, name: 'Latest' });
    act(() => first.resolve(persistedAlertInhibit));
    await act(async () => Promise.all([firstEdit, duplicateEdit]));
    expect(result.current.state.draft).toMatchObject({ id: 8, name: 'Latest' });

    let invalidatedByCreate!: Promise<void>;
    act(() => {
      invalidatedByCreate = result.current.actions.edit(9);
    });
    act(() => result.current.actions.create());
    act(() => createInvalidated.resolve({ ...persistedAlertInhibit, id: 9, name: 'Old detail' }));
    await act(async () => invalidatedByCreate);
    expect(result.current.state.draft).toMatchObject({ name: '' });

    let invalidatedByClose!: Promise<void>;
    act(() => {
      invalidatedByClose = result.current.actions.edit(10);
    });
    act(() => result.current.actions.closeDraft());
    act(() => closeInvalidated.resolve({ ...persistedAlertInhibit, id: 10, name: 'Closed detail' }));
    await act(async () => invalidatedByClose);
    expect(result.current.state.draft).toBeNull();
  });

  it('retires the previous draft while a different detail is loading', async () => {
    const next = deferred<AlertInhibit>();
    api.loadAlertInhibit.mockResolvedValueOnce(persistedAlertInhibit).mockReturnValueOnce(next.promise);
    const { result } = renderEditorController();
    await act(async () => result.current.actions.edit(7));
    expect(result.current.state.draft).toMatchObject({ id: 7 });

    let nextEdit!: Promise<void>;
    act(() => {
      nextEdit = result.current.actions.edit(8);
    });
    expect(result.current.state.detail).toEqual({ kind: 'loading', id: 8 });
    expect(result.current.state.draft).toBeNull();
    act(() => next.resolve({ ...persistedAlertInhibit, id: 8 }));
    await act(async () => nextEdit);
    expect(result.current.state.draft).toMatchObject({ id: 8 });
  });
});

function renderEditorController() {
  return renderHook(() => {
    const gate = useAlertInhibitOperationGate();
    return useAlertInhibitEditorController(gate);
  });
}
