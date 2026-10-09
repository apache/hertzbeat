/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogHistoryEvidence } from './explore-signal-contract';

export function projectedLogEvidence(
  window: { from: number; to: number },
  revision: number,
  pageIndex: number,
  page: { totalElements: number; rows: Array<{ log: LogHistoryEvidence['page']['content'][number] }> },
  trend?: {
    window: { start: number; end: number };
    result: { matchingTotal: number; intervalMs: number; buckets: Array<{ start: number; count: number }> };
  }
) {
  const { totalElements, rows } = page;
  return {
    signal: 'logs' as const,
    window,
    revision,
    data: {
      page: {
        content: rows.map(row => row.log),
        totalElements,
        totalPages: Math.ceil(totalElements / 20),
        number: pageIndex,
        size: 20
      },
      overview: trend
        ? { kind: 'count_only' as const, data: { totalCount: trend.result.matchingTotal } }
        : { kind: 'error' as const },
      trend: trend
        ? {
            kind: 'ready' as const,
            data: {
              start: trend.window.start,
              end: trend.window.end,
              intervalMs: trend.result.intervalMs,
              buckets: trend.result.buckets
            }
          }
        : { kind: 'error' as const }
    }
  };
}
