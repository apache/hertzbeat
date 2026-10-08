/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { parseLogTransactions } from '../model/explore-log-transactions';
import { buildLogTransactionsPath, loadLogTransactions } from '../api/explore-log-transactions-api';
import { transactionLoadState } from './log-transaction-load-state';
import { exploreQueryKeys } from './explore-query-keys';
export function useLogTransactions(
  query: LogExploreQuery,
  window: ExactTimeWindow | undefined,
  revision: number,
  enabled: boolean
) {
  const selected = query.logAggregation === 'transactions';
  const config = parseLogTransactions(query.logTransactions);
  const valid = Boolean(config && transactionWindowValid(window) && !query.live);
  const active = enabled && selected && valid;
  const path = active ? buildLogTransactionsPath(query, window!, config!) : '';
  const result = useQuery({
    queryKey: exploreQueryKeys.logTransactions(path, revision),
    enabled: active,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogTransactions(path, window!, config!, signal)
  });
  const load = transactionLoadState(result, active, query.query, query.searchSyntax);
  return {
    ...load,
    state: transactionState(selected, Boolean(config), valid, load.state),
    data: active && !result.isFetching && !result.isError ? result.data : undefined,
    owner: path,
    config,
    window,
    retry: () => {
      if (active) void result.refetch();
    }
  };
}

function transactionWindowValid(window: ExactTimeWindow | undefined) {
  return window !== undefined && window.to > window.from && window.to - window.from <= 86_400_000;
}

function transactionState(
  selected: boolean,
  configured: boolean,
  valid: boolean,
  state: ReturnType<typeof transactionLoadState>['state']
) {
  if (!selected) return state;
  if (!configured) return 'invalid' as const;
  return valid ? state : ('history_only' as const);
}
