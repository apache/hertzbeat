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

import type { z } from 'zod';
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-query';
import { logTransactionStateSchema, type LogTransactionState } from '../model/explore-log-transactions';
import { buildSignalApiPath } from './explore-api';
import {
  logTransactionsResultSchema,
  logTransactionDetailSchema,
  transactionIdentitySchema
} from './explore-log-transactions-schema';
export type LogTransactionDetailQuery = {
  identity: string;
  search: string;
  searchSyntax?: 'structured-v1' | undefined;
  pageIndex: number;
  sort: 'oldest' | 'newest';
};
export function buildLogTransactionsPath(query: LogExploreQuery, window: ExactTimeWindow, state: LogTransactionState) {
  logTransactionStateSchema.parse(state);
  const params = new URLSearchParams(
    buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
  );
  for (const key of ['pageIndex', 'pageSize', 'sort', 'logSort']) params.delete(key);
  params.set('transactionVersion', String(state.version));
  params.set('transactionField', state.field);
  params.set('transactionLimit', String(state.limit));
  params.set('transactionOrder', state.order);
  return `/api/logs/transactions?${params}`;
}
export function buildLogTransactionDetailPath(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  state: LogTransactionState,
  detail: LogTransactionDetailQuery
) {
  transactionIdentitySchema.parse(detail.identity);
  if (!Number.isSafeInteger(detail.pageIndex) || detail.pageIndex < 0 || detail.pageIndex * 20 + 20 > 2147483647)
    throw new ExploreSignalContractError();
  const params = new URLSearchParams(buildLogTransactionsPath(query, window, state).split('?')[1]);
  params.set('transactionId', detail.identity);
  params.set('localSearch', detail.search);
  if (detail.searchSyntax) params.set('localSearchSyntax', detail.searchSyntax);
  params.set('pageIndex', String(detail.pageIndex));
  params.set('pageSize', '20');
  params.set('sort', detail.sort);
  return `/api/logs/transactions/detail?${params}`;
}
export async function loadLogTransactions(
  path: string,
  window: ExactTimeWindow,
  state: LogTransactionState,
  signal?: AbortSignal
) {
  const result = parseEvidence(
    logTransactionsResultSchema,
    await apiMessageGet(path, { ...(signal ? { signal } : {}), preserveErrorEnvelope: true })
  );
  if (
    !matchesWindow(result.window, window) ||
    result.request.field.id !== state.field ||
    result.request.limit !== state.limit ||
    result.request.order !== state.order
  )
    throw new ExploreSignalContractError();
  return result;
}
export async function loadLogTransactionDetail(
  path: string,
  window: ExactTimeWindow,
  state: LogTransactionState,
  detail: LogTransactionDetailQuery,
  signal?: AbortSignal
) {
  const result = parseEvidence(
    logTransactionDetailSchema,
    await apiMessageGet(path, { ...(signal ? { signal } : {}), preserveErrorEnvelope: true })
  );
  if (
    !matchesWindow(result.window, window) ||
    result.field.id !== state.field ||
    result.identity !== detail.identity ||
    result.offset !== detail.pageIndex * 20 ||
    result.limit !== 20 ||
    result.sort !== detail.sort
  )
    throw new ExploreSignalContractError();
  return result;
}
function matchesWindow(actual: { start: number; end: number }, expected: ExactTimeWindow) {
  return actual.start === expected.from && actual.end === expected.to;
}

function parseEvidence<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch {
    throw new ExploreSignalContractError();
  }
}
