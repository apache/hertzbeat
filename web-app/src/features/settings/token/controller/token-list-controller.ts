/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useList, type HttpError } from '@refinedev/core';
import { useCallback, useState } from 'react';

import {
  tokenResourceName,
  type TokenListState,
  type TokenResourceRecord
} from '../model/token-model';

export type TokenListFailureKind = 'error' | 'unavailable';
export type RefreshAuthoritativeTokenList = (
  expectedAbsentId?: number
) => Promise<TokenListFailureKind | null>;

export function useTokenListController() {
  const list = useList<TokenResourceRecord, HttpError>({
    resource: tokenResourceName,
    dataProviderName: tokenResourceName,
    pagination: { mode: 'off' },
    errorNotification: false
  });
  const [refreshFailure, setRefreshFailure] = useState<TokenListFailureKind | null>(null);

  const refresh = useCallback<RefreshAuthoritativeTokenList>(async expectedAbsentId => {
    try {
      const result = await list.query.refetch();
      if (result.isError) {
        const kind = resolveTokenListFailure(result.error);
        setRefreshFailure(kind);
        return kind;
      }
      if (expectedAbsentId !== undefined && !confirmsAbsentId(result.data?.data, expectedAbsentId)) {
        setRefreshFailure('error');
        return 'error';
      }
      setRefreshFailure(null);
      return null;
    } catch (reason) {
      const kind = resolveTokenListFailure(reason);
      setRefreshFailure(kind);
      return kind;
    }
  }, [list.query]);

  const retry = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    list: resolveTokenListState(list, refreshFailure),
    refresh,
    refreshing: list.query.isFetching,
    retry
  };
}

export function tokenListFailureMessage(kind: TokenListFailureKind) {
  return kind === 'unavailable' ? 'token.unavailable' : 'common.routeError.description';
}

function resolveTokenListState(
  list: ReturnType<typeof useList<TokenResourceRecord, HttpError>>,
  refreshFailure: TokenListFailureKind | null
): TokenListState {
  if (refreshFailure) return { kind: refreshFailure };
  if (list.query.isPending) return { kind: 'loading' };
  if (list.query.isError) return { kind: resolveTokenListFailure(list.query.error) };
  if (list.result.data.length === 0) return { kind: 'empty' };
  if (list.result.total === undefined) return { kind: 'error' };
  return { kind: 'ready', records: list.result.data };
}

function confirmsAbsentId(value: unknown, expectedAbsentId: number) {
  return Array.isArray(value)
    && value.every(record => (
      !!record
      && typeof record === 'object'
      && typeof (record as { id?: unknown }).id === 'number'
      && (record as { id: number }).id !== expectedAbsentId
    ));
}

function resolveTokenListFailure(reason: unknown): TokenListFailureKind {
  const error = reason && typeof reason === 'object' ? reason as Record<string, unknown> : null;
  if (error?.code === 'TOKEN_RESPONSE_INVALID') return 'error';
  const status = error?.statusCode;
  return status === 0 || status === 502 || status === 503 || status === 504
    ? 'unavailable'
    : 'error';
}
