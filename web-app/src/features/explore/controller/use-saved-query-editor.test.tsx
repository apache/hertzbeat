/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { parseExploreQuery } from '../model/explore-model';
import { useSavedQueryEditor } from './use-saved-query-editor';
const api = vi.hoisted(() => ({ saveQueryRecord: vi.fn(), deleteQueryRecord: vi.fn() }));
vi.mock('../api/explore-saved-query-api', () => api);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('keeps the opened revision and draft after a newer catalog record and a conflict', async () => {
  const refresh = vi.fn();
  const selected = vi.fn();
  const active = {
    signal: 'logs' as const,
    viewKey: 'shared',
    label: 'Original',
    route: '/explore?signal=logs',
    revision: 2
  };
  const options = {
    source: 'same',
    query: parseExploreQuery(new URLSearchParams('signal=logs')),
    active,
    canWrite: true,
    saveBlocked: false,
    refresh,
    selected
  };
  const hook = renderHook(props => useSavedQueryEditor(props), { initialProps: options });
  act(() => hook.result.current.begin('update'));
  act(() => hook.result.current.edit('label', 'My edit'));
  hook.rerender({ ...options, active: { ...active, revision: 3 } });
  api.saveQueryRecord.mockRejectedValue(new ApiMessageError('Conflict', { status: 409 }));
  await act(() => hook.result.current.save());
  expect(api.saveQueryRecord).toHaveBeenCalledWith(expect.objectContaining({ revision: 2, label: 'My edit' }));
  expect(hook.result.current.editor).toMatchObject({ revision: 2, label: 'My edit' });
  expect(hook.result.current.error).toBe('revisionConflict');
  expect(refresh).not.toHaveBeenCalled();
  expect(selected).not.toHaveBeenCalled();
  act(() => hook.result.current.closeEditor());
  act(() => hook.result.current.begin('copy'));
  api.saveQueryRecord.mockResolvedValue(undefined);
  await act(() => hook.result.current.save());
  expect(api.saveQueryRecord.mock.calls[1]?.[0]).not.toHaveProperty('revision');
});

it('keeps direct Save Changes on the active revision when the backend reports a conflict', async () => {
  const refresh = vi.fn();
  const selected = vi.fn();
  const hook = renderHook(() =>
    useSavedQueryEditor({
      source: 'direct-update',
      query: parseExploreQuery(new URLSearchParams('signal=logs&query=error')),
      active: {
        signal: 'logs',
        viewKey: 'shared',
        label: 'Errors',
        route: '/explore?signal=logs',
        revision: 4
      },
      canWrite: true,
      saveBlocked: false,
      refresh,
      selected
    })
  );
  api.saveQueryRecord.mockRejectedValueOnce(new ApiMessageError('Conflict', { status: 409 }));
  await act(() => hook.result.current.updateActive());
  expect(api.saveQueryRecord).toHaveBeenCalledWith(expect.objectContaining({ revision: 4, label: 'Errors' }));
  expect(hook.result.current.error).toBe('revisionConflict');
  expect(refresh).not.toHaveBeenCalled();
  expect(selected).not.toHaveBeenCalled();
});

it.each([401, 403])('retains a save draft and reports action permission for HTTP%s', async status => {
  const options = {
    source: 'permission-save',
    query: parseExploreQuery(new URLSearchParams('signal=logs&start=1000&end=2000')),
    active: undefined,
    canWrite: true,
    saveBlocked: false,
    refresh: vi.fn(),
    selected: vi.fn()
  };
  const hook = renderHook(() => useSavedQueryEditor(options));
  act(() => hook.result.current.begin('create'));
  act(() => hook.result.current.edit('label', 'Retained view'));
  api.saveQueryRecord.mockRejectedValueOnce(new ApiMessageError('Synthetic private server text', { status }));
  await act(() => hook.result.current.save());
  expect(hook.result.current.error).toBe('savePermission');
  expect(hook.result.current.editor?.label).toBe('Retained view');
  expect(api.saveQueryRecord).toHaveBeenCalledOnce();
  expect(options.refresh).not.toHaveBeenCalled();
  expect(options.selected).not.toHaveBeenCalled();
  act(() => hook.result.current.closeEditor());
  expect(hook.result.current.editor).toBeUndefined();
  expect(hook.result.current.error).toBeUndefined();
});

it.each([401, 403, 500])(
  'reports delete permission or generic failure for HTTP%s without selecting or refreshing',
  async status => {
    const options = {
      source: 'permission-delete',
      query: parseExploreQuery(new URLSearchParams('signal=logs')),
      active: undefined,
      canWrite: true,
      saveBlocked: false,
      refresh: vi.fn(),
      selected: vi.fn()
    };
    const hook = renderHook(() => useSavedQueryEditor(options));
    api.deleteQueryRecord.mockRejectedValueOnce(new ApiMessageError('Synthetic private server text', { status }));
    await act(() =>
      hook.result.current.remove({
        signal: 'logs',
        viewKey: 'shared',
        label: 'Shared',
        route: '/explore?signal=logs',
        revision: 2
      })
    );
    expect(hook.result.current.error).toBe(status === 500 ? 'writeFailed' : 'deletePermission');
    expect(api.deleteQueryRecord).toHaveBeenCalledOnce();
    expect(options.refresh).not.toHaveBeenCalled();
    expect(options.selected).not.toHaveBeenCalled();
  }
);
