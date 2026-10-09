/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogSubquery } from '../model/explore-log-subquery';

type Request<Operation> = {
  version: 1;
  parameters: Record<string, string>;
  subquery: LogSubquery;
  operation: Operation;
};
export type SubqueryPageRequest = Request<{
  kind: 'page';
  pageIndex: number;
  pageSize: number;
  sort: { field: string; direction: 'asc' | 'desc'; type?: 'number' | 'text' | undefined };
}>;
export type SubqueryTrendRequest = Request<{ kind: 'trend'; intervalMs: number }>;
export type SubqueryFacetRequest = Request<{
  kind: 'facet';
  field: string;
  limit: number;
  valueSearch?: string | undefined;
}>;
export type SubqueryAnalysisRequest = Request<{
  kind: 'analysis';
  view: 'timeseries';
  grouping: Array<{ field: string; limit: number }>;
  measure: { function: string; field: string } | null;
  limit: number;
  order: 'count-asc' | 'count-desc' | 'measure-asc' | 'measure-desc';
  minCount: number;
  intervalMs: number;
}>;
