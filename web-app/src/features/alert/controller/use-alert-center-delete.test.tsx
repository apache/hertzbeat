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
  proveAlertGroupMissing: vi.fn()
}));
vi.mock('../api/alert-api', () => ({ deleteAlertGroups: operations.deleteAlertGroups }));
vi.mock('./alert-center-delete-proof', async importOriginal => ({
  ...(await importOriginal<typeof import('./alert-center-delete-proof')>()),
  proveAlertGroupMissing: operations.proveAlertGroupMissing
}));

import { AlertDeleteProofError } from './alert-center-delete-proof';
import { useAlertCenterDelete } from './use-alert-center-delete';

describe('alert center delete command', () => {
  const reread = vi.fn();
  const success = vi.fn();
  const failure = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    operations.deleteAlertGroups.mockResolvedValue(undefined);
    operations.proveAlertGroupMissing.mockResolvedValue(undefined);
    reread.mockResolvedValue(undefined);
  });

  it('reports success only after write, exact proof, and current-list projection', async () => {
    const hook = renderDelete();

    await act(async () => hook.result.current.remove(7));

    expect(operations.deleteAlertGroups).toHaveBeenCalledWith([7]);
    expect(operations.proveAlertGroupMissing).toHaveBeenCalledWith(7);
    expect(reread).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledTimes(1);
    expect(hook.result.current).toMatchObject({ command: 'idle', recovery: null });
  });

  it('retries proof without repeating an uncertain delete write', async () => {
    operations.deleteAlertGroups.mockRejectedValueOnce(new AlertRequestFailure('unavailable', 'uncertain'));
    const hook = renderDelete();

    await act(async () => hook.result.current.remove(7));
    expect(hook.result.current.recovery).toMatchObject({ id: 7, phase: 'proof', failure: 'unavailable' });

    await act(async () => hook.result.current.retry());
    expect(operations.deleteAlertGroups).toHaveBeenCalledTimes(1);
    expect(operations.proveAlertGroupMissing).toHaveBeenCalledWith(7);
    expect(reread).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('retries only projection after an acknowledged delete proof', async () => {
    reread.mockRejectedValueOnce(new AlertRequestFailure('unavailable')).mockResolvedValueOnce(undefined);
    const hook = renderDelete();

    await act(async () => hook.result.current.remove(7));
    expect(hook.result.current.recovery).toMatchObject({ id: 7, phase: 'projection' });

    await act(async () => hook.result.current.retry());
    expect(operations.deleteAlertGroups).toHaveBeenCalledTimes(1);
    expect(operations.proveAlertGroupMissing).toHaveBeenCalledTimes(1);
    expect(reread).toHaveBeenCalledTimes(2);
  });

  it('releases a definitely rejected write so a corrected action may try again', async () => {
    operations.deleteAlertGroups
      .mockRejectedValueOnce(new AlertRequestFailure('error', 'rejected'))
      .mockResolvedValueOnce(undefined);
    const hook = renderDelete();

    await act(async () => hook.result.current.remove(7));
    expect(hook.result.current.recovery).toBeNull();

    await act(async () => hook.result.current.remove(7));
    expect(operations.deleteAlertGroups).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('releases the receipt when proof shows the group still exists', async () => {
    operations.proveAlertGroupMissing
      .mockRejectedValueOnce(new AlertDeleteProofError('present'))
      .mockResolvedValueOnce(undefined);
    const hook = renderDelete();

    await act(async () => hook.result.current.remove(7));
    expect(hook.result.current.recovery).toBeNull();

    await act(async () => hook.result.current.remove(7));
    expect(operations.deleteAlertGroups).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(1);
  });

  function renderDelete() {
    return renderHook(() => useAlertCenterDelete({ reread, success, failure }));
  }
});
