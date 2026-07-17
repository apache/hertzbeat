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

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { App } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  classifyMessageServerReadError,
  loadEmailServerConfig,
  loadSmsServerConfig,
  saveEmailServerConfig,
  saveSmsServerConfig,
  type EmailServerConfig,
  type SmsServerConfig
} from '../api/message-server-api';
import {
  buildEmailServerPayload,
  buildSmsServerPayload,
  createEmailServerDraft,
  createSmsServerDraft,
  setEmailSecretCleared,
  validateEmailServerDraft,
  validateSmsServerDraft,
  type EmailServerDraft,
  type SmsServerDraft
} from '../model/message-server-model';

export type MessageServerChannelState<T> =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'invalid' }
  | { kind: 'configured'; config: T };

export function useMessageServerController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const emailQuery = useQuery({ queryKey: ['config', 'email'],
    queryFn: ({ signal }) => loadEmailServerConfig(signal), retry: false });
  const smsQuery = useQuery({ queryKey: ['config', 'sms'],
    queryFn: ({ signal }) => loadSmsServerConfig(signal), retry: false });
  const [emailDraft, setEmailDraft] = useState<EmailServerDraft | null>(null);
  const [smsDraft, setSmsDraft] = useState<SmsServerDraft | null>(null);

  const emailMutation = useMutation({
    mutationFn: async (draft: EmailServerDraft) => {
      await saveEmailServerConfig(buildEmailServerPayload(draft));
      const proof = await emailQuery.refetch();
      if (proof.error) throw new AuthoritativeReadError(proof.error);
      if (!proof.data || proof.data.status !== 'configured') throw new AuthoritativeReadError(undefined, true);
      return proof.data;
    },
    onSuccess: evidence => {
      queryClient.setQueryData(['config', 'email'], evidence);
      setEmailDraft(null);
      void message.success(t('messageServer.saveSuccess'));
    },
    onError: error => void message.error(t(mutationErrorKey(error)))
  });
  const smsMutation = useMutation({
    mutationFn: async (draft: SmsServerDraft) => {
      await saveSmsServerConfig(buildSmsServerPayload(draft));
      const proof = await smsQuery.refetch();
      if (proof.error) throw new AuthoritativeReadError(proof.error);
      if (!proof.data || proof.data.status !== 'configured') throw new AuthoritativeReadError(undefined, true);
      return proof.data;
    },
    onSuccess: evidence => {
      queryClient.setQueryData(['config', 'sms'], evidence);
      setSmsDraft(null);
      void message.success(t('messageServer.saveSuccess'));
    },
    onError: error => void message.error(t(mutationErrorKey(error)))
  });

  const submitEmail = async () => {
    if (!emailDraft || validateEmailServerDraft(emailDraft).length > 0) {
      void message.warning(t('messageServer.validation'));
      return;
    }
    try {
      await emailMutation.mutateAsync(emailDraft);
    } catch {
      // The mutation boundary owns the localized failure notification.
    }
  };
  const submitSms = async () => {
    if (!smsDraft || validateSmsServerDraft(smsDraft).length > 0) {
      void message.warning(t('messageServer.validation'));
      return;
    }
    try {
      await smsMutation.mutateAsync(smsDraft);
    } catch {
      // The mutation boundary owns the localized failure notification.
    }
  };

  return {
    email: channelState<EmailServerConfig>(emailQuery),
    sms: channelState<SmsServerConfig>(smsQuery),
    emailDraft,
    smsDraft,
    savingEmail: emailMutation.isPending,
    savingSms: smsMutation.isPending,
    actions: {
      openEmail: () => emailQuery.data && setEmailDraft(createEmailServerDraft(emailQuery.data)),
      openSms: () => smsQuery.data && setSmsDraft(createSmsServerDraft(smsQuery.data)),
      closeEmail: () => setEmailDraft(null),
      closeSms: () => setSmsDraft(null),
      updateEmail: (patch: Partial<EmailServerDraft>) => setEmailDraft(current => current ? {
        ...current,
        ...patch,
        ...(patch.emailPassword?.trim() ? { clearSecrets: [] } : {})
      } : null),
      setEmailSecretCleared: (cleared: boolean) => setEmailDraft(current => current
        ? setEmailSecretCleared(current, cleared) : null),
      replaceSms: setSmsDraft,
      retryEmail: () => void emailQuery.refetch(),
      retrySms: () => void smsQuery.refetch(),
      submitEmail,
      submitSms
    }
  };
}

function channelState<T>(
  query: UseQueryResult<{ status: 'configured'; config: T } | { status: 'missing'; config: null }>
): MessageServerChannelState<T> {
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: classifyMessageServerReadError(query.error) };
  return query.data.status === 'configured' ? { kind: 'configured', config: query.data.config }
    : { kind: 'missing' };
}

class AuthoritativeReadError extends Error {
  readonly reason: unknown;
  readonly missing: boolean;

  constructor(reason: unknown, missing = false) {
    super('Authoritative message server reread failed');
    this.name = 'AuthoritativeReadError';
    this.reason = reason;
    this.missing = missing;
  }
}

function mutationErrorKey(error: unknown) {
  if (!(error instanceof AuthoritativeReadError)) return 'messageServer.saveFailed';
  if (error.missing) return 'messageServer.saveNotConverged';
  return `messageServer.read.${classifyMessageServerReadError(error.reason)}`;
}
