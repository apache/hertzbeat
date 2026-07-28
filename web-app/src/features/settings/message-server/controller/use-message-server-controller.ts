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

import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  loadEmailServerConfig,
  loadSmsServerConfig,
  saveEmailServerConfig,
  saveSmsServerConfig
} from '../api/message-server-api';
import {
  type EmailServerConfig,
  type EmailServerEvidence,
  type SmsServerConfig,
  type SmsServerEvidence
} from '../model/message-server-contract';
import {
  buildEmailServerPayload,
  buildSmsServerPayload,
  createEmailServerDraft,
  createSmsServerDraft,
  setEmailSecretCleared,
  updateEmailServerDraft,
  validateEmailServerDraft,
  validateSmsServerDraft,
  type EmailServerDraft,
  type SmsServerDraft
} from '../model/message-server-model';
import {
  emailServerAmbiguousWriteProvable,
  emailServerSaveConverged,
  smsServerAmbiguousWriteProvable,
  smsServerSaveConverged
} from '../model/message-server-convergence';
import { messageServerQueryKeys } from './message-server-query-keys';
import { messageServerChannelState } from './message-server-channel-state';
import { useMessageServerActionCapabilities } from './use-message-server-action-capabilities';
import {
  useMessageServerSaveTransaction,
  type MessageServerSaveNotifications
} from './use-message-server-save-transaction';

export function useMessageServerController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const capabilities = useMessageServerActionCapabilities();
  const emailQuery = useQuery({
    queryKey: messageServerQueryKeys.email(),
    queryFn: ({ signal }) => loadEmailServerConfig(signal),
    retry: false
  });
  const smsQuery = useQuery({
    queryKey: messageServerQueryKeys.sms(),
    queryFn: ({ signal }) => loadSmsServerConfig(signal),
    retry: false
  });
  const notifications: MessageServerSaveNotifications = {
    invalid: () => void message.warning(t('messageServer.validation')),
    success: () => void message.success(t('messageServer.saveSuccess')),
    failure: key => void message.error(t(key))
  };
  const email = useEmailServerChannel(emailQuery, queryClient, notifications, capabilities.canConfigure);
  const sms = useSmsServerChannel(smsQuery, queryClient, notifications, capabilities.canConfigure);

  return {
    capabilities,
    email: messageServerChannelState<EmailServerConfig>(emailQuery),
    sms: messageServerChannelState<SmsServerConfig>(smsQuery),
    emailDraft: email.draft,
    smsDraft: sms.draft,
    emailLocked: email.locked,
    smsLocked: sms.locked,
    emailSaveRecovery: email.recoveryKey,
    smsSaveRecovery: sms.recoveryKey,
    emailSaveRecoveryRetryable: email.recoveryRetryable,
    smsSaveRecoveryRetryable: sms.recoveryRetryable,
    provingEmail: email.proving,
    provingSms: sms.proving,
    savingEmail: email.saving,
    savingSms: sms.saving,
    actions: {
      ...email.actions,
      ...sms.actions,
      retryEmail: () => void emailQuery.refetch(),
      retrySms: () => void smsQuery.refetch(),
      retryEmailSave: email.retry,
      retrySmsSave: sms.retry
    }
  };
}

function useEmailServerChannel(
  query: UseQueryResult<EmailServerEvidence>,
  queryClient: QueryClient,
  notifications: MessageServerSaveNotifications,
  canConfigure: boolean
) {
  const [draft, setDraft] = useState<EmailServerDraft | null>(null);
  const close = useCallback(() => setDraft(null), []);
  const retireProof = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: messageServerQueryKeys.email() });
  }, [queryClient]);
  const transaction = useMessageServerSaveTransaction(
    {
      draft,
      validate: validateEmailServerDraft,
      write: value => saveEmailServerConfig(buildEmailServerPayload(value)),
      reread: query.refetch,
      converged: emailServerSaveConverged,
      canProveAmbiguousWrite: emailServerAmbiguousWriteProvable,
      close,
      accept: evidence => {
        queryClient.setQueryData(messageServerQueryKeys.email(), evidence);
        setDraft(null);
      },
      notifications,
      retireProof
    },
    canConfigure
  );
  return {
    draft,
    locked: transaction.locked,
    recoveryKey: transaction.recoveryKey,
    recoveryRetryable: transaction.recoveryRetryable,
    retry: transaction.retry,
    proving: transaction.proving,
    saving: transaction.saving,
    actions: {
      openEmail: () => {
        if (transaction.canWrite() && !transaction.isLocked() && query.data)
          setDraft(createEmailServerDraft(query.data));
      },
      closeEmail: transaction.close,
      updateEmail: (patch: Partial<EmailServerDraft>) => {
        if (!transaction.canWrite() || transaction.isLocked()) return;
        setDraft(current => updateEmailServerDraft(current, patch));
      },
      setEmailSecretCleared: (cleared: boolean) => {
        if (transaction.canWrite() && !transaction.isLocked()) {
          setDraft(current => (current ? setEmailSecretCleared(current, cleared) : null));
        }
      },
      submitEmail: transaction.submit
    }
  };
}

function useSmsServerChannel(
  query: UseQueryResult<SmsServerEvidence>,
  queryClient: QueryClient,
  notifications: MessageServerSaveNotifications,
  canConfigure: boolean
) {
  const [draft, setDraft] = useState<SmsServerDraft | null>(null);
  const close = useCallback(() => setDraft(null), []);
  const retireProof = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: messageServerQueryKeys.sms() });
  }, [queryClient]);
  const transaction = useMessageServerSaveTransaction(
    {
      draft,
      validate: validateSmsServerDraft,
      write: value => saveSmsServerConfig(buildSmsServerPayload(value)),
      reread: query.refetch,
      converged: smsServerSaveConverged,
      canProveAmbiguousWrite: smsServerAmbiguousWriteProvable,
      close,
      accept: evidence => {
        queryClient.setQueryData(messageServerQueryKeys.sms(), evidence);
        setDraft(null);
      },
      notifications,
      retireProof
    },
    canConfigure
  );
  return {
    draft,
    locked: transaction.locked,
    recoveryKey: transaction.recoveryKey,
    recoveryRetryable: transaction.recoveryRetryable,
    retry: transaction.retry,
    proving: transaction.proving,
    saving: transaction.saving,
    actions: {
      openSms: () => {
        if (transaction.canWrite() && !transaction.isLocked() && query.data) setDraft(createSmsServerDraft(query.data));
      },
      closeSms: transaction.close,
      replaceSms: (value: SmsServerDraft | null) => {
        if (transaction.canWrite() && !transaction.isLocked()) setDraft(value);
      },
      submitSms: transaction.submit
    }
  };
}
