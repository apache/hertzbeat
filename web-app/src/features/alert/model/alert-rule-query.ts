/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { compactTablePageSizes } from '@/shared/pagination';
import { readZeroBasedPage, writeZeroBasedPage } from '@/shared/query-context';

export const alertRulePageSizes = compactTablePageSizes;

export type AlertRuleQuery = { search: string; pageIndex: number; pageSize: number };

export function readAlertRuleQuery(params: URLSearchParams): AlertRuleQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    ...readZeroBasedPage(params, alertRulePageSizes, 8)
  };
}

export function writeAlertRuleQuery(query: AlertRuleQuery) {
  const params = writeZeroBasedPage(query.pageIndex, query.pageSize);
  if (query.search) params.set('search', query.search);
  return params;
}
