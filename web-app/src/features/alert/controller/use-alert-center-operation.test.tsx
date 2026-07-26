/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertRequestFailure } from '../model/alert-model';

const operations = vi.hoisted(() => ({
  deleteAlertGroups: vi.fn(),
  proveAlertGroupsMissing: vi.fn(),
  proveAlertGroupsStatus: vi.fn(),
  updateAlertGroupStatus: vi.fn()
}));
vi.mock('../api/alert-api', () => ({
  deleteAlertGroups: operations.deleteAlertGroups,
  updateAlertGroupStatus: operations.updateAlertGroupStatus
}));
vi.mock('./alert-center-operation-proof', async importOriginal => ({
  ...(await importOriginal<typeof import('./alert-center-operation-proof')>()),
  proveAlertGroupsMissing: operations.proveAlertGroupsMissing,
  proveAlertGroupsStatus: operations.proveAlertGroupsStatus
}));

import { AlertCenterProofError } from './alert-center-operation-proof';
import { useAlertCenterOperation } from './use-alert-center-operation';

describe('alert center operation command', () => {
  const reread = vi.fn();
  const success = vi.fn();
  const failure = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    operations.deleteAlertGroups.mockResolvedValue(undefined);
    operations.updateAlertGroupStatus.mockResolvedValue(undefined);
    operations.proveAlertGroupsMissing.mockResolvedValue(undefined);
    operations.proveAlertGroupsStatus.mockResolvedValue(undefined);
    reread.mockResolvedValue(undefined);
  });

  it('reports batch delete success only after write, exact proof, and projection', async () => {
    const hook = renderOperation();

    await act(async () => hook.result.current.remove([9, 7, 9]));

    expect(operations.deleteAlertGroups).toHaveBeenCalledWith([7, 9]);
    expect(operations.proveAlertGroupsMissing).toHaveBeenCalledWith([7, 9]);
    expect(reread).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toMatchObject({ command: 'idle', recovery: null });
  });

  it('runs status commands through the same gate and proves their exact target state', async () => {
    const hook = renderOperation();

    await act(async () => hook.result.current.updateStatus([9, 7], 'resolved'));

    expect(operations.updateAlertGroupStatus).toHaveBeenCalledWith([7, 9], 'resolved');
    expect(operations.proveAlertGroupsStatus).toHaveBeenCalledWith([7, 9], 'resolved');
    expect(success).toHaveBeenCalledWith(expect.objectContaining({ kind: 'status', status: 'resolved' }));
  });

  it('does not start a second command while the first command owns the gate', async () => {
    const write = deferred<void>();
    operations.deleteAlertGroups.mockReturnValueOnce(write.promise);
    const hook = renderOperation();

    let deleting!: Promise<boolean>;
    let resolving!: Promise<boolean>;
    act(() => {
      deleting = hook.result.current.remove([7]);
      resolving = hook.result.current.updateStatus([7], 'resolved');
    });

    await expect(resolving).resolves.toBe(false);
    expect(operations.updateAlertGroupStatus).not.toHaveBeenCalled();

    write.resolve();
    await act(async () => deleting);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('retries proof without repeating an uncertain write', async () => {
    operations.updateAlertGroupStatus.mockRejectedValueOnce(new AlertRequestFailure('unavailable', 'uncertain'));
    const hook = renderOperation();

    await act(async () => hook.result.current.updateStatus([7], 'firing'));
    expect(hook.result.current.recovery).toMatchObject({
      ids: [7],
      kind: 'status',
      phase: 'proof',
      status: 'firing',
      failure: 'unavailable'
    });

    await act(async () => hook.result.current.retry());
    expect(operations.updateAlertGroupStatus).toHaveBeenCalledTimes(1);
    expect(operations.proveAlertGroupsStatus).toHaveBeenCalledWith([7], 'firing');
    expect(reread).toHaveBeenCalledTimes(1);
  });

  it('retries only projection after acknowledged proof', async () => {
    reread.mockRejectedValueOnce(new AlertRequestFailure('unavailable')).mockResolvedValueOnce(undefined);
    const hook = renderOperation();

    await act(async () => hook.result.current.remove([7]));
    expect(hook.result.current.recovery).toMatchObject({ ids: [7], phase: 'projection' });

    await act(async () => hook.result.current.retry());
    expect(operations.deleteAlertGroups).toHaveBeenCalledTimes(1);
    expect(operations.proveAlertGroupsMissing).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(2);
  });

  it('releases a rejected or disproven receipt so an explicit corrected action may run', async () => {
    operations.deleteAlertGroups.mockRejectedValueOnce(new AlertRequestFailure('error', 'rejected'));
    const hook = renderOperation();

    await act(async () => hook.result.current.remove([7]));
    expect(hook.result.current.recovery).toBeNull();

    operations.proveAlertGroupsStatus.mockRejectedValueOnce(new AlertCenterProofError('mismatch'));
    await act(async () => hook.result.current.updateStatus([7], 'resolved'));
    expect(hook.result.current.recovery).toBeNull();

    await act(async () => hook.result.current.updateStatus([7], 'firing'));
    expect(operations.updateAlertGroupStatus).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(1);
  });

  function renderOperation() {
    return renderHook(() => useAlertCenterOperation({ reread, success, failure }));
  }
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
