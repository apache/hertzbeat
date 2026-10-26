/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { agentMessageTooLarge } from '../model/agent-input-limits';
import { AgentPermissionMode } from './agent-permission-mode';
import { batchSessionStatus } from '../model/agent-batch-presentation';
import { ArrowDownOutlined, ArrowUpOutlined, MenuOutlined, ProfileOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Typography } from 'antd';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-conversation-chrome.module.css';
import conversationStyles from './agent-workspace-conversation.module.css';
import { formatAgentTimestamp, sessionStatusLabel } from './agent-workspace-format';

export function ConversationHeader({
  controller,
  contextOpen,
  onToggleContext,
  onOpenHistory
}: {
  controller: AgentWorkspaceViewModel;
  contextOpen: boolean;
  onToggleContext: () => void;
  onOpenHistory?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  return (
    <header className={styles.investigationHeader}>
      <Button
        className={styles.mobileHistory ?? ''}
        icon={<MenuOutlined />}
        type="text"
        aria-label={t('aiWorkspace.sessions.label')}
        onClick={() => onOpenHistory?.()}
      />
      <ConversationHeaderCopy controller={controller} />
      <div className={styles.headerActions}>
        {controller.permission ? <AgentPermissionMode control={controller.permission} /> : null}
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

function ConversationHeaderCopy({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const selectedSession = controller.sessions.items.find(
    session => session.sessionUid === controller.selectedSessionUid
  );
  const status = selectedSession
    ? batchSessionStatus(selectedSession.status, controller.run.runUid, controller.batch?.progress)
    : '';
  return (
    <div className={styles.headerCopy}>
      <Typography.Title level={2} {...(selectedSession?.title ? { title: selectedSession.title } : {})}>
        {selectedSession?.title || t('aiWorkspace.title')}
      </Typography.Title>
      {selectedSession ? (
        <div className={styles.investigationMeta}>
          <Badge status={sessionBadgeStatus(status)} text={sessionStatusLabel(status, t)} />
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
  );
}

export function ConversationComposer({ controller }: { controller: AgentWorkspaceViewModel }) {
  const { t } = useTranslation();
  const composing = useRef(false);
  const busy = controller.streaming || controller.run.status === 'running';
  const deleting = controller.sessionDeletion?.phase === 'deleting';
  const tooLarge = agentMessageTooLarge(controller.composer);
  const canSend = Boolean(controller.composer.trim()) && !busy && !controller.invalidTarget && !deleting && !tooLarge;
  return (
    <div className={styles.composer}>
      <Input.TextArea
        aria-label={t('aiWorkspace.composer.label')}
        aria-invalid={tooLarge}
        aria-describedby={tooLarge ? 'agent-message-size-error' : undefined}
        autoSize={{ minRows: 1, maxRows: 6 }}
        disabled={busy || controller.invalidTarget || deleting}
        placeholder={t('aiWorkspace.composer.placeholder')}
        value={controller.composer}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onChange={event => controller.actions.setComposer(event.target.value)}
        onKeyDown={event => submitOnEnter(event, composing.current, canSend, controller.actions.send)}
      />
      {tooLarge ? <Typography.Text id="agent-message-size-error" role="alert" type="danger">{t('aiWorkspace.composer.tooLarge')}</Typography.Text> : null}
      <Button
        aria-label={t('aiWorkspace.actions.send')}
        title={t('aiWorkspace.actions.send')}
        icon={<ArrowUpOutlined />}
        type="primary"
        shape="circle"
        disabled={!canSend}
        onClick={() => {
          if (canSend) void controller.actions.send();
        }}
      />
    </div>
  );
}

function sessionBadgeStatus(status: string): 'processing' | 'success' | 'error' | 'default' | 'warning' {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RUNNING') return 'processing';
  if (normalized === 'COMPLETED' || normalized === 'SUCCEEDED') return 'success';
  if (normalized === 'PARTIAL') return 'warning';
  if (normalized === 'FAILED') return 'error';
  return 'default';
}

function submitOnEnter(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  composing: boolean,
  canSend: boolean,
  send: () => Promise<void>
) {
  if (event.key !== 'Enter' || event.shiftKey || composing || event.nativeEvent.isComposing || event.keyCode === 229)
    return;
  event.preventDefault();
  if (canSend) void send();
}

export function ConversationFooter({
  controller,
  away,
  jumpToLatest
}: {
  controller: AgentWorkspaceViewModel;
  away: boolean;
  jumpToLatest: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={conversationStyles.conversationFooter}>
      {away ? (
        <Button
          size="small"
          className={conversationStyles.latest ?? ''}
          icon={<ArrowDownOutlined />}
          onClick={jumpToLatest}
        >
          {t('aiWorkspace.latestMessages')}
        </Button>
      ) : null}
      <ConversationComposer controller={controller} />
    </div>
  );
}
