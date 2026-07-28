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

import { tokenResourceName, type TokenListState, type TokenResourceRecord } from '../model/token-model';
import { classifyTokenCollectionFailure, type TokenFailureKind } from '../model/token-failure';

export type TokenListFailureKind = TokenFailureKind;
export type RefreshAuthoritativeTokenList = (expectedAbsentId?: number) => Promise<TokenListFailureKind | null>;

export function useTokenListController() {
  const list = useList<TokenResourceRecord, HttpError>({
    resource: tokenResourceName,
    dataProviderName: tokenResourceName,
    pagination: { mode: 'off' },
    errorNotification: false
  });
  const [refreshFailure, setRefreshFailure] = useState<TokenListFailureKind | null>(null);

  const refresh = useCallback<RefreshAuthoritativeTokenList>(
    async expectedAbsentId => {
      try {
        const result = await list.query.refetch();
        if (result.isError) {
          const kind = resolveTokenListFailure(result.error);
          setRefreshFailure(kind);
          return kind;
        }
        if (
          expectedAbsentId !== undefined &&
          !confirmsAbsentId(result.data?.data, result.data?.total, expectedAbsentId)
        ) {
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
    },
    [list.query]
  );

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
  if (kind === 'unavailable') return 'token.unavailable';
  if (kind === 'invalid') return 'token.invalid';
  if (kind === 'permission') return 'common.permission.roleRequiredDescription';
  return 'common.routeError.description';
}

function resolveTokenListState(
  list: ReturnType<typeof useList<TokenResourceRecord, HttpError>>,
  refreshFailure: TokenListFailureKind | null
): TokenListState {
  if (refreshFailure) return { kind: refreshFailure };
  if (list.query.isPending) return { kind: 'loading' };
  if (list.query.isError) return { kind: resolveTokenListFailure(list.query.error) };
  if (list.result.total === undefined || list.result.total !== list.result.data.length) return { kind: 'error' };
  if (list.result.data.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: list.result.data };
}

function confirmsAbsentId(value: unknown, total: unknown, expectedAbsentId: number) {
  return (
    Array.isArray(value) &&
    Number.isSafeInteger(total) &&
    total === value.length &&
    value.every(record => hasDifferentNumericId(record, expectedAbsentId))
  );
}

function hasDifferentNumericId(value: unknown, expectedId: number) {
  if (!value || typeof value !== 'object' || !('id' in value)) return false;
  const { id } = value;
  return typeof id === 'number' && id !== expectedId;
}

function resolveTokenListFailure(reason: unknown): TokenListFailureKind {
  return classifyTokenCollectionFailure(reason);
}
