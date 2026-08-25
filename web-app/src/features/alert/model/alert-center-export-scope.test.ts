/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  alertCenterAllExportQuery,
  collectAlertCenterExportGroups,
  filterAlertGroupsByUpdatedRange
} from './alert-center-export-scope';
import type { AlertGroup, AlertPage, AlertQuery, ServerLocalDateTime } from './alert-model';

const query: AlertQuery = {
  search: 'latency',
  status: 'firing',
  severity: 'critical',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'production',
  pageIndex: 3,
  pageSize: 8
};

describe('Alert Center export scopes', () => {
  it('collects every page in the submitted filter scope with the largest supported page size', async () => {
    const pages = [page([group(1)], 0, 3), page([group(2)], 1, 3), page([group(3)], 2, 3)];
    const load = vi.fn((request: AlertQuery) => Promise.resolve(pages[request.pageIndex] as AlertPage));

    const records = await collectAlertCenterExportGroups(query, load);

    expect(records.map(record => record.id)).toEqual([1, 2, 3]);
    expect(load).toHaveBeenCalledTimes(3);
    expect(load.mock.calls.map(([request]) => request)).toEqual([
      { ...query, pageIndex: 0, pageSize: 25 },
      { ...query, pageIndex: 1, pageSize: 25 },
      { ...query, pageIndex: 2, pageSize: 25 }
    ]);
  });

  it('builds an all-results scope without leaking the current filters', () => {
    expect(alertCenterAllExportQuery()).toEqual({
      search: '',
      status: '',
      severity: '',
      serviceName: '',
      serviceNamespace: '',
      environment: '',
      pageIndex: 0,
      pageSize: 25
    });
  });

  it('filters server-local update timestamps inclusively without parsing them as browser dates', () => {
    const records = [
      group(1, '2026-08-18 09:59:59'),
      group(2, '2026-08-18 10:00:00'),
      group(3, '2026-08-18 12:00:00'),
      group(4, '2026-08-18 12:00:01'),
      group(5, null)
    ];

    expect(
      filterAlertGroupsByUpdatedRange(records, {
        start: '2026-08-18 10:00:00',
        end: '2026-08-18 12:00:00'
      }).map(record => record.id)
    ).toEqual([2, 3]);
  });
});

function page(content: AlertGroup[], number: number, totalPages: number): AlertPage {
  return {
    content,
    totalElements: totalPages,
    totalPages,
    number,
    size: 25
  };
}

function group(id: number, gmtUpdate: string | null = '2026-08-18 10:00:00'): AlertGroup {
  return {
    id,
    status: 'firing',
    groupLabels: { alertname: `Alert ${id}` },
    commonLabels: { severity: 'critical' },
    commonAnnotations: null,
    alertFingerprints: null,
    alerts: [],
    gmtUpdate: gmtUpdate as ServerLocalDateTime | null
  };
}
