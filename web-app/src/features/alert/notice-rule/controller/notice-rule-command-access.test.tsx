/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  capabilities: { canCreate: true, canEdit: true, canToggle: true, canDelete: true },
  create: vi.fn(),
  deleteOne: vi.fn(),
  getList: vi.fn(),
  getOne: vi.fn(),
  notification: vi.fn(),
  refetch: vi.fn(),
  update: vi.fn()
}));
vi.mock('@refinedev/core', () => ({
  useDataProvider: () => () => ({
    create: mocks.create,
    deleteOne: mocks.deleteOne,
    getList: mocks.getList,
    getOne: mocks.getOne,
    update: mocks.update
  }),
  useNotification: () => ({ open: mocks.notification })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./use-notice-rule-action-capabilities', () => ({
  useNoticeRuleActionCapabilities: () => mocks.capabilities
}));

import { NoticeRuleRequestFailure } from '../model/notice-rule-failure';
import { useNoticeRuleCommandController } from './notice-rule-command-controller';
import type { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

const receiver = { id: 11, name: 'Email', type: 1 as const };
const template = { id: 21, name: 'Mail', type: 1 as const, preset: false, content: '${content}' };
const rule = {
  id: 31,
  name: 'Proof',
  receiverId: [11],
  receiverName: ['Email'],
  templateId: 21,
  templateName: 'Mail',
  enable: true,
  filterAll: true,
  labels: {},
  days: [1, 2, 3, 4, 5, 6, 7],
  periodStart: null,
  periodEnd: null
};

describe('notice rule command action admission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.capabilities = { canCreate: true, canEdit: true, canToggle: true, canDelete: true };
    mocks.create.mockResolvedValue({ data: rule });
    mocks.deleteOne.mockResolvedValue({ data: rule });
    mocks.getList.mockResolvedValue({ data: [], total: 0 });
    mocks.getOne.mockResolvedValue({ data: rule });
    mocks.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    mocks.update.mockResolvedValue({ data: rule });
  });

  it('fails closed for guest create, edit, submit, toggle, and delete before transport', async () => {
    mocks.capabilities = guestActions();
    const view = renderController();

    act(() => view.result.current.editor.actions.create());
    await act(async () => {
      await view.result.current.editor.actions.edit(31);
      await view.result.current.actions.submit();
      await view.result.current.actions.toggle(rule, false);
      await view.result.current.actions.remove(rule);
    });

    expect(view.result.current.editor.draft).toBeNull();
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.getList).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('retires administrator delete recovery when the session becomes user', async () => {
    mocks.deleteOne.mockRejectedValueOnce(new NoticeRuleRequestFailure('unavailable', 'uncertain'));
    const view = renderController();
    await act(async () => view.result.current.actions.remove(rule));
    expect(view.result.current.gate.recovery).toMatchObject({ kind: 'delete' });

    mocks.capabilities = userActions();
    view.rerender();

    expect(view.result.current.gate.recovery).toBeUndefined();
    await act(async () => view.result.current.actions.retry());
    expect(mocks.deleteOne).toHaveBeenCalledOnce();
    expect(mocks.getOne).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('retires a user create preflight on guest downgrade before mutation', async () => {
    const preflight = deferred<{ data: (typeof rule)[]; total: number }>();
    mocks.getList.mockReturnValueOnce(preflight.promise);
    mocks.capabilities = userActions();
    const view = renderController();
    act(() => view.result.current.editor.actions.create());
    act(() =>
      view.result.current.editor.actions.updateDraft({
        name: 'Proof',
        receiverIds: [11],
        templateId: 21
      })
    );
    let operation!: Promise<boolean>;
    act(() => {
      operation = view.result.current.actions.submit();
    });

    mocks.capabilities = guestActions();
    view.rerender();
    expect(view.result.current.editor.draft).toBeNull();
    act(() => preflight.resolve({ data: [], total: 0 }));
    await act(async () => operation);

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('does not project a completed toggle after guest downgrade retires its owner', async () => {
    const write = deferred<{ data: typeof rule }>();
    mocks.update.mockReturnValueOnce(write.promise);
    mocks.capabilities = userActions();
    const view = renderController();
    let operation!: Promise<boolean>;
    act(() => {
      operation = view.result.current.actions.toggle(rule, false);
    });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());

    mocks.capabilities = guestActions();
    view.rerender();
    act(() => write.resolve({ data: { ...rule, enable: false } }));
    await act(async () => operation);

    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(view.result.current.gate.recovery).toBeUndefined();
  });

  it('retires pending edit detail on guest downgrade but not an equivalent user rerender', async () => {
    const first = deferred<{ data: typeof rule }>();
    mocks.getOne.mockReturnValueOnce(first.promise);
    mocks.capabilities = userActions();
    const view = renderController();
    let edit!: Promise<void>;
    act(() => {
      edit = view.result.current.editor.actions.edit(31);
    });
    mocks.capabilities = { ...userActions() };
    view.rerender();
    expect(view.result.current.editor.detail).toEqual({ kind: 'loading', id: 31 });

    mocks.capabilities = guestActions();
    view.rerender();
    act(() => first.resolve({ data: rule }));
    await act(async () => edit);

    expect(view.result.current.editor.detail).toEqual({ kind: 'idle' });
    expect(view.result.current.editor.draft).toBeNull();
  });
});

function renderController() {
  return renderHook(() =>
    useNoticeRuleCommandController({
      list: noticeRuleListFixture(),
      options: noticeRuleOptionsFixture()
    })
  );
}

function noticeRuleListFixture(): ReturnType<typeof useNoticeRuleList> {
  return {
    state: { kind: 'empty' },
    refresh: vi.fn(),
    refreshAuthoritatively: mocks.refetch,
    refreshing: false
  };
}

function noticeRuleOptionsFixture(): ReturnType<typeof useNoticeRuleOptions> {
  return {
    kind: 'ready',
    receivers: [receiver],
    templates: [template]
  };
}

function userActions() {
  return { canCreate: true, canEdit: true, canToggle: true, canDelete: false };
}

function guestActions() {
  return { canCreate: false, canEdit: false, canToggle: false, canDelete: false };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
