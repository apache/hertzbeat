/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { readZeroBasedPage, writeZeroBasedPage } from '@/shared/query-context';

export const collectorPageSizes = [8, 15, 25] as const;
export type CollectorPageSize = (typeof collectorPageSizes)[number];
export type CollectorQuery = { name: string; pageIndex: number; pageSize: CollectorPageSize };
export type CollectorDeletePageReceipt = { query: CollectorQuery; visibleRecords: number };

const defaultCollectorQuery: CollectorQuery = { name: '', pageIndex: 0, pageSize: 8 };

export function readCollectorQuery(params: URLSearchParams): CollectorQuery {
  return {
    name: params.get('name')?.trim() ?? '',
    ...readZeroBasedPage(params, collectorPageSizes, defaultCollectorQuery.pageSize)
  };
}

export function writeCollectorQuery(query: CollectorQuery) {
  const canonical = readCollectorQuery(
    new URLSearchParams({
      name: query.name,
      pageIndex: String(query.pageIndex),
      pageSize: String(query.pageSize)
    })
  );
  const params = writeZeroBasedPage(canonical.pageIndex, canonical.pageSize);
  if (canonical.name) params.set('name', canonical.name);
  return params;
}

export function collectorQueryAfterConfirmedDelete(
  current: CollectorQuery,
  receipt: CollectorDeletePageReceipt,
  deletedRecords = 1
) {
  if (
    !sameCollectorQuery(current, receipt.query) ||
    current.pageIndex === 0 ||
    receipt.visibleRecords !== deletedRecords
  ) {
    return undefined;
  }
  return { ...current, pageIndex: current.pageIndex - 1 };
}

export function sameCollectorQuery(left: CollectorQuery, right: CollectorQuery) {
  return left.name === right.name && left.pageIndex === right.pageIndex && left.pageSize === right.pageSize;
}
