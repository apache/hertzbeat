/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ApiMessageError } from '@/core/http/api-message';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { encodeLogView, parseLogView } from '@/platform/perses';
import { buildSavedQueryPayload, readSavedQuery, type SavedQueryRecord } from '../model/explore-saved-query-model';
import type { LogExploreQuery } from '../model/explore-query';
import { useSavedQueryEditor } from './use-saved-query-editor';
const api = vi.hoisted(() => ({ saveQueryRecord: vi.fn(), deleteQueryRecord: vi.fn() }));
vi.mock('../api/explore-saved-query-api', () => api);
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function deferred() {
  let resolve!: (record: SavedQueryRecord) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<SavedQueryRecord>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function options(key = 'view-a') {
  const query: LogExploreQuery = {
    signal: 'logs',
    timeRange: 'last-30m',
    query: 'service:checkout',
    searchSyntax: 'structured-v1',
    start: 100000,
    end: 200000,
    timeZone: 'UTC',
    logView: encodeLogView({
      version: 1,
      columns: [{ kind: 'time' }, { kind: 'message' }, { kind: 'traceId' }],
      density: 'compact',
      wrap: false
    })
  };
  return {
    source: `route-${key}`,
    query,
    active: { ...buildSavedQueryPayload(query, key, key, 'Original description'), revision: 2 },
    canWrite: true,
    saveBlocked: false,
    refresh: vi.fn(),
    selected: vi.fn()
  };
}
it('retains a failed rename draft and retries exactly once with its complete final query/time/columns', async () => {
  const props = options();
  const failure = deferred(),
    retry = deferred();
  api.saveQueryRecord.mockReturnValueOnce(failure.promise).mockReturnValueOnce(retry.promise);
  const hook = renderHook(useSavedQueryEditor, { initialProps: props });
  act(() => hook.result.current.begin('update'));
  act(() => {
    hook.result.current.edit('label', 'Renamed');
  });
  act(() => hook.result.current.edit('description', 'Draft description'));
  let first!: Promise<void>;
  act(() => {
    first = hook.result.current.save();
    void hook.result.current.save();
  });
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(hook.result.current.busy).toBe(true);
  act(() => hook.result.current.closeEditor());
  expect(hook.result.current.editor?.label).toBe('Renamed');
  await act(async () => {
    failure.reject(new Error('Synthetic transport failure'));
    await first;
  });
  expect(hook.result.current).toMatchObject({
    busy: false,
    error: 'writeFailed',
    editor: { viewKey: 'view-a', revision: 2, label: 'Renamed', description: 'Draft description' }
  });
  expect(props.refresh).not.toHaveBeenCalled();
  expect(props.selected).not.toHaveBeenCalled();
  act(() => hook.result.current.edit('description', 'Final description'));
  let second!: Promise<void>;
  act(() => {
    second = hook.result.current.save();
    void hook.result.current.save();
  });
  expect(api.saveQueryRecord).toHaveBeenCalledTimes(2);
  expect(hook.result.current.error).toBeUndefined();
  const submitted = api.saveQueryRecord.mock.calls[1]![0] as SavedQueryRecord;
  expect(submitted).toMatchObject({
    viewKey: 'view-a',
    revision: 2,
    label: 'Renamed',
    description: 'Final description'
  });
  const persisted = { ...submitted, revision: 3 };
  await act(async () => {
    retry.resolve(persisted);
    await second;
  });
  expect(hook.result.current.editor).toBeUndefined();
  expect(hook.result.current.busy).toBe(false);
  expect(props.refresh).toHaveBeenCalledOnce();
  expect(props.selected).toHaveBeenCalledExactlyOnceWith('view-a');
  const restored = readSavedQuery(persisted);
  expect(restored).toMatchObject({
    kind: 'ready',
    query: { query: props.query.query, start: 100000, end: 200000, timeZone: 'UTC', logView: props.query.logView }
  });
  if (restored.kind !== 'ready' || restored.query.signal !== 'logs') throw new Error('Expected restored Logs view');
  expect(parseLogView(restored.query.logView!).columns).toEqual([
    { kind: 'time' },
    { kind: 'message' },
    { kind: 'traceId' }
  ]);
});
it.each(['success', 'failure', '401', '403'] as const)(
  'keeps a newer view owner untouched after an old rename %s',
  async settlement => {
    const a = options(),
      b = options('view-b');
    const pending = deferred();
    api.saveQueryRecord.mockReturnValueOnce(pending.promise);
    const hook = renderHook(useSavedQueryEditor, { initialProps: a });
    act(() => hook.result.current.begin('update'));
    act(() => hook.result.current.edit('label', 'A rename'));
    let write!: Promise<void>;
    act(() => {
      write = hook.result.current.save();
    });
    const submitted = api.saveQueryRecord.mock.calls[0]![0] as SavedQueryRecord;
    expect(submitted).toMatchObject({ viewKey: 'view-a', label: 'A rename', revision: 2 });
    hook.rerender(b);
    expect(hook.result.current.editor).toBeUndefined();
    act(() => hook.result.current.begin('update'));
    expect(hook.result.current.editor).toBeUndefined(); // Existing single-pending-write contract.
    await act(async () => {
      if (settlement === 'success') pending.resolve({ ...submitted, revision: 3 });
      else
        pending.reject(
          settlement === 'failure'
            ? new Error('Late A failure')
            : new ApiMessageError('Synthetic late rejection', { status: Number(settlement) })
        );
      await write;
    });
    expect(hook.result.current.error).toBeUndefined();
    expect(hook.result.current.editor).toBeUndefined();
    expect(a.selected).not.toHaveBeenCalled();
    expect(b.selected).not.toHaveBeenCalled();
    act(() => hook.result.current.begin('update'));
    expect(hook.result.current.editor).toMatchObject({ viewKey: 'view-b', label: 'view-b', revision: 2 });
    expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  }
);
it.each(['success', 'failure', '401', '403'] as const)(
  'does not reopen a closed route editor after old write %s',
  async settlement => {
    const props = options();
    const pending = deferred();
    api.saveQueryRecord.mockReturnValueOnce(pending.promise);
    const hook = renderHook(useSavedQueryEditor, { initialProps: props });
    act(() => hook.result.current.begin('update'));
    let write!: Promise<void>;
    act(() => {
      write = hook.result.current.save();
    });
    hook.unmount();
    const reopened = renderHook(useSavedQueryEditor, { initialProps: props });
    await act(async () => {
      if (settlement === 'success') pending.resolve({ ...props.active, revision: 3 });
      else
        pending.reject(
          settlement === 'failure'
            ? new Error('Late closed editor failure')
            : new ApiMessageError('Synthetic late rejection', { status: Number(settlement) })
        );
      await write;
    });
    expect(reopened.result.current).toMatchObject({ busy: false, editor: undefined, error: undefined });
    expect(props.selected).not.toHaveBeenCalled();
    expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  }
);
