/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AlertGroup, AlertPage, AlertQuery } from '../model/alert-model';

const api = vi.hoisted(() => ({ loadAlertGroups: vi.fn() }));
vi.mock('../api/alert-api', () => ({ loadAlertGroups: api.loadAlertGroups }));

import { proveAlertGroupsMissing, proveAlertGroupsStatus } from './alert-center-operation-proof';

describe('alert center operation proof', () => {
  beforeEach(() => vi.resetAllMocks());

  it('scans the unfiltered canonical collection before proving an id missing', async () => {
    api.loadAlertGroups
      .mockResolvedValueOnce(
        page(
          0,
          Array.from({ length: 25 }, (_value, index) => group(index + 1)),
          26,
          2
        )
      )
      .mockResolvedValueOnce(page(1, [group(26)], 26, 2));

    await expect(proveAlertGroupsMissing([98, 99])).resolves.toBeUndefined();
    expect(api.loadAlertGroups).toHaveBeenNthCalledWith(1, proofQuery(0));
    expect(api.loadAlertGroups).toHaveBeenNthCalledWith(2, proofQuery(1));
  });

  it('rejects proof while the exact id remains', async () => {
    api.loadAlertGroups.mockResolvedValueOnce(page(0, [group(7)], 1, 1));

    await expect(proveAlertGroupsMissing([7])).rejects.toMatchObject({
      name: 'AlertCenterProofError',
      kind: 'present'
    });
  });

  it('requires every exact id to converge to the requested status', async () => {
    api.loadAlertGroups.mockResolvedValueOnce(page(0, [group(7, 'resolved'), group(9, 'resolved')], 2, 1));
    await expect(proveAlertGroupsStatus([9, 7], 'resolved')).resolves.toBeUndefined();

    api.loadAlertGroups.mockResolvedValueOnce(page(0, [group(7, 'resolved')], 1, 1));
    await expect(proveAlertGroupsStatus([7, 9], 'resolved')).rejects.toMatchObject({ kind: 'missing' });

    api.loadAlertGroups.mockResolvedValueOnce(page(0, [group(7, 'firing')], 1, 1));
    await expect(proveAlertGroupsStatus([7], 'resolved')).rejects.toMatchObject({ kind: 'mismatch' });
  });
});

function proofQuery(pageIndex: number): AlertQuery {
  return {
    search: '',
    status: '',
    severity: '',
    serviceName: '',
    serviceNamespace: '',
    environment: '',
    pageIndex,
    pageSize: 25
  };
}

function page(pageIndex: number, content: AlertGroup[], totalElements: number, totalPages: number): AlertPage {
  return { content, totalElements, totalPages, number: pageIndex, size: 25 };
}

function group(id: number, status: AlertGroup['status'] = 'firing'): AlertGroup {
  return {
    id,
    status,
    groupLabels: null,
    commonLabels: null,
    commonAnnotations: null,
    alertFingerprints: null,
    alerts: [],
    gmtUpdate: null
  };
}
