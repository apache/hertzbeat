/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeReceiverRequestFailure } from '../model/notice-receiver-failure';
import {
  defaultNoticeReceiverQuery,
  deferred,
  adminNoticeActions,
  guestNoticeActions,
  userNoticeActions,
  persistedNoticeReceiver,
  validNoticeReceiverDraft
} from './notice-receiver-controller-test-fixtures';

const refine = vi.hoisted(() => ({
  create: vi.fn(),
  notification: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  useCreate: vi.fn(),
  useDelete: vi.fn(),
  useNotification: vi.fn(),
  useUpdate: vi.fn()
}));
const api = vi.hoisted(() => ({ testNoticeReceiver: vi.fn() }));
vi.mock('@refinedev/core', () => ({
  useCreate: refine.useCreate,
  useDelete: refine.useDelete,
  useNotification: refine.useNotification,
  useUpdate: refine.useUpdate
}));
vi.mock('../api/notice-receiver-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/notice-receiver-api')>()),
  testNoticeReceiver: api.testNoticeReceiver
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useNoticeReceiverCommandController } from './use-notice-receiver-command-controller';

const loadExact = vi.fn();
const reread = vi.fn();
const capability = { current: adminNoticeActions };

describe('notice receiver command action admission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    capability.current = adminNoticeActions;
    loadExact.mockResolvedValue(persistedNoticeReceiver);
    reread.mockResolvedValue({ records: [], total: 0, query: defaultNoticeReceiverQuery });
    refine.create.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.update.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.remove.mockResolvedValue({ data: persistedNoticeReceiver });
    api.testNoticeReceiver.mockResolvedValue(undefined);
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useCreate.mockReturnValue({ mutateAsync: refine.create });
    refine.useUpdate.mockReturnValue({ mutateAsync: refine.update });
    refine.useDelete.mockReturnValue({ mutateAsync: refine.remove });
  });

  it('fails closed for guest editor, submit, test, delete, and retained commands', async () => {
    const view = renderController();
    openDraft(view.result.current.actions);
    capability.current = guestNoticeActions;
    view.rerender();

    expect(view.result.current.state.draft).toBeNull();
    expect(view.result.current.actions.create()).toBe(false);
    await act(async () => {
      await view.result.current.actions.edit(7);
      await view.result.current.actions.submit();
      await view.result.current.actions.sendTest();
      await view.result.current.actions.remove(persistedNoticeReceiver);
      await view.result.current.actions.retry();
      await view.result.current.actions.retryTest();
    });

    expect(loadExact).not.toHaveBeenCalled();
    expect(refine.create).not.toHaveBeenCalled();
    expect(refine.update).not.toHaveBeenCalled();
    expect(refine.remove).not.toHaveBeenCalled();
    expect(api.testNoticeReceiver).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
  });

  it('admits user create, edit, submit, and test but not delete', async () => {
    capability.current = userNoticeActions;
    const { result } = renderController();
    openDraft(result.current.actions);

    await act(async () => result.current.actions.sendTest());
    await act(async () => result.current.actions.submit());
    await act(async () => result.current.actions.edit(7));
    await act(async () => result.current.actions.remove(persistedNoticeReceiver));

    expect(api.testNoticeReceiver).toHaveBeenCalledOnce();
    expect(refine.create).toHaveBeenCalledOnce();
    expect(loadExact).toHaveBeenCalledWith(7);
    expect(refine.remove).not.toHaveBeenCalled();
  });

  it('keeps an allowed user test current until delivery completes', async () => {
    const delivery = deferred<void>();
    api.testNoticeReceiver.mockReturnValueOnce(delivery.promise);
    capability.current = userNoticeActions;
    const view = renderController();
    openDraft(view.result.current.actions);
    let operation!: Promise<boolean>;

    act(() => {
      operation = view.result.current.actions.sendTest();
    });
    expect(view.result.current.state.command).toBe('testing');
    capability.current = { ...userNoticeActions };
    view.rerender();
    act(() => delivery.resolve());
    await act(async () => operation);

    expect(view.result.current.state.command).toBe('idle');
    expect(refine.notification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.testSuccess' })
    );
  });

  it('retires a pending edit detail on guest downgrade so it cannot reappear after restoration', async () => {
    const detail = deferred<typeof persistedNoticeReceiver>();
    loadExact.mockReturnValueOnce(detail.promise);
    capability.current = userNoticeActions;
    const view = renderController();
    let edit!: Promise<boolean>;
    act(() => {
      edit = view.result.current.actions.edit(7);
    });

    capability.current = guestNoticeActions;
    view.rerender();
    act(() => detail.resolve(persistedNoticeReceiver));
    await act(async () => edit);
    expect(view.result.current.state.draft).toBeNull();

    capability.current = userNoticeActions;
    view.rerender();
    expect(view.result.current.state.draft).toBeNull();
  });

  it.each(['save', 'test'] as const)('retains permitted user %s recovery across equivalent rerenders', async kind => {
    capability.current = userNoticeActions;
    rejectOperationOnce(kind);
    const view = renderController();
    openDraft(view.result.current.actions);
    await runOperation(view, kind);

    capability.current = { ...userNoticeActions };
    view.rerender();
    await expectAndRetry(view, kind);

    expect(view.result.current.state.command).toBe('idle');
  });

  it.each(['save', 'test'] as const)('retires user %s recovery and draft on guest downgrade', async kind => {
    capability.current = userNoticeActions;
    rejectOperationOnce(kind);
    const view = renderController();
    openDraft(view.result.current.actions);
    await runOperation(view, kind);

    capability.current = guestNoticeActions;
    view.rerender();

    expect(view.result.current.state).toMatchObject({ command: 'idle', draft: null });
    expect(view.result.current.state.recovery).toBeUndefined();
    expect(view.result.current.state.testRecovery).toBeUndefined();

    capability.current = userNoticeActions;
    view.rerender();
    expect(view.result.current.state).toMatchObject({ command: 'idle', draft: null });
    expect(view.result.current.state.recovery).toBeUndefined();
    expect(view.result.current.state.testRecovery).toBeUndefined();
  });

  it('retires inaccessible delete recovery on an administrator-to-user role change', async () => {
    refine.remove.mockRejectedValueOnce(unavailableFailure());
    const view = renderController();
    await act(async () => view.result.current.actions.remove(persistedNoticeReceiver));
    expect(view.result.current.state.recovery).toMatchObject({ kind: 'delete' });

    capability.current = userNoticeActions;
    view.rerender();
    expect(view.result.current.state.recovery).toBeUndefined();
    await act(async () => view.result.current.actions.retry());

    expect(refine.remove).toHaveBeenCalledOnce();
    expect(loadExact).not.toHaveBeenCalled();
    expect(reread).not.toHaveBeenCalled();
  });
});

function renderController() {
  return renderHook(() =>
    useNoticeReceiverCommandController({ loadExact, rereadAuthoritatively: reread }, capability.current)
  );
}

function openDraft(actions: {
  create: () => boolean;
  updateDraft: (patch: ReturnType<typeof validNoticeReceiverDraft>) => boolean;
}) {
  act(() => expect(actions.create()).toBe(true));
  act(() => expect(actions.updateDraft(validNoticeReceiverDraft())).toBe(true));
}

function rejectOperationOnce(kind: 'save' | 'test') {
  if (kind === 'save') reread.mockRejectedValueOnce(unavailableFailure());
  else api.testNoticeReceiver.mockRejectedValueOnce(unavailableFailure());
}

async function runOperation(view: ReturnType<typeof renderController>, kind: 'save' | 'test') {
  await act(async () =>
    kind === 'save' ? view.result.current.actions.submit() : view.result.current.actions.sendTest()
  );
}

async function expectAndRetry(view: ReturnType<typeof renderController>, kind: 'save' | 'test') {
  if (kind === 'save') {
    expect(view.result.current.state.recovery).toMatchObject({ kind: 'save' });
    await act(async () => view.result.current.actions.retry());
  } else {
    expect(view.result.current.state.testRecovery).toMatchObject({ phase: 'delivery-uncertain' });
    await act(async () => view.result.current.actions.retryTest());
  }
}

function unavailableFailure() {
  return new NoticeReceiverRequestFailure('unavailable', 'uncertain');
}
