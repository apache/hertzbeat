/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ProfileOutlined, SendOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-conversation-chrome.module.css';
import { formatAgentTimestamp } from './agent-workspace-format';

export function ConversationHeader({
  controller,
  contextOpen,
  onToggleContext
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
}) {
  const { t } = useTranslation();
  const selectedSession = controller.sessions.items.find(
    session => session.sessionUid === controller.selectedSessionUid
  );
  return (
    <header className={styles.investigationHeader}>
      <div className={styles.headerCopy}>
        <Typography.Title level={2} {...(selectedSession?.title ? { title: selectedSession.title } : {})}>
          {selectedSession?.title || t('aiWorkspace.title')}
        </Typography.Title>
        {selectedSession ? (
          <div className={styles.investigationMeta}>
            <Badge
              status={sessionBadgeStatus(selectedSession.status)}
              text={sessionStatusLabel(selectedSession.status, t)}
            />
            {selectedSession.gmtUpdate ? (
              <Typography.Text type="secondary">
                <time dateTime={selectedSession.gmtUpdate}>{formatAgentTimestamp(selectedSession.gmtUpdate)}</time>
              </Typography.Text>
            ) : null}
          </div>
        ) : (
          <Typography.Text type="secondary">{t('aiWorkspace.description')}</Typography.Text>
        )}
      </div>
      <div className={styles.headerActions}>
        {controller.streaming || controller.run.status === 'running' ? (
          <Button loading={controller.stopping} onClick={() => void controller.actions.stop()}>
            {t('aiWorkspace.actions.stop')}
          </Button>
        ) : null}
        <Button
          aria-label={t(contextOpen ? 'aiWorkspace.context.close' : 'aiWorkspace.context.open')}
          aria-controls="agent-run-context"
          aria-expanded={contextOpen}
          data-selected={contextOpen}
          icon={<ProfileOutlined />}
          size="small"
          type="text"
          onClick={onToggleContext}
        >
          {t('aiWorkspace.context.shortLabel')}
        </Button>
      </div>
    </header>
  );
}

export function ConversationComposer({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  return (
    <div className={styles.composer}>
      <Input.TextArea
        aria-label={t('aiWorkspace.composer.label')}
        autoSize={{ minRows: 2, maxRows: 6 }}
        disabled={controller.streaming || controller.invalidTarget}
        placeholder={t('aiWorkspace.composer.placeholder')}
        value={controller.composer}
        onChange={event => controller.actions.setComposer(event.target.value)}
        onPressEnter={event => submitOnEnter(event, controller.actions.send)}
      />
      <Button
        aria-label={t('aiWorkspace.actions.send')}
        icon={<SendOutlined />}
        type="primary"
        disabled={!controller.composer.trim() || controller.streaming || controller.invalidTarget}
        onClick={() => void controller.actions.send()}
      >
        {t('aiWorkspace.actions.send')}
      </Button>
    </div>
  );
}

function sessionBadgeStatus(status: string): 'processing' | 'success' | 'error' | 'default' {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RUNNING') return 'processing';
  if (normalized === 'COMPLETED' || normalized === 'SUCCEEDED') return 'success';
  if (normalized === 'FAILED') return 'error';
  return 'default';
}

function sessionStatusLabel(status: string, t: ReturnType<typeof useTranslation>['t']) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RUNNING') return t('aiWorkspace.sessions.status.active');
  if (normalized === 'COMPLETED' || normalized === 'SUCCEEDED') return t('aiWorkspace.sessions.status.completed');
  if (normalized === 'FAILED') return t('aiWorkspace.sessions.status.failed');
  if (normalized === 'CANCELLED') return t('aiWorkspace.sessions.status.cancelled');
  if (normalized === 'RECOVERY_REQUIRED') return t('aiWorkspace.sessions.status.recoveryRequired');
  if (normalized === 'NO_RUN') return t('aiWorkspace.sessions.status.noRun');
  return status;
}

function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>, send: () => Promise<void>) {
  if (event.shiftKey) return;
  event.preventDefault();
  void send();
}
