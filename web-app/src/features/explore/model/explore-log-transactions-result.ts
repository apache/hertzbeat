/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField } from '@/shared/log-field';
import type { LogRow } from './explore-signal-contract';
import type { LogTransactionState } from './explore-log-transactions';
import type { LOG_SEVERITY_CATEGORIES } from './explore-query';
type LogTransactionItem = {
  identity: string;
  seedCount: number;
  relatedCount: number;
  firstTimeUnixNano: string;
  lastTimeUnixNano: string;
  durationNanos: string;
  maximumSeverity: (typeof LOG_SEVERITY_CATEGORIES)[number] | null;
};
export type LogTransactionsResult = {
  window: { start: number; end: number };
  request: Omit<LogTransactionState, 'field'> & { field: LogFacetField };
  seedLogCount: number;
  usableSeedLogCount: number;
  oversizedSeedLogCount: number;
  otherExcludedSeedLogCount: number;
  transactionCount: number;
  relatedLogCount: number;
  truncated: boolean;
  items: LogTransactionItem[];
};
export type LogTransactionDetailResult = {
  window: { start: number; end: number };
  field: LogFacetField;
  identity: string;
  qualified: boolean;
  total: number | null;
  rows: LogRow[];
  offset: number;
  limit: number;
  sort: 'oldest' | 'newest';
};
