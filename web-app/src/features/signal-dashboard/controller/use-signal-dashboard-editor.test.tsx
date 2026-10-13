/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { blankDashboard } from '../model/signal-dashboard-authoring';
import { addEmptyDashboardPanel } from '../model/signal-dashboard-panels';
import { useSignalDashboardEditor } from './use-signal-dashboard-editor';
const api = vi.hoisted(() => ({ saveSignalDashboard: vi.fn(), deleteSignalDashboard: vi.fn() }));
vi.mock('../api/signal-dashboard-api', () => api);
const document = blankDashboard('stable-draft', 'Draft');
const record = {
  dashboardKey: document.metadata.name,
  title: 'Draft',
  revision: 0,
  version: 'hertzbeat-perses-v1',
  document
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function mount(canWrite = true) {
  const saved = vi.fn();
  const removed = vi.fn();
  const hook = renderHook(
    ({ source, allowed }) => useSignalDashboardEditor({ source, canWrite: allowed, saved, removed }),
    {
      initialProps: { source: 'account-a', allowed: canWrite },
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    }
  );
  return { ...hook, saved, removed };
}
it('keeps a failed draft and retries its stable identity after network recovery in StrictMode', async () => {
  api.saveSignalDashboard.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce(record);
  const { result, saved } = mount();
  act(() => result.current.begin({ mode: 'new', document }));
  await act(() => result.current.save());
  expect(result.current.draft?.document).toEqual(document);
  expect(result.current.error).toBe('writeFailed');
  expect(saved).not.toHaveBeenCalled();
  await act(() => result.current.save());
  expect(api.saveSignalDashboard.mock.calls.map(args => (args[0] as typeof document).metadata.name)).toEqual([
    'stable-draft',
    'stable-draft'
  ]);
  expect(saved).toHaveBeenCalledOnce();
  expect(result.current.draft).toBeUndefined();
});
it('retains a conflicted edit and its original revision without overwriting the catalog', async () => {
  api.saveSignalDashboard.mockRejectedValue(new ApiMessageError('Conflict', { status: 409 }));
  const { result, saved } = mount();
  act(() => result.current.begin({ mode: 'edit', document, original: record }));
  await act(() => result.current.save());
  expect(result.current.error).toBe('conflict');
  expect(result.current.draft?.original?.revision).toBe(0);
  expect(saved).not.toHaveBeenCalled();
  act(() => result.current.cancel());
  expect(result.current.draft).toBeUndefined();
});
it('does not permit guest edits or delete writes', async () => {
  const { result } = mount(false);
  act(() => result.current.begin({ mode: 'new', document }));
  await act(() => result.current.save());
  await act(() => result.current.remove(record));
  expect(result.current.draft).toBeUndefined();
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
  expect(api.deleteSignalDashboard).not.toHaveBeenCalled();
});
it('discards old-account write completion and keeps the new account isolated', async () => {
  let complete!: (value: typeof record) => void;
  api.saveSignalDashboard.mockReturnValue(
    new Promise(resolve => {
      complete = resolve;
    })
  );
  const { result, rerender, saved } = mount();
  act(() => result.current.begin({ mode: 'new', document }));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.save();
  });
  rerender({ source: 'account-b', allowed: true });
  expect(result.current.draft).toBeUndefined();
  await act(async () => {
    complete(record);
    await pending;
  });
  expect(saved).not.toHaveBeenCalled();
});

it('does not let a retired save erase a newer draft after leaving and returning to the same source', async () => {
  let finish!: (value: unknown) => void;
  api.saveSignalDashboard.mockReturnValue(
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const saved = vi.fn();
  const { result, rerender } = renderHook(
    ({ source }) => useSignalDashboardEditor({ source, canWrite: true, saved, removed: vi.fn() }),
    { initialProps: { source: 'dashboard-A' } }
  );
  act(() => result.current.begin({ mode: 'new', document }));
  let save!: Promise<void>;
  act(() => {
    save = result.current.save();
  });
  expect(result.current.busy).toBe(true);
  rerender({ source: 'dashboard-B' });
  rerender({ source: 'dashboard-A' });
  const newer = structuredClone(document);
  newer.spec.display.name = 'New local draft';
  act(() => result.current.begin({ mode: 'new', document: newer }));
  expect(result.current.draft?.document.spec.display.name).toBe('New local draft');
  await act(async () => {
    finish({ dashboardKey: document.metadata.name, document, revision: 0 });
    await save;
  });
  expect({ savedCalls: saved.mock.calls.length, draftTitle: result.current.draft?.document.spec.display.name }).toEqual(
    { savedCalls: 0, draftTitle: 'New local draft' }
  );
});

it('keeps added panels local until Save and cancels only the unsaved draft', async () => {
  const { result, saved } = mount();
  act(() => result.current.begin({ mode: 'edit', document, original: record }));
  const added = addEmptyDashboardPanel(document, 'audit-panel', 'Audit logs');
  act(() => result.current.update(added));
  expect(result.current.draft?.document.spec.panels['audit-panel']).toBeDefined();
  expect(document.spec.panels['audit-panel']).toBeUndefined();
  act(() => result.current.cancel());
  expect(result.current.draft).toBeUndefined();
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
  const persisted = { ...record, document: added, revision: 1 };
  api.saveSignalDashboard.mockResolvedValue(persisted);
  act(() => result.current.begin({ mode: 'edit', document, original: record }));
  act(() => result.current.update(added));
  await act(() => result.current.save());
  expect(api.saveSignalDashboard).toHaveBeenCalledWith(added, record);
  expect(saved).toHaveBeenCalledWith(persisted);
  act(() => result.current.begin({ mode: 'edit', document: persisted.document, original: persisted }));
  act(() => result.current.update(addEmptyDashboardPanel(added, 'unsaved-panel', 'Unsaved')));
  act(() => result.current.cancel());
  expect(persisted.document.spec.panels['audit-panel']).toBeDefined();
  expect(persisted.document.spec.panels['unsaved-panel']).toBeUndefined();
});
