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

import { useDataProvider, useNotification, type DataProvider } from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { tokenRevokeActionUrl } from '../api/token-api';
import { tokenResourceName } from '../model/token-model';
import { useExclusiveOperation } from './exclusive-operation';
import {
  tokenListFailureMessage,
  useTokenListController,
  type RefreshAuthoritativeTokenList
} from './token-list-controller';
import { useTokenSecretActions } from './token-secret-controller';

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

function useTokenRevocation(
  provider: DataProvider,
  refresh: RefreshAuthoritativeTokenList,
  notification: Notification,
  t: TFunction
) {
  const {
    activeValue: revokingId,
    begin: beginRevocation,
    isOwnedBy: ownsRevocation,
    retire: retireRevocation
  } = useExclusiveOperation<number>();
  const revoke = useCallback(
    async (id: number) => {
      if (!provider.custom) {
        notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
        return;
      }
      const owner = beginRevocation(id);
      if (owner === null) return;
      try {
        await provider.custom({ url: tokenRevokeActionUrl(id), method: 'delete' });
        if (!ownsRevocation(owner)) return;
        const refreshFailure = await refresh(id);
        if (!ownsRevocation(owner)) return;
        if (!refreshFailure) {
          notification.open?.({ message: t('token.revokeSuccess'), type: 'success' });
        } else {
          notification.open?.({ message: t(tokenListFailureMessage(refreshFailure)), type: 'error' });
        }
      } catch {
        if (ownsRevocation(owner)) {
          notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
        }
      } finally {
        retireRevocation(owner);
      }
    },
    [beginRevocation, notification, ownsRevocation, provider, refresh, retireRevocation, t]
  );
  return { revoke, revokingId };
}
