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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Skeleton, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { EmailServerEditor, SmsServerEditor } from './MessageServerEditors';
import {
  loadEmailServerConfig,
  loadSmsServerConfig,
  saveEmailServerConfig,
  saveSmsServerConfig
} from './message-server-api';
import {
  createEmailServerDraft,
  createSmsServerDraft,
  messageServerStatus,
  smsProviderDefinitions,
  validateEmailServerDraft,
  validateSmsServerDraft,
  type EmailServerDraft,
  type SmsServerDraft
} from './message-server-model';
import styles from './MessageServerPage.module.css';

function StatusTag({ status }: { status: 'enabled' | 'disabled' | 'unconfigured' }) {
  const { t } = useTranslation();
  const color = status === 'enabled' ? 'success' : status === 'disabled' ? 'default' : 'warning';
  return <Tag color={color}>{t(`messageServer.status.${status}`)}</Tag>;
}

function ChannelRow({ title, description, summary, status, action }: {
  title: string;
  description: string;
  summary: string;
  status: 'enabled' | 'disabled' | 'unconfigured';
  action: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.channelRow}>
      <div><Typography.Title level={4}>{title}</Typography.Title><Typography.Text type="secondary">{description}</Typography.Text></div>
      <div className={styles.summary}><StatusTag status={status} /><Typography.Text>{summary}</Typography.Text></div>
      <Button onClick={action}>{t('messageServer.configure')}</Button>
    </section>
  );
}

export function MessageServerPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ['config', 'email'], queryFn: loadEmailServerConfig });
  const sms = useQuery({ queryKey: ['config', 'sms'], queryFn: loadSmsServerConfig });
  const [emailDraft, setEmailDraft] = useState<EmailServerDraft | null>(null);
  const [smsDraft, setSmsDraft] = useState<SmsServerDraft | null>(null);
  const saveEmail = useMutation({ mutationFn: saveEmailServerConfig, onSuccess: () => { setEmailDraft(null); void queryClient.invalidateQueries({ queryKey: ['config', 'email'] }); void message.success(t('messageServer.saveSuccess')); }, onError: () => void message.error(t('messageServer.saveFailed')) });
  const saveSms = useMutation({ mutationFn: saveSmsServerConfig, onSuccess: () => { setSmsDraft(null); void queryClient.invalidateQueries({ queryKey: ['config', 'sms'] }); void message.success(t('messageServer.saveSuccess')); }, onError: () => void message.error(t('messageServer.saveFailed')) });
  const emailConfig = createEmailServerDraft(email.data);
  const smsConfig = createSmsServerDraft(sms.data);
  const submitEmail = () => {
    if (!emailDraft || validateEmailServerDraft(emailDraft).length > 0) { void message.warning(t('messageServer.validation')); return; }
    saveEmail.mutate(emailDraft);
  };
  const submitSms = () => {
    if (!smsDraft || validateSmsServerDraft(smsDraft).length > 0) { void message.warning(t('messageServer.validation')); return; }
    saveSms.mutate(smsDraft);
  };
  const provider = smsProviderDefinitions.find(item => item.type === smsConfig.type)!;
  return (
    <div className={styles.page}>
      <header className={styles.heading}><Typography.Title level={2}>{t('messageServer.title')}</Typography.Title><Typography.Text type="secondary">{t('messageServer.description')}</Typography.Text></header>
      <SettingsNav />
      {(email.isError || sms.isError) && <Alert type="error" showIcon message={t('messageServer.unavailable')} />}
      {(email.isPending || sms.isPending) ? <Skeleton active /> : (
        <div className={styles.channels}>
          {!email.isError && <ChannelRow title={t('messageServer.email.title')} description={t('messageServer.email.description')} summary={email.data ? `${emailConfig.emailHost}:${emailConfig.emailPort} · ${emailConfig.emailUsername}` : t('messageServer.notConfigured')} status={messageServerStatus(emailConfig.enable, validateEmailServerDraft(emailConfig))} action={() => setEmailDraft(emailConfig)} />}
          {!sms.isError && <ChannelRow title={t('messageServer.sms.title')} description={t('messageServer.sms.description')} summary={sms.data ? t(provider.labelKey) : t('messageServer.notConfigured')} status={messageServerStatus(smsConfig.enable, validateSmsServerDraft(smsConfig))} action={() => setSmsDraft(smsConfig)} />}
        </div>
      )}
      {emailDraft && <EmailServerEditor draft={emailDraft} saving={saveEmail.isPending} update={patch => setEmailDraft(current => current ? { ...current, ...patch } : current)} close={() => setEmailDraft(null)} submit={submitEmail} />}
      {smsDraft && <SmsServerEditor draft={smsDraft} saving={saveSms.isPending} replace={setSmsDraft} close={() => setSmsDraft(null)} submit={submitSms} />}
    </div>
  );
}
