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

import {
  useDataProvider,
  useList,
  useNotification,
  type DataProvider,
  type HttpError
} from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  createTokenDraft,
  tokenGenerateActionUrl,
  tokenResourceName,
  tokenRevokeActionUrl,
  validateTokenDraft,
  type GeneratedTokenReceipt,
  type TokenDraft,
  type TokenListState,
  type TokenResourceRecord
} from '../model/token-model';

type ListFailureKind = 'error' | 'unavailable';
type TokenListQuery = ReturnType<typeof useList<TokenResourceRecord, HttpError>>;
type Notification = ReturnType<typeof useNotification>;
type RefreshAuthoritativeList = (expectedAbsentId?: number) => Promise<ListFailureKind | null>;

export function useTokenResourceController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const resolveDataProvider = useDataProvider();
  const provider = resolveDataProvider(tokenResourceName);
  const list = useList<TokenResourceRecord, HttpError>({
    resource: tokenResourceName,
    dataProviderName: tokenResourceName,
    pagination: { mode: 'off' },
    errorNotification: false
  });
  const listRefresh = useTokenListRefresh(list);
  const secret = useTokenSecretActions(provider, listRefresh.refresh, notification, t);
  const revocation = useTokenRevocation(provider, listRefresh.refresh, notification, t);

  return {
    ...secret.actions,
    retry: listRefresh.retry,
    revoke: revocation.revoke,
    state: {
      ...secret.state,
      list: resolveListState(list, listRefresh.failure),
      refreshing: list.query.isFetching,
      revokingId: revocation.revokingId
    }
  };
}

function useTokenListRefresh(list: TokenListQuery) {
  const [failure, setFailure] = useState<ListFailureKind | null>(null);
  const refresh = useCallback(async (expectedAbsentId?: number) => {
    try {
      const result = await list.query.refetch();
      if (result.isError) {
        const kind = resolveFailureKind(result.error);
        setFailure(kind);
        return kind;
      }
      if (expectedAbsentId !== undefined && !confirmsAbsentId(result.data?.data, expectedAbsentId)) {
        setFailure('error');
        return 'error';
      }
      setFailure(null);
      return null;
    } catch (reason) {
      const kind = resolveFailureKind(reason);
      setFailure(kind);
      return kind;
    }
  }, [list.query]);
  const retry = useCallback(async () => {
    await refresh();
  }, [refresh]);
  return { failure, refresh, retry };
}

function useTokenSecretActions(
  provider: DataProvider,
  refresh: RefreshAuthoritativeList,
  notification: Notification,
  t: TFunction
) {
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState<TokenDraft | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const openGenerator = useCallback(() => {
    setDraft(createTokenDraft(searchParams.get('scope')));
  }, [searchParams]);
  const closeGenerator = useCallback(() => setDraft(null), []);
  const closeGeneratedToken = useCallback(() => setGeneratedToken(null), []);

  const generate = useCallback(async () => {
    if (!draft || validateTokenDraft(draft).length > 0) {
      notification.open?.({ message: t('token.validation'), type: 'error' });
      return;
    }
    if (!provider.custom) {
      notification.open?.({ message: t('token.generateFailed'), type: 'error' });
      return;
    }
    setGenerating(true);
    let receipt: GeneratedTokenReceipt;
    try {
      const response = await provider.custom<GeneratedTokenReceipt, unknown, TokenDraft>({
        url: tokenGenerateActionUrl,
        method: 'post',
        payload: draft
      });
      receipt = response.data;
    } catch {
      notification.open?.({ message: t('token.generateFailed'), type: 'error' });
      setGenerating(false);
      return;
    }
    setDraft(null);
    setGeneratedToken(receipt.token);
    const refreshFailure = await refresh();
    if (refreshFailure) {
      notification.open?.({ message: t(listFailureMessage(refreshFailure)), type: 'error' });
    }
    setGenerating(false);
  }, [draft, notification, provider, refresh, t]);

  const copyGeneratedToken = useCallback(async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      notification.open?.({ message: t('token.copySuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('token.copyFailed'), type: 'error' });
    }
  }, [generatedToken, notification, t]);

  return {
    actions: {
      closeGeneratedToken,
      closeGenerator,
      copyGeneratedToken,
      generate,
      openGenerator,
      updateDraft: setDraft
    },
    state: { draft, generatedToken, generating }
  };
}

function useTokenRevocation(
  provider: DataProvider,
  refresh: RefreshAuthoritativeList,
  notification: Notification,
  t: TFunction
) {
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const revoke = useCallback(async (id: number) => {
    if (!provider.custom) {
      notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
      return;
    }
    setRevokingId(id);
    try {
      await provider.custom({ url: tokenRevokeActionUrl(id), method: 'delete' });
      const refreshFailure = await refresh(id);
      if (!refreshFailure) {
        notification.open?.({ message: t('token.revokeSuccess'), type: 'success' });
      } else {
        notification.open?.({ message: t(listFailureMessage(refreshFailure)), type: 'error' });
      }
    } catch {
      notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
    } finally {
      setRevokingId(null);
    }
  }, [notification, provider, refresh, t]);
  return { revoke, revokingId };
}

function resolveListState(
  list: TokenListQuery,
  refreshFailure: ListFailureKind | null
): TokenListState {
  if (refreshFailure) return { kind: refreshFailure };
  if (list.query.isPending) return { kind: 'loading' };
  if (list.query.isError) return { kind: resolveFailureKind(list.query.error) };
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

function listFailureMessage(kind: ListFailureKind) {
  return kind === 'unavailable' ? 'token.unavailable' : 'common.routeError.description';
}

function resolveFailureKind(reason: unknown): ListFailureKind {
  const error = reason && typeof reason === 'object' ? reason as Record<string, unknown> : null;
  const code = error?.code;
  if (code === 'TOKEN_RESPONSE_INVALID') return 'error';
  const status = error?.statusCode;
  return status === 0 || status === 502 || status === 503 || status === 504
    ? 'unavailable'
    : 'error';
}
