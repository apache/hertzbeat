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

import { ProfileOutlined, SendOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AgentWorkspaceViewModel } from '../model/agent-workspace-view-model';
import styles from './agent-workspace-conversation-chrome.module.css';
import { formatAgentTimestamp, sessionStatusLabel } from './agent-workspace-format';

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

function submitOnEnter(event: React.KeyboardEvent<HTMLTextAreaElement>, send: () => Promise<void>) {
  if (event.shiftKey) return;
  event.preventDefault();
  void send();
}
