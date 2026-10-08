/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExploreQuery } from './explore-query';
import type { LogExploreQuery } from './explore-query';
import { validLogCalculatedV2Query } from './explore-log-calculated-v2';
import { readLogSort } from './explore-log-order';

export function validLogPanelQuery(query: LogExploreQuery, analytical: boolean) {
  return !(
    (query.logCalculatedV2 !== undefined && (analytical || !validLogCalculatedV2Query(query))) ||
    query.logRecordUid ||
    query.live ||
    (query.logSort !== undefined && !readLogSort(query.logSort))
  );
}

export function blockedHandoffMode(query: ExploreQuery) {
  if (query.signal === 'traces' && query.traceStructure !== undefined)
    return { state: 'unsupported' as const, reason: 'trace-structure' as const };
  if (query.signal !== 'logs') return undefined;
  if (query.logSubquery !== undefined) return { state: 'unsupported' as const, reason: 'log-subquery' as const };
  if (query.logAggregation === 'transactions')
    return { state: 'unsupported' as const, reason: 'log-transactions' as const };
  if (query.logAggregation === 'patterns') return { state: 'unsupported' as const, reason: 'log-patterns' as const };
  if (query.logAggregation === 'calculated')
    return { state: 'unsupported' as const, reason: 'log-calculated' as const };
  return undefined;
}
