/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const alertRulePageSizes = [8, 15, 25] as const;

export type AlertRuleQuery = { search: string; pageIndex: number; pageSize: number };

export function readAlertRuleQuery(params: URLSearchParams): AlertRuleQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize: alertRulePageSizes.includes(pageSize as (typeof alertRulePageSizes)[number]) ? pageSize : 8
  };
}

export function writeAlertRuleQuery(query: AlertRuleQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  return params;
}
