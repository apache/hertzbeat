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

import { proveAlertGroupMissing } from './alert-center-delete-proof';

describe('alert center delete proof', () => {
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

    await expect(proveAlertGroupMissing(99)).resolves.toBeUndefined();
    expect(api.loadAlertGroups).toHaveBeenNthCalledWith(1, proofQuery(0));
    expect(api.loadAlertGroups).toHaveBeenNthCalledWith(2, proofQuery(1));
  });

  it('rejects proof while the exact id remains', async () => {
    api.loadAlertGroups.mockResolvedValueOnce(page(0, [group(7)], 1, 1));

    await expect(proveAlertGroupMissing(7)).rejects.toMatchObject({
      name: 'AlertDeleteProofError',
      kind: 'present'
    });
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

function group(id: number): AlertGroup {
  return {
    id,
    status: 'firing',
    groupLabels: null,
    commonLabels: null,
    commonAnnotations: null,
    alertFingerprints: null,
    gmtUpdate: null
  };
}
