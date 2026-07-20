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
import { isDefiniteTokenWriteRejection } from '../api/token-write-rejection';
import { tokenResourceName, type TokenRevocationRecovery } from '../model/token-model';
import { useExclusiveOperation } from './exclusive-operation';
import { useTokenListController, type RefreshAuthoritativeTokenList } from './token-list-controller';
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
    retry: revocation.recovery ? revocation.recover : list.retry,
    revoke: revocation.revoke,
    state: {
      ...secret.state,
      list: revocation.recovery ? { kind: 'unavailable' as const } : list.list,
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
  const { activeValue, begin, beginRecovery, clearRecovery, isOwnedBy, recovery, retainRecovery, retire } =
    useExclusiveOperation<number, TokenRevocationRecovery>();
  const proveRevocation = useRevocationProof({
    clearRecovery,
    isOwnedBy,
    notification,
    refresh,
    retainRecovery,
    t
  });
  const revoke = useCallback(
    async (id: number) => {
      if (!provider.custom) {
        notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
        return;
      }
      const owner = begin(id);
      if (owner === null) return;
      try {
        try {
          await provider.custom({ url: tokenRevokeActionUrl(id), method: 'delete' });
        } catch (reason) {
          if (!isOwnedBy(owner)) return;
          if (isDefiniteTokenWriteRejection(reason)) {
            notification.open?.({ message: t('token.revokeFailed'), type: 'error' });
            return;
          }
        }
        if (!isOwnedBy(owner)) return;
        retainRecovery(owner, { phase: 'proof', id });
        await proveRevocation(owner, id);
      } finally {
        retire(owner);
      }
    },
    [begin, isOwnedBy, notification, proveRevocation, provider, retainRecovery, retire, t]
  );
  const recover = useCallback(async () => {
    if (!recovery) return;
    const admitted = beginRecovery(recovery.id);
    if (!admitted) return;
    try {
      await proveRevocation(admitted.owner, admitted.recovery.id);
    } finally {
      retire(admitted.owner);
    }
  }, [beginRecovery, proveRevocation, recovery, retire]);

  return {
    recover,
    recovery,
    revoke,
    revokingId: activeValue
  };
}

type RevocationProofInput = {
  clearRecovery: (owner: number) => boolean;
  isOwnedBy: (owner: number) => boolean;
  notification: Notification;
  refresh: RefreshAuthoritativeTokenList;
  retainRecovery: (owner: number, recovery: TokenRevocationRecovery) => boolean;
  t: TFunction;
};

function useRevocationProof(input: RevocationProofInput) {
  const { clearRecovery, isOwnedBy, notification, refresh, retainRecovery, t } = input;
  return useCallback(
    async (owner: number, id: number) => {
      const refreshFailure = await refresh(id);
      if (!isOwnedBy(owner)) return;
      if (refreshFailure) {
        retainRecovery(owner, { phase: 'proof', id });
        notification.open?.({ message: t('token.unavailable'), type: 'error' });
        return;
      }
      clearRecovery(owner);
      notification.open?.({ message: t('token.revokeSuccess'), type: 'success' });
    },
    [clearRecovery, isOwnedBy, notification, refresh, retainRecovery, t]
  );
}
