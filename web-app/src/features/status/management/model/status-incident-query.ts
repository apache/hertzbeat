/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export type StatusIncidentQuery = { search: string; pageIndex: number; pageSize: number };

export const statusIncidentPageSizes = [8, 20, 50] as const;

const defaultPageIndex = 0;
const defaultPageSize = statusIncidentPageSizes[0];
const unsignedIntegerPattern = /^(0|[1-9]\d*)$/;

export function readStatusIncidentQuery(params: URLSearchParams): StatusIncidentQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: readUnsignedInteger(params.get('pageIndex'), defaultPageIndex),
    pageSize: readPageSize(params.get('pageSize'))
  };
}

export function writeStatusIncidentQuery(query: StatusIncidentQuery) {
  const canonical = normalizeStatusIncidentQuery(query);
  const params = new URLSearchParams();
  if (canonical.search) params.set('search', canonical.search);
  params.set('pageIndex', String(canonical.pageIndex));
  params.set('pageSize', String(canonical.pageSize));
  return params;
}

export function normalizeStatusIncidentQuery(query: StatusIncidentQuery): StatusIncidentQuery {
  return {
    search: query.search.trim(),
    pageIndex: Number.isSafeInteger(query.pageIndex) && query.pageIndex >= 0
      ? query.pageIndex
      : defaultPageIndex,
    pageSize: isPageSize(query.pageSize) ? query.pageSize : defaultPageSize
  };
}

function readUnsignedInteger(value: string | null, fallback: number) {
  if (value == null || !unsignedIntegerPattern.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function readPageSize(value: string | null) {
  const parsed = readUnsignedInteger(value, defaultPageSize);
  return isPageSize(parsed) ? parsed : defaultPageSize;
}

function isPageSize(value: number) {
  return statusIncidentPageSizes.some(pageSize => pageSize === value);
}
