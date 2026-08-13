/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-view.module.css';

export function AgentWorkspaceConversation({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const messages = [...controller.transcript.items, ...controller.draftMessages, ...controller.run.messages];
  return (
    <section className={styles.investigation} aria-label={t('aiWorkspace.investigation.label')}>
      <ConversationHeader controller={controller} />
      <div className={styles.transcript} aria-live="polite">
        {messages.length === 0 ? <EmptyConversation /> : null}
        {messages.map((message, index) => (
          <ConversationMessage key={'id' in message ? message.id : index} message={message} />
        ))}
        {controller.failure ? <ConversationFailure retry={controller.actions.retry} /> : null}
      </div>
      <ConversationComposer controller={controller} />
    </section>
  );
}

function ConversationHeader({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  return (
    <header className={styles.investigationHeader}>
      <div>
        <Typography.Title level={2}>{t('aiWorkspace.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('aiWorkspace.description')}</Typography.Text>
      </div>
      {controller.streaming ? (
        <Button loading={controller.stopping} onClick={() => void controller.actions.stop()}>
          {t('aiWorkspace.actions.stop')}
        </Button>
      ) : null}
    </header>
  );
}

function ConversationMessage({ message }: { message: { id: string | number; text: string; role?: string } }) {
  const { t } = useTranslation();
  const role = message.role ?? 'assistant';
  return (
    <article className={styles.message} data-role={role}>
      <Typography.Text className={styles.messageRole ?? ''} type="secondary">
        {role === 'user' ? t('aiWorkspace.roles.you') : t('aiWorkspace.roles.assistant')}
      </Typography.Text>
      <div className={styles.messageText}>{message.text}</div>
    </article>
  );
}

function EmptyConversation() {
  const { t } = useTranslation();
  return (
    <div className={styles.emptyConversation}>
      <Typography.Title level={4}>{t('aiWorkspace.empty.title')}</Typography.Title>
      <Typography.Text type="secondary">{t('aiWorkspace.empty.description')}</Typography.Text>
    </div>
  );
}

function ConversationFailure({ retry }: { retry: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="alert">
      <span>{t('aiWorkspace.failure')}</span>
      <Button size="small" onClick={() => void retry()}>
        {t('common.retry')}
      </Button>
    </div>
  );
}

function ConversationComposer({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  return (
    <div className={styles.composer}>
      <Input.TextArea
        aria-label={t('aiWorkspace.composer.label')}
        autoSize={{ minRows: 2, maxRows: 6 }}
        disabled={controller.streaming}
        placeholder={t('aiWorkspace.composer.placeholder')}
        value={controller.composer}
        onChange={event => controller.actions.setComposer(event.target.value)}
        onPressEnter={event => submitOnEnter(event, controller.actions.send)}
      />
      <Button
        type="primary"
        disabled={!controller.composer.trim() || controller.streaming}
        onClick={() => void controller.actions.send()}
      >
        {t('aiWorkspace.actions.send')}
      </Button>
    </div>
  );
}

function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>, send: () => Promise<void>) {
  if (event.shiftKey) return;
  event.preventDefault();
  void send();
}
