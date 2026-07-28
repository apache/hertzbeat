/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeTemplateRequestFailure } from '../model/notice-template-failure';
import { useNoticeTemplateController } from './notice-template-controller';
import { preset, record } from './notice-template-controller-test-fixtures';

const refine = vi.hoisted(() => ({
  capabilities: { canCreate: true, canEdit: true, canDelete: true },
  custom: vi.fn(),
  deleteOne: vi.fn(),
  getOne: vi.fn(),
  notification: vi.fn(),
  refetch: vi.fn(),
  setParams: vi.fn(),
  update: vi.fn(),
  useDataProvider: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn()
}));
vi.mock('@refinedev/core', () => ({
  useDataProvider: refine.useDataProvider,
  useList: refine.useList,
  useNotification: refine.useNotification
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('preset=false&pageIndex=0&pageSize=8'), refine.setParams]
}));
vi.mock('./use-notice-template-action-capabilities', () => ({
  useNoticeTemplateActionCapabilities: () => refine.capabilities
}));

describe('Notice Template direct command admission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refine.capabilities = { canCreate: true, canEdit: true, canDelete: true };
    refine.custom.mockResolvedValue({ data: { response: null } });
    refine.deleteOne.mockResolvedValue({ data: record });
    refine.getOne.mockResolvedValue({ data: record });
    refine.refetch.mockResolvedValue({ data: { data: [record], total: 1 }, isError: false });
    refine.update.mockResolvedValue({ data: record });
    refine.useDataProvider.mockReturnValue(() => ({
      custom: refine.custom,
      deleteOne: refine.deleteOne,
      getList: vi.fn(),
      getOne: refine.getOne,
      update: refine.update
    }));
    refine.useList.mockReturnValue({
      query: { error: null, isError: false, isFetching: false, isPending: false, refetch: refine.refetch },
      result: { data: [record], total: 1 }
    });
    refine.useNotification.mockReturnValue({ open: refine.notification });
  });

  it('fails closed for every guest command before detail, transport, proof, or reread', async () => {
    refine.capabilities = guestActions();
    const { result } = renderHook(() => useNoticeTemplateController());
    act(() => result.current.create());
    await act(async () => {
      await result.current.edit(record);
      await result.current.submit();
      await result.current.remove(record);
      await result.current.retryRecovery();
    });

    expect(result.current.state.draft).toBeNull();
    expect(refine.getOne).not.toHaveBeenCalled();
    expect(refine.custom).not.toHaveBeenCalled();
    expect(refine.update).not.toHaveBeenCalled();
    expect(refine.deleteOne).not.toHaveBeenCalled();
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('admits user create and edit but rejects delete before preflight', async () => {
    refine.capabilities = userActions();
    const { result } = renderHook(() => useNoticeTemplateController());
    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());
    await act(async () => result.current.edit(record));
    await act(async () => result.current.remove(record));

    expect(refine.custom).toHaveBeenCalledOnce();
    expect(refine.getOne).toHaveBeenCalledOnce();
    expect(refine.deleteOne).not.toHaveBeenCalled();
  });

  it('keeps preset edit and delete immutable for an administrator', async () => {
    const { result } = renderHook(() => useNoticeTemplateController());
    await act(async () => {
      await result.current.edit(preset);
      await result.current.remove(preset);
    });

    expect(refine.getOne).not.toHaveBeenCalled();
    expect(refine.deleteOne).not.toHaveBeenCalled();
  });

  it('denies a user retry for retained administrator delete proof before another proof read', async () => {
    refine.getOne
      .mockResolvedValueOnce({ data: record })
      .mockRejectedValueOnce(new NoticeTemplateRequestFailure('unavailable', 'uncertain'));
    const view = renderHook(() => useNoticeTemplateController());
    await act(async () => view.result.current.remove(record));
    expect(view.result.current.state.recovery).toMatchObject({ stage: 'delete-proof' });

    refine.capabilities = userActions();
    act(() => view.rerender());
    expect(view.result.current.state.recovery).toBeNull();
    await act(async () => view.result.current.retryRecovery());

    expect(refine.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('retires a pending detail load so its late response cannot restore a draft', async () => {
    const detail = deferred<{ data: typeof record }>();
    refine.capabilities = userActions();
    refine.getOne.mockReturnValueOnce(detail.promise);
    const view = renderHook(() => useNoticeTemplateController());
    let editPromise: Promise<void> | undefined;
    act(() => {
      editPromise = view.result.current.edit(record);
    });
    await waitFor(() => expect(refine.getOne).toHaveBeenCalledOnce());

    refine.capabilities = guestActions();
    act(() => view.rerender());
    await act(async () => {
      detail.resolve({ data: record });
      await editPromise;
    });

    expect(view.result.current.state.command).toBe('idle');
    expect(view.result.current.state.draft).toBeNull();
    expect(refine.notification).not.toHaveBeenCalled();
  });

  it('retires an active create so its late receipt cannot notify or start a reread', async () => {
    const createReceipt = deferred<{ data: { response: null } }>();
    refine.capabilities = userActions();
    refine.custom.mockReturnValueOnce(createReceipt.promise);
    const view = renderHook(() => useNoticeTemplateController());
    act(() => {
      view.result.current.create();
      view.result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    let submitPromise: Promise<void> | undefined;
    act(() => {
      submitPromise = view.result.current.submit();
    });
    await waitFor(() => expect(refine.custom).toHaveBeenCalledOnce());

    refine.capabilities = guestActions();
    act(() => view.rerender());
    await act(async () => {
      createReceipt.resolve({ data: { response: null } });
      await submitPromise;
    });

    expect(view.result.current.state.command).toBe('idle');
    expect(view.result.current.state.draft).toBeNull();
    expect(view.result.current.state.recovery).toBeNull();
    expect(refine.notification).not.toHaveBeenCalled();
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('retires active update proof so its late result cannot publish success or reread', async () => {
    const proof = deferred<{ data: typeof record }>();
    refine.capabilities = userActions();
    refine.getOne.mockResolvedValueOnce({ data: record }).mockReturnValueOnce(proof.promise);
    const view = renderHook(() => useNoticeTemplateController());
    await act(async () => view.result.current.edit(record));
    act(() => {
      view.result.current.updateDraft({ name: 'Changed' });
    });
    let submitPromise: Promise<void> | undefined;
    act(() => {
      submitPromise = view.result.current.submit();
    });
    await waitFor(() => expect(refine.getOne).toHaveBeenCalledTimes(2));
    expect(view.result.current.state.recovery).toMatchObject({ stage: 'update-proof' });

    refine.capabilities = guestActions();
    act(() => view.rerender());
    await act(async () => {
      proof.resolve({ data: { ...record, name: 'Changed' } });
      await submitPromise;
    });

    expect(view.result.current.state.command).toBe('idle');
    expect(view.result.current.state.draft).toBeNull();
    expect(view.result.current.state.recovery).toBeNull();
    expect(refine.notification).not.toHaveBeenCalled();
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('retires an active projection recovery without hiding the retained preview', async () => {
    const projection = deferred<{ data: { data: (typeof record)[]; total: number }; isError: false }>();
    refine.capabilities = userActions();
    refine.refetch.mockRejectedValueOnce(new NoticeTemplateRequestFailure('unavailable', 'uncertain'));
    const view = renderHook(() => useNoticeTemplateController());
    act(() => {
      view.result.current.setPreview(record);
      view.result.current.create();
      view.result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => view.result.current.submit());
    expect(view.result.current.state.recovery).toMatchObject({ stage: 'projection', action: 'create' });
    const notificationsBeforeRetry = refine.notification.mock.calls.length;

    refine.refetch.mockReturnValueOnce(projection.promise);
    let retryPromise: Promise<void> | undefined;
    act(() => {
      retryPromise = view.result.current.retryRecovery();
    });
    await waitFor(() => expect(refine.refetch).toHaveBeenCalledTimes(2));
    refine.capabilities = guestActions();
    act(() => view.rerender());
    await act(async () => {
      projection.resolve({ data: { data: [record], total: 1 }, isError: false });
      await retryPromise;
    });

    expect(view.result.current.state.command).toBe('idle');
    expect(view.result.current.state.recovery).toBeNull();
    expect(view.result.current.state.preview).toEqual(record);
    expect(refine.notification).toHaveBeenCalledTimes(notificationsBeforeRetry);
    expect(refine.refetch).toHaveBeenCalledTimes(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function userActions() {
  return { canCreate: true, canEdit: true, canDelete: false };
}

function guestActions() {
  return { canCreate: false, canEdit: false, canDelete: false };
}
