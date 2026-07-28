/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertContractError, AlertRequestFailure } from '../model/alert-model';

const api = vi.hoisted(() => ({ loadAlertGroupEvidence: vi.fn() }));
vi.mock('../api/alert-api', () => ({ loadAlertGroupEvidence: api.loadAlertGroupEvidence }));

import { proveAlertGroupsMissing, proveAlertGroupsStatus } from './alert-center-operation-proof';

describe('alert center operation proof', () => {
  beforeEach(() => vi.resetAllMocks());

  it('proves exact deletion from one evidence request', async () => {
    api.loadAlertGroupEvidence.mockResolvedValue({
      groups: [],
      missingIds: [7, 9],
      observedAt: 1_785_000_000_000
    });

    await expect(proveAlertGroupsMissing([9, 7, 9])).resolves.toBeUndefined();
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledOnce();
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledWith([7, 9]);
  });

  it('rejects delete proof while any exact id remains', async () => {
    api.loadAlertGroupEvidence.mockResolvedValue({
      groups: [{ id: 7, status: 'resolved' }],
      missingIds: [9],
      observedAt: 1_785_000_000_000
    });

    await expect(proveAlertGroupsMissing([7, 9])).rejects.toMatchObject({
      name: 'AlertCenterProofError',
      kind: 'present'
    });
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledOnce();
  });

  it('requires every exact id to be present at the requested status in one snapshot', async () => {
    api.loadAlertGroupEvidence.mockResolvedValueOnce({
      groups: [
        { id: 7, status: 'resolved' },
        { id: 9, status: 'resolved' }
      ],
      missingIds: [],
      observedAt: 1_785_000_000_000
    });
    await expect(proveAlertGroupsStatus([9, 7], 'resolved')).resolves.toBeUndefined();
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledOnce();

    api.loadAlertGroupEvidence.mockResolvedValueOnce({
      groups: [{ id: 7, status: 'resolved' }],
      missingIds: [9],
      observedAt: 1_785_000_000_001
    });
    await expect(proveAlertGroupsStatus([7, 9], 'resolved')).rejects.toMatchObject({ kind: 'missing' });

    api.loadAlertGroupEvidence.mockResolvedValueOnce({
      groups: [
        { id: 7, status: 'resolved' },
        { id: 9, status: 'pending' }
      ],
      missingIds: [],
      observedAt: 1_785_000_000_002
    });
    await expect(proveAlertGroupsStatus([7, 9], 'resolved')).rejects.toMatchObject({ kind: 'mismatch' });
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['permission', new AlertRequestFailure('permission', 'rejected')],
    ['unavailable', new AlertRequestFailure('unavailable')],
    ['invalid', new AlertContractError('invalid evidence')]
  ])('preserves %s evidence failure without a second request', async (_label, failure) => {
    api.loadAlertGroupEvidence.mockRejectedValue(failure);

    await expect(proveAlertGroupsStatus([7], 'resolved')).rejects.toBe(failure);
    expect(api.loadAlertGroupEvidence).toHaveBeenCalledOnce();
  });

  it('rejects more than 100 proof ids before requesting evidence', async () => {
    const ids = Array.from({ length: 101 }, (_value, index) => index + 1);

    await expect(proveAlertGroupsMissing(ids)).rejects.toBeInstanceOf(AlertContractError);
    expect(api.loadAlertGroupEvidence).not.toHaveBeenCalled();
  });
});
