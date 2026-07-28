/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
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
    view.rerender();
    await act(async () => view.result.current.retryRecovery());

    expect(refine.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).not.toHaveBeenCalled();
  });
});

function userActions() {
  return { canCreate: true, canEdit: true, canDelete: false };
}

function guestActions() {
  return { canCreate: false, canEdit: false, canDelete: false };
}
