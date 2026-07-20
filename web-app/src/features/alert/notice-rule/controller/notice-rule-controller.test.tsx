/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteOne: vi.fn(),
  getList: vi.fn(),
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
import { NoticeRuleContractError, NoticeRuleRequestFailure } from '../model/notice-rule-failure';

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
    vi.resetAllMocks();
    mocks.options.clear();
    mocks.options.set('notice-receivers:all', ready([receiver]));
    mocks.options.set('notice-templates:all', ready([template]));
    mocks.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    mocks.create.mockResolvedValue({ data: { id: 31 } });
    mocks.deleteOne.mockResolvedValue({ data: rule });
    mocks.getOne.mockResolvedValue({ data: rule });
    mocks.getList.mockResolvedValue({ data: [], total: 0 });
    mocks.update.mockResolvedValue({ data: { ...rule, enable: false } });
    mocks.useDataProvider.mockReturnValue(() => ({
      create: mocks.create,
      deleteOne: mocks.deleteOne,
      getList: mocks.getList,
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
    ['invalid', failed(new NoticeRuleContractError('NOTICE_RECEIVER_RESPONSE_INVALID'))],
    ['unavailable', failed(new NoticeRuleRequestFailure('unavailable'))],
    ['error', failed(new NoticeRuleRequestFailure('error'))]
  ])('keeps %s receiver options distinct and blocks create', (kind, receiverState) => {
    mocks.options.set('notice-receivers:all', receiverState);
    const { result } = renderHook(() => useNoticeRuleController());
    expect(result.current.state.options.kind).toBe(kind);
    act(() => void result.current.actions.create());
    expect(result.current.state.draft).toBeNull();
  });

  it('blocks detail edit when dependencies are not ready', async () => {
    mocks.options.set('notice-receivers:all', failed(new NoticeRuleRequestFailure('unavailable')));
    const { result } = renderHook(() => useNoticeRuleController());

    await act(async () => result.current.actions.edit(31));

    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(result.current.state.draft).toBeNull();
  });

  it('does not report draft validation when dependencies become unavailable before submit', async () => {
    const { result, rerender } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    mocks.options.set('notice-receivers:all', failed(new NoticeRuleRequestFailure('unavailable')));
    rerender();

    await act(async () => result.current.actions.submit());

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.validation' }));
    expect(result.current.state.draft).not.toBeNull();
  });

  it('keeps the editor open and preserves unavailable classification when plain refetch evidence fails', async () => {
    mocks.refetch.mockResolvedValue({ isError: true, error: new NoticeRuleRequestFailure('unavailable') });
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => void result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    await act(async () => result.current.actions.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.list.kind).toBe('unavailable');
    expect(result.current.state.recovery).toMatchObject({ phase: 'projection', failure: 'unavailable' });
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'common.unavailable' }));
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

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
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
    mocks.update.mockRejectedValueOnce(new NoticeRuleRequestFailure('missing', 'rejected'));
    const { result } = renderHook(() => useNoticeRuleController());
    await act(async () => result.current.actions.edit(31));

    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).toMatchObject({ id: 31 });
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.save.error' }));
    expect(mocks.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeRules.save.missing' })
    );
  });

  it('reports a provider detail identity mismatch as named invalid domain evidence', async () => {
    mocks.getOne.mockResolvedValueOnce({ data: { ...rule, id: 32 } });
    const { result } = renderHook(() => useNoticeRuleController());

    await act(async () => result.current.actions.edit(31));

    expect(result.current.state.draft).toBeNull();
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.read.invalid' }));
  });

  it('reports stale toggle dependencies as named invalid domain evidence before update', async () => {
    mocks.getOne.mockResolvedValueOnce({ data: { ...rule, receiverId: [999], receiverName: ['Stale'] } });
    const { result } = renderHook(() => useNoticeRuleController());

    await act(async () => result.current.actions.toggle(rule, false));

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeRules.save.invalid' }));
  });

  it.each([
    ['create', 'submit'],
    ['update', 'submit'],
    ['toggle', 'toggle'],
    ['delete', 'remove']
  ] as const)('retains an ambiguous %s receipt and retries only proof reads', async (kind, action) => {
    const { result } = renderHook(() => useNoticeRuleController());
    if (kind === 'create') {
      act(() => result.current.actions.create());
      act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
      mocks.create.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
      await act(async () => result.current.actions.submit());
    } else if (kind === 'update') {
      await act(async () => result.current.actions.edit(31));
      mocks.update.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
      await act(async () => result.current.actions.submit());
    } else if (kind === 'toggle') {
      mocks.update.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
      await act(async () => result.current.actions.toggle(rule, false));
    } else {
      mocks.deleteOne.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
      await act(async () => result.current.actions.remove(rule));
    }

    expect(result.current.state.recovery).toMatchObject({ kind, failure: 'unavailable', retryable: true });
    const writesBeforeRetry = {
      create: mocks.create.mock.calls.length,
      delete: mocks.deleteOne.mock.calls.length,
      update: mocks.update.mock.calls.length
    };

    if (action === 'submit') await act(async () => result.current.actions.submit());
    if (action === 'toggle') await act(async () => result.current.actions.toggle(rule, false));
    if (action === 'remove') await act(async () => result.current.actions.remove(rule));
    expect(mocks.create).toHaveBeenCalledTimes(writesBeforeRetry.create);
    expect(mocks.deleteOne).toHaveBeenCalledTimes(writesBeforeRetry.delete);
    expect(mocks.update).toHaveBeenCalledTimes(writesBeforeRetry.update);

    if (kind === 'delete') mocks.getOne.mockRejectedValueOnce(new NoticeRuleRequestFailure('missing', 'rejected'));
    await act(async () => result.current.actions.retry());
    expect(mocks.create).toHaveBeenCalledTimes(writesBeforeRetry.create);
    expect(mocks.deleteOne).toHaveBeenCalledTimes(writesBeforeRetry.delete);
    expect(mocks.update).toHaveBeenCalledTimes(writesBeforeRetry.update);
  });

  it('releases a definitely rejected update so the corrected UI action may write again', async () => {
    const { result } = renderHook(() => useNoticeRuleController());
    await act(async () => result.current.actions.edit(31));
    mocks.update.mockRejectedValueOnce(new NoticeRuleRequestFailure('error', 'rejected'));

    await act(async () => result.current.actions.submit());
    expect(result.current.state.recovery).toBeUndefined();

    await act(async () => result.current.actions.submit());
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it('locks an ambiguous create identity without offering another proof or write', async () => {
    const { result } = renderHook(() => useNoticeRuleController());
    act(() => result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    mocks.create.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
    await act(async () => result.current.actions.submit());
    const matching = { ...rule, templateId: 21, templateName: 'Mail' };
    mocks.getList.mockResolvedValueOnce({ data: [matching, { ...matching, id: 32 }], total: 2 });

    await act(async () => result.current.actions.retry());

    expect(result.current.state.recovery).toEqual({
      kind: 'create',
      phase: 'commit-uncertain',
      failure: 'commit-uncertain',
      retryable: false
    });
    const proofReads = mocks.getList.mock.calls.length;
    await act(async () => result.current.actions.retry());
    expect(mocks.getList).toHaveBeenCalledTimes(proofReads);
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it('does not start a write when its preflight owner unmounts', async () => {
    const createPreflight = deferred<{ data: (typeof rule)[]; total: number }>();
    mocks.getList.mockReturnValueOnce(createPreflight.promise);
    const createView = renderHook(() => useNoticeRuleController());
    act(() => createView.result.current.actions.create());
    act(() => createView.result.current.actions.updateDraft({ name: 'Proof', receiverIds: [11], templateId: 21 }));
    let create!: Promise<boolean>;
    act(() => {
      create = createView.result.current.actions.submit();
    });
    createView.unmount();
    createPreflight.resolve({ data: [], total: 0 });
    await act(async () => create);
    expect(mocks.create).not.toHaveBeenCalled();

    const togglePreflight = deferred<{ data: typeof rule }>();
    mocks.getOne.mockReturnValueOnce(togglePreflight.promise);
    const toggleView = renderHook(() => useNoticeRuleController());
    let toggle!: Promise<boolean>;
    act(() => {
      toggle = toggleView.result.current.actions.toggle(rule, false);
    });
    toggleView.unmount();
    togglePreflight.resolve({ data: rule });
    await act(async () => toggle);
    expect(mocks.update).not.toHaveBeenCalled();
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
