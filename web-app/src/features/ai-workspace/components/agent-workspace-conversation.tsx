/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { CodeOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import { ConversationComposer, ConversationHeader } from './agent-workspace-conversation-chrome';
import styles from './agent-workspace-conversation.module.css';
import { formatAgentTimestamp } from './agent-workspace-format';

export function AgentWorkspaceConversation({
  controller,
  contextOpen,
  onToggleContext
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
}) {
  const { t } = useTranslation();
  const messages = [...controller.transcript.items, ...controller.draftMessages, ...controller.run.messages];
  const sessionLoadIncomplete = controller.transcript.status === 'error';
  const empty = messages.length === 0 && !controller.failure && !controller.invalidTarget && !sessionLoadIncomplete;
  return (
    <section className={styles.investigation} data-empty={empty} aria-label={t('aiWorkspace.investigation.label')}>
      <ConversationHeader controller={controller} contextOpen={contextOpen} onToggleContext={onToggleContext} />
      <div className={styles.transcript} aria-live="polite">
        {empty ? <EmptyConversation /> : null}
        {messages.map((message, index) => (
          <ConversationMessage key={'id' in message ? message.id : index} message={message} />
        ))}
        {sessionLoadIncomplete ? <ConversationFailure message={t('aiWorkspace.sessionLoadIncomplete')} /> : null}
        {controller.run.tools.length ? (
          <ConversationActivity
            contextOpen={contextOpen}
            tools={controller.run.tools}
            onOpenContext={() => {
              if (!contextOpen) onToggleContext();
            }}
          />
        ) : null}
        {showRunFailure(controller) ? (
          <ConversationFailure
            message={runFailureMessage(controller, t)}
            {...(controller.run.retryAvailable ? { retry: controller.actions.retry } : {})}
          />
        ) : null}
        {showPausedObservation(controller) ? (
          <ConversationPaused
            recoveryAvailable={controller.run.recoveryAvailable === true}
            recover={controller.actions.recover}
          />
        ) : null}
        {controller.failure ? <ConversationFailure retry={controller.actions.recover} /> : null}
        {controller.invalidTarget ? <ConversationFailure message={t('aiWorkspace.invalidTarget')} /> : null}
      </div>
      <ConversationComposer controller={controller} />
    </section>
  );
}

function showRunFailure(controller: AgentWorkspaceViewModel) {
  return !controller.invalidTarget && controller.run.status === 'error' && Boolean(controller.run.errorMessage);
}

function showPausedObservation(controller: AgentWorkspaceViewModel) {
  return !controller.invalidTarget && controller.run.status === 'running' && controller.run.observationExpired === true;
}

function runFailureMessage(controller: AgentWorkspaceViewModel, t: ReturnType<typeof useTranslation>['t']) {
  if (controller.run.recoveryRequired) return t('aiWorkspace.recoveryRequired');
  if (controller.run.targetFailure === 'mismatch') return t('aiWorkspace.targetMismatch');
  if (controller.run.targetFailure === 'unavailable') return t('aiWorkspace.targetUnavailable');
  return controller.run.errorMessage ?? '';
}

function ConversationMessage({
  message
}: {
  message: {
    id: string | number;
    text: string;
    role?: string;
    toolName?: string;
    errorMessage?: string;
    createdAt?: string | null;
  };
}) {
  const { t } = useTranslation();
  const role = message.role ?? 'assistant';
  const user = role === 'user';
  const toolResult = role === 'toolResult';
  return (
    <article className={styles.message} data-role={role}>
      <div className={styles.messageMeta}>
        {!user && !toolResult ? (
          <img aria-hidden="true" className={styles.assistantMark} src="/assets/logo.svg" alt="" />
        ) : null}
        {toolResult ? (
          <code className={styles.messageRole}>{message.toolName}</code>
        ) : (
          <Typography.Text className={styles.messageRole ?? ''} type="secondary">
            {user ? t('aiWorkspace.roles.you') : t('aiWorkspace.roles.assistant')}
          </Typography.Text>
        )}
        {message.createdAt ? (
          <Typography.Text className={styles.messageTime ?? ''} type="secondary">
            <time dateTime={message.createdAt}>{formatAgentTimestamp(message.createdAt)}</time>
          </Typography.Text>
        ) : null}
      </div>
      <div className={styles.messageText}>{message.text}</div>
      {message.errorMessage ? (
        <Typography.Text className={styles.messageError ?? ''} type="danger">
          {message.errorMessage}
        </Typography.Text>
      ) : null}
    </article>
  );
}

function ConversationActivity({
  contextOpen,
  onOpenContext,
  tools
}: {
  contextOpen: boolean;
  onOpenContext: () => void;
  tools: AgentWorkspaceViewModel['run']['tools'];
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.inlineActivity} aria-label={t('aiWorkspace.context.activity')}>
      {tools.map(tool => (
        <button
          aria-expanded={contextOpen}
          aria-label={tool.toolName}
          className={styles.inlineTool}
          key={tool.toolCallId}
          type="button"
          onClick={onOpenContext}
        >
          <CodeOutlined />
          <span className={styles.inlineToolName}>{tool.toolName}</span>
          {tool.elapsedMs === undefined ? null : (
            <Typography.Text type="secondary">{formatElapsed(tool.elapsedMs)}</Typography.Text>
          )}
          <Tag bordered={false} color={toolStatusColor(tool.status)}>
            {tool.status}
          </Tag>
          <RightOutlined className={styles.inlineToolChevron} />
        </button>
      ))}
    </section>
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

function ConversationFailure({ message, retry }: { message?: string; retry?: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="alert">
      <span>{message || t('aiWorkspace.failure')}</span>
      {retry ? (
        <Button size="small" onClick={() => void retry()}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}

function ConversationPaused({
  recoveryAvailable,
  recover
}: {
  recoveryAvailable: boolean;
  recover: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.failure} role="status">
      <span>{t('aiWorkspace.activeObservationPaused')}</span>
      {recoveryAvailable ? (
        <Button size="small" onClick={() => void recover()}>
          {t('aiWorkspace.actions.recover')}
        </Button>
      ) : null}
    </div>
  );
}

function toolStatusColor(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'SUCCEEDED' || normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED' || normalized === 'DENIED') return 'error';
  if (normalized.includes('WAITING')) return 'warning';
  return 'processing';
}

function formatElapsed(elapsedMs: number) {
  return elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(1)} s`;
}
