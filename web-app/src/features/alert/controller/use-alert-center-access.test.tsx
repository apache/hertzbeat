/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlertGroupTargetStatus } from '../model/alert-model';

const capability = vi.hoisted(() => ({ useAlertCapabilities: vi.fn() }));
const operation = vi.hoisted(() => ({
  command: 'idle',
  recovery: null as null | { kind: 'delete' | 'status' },
  remove: vi.fn<(ids: number[]) => Promise<boolean>>(),
  retireRecovery: vi.fn(),
  retry: vi.fn<() => Promise<boolean>>(),
  updateStatus: vi.fn<(ids: number[], status: AlertGroupTargetStatus) => Promise<boolean>>()
}));
const reads = vi.hoisted(() => ({
  refetchList: vi.fn(),
  refetchSummary: vi.fn(),
  refresh: vi.fn()
}));
const evidence = vi.hoisted(() => ({
  page: {
    content: [
      {
        id: 7,
        status: 'firing',
        groupLabels: null,
        commonLabels: null,
        commonAnnotations: null,
        alertFingerprints: null,
        alerts: [],
        gmtUpdate: null
      }
    ],
    totalElements: 1
  },
  summary: {
    total: 1,
    dealNum: 0,
    rate: 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  }
}));
vi.mock('./use-alert-capabilities', () => capability);
vi.mock('./use-alert-center-operation-controller', () => ({
  useAlertCenterOperationController: () => operation
}));
vi.mock('./use-alert-center-data', () => ({
  useAlertCenterData: () => ({
    list: {
      data: evidence.page,
      error: null,
      isError: false,
      isFetching: false,
      isPending: false
    },
    summary: {
      data: evidence.summary,
      error: null,
      isError: false,
      isFetching: false,
      isPending: false
    },
    ...reads
  })
}));
vi.mock('./use-alert-center-page-correction', () => ({ useAlertCenterPageCorrection: vi.fn() }));

import { useAlertCenterController } from './use-alert-center-controller';

describe('useAlertCenterController action access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evidence.page.content = [
      {
        id: 7,
        status: 'firing',
        groupLabels: null,
        commonLabels: null,
        commonAnnotations: null,
        alertFingerprints: null,
        alerts: [],
        gmtUpdate: null
      }
    ];
    evidence.page.totalElements = 1;
    operation.command = 'idle';
    operation.recovery = null;
    operation.remove.mockResolvedValue(true);
    operation.retry.mockResolvedValue(true);
    operation.updateStatus.mockResolvedValue(true);
  });
  afterEach(cleanup);

  it('keeps guest reads available while selection, row, bulk, and retry commands fail closed', async () => {
    capability.useAlertCapabilities.mockReturnValue(guestCapabilities);
    operation.recovery = { kind: 'status' };
    const view = renderController();

    act(() => view.result.current.selectIds([7]));
    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolveSelected();
      await view.result.current.remove({ id: 7 });
      await view.result.current.removeSelected();
      await view.result.current.retryOperation();
    });

    expect(view.result.current.state.list.kind).toBe('ready');
    expect(view.result.current.state.selectedIds).toEqual([]);
    expect(operation.updateStatus).not.toHaveBeenCalled();
    expect(operation.remove).not.toHaveBeenCalled();
    expect(operation.retry).not.toHaveBeenCalled();
  });

  it('admits user status selection, row/bulk commands, and status recovery but not delete', async () => {
    capability.useAlertCapabilities.mockReturnValue(userCapabilities);
    operation.recovery = { kind: 'status' };
    const view = renderController();

    act(() => view.result.current.selectIds([7]));
    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolveSelected();
      await view.result.current.remove({ id: 7 });
      await view.result.current.removeSelected();
      await view.result.current.retryOperation();
    });

    expect(view.result.current.state.selectedIds).toEqual([7]);
    expect(operation.updateStatus).toHaveBeenCalledTimes(2);
    expect(operation.remove).not.toHaveBeenCalled();
    expect(operation.retry).toHaveBeenCalledOnce();
  });

  it('admits administrator row/bulk delete and delete recovery', async () => {
    capability.useAlertCapabilities.mockReturnValue(adminCapabilities);
    operation.recovery = { kind: 'delete' };
    const view = renderController();
    act(() => view.result.current.selectIds([7]));

    await act(async () => {
      await view.result.current.remove({ id: 7 });
      await view.result.current.removeSelected();
      await view.result.current.retryOperation();
    });

    expect(operation.remove).toHaveBeenNthCalledWith(1, [7]);
    expect(operation.remove).toHaveBeenNthCalledWith(2, [7]);
    expect(operation.retry).toHaveBeenCalledOnce();
  });

  it('keeps user delete recovery inert', async () => {
    capability.useAlertCapabilities.mockReturnValue(userCapabilities);
    operation.recovery = { kind: 'delete' };
    const view = renderController();

    await act(() => view.result.current.retryOperation());

    expect(operation.retry).not.toHaveBeenCalled();
  });

  it('rechecks every row command against the current visible authoritative group', async () => {
    capability.useAlertCapabilities.mockReturnValue(adminCapabilities);
    const view = renderController();

    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolve({ id: 7 });
      await view.result.current.reopen({ id: 7 });
      await view.result.current.unacknowledge({ id: 7 });
      await view.result.current.remove({ id: 7 });
    });
    expect(operation.updateStatus.mock.calls.map(call => call.slice(0, 2))).toEqual([
      [[7], 'acknowledged'],
      [[7], 'resolved']
    ]);
    expect(operation.remove).toHaveBeenCalledWith([7]);

    vi.clearAllMocks();
    evidence.page.content[0]!.status = 'acknowledged';
    view.rerender();
    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolve({ id: 7 });
      await view.result.current.reopen({ id: 7 });
      await view.result.current.unacknowledge({ id: 7 });
    });
    expect(operation.updateStatus.mock.calls.map(call => call.slice(0, 2))).toEqual([
      [[7], 'resolved'],
      [[7], 'firing']
    ]);

    vi.clearAllMocks();
    evidence.page.content[0]!.status = 'resolved';
    view.rerender();
    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolve({ id: 7 });
      await view.result.current.reopen({ id: 7 });
      await view.result.current.unacknowledge({ id: 7 });
    });
    expect(operation.updateStatus.mock.calls.map(call => call.slice(0, 2))).toEqual([[[7], 'firing']]);

    vi.clearAllMocks();
    evidence.page.content[0]!.status = 'pending';
    view.rerender();
    await act(async () => {
      await view.result.current.acknowledge({ id: 7 });
      await view.result.current.resolve({ id: 7 });
      await view.result.current.reopen({ id: 7 });
      await view.result.current.unacknowledge({ id: 7 });
    });
    expect(operation.updateStatus).not.toHaveBeenCalled();

    vi.clearAllMocks();
    evidence.page.content = [];
    evidence.page.totalElements = 0;
    view.rerender();
    await act(async () => {
      await view.result.current.resolve({ id: 7 });
      await view.result.current.remove({ id: 7 });
    });
    expect(operation.updateStatus).not.toHaveBeenCalled();
    expect(operation.remove).not.toHaveBeenCalled();
  });

  it('retires inaccessible recovery after permission loss without retrying or replaying a write', () => {
    capability.useAlertCapabilities.mockReturnValue(userCapabilities);
    operation.recovery = { kind: 'status' };
    const view = renderController();
    expect(operation.retireRecovery).not.toHaveBeenCalled();

    capability.useAlertCapabilities.mockReturnValue(guestCapabilities);
    view.rerender();

    expect(operation.retireRecovery).toHaveBeenCalledOnce();
    expect(operation.retry).not.toHaveBeenCalled();
    expect(operation.updateStatus).not.toHaveBeenCalled();
    expect(operation.remove).not.toHaveBeenCalled();
  });

  it('clears internal selection on permission loss so it cannot reappear after restoration', () => {
    capability.useAlertCapabilities.mockReturnValue(userCapabilities);
    const view = renderController();
    act(() => view.result.current.selectIds([7]));
    expect(view.result.current.state.selectedIds).toEqual([7]);

    capability.useAlertCapabilities.mockReturnValue(guestCapabilities);
    view.rerender();
    expect(view.result.current.state.selectedIds).toEqual([]);

    capability.useAlertCapabilities.mockReturnValue(userCapabilities);
    view.rerender();
    expect(view.result.current.state.selectedIds).toEqual([]);
  });
});

const guestCapabilities = { canUpdateStatus: false, canDeleteGroups: false, canSelect: false };
const userCapabilities = { canUpdateStatus: true, canDeleteGroups: false, canSelect: true };
const adminCapabilities = { canUpdateStatus: true, canDeleteGroups: true, canSelect: true };

function renderController() {
  return renderHook(() => useAlertCenterController(), { wrapper: AlertCenterTestRouter });
}

function AlertCenterTestRouter({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={['/alerts']}>{children}</MemoryRouter>;
}
