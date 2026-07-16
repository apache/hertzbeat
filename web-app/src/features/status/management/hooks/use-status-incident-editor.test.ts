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

import type { StatusIncident } from '../api/status-management-api';

const { loadStatusIncident } = vi.hoisted(() => ({ loadStatusIncident: vi.fn() }));
vi.mock('../api/status-management-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/status-management-api')>(),
  loadStatusIncident
}));

import { useStatusIncidentEditor } from './use-status-incident-editor';

describe('useStatusIncidentEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the latest incident when a slower ignored-abort request completes last', async () => {
    const first = deferred<StatusIncident>();
    const second = deferred<StatusIncident>();
    loadStatusIncident.mockImplementation((id: number) => id === 1 ? first.promise : second.promise);
    const failed = vi.fn();
    const { result } = renderHook(() => useStatusIncidentEditor(failed));

    act(() => result.current.edit(1));
    const firstSignal = loadStatusIncident.mock.calls[0]?.[1] as AbortSignal;
    act(() => result.current.edit(2));
    const secondSignal = loadStatusIncident.mock.calls[1]?.[1] as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);

    await settle(() => second.resolve(incident(2)));
    expect(result.current.incident?.id).toBe(2);
    expect(result.current.loading).toBe(false);

    await settle(() => first.resolve(incident(1)));
    expect(result.current.incident?.id).toBe(2);
    expect(failed).not.toHaveBeenCalled();
  });

  it('suppresses an obsolete failure after a newer request succeeds', async () => {
    const first = deferred<StatusIncident>();
    const second = deferred<StatusIncident>();
    loadStatusIncident.mockImplementation((id: number) => id === 1 ? first.promise : second.promise);
    const failed = vi.fn();
    const { result } = renderHook(() => useStatusIncidentEditor(failed));

    act(() => result.current.edit(1));
    act(() => result.current.edit(2));
    await settle(() => second.resolve(incident(2)));
    await settle(() => first.reject(new Error('obsolete failure')));

    expect(result.current.incident?.id).toBe(2);
    expect(failed).not.toHaveBeenCalled();
  });

  it('does not reopen a pending detail after New or Close invalidates it', async () => {
    const first = deferred<StatusIncident>();
    const second = deferred<StatusIncident>();
    loadStatusIncident.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useStatusIncidentEditor(vi.fn()));

    act(() => result.current.edit(1));
    const firstSignal = loadStatusIncident.mock.calls[0]?.[1] as AbortSignal;
    act(() => result.current.openNew(9));
    expect(firstSignal.aborted).toBe(true);
    expect(result.current.incident).toEqual(expect.objectContaining({ orgId: 9, name: '' }));
    await settle(() => first.resolve(incident(1)));
    expect(result.current.incident?.id).toBeUndefined();

    act(() => result.current.edit(2));
    const secondSignal = loadStatusIncident.mock.calls[1]?.[1] as AbortSignal;
    act(() => result.current.close());
    expect(secondSignal.aborted).toBe(true);
    await settle(() => second.resolve(incident(2)));
    expect(result.current.incident).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('reports only the current request failure', async () => {
    const current = deferred<StatusIncident>();
    loadStatusIncident.mockReturnValue(current.promise);
    const failed = vi.fn();
    const { result } = renderHook(() => useStatusIncidentEditor(failed));

    act(() => result.current.edit(3));
    await settle(() => current.reject(new Error('current failure')));

    expect(failed).toHaveBeenCalledTimes(1);
    expect(result.current.incident).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });
});

function incident(id: number): StatusIncident {
  return { id, orgId: 9, name: `Incident ${id}`, state: 0, components: [], contents: [] };
}

async function settle(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
