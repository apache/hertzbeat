/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { AlertCenterCollectionLimitError, collectAlertCenterGroups } from './alert-center-page-collection';
import type { AlertGroup, AlertPage, AlertQuery } from './alert-model';

const query: AlertQuery = {
  search: 'submitted',
  status: 'firing',
  severity: 'critical',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'production',
  pageIndex: 3,
  pageSize: 8
};

describe('Alert Center page collection', () => {
  it('collects every validated page without changing the submitted filter scope', async () => {
    const pages = [page([group(1)], 0, 2, 2), page([group(2)], 1, 2, 2)];
    const load = vi.fn((request: AlertQuery) => Promise.resolve(pages[request.pageIndex] as AlertPage));

    const records = await collectAlertCenterGroups(query, load);

    expect(records.map(record => record.id)).toEqual([1, 2]);
    expect(load.mock.calls.map(([request]) => request)).toEqual([
      { ...query, pageIndex: 0, pageSize: 25 },
      { ...query, pageIndex: 1, pageSize: 25 }
    ]);
  });

  it('rejects an oversized scope after the first page instead of returning a partial batch', async () => {
    const load = vi.fn(() => Promise.resolve(page([group(1)], 0, 5, 101)));

    await expect(collectAlertCenterGroups(query, load, undefined, 100)).rejects.toBeInstanceOf(
      AlertCenterCollectionLimitError
    );
    expect(load).toHaveBeenCalledOnce();
  });
});

function page(content: AlertGroup[], number: number, totalPages: number, totalElements: number): AlertPage {
  return { content, totalElements, totalPages, number, size: 25 };
}

function group(id: number): AlertGroup {
  return {
    id,
    status: 'firing',
    groupLabels: { alertname: `Alert ${id}` },
    commonLabels: { severity: 'critical' },
    commonAnnotations: null,
    alertFingerprints: null,
    alerts: [],
    gmtUpdate: null
  };
}
