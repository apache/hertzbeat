/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export function readZeroBasedPage<S extends number>(
  params: URLSearchParams,
  pageSizes: readonly S[],
  defaultPageSize: S
) {
  return {
    pageIndex: readNonNegativeInteger(params.get('pageIndex')) ?? 0,
    pageSize: readMember(params.get('pageSize'), pageSizes) ?? defaultPageSize
  };
}

export function writeZeroBasedPage(pageIndex: number, pageSize: number, params = new URLSearchParams()) {
  params.set('pageIndex', String(pageIndex));
  params.set('pageSize', String(pageSize));
  return params;
}

export function zeroBasedPageChange(page: number, pageSize: number, currentPageSize: number) {
  return { pageIndex: pageSize === currentPageSize ? Math.max(0, page - 1) : 0, pageSize };
}

function readNonNegativeInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function readMember<S extends number>(value: string | null, members: readonly S[]) {
  const parsed = readNonNegativeInteger(value);
  return parsed !== undefined && members.includes(parsed as S) ? (parsed as S) : undefined;
}
