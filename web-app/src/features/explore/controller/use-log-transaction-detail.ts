/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import type { LogTransactionState } from '../model/explore-log-transactions';
import {
  buildLogTransactionDetailPath,
  loadLogTransactionDetail,
  type LogTransactionDetailQuery
} from '../api/explore-log-transactions-api';
import { exploreQueryKeys } from './explore-query-keys';
import { transactionLoadState } from './log-transaction-load-state';
export function useLogTransactionDetail(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  config: LogTransactionState,
  detail: LogTransactionDetailQuery,
  enabled: boolean
) {
  const path = enabled ? buildLogTransactionDetailPath(query, window, config, detail) : '';
  const result = useQuery({
    queryKey: exploreQueryKeys.logTransactionDetail(path),
    enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogTransactionDetail(path, window, config, detail, signal)
  });
  return {
    ...transactionLoadState(result, enabled, detail.search, detail.searchSyntax),
    data: enabled && !result.isFetching && !result.isError ? result.data : undefined,
    retry: () => {
      if (enabled) void result.refetch();
    }
  };
}
