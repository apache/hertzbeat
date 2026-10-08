/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useMemo, useState } from 'react';
import type { ExactTimeWindow } from '@/shared/query-context';
import { timeRangeMilliseconds, type ExploreQuery } from '../model/explore-model';
import type { LogExploreQuery } from '../model/explore-query';
import { useLogTransactions } from './use-log-transactions';
import { useExploreHistory } from './use-explore-history';
function useExploreTransactionSource(
  query: ExploreQuery,
  sharedWindow: ExactTimeWindow | undefined,
  sharedRevision: number,
  enabled: boolean
) {
  const [capture, setCapture] = useState(() => ({ revision: 0, to: Date.now() }));
  const active = query.signal === 'logs' && query.logAggregation === 'transactions';
  const window = useMemo(() => {
    if (query.start !== undefined && query.end !== undefined) return { from: query.start, to: query.end };
    const to = sharedWindow?.to ?? capture.to;
    return { from: to - timeRangeMilliseconds(query.timeRange), to };
  }, [query, sharedWindow?.to, capture.to]);
  const load = useLogTransactions(
    query as LogExploreQuery,
    window,
    capture.revision + sharedRevision,
    enabled && active
  );
  return {
    ...load,
    active,
    refresh: () => {
      setCapture(value => ({ revision: value.revision + 1, to: Date.now() }));
      return Promise.resolve();
    }
  };
}
export function useExploreSignalSources(
  query: ExploreQuery,
  window: ExactTimeWindow | undefined,
  revision: number,
  historical: boolean,
  focused: boolean
) {
  const transactions = useExploreTransactionSource(query, window, revision, historical);
  const history = useExploreHistory(query, window, historical && !transactions.active, revision, focused);
  return { ...history, transactions };
}
