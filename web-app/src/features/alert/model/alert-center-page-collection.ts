/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { alertPageSizes, type AlertGroup, type AlertPage, type AlertQuery } from './alert-model';

type AlertCenterPageLoader = (query: AlertQuery, signal?: AbortSignal) => Promise<AlertPage>;

const collectionPageSize = Math.max(...alertPageSizes);

export class AlertCenterCollectionLimitError extends Error {
  constructor(readonly limit: number) {
    super('Alert Center collection exceeds its verified operation limit');
    this.name = 'AlertCenterCollectionLimitError';
  }
}

/** Reads the complete submitted query scope while preserving its filters and enforcing an optional hard limit. */
export async function collectAlertCenterGroups(
  query: AlertQuery,
  load: AlertCenterPageLoader,
  signal?: AbortSignal,
  limit?: number
) {
  const firstQuery = { ...query, pageIndex: 0, pageSize: collectionPageSize };
  const firstPage = await load(firstQuery, signal);
  enforceLimit(firstPage.totalElements, limit);
  const groups = [...firstPage.content];
  // Read sequentially to avoid burst-loading an unbounded export scope and to observe cancellation between pages.
  for (let pageIndex = 1; pageIndex < firstPage.totalPages; pageIndex += 1) {
    const page = await load({ ...firstQuery, pageIndex }, signal);
    groups.push(...page.content);
    enforceLimit(groups.length, limit);
  }
  return uniqueAlertGroups(groups);
}

export function alertCenterUnfilteredQuery(): AlertQuery {
  return {
    search: '',
    status: '',
    severity: '',
    serviceName: '',
    serviceNamespace: '',
    environment: '',
    pageIndex: 0,
    pageSize: collectionPageSize
  };
}

function enforceLimit(count: number, limit: number | undefined) {
  if (limit !== undefined && count > limit) throw new AlertCenterCollectionLimitError(limit);
}

function uniqueAlertGroups(groups: readonly AlertGroup[]) {
  const seen = new Set<number>();
  return groups.filter(group => {
    if (seen.has(group.id)) return false;
    seen.add(group.id);
    return true;
  });
}
