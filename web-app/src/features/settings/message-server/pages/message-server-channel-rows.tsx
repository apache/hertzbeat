/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useTranslation } from 'react-i18next';

import {
  MessageServerChannelFailure,
  MessageServerChannelLoading,
  MessageServerChannelRow
} from '../components/message-server-channel';
import type { useMessageServerController } from '../controller/use-message-server-controller';
import {
  createEmailServerDraft,
  createSmsServerDraft,
  messageServerStatus,
  smsProviderDefinition,
  validateEmailServerDraft,
  validateSmsServerDraft
} from '../model/message-server-model';

type Controller = ReturnType<typeof useMessageServerController>;

export function EmailServerChannelRow({ controller }: { controller: Controller }) {
  const { t } = useTranslation();
  const state = controller.email;
  if (state.kind === 'loading') return <MessageServerChannelLoading title={t('messageServer.email.title')} />;
  if (
    state.kind === 'permission' ||
    state.kind === 'unavailable' ||
    state.kind === 'error' ||
    state.kind === 'invalid'
  ) {
    return (
      <MessageServerChannelFailure
        title={t('messageServer.email.title')}
        kind={state.kind}
        retry={controller.actions.retryEmail}
      />
    );
  }
  if (state.kind === 'missing') {
    return (
      <MessageServerChannelRow
        title={t('messageServer.email.title')}
        description={t('messageServer.email.description')}
        summary={t('messageServer.notConfigured')}
        status="unconfigured"
        canConfigure={controller.capabilities.canConfigure}
        disabled={controller.emailLocked}
        action={controller.actions.openEmail}
      />
    );
  }
  const draft = createEmailServerDraft({ status: 'configured', config: state.config });
  return (
    <MessageServerChannelRow
      title={t('messageServer.email.title')}
      description={t('messageServer.email.description')}
      summary={`${state.config.emailHost}:${state.config.emailPort} · ${state.config.emailUsername}`}
      status={messageServerStatus(state.config.enable, validateEmailServerDraft(draft))}
      canConfigure={controller.capabilities.canConfigure}
      disabled={controller.emailLocked}
      action={controller.actions.openEmail}
    />
  );
}

export function SmsServerChannelRow({ controller }: { controller: Controller }) {
  const { t } = useTranslation();
  const state = controller.sms;
  if (state.kind === 'loading') return <MessageServerChannelLoading title={t('messageServer.sms.title')} />;
  if (
    state.kind === 'permission' ||
    state.kind === 'unavailable' ||
    state.kind === 'error' ||
    state.kind === 'invalid'
  ) {
    return (
      <MessageServerChannelFailure
        title={t('messageServer.sms.title')}
        kind={state.kind}
        retry={controller.actions.retrySms}
      />
    );
  }
  if (state.kind === 'missing') {
    return (
      <MessageServerChannelRow
        title={t('messageServer.sms.title')}
        description={t('messageServer.sms.description')}
        summary={t('messageServer.notConfigured')}
        status="unconfigured"
        canConfigure={controller.capabilities.canConfigure}
        disabled={controller.smsLocked}
        action={controller.actions.openSms}
      />
    );
  }
  const draft = createSmsServerDraft({ status: 'configured', config: state.config });
  const provider = smsProviderDefinition(state.config.type);
  return (
    <MessageServerChannelRow
      title={t('messageServer.sms.title')}
      description={t('messageServer.sms.description')}
      summary={t(provider.labelKey)}
      status={messageServerStatus(state.config.enable, validateSmsServerDraft(draft))}
      canConfigure={controller.capabilities.canConfigure}
      disabled={controller.smsLocked}
      action={controller.actions.openSms}
    />
  );
}
