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
