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

import { useNotification, type DataProvider } from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { tokenGenerateActionUrl } from '../api/token-api';
import {
  createTokenDraft,
  validateTokenDraft,
  type GeneratedTokenReceipt,
  type TokenDraft
} from '../model/token-model';
import { useExclusiveOperation } from './exclusive-operation';
import { tokenListFailureMessage, type RefreshAuthoritativeTokenList } from './token-list-controller';

type Notification = ReturnType<typeof useNotification>;

export function useTokenSecretActions(
  provider: DataProvider,
  refresh: RefreshAuthoritativeTokenList,
  notification: Notification,
  t: TFunction
) {
  const [searchParams] = useSearchParams();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const generation = useExclusiveOperation<'generating'>();
  const editor = useTokenDraftEditor(searchParams.get('scope'), generation.isActive, generation.retire);
  const completeGeneration = editor.complete;
  const closeGeneratedToken = useCallback(() => setGeneratedToken(null), []);
  const copyGeneratedToken = useGeneratedTokenClipboard(generatedToken, notification, t);
  const publishGeneratedToken = useCallback(
    (receipt: GeneratedTokenReceipt) => {
      completeGeneration();
      setGeneratedToken(receipt.token);
    },
    [completeGeneration]
  );
  const generate = useTokenGenerationCommand({
    begin: generation.begin,
    draft: editor.draft,
    isCurrent: generation.isOwnedBy,
    notification,
    provider,
    publish: publishGeneratedToken,
    refresh,
    retire: generation.retire,
    t
  });

  return {
    actions: {
      closeGeneratedToken,
      closeGenerator: editor.close,
      copyGeneratedToken,
      generate,
      openGenerator: editor.open,
      updateDraft: editor.update
    },
    state: { draft: editor.draft, generatedToken, generating: generation.activeValue !== null }
  };
}

function useTokenDraftEditor(scope: string | null, isGenerating: () => boolean, retireGeneration: () => boolean) {
  const [draft, setDraft] = useState<TokenDraft | null>(null);
  const open = useCallback(() => {
    if (!isGenerating()) setDraft(createTokenDraft(scope));
  }, [isGenerating, scope]);
  const close = useCallback(() => {
    retireGeneration();
    setDraft(null);
  }, [retireGeneration]);
  const update = useCallback(
    (nextDraft: TokenDraft | null) => {
      if (!isGenerating()) setDraft(nextDraft);
    },
    [isGenerating]
  );
  const complete = useCallback(() => setDraft(null), []);
  return { close, complete, draft, open, update };
}

type TokenGenerationHookInput = {
  begin: (value: 'generating') => number | null;
  draft: TokenDraft | null;
  isCurrent: (owner: number) => boolean;
  notification: Notification;
  provider: DataProvider;
  publish: (receipt: GeneratedTokenReceipt) => void;
  refresh: RefreshAuthoritativeTokenList;
  retire: (owner?: number) => boolean;
  t: TFunction;
};

function useTokenGenerationCommand(input: TokenGenerationHookInput) {
  return useCallback(async () => {
    if (!input.draft || validateTokenDraft(input.draft).length > 0) {
      notifyError(input.notification, input.t, 'token.validation');
      return;
    }
    if (!input.provider.custom) {
      notifyError(input.notification, input.t, 'token.generateFailed');
      return;
    }
    const owner = input.begin('generating');
    if (owner === null) return;
    await executeTokenGeneration({
      custom: input.provider.custom,
      draft: input.draft,
      refresh: input.refresh,
      isCurrent: () => input.isCurrent(owner),
      retire: () => input.retire(owner),
      publish: input.publish,
      notifyFailure: messageKey => notifyError(input.notification, input.t, messageKey)
    });
  }, [input]);
}

type TokenGenerationCommand = {
  custom: NonNullable<DataProvider['custom']>;
  draft: TokenDraft;
  refresh: RefreshAuthoritativeTokenList;
  isCurrent: () => boolean;
  retire: () => boolean;
  publish: (receipt: GeneratedTokenReceipt) => void;
  notifyFailure: (messageKey: string) => void;
};

async function executeTokenGeneration(command: TokenGenerationCommand) {
  let receipt: GeneratedTokenReceipt;
  try {
    const response = await command.custom<GeneratedTokenReceipt, unknown, TokenDraft>({
      url: tokenGenerateActionUrl,
      method: 'post',
      payload: command.draft
    });
    receipt = response.data;
  } catch {
    if (command.retire()) command.notifyFailure('token.generateFailed');
    return;
  }
  // A cancelled command must not publish its secret into a newer editor session.
  if (!command.isCurrent()) return;
  command.publish(receipt);
  const refreshFailure = await command.refresh();
  if (!command.isCurrent()) return;
  if (refreshFailure) command.notifyFailure(tokenListFailureMessage(refreshFailure));
  command.retire();
}

function notifyError(notification: Notification, t: TFunction, messageKey: string) {
  notification.open?.({ message: t(messageKey), type: 'error' });
}

function useGeneratedTokenClipboard(generatedToken: string | null, notification: Notification, t: TFunction) {
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
