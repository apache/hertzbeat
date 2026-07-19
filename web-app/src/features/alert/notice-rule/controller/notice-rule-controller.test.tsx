/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteOne: vi.fn(),
  getOne: vi.fn(),
  notification: vi.fn(),
  options: new Map<string, unknown>(),
  refetch: vi.fn(),
  update: vi.fn(),
  useDataProvider: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn()
}));
vi.mock('@refinedev/core', () => ({
  useDataProvider: mocks.useDataProvider,
  useList: mocks.useList,
  useNotification: mocks.useNotification
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => mocks.options.get(queryKey.join(':'))
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./notice-rule-query-controller', () => ({
  useNoticeRuleQueryController: () => ({
    query: { name: '', pageIndex: 0, pageSize: 8 },
    name: '',
    setName: vi.fn(),
    search: vi.fn(),
    changePage: vi.fn()
  })
}));

import { useNoticeRuleController } from './notice-rule-controller';

const receiver = { id: 11, name: 'Email', type: 1 as const };
const template = { id: 21, name: 'Mail', type: 1 as const, preset: false, content: '${content}' };
const rule = {
  id: 31,
  name: 'Proof',
  receiverId: [11],
  receiverName: ['Email'],
  templateId: null,
  templateName: null,
  enable: true,
  filterAll: true,
  labels: {},
  days: [1, 2, 3, 4, 5, 6, 7],
  periodStart: null,
  periodEnd: null
};

describe('notice rule controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.options.clear();
    mocks.options.set('notice-receivers:all', ready([receiver]));
    mocks.options.set('notice-templates:all', ready([template]));
    mocks.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    mocks.create.mockResolvedValue({ data: { id: 31 } });
    mocks.deleteOne.mockResolvedValue({ data: rule });
    mocks.getOne.mockResolvedValue({ data: rule });
    mocks.update.mockResolvedValue({ data: { ...rule, enable: false } });
    mocks.useDataProvider.mockReturnValue(() => ({
      create: mocks.create,
      deleteOne: mocks.deleteOne,
      getOne: mocks.getOne,
      update: mocks.update
    }));
    mocks.useNotification.mockReturnValue({ open: mocks.notification });
    mocks.useList.mockReturnValue({
      query: { error: null, isError: false, isFetching: false, isPending: false, refetch: mocks.refetch },
      result: { data: [], total: 0 }
    });
  });

  it.each([
    ['empty', ready([])],
    ['invalid', failed({ statusCode: 502, code: 'NOTICE_RECEIVER_RESPONSE_INVALID' })],
    ['unavailable', failed({ statusCode: 503 })],
    ['error', failed({ statusCode: 500 })]
  ])('keeps %s receiver options distinct and blocks create', (kind, receiverState) => {
    mocks.options.set('notice-receivers:all', receiverState);
    const { result } = renderHook(() => useNoticeRuleController());
    expect(result.current.state.options.kind).toBe(kind);
    act(() => void result.current.actions.create());
    expect(result.current.state.draft).toBeNull();
  });

  it('blocks detail edit when dependencies are not ready', async () => {
    mocks.options.set('notice-receivers:all', failed({ statusCode: 503 }));
    const { result } = renderHook(() => useNoticeRuleController());

    await act(async () => result.current.actions.edit(31));

    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(result.current.state.draft).toBeNull();
  });

  it('does not report draft validation when dependencies become unavailable before submit', async () => {
    const { result, rerender } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    mocks.options.set('notice-receivers:all', failed({ statusCode: 503 }));
    rerender();

    await act(async () => result.current.actions.submit());

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.validation' }));
    expect(result.current.state.draft).not.toBeNull();
  });

  it('keeps the editor open and preserves unavailable classification when plain refetch evidence fails', async () => {
    mocks.refetch.mockResolvedValue({ isError: true, error: { statusCode: 503, code: 'NETWORK_REQUEST_FAILED' } });
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    await act(async () => result.current.actions.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.list.kind).toBe('unavailable');
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeRules.save.unavailable' })
    );
  });

  it('closes only after provider proof and authoritative list reread both succeed', async () => {
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    await act(async () => result.current.actions.submit());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ resource: 'notice-rules' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
  });

  it('persists a list switch change and reports success only after false detail convergence and list reread', async () => {
    const { result } = renderHook(() => useNoticeRuleController());
    await act(async () => result.current.actions.toggle(rule, false));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'notice-rules',
        id: 31,
        variables: expect.objectContaining({ draft: expect.objectContaining({ id: 31, enable: false }) })
      })
    );
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'noticeRules.saveSuccess',
        type: 'success'
      })
    );
  });

  it('gives a post-rename toggle its own observable per-row command boundary', async () => {
    const { result } = renderHook(() => useNoticeRuleController());
    await act(async () => result.current.actions.edit(31));
    act(() => result.current.actions.updateDraft({ name: 'Renamed' }));
    await act(async () => result.current.actions.submit());

    let resolveToggle: ((value: unknown) => void) | undefined;
    mocks.update.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveToggle = resolve;
        })
    );
    let togglePromise: Promise<boolean> | undefined;
    act(() => {
      togglePromise = result.current.actions.toggle({ ...rule, name: 'Renamed' }, false);
    });
    await waitFor(() => expect(result.current.state.togglingRuleId).toBe(31));
    resolveToggle?.({ data: { ...rule, name: 'Renamed', enable: false } });
    await act(async () => togglePromise);
    expect(result.current.state.togglingRuleId).toBeNull();
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 31,
        variables: expect.objectContaining({ draft: expect.objectContaining({ enable: false }) })
      })
    );
  });

  it('admits only one same-tick write and blocks context-changing actions until it settles', async () => {
    const write = deferred<unknown>();
    mocks.create.mockReturnValueOnce(write.promise);
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));

    let first!: Promise<boolean>;
    let duplicate!: Promise<boolean>;
    act(() => {
      first = result.current.actions.submit();
      duplicate = result.current.actions.submit();
      void result.current.actions.toggle(rule, false);
      void result.current.actions.remove(rule);
      result.current.actions.create();
      result.current.actions.close();
      result.current.actions.updateDraft({ name: 'Must not replace' });
      void result.current.actions.edit(31);
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(result.current.state.draft).toMatchObject({ name: 'Proof' });

    act(() => write.resolve({ data: rule }));
    await act(async () => Promise.all([first, duplicate]));
    expect(result.current.state.command).toBe('idle');
  });

  it('deduplicates detail by id, publishes only the latest edit, and lets create invalidate it', async () => {
    const first = deferred<{ data: typeof rule }>();
    const second = deferred<{ data: typeof rule }>();
    mocks.getOne.mockReset();
    mocks.getOne.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useNoticeRuleController());

    let firstEdit!: Promise<void>;
    let duplicateEdit!: Promise<void>;
    let secondEdit!: Promise<void>;
    act(() => {
      firstEdit = result.current.actions.edit(31);
      duplicateEdit = result.current.actions.edit(31);
      secondEdit = result.current.actions.edit(32);
    });
    expect(mocks.getOne).toHaveBeenCalledTimes(2);
    act(() => second.resolve({ data: { ...rule, id: 32, name: 'Latest' } }));
    await act(async () => secondEdit);
    expect(result.current.state.draft).toMatchObject({ id: 32, name: 'Latest' });

    act(() => result.current.actions.create());
    act(() => first.resolve({ data: rule }));
    await act(async () => Promise.all([firstEdit, duplicateEdit]));
    expect(result.current.state.draft).toMatchObject({ name: '', receiverIds: [] });
  });

  it('atomically clears both template identity fields when receivers become incompatible', () => {
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() =>
      result.current.actions.updateDraft({
        receiverIds: [11],
        templateId: 21,
        templateName: 'Mail'
      })
    );

    act(() => result.current.actions.selectReceivers([999]));

    expect(result.current.state.draft).toMatchObject({
      receiverIds: [999],
      templateId: null,
      templateName: null
    });
  });

  it('toggles from fresh exact detail instead of stale list data', async () => {
    const stale = { ...rule, name: 'Stale list name' };
    const fresh = { ...rule, name: 'Fresh detail name' };
    mocks.getOne.mockResolvedValueOnce({ data: fresh });
    const { result } = renderHook(() => useNoticeRuleController());

    await act(async () => result.current.actions.toggle(stale, false));

    expect(mocks.getOne).toHaveBeenCalledWith({ resource: 'notice-rules', id: 31 });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 31,
        variables: expect.objectContaining({
          draft: expect.objectContaining({ name: 'Fresh detail name', enable: false })
        })
      })
    );
  });

  it('classifies a write 404 as save error rather than detail missing', async () => {
    mocks.update.mockRejectedValueOnce({ statusCode: 404 });
    const { result } = renderHook(() => useNoticeRuleController());
    await act(async () => result.current.actions.edit(31));

    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).toMatchObject({ id: 31 });
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.save.error' }));
    expect(mocks.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeRules.save.missing' })
    );
  });
});

function ready(data: unknown[]) {
  return { data, error: null, isError: false, isPending: false };
}
function failed(error: unknown) {
  return { data: undefined, error, isError: true, isPending: false };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
