/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogTransactionState } from './explore-log-transactions';
import type { LogTransactionsResult, LogTransactionDetailResult } from './explore-log-transactions-result';
import type { LogFilterFailureReason, LogSyntaxDiagnostic } from './explore-log-filter-failure';
type LogTransactionLoad<T> = {
  state:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'
    | 'permission'
    | 'unavailable'
    | 'interval_too_small'
    | 'invalid_filter'
    | 'invalid'
    | 'history_only';
  data: T | undefined;
  invalidFilterReason: LogFilterFailureReason | undefined;
  syntaxDiagnostic: LogSyntaxDiagnostic | undefined;
  retry: () => void;
};
export type LogTransactionsView = LogTransactionLoad<LogTransactionsResult> & {
  owner: string;
  config: LogTransactionState | undefined;
  window: ExactTimeWindow | undefined;
};
export type LogTransactionDetailView = LogTransactionLoad<LogTransactionDetailResult>;
