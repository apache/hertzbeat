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
  useNotification,
  type DataProvider
} from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { tokenGenerateActionUrl, tokenRevokeActionUrl } from '../api/token-api';
import {
  createTokenDraft,
  tokenResourceName,
  validateTokenDraft,
  type GeneratedTokenReceipt,
  type TokenDraft,
} from '../model/token-model';
import {
  tokenListFailureMessage,
  useTokenListController,
  type RefreshAuthoritativeTokenList
} from './token-list-controller';

type Notification = ReturnType<typeof useNotification>;

export function useTokenResourceController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const resolveDataProvider = useDataProvider();
  const provider = resolveDataProvider(tokenResourceName);
  const list = useTokenListController();
  const secret = useTokenSecretActions(provider, list.refresh, notification, t);
  const revocation = useTokenRevocation(provider, list.refresh, notification, t);

  return {
    ...secret.actions,
    retry: list.retry,
    revoke: revocation.revoke,
    state: {
      ...secret.state,
      list: list.list,
      refreshing: list.refreshing,
      revokingId: revocation.revokingId
    }
  };
}

function useTokenSecretActions(
  provider: DataProvider,
  refresh: RefreshAuthoritativeTokenList,
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
  const copyGeneratedToken = useGeneratedTokenClipboard(generatedToken, notification, t);

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
      notification.open?.({ message: t(tokenListFailureMessage(refreshFailure)), type: 'error' });
    }
    setGenerating(false);
  }, [draft, notification, provider, refresh, t]);

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

function useGeneratedTokenClipboard(
  generatedToken: string | null,
  notification: Notification,
  t: TFunction
) {
  return useCallback(async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      notification.open?.({ message: t('token.copySuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('token.copyFailed'), type: 'error' });
    }
  }, [generatedToken, notification, t]);
}

function useTokenRevocation(
  provider: DataProvider,
  refresh: RefreshAuthoritativeTokenList,
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
        notification.open?.({ message: t(tokenListFailureMessage(refreshFailure)), type: 'error' });
      }
    } catch {
      notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
    } finally {
      setRevokingId(null);
    }
  }, [notification, provider, refresh, t]);
  return { revoke, revokingId };
}
