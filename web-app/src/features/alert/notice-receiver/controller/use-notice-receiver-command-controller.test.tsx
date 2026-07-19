/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  defaultNoticeReceiverQuery,
  deferred,
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
const rereadAuthoritatively = vi.fn();

describe('notice receiver command controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    loadExact.mockResolvedValue(persistedNoticeReceiver);
    rereadAuthoritatively.mockResolvedValue({ records: [], total: 0, query: defaultNoticeReceiverQuery });
    refine.create.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.update.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.remove.mockResolvedValue({ data: persistedNoticeReceiver });
    api.testNoticeReceiver.mockResolvedValue(undefined);
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useCreate.mockReturnValue({ mutateAsync: refine.create });
    refine.useUpdate.mockReturnValue({ mutateAsync: refine.update });
    refine.useDelete.mockReturnValue({ mutateAsync: refine.remove });
  });

  it('admits only submit when submit claims the same-tick operation gate first', async () => {
    const write = deferred<{ data: typeof persistedNoticeReceiver }>();
    refine.create.mockReturnValueOnce(write.promise);
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.actions.submit();
      void result.current.actions.submit();
      void result.current.actions.remove(persistedNoticeReceiver);
      void result.current.actions.sendTest();
    });

    expect(refine.create).toHaveBeenCalledTimes(1);
    expect(refine.remove).not.toHaveBeenCalled();
    expect(api.testNoticeReceiver).not.toHaveBeenCalled();
    expect(result.current.state.busy).toBe(true);
    act(() => write.resolve({ data: persistedNoticeReceiver }));
    await act(async () => first);
    expect(result.current.state.command).toBe('idle');
  });

  it('admits only remove when remove claims the same-tick operation gate first', async () => {
    const deletion = deferred<{ data: typeof persistedNoticeReceiver }>();
    refine.remove.mockReturnValueOnce(deletion.promise);
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.actions.remove(persistedNoticeReceiver);
      void result.current.actions.remove(persistedNoticeReceiver);
      void result.current.actions.submit();
      void result.current.actions.sendTest();
    });

    expect(refine.remove).toHaveBeenCalledTimes(1);
    expect(refine.create).not.toHaveBeenCalled();
    expect(api.testNoticeReceiver).not.toHaveBeenCalled();
    act(() => deletion.resolve({ data: persistedNoticeReceiver }));
    await act(async () => first);
    expect(result.current.state.command).toBe('idle');
  });

  it('admits only sendTest when test claims the same-tick operation gate first', async () => {
    const test = deferred<void>();
    api.testNoticeReceiver.mockReturnValueOnce(test.promise);
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.actions.sendTest();
      void result.current.actions.sendTest();
      void result.current.actions.submit();
      void result.current.actions.remove(persistedNoticeReceiver);
    });

    expect(api.testNoticeReceiver).toHaveBeenCalledTimes(1);
    expect(refine.create).not.toHaveBeenCalled();
    expect(refine.remove).not.toHaveBeenCalled();
    act(() => test.resolve(undefined));
    await act(async () => first);
    expect(result.current.state.command).toBe('idle');
  });

  it('releases the operation gate in finally after submit, remove, and test failures', async () => {
    refine.create.mockRejectedValueOnce({ statusCode: 503, code: 'NETWORK_REQUEST_FAILED' });
    refine.remove.mockRejectedValueOnce({ statusCode: 503, code: 'NETWORK_REQUEST_FAILED' });
    api.testNoticeReceiver.mockRejectedValueOnce({ statusCode: 503, code: 'NETWORK_REQUEST_FAILED' });
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);

    await act(async () => result.current.actions.submit());
    expect(result.current.actions.close()).toBe(true);
    openValidDraft(result.current.actions);
    await act(async () => result.current.actions.remove(persistedNoticeReceiver));
    expect(result.current.actions.updateDraft({ name: 'still editable' })).toBe(true);
    await act(async () => result.current.actions.sendTest());
    expect(result.current.state.command).toBe('idle');
    expect(result.current.actions.close()).toBe(true);
  });

  it('cannot submit or test the retired draft in the same tick as a different edit', async () => {
    const next = deferred<typeof persistedNoticeReceiver>();
    loadExact.mockResolvedValueOnce(persistedNoticeReceiver).mockReturnValueOnce(next.promise);
    const { result } = renderCommandController();
    await act(async () => result.current.actions.edit(7));

    let nextEdit!: Promise<boolean>;
    act(() => {
      nextEdit = result.current.actions.edit(8);
      void result.current.actions.submit();
      void result.current.actions.sendTest();
    });

    expect(result.current.controls.getDraft()).toBeNull();
    expect(refine.update).not.toHaveBeenCalled();
    expect(api.testNoticeReceiver).not.toHaveBeenCalled();
    act(() => next.resolve({ ...persistedNoticeReceiver, id: 8 }));
    await act(async () => nextEdit);
  });

  it('uses the supplied authoritative reread after save and requires delete absence before success', async () => {
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);
    await act(async () => result.current.actions.submit());
    expect(rereadAuthoritatively).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();

    rereadAuthoritatively.mockResolvedValueOnce({ records: [persistedNoticeReceiver], total: 1 });
    await act(async () => result.current.actions.remove(persistedNoticeReceiver));
    expect(refine.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.deleteSuccess' })
    );
  });

  it('classifies write 404 as error rather than detail missing', async () => {
    refine.create.mockRejectedValueOnce({ statusCode: 404, code: 'NOTICE_RECEIVER_MISSING' });
    const { result } = renderCommandController();
    openValidDraft(result.current.actions);

    await act(async () => result.current.actions.submit());

    expect(refine.notification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.save.error' })
    );
    expect(refine.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.save.missing' })
    );
  });

  it('rejects update evidence for a different id without closing the editor or reporting success', async () => {
    refine.update.mockResolvedValueOnce({ data: { ...persistedNoticeReceiver, id: 8 } });
    const { result } = renderCommandController();
    await act(async () => result.current.actions.edit(7));

    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7 });
    expect(rereadAuthoritatively).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.saveSuccess' })
    );
  });

  it('retires the matching open draft after deletion is authoritatively proved', async () => {
    const { result } = renderCommandController();
    await act(async () => result.current.actions.edit(7));

    await act(async () => result.current.actions.remove(persistedNoticeReceiver));

    expect(result.current.state.draft).toBeNull();
    expect(refine.notification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.deleteSuccess' })
    );
  });
});

function renderCommandController() {
  return renderHook(() => useNoticeReceiverCommandController({ loadExact, rereadAuthoritatively }));
}

function openValidDraft(actions: {
  create: () => boolean;
  updateDraft: (patch: ReturnType<typeof validNoticeReceiverDraft>) => boolean;
}) {
  act(() => expect(actions.create()).toBe(true));
  act(() => expect(actions.updateDraft(validNoticeReceiverDraft())).toBe(true));
}
