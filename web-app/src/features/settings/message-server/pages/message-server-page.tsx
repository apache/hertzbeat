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

import { Alert, Button, Skeleton, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { EmailServerEditor, SmsServerEditor } from '../components/message-server-editors';
import { useMessageServerController } from '../controller/use-message-server-controller';
import {
  createEmailServerDraft,
  createSmsServerDraft,
  messageServerStatus,
  smsProviderDefinitions,
  validateEmailServerDraft,
  validateSmsServerDraft
} from '../model/message-server-model';
import styles from './message-server-page.module.css';

type Controller = ReturnType<typeof useMessageServerController>;
type FailureKind = 'unavailable' | 'error' | 'invalid';

export function MessageServerPage() {
  const { t } = useTranslation();
  const controller = useMessageServerController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('messageServer.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('messageServer.description')}</Typography.Text>
      </header>
      <SettingsNav />
      <div className={styles.channels}>
        <EmailChannel controller={controller} />
        <SmsChannel controller={controller} />
      </div>
      {controller.emailDraft && (
        <EmailServerEditor
          draft={controller.emailDraft}
          saving={controller.savingEmail}
          update={controller.actions.updateEmail}
          setSecretCleared={controller.actions.setEmailSecretCleared}
          close={controller.actions.closeEmail}
          submit={() => { void controller.actions.submitEmail(); }}
        />
      )}
      {controller.smsDraft && (
        <SmsServerEditor
          draft={controller.smsDraft}
          saving={controller.savingSms}
          replace={controller.actions.replaceSms}
          close={controller.actions.closeSms}
          submit={() => { void controller.actions.submitSms(); }}
        />
      )}
    </div>
  );
}

function EmailChannel({ controller }: { controller: Controller }) {
  const { t } = useTranslation();
  const state = controller.email;
  if (state.kind === 'loading') return <ChannelLoading title={t('messageServer.email.title')} />;
  if (state.kind === 'unavailable' || state.kind === 'error' || state.kind === 'invalid') {
    return <ChannelFailure title={t('messageServer.email.title')} kind={state.kind}
      retry={controller.actions.retryEmail} />;
  }
  if (state.kind === 'missing') {
    return <ChannelRow title={t('messageServer.email.title')} description={t('messageServer.email.description')}
      summary={t('messageServer.notConfigured')} status="unconfigured" action={controller.actions.openEmail} />;
  }
  const draft = createEmailServerDraft({ status: 'configured', config: state.config });
  return <ChannelRow title={t('messageServer.email.title')} description={t('messageServer.email.description')}
    summary={`${state.config.emailHost}:${state.config.emailPort} · ${state.config.emailUsername}`}
    status={messageServerStatus(state.config.enable, validateEmailServerDraft(draft))}
    action={controller.actions.openEmail} />;
}

function SmsChannel({ controller }: { controller: Controller }) {
  const { t } = useTranslation();
  const state = controller.sms;
  if (state.kind === 'loading') return <ChannelLoading title={t('messageServer.sms.title')} />;
  if (state.kind === 'unavailable' || state.kind === 'error' || state.kind === 'invalid') {
    return <ChannelFailure title={t('messageServer.sms.title')} kind={state.kind}
      retry={controller.actions.retrySms} />;
  }
  if (state.kind === 'missing') {
    return <ChannelRow title={t('messageServer.sms.title')} description={t('messageServer.sms.description')}
      summary={t('messageServer.notConfigured')} status="unconfigured" action={controller.actions.openSms} />;
  }
  const draft = createSmsServerDraft({ status: 'configured', config: state.config });
  const provider = smsProviderDefinitions.find(item => item.type === state.config.type)!;
  return <ChannelRow title={t('messageServer.sms.title')} description={t('messageServer.sms.description')}
    summary={t(provider.labelKey)} status={messageServerStatus(state.config.enable, validateSmsServerDraft(draft))}
    action={controller.actions.openSms} />;
}

function ChannelLoading({ title }: { title: string }) {
  return <section className={styles.channelRow} aria-label={title}><Skeleton active paragraph={{ rows: 1 }} /></section>;
}

function ChannelFailure({ title, kind, retry }: { title: string; kind: FailureKind; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.channelRow}>
      <div><Typography.Title level={4}>{title}</Typography.Title></div>
      <Alert className={styles.channelError!} type="error" showIcon
        message={t(`messageServer.read.${kind}`)} />
      <Button onClick={retry}>{t('common.retry')}</Button>
    </section>
  );
}

function ChannelRow({ title, description, summary, status, action }: {
  title: string;
  description: string;
  summary: string;
  status: 'enabled' | 'disabled' | 'unconfigured';
  action: () => void;
}) {
  const { t } = useTranslation();
  const color = status === 'enabled' ? 'success' : status === 'disabled' ? 'default' : 'warning';
  return (
    <section className={styles.channelRow}>
      <div>
        <Typography.Title level={4}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      <div className={styles.summary}>
        <Tag color={color}>{t(`messageServer.status.${status}`)}</Tag>
        <Typography.Text>{summary}</Typography.Text>
      </div>
      <Button onClick={action}>{t('messageServer.configure')}</Button>
    </section>
  );
}
